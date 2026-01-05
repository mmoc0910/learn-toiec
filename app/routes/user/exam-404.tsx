import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { http } from "utils/libs/https";
import { TiptapViewer } from "components/tiptap-viewer";

/** ===== Types từ API phân tích ===== */
type ExamQuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type TuSapXep = {
  IDTu: string;
  CauHoiID: string;
  NoiDungTu: string;
  ThuTuDung: number;
};

type CapTuKhop = {
  IDCapTu: string;
  CauHoiID: string;
  TuBenTrai: string;
  TuBenPhai: string;
  LaDung: boolean;
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;
  lua_chon: ExamQuestionChoice[];
  tu_sap_xep: TuSapXep[];
  cap_tu_khop: CapTuKhop[];
};

type PhanTichChiTiet = {
  ChiTietBaiLamID: string;
  KetQuaID: string;
  CauHoiID: string;
  CauHoiID_detail: ExamQuestionDetail;

  LuaChon: string; // có thể là "id" hoặc JSON string mảng
  TraLoiTuLuan: string;
  LaDung: boolean;
};

type PhanTichRes = {
  tong_cau: number;
  so_cau_dung: number;
  so_cau_sai: number;
  ti_le_dung: number;
  diem_so: number;
  chi_tiet: PhanTichChiTiet[];
};

/** ===== Helpers ===== */
function parseTipTap(raw: any) {
  if (!raw) return null;
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
  return null;
}

function safeJsonArray(value: string): string[] {
  if (!value) return [];
  try {
    const x = JSON.parse(value);
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

function typeLabel(t: string) {
  if (t === "nghe") return "Nghe";
  if (t === "tracnghiem") return "Trắc nghiệm";
  if (t === "tuluan") return "Tự luận";
  if (t === "sapxeptu") return "Sắp xếp từ";
  if (t === "khoptu") return "Khớp từ";
  return t || "-";
}

function normalizeError(err: any): string {
  const data = err?.response?.data;
  if (Array.isArray(data)) return data.join("\n");
  if (data && typeof data === "object") {
    const lines: string[] = [];
    for (const k of Object.keys(data)) {
      const v = (data as any)[k];
      if (Array.isArray(v)) lines.push(`${k}: ${v.join(", ")}`);
      else lines.push(`${k}: ${String(v)}`);
    }
    if (lines.length) return lines.join("\n");
  }
  return data?.detail || data?.message || err?.message || "Có lỗi xảy ra.";
}

export default function ExamResultPage() {
  const navigate = useNavigate();
  const params = useParams();
  console.log("params =", params);
  //   const ketQuaId =
  //     (params as any)?.KetQuaID ||
  //     (params as any)?.ketQuaId ||
  //     (params as any)?.id ||
  //     "";
  const ketQuaId = params?.ketQuaID ?? "";
  console.log("ketQuaId =", ketQuaId);
  const [data, setData] = useState<PhanTichRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ketQuaId) {
      setErrMsg("Thiếu KetQuaID trên URL.");
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const res = await http.get<PhanTichRes>(
          `/api/results/ket-qua/${ketQuaId}/phan_tich/`
        );
        if (!mounted) return;
        setData(res.data);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(normalizeError(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ketQuaId]);

  const percent = useMemo(() => {
    if (!data) return 0;
    // ưu tiên ti_le_dung từ BE
    return Number.isFinite(data.ti_le_dung) ? data.ti_le_dung : 0;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          Đang tải kết quả...
        </div>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 whitespace-pre-wrap font-semibold">
          {errMsg}
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 h-10 rounded-xl bg-black px-5 font-semibold text-white"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      {/* SUMMARY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-900">
              Tổng kết bài thi
            </div>
            <div className="mt-1 text-sm text-slate-600">
              KetQuaID: <span className="font-semibold">{ketQuaId}</span>
            </div>
          </div>

          {/* <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/student/exams")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Danh sách bài thi
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-10 rounded-xl bg-black px-4 font-semibold text-white hover:opacity-95"
            >
              Quay lại
            </button>
          </div> */}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatBox label="Tổng câu" value={data.tong_cau} />
          <StatBox label="Đúng" value={data.so_cau_dung} tone="good" />
          <StatBox label="Sai" value={data.so_cau_sai} tone="bad" />
          <StatBox label="% đúng" value={`${data.ti_le_dung}%`} />
          <StatBox label="Điểm" value={data.diem_so} />
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-violet-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* DETAILS */}
      <div className="mt-5 space-y-4">
        {data.chi_tiet.map((ct, idx) => (
          <QuestionResultCard key={ct.ChiTietBaiLamID} index={idx} item={ct} />
        ))}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: any;
  tone?: "good" | "bad";
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        tone === "good"
          ? "border-emerald-200 bg-emerald-50"
          : tone === "bad"
            ? "border-red-200 bg-red-50"
            : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function QuestionResultCard({
  index,
  item,
}: {
  index: number;
  item: PhanTichChiTiet;
}) {
  const q = item.CauHoiID_detail;
  const tiptap = useMemo(() => parseTipTap(q.NoiDungCauHoi), [q.NoiDungCauHoi]);

  const userChoiceId = item.LuaChon || "";
  const userArr = useMemo(() => safeJsonArray(item.LuaChon), [item.LuaChon]);

  const correctChoice = useMemo(() => {
    if (!q.lua_chon?.length) return null;
    return q.lua_chon.find((x) => x.DapAnDung) || null;
  }, [q.lua_chon]);

  const userChoice = useMemo(() => {
    if (!q.lua_chon?.length) return null;
    return q.lua_chon.find((x) => x.LuaChonID === userChoiceId) || null;
  }, [q.lua_chon, userChoiceId]);

  const dictTu = useMemo(() => {
    const m = new Map<string, TuSapXep>();
    (q.tu_sap_xep || []).forEach((x) => m.set(x.IDTu, x));
    return m;
  }, [q.tu_sap_xep]);

  const correctSapXep = useMemo(() => {
    const sorted = [...(q.tu_sap_xep || [])].sort(
      (a, b) => (a.ThuTuDung ?? 0) - (b.ThuTuDung ?? 0)
    );
    return sorted.map((x) => x.IDTu);
  }, [q.tu_sap_xep]);

  const correctKhopTuSet = useMemo(() => {
    const s = new Set<string>();
    (q.cap_tu_khop || []).forEach((c) => {
      if (c.LaDung) s.add(c.IDCapTu);
    });
    return s;
  }, [q.cap_tu_khop]);

  const userKhopTuSet = useMemo(() => new Set(userArr), [userArr]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            Câu {index + 1} • {typeLabel(q.LoaiCauHoi)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {item.CauHoiID} • {q.IDBaiHoc}
          </div>
        </div>

        <span
          className={[
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border",
            item.LaDung
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          {item.LaDung ? "✅ ĐÚNG" : "❌ SAI"}
        </span>
      </div>

      {/* Question content */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <TiptapViewer content={tiptap} />
      </div>

      {/* Audio nếu có */}
      {q.LoaiCauHoi === "nghe" && q.FileNghe_url ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-bold text-slate-700">Audio</div>
          <audio controls className="w-full">
            <source src={q.FileNghe_url} />
          </audio>
        </div>
      ) : null}

      {/* Answer view by type */}
      <div className="mt-4">
        {q.LoaiCauHoi === "tracnghiem" || q.LoaiCauHoi === "nghe" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AnswerBox
              label="Bạn chọn"
              value={
                userChoice?.NoiDungLuaChon ||
                (userChoiceId ? userChoiceId : "(Trống)")
              }
              tone={item.LaDung ? "good" : "bad"}
            />
            <AnswerBox
              label="Đáp án đúng"
              value={correctChoice?.NoiDungLuaChon || "(Không có)"}
              tone="neutral"
            />
          </div>
        ) : null}

        {q.LoaiCauHoi === "tuluan" ? (
          <AnswerBox
            label="Bài làm tự luận"
            value={item.TraLoiTuLuan || "(Trống)"}
            tone={item.LaDung ? "good" : "neutral"}
            mono
          />
        ) : null}

        {q.LoaiCauHoi === "sapxeptu" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AnswerBox
              label="Thứ tự bạn chọn"
              value={renderSapXep(userArr, dictTu)}
              tone={item.LaDung ? "good" : "bad"}
            />
            <AnswerBox
              label="Thứ tự đúng"
              value={renderSapXep(correctSapXep, dictTu)}
              tone="neutral"
            />
          </div>
        ) : null}

        {q.LoaiCauHoi === "khoptu" ? (
          <div className="mt-2 space-y-2">
            <div className="text-sm font-extrabold text-slate-800">
              Chi tiết khớp từ
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(q.cap_tu_khop || []).map((cap) => {
                const picked = userKhopTuSet.has(cap.IDCapTu);
                const isCorrect = correctKhopTuSet.has(cap.IDCapTu);
                return (
                  <div
                    key={cap.IDCapTu}
                    className={[
                      "rounded-2xl border px-4 py-3",
                      picked && isCorrect
                        ? "border-emerald-200 bg-emerald-50"
                        : picked && !isCorrect
                          ? "border-red-200 bg-red-50"
                          : !picked && isCorrect
                            ? "border-violet-200 bg-violet-50"
                            : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {cap.TuBenTrai} ↔ {cap.TuBenPhai}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {picked ? "Bạn chọn" : "Bạn không chọn"} •{" "}
                      {isCorrect ? "Đúng" : "Sai"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-slate-500">
              Gợi ý màu: xanh lá (chọn đúng) • đỏ (chọn sai) • tím (đúng nhưng
              bạn không chọn)
            </div>
          </div>
        ) : null}

        {q.GiaiThich ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-bold">Giải thích:</span> {q.GiaiThich}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AnswerBox({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "good" | "bad" | "neutral";
  mono?: boolean;
}) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "bad"
        ? "border-red-200 bg-red-50"
        : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="text-xs font-bold text-slate-600">{label}</div>
      <div
        className={`mt-2 text-sm font-semibold text-slate-900 ${mono ? "whitespace-pre-wrap font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function renderSapXep(order: string[], dict: Map<string, TuSapXep>) {
  if (!order?.length) return "(Trống)";
  const words = order.map((id) => dict.get(id)?.NoiDungTu ?? id);
  return words.join(" ");
}
