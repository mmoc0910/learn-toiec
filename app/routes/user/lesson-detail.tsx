import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { Route } from "./+types/user/lesson-detail"; // đổi theo project nếu cần
import { http } from "utils/libs/https";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type BaiHoc = {
  IDBaiHoc: string;
  IDChuDe: string;
  IDChuDe_detail?: string;
  TenBaiHoc: string;
  NoiDungBaiHoc: any; // tiptap json string hoặc object
};

type ChuDe = {
  IDChuDe: string;
  TenChuDe: string;
  bai_hoc: BaiHoc[];
  so_bai_hoc: number;
};

function getApiErrorMessage(err: any) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  return "Có lỗi xảy ra.";
}

function safeParseTiptapJson(value: any): any | null {
  if (!value) return null;

  // đã là object
  if (typeof value === "object") return value;

  // là string JSON
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      // không phải JSON -> coi như text thường
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: value }],
          },
        ],
      };
    }
  }

  return null;
}

/** ====== Tiptap JSON Renderer (read-only) ====== */

type Marks = Array<{ type: string; attrs?: any }>;
type Node = {
  type: string;
  attrs?: any;
  marks?: Marks;
  text?: string;
  content?: Node[];
};

function applyMarks(el: React.ReactNode, marks?: Marks) {
  if (!marks?.length) return el;

  return marks.reduce((acc, m) => {
    switch (m.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "underline":
        return <span style={{ textDecoration: "underline" }}>{acc}</span>;
      case "strike":
        return <span style={{ textDecoration: "line-through" }}>{acc}</span>;
      case "code":
        return (
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-slate-900">
            {acc}
          </code>
        );
      case "link": {
        const href = m.attrs?.href;
        const target = m.attrs?.target || "_blank";
        const rel = m.attrs?.rel || "noopener noreferrer nofollow";
        if (!href) return acc;
        return (
          <a
            href={href}
            target={target}
            rel={rel}
            className="text-violet-700 underline underline-offset-2 hover:text-violet-800"
          >
            {acc}
          </a>
        );
      }
      default:
        return acc; // mark chưa hỗ trợ -> bỏ qua
    }
  }, el);
}

function renderInline(node: Node, key: string | number): React.ReactNode {
  switch (node.type) {
    case "text":
      return <React.Fragment key={key}>{applyMarks(node.text ?? "", node.marks)}</React.Fragment>;

    case "hardBreak":
      return <br key={key} />;

    case "image": {
      const src = node.attrs?.src;
      const alt = node.attrs?.alt ?? "";
      if (!src) return null;
      return (
        <figure key={key} className="my-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full max-w-full rounded-xl border border-slate-200"
          />
        </figure>
      );
    }

    default:
      // node inline khác -> thử render block chung
      return <React.Fragment key={key}>{renderNode(node, key)}</React.Fragment>;
  }
}

function renderChildren(nodes?: Node[]) {
  if (!nodes?.length) return null;
  return nodes.map((child, idx) => renderNode(child, idx));
}

function renderNode(node: Node, key: string | number): React.ReactNode {
  switch (node.type) {
    case "doc":
      return <div key={key}>{renderChildren(node.content)}</div>;

    case "paragraph":
      return (
        <p key={key} className="my-3 leading-7 text-slate-800">
          {(node.content ?? []).map((c, idx) => renderInline(c, `${key}-in-${idx}`))}
        </p>
      );

    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      const Tag = (`h${Math.min(Math.max(level, 1), 6)}` as unknown) as keyof JSX.IntrinsicElements;
      const cls =
        level === 1
          ? "mt-6 text-2xl font-extrabold text-slate-900"
          : level === 2
          ? "mt-6 text-xl font-extrabold text-slate-900"
          : "mt-5 text-lg font-extrabold text-slate-900";
      return (
        <Tag key={key} className={cls}>
          {(node.content ?? []).map((c, idx) => renderInline(c, `${key}-h-${idx}`))}
        </Tag>
      );
    }

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-4 rounded-xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700"
        >
          {renderChildren(node.content)}
        </blockquote>
      );

    case "bulletList":
      return (
        <ul key={key} className="my-4 list-disc space-y-2 pl-6 text-slate-800">
          {renderChildren(node.content)}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="my-4 list-decimal space-y-2 pl-6 text-slate-800">
          {renderChildren(node.content)}
        </ol>
      );

    case "listItem":
      return <li key={key}>{renderChildren(node.content)}</li>;

    case "codeBlock": {
      const text =
        node.content?.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("") ?? "";
      return (
        <pre
          key={key}
          className="my-4 overflow-auto rounded-2xl border border-slate-200 bg-slate-900 p-4 text-slate-100"
        >
          <code className="font-mono text-sm leading-6">{text}</code>
        </pre>
      );
    }

    case "image":
      // ảnh dạng block
      return renderInline(node, key);

    default:
      // node chưa hỗ trợ: render children nếu có, không thì bỏ qua
      if (node.content?.length) {
        return (
          <div key={key} className="my-3">
            {renderChildren(node.content)}
          </div>
        );
      }
      return null;
  }
}

function TiptapViewer({ json }: { json: any }) {
  const doc = useMemo(() => safeParseTiptapJson(json), [json]);

  if (!doc) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-700">
        Không có nội dung bài học.
      </div>
    );
  }

  return <div className="prose prose-slate max-w-none">{renderNode(doc, "root")}</div>;
}

/** ====== Page ====== */

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bài học" },
    { name: "description", content: "Xem nội dung bài học" },
  ];
}

export default function BaiHocDetailPage() {
  const { id } = useParams(); // /bai-hoc/:id
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [baiHoc, setBaiHoc] = useState<BaiHoc | null>(null);
  const [chuDeName, setChuDeName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!id) return;
      setLoading(true);
      setErrMsg(null);

      try {
        // Do chưa có API /bai-hoc/:id nên lấy toàn bộ chủ đề rồi tìm bài học
        const res = await http.get<Paginated<ChuDe>>(`/api/lessons/chu-de/`);
        const cds = res.data.results ?? [];

        let found: BaiHoc | null = null;
        let foundChuDeName: string | null = null;

        for (const cd of cds) {
          const hit = (cd.bai_hoc ?? []).find((bh) => String(bh.IDBaiHoc) === String(id));
          if (hit) {
            found = hit;
            foundChuDeName = cd.TenChuDe ?? cd.IDChuDe;
            break;
          }
        }

        if (!mounted) return;

        if (!found) {
          setErrMsg("Không tìm thấy bài học.");
          setBaiHoc(null);
          setChuDeName(null);
          return;
        }

        setBaiHoc(found);
        setChuDeName(foundChuDeName);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(getApiErrorMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">Bài học</div>
          <h1 className="mt-1 truncate text-2xl font-extrabold text-slate-900">
            {baiHoc?.TenBaiHoc || (loading ? "Đang tải..." : "—")}
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            ID: <b>{id}</b>
            {chuDeName ? (
              <>
                {" "}
                · Chủ đề: <b>{chuDeName}</b>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Quay lại
          </button>
        </div>
      </div>

      {errMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errMsg}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading && !baiHoc ? <div className="text-slate-700">Đang tải nội dung...</div> : null}

        {baiHoc ? <TiptapViewer json={baiHoc.NoiDungBaiHoc} /> : null}
      </div>
    </div>
  );
}
