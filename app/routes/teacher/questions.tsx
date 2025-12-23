import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import {
  deleteQuestion,
  getQuestions,
  type QuestionChoice,
  type QuestionItem,
} from "api/question-api";
import { getLessons, type LessonItem } from "api/lesson-api";
import { Link } from "react-router";
import { TiptapViewer } from "components/tiptap-viewer";

type FilterLoai = "all" | "nghe" | "tracnghiem" | "tuluan";
type FormValues = {
  baiHocId: string; // "" = tất cả
  loai: FilterLoai;
  search: string;
};

function LoaiBadge({ loai }: { loai: string }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
  if (loai === "nghe")
    return (
      <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}>
        Nghe
      </span>
    );
  if (loai === "tracnghiem")
    return (
      <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
        Trắc nghiệm
      </span>
    );
  if (loai === "tuluan")
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
      >
        Tự luận
      </span>
    );
  return (
    <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>
      {loai}
    </span>
  );
}

// ✅ tránh crash khi NoiDungCauHoi không phải JSON string chuẩn
function safeParseTipTap(raw: any) {
  if (!raw) return { type: "doc", content: [{ type: "paragraph" }] };
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: raw }] },
        ],
      };
    }
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export default function QuestionsPage(): JSX.Element {
  const forms = useForm<FormValues>({
    defaultValues: { baiHocId: "", loai: "all", search: "" },
  });

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const baiHocId = forms.watch("baiHocId");
  const loai = forms.watch("loai");
  const search = forms.watch("search") ?? "";

  async function fetchAll() {
    setLoading(true);
    setErrMsg(null);
    try {
      const [lessonRes, questionRes] = await Promise.all([
        getLessons(),
        getQuestions(),
      ]);
      setLessons(lessonRes.results ?? []);
      setQuestions(questionRes.results ?? []);
    } catch (e: any) {
      setErrMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Không tải được dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const lessonOptions = useMemo(() => {
    return [
      { label: "Tất cả bài học", value: "" },
      ...lessons.map((l) => ({
        label: `${l.TenBaiHoc} (${l.IDBaiHoc})`,
        value: l.IDBaiHoc,
      })),
    ];
  }, [lessons]);

  const filtered = useMemo(() => {
    let list = questions;

    if (baiHocId) {
      list = list.filter((q) => q.IDBaiHoc === baiHocId);
    }

    if (loai !== "all") {
      list = list.filter((q) => q.LoaiCauHoi === loai);
    }

    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((q) => {
        const contentStr =
          typeof q.NoiDungCauHoi === "string"
            ? q.NoiDungCauHoi
            : JSON.stringify(q.NoiDungCauHoi ?? "");

        const text =
          `${q.IDCauHoi} ${contentStr} ${q.GiaiThich ?? ""} ${q.IDBaiHoc}`.toLowerCase();
        return text.includes(kw);
      });
    }

    return list;
  }, [questions, baiHocId, loai, search]);

  async function handleDelete(item: QuestionItem) {
    const ok = window.confirm(
      `Bạn có chắc muốn xoá câu hỏi: ${item.IDCauHoi} không?`
    );
    if (!ok) return;

    try {
      await deleteQuestion(item.IDCauHoi);
      setQuestions((prev) => prev.filter((q) => q.IDCauHoi !== item.IDCauHoi));
    } catch (e: any) {
      alert(e?.response?.data?.detail || e?.message || "Xoá thất bại");
    }
  }

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Quản lý câu hỏi">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errMsg}
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-800">
                Danh sách câu hỏi
              </h2>
              <p className="mt-1 text-slate-500">
                Lọc theo bài học + loại câu hỏi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Bài học:</span>
                <DropdownSelectPortal
                  name="baiHocId"
                  placeholder={loading ? "Đang tải..." : "Chọn bài học"}
                  options={lessonOptions}
                  menuWidth={520}
                  placement="bottom"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Loại:</span>
                <DropdownSelectPortal
                  name="loai"
                  placeholder="Chọn loại"
                  options={[
                    { label: "Tất cả", value: "all" },
                    { label: "Nghe", value: "nghe" },
                    { label: "Trắc nghiệm", value: "tracnghiem" },
                    { label: "Tự luận", value: "tuluan" },
                  ]}
                  menuWidth={220}
                  placement="bottom"
                />
              </div>

              <Input
                name="search"
                type="search"
                placeholder="Tìm theo ID / nội dung..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />

              <button
                type="button"
                onClick={fetchAll}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? "Đang tải..." : "Reload"}
              </button>

              <div className="text-right font-semibold text-slate-700">
                {filtered.length} câu
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading && questions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              Đang tải câu hỏi...
            </div>
          ) : null}

          {filtered.map((q) => (
            <div
              key={q.IDCauHoi}
              className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <LoaiBadge loai={q.LoaiCauHoi} />
                    <span className="text-[13px] font-semibold text-slate-500">
                      {q.IDCauHoi}
                    </span>
                    <span className="text-[13px] text-slate-400">•</span>
                    <span className="text-[13px] text-slate-500">
                      Bài học:{" "}
                      {lessons.find((l) => l.IDBaiHoc === q.IDBaiHoc)?.TenBaiHoc ||
                        q.IDBaiHoc}
                    </span>
                  </div>

                  <div className="mt-2 text-base font-medium text-slate-800 wrap-break-word">
                    {/* <p>{q.NoiDungCauHoi}</p> */}
                    <TiptapViewer content={JSON.parse(q.NoiDungCauHoi)} />
                  </div>

                  {q.GiaiThich ? (
                    <div className="mt-1 text-sm text-slate-600 wrap-break-word">
                      <span className="font-semibold text-slate-700">
                        Giải thích:
                      </span>{" "}
                      {q.GiaiThich}
                    </div>
                  ) : null}

                  {/* Audio inline */}
                  {q.LoaiCauHoi === "nghe" && q.FileNghe_url ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-sm font-semibold text-slate-700">
                        Audio
                      </div>
                      <audio controls preload="none" className="w-full">
                        <source src={q.FileNghe_url} type="audio/mpeg" />
                        Trình duyệt của bạn không hỗ trợ phát audio.
                      </audio>
                    </div>
                  ) : null}

                  {/* ✅ Lựa chọn đáp án: HIỂN THỊ CHO CẢ NGHE + TRẮC NGHIỆM */}
                  {q.LoaiCauHoi !== "tuluan" && q.lua_chon?.length ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-sm font-semibold text-slate-700">
                        Lựa chọn đáp án
                      </div>

                      <div className="grid gap-1">
                        {q.lua_chon.map((lc: QuestionChoice) => (
                          <div
                            key={lc.LuaChonID}
                            className={
                              lc.DapAnDung
                                ? "font-semibold text-emerald-700"
                                : "text-slate-700"
                            }
                          >
                            {lc.NoiDungLuaChon} {lc.DapAnDung ? "✅" : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to={`/teacher/questions/${q.IDCauHoi}`}
                    className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                  >
                    Sửa
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleDelete(q)}
                    className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 shadow-sm transition hover:bg-red-100 active:scale-[0.99]"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              Không có câu hỏi phù hợp.
            </div>
          ) : null}
        </div>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
