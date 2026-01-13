
import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { http } from "utils/libs/https";
import { Link } from "react-router";
import { TiptapViewer } from "components/tiptap-viewer";
import { Modal } from "elements/modal/modal";

/** =======================
 * Types
 * ======================= */
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: {
    HoTen?: string;
    Email?: string;
  };
};

type ExamQuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type SapXepTuItem = {
  IDTu: string;
  CauHoiID: string;
  NoiDungTu: string;
  ThuTuDung: number;
};

type CapTuKhopItem = {
  IDCapTu: string;
  CauHoiID: string;
  TuBenTrai: string;
  TuBenPhai: string;
  LaDung: boolean;
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string; // tiptap json string
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;

  lua_chon: ExamQuestionChoice[];

  tu_sap_xep?: SapXepTuItem[];
  cap_tu_khop?: CapTuKhopItem[];
};

type ExamChiTiet = {
  IDDeThi: string;
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail: ExamQuestionDetail;
};

type ExamItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  IDGiaoVien: string;
  IDGiaoVien_detail?: TeacherItem;
  chi_tiet: ExamChiTiet[];
  so_cau_hoi: number;
};

/** =======================
 * NEW: Result types
 * ======================= */

/**
 * ✅ KetQuaDetailItem: em mở rộng thêm vài field optional để UI có thể hiện "trả lời học viên"
 * - Nếu backend có: LuaChonDaChonID / NoiDungTuLuan / TuSapXepDaChon / CapTuDaNoi ...
 * - Nếu backend chưa có: UI sẽ fallback hiển thị "chưa có dữ liệu đáp án học viên".
 */
type KetQuaDetailItem = {
  ChiTietBaiLamID: string;
  LaDung: boolean;
  CauHoiID?: string;

  // --- OPTIONAL answers (tuỳ backend) ---
  LuaChonDaChonID?: string; // cho tracnghiem/nghe
  NoiDungTuLuan?: string; // cho tuluan

  // sắp xếp từ: có thể backend trả mảng IDTu theo thứ tự học viên sắp
  TuSapXepDaChon_IDTu?: string[]; // ví dụ ["idtu1","idtu3","idtu2"]
  TuSapXepDaChon_Text?: string[]; // hoặc trả luôn text theo thứ tự

  // khớp từ: backend có thể trả các cặp học viên nối
  CapTuDaNoi?: Array<{ Trai: string; Phai: string }>;
};

type KetQuaItem = {
  KetQuaID: string;
  DiemSo: number;

  ThoiGianBatDau: string;
  ThoiGianNopBai: string;

  HocVienID: string;
  HocVienID_detail?: {
    TaiKhoan_detail?: {
      HoTen?: string;
      Email?: string;
    };
  };

  DeThiID: string;
  DeThiID_detail?: {
    IDDeThi?: string;
    TenDeThi?: string;
    so_cau_hoi?: number;
  };

  LichThiID?: string;
  LichThiID_detail?: {
    IDLopHoc_detail?: {
      IDLopHoc?: string;
      TenLopHoc?: string;
    };
  };

  chi_tiet?: KetQuaDetailItem[];
};

/** =======================
 * Helpers
 * ======================= */
function getApiErrorMessage(err: any) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data)) return data[0];
  const firstKey = Object.keys(data)[0];
  const val = data[firstKey];
  if (Array.isArray(val)) return val[0];
  if (typeof val === "string") return val;
  return "Có lỗi xảy ra.";
}

function timeToMinutesLabel(hms: string) {
  const parts = (hms || "").split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return hms;
  const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  const totalMin = Math.round(hh * 60 + mm + ss / 60);
  return `${totalMin} phút`;
}

function typeLabel(t: string) {
  if (t === "nghe") return "Nghe";
  if (t === "tracnghiem") return "Trắc nghiệm";
  if (t === "tuluan") return "Tự luận";
  if (t === "sapxeptu") return "Sắp xếp từ";
  if (t === "khoptu") return "Khớp từ";
  return t || "-";
}

function toLocalDatetime(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function durationMMSS(startISO: string, endISO: string): string {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const diff = Math.max(0, end - start);
  const totalSec = Math.floor(diff / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function getStudentName(r: KetQuaItem): string {
  return (
    r.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
    r.HocVienID_detail?.TaiKhoan_detail?.Email ||
    r.HocVienID
  );
}

function getClassName(r: KetQuaItem): string {
  return r.LichThiID_detail?.IDLopHoc_detail?.TenLopHoc || "-";
}

function correctCount(r: KetQuaItem): number {
  return (r.chi_tiet || []).filter((x) => x.LaDung).length;
}

function totalQuestionsFromResult(r: KetQuaItem): number {
  const n = r.DeThiID_detail?.so_cau_hoi;
  if (typeof n === "number") return n;
  if (r.chi_tiet && r.chi_tiet.length) return r.chi_tiet.length;
  return 0;
}

/** =======================
 * API
 * ======================= */
async function getExams() {
  const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
  return res.data;
}
async function deleteExam(id: string) {
  const res = await http.delete(`/api/exams/de-thi/${id}/`);
  return res.data;
}
async function getTeachers() {
  const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
  return res.data;
}
async function getResults() {
  const res = await http.get<PaginatedRes<KetQuaItem>>("/api/results/ket-qua/");
  return res.data;
}
async function getResultDetail(ketQuaId: string) {
  const res = await http.get<KetQuaItem>(`/api/results/ket-qua/${ketQuaId}/`);
  return res.data;
}

// ✅ NEW: đảm bảo có chi tiết đề thi đúng (để render câu hỏi như cột phải)
async function getExamDetail(examId: string) {
  const res = await http.get<ExamItem>(`/api/exams/de-thi/${examId}/`);
  return res.data;
}

/** =======================
 * Page
 * ======================= */
type FormValues = {
  teacher: string;
  search: string;
};

export default function ExamsTwoColumnsPage(): JSX.Element {
  const forms = useForm<FormValues>({
    defaultValues: { teacher: "", search: "" },
  });

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedExamId, setSelectedExamId] = useState<string>("");

  // ===== Modal 1: results list =====
  const [openResultsModal, setOpenResultsModal] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsErr, setResultsErr] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<KetQuaItem[]>([]);
  const [resultsExamId, setResultsExamId] = useState<string>("");

  // ===== Modal 2: result detail (render like right column) =====
  const [openResultDetailModal, setOpenResultDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<KetQuaItem | null>(null);

  // ✅ NEW: exam detail used in modal2 (the exam of selectedResult)
  const [detailExam, setDetailExam] = useState<ExamItem | null>(null);
  const [detailExamLoading, setDetailExamLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const [exData, tData] = await Promise.all([getExams(), getTeachers()]);
        if (!mounted) return;

        const list = exData.results ?? [];
        setExams(list);
        setTeachers(tData.results ?? []);

        if (list.length > 0) setSelectedExamId(list[0].IDDeThi);
      } catch (err: any) {
        if (!mounted) return;
        setErrMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const teacherOptions = useMemo(() => {
    return [
      { label: "Tất cả giáo viên", value: "" },
      ...(teachers || []).map((t) => {
        const name = t?.TaiKhoan_detail?.HoTen || t.GiaoVienID;
        const email = t?.TaiKhoan_detail?.Email;
        return { label: email ? `${name} • ${email}` : name, value: t.GiaoVienID };
      }),
    ];
  }, [teachers]);

  const selectedTeacher = forms.watch("teacher") || "";
  const keyword = (forms.watch("search") || "").trim().toLowerCase();

  const filteredExams = useMemo(() => {
    return (exams || [])
      .filter((x) => (selectedTeacher ? x.IDGiaoVien === selectedTeacher : true))
      .filter((x) => {
        if (!keyword) return true;
        const teacherName =
          x.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
          (x.IDGiaoVien_detail as any)?.GiaoVienID ||
          x.IDGiaoVien ||
          "";
        const teacherEmail = x.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";

        return (
          x.IDDeThi.toLowerCase().includes(keyword) ||
          (x.TenDeThi || "").toLowerCase().includes(keyword) ||
          teacherName.toLowerCase().includes(keyword) ||
          teacherEmail.toLowerCase().includes(keyword)
        );
      });
  }, [exams, selectedTeacher, keyword]);

  useEffect(() => {
    if (!filteredExams.length) {
      setSelectedExamId("");
      return;
    }
    const exists = filteredExams.some((x) => x.IDDeThi === selectedExamId);
    if (!exists) setSelectedExamId(filteredExams[0].IDDeThi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExams]);

  const selectedExam = useMemo(() => {
    return filteredExams.find((x) => x.IDDeThi === selectedExamId) || filteredExams[0];
  }, [filteredExams, selectedExamId]);

  const openExamResults = async (examId: string) => {
    setResultsExamId(examId);
    setOpenResultsModal(true);

    if (allResults.length > 0) return;

    setResultsLoading(true);
    setResultsErr(null);
    try {
      const rData = await getResults();
      setAllResults(rData.results ?? []);
    } catch (err: any) {
      setResultsErr(getApiErrorMessage(err));
    } finally {
      setResultsLoading(false);
    }
  };

  const closeResultsModal = () => setOpenResultsModal(false);

  const resultsOfSelectedExam = useMemo(() => {
    const list = (allResults || []).filter((x) => x.DeThiID === resultsExamId);
    return list.sort((a, b) => {
      const ta = a.ThoiGianNopBai ? new Date(a.ThoiGianNopBai).getTime() : 0;
      const tb = b.ThoiGianNopBai ? new Date(b.ThoiGianNopBai).getTime() : 0;
      return tb - ta;
    });
  }, [allResults, resultsExamId]);

  const resultsStats = useMemo(() => {
    const list = resultsOfSelectedExam;
    const total = list.length;
    const uniqueStudents = new Set(list.map((x) => x.HocVienID)).size;
    const avg =
      total === 0
        ? 0
        : Math.round((list.reduce((s, x) => s + (x.DiemSo || 0), 0) / total) * 100) /
          100;

    const lastSubmit =
      total === 0
        ? ""
        : list.reduce((best, cur) => {
            const t = cur.ThoiGianNopBai || "";
            if (!best) return t;
            return new Date(t).getTime() > new Date(best).getTime() ? t : best;
          }, "");

    return { total, uniqueStudents, avg, lastSubmit };
  }, [resultsOfSelectedExam]);

  // ✅ NEW: open modal2 (detail) and ensure exam detail + result detail
  const openResultDetail = async (row: KetQuaItem) => {
    setOpenResultDetailModal(true);
    setDetailErr(null);
    setSelectedResult(null);
    setDetailExam(null);

    setDetailLoading(true);
    setDetailExamLoading(true);

    try {
      // 1) fetch result detail (to get chi_tiet)
      const full = await getResultDetail(row.KetQuaID);
      setSelectedResult(full);

      // 2) ensure exam detail available
      const examId = full.DeThiID;
      const existed = exams.find((e) => e.IDDeThi === examId);
      if (existed && existed.chi_tiet && existed.chi_tiet.length) {
        setDetailExam(existed);
      } else {
        const exFull = await getExamDetail(examId);
        setDetailExam(exFull);
      }
    } catch (err: any) {
      setDetailErr(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
      setDetailExamLoading(false);
    }
  };

  const closeResultDetailModal = () => {
    setOpenResultDetailModal(false);
    setDetailErr(null);
    setSelectedResult(null);
    setDetailExam(null);
  };

  const onDelete = async (id: string) => {
    const ok = window.confirm("Sếp có chắc muốn xóa đề thi này không?");
    if (!ok) return;

    setDeletingId(id);
    setErrMsg(null);
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((x) => x.IDDeThi !== id));

      if (selectedExamId === id) {
        const next = filteredExams.find((x) => x.IDDeThi !== id);
        setSelectedExamId(next?.IDDeThi || "");
      }

      if (resultsExamId === id) {
        setOpenResultsModal(false);
        setResultsExamId("");
      }
    } catch (err: any) {
      setErrMsg(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // ====== Build map CauHoiID -> KetQuaDetailItem (answer by student) ======
  const answerMap = useMemo(() => {
    const map = new Map<string, KetQuaDetailItem>();
    (selectedResult?.chi_tiet || []).forEach((d) => {
      if (d.CauHoiID) map.set(d.CauHoiID, d);
    });
    return map;
  }, [selectedResult]);

  // ====== render helpers for "student answer" ======
  const renderChoiceAnswers = (q: ExamQuestionDetail, ans?: KetQuaDetailItem) => {
    const pickedId = ans?.LuaChonDaChonID; // optional
    const hasPicked = !!pickedId;

    return (
      <div className="mt-3">
        <div className="mb-2 text-sm font-bold text-slate-700">Đáp án</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(q.lua_chon || []).map((c) => {
            const isCorrect = !!c.DapAnDung;
            const isPicked = pickedId ? pickedId === c.LuaChonID : false;

            // style priority:
            // - Correct: green
            // - Picked but wrong: red
            // - Picked (even if correct): violet outline
            const base = "rounded-xl border px-3 py-2 text-sm font-semibold";
            const cls = isCorrect
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700";

            const pickedRing = isPicked ? " ring-4 ring-violet-100 border-violet-300" : "";
            const wrongPicked =
              isPicked && !isCorrect ? " border-red-200 bg-red-50 text-red-700" : "";

            return (
              <div key={c.LuaChonID} className={[base, cls, pickedRing, wrongPicked].join(" ")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">{c.NoiDungLuaChon}</div>
                  <div className="shrink-0 text-xs font-bold">
                    {isCorrect ? "✅ Đúng" : isPicked ? "👤 Chọn" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-sm text-slate-700">
          <span className="font-bold text-slate-800">Học viên chọn:</span>{" "}
          <span className="font-semibold">
            {hasPicked ? pickedId : "(Chưa có dữ liệu đáp án học viên)"}
          </span>
        </div>
      </div>
    );
  };

  const renderTuLuan = (ans?: KetQuaDetailItem) => {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-1 text-sm font-bold text-slate-700">Trả lời học viên</div>
        <div className="text-sm text-slate-700">
          {ans?.NoiDungTuLuan?.trim()
            ? ans.NoiDungTuLuan
            : "(Chưa có dữ liệu nội dung tự luận của học viên)"}
        </div>
      </div>
    );
  };

  const renderSapXepTu = (q: ExamQuestionDetail, ans?: KetQuaDetailItem) => {
    const tuSapXep = (q?.tu_sap_xep || []).slice().sort((a, b) => {
      const aa = Number(a.ThuTuDung ?? 0);
      const bb = Number(b.ThuTuDung ?? 0);
      return aa - bb;
    });

    const correctSentence = tuSapXep.length ? tuSapXep.map((x) => x.NoiDungTu).join(" ") : "";

    // student order (optional)
    let studentSentence = "";
    if (ans?.TuSapXepDaChon_Text?.length) studentSentence = ans.TuSapXepDaChon_Text.join(" ");
    else if (ans?.TuSapXepDaChon_IDTu?.length) {
      const mapIdToText = new Map(tuSapXep.map((x) => [x.IDTu, x.NoiDungTu] as const));
      studentSentence = ans.TuSapXepDaChon_IDTu.map((id) => mapIdToText.get(id) || id).join(" ");
    }

    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-sm font-bold text-slate-700">Sắp xếp từ</div>

        <div className="flex flex-wrap gap-2">
          {tuSapXep.map((w) => (
            <span
              key={w.IDTu}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
            >
              <span className="text-xs font-bold text-slate-500">{w.ThuTuDung}</span>
              <span className="font-semibold">{w.NoiDungTu}</span>
            </span>
          ))}
        </div>

        {correctSentence ? (
          <div className="mt-3 text-sm text-slate-700">
            <span className="font-bold text-slate-800">Câu đúng:</span>{" "}
            <span className="font-semibold">{correctSentence}</span>
          </div>
        ) : null}

        <div className="mt-2 text-sm text-slate-700">
          <span className="font-bold text-slate-800">Học viên sắp xếp:</span>{" "}
          <span className="font-semibold">
            {studentSentence ? studentSentence : "(Chưa có dữ liệu thứ tự học viên chọn)"}
          </span>
        </div>
      </div>
    );
  };

  const renderKhopTu = (q: ExamQuestionDetail, ans?: KetQuaDetailItem) => {
    const capTuKhop = q?.cap_tu_khop || [];
    const studentPairs = ans?.CapTuDaNoi || [];

    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 text-sm font-bold text-slate-700">Khớp từ</div>

        <div className="grid gap-2">
          {capTuKhop.map((p) => (
            <div
              key={p.IDCapTu}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1 text-slate-800">
                <span className="font-semibold">{p.TuBenTrai}</span>
                <span className="mx-2 text-slate-400">→</span>
                <span className="font-semibold">{p.TuBenPhai}</span>
              </div>

              <span className={p.LaDung ? "text-emerald-700 font-semibold" : "text-slate-500 font-semibold"}>
                {p.LaDung ? "✅ Đúng" : "Sai"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-1 text-sm font-bold text-slate-700">Học viên nối</div>
          {studentPairs.length === 0 ? (
            <div className="text-sm text-slate-600">(Chưa có dữ liệu cặp học viên nối)</div>
          ) : (
            <div className="grid gap-2">
              {studentPairs.map((x, idx) => (
                <div
                  key={`${x.Trai}-${x.Phai}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1 text-slate-800">
                    <span className="font-semibold">{x.Trai}</span>
                    <span className="mx-2 text-slate-400">→</span>
                    <span className="font-semibold">{x.Phai}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Danh sách đề kiểm tra">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {errMsg}
          </div>
        ) : null}

        {/* FILTER BAR */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xl font-bold text-slate-800">Bộ lọc</div>
              <div className="mt-1 text-slate-500">Chọn giáo viên / tìm theo tên hoặc ID đề thi.</div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-90 max-w-full">
                <Input
                  name="search"
                  type="search"
                  label="Tìm kiếm"
                  placeholder="Nhập tên đề thi / ID / giáo viên..."
                  inputClassName="focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="w-90 max-w-full">
                <DropdownSelectPortal
                  name="teacher"
                  label="Giáo viên"
                  placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
                  options={teacherOptions}
                  menuWidth={520}
                  placement="bottom"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-700">
              {filteredExams.length} / {exams.length} đề
            </div>
            {loading ? <div className="text-sm font-semibold text-slate-500">Đang tải...</div> : null}
          </div>
        </div>

        {/* TWO COLUMNS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-bold text-slate-800">Bài kiểm tra</div>
                <div className="text-sm font-semibold text-slate-500">{filteredExams.length} đề</div>
              </div>

              <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                <div className="space-y-3">
                  {filteredExams.map((exam) => {
                    const active = exam.IDDeThi === selectedExamId;
                    const teacherName =
                      exam.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen || exam.IDGiaoVien;

                    return (
                      <button
                        key={exam.IDDeThi}
                        type="button"
                        onClick={() => setSelectedExamId(exam.IDDeThi)}
                        className={[
                          "w-full text-left rounded-xl border-2 over p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
                          active
                            ? "border-violet-300 bg-white"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-slate-800">
                              {exam.TenDeThi}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">ID: {exam.IDDeThi}</div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                ⏱ {timeToMinutesLabel(exam.ThoiGianLamBaiThi)}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                🧾 {exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0} câu
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                👨‍🏫 {teacherName}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExamId(exam.IDDeThi);
                                openExamResults(exam.IDDeThi);
                              }}
                              className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                            >
                              Xem kết quả
                            </button>

                            <Link
                              to={`/teacher/exams/${exam.IDDeThi}`}
                              onClick={(e) => e.stopPropagation()}
                              className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                            >
                              Sửa
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(exam.IDDeThi);
                              }}
                              disabled={deletingId === exam.IDDeThi}
                              className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId === exam.IDDeThi ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {!loading && filteredExams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                      Không có đề thi nào phù hợp.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              {!selectedExam ? (
                <div className="text-slate-600">Chọn một bài kiểm tra để xem chi tiết câu hỏi.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xl font-bold text-slate-800">{selectedExam.TenDeThi}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">ID:</span> {selectedExam.IDDeThi} •{" "}
                        <span className="font-semibold text-slate-700">Thời gian:</span>{" "}
                        {selectedExam.ThoiGianLamBaiThi} (
                        {timeToMinutesLabel(selectedExam.ThoiGianLamBaiThi)})
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                      {selectedExam.so_cau_hoi ?? selectedExam.chi_tiet?.length ?? 0} câu hỏi
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(selectedExam.chi_tiet || [])
                      .slice()
                      .sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0))
                      .map((ct) => {
                        const q = ct.IDCauHoi_detail;
                        const tuSapXep = (q?.tu_sap_xep || []).slice().sort((a, b) => {
                          const aa = Number(a.ThuTuDung ?? 0);
                          const bb = Number(b.ThuTuDung ?? 0);
                          return aa - bb;
                        });

                        const correctSentence =
                          tuSapXep.length > 0 ? tuSapXep.map((x) => x.NoiDungTu).join(" ") : "";

                        const capTuKhop = q?.cap_tu_khop || [];

                        return (
                          <div
                            key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-bold text-slate-800">
                                  Câu {ct.ThuTuCauHoi} • {typeLabel(q?.LoaiCauHoi)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {q?.IDCauHoi} • {q?.IDBaiHoc}
                                </div>
                              </div>

                              {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                  🔊 Audio
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
                              <TiptapViewer content={JSON.parse(q?.NoiDungCauHoi)} />
                            </div>

                            {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
                              <div className="mt-3">
                                <audio controls className="w-full">
                                  <source src={q.FileNghe_url || ""} />
                                </audio>
                              </div>
                            ) : null}

                            {q?.LoaiCauHoi !== "tuluan" && q?.lua_chon?.length ? (
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {q.lua_chon.map((c) => (
                                  <div
                                    key={c.LuaChonID}
                                    className={[
                                      "rounded-xl border px-3 py-2 text-sm font-semibold",
                                      c.DapAnDung
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-white text-slate-700",
                                    ].join(" ")}
                                  >
                                    {c.NoiDungLuaChon}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {q?.LoaiCauHoi === "sapxeptu" && tuSapXep.length ? (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 text-sm font-bold text-slate-700">
                                  Từ cần sắp xếp
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {tuSapXep.map((w) => (
                                    <span
                                      key={w.IDTu}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                                    >
                                      <span className="text-xs font-bold text-slate-500">
                                        {w.ThuTuDung}
                                      </span>
                                      <span className="font-semibold">{w.NoiDungTu}</span>
                                    </span>
                                  ))}
                                </div>

                                {correctSentence ? (
                                  <div className="mt-3 text-sm text-slate-700">
                                    <span className="font-bold text-slate-800">Câu đúng:</span>{" "}
                                    <span className="font-semibold">{correctSentence}</span>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {q?.LoaiCauHoi === "khoptu" && capTuKhop.length ? (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 text-sm font-bold text-slate-700">Cặp từ khớp</div>

                                <div className="grid gap-2">
                                  {capTuKhop.map((p) => (
                                    <div
                                      key={p.IDCapTu}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                    >
                                      <div className="min-w-0 flex-1 text-slate-800">
                                        <span className="font-semibold">{p.TuBenTrai}</span>
                                        <span className="mx-2 text-slate-400">→</span>
                                        <span className="font-semibold">{p.TuBenPhai}</span>
                                      </div>

                                      <span
                                        className={
                                          p.LaDung
                                            ? "text-emerald-700 font-semibold"
                                            : "text-slate-500 font-semibold"
                                        }
                                      >
                                        {p.LaDung ? "✅ Đúng" : "Sai"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {q?.GiaiThich ? (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                <span className="font-bold">Giải thích:</span> {q.GiaiThich}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                    {!selectedExam.chi_tiet || selectedExam.chi_tiet.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
                        Đề thi này chưa có câu hỏi.
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* =========================
            MODAL 1: Kết quả theo đề thi
           ========================= */}
        <Modal
          open={openResultsModal}
          onClose={closeResultsModal}
          title={
            <div className="flex flex-col gap-1">
              <div className="text-base font-bold text-slate-800">Kết quả bài kiểm tra</div>
              <div className="text-xs text-slate-500">
                DeThiID: <span className="font-semibold">{resultsExamId || "-"}</span>
              </div>
            </div>
          }
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResultsModal}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          }
        >
          <div className="w-[min(1150px,92vw)]">
            {resultsErr ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">
                {resultsErr}
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                Tổng lượt làm: {resultsStats.total}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                Số học viên: {resultsStats.uniqueStudents}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                Điểm TB: {resultsStats.avg}
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
                Nộp gần nhất: {resultsStats.lastSubmit ? toLocalDatetime(resultsStats.lastSubmit) : "-"}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="p-3 text-left font-bold text-slate-700">Học viên</th>
                      <th className="p-3 text-left font-bold text-slate-700">Lớp</th>
                      <th className="p-3 text-right font-bold text-slate-700">Điểm</th>
                      <th className="p-3 text-center font-bold text-slate-700">Đúng/Tổng</th>
                      <th className="p-3 text-center font-bold text-slate-700">Thời gian làm</th>
                      <th className="p-3 text-left font-bold text-slate-700">Nộp lúc</th>
                      <th className="p-3 text-left font-bold text-slate-700">KetQuaID</th>
                      <th className="p-3 text-right font-bold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody>
                    {resultsLoading ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-600">
                          Đang tải kết quả...
                        </td>
                      </tr>
                    ) : resultsOfSelectedExam.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-600">
                          Chưa có kết quả cho đề thi này.
                        </td>
                      </tr>
                    ) : (
                      resultsOfSelectedExam.map((r) => {
                        const correct = correctCount(r);
                        const totalQ = totalQuestionsFromResult(r);
                        const dur = durationMMSS(r.ThoiGianBatDau, r.ThoiGianNopBai);

                        return (
                          <tr key={r.KetQuaID} className="border-t border-slate-200">
                            <td className="p-3 font-semibold text-slate-800">{getStudentName(r)}</td>
                            <td className="p-3 text-slate-700">{getClassName(r)}</td>
                            <td className="p-3 text-right font-bold text-slate-800">{r.DiemSo}</td>
                            <td className="p-3 text-center text-slate-700">
                              {correct}/{totalQ || "-"}
                            </td>
                            <td className="p-3 text-center text-slate-700">{dur}</td>
                            <td className="p-3 text-slate-700">{toLocalDatetime(r.ThoiGianNopBai)}</td>
                            <td className="p-3 text-slate-500">{r.KetQuaID}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => openResultDetail(r)}
                                className="h-9 rounded-xl border border-violet-200 bg-violet-50 px-3 font-semibold text-violet-700 hover:bg-violet-100"
                              >
                                Xem
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>

        {/* =========================
            MODAL 2: Chi tiết bài làm (GIỐNG CỘT BÊN PHẢI)
           ========================= */}
        <Modal
          open={openResultDetailModal}
          onClose={closeResultDetailModal}
          title={
            <div className="flex flex-col gap-1">
              <div className="text-base font-bold text-slate-800">Chi tiết bài làm</div>
              <div className="text-xs text-slate-500">
                KetQuaID:{" "}
                <span className="font-semibold">{selectedResult?.KetQuaID || "-"}</span>
              </div>
            </div>
          }
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeResultDetailModal}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          }
        >
          <div className="w-[min(1100px,92vw)]">
            {detailErr ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">
                {detailErr}
              </div>
            ) : null}

            {detailLoading || detailExamLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
                Đang tải chi tiết...
              </div>
            ) : !selectedResult || !detailExam ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
                Không có dữ liệu chi tiết.
              </div>
            ) : (
              <>
                {/* Summary header */}
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-slate-800">
                        {getStudentName(selectedResult)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Lớp:{" "}
                        <span className="font-semibold text-slate-700">
                          {getClassName(selectedResult)}
                        </span>
                        {" • "}
                        Nộp lúc:{" "}
                        <span className="font-semibold text-slate-700">
                          {toLocalDatetime(selectedResult.ThoiGianNopBai)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Đề:{" "}
                        <span className="font-semibold text-slate-700">
                          {detailExam.TenDeThi} ({detailExam.IDDeThi})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        Điểm: {selectedResult.DiemSo}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                        Đúng: {correctCount(selectedResult)}/{totalQuestionsFromResult(selectedResult) || "-"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                        Thời gian làm:{" "}
                        {durationMMSS(selectedResult.ThoiGianBatDau, selectedResult.ThoiGianNopBai)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Questions like right column */}
                <div className="space-y-3">
                  {(detailExam.chi_tiet || [])
                    .slice()
                    .sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0))
                    .map((ct) => {
                      const q = ct.IDCauHoi_detail;
                      const ans = answerMap.get(q?.IDCauHoi);

                      return (
                        <div
                          key={`${detailExam.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-slate-800">
                                Câu {ct.ThuTuCauHoi} • {typeLabel(q?.LoaiCauHoi)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {q?.IDCauHoi} • {q?.IDBaiHoc}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                  🔊 Audio
                                </span>
                              ) : null}

                              <span
                                className={[
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
                                  ans?.LaDung ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                                ].join(" ")}
                              >
                                {ans ? (ans.LaDung ? "✅ Đúng" : "❌ Sai") : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
                            <TiptapViewer content={JSON.parse(q?.NoiDungCauHoi)} />
                          </div>

                          {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
                            <div className="mt-3">
                              <audio controls className="w-full">
                                <source src={q.FileNghe_url || ""} />
                              </audio>
                            </div>
                          ) : null}

                          {/* Render answer by type */}
                          {q?.LoaiCauHoi === "tuluan" ? (
                            renderTuLuan(ans)
                          ) : q?.LoaiCauHoi === "sapxeptu" ? (
                            renderSapXepTu(q, ans)
                          ) : q?.LoaiCauHoi === "khoptu" ? (
                            renderKhopTu(q, ans)
                          ) : (
                            // tracnghiem / nghe
                            renderChoiceAnswers(q, ans)
                          )}

                          {q?.GiaiThich ? (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                              <span className="font-bold">Giải thích:</span> {q.GiaiThich}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                  {!detailExam.chi_tiet || detailExam.chi_tiet.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
                      Đề thi này chưa có câu hỏi.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </Modal>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}

// import React, { useEffect, useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";

// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// import { http } from "utils/libs/https";
// import { Link } from "react-router";
// import { TiptapViewer } from "components/tiptap-viewer";
// import { Modal } from "elements/modal/modal";

// /** =======================
//  * Types
//  * ======================= */
// type PaginatedRes<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// type TeacherItem = {
//   GiaoVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: {
//     HoTen?: string;
//     Email?: string;
//   };
// };

// type ExamQuestionChoice = {
//   LuaChonID: string;
//   CauHoiID: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean;
// };

// type SapXepTuItem = {
//   IDTu: string;
//   CauHoiID: string;
//   NoiDungTu: string;
//   ThuTuDung: number;
// };

// type CapTuKhopItem = {
//   IDCapTu: string;
//   CauHoiID: string;
//   TuBenTrai: string;
//   TuBenPhai: string;
//   LaDung: boolean;
// };

// type ExamQuestionDetail = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: string;
//   LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
//   GiaiThich: string | null;
//   FileNghe_url: string | null;

//   lua_chon: ExamQuestionChoice[];
//   tu_sap_xep?: SapXepTuItem[];
//   cap_tu_khop?: CapTuKhopItem[];
// };

// type ExamChiTiet = {
//   IDDeThi: string;
//   IDCauHoi: string;
//   ThuTuCauHoi: number;
//   IDCauHoi_detail: ExamQuestionDetail;
// };

// type ExamItem = {
//   IDDeThi: string;
//   TenDeThi: string;
//   ThoiGianLamBaiThi: string;
//   IDGiaoVien: string;
//   IDGiaoVien_detail?: TeacherItem;
//   chi_tiet: ExamChiTiet[];
//   so_cau_hoi: number;
// };

// /** =======================
//  * Result types
//  * ======================= */
// type KetQuaDetailItem = {
//   ChiTietBaiLamID: string;
//   LaDung: boolean;
//   CauHoiID?: string;
// };

// type KetQuaItem = {
//   KetQuaID: string;
//   DiemSo: number;

//   ThoiGianBatDau: string;
//   ThoiGianNopBai: string;

//   HocVienID: string;
//   HocVienID_detail?: {
//     TaiKhoan_detail?: {
//       HoTen?: string;
//       Email?: string;
//     };
//   };

//   DeThiID: string;
//   DeThiID_detail?: {
//     IDDeThi?: string;
//     TenDeThi?: string;
//     so_cau_hoi?: number;
//   };

//   LichThiID?: string;
//   LichThiID_detail?: {
//     IDLopHoc_detail?: {
//       IDLopHoc?: string;
//       TenLopHoc?: string;
//     };
//   };

//   chi_tiet?: KetQuaDetailItem[];
// };

// /** =======================
//  * Helpers
//  * ======================= */
// function getApiErrorMessage(err: any) {
//   const data = err?.response?.data;
//   if (!data) return err?.message || "Có lỗi xảy ra.";
//   if (typeof data?.detail === "string") return data.detail;
//   if (typeof data?.message === "string") return data.message;
//   if (Array.isArray(data)) return data[0];
//   const firstKey = Object.keys(data)[0];
//   const val = data[firstKey];
//   if (Array.isArray(val)) return val[0];
//   if (typeof val === "string") return val;
//   return "Có lỗi xảy ra.";
// }

// function tiptapToText(input: any): string {
//   if (input == null) return "";
//   const raw = typeof input === "string" ? input : JSON.stringify(input);

//   if (!raw.trim().startsWith("{") && !raw.trim().startsWith("[")) return raw;

//   try {
//     const doc = typeof input === "string" ? JSON.parse(input) : input;
//     const out: string[] = [];
//     const walk = (node: any) => {
//       if (!node) return;
//       if (Array.isArray(node)) return node.forEach(walk);
//       if (node.type === "text" && typeof node.text === "string") out.push(node.text);
//       if (node.content) walk(node.content);
//     };
//     walk(doc);
//     const text = out.join(" ").replace(/\s+/g, " ").trim();
//     return text || "(Không có nội dung)";
//   } catch {
//     return raw;
//   }
// }

// function timeToMinutesLabel(hms: string) {
//   const parts = (hms || "").split(":").map((x) => Number(x));
//   if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return hms;
//   const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
//   const totalMin = Math.round(hh * 60 + mm + ss / 60);
//   return `${totalMin} phút`;
// }

// function typeLabel(t: string) {
//   if (t === "nghe") return "Nghe";
//   if (t === "tracnghiem") return "Trắc nghiệm";
//   if (t === "tuluan") return "Tự luận";
//   if (t === "sapxeptu") return "Sắp xếp từ";
//   if (t === "khoptu") return "Khớp từ";
//   return t || "-";
// }

// function toLocalDatetime(iso: string) {
//   if (!iso) return "-";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return iso;
//   return d.toLocaleString();
// }

// function durationMMSS(startISO: string, endISO: string): string {
//   const start = new Date(startISO).getTime();
//   const end = new Date(endISO).getTime();
//   const diff = Math.max(0, end - start);
//   const totalSec = Math.floor(diff / 1000);
//   const m = Math.floor(totalSec / 60);
//   const s = totalSec % 60;
//   return `${m}m ${String(s).padStart(2, "0")}s`;
// }

// function getStudentName(r: KetQuaItem): string {
//   return (
//     r.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
//     r.HocVienID_detail?.TaiKhoan_detail?.Email ||
//     r.HocVienID
//   );
// }

// function getClassName(r: KetQuaItem): string {
//   return r.LichThiID_detail?.IDLopHoc_detail?.TenLopHoc || "-";
// }

// function correctCount(r: KetQuaItem): number {
//   return (r.chi_tiet || []).filter((x) => x.LaDung).length;
// }

// function totalQuestionsFromResult(r: KetQuaItem): number {
//   const n = r.DeThiID_detail?.so_cau_hoi;
//   if (typeof n === "number") return n;
//   if (r.chi_tiet && r.chi_tiet.length) return r.chi_tiet.length;
//   return 0;
// }

// /** =======================
//  * API (inline)
//  * ======================= */
// async function getExams() {
//   const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
//   return res.data;
// }
// async function deleteExam(id: string) {
//   const res = await http.delete(`/api/exams/de-thi/${id}/`);
//   return res.data;
// }
// async function getTeachers() {
//   const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
//   return res.data;
// }
// async function getResults() {
//   const res = await http.get<PaginatedRes<KetQuaItem>>("/api/results/ket-qua/");
//   return res.data;
// }

// // ✅ NEW: get detail one result (sếp đổi endpoint nếu khác)
// async function getResultDetail(ketQuaId: string) {
//   const res = await http.get<KetQuaItem>(`/api/results/ket-qua/${ketQuaId}/`);
//   return res.data;
// }

// /** =======================
//  * Page
//  * ======================= */
// type FormValues = {
//   teacher: string;
//   search: string;
// };

// export default function ExamsTwoColumnsPage(): JSX.Element {
//   const forms = useForm<FormValues>({
//     defaultValues: { teacher: "", search: "" },
//   });

//   const [exams, setExams] = useState<ExamItem[]>([]);
//   const [teachers, setTeachers] = useState<TeacherItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   const [selectedExamId, setSelectedExamId] = useState<string>("");

//   // ===== Results list modal =====
//   const [openResultsModal, setOpenResultsModal] = useState(false);
//   const [resultsLoading, setResultsLoading] = useState(false);
//   const [resultsErr, setResultsErr] = useState<string | null>(null);
//   const [allResults, setAllResults] = useState<KetQuaItem[]>([]);
//   const [resultsExamId, setResultsExamId] = useState<string>("");

//   // ===== Result detail modal (NEW) =====
//   const [openResultDetailModal, setOpenResultDetailModal] = useState(false);
//   const [detailLoading, setDetailLoading] = useState(false);
//   const [detailErr, setDetailErr] = useState<string | null>(null);
//   const [selectedResult, setSelectedResult] = useState<KetQuaItem | null>(null);

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       setLoading(true);
//       setErrMsg(null);
//       try {
//         const [exData, tData] = await Promise.all([getExams(), getTeachers()]);
//         if (!mounted) return;

//         const list = exData.results ?? [];
//         setExams(list);
//         setTeachers(tData.results ?? []);

//         if (list.length > 0) setSelectedExamId(list[0].IDDeThi);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const teacherOptions = useMemo(() => {
//     return [
//       { label: "Tất cả giáo viên", value: "" },
//       ...(teachers || []).map((t) => {
//         const name = t?.TaiKhoan_detail?.HoTen || t.GiaoVienID;
//         const email = t?.TaiKhoan_detail?.Email;
//         return { label: email ? `${name} • ${email}` : name, value: t.GiaoVienID };
//       }),
//     ];
//   }, [teachers]);

//   const selectedTeacher = forms.watch("teacher") || "";
//   const keyword = (forms.watch("search") || "").trim().toLowerCase();

//   const filteredExams = useMemo(() => {
//     return (exams || [])
//       .filter((x) => (selectedTeacher ? x.IDGiaoVien === selectedTeacher : true))
//       .filter((x) => {
//         if (!keyword) return true;
//         const teacherName =
//           x.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//           (x.IDGiaoVien_detail as any)?.GiaoVienID ||
//           x.IDGiaoVien ||
//           "";
//         const teacherEmail = x.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";

//         return (
//           x.IDDeThi.toLowerCase().includes(keyword) ||
//           (x.TenDeThi || "").toLowerCase().includes(keyword) ||
//           teacherName.toLowerCase().includes(keyword) ||
//           teacherEmail.toLowerCase().includes(keyword)
//         );
//       });
//   }, [exams, selectedTeacher, keyword]);

//   useEffect(() => {
//     if (!filteredExams.length) {
//       setSelectedExamId("");
//       return;
//     }
//     const exists = filteredExams.some((x) => x.IDDeThi === selectedExamId);
//     if (!exists) setSelectedExamId(filteredExams[0].IDDeThi);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filteredExams]);

//   const selectedExam = useMemo(() => {
//     return filteredExams.find((x) => x.IDDeThi === selectedExamId) || filteredExams[0];
//   }, [filteredExams, selectedExamId]);

//   // ===== Open results modal =====
//   const openExamResults = async (examId: string) => {
//     setResultsExamId(examId);
//     setOpenResultsModal(true);

//     if (allResults.length > 0) return;

//     setResultsLoading(true);
//     setResultsErr(null);
//     try {
//       const rData = await getResults();
//       setAllResults(rData.results ?? []);
//     } catch (err: any) {
//       setResultsErr(getApiErrorMessage(err));
//     } finally {
//       setResultsLoading(false);
//     }
//   };

//   const closeResultsModal = () => setOpenResultsModal(false);

//   const resultsOfSelectedExam = useMemo(() => {
//     const list = (allResults || []).filter((x) => x.DeThiID === resultsExamId);
//     return list.sort((a, b) => {
//       const ta = a.ThoiGianNopBai ? new Date(a.ThoiGianNopBai).getTime() : 0;
//       const tb = b.ThoiGianNopBai ? new Date(b.ThoiGianNopBai).getTime() : 0;
//       return tb - ta;
//     });
//   }, [allResults, resultsExamId]);

//   const resultsStats = useMemo(() => {
//     const list = resultsOfSelectedExam;
//     const total = list.length;
//     const uniqueStudents = new Set(list.map((x) => x.HocVienID)).size;
//     const avg =
//       total === 0
//         ? 0
//         : Math.round((list.reduce((s, x) => s + (x.DiemSo || 0), 0) / total) * 100) /
//           100;

//     const lastSubmit =
//       total === 0
//         ? ""
//         : list.reduce((best, cur) => {
//             const t = cur.ThoiGianNopBai || "";
//             if (!best) return t;
//             return new Date(t).getTime() > new Date(best).getTime() ? t : best;
//           }, "");

//     return { total, uniqueStudents, avg, lastSubmit };
//   }, [resultsOfSelectedExam]);

//   // ===== NEW: open detail modal for one result =====
//   const openResultDetail = async (row: KetQuaItem) => {
//     setOpenResultDetailModal(true);
//     setDetailErr(null);

//     // reset
//     setSelectedResult(null);

//     // nếu row đã có chi_tiet thì show ngay, đồng thời thử fetch detail để chắc đầy đủ
//     const rowHasDetails = !!row?.chi_tiet && row.chi_tiet.length > 0;
//     if (rowHasDetails) setSelectedResult(row);

//     setDetailLoading(true);
//     try {
//       // fetch detail (nếu backend không có endpoint này, sếp sửa lại getResultDetail)
//       const full = await getResultDetail(row.KetQuaID);
//       setSelectedResult(full);
//     } catch (err: any) {
//       // nếu fetch lỗi mà đã có row chi_tiet thì vẫn ok, chỉ show warning
//       if (!rowHasDetails) setDetailErr(getApiErrorMessage(err));
//       else setDetailErr("Không tải được chi tiết từ server, đang hiển thị dữ liệu hiện có.");
//     } finally {
//       setDetailLoading(false);
//     }
//   };

//   const closeResultDetailModal = () => {
//     setOpenResultDetailModal(false);
//     setDetailErr(null);
//     setSelectedResult(null);
//   };

//   const onDelete = async (id: string) => {
//     const ok = window.confirm("Sếp có chắc muốn xóa đề thi này không?");
//     if (!ok) return;

//     setDeletingId(id);
//     setErrMsg(null);
//     try {
//       await deleteExam(id);
//       setExams((prev) => prev.filter((x) => x.IDDeThi !== id));

//       if (selectedExamId === id) {
//         const next = filteredExams.find((x) => x.IDDeThi !== id);
//         setSelectedExamId(next?.IDDeThi || "");
//       }

//       if (resultsExamId === id) {
//         setOpenResultsModal(false);
//         setResultsExamId("");
//       }
//     } catch (err: any) {
//       setErrMsg(getApiErrorMessage(err));
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Danh sách đề kiểm tra">
//         {errMsg ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
//             {errMsg}
//           </div>
//         ) : null}

//         {/* FILTER BAR */}
//         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex flex-wrap items-end justify-between gap-4">
//             <div>
//               <div className="text-xl font-bold text-slate-800">Bộ lọc</div>
//               <div className="mt-1 text-slate-500">
//                 Chọn giáo viên / tìm theo tên hoặc ID đề thi.
//               </div>
//             </div>

//             <div className="flex flex-wrap items-end gap-3">
//               <div className="w-90 max-w-full">
//                 <Input
//                   name="search"
//                   type="search"
//                   label="Tìm kiếm"
//                   placeholder="Nhập tên đề thi / ID / giáo viên..."
//                   inputClassName="focus:ring-4 focus:ring-violet-100"
//                 />
//               </div>

//               <div className="w-90 max-w-full">
//                 <DropdownSelectPortal
//                   name="teacher"
//                   label="Giáo viên"
//                   placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
//                   options={teacherOptions}
//                   menuWidth={520}
//                   placement="bottom"
//                   disabled={loading}
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="mt-4 flex items-center justify-between gap-3">
//             <div className="font-semibold text-slate-700">
//               {filteredExams.length} / {exams.length} đề
//             </div>
//             {loading ? (
//               <div className="text-sm font-semibold text-slate-500">Đang tải...</div>
//             ) : null}
//           </div>
//         </div>

//         {/* TWO COLUMNS */}
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
//           {/* LEFT */}
//           <div className="lg:col-span-5">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               <div className="mb-3 flex items-center justify-between">
//                 <div className="text-lg font-bold text-slate-800">Bài kiểm tra</div>
//                 <div className="text-sm font-semibold text-slate-500">{filteredExams.length} đề</div>
//               </div>

//               <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
//                 <div className="space-y-3">
//                   {filteredExams.map((exam) => {
//                     const active = exam.IDDeThi === selectedExamId;
//                     const teacherName =
//                       exam.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen || exam.IDGiaoVien;

//                     return (
//                       <button
//                         key={exam.IDDeThi}
//                         type="button"
//                         onClick={() => setSelectedExamId(exam.IDDeThi)}
//                         className={[
//                           "w-full text-left rounded-xl border-2 over p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
//                           active
//                             ? "border-violet-300 bg-white"
//                             : "border-slate-200 bg-white hover:bg-slate-50",
//                         ].join(" ")}
//                       >
//                         <div className="flex items-start justify-between">
//                           <div className="min-w-0">
//                             <div className="truncate text-base font-bold text-slate-800">
//                               {exam.TenDeThi}
//                             </div>
//                             <div className="mt-1 text-xs text-slate-500">ID: {exam.IDDeThi}</div>

//                             <div className="mt-2 flex flex-wrap gap-2">
//                               <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
//                                 ⏱ {timeToMinutesLabel(exam.ThoiGianLamBaiThi)}
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
//                                 🧾 {exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0} câu
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
//                                 👨‍🏫 {teacherName}
//                               </span>
//                             </div>
//                           </div>

//                           <div className="flex flex-wrap items-center gap-3">
//                             <button
//                               type="button"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 setSelectedExamId(exam.IDDeThi);
//                                 openExamResults(exam.IDDeThi);
//                               }}
//                               className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//                             >
//                               Xem kết quả
//                             </button>

//                             <Link
//                               to={`/teacher/exams/${exam.IDDeThi}`}
//                               onClick={(e) => e.stopPropagation()}
//                               className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//                             >
//                               Sửa
//                             </Link>

//                             <button
//                               type="button"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 onDelete(exam.IDDeThi);
//                               }}
//                               disabled={deletingId === exam.IDDeThi}
//                               className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
//                             >
//                               {deletingId === exam.IDDeThi ? "Đang xóa..." : "Xóa"}
//                             </button>
//                           </div>
//                         </div>
//                       </button>
//                     );
//                   })}

//                   {!loading && filteredExams.length === 0 ? (
//                     <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
//                       Không có đề thi nào phù hợp.
//                     </div>
//                   ) : null}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* RIGHT */}
//           <div className="lg:col-span-7">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               {!selectedExam ? (
//                 <div className="text-slate-600">Chọn một bài kiểm tra để xem chi tiết câu hỏi.</div>
//               ) : (
//                 <>
//                   <div className="flex flex-wrap items-start justify-between gap-3">
//                     <div className="min-w-0">
//                       <div className="text-xl font-bold text-slate-800">{selectedExam.TenDeThi}</div>
//                       <div className="mt-1 text-sm text-slate-500">
//                         <span className="font-semibold text-slate-700">ID:</span>{" "}
//                         {selectedExam.IDDeThi} •{" "}
//                         <span className="font-semibold text-slate-700">Thời gian:</span>{" "}
//                         {selectedExam.ThoiGianLamBaiThi} (
//                         {timeToMinutesLabel(selectedExam.ThoiGianLamBaiThi)})
//                       </div>
//                     </div>

//                     <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
//                       {selectedExam.so_cau_hoi ?? selectedExam.chi_tiet?.length ?? 0} câu hỏi
//                     </span>
//                   </div>

//                   <div className="mt-5 space-y-3">
//                     {(selectedExam.chi_tiet || [])
//                       .slice()
//                       .sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0))
//                       .map((ct) => {
//                         const q = ct.IDCauHoi_detail;
//                         const contentText = tiptapToText(q?.NoiDungCauHoi);

//                         const tuSapXep = (q?.tu_sap_xep || []).slice().sort((a, b) => {
//                           const aa = Number(a.ThuTuDung ?? 0);
//                           const bb = Number(b.ThuTuDung ?? 0);
//                           return aa - bb;
//                         });

//                         const correctSentence =
//                           tuSapXep.length > 0 ? tuSapXep.map((x) => x.NoiDungTu).join(" ") : "";

//                         const capTuKhop = q?.cap_tu_khop || [];

//                         return (
//                           <div
//                             key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
//                             className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                           >
//                             <div className="flex flex-wrap items-start justify-between gap-3">
//                               <div>
//                                 <div className="text-sm font-bold text-slate-800">
//                                   Câu {ct.ThuTuCauHoi} • {typeLabel(q?.LoaiCauHoi)}
//                                 </div>
//                                 <div className="mt-1 text-xs text-slate-500">
//                                   {q?.IDCauHoi} • {q?.IDBaiHoc}
//                                 </div>
//                               </div>

//                               {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                                 <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
//                                   🔊 Audio
//                                 </span>
//                               ) : null}
//                             </div>

//                             <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
//                               {/* {contentText} */}
//                               <TiptapViewer content={JSON.parse(q?.NoiDungCauHoi)} />
//                             </div>

//                             {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                               <div className="mt-3">
//                                 <audio controls className="w-full">
//                                   <source src={q.FileNghe_url || ""} />
//                                 </audio>
//                               </div>
//                             ) : null}

//                             {q?.LoaiCauHoi !== "tuluan" && q?.lua_chon?.length ? (
//                               <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
//                                 {q.lua_chon.map((c) => (
//                                   <div
//                                     key={c.LuaChonID}
//                                     className={[
//                                       "rounded-xl border px-3 py-2 text-sm font-semibold",
//                                       c.DapAnDung
//                                         ? "border-emerald-200 bg-emerald-50 text-emerald-700"
//                                         : "border-slate-200 bg-white text-slate-700",
//                                     ].join(" ")}
//                                   >
//                                     {c.NoiDungLuaChon}
//                                   </div>
//                                 ))}
//                               </div>
//                             ) : null}

//                             {q?.LoaiCauHoi === "sapxeptu" && tuSapXep.length ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                                 <div className="mb-2 text-sm font-bold text-slate-700">
//                                   Từ cần sắp xếp
//                                 </div>

//                                 <div className="flex flex-wrap gap-2">
//                                   {tuSapXep.map((w) => (
//                                     <span
//                                       key={w.IDTu}
//                                       className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
//                                     >
//                                       <span className="text-xs font-bold text-slate-500">
//                                         {w.ThuTuDung}
//                                       </span>
//                                       <span className="font-semibold">{w.NoiDungTu}</span>
//                                     </span>
//                                   ))}
//                                 </div>

//                                 {correctSentence ? (
//                                   <div className="mt-3 text-sm text-slate-700">
//                                     <span className="font-bold text-slate-800">Câu đúng:</span>{" "}
//                                     <span className="font-semibold">{correctSentence}</span>
//                                   </div>
//                                 ) : null}
//                               </div>
//                             ) : null}

//                             {q?.LoaiCauHoi === "khoptu" && capTuKhop.length ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                                 <div className="mb-2 text-sm font-bold text-slate-700">Cặp từ khớp</div>

//                                 <div className="grid gap-2">
//                                   {capTuKhop.map((p) => (
//                                     <div
//                                       key={p.IDCapTu}
//                                       className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
//                                     >
//                                       <div className="min-w-0 flex-1 text-slate-800">
//                                         <span className="font-semibold">{p.TuBenTrai}</span>
//                                         <span className="mx-2 text-slate-400">→</span>
//                                         <span className="font-semibold">{p.TuBenPhai}</span>
//                                       </div>

//                                       <span
//                                         className={
//                                           p.LaDung
//                                             ? "text-emerald-700 font-semibold"
//                                             : "text-slate-500 font-semibold"
//                                         }
//                                       >
//                                         {p.LaDung ? "✅ Đúng" : "Sai"}
//                                       </span>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             ) : null}

//                             {q?.GiaiThich ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
//                                 <span className="font-bold">Giải thích:</span> {q.GiaiThich}
//                               </div>
//                             ) : null}
//                           </div>
//                         );
//                       })}

//                     {!selectedExam.chi_tiet || selectedExam.chi_tiet.length === 0 ? (
//                       <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
//                         Đề thi này chưa có câu hỏi.
//                       </div>
//                     ) : null}
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* =========================
//             MODAL 1: Danh sách kết quả theo đề thi
//            ========================= */}
//         <Modal
//           open={openResultsModal}
//           onClose={closeResultsModal}
//           title={
//             <div className="flex flex-col gap-1">
//               <div className="text-base font-bold text-slate-800">Kết quả bài kiểm tra</div>
//               <div className="text-xs text-slate-500">
//                 DeThiID: <span className="font-semibold">{resultsExamId || "-"}</span>
//               </div>
//             </div>
//           }
//           footer={
//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeResultsModal}
//                 className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
//               >
//                 Đóng
//               </button>
//             </div>
//           }
//         >
//           <div className="w-[min(1150px,92vw)]">
//             {resultsErr ? (
//               <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">
//                 {resultsErr}
//               </div>
//             ) : null}

//             <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
//               <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
//                 Tổng lượt làm: {resultsStats.total}
//               </span>
//               <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
//                 Số học viên: {resultsStats.uniqueStudents}
//               </span>
//               <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
//                 Điểm TB: {resultsStats.avg}
//               </span>
//               <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
//                 Nộp gần nhất: {resultsStats.lastSubmit ? toLocalDatetime(resultsStats.lastSubmit) : "-"}
//               </span>

//               <button
//                 type="button"
//                 onClick={async () => {
//                   setAllResults([]);
//                   setResultsLoading(true);
//                   setResultsErr(null);
//                   try {
//                     const rData = await getResults();
//                     setAllResults(rData.results ?? []);
//                   } catch (err: any) {
//                     setResultsErr(getApiErrorMessage(err));
//                   } finally {
//                     setResultsLoading(false);
//                   }
//                 }}
//                 className="ml-auto h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
//               >
//                 Tải lại
//               </button>
//             </div>

//             <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
//               <div className="max-h-[60vh] overflow-auto">
//                 <table className="w-full border-collapse text-sm">
//                   <thead className="sticky top-0 bg-slate-50">
//                     <tr className="border-b border-slate-200">
//                       <th className="p-3 text-left font-bold text-slate-700">Học viên</th>
//                       <th className="p-3 text-left font-bold text-slate-700">Lớp</th>
//                       <th className="p-3 text-right font-bold text-slate-700">Điểm</th>
//                       <th className="p-3 text-center font-bold text-slate-700">Đúng/Tổng</th>
//                       <th className="p-3 text-center font-bold text-slate-700">Thời gian làm</th>
//                       <th className="p-3 text-left font-bold text-slate-700">Nộp lúc</th>
//                       <th className="p-3 text-left font-bold text-slate-700">KetQuaID</th>
//                       <th className="p-3 text-right font-bold text-slate-700">Thao tác</th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {resultsLoading ? (
//                       <tr>
//                         <td colSpan={8} className="p-4 text-center text-slate-600">
//                           Đang tải kết quả...
//                         </td>
//                       </tr>
//                     ) : resultsOfSelectedExam.length === 0 ? (
//                       <tr>
//                         <td colSpan={8} className="p-4 text-center text-slate-600">
//                           Chưa có kết quả cho đề thi này.
//                         </td>
//                       </tr>
//                     ) : (
//                       resultsOfSelectedExam.map((r) => {
//                         const correct = correctCount(r);
//                         const totalQ = totalQuestionsFromResult(r);
//                         const dur = durationMMSS(r.ThoiGianBatDau, r.ThoiGianNopBai);

//                         return (
//                           <tr key={r.KetQuaID} className="border-t border-slate-200">
//                             <td className="p-3 font-semibold text-slate-800">{getStudentName(r)}</td>
//                             <td className="p-3 text-slate-700">{getClassName(r)}</td>
//                             <td className="p-3 text-right font-bold text-slate-800">{r.DiemSo}</td>
//                             <td className="p-3 text-center text-slate-700">
//                               {correct}/{totalQ || "-"}
//                             </td>
//                             <td className="p-3 text-center text-slate-700">{dur}</td>
//                             <td className="p-3 text-slate-700">{toLocalDatetime(r.ThoiGianNopBai)}</td>
//                             <td className="p-3 text-slate-500">{r.KetQuaID}</td>
//                             <td className="p-3 text-right">
//                               <button
//                                 type="button"
//                                 onClick={() => openResultDetail(r)}
//                                 className="h-9 rounded-xl border border-violet-200 bg-violet-50 px-3 font-semibold text-violet-700 hover:bg-violet-100"
//                               >
//                                 Xem
//                               </button>
//                             </td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>
//         </Modal>

//         {/* =========================
//             MODAL 2: Chi tiết kết quả bài làm (NEW)
//            ========================= */}
//         <Modal
//           open={openResultDetailModal}
//           onClose={closeResultDetailModal}
//           title={
//             <div className="flex flex-col gap-1">
//               <div className="text-base font-bold text-slate-800">Chi tiết bài làm</div>
//               <div className="text-xs text-slate-500">
//                 KetQuaID:{" "}
//                 <span className="font-semibold">{selectedResult?.KetQuaID || "-"}</span>
//               </div>
//             </div>
//           }
//           footer={
//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeResultDetailModal}
//                 className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
//               >
//                 Đóng
//               </button>
//             </div>
//           }
//         >
//           <div className="w-[min(1100px,92vw)]">
//             {detailErr ? (
//               <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-800">
//                 {detailErr}
//               </div>
//             ) : null}

//             {detailLoading && !selectedResult ? (
//               <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
//                 Đang tải chi tiết...
//               </div>
//             ) : !selectedResult ? (
//               <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600">
//                 Không có dữ liệu chi tiết.
//               </div>
//             ) : (
//               <>
//                 {/* Summary */}
//                 <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
//                   <div className="flex flex-wrap items-center justify-between gap-3">
//                     <div className="min-w-0">
//                       <div className="text-lg font-bold text-slate-800">
//                         {getStudentName(selectedResult)}
//                       </div>
//                       <div className="mt-1 text-sm text-slate-500">
//                         Lớp:{" "}
//                         <span className="font-semibold text-slate-700">
//                           {getClassName(selectedResult)}
//                         </span>
//                         {" • "}
//                         Nộp lúc:{" "}
//                         <span className="font-semibold text-slate-700">
//                           {toLocalDatetime(selectedResult.ThoiGianNopBai)}
//                         </span>
//                       </div>
//                     </div>

//                     <div className="flex flex-wrap gap-2">
//                       <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
//                         Điểm: {selectedResult.DiemSo}
//                       </span>
//                       <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
//                         Đúng: {correctCount(selectedResult)}/
//                         {totalQuestionsFromResult(selectedResult) || "-"}
//                       </span>
//                       <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
//                         Thời gian làm:{" "}
//                         {durationMMSS(selectedResult.ThoiGianBatDau, selectedResult.ThoiGianNopBai)}
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Detail list */}
//                 <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
//                   <div className="max-h-[60vh] overflow-auto">
//                     <table className="w-full border-collapse text-sm">
//                       <thead className="sticky top-0 bg-slate-50">
//                         <tr className="border-b border-slate-200">
//                           <th className="p-3 text-left font-bold text-slate-700">#</th>
//                           <th className="p-3 text-left font-bold text-slate-700">CauHoiID</th>
//                           <th className="p-3 text-left font-bold text-slate-700">ChiTietBaiLamID</th>
//                           <th className="p-3 text-center font-bold text-slate-700">Kết quả</th>
//                         </tr>
//                       </thead>

//                       <tbody>
//                         {(selectedResult.chi_tiet || []).length === 0 ? (
//                           <tr>
//                             <td colSpan={4} className="p-4 text-center text-slate-600">
//                               Không có chi tiết câu trả lời (chi_tiet rỗng).
//                             </td>
//                           </tr>
//                         ) : (
//                           (selectedResult.chi_tiet || []).map((d, idx) => (
//                             <tr key={d.ChiTietBaiLamID} className="border-t border-slate-200">
//                               <td className="p-3 font-semibold text-slate-700">{idx + 1}</td>
//                               <td className="p-3 text-slate-700">{d.CauHoiID || "-"}</td>
//                               <td className="p-3 text-slate-500">{d.ChiTietBaiLamID}</td>
//                               <td className="p-3 text-center">
//                                 <span
//                                   className={[
//                                     "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
//                                     d.LaDung
//                                       ? "bg-emerald-50 text-emerald-700"
//                                       : "bg-red-50 text-red-700",
//                                   ].join(" ")}
//                                 >
//                                   {d.LaDung ? "✅ Đúng" : "❌ Sai"}
//                                 </span>
//                               </td>
//                             </tr>
//                           ))
//                         )}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>

//                 {detailLoading ? (
//                   <div className="mt-3 text-center text-sm font-semibold text-slate-500">
//                     Đang đồng bộ dữ liệu chi tiết...
//                   </div>
//                 ) : null}
//               </>
//             )}
//           </div>
//         </Modal>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }

// import React, { useEffect, useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";

// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// import { http } from "utils/libs/https";
// import { Link } from "react-router";
// import { TiptapViewer } from "components/tiptap-viewer";
// import { Modal } from "elements/modal/modal";

// /** =======================
//  * Types
//  * ======================= */
// type PaginatedRes<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// type TeacherItem = {
//   GiaoVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: {
//     HoTen?: string;
//     Email?: string;
//   };
// };

// type ExamQuestionChoice = {
//   LuaChonID: string;
//   CauHoiID: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean;
// };

// type SapXepTuItem = {
//   IDTu: string;
//   CauHoiID: string;
//   NoiDungTu: string;
//   ThuTuDung: number;
// };

// type CapTuKhopItem = {
//   IDCapTu: string;
//   CauHoiID: string;
//   TuBenTrai: string;
//   TuBenPhai: string;
//   LaDung: boolean;
// };

// type ExamQuestionDetail = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: string; // tiptap json string
//   LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
//   GiaiThich: string | null;
//   FileNghe_url: string | null;

//   lua_chon: ExamQuestionChoice[];

//   tu_sap_xep?: SapXepTuItem[];
//   cap_tu_khop?: CapTuKhopItem[];
// };

// type ExamChiTiet = {
//   IDDeThi: string;
//   IDCauHoi: string;
//   ThuTuCauHoi: number;
//   IDCauHoi_detail: ExamQuestionDetail;
// };

// type ExamItem = {
//   IDDeThi: string;
//   TenDeThi: string;
//   ThoiGianLamBaiThi: string; // "HH:MM:SS"
//   IDGiaoVien: string;
//   IDGiaoVien_detail?: TeacherItem;
//   chi_tiet: ExamChiTiet[];
//   so_cau_hoi: number;
// };

// /** =======================
//  * NEW: Result types
//  * ======================= */
// type KetQuaDetailItem = {
//   ChiTietBaiLamID: string;
//   LaDung: boolean;
//   CauHoiID?: string;
// };

// type KetQuaItem = {
//   KetQuaID: string;
//   DiemSo: number;

//   ThoiGianBatDau: string;
//   ThoiGianNopBai: string;

//   HocVienID: string;
//   HocVienID_detail?: {
//     TaiKhoan_detail?: {
//       HoTen?: string;
//       Email?: string;
//     };
//   };

//   DeThiID: string;
//   DeThiID_detail?: {
//     IDDeThi?: string;
//     TenDeThi?: string;
//     so_cau_hoi?: number;
//   };

//   LichThiID?: string;
//   LichThiID_detail?: {
//     IDLopHoc_detail?: {
//       IDLopHoc?: string;
//       TenLopHoc?: string;
//     };
//   };

//   chi_tiet?: KetQuaDetailItem[];
// };

// /** =======================
//  * Helpers
//  * ======================= */
// function getApiErrorMessage(err: any) {
//   const data = err?.response?.data;
//   if (!data) return err?.message || "Có lỗi xảy ra.";
//   if (typeof data?.detail === "string") return data.detail;
//   if (typeof data?.message === "string") return data.message;
//   if (Array.isArray(data)) return data[0];
//   const firstKey = Object.keys(data)[0];
//   const val = data[firstKey];
//   if (Array.isArray(val)) return val[0];
//   if (typeof val === "string") return val;
//   return "Có lỗi xảy ra.";
// }

// function tiptapToText(input: any): string {
//   if (input == null) return "";
//   const raw = typeof input === "string" ? input : JSON.stringify(input);

//   if (!raw.trim().startsWith("{") && !raw.trim().startsWith("[")) return raw;

//   try {
//     const doc = typeof input === "string" ? JSON.parse(input) : input;
//     const out: string[] = [];
//     const walk = (node: any) => {
//       if (!node) return;
//       if (Array.isArray(node)) return node.forEach(walk);
//       if (node.type === "text" && typeof node.text === "string")
//         out.push(node.text);
//       if (node.content) walk(node.content);
//     };
//     walk(doc);
//     const text = out.join(" ").replace(/\s+/g, " ").trim();
//     return text || "(Không có nội dung)";
//   } catch {
//     return raw;
//   }
// }

// function timeToMinutesLabel(hms: string) {
//   const parts = (hms || "").split(":").map((x) => Number(x));
//   if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return hms;
//   const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
//   const totalMin = Math.round(hh * 60 + mm + ss / 60);
//   return `${totalMin} phút`;
// }

// function typeLabel(t: string) {
//   if (t === "nghe") return "Nghe";
//   if (t === "tracnghiem") return "Trắc nghiệm";
//   if (t === "tuluan") return "Tự luận";
//   if (t === "sapxeptu") return "Sắp xếp từ";
//   if (t === "khoptu") return "Khớp từ";
//   return t || "-";
// }

// function toLocalDatetime(iso: string) {
//   if (!iso) return "-";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return iso;
//   return d.toLocaleString();
// }

// function durationMMSS(startISO: string, endISO: string): string {
//   const start = new Date(startISO).getTime();
//   const end = new Date(endISO).getTime();
//   const diff = Math.max(0, end - start);
//   const totalSec = Math.floor(diff / 1000);
//   const m = Math.floor(totalSec / 60);
//   const s = totalSec % 60;
//   return `${m}m ${String(s).padStart(2, "0")}s`;
// }

// function getStudentName(r: KetQuaItem): string {
//   return (
//     r.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
//     r.HocVienID_detail?.TaiKhoan_detail?.Email ||
//     r.HocVienID
//   );
// }

// function getClassName(r: KetQuaItem): string {
//   return r.LichThiID_detail?.IDLopHoc_detail?.TenLopHoc || "-";
// }

// function correctCount(r: KetQuaItem): number {
//   return (r.chi_tiet || []).filter((x) => x.LaDung).length;
// }

// function totalQuestionsFromResult(r: KetQuaItem): number {
//   const n = r.DeThiID_detail?.so_cau_hoi;
//   if (typeof n === "number") return n;
//   if (r.chi_tiet && r.chi_tiet.length) return r.chi_tiet.length;
//   return 0;
// }

// /** =======================
//  * API (inline)
//  * ======================= */
// async function getExams() {
//   const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
//   return res.data;
// }
// async function deleteExam(id: string) {
//   const res = await http.delete(`/api/exams/de-thi/${id}/`);
//   return res.data;
// }
// async function getTeachers() {
//   const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
//   return res.data;
// }

// // ✅ NEW: load results
// async function getResults() {
//   const res = await http.get<PaginatedRes<KetQuaItem>>("/api/results/ket-qua/");
//   return res.data;
// }

// /** =======================
//  * Page
//  * ======================= */
// type FormValues = {
//   teacher: string; // GiaoVienID
//   search: string;
// };

// export default function ExamsTwoColumnsPage(): JSX.Element {
//   const forms = useForm<FormValues>({
//     defaultValues: {
//       teacher: "",
//       search: "",
//     },
//   });

//   const [exams, setExams] = useState<ExamItem[]>([]);
//   const [teachers, setTeachers] = useState<TeacherItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   const [selectedExamId, setSelectedExamId] = useState<string>("");

//   // ✅ NEW: modal + results state
//   const [openResultsModal, setOpenResultsModal] = useState(false);
//   const [resultsLoading, setResultsLoading] = useState(false);
//   const [resultsErr, setResultsErr] = useState<string | null>(null);
//   const [allResults, setAllResults] = useState<KetQuaItem[]>([]);
//   const [resultsExamId, setResultsExamId] = useState<string>("");

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       setLoading(true);
//       setErrMsg(null);
//       try {
//         const [exData, tData] = await Promise.all([getExams(), getTeachers()]);
//         if (!mounted) return;
//         const list = exData.results ?? [];
//         setExams(list);
//         setTeachers(tData.results ?? []);

//         if (list.length > 0) setSelectedExamId(list[0].IDDeThi);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const teacherOptions = useMemo(() => {
//     return [
//       { label: "Tất cả giáo viên", value: "" },
//       ...(teachers || []).map((t) => {
//         const name = t?.TaiKhoan_detail?.HoTen || t.GiaoVienID;
//         const email = t?.TaiKhoan_detail?.Email;
//         return {
//           label: email ? `${name} • ${email}` : name,
//           value: t.GiaoVienID,
//         };
//       }),
//     ];
//   }, [teachers]);

//   const selectedTeacher = forms.watch("teacher") || "";
//   const keyword = (forms.watch("search") || "").trim().toLowerCase();

//   const filteredExams = useMemo(() => {
//     return (exams || [])
//       .filter((x) =>
//         selectedTeacher ? x.IDGiaoVien === selectedTeacher : true
//       )
//       .filter((x) => {
//         if (!keyword) return true;
//         const teacherName =
//           x.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//           (x.IDGiaoVien_detail as any)?.GiaoVienID ||
//           x.IDGiaoVien ||
//           "";
//         const teacherEmail = x.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";

//         return (
//           x.IDDeThi.toLowerCase().includes(keyword) ||
//           (x.TenDeThi || "").toLowerCase().includes(keyword) ||
//           teacherName.toLowerCase().includes(keyword) ||
//           teacherEmail.toLowerCase().includes(keyword)
//         );
//       });
//   }, [exams, selectedTeacher, keyword]);

//   useEffect(() => {
//     if (!filteredExams.length) {
//       setSelectedExamId("");
//       return;
//     }
//     const exists = filteredExams.some((x) => x.IDDeThi === selectedExamId);
//     if (!exists) setSelectedExamId(filteredExams[0].IDDeThi);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filteredExams]);

//   const selectedExam = useMemo(() => {
//     return (
//       filteredExams.find((x) => x.IDDeThi === selectedExamId) ||
//       filteredExams[0]
//     );
//   }, [filteredExams, selectedExamId]);

//   // ✅ NEW: open modal + load results if needed
//   const openExamResults = async (examId: string) => {
//     setResultsExamId(examId);
//     setOpenResultsModal(true);

//     // nếu đã load rồi thì không cần gọi lại
//     if (allResults.length > 0) return;

//     setResultsLoading(true);
//     setResultsErr(null);
//     try {
//       const rData = await getResults();
//       setAllResults(rData.results ?? []);
//     } catch (err: any) {
//       setResultsErr(getApiErrorMessage(err));
//     } finally {
//       setResultsLoading(false);
//     }
//   };

//   const closeResultsModal = () => {
//     setOpenResultsModal(false);
//   };

//   const resultsOfSelectedExam = useMemo(() => {
//     const list = (allResults || []).filter((x) => x.DeThiID === resultsExamId);
//     // sort newest submit
//     return list.sort((a, b) => {
//       const ta = a.ThoiGianNopBai ? new Date(a.ThoiGianNopBai).getTime() : 0;
//       const tb = b.ThoiGianNopBai ? new Date(b.ThoiGianNopBai).getTime() : 0;
//       return tb - ta;
//     });
//   }, [allResults, resultsExamId]);

//   const resultsStats = useMemo(() => {
//     const list = resultsOfSelectedExam;
//     const total = list.length;
//     const uniqueStudents = new Set(list.map((x) => x.HocVienID)).size;
//     const avg =
//       total === 0
//         ? 0
//         : Math.round(
//             (list.reduce((s, x) => s + (x.DiemSo || 0), 0) / total) * 100
//           ) / 100;

//     const lastSubmit =
//       total === 0
//         ? ""
//         : list.reduce((best, cur) => {
//             const t = cur.ThoiGianNopBai || "";
//             if (!best) return t;
//             return new Date(t).getTime() > new Date(best).getTime() ? t : best;
//           }, "");

//     return { total, uniqueStudents, avg, lastSubmit };
//   }, [resultsOfSelectedExam]);

//   const onDelete = async (id: string) => {
//     const ok = window.confirm("Sếp có chắc muốn xóa đề thi này không?");
//     if (!ok) return;

//     setDeletingId(id);
//     setErrMsg(null);
//     try {
//       await deleteExam(id);
//       setExams((prev) => prev.filter((x) => x.IDDeThi !== id));

//       if (selectedExamId === id) {
//         const next = filteredExams.find((x) => x.IDDeThi !== id);
//         setSelectedExamId(next?.IDDeThi || "");
//       }

//       // ✅ nếu đang mở modal của exam bị xóa thì đóng
//       if (resultsExamId === id) {
//         setOpenResultsModal(false);
//         setResultsExamId("");
//       }
//     } catch (err: any) {
//       setErrMsg(getApiErrorMessage(err));
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Danh sách đề kiểm tra">
//         {errMsg ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
//             {errMsg}
//           </div>
//         ) : null}

//         {/* FILTER BAR */}
//         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex flex-wrap items-end justify-between gap-4">
//             <div>
//               <div className="text-xl font-bold text-slate-800">Bộ lọc</div>
//               <div className="mt-1 text-slate-500">
//                 Chọn giáo viên / tìm theo tên hoặc ID đề thi.
//               </div>
//             </div>

//             <div className="flex flex-wrap items-end gap-3">
//               <div className="w-90 max-w-full">
//                 <Input
//                   name="search"
//                   type="search"
//                   label="Tìm kiếm"
//                   placeholder="Nhập tên đề thi / ID / giáo viên..."
//                   inputClassName="focus:ring-4 focus:ring-violet-100"
//                 />
//               </div>

//               <div className="w-90 max-w-full">
//                 <DropdownSelectPortal
//                   name="teacher"
//                   label="Giáo viên"
//                   placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
//                   options={teacherOptions}
//                   menuWidth={520}
//                   placement="bottom"
//                   disabled={loading}
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="mt-4 flex items-center justify-between gap-3">
//             <div className="font-semibold text-slate-700">
//               {filteredExams.length} / {exams.length} đề
//             </div>
//             {loading ? (
//               <div className="text-sm font-semibold text-slate-500">
//                 Đang tải...
//               </div>
//             ) : null}
//           </div>
//         </div>

//         {/* TWO COLUMNS */}
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
//           {/* LEFT: list exams */}
//           <div className="lg:col-span-5">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               <div className="mb-3 flex items-center justify-between">
//                 <div className="text-lg font-bold text-slate-800">
//                   Bài kiểm tra
//                 </div>
//                 <div className="text-sm font-semibold text-slate-500">
//                   {filteredExams.length} đề
//                 </div>
//               </div>

//               <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
//                 <div className="space-y-3">
//                   {filteredExams.map((exam) => {
//                     const active = exam.IDDeThi === selectedExamId;
//                     const teacherName =
//                       exam.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//                       exam.IDGiaoVien;

//                     return (
//                       <button
//                         key={exam.IDDeThi}
//                         type="button"
//                         onClick={() => {
//                           setSelectedExamId(exam.IDDeThi);
//                           // ✅ yêu cầu mới: bấm vào từng đề thi -> mở modal xem kết quả
//                           // openExamResults(exam.IDDeThi);
//                         }}
//                         className={[
//                           "w-full text-left rounded-xl border-2 over p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
//                           active
//                             ? "border-violet-300 bg-white"
//                             : "border-slate-200 bg-white hover:bg-slate-50",
//                         ].join(" ")}
//                       >
//                         <div className="flex items-start justify-between">
//                           <div className="min-w-0">
//                             <div className="truncate text-base font-bold text-slate-800">
//                               {exam.TenDeThi}
//                             </div>
//                             <div className="mt-1 text-xs text-slate-500">
//                               ID: {exam.IDDeThi}
//                             </div>

//                             <div className="mt-2 flex flex-wrap gap-2">
//                               <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
//                                 ⏱ {timeToMinutesLabel(exam.ThoiGianLamBaiThi)}
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
//                                 🧾{" "}
//                                 {exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0}{" "}
//                                 câu
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
//                                 👨‍🏫 {teacherName}
//                               </span>
//                             </div>
//                           </div>

//                           <div className="flex flex-wrap items-center gap-3">
//                             <button
//                               type="button"
//                               onClick={() => {
//                                 setSelectedExamId(exam.IDDeThi);
//                                 // ✅ yêu cầu mới: bấm vào từng đề thi -> mở modal xem kết quả
//                                 openExamResults(exam.IDDeThi);
//                               }}
//                               className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//                             >
//                               Xem kết quả
//                             </button>
//                             <Link
//                               to={`/teacher/exams/${exam.IDDeThi}`}
//                               onClick={(e) => e.stopPropagation()}
//                               className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//                             >
//                               Sửa
//                             </Link>

//                             <button
//                               type="button"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 onDelete(exam.IDDeThi);
//                               }}
//                               disabled={deletingId === exam.IDDeThi}
//                               className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
//                             >
//                               {deletingId === exam.IDDeThi
//                                 ? "Đang xóa..."
//                                 : "Xóa"}
//                             </button>
//                           </div>
//                         </div>
//                       </button>
//                     );
//                   })}

//                   {!loading && filteredExams.length === 0 ? (
//                     <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
//                       Không có đề thi nào phù hợp.
//                     </div>
//                   ) : null}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* RIGHT: details */}
//           <div className="lg:col-span-7">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               {!selectedExam ? (
//                 <div className="text-slate-600">
//                   Chọn một bài kiểm tra để xem chi tiết câu hỏi.
//                 </div>
//               ) : (
//                 <>
//                   <div className="flex flex-wrap items-start justify-between gap-3">
//                     <div className="min-w-0">
//                       <div className="text-xl font-bold text-slate-800">
//                         {selectedExam.TenDeThi}
//                       </div>
//                       <div className="mt-1 text-sm text-slate-500">
//                         <span className="font-semibold text-slate-700">
//                           ID:
//                         </span>{" "}
//                         {selectedExam.IDDeThi} •{" "}
//                         <span className="font-semibold text-slate-700">
//                           Thời gian:
//                         </span>{" "}
//                         {selectedExam.ThoiGianLamBaiThi} (
//                         {timeToMinutesLabel(selectedExam.ThoiGianLamBaiThi)})
//                       </div>
//                     </div>

//                     <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
//                       {selectedExam.so_cau_hoi ??
//                         selectedExam.chi_tiet?.length ??
//                         0}{" "}
//                       câu hỏi
//                     </span>
//                   </div>

//                   <div className="mt-5 space-y-3">
//                     {(selectedExam.chi_tiet || [])
//                       .slice()
//                       .sort(
//                         (a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0)
//                       )
//                       .map((ct) => {
//                         const q = ct.IDCauHoi_detail;
//                         const contentText = tiptapToText(q?.NoiDungCauHoi);

//                         const tuSapXep = (q?.tu_sap_xep || [])
//                           .slice()
//                           .sort((a, b) => {
//                             const aa = Number(a.ThuTuDung ?? 0);
//                             const bb = Number(b.ThuTuDung ?? 0);
//                             return aa - bb;
//                           });

//                         const correctSentence =
//                           tuSapXep.length > 0
//                             ? tuSapXep.map((x) => x.NoiDungTu).join(" ")
//                             : "";

//                         const capTuKhop = q?.cap_tu_khop || [];

//                         return (
//                           <div
//                             key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
//                             className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                           >
//                             <div className="flex flex-wrap items-start justify-between gap-3">
//                               <div>
//                                 <div className="text-sm font-bold text-slate-800">
//                                   Câu {ct.ThuTuCauHoi} •{" "}
//                                   {typeLabel(q?.LoaiCauHoi)}
//                                 </div>
//                                 <div className="mt-1 text-xs text-slate-500">
//                                   {q?.IDCauHoi} • {q?.IDBaiHoc}
//                                 </div>
//                               </div>

//                               {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                                 <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
//                                   🔊 Audio
//                                 </span>
//                               ) : null}
//                             </div>

//                             <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
//                               {/* {contentText} */}
//                               <TiptapViewer
//                                 content={JSON.parse(q?.NoiDungCauHoi)}
//                               />
//                             </div>

//                             {/* ===== NGHE ===== */}
//                             {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                               <div className="mt-3">
//                                 <audio controls className="w-full">
//                                   <source src={q.FileNghe_url || ""} />
//                                 </audio>
//                               </div>
//                             ) : null}

//                             {/* ===== TRẮC NGHIỆM / NGHE (choices) ===== */}
//                             {q?.LoaiCauHoi !== "tuluan" &&
//                             q?.lua_chon?.length ? (
//                               <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
//                                 {q.lua_chon.map((c) => (
//                                   <div
//                                     key={c.LuaChonID}
//                                     className={[
//                                       "rounded-xl border px-3 py-2 text-sm font-semibold",
//                                       c.DapAnDung
//                                         ? "border-emerald-200 bg-emerald-50 text-emerald-700"
//                                         : "border-slate-200 bg-white text-slate-700",
//                                     ].join(" ")}
//                                   >
//                                     {c.NoiDungLuaChon}
//                                   </div>
//                                 ))}
//                               </div>
//                             ) : null}

//                             {/* ===== SẮP XẾP TỪ ===== */}
//                             {q?.LoaiCauHoi === "sapxeptu" && tuSapXep.length ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                                 <div className="mb-2 text-sm font-bold text-slate-700">
//                                   Từ cần sắp xếp
//                                 </div>

//                                 <div className="flex flex-wrap gap-2">
//                                   {tuSapXep.map((w) => (
//                                     <span
//                                       key={w.IDTu}
//                                       className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
//                                     >
//                                       <span className="text-xs font-bold text-slate-500">
//                                         {w.ThuTuDung}
//                                       </span>
//                                       <span className="font-semibold">
//                                         {w.NoiDungTu}
//                                       </span>
//                                     </span>
//                                   ))}
//                                 </div>

//                                 {correctSentence ? (
//                                   <div className="mt-3 text-sm text-slate-700">
//                                     <span className="font-bold text-slate-800">
//                                       Câu đúng:
//                                     </span>{" "}
//                                     <span className="font-semibold">
//                                       {correctSentence}
//                                     </span>
//                                   </div>
//                                 ) : null}
//                               </div>
//                             ) : null}

//                             {/* ===== KHỚP TỪ ===== */}
//                             {q?.LoaiCauHoi === "khoptu" && capTuKhop.length ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                                 <div className="mb-2 text-sm font-bold text-slate-700">
//                                   Cặp từ khớp
//                                 </div>

//                                 <div className="grid gap-2">
//                                   {capTuKhop.map((p) => (
//                                     <div
//                                       key={p.IDCapTu}
//                                       className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
//                                     >
//                                       <div className="min-w-0 flex-1 text-slate-800">
//                                         <span className="font-semibold">
//                                           {p.TuBenTrai}
//                                         </span>
//                                         <span className="mx-2 text-slate-400">
//                                           →
//                                         </span>
//                                         <span className="font-semibold">
//                                           {p.TuBenPhai}
//                                         </span>
//                                       </div>

//                                       <span
//                                         className={
//                                           p.LaDung
//                                             ? "text-emerald-700 font-semibold"
//                                             : "text-slate-500 font-semibold"
//                                         }
//                                       >
//                                         {p.LaDung ? "✅ Đúng" : "Sai"}
//                                       </span>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             ) : null}

//                             {q?.GiaiThich ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
//                                 <span className="font-bold">Giải thích:</span>{" "}
//                                 {q.GiaiThich}
//                               </div>
//                             ) : null}
//                           </div>
//                         );
//                       })}

//                     {!selectedExam.chi_tiet ||
//                     selectedExam.chi_tiet.length === 0 ? (
//                       <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
//                         Đề thi này chưa có câu hỏi.
//                       </div>
//                     ) : null}
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* =========================
//             MODAL: Kết quả theo đề thi
//            ========================= */}
//         <Modal
//           open={openResultsModal}
//           onClose={closeResultsModal}
//           title={
//             <div className="flex flex-col gap-1">
//               <div className="text-base font-bold text-slate-800">
//                 Kết quả bài kiểm tra
//               </div>
//               <div className="text-xs text-slate-500">
//                 DeThiID:{" "}
//                 <span className="font-semibold">{resultsExamId || "-"}</span>
//               </div>
//             </div>
//           }
//           footer={
//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={closeResultsModal}
//                 className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
//               >
//                 Đóng
//               </button>
//             </div>
//           }
//         >
//           <div className="w-[min(1100px,92vw)]">
//             {resultsErr ? (
//               <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-700">
//                 {resultsErr}
//               </div>
//             ) : null}

//             <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-slate-700">
//               <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
//                 Tổng lượt làm: {resultsStats.total}
//               </span>
//               <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
//                 Số học viên: {resultsStats.uniqueStudents}
//               </span>
//               <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
//                 Điểm TB: {resultsStats.avg}
//               </span>
//               <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700">
//                 Nộp gần nhất:{" "}
//                 {resultsStats.lastSubmit
//                   ? toLocalDatetime(resultsStats.lastSubmit)
//                   : "-"}
//               </span>

//               <button
//                 type="button"
//                 onClick={async () => {
//                   // force reload
//                   setAllResults([]);
//                   setResultsLoading(true);
//                   setResultsErr(null);
//                   try {
//                     const rData = await getResults();
//                     setAllResults(rData.results ?? []);
//                   } catch (err: any) {
//                     setResultsErr(getApiErrorMessage(err));
//                   } finally {
//                     setResultsLoading(false);
//                   }
//                 }}
//                 className="ml-auto h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
//               >
//                 Tải lại
//               </button>
//             </div>

//             <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
//               <div className="max-h-[60vh] overflow-auto">
//                 <table className="w-full border-collapse text-sm">
//                   <thead className="sticky top-0 bg-slate-50">
//                     <tr className="border-b border-slate-200">
//                       <th className="p-3 text-left font-bold text-slate-700">
//                         Học viên
//                       </th>
//                       <th className="p-3 text-left font-bold text-slate-700">
//                         Lớp
//                       </th>
//                       <th className="p-3 text-right font-bold text-slate-700">
//                         Điểm
//                       </th>
//                       <th className="p-3 text-center font-bold text-slate-700">
//                         Đúng/Tổng
//                       </th>
//                       <th className="p-3 text-center font-bold text-slate-700">
//                         Thời gian làm
//                       </th>
//                       <th className="p-3 text-left font-bold text-slate-700">
//                         Nộp lúc
//                       </th>
//                       <th className="p-3 text-left font-bold text-slate-700">
//                         KetQuaID
//                       </th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {resultsLoading ? (
//                       <tr>
//                         <td
//                           colSpan={7}
//                           className="p-4 text-center text-slate-600"
//                         >
//                           Đang tải kết quả...
//                         </td>
//                       </tr>
//                     ) : resultsOfSelectedExam.length === 0 ? (
//                       <tr>
//                         <td
//                           colSpan={7}
//                           className="p-4 text-center text-slate-600"
//                         >
//                           Chưa có kết quả cho đề thi này.
//                         </td>
//                       </tr>
//                     ) : (
//                       resultsOfSelectedExam.map((r) => {
//                         const correct = correctCount(r);
//                         const totalQ = totalQuestionsFromResult(r);
//                         const dur = durationMMSS(
//                           r.ThoiGianBatDau,
//                           r.ThoiGianNopBai
//                         );

//                         return (
//                           <tr
//                             key={r.KetQuaID}
//                             className="border-t border-slate-200"
//                           >
//                             <td className="p-3 font-semibold text-slate-800">
//                               {getStudentName(r)}
//                             </td>
//                             <td className="p-3 text-slate-700">
//                               {getClassName(r)}
//                             </td>
//                             <td className="p-3 text-right font-bold text-slate-800">
//                               {r.DiemSo}
//                             </td>
//                             <td className="p-3 text-center text-slate-700">
//                               {correct}/{totalQ || "-"}
//                             </td>
//                             <td className="p-3 text-center text-slate-700">
//                               {dur}
//                             </td>
//                             <td className="p-3 text-slate-700">
//                               {toLocalDatetime(r.ThoiGianNopBai)}
//                             </td>
//                             <td className="p-3 text-slate-500">{r.KetQuaID}</td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>
//         </Modal>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }
// import React, { useEffect, useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";

// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// import { http } from "utils/libs/https";
// import { Link } from "react-router";
// import { TiptapViewer } from "components/tiptap-viewer";

// /** =======================
//  * Types
//  * ======================= */
// type PaginatedRes<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// type TeacherItem = {
//   GiaoVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: {
//     HoTen?: string;
//     Email?: string;
//   };
// };

// type ExamQuestionChoice = {
//   LuaChonID: string;
//   CauHoiID: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean;
// };

// type SapXepTuItem = {
//   IDTu: string;
//   CauHoiID: string;
//   NoiDungTu: string;
//   ThuTuDung: number;
// };

// type CapTuKhopItem = {
//   IDCapTu: string;
//   CauHoiID: string;
//   TuBenTrai: string;
//   TuBenPhai: string;
//   LaDung: boolean;
// };

// type ExamQuestionDetail = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: string; // tiptap json string
//   LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
//   GiaiThich: string | null;
//   FileNghe_url: string | null;

//   lua_chon: ExamQuestionChoice[];

//   // ✅ 2 loại mới (backend trả theo response sếp đưa)
//   tu_sap_xep?: SapXepTuItem[];
//   cap_tu_khop?: CapTuKhopItem[];
// };

// type ExamChiTiet = {
//   IDDeThi: string;
//   IDCauHoi: string;
//   ThuTuCauHoi: number;
//   IDCauHoi_detail: ExamQuestionDetail;
// };

// type ExamItem = {
//   IDDeThi: string;
//   TenDeThi: string;
//   ThoiGianLamBaiThi: string; // "HH:MM:SS"
//   IDGiaoVien: string;
//   IDGiaoVien_detail?: TeacherItem;
//   chi_tiet: ExamChiTiet[];
//   so_cau_hoi: number;
// };

// /** =======================
//  * Helpers
//  * ======================= */
// function getApiErrorMessage(err: any) {
//   const data = err?.response?.data;
//   if (!data) return err?.message || "Có lỗi xảy ra.";
//   if (typeof data?.detail === "string") return data.detail;
//   if (typeof data?.message === "string") return data.message;
//   if (Array.isArray(data)) return data[0];
//   const firstKey = Object.keys(data)[0];
//   const val = data[firstKey];
//   if (Array.isArray(val)) return val[0];
//   if (typeof val === "string") return val;
//   return "Có lỗi xảy ra.";
// }

// function tiptapToText(input: any): string {
//   if (input == null) return "";
//   const raw = typeof input === "string" ? input : JSON.stringify(input);

//   if (!raw.trim().startsWith("{") && !raw.trim().startsWith("[")) return raw;

//   try {
//     const doc = typeof input === "string" ? JSON.parse(input) : input;
//     const out: string[] = [];
//     const walk = (node: any) => {
//       if (!node) return;
//       if (Array.isArray(node)) return node.forEach(walk);
//       if (node.type === "text" && typeof node.text === "string")
//         out.push(node.text);
//       if (node.content) walk(node.content);
//     };
//     walk(doc);
//     const text = out.join(" ").replace(/\s+/g, " ").trim();
//     return text || "(Không có nội dung)";
//   } catch {
//     return raw;
//   }
// }

// function timeToMinutesLabel(hms: string) {
//   const parts = (hms || "").split(":").map((x) => Number(x));
//   if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return hms;
//   const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
//   const totalMin = Math.round(hh * 60 + mm + ss / 60);
//   return `${totalMin} phút`;
// }

// function typeLabel(t: string) {
//   if (t === "nghe") return "Nghe";
//   if (t === "tracnghiem") return "Trắc nghiệm";
//   if (t === "tuluan") return "Tự luận";
//   if (t === "sapxeptu") return "Sắp xếp từ";
//   if (t === "khoptu") return "Khớp từ";
//   return t || "-";
// }

// /** =======================
//  * API (inline)
//  * ======================= */
// async function getExams() {
//   const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
//   return res.data;
// }
// async function deleteExam(id: string) {
//   const res = await http.delete(`/api/exams/de-thi/${id}/`);
//   return res.data;
// }
// async function getTeachers() {
//   const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
//   return res.data;
// }

// /** =======================
//  * Page
//  * ======================= */
// type FormValues = {
//   teacher: string; // GiaoVienID
//   search: string;
// };

// export default function ExamsTwoColumnsPage(): JSX.Element {
//   const forms = useForm<FormValues>({
//     defaultValues: {
//       teacher: "",
//       search: "",
//     },
//   });

//   const [exams, setExams] = useState<ExamItem[]>([]);
//   const [teachers, setTeachers] = useState<TeacherItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   const [selectedExamId, setSelectedExamId] = useState<string>("");

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       setLoading(true);
//       setErrMsg(null);
//       try {
//         const [exData, tData] = await Promise.all([getExams(), getTeachers()]);
//         if (!mounted) return;
//         const list = exData.results ?? [];
//         setExams(list);
//         setTeachers(tData.results ?? []);

//         if (list.length > 0) setSelectedExamId(list[0].IDDeThi);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const teacherOptions = useMemo(() => {
//     return [
//       { label: "Tất cả giáo viên", value: "" },
//       ...(teachers || []).map((t) => {
//         const name = t?.TaiKhoan_detail?.HoTen || t.GiaoVienID;
//         const email = t?.TaiKhoan_detail?.Email;
//         return {
//           label: email ? `${name} • ${email}` : name,
//           value: t.GiaoVienID,
//         };
//       }),
//     ];
//   }, [teachers]);

//   const selectedTeacher = forms.watch("teacher") || "";
//   const keyword = (forms.watch("search") || "").trim().toLowerCase();

//   const filteredExams = useMemo(() => {
//     return (exams || [])
//       .filter((x) =>
//         selectedTeacher ? x.IDGiaoVien === selectedTeacher : true
//       )
//       .filter((x) => {
//         if (!keyword) return true;
//         const teacherName =
//           x.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//           (x.IDGiaoVien_detail as any)?.GiaoVienID ||
//           x.IDGiaoVien ||
//           "";
//         const teacherEmail = x.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";

//         return (
//           x.IDDeThi.toLowerCase().includes(keyword) ||
//           (x.TenDeThi || "").toLowerCase().includes(keyword) ||
//           teacherName.toLowerCase().includes(keyword) ||
//           teacherEmail.toLowerCase().includes(keyword)
//         );
//       });
//   }, [exams, selectedTeacher, keyword]);

//   useEffect(() => {
//     if (!filteredExams.length) {
//       setSelectedExamId("");
//       return;
//     }
//     const exists = filteredExams.some((x) => x.IDDeThi === selectedExamId);
//     if (!exists) setSelectedExamId(filteredExams[0].IDDeThi);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filteredExams]);

//   const selectedExam = useMemo(() => {
//     return (
//       filteredExams.find((x) => x.IDDeThi === selectedExamId) ||
//       filteredExams[0]
//     );
//   }, [filteredExams, selectedExamId]);

//   const onDelete = async (id: string) => {
//     const ok = window.confirm("Sếp có chắc muốn xóa đề thi này không?");
//     if (!ok) return;

//     setDeletingId(id);
//     setErrMsg(null);
//     try {
//       await deleteExam(id);
//       setExams((prev) => prev.filter((x) => x.IDDeThi !== id));

//       if (selectedExamId === id) {
//         const next = filteredExams.find((x) => x.IDDeThi !== id);
//         setSelectedExamId(next?.IDDeThi || "");
//       }
//     } catch (err: any) {
//       setErrMsg(getApiErrorMessage(err));
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Danh sách đề kiểm tra">
//         {errMsg ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
//             {errMsg}
//           </div>
//         ) : null}

//         {/* FILTER BAR */}
//         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex flex-wrap items-end justify-between gap-4">
//             <div>
//               <div className="text-xl font-bold text-slate-800">Bộ lọc</div>
//               <div className="mt-1 text-slate-500">
//                 Chọn giáo viên / tìm theo tên hoặc ID đề thi.
//               </div>
//             </div>

//             <div className="flex flex-wrap items-end gap-3">
//               <div className="w-90 max-w-full">
//                 <Input
//                   name="search"
//                   type="search"
//                   label="Tìm kiếm"
//                   placeholder="Nhập tên đề thi / ID / giáo viên..."
//                   inputClassName="focus:ring-4 focus:ring-violet-100"
//                 />
//               </div>

//               <div className="w-90 max-w-full">
//                 <DropdownSelectPortal
//                   name="teacher"
//                   label="Giáo viên"
//                   placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
//                   options={teacherOptions}
//                   menuWidth={520}
//                   placement="bottom"
//                   disabled={loading}
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="mt-4 flex items-center justify-between gap-3">
//             <div className="font-semibold text-slate-700">
//               {filteredExams.length} / {exams.length} đề
//             </div>
//             {loading ? (
//               <div className="text-sm font-semibold text-slate-500">
//                 Đang tải...
//               </div>
//             ) : null}
//           </div>
//         </div>

//         {/* TWO COLUMNS */}
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
//           {/* LEFT: list exams */}
//           <div className="lg:col-span-5">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               <div className="mb-3 flex items-center justify-between">
//                 <div className="text-lg font-bold text-slate-800">
//                   Bài kiểm tra
//                 </div>
//                 <div className="text-sm font-semibold text-slate-500">
//                   {filteredExams.length} đề
//                 </div>
//               </div>

//               <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
//                 <div className="space-y-3">
//                   {filteredExams.map((exam) => {
//                     const active = exam.IDDeThi === selectedExamId;
//                     const teacherName =
//                       exam.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//                       exam.IDGiaoVien;

//                     return (
//                       <button
//                         key={exam.IDDeThi}
//                         type="button"
//                         onClick={() => setSelectedExamId(exam.IDDeThi)}
//                         className={[
//                           "w-full text-left rounded-xl border-2 over p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
//                           active
//                             ? "border-violet-300 bg-white"
//                             : "border-slate-200 bg-white hover:bg-slate-50",
//                         ].join(" ")}
//                       >
//                         <div className="flex items-start justify-between">
//                           <div className="min-w-0">
//                             <div className="truncate text-base font-bold text-slate-800">
//                               {exam.TenDeThi}
//                             </div>
//                             <div className="mt-1 text-xs text-slate-500">
//                               ID: {exam.IDDeThi}
//                             </div>

//                             <div className="mt-2 flex flex-wrap gap-2">
//                               <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
//                                 ⏱ {timeToMinutesLabel(exam.ThoiGianLamBaiThi)}
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
//                                 🧾{" "}
//                                 {exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0}{" "}
//                                 câu
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
//                                 👨‍🏫 {teacherName}
//                               </span>
//                             </div>
//                           </div>

//                           <div className="flex items-center gap-3">
//                             <Link
//                               to={`/teacher/exams/${exam.IDDeThi}`}
//                               className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//                             >
//                               Sửa
//                             </Link>

//                             <button
//                               type="button"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 onDelete(exam.IDDeThi);
//                               }}
//                               disabled={deletingId === exam.IDDeThi}
//                               className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
//                             >
//                               {deletingId === exam.IDDeThi
//                                 ? "Đang xóa..."
//                                 : "Xóa"}
//                             </button>
//                           </div>
//                         </div>
//                       </button>
//                     );
//                   })}

//                   {!loading && filteredExams.length === 0 ? (
//                     <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
//                       Không có đề thi nào phù hợp.
//                     </div>
//                   ) : null}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* RIGHT: details */}
//           <div className="lg:col-span-7">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               {!selectedExam ? (
//                 <div className="text-slate-600">
//                   Chọn một bài kiểm tra để xem chi tiết câu hỏi.
//                 </div>
//               ) : (
//                 <>
//                   <div className="flex flex-wrap items-start justify-between gap-3">
//                     <div className="min-w-0">
//                       <div className="text-xl font-bold text-slate-800">
//                         {selectedExam.TenDeThi}
//                       </div>
//                       <div className="mt-1 text-sm text-slate-500">
//                         <span className="font-semibold text-slate-700">
//                           ID:
//                         </span>{" "}
//                         {selectedExam.IDDeThi} •{" "}
//                         <span className="font-semibold text-slate-700">
//                           Thời gian:
//                         </span>{" "}
//                         {selectedExam.ThoiGianLamBaiThi} (
//                         {timeToMinutesLabel(selectedExam.ThoiGianLamBaiThi)})
//                       </div>
//                     </div>

//                     <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
//                       {selectedExam.so_cau_hoi ??
//                         selectedExam.chi_tiet?.length ??
//                         0}{" "}
//                       câu hỏi
//                     </span>
//                   </div>

//                   <div className="mt-5 space-y-3">
//                     {(selectedExam.chi_tiet || [])
//                       .slice()
//                       .sort(
//                         (a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0)
//                       )
//                       .map((ct) => {
//                         const q = ct.IDCauHoi_detail;
//                         const contentText = tiptapToText(q?.NoiDungCauHoi);

//                         const tuSapXep = (q?.tu_sap_xep || [])
//                           .slice()
//                           .sort((a, b) => {
//                             const aa = Number(a.ThuTuDung ?? 0);
//                             const bb = Number(b.ThuTuDung ?? 0);
//                             return aa - bb;
//                           });

//                         const correctSentence =
//                           tuSapXep.length > 0
//                             ? tuSapXep.map((x) => x.NoiDungTu).join(" ")
//                             : "";

//                         const capTuKhop = q?.cap_tu_khop || [];

//                         return (
//                           <div
//                             key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
//                             className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                           >
//                             <div className="flex flex-wrap items-start justify-between gap-3">
//                               <div>
//                                 <div className="text-sm font-bold text-slate-800">
//                                   Câu {ct.ThuTuCauHoi} •{" "}
//                                   {typeLabel(q?.LoaiCauHoi)}
//                                 </div>
//                                 <div className="mt-1 text-xs text-slate-500">
//                                   {q?.IDCauHoi} • {q?.IDBaiHoc}
//                                 </div>
//                               </div>

//                               {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                                 <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
//                                   🔊 Audio
//                                 </span>
//                               ) : null}
//                             </div>

//                             <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
//                               {/* {contentText} */}
//                               <TiptapViewer
//                                 content={JSON.parse(q?.NoiDungCauHoi)}
//                               />
//                             </div>

//                             {/* ===== NGHE ===== */}
//                             {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                               <div className="mt-3">
//                                 <audio controls className="w-full">
//                                   <source src={q.FileNghe_url || ""} />
//                                 </audio>
//                               </div>
//                             ) : null}

//                             {/* ===== TRẮC NGHIỆM / NGHE (choices) ===== */}
//                             {q?.LoaiCauHoi !== "tuluan" &&
//                             q?.lua_chon?.length ? (
//                               <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
//                                 {q.lua_chon.map((c) => (
//                                   <div
//                                     key={c.LuaChonID}
//                                     className={[
//                                       "rounded-xl border px-3 py-2 text-sm font-semibold",
//                                       c.DapAnDung
//                                         ? "border-emerald-200 bg-emerald-50 text-emerald-700"
//                                         : "border-slate-200 bg-white text-slate-700",
//                                     ].join(" ")}
//                                   >
//                                     {c.NoiDungLuaChon}
//                                   </div>
//                                 ))}
//                               </div>
//                             ) : null}

//                             {/* ===== SẮP XẾP TỪ ===== */}
//                             {q?.LoaiCauHoi === "sapxeptu" && tuSapXep.length ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                                 <div className="mb-2 text-sm font-bold text-slate-700">
//                                   Từ cần sắp xếp
//                                 </div>

//                                 <div className="flex flex-wrap gap-2">
//                                   {tuSapXep.map((w) => (
//                                     <span
//                                       key={w.IDTu}
//                                       className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
//                                     >
//                                       <span className="text-xs font-bold text-slate-500">
//                                         {w.ThuTuDung}
//                                       </span>
//                                       <span className="font-semibold">
//                                         {w.NoiDungTu}
//                                       </span>
//                                     </span>
//                                   ))}
//                                 </div>

//                                 {correctSentence ? (
//                                   <div className="mt-3 text-sm text-slate-700">
//                                     <span className="font-bold text-slate-800">
//                                       Câu đúng:
//                                     </span>{" "}
//                                     <span className="font-semibold">
//                                       {correctSentence}
//                                     </span>
//                                   </div>
//                                 ) : null}
//                               </div>
//                             ) : null}

//                             {/* ===== KHỚP TỪ ===== */}
//                             {q?.LoaiCauHoi === "khoptu" && capTuKhop.length ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
//                                 <div className="mb-2 text-sm font-bold text-slate-700">
//                                   Cặp từ khớp
//                                 </div>

//                                 <div className="grid gap-2">
//                                   {capTuKhop.map((p) => (
//                                     <div
//                                       key={p.IDCapTu}
//                                       className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
//                                     >
//                                       <div className="min-w-0 flex-1 text-slate-800">
//                                         <span className="font-semibold">
//                                           {p.TuBenTrai}
//                                         </span>
//                                         <span className="mx-2 text-slate-400">
//                                           →
//                                         </span>
//                                         <span className="font-semibold">
//                                           {p.TuBenPhai}
//                                         </span>
//                                       </div>

//                                       <span
//                                         className={
//                                           p.LaDung
//                                             ? "text-emerald-700 font-semibold"
//                                             : "text-slate-500 font-semibold"
//                                         }
//                                       >
//                                         {p.LaDung ? "✅ Đúng" : "Sai"}
//                                       </span>
//                                     </div>
//                                   ))}
//                                 </div>
//                               </div>
//                             ) : null}

//                             {q?.GiaiThich ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
//                                 <span className="font-bold">Giải thích:</span>{" "}
//                                 {q.GiaiThich}
//                               </div>
//                             ) : null}
//                           </div>
//                         );
//                       })}

//                     {!selectedExam.chi_tiet ||
//                     selectedExam.chi_tiet.length === 0 ? (
//                       <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
//                         Đề thi này chưa có câu hỏi.
//                       </div>
//                     ) : null}
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }

//--------------------------------------------------------

// import React, { useEffect, useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";

// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// import { http } from "utils/libs/https";
// import { Link } from "react-router";

// /** =======================
//  * Types
//  * ======================= */
// type PaginatedRes<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// type TeacherItem = {
//   GiaoVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: {
//     HoTen?: string;
//     Email?: string;
//   };
// };

// type ExamQuestionChoice = {
//   LuaChonID: string;
//   CauHoiID: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean;
// };

// type ExamQuestionDetail = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: string; // tiptap json string
//   LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;
//   GiaiThich: string | null;
//   FileNghe_url: string | null;
//   lua_chon: ExamQuestionChoice[];
// };

// type ExamChiTiet = {
//   IDDeThi: string;
//   IDCauHoi: string;
//   ThuTuCauHoi: number;
//   IDCauHoi_detail: ExamQuestionDetail;
// };

// type ExamItem = {
//   IDDeThi: string;
//   TenDeThi: string;
//   ThoiGianLamBaiThi: string; // "HH:MM:SS"
//   IDGiaoVien: string;
//   IDGiaoVien_detail?: TeacherItem;
//   chi_tiet: ExamChiTiet[];
//   so_cau_hoi: number;
// };

// /** =======================
//  * Helpers
//  * ======================= */
// function getApiErrorMessage(err: any) {
//   const data = err?.response?.data;
//   if (!data) return err?.message || "Có lỗi xảy ra.";
//   if (typeof data?.detail === "string") return data.detail;
//   if (typeof data?.message === "string") return data.message;
//   if (Array.isArray(data)) return data[0];
//   const firstKey = Object.keys(data)[0];
//   const val = data[firstKey];
//   if (Array.isArray(val)) return val[0];
//   if (typeof val === "string") return val;
//   return "Có lỗi xảy ra.";
// }

// function tiptapToText(input: any): string {
//   if (input == null) return "";
//   const raw = typeof input === "string" ? input : JSON.stringify(input);

//   if (!raw.trim().startsWith("{") && !raw.trim().startsWith("[")) return raw;

//   try {
//     const doc = typeof input === "string" ? JSON.parse(input) : input;
//     const out: string[] = [];
//     const walk = (node: any) => {
//       if (!node) return;
//       if (Array.isArray(node)) return node.forEach(walk);
//       if (node.type === "text" && typeof node.text === "string") out.push(node.text);
//       if (node.content) walk(node.content);
//     };
//     walk(doc);
//     const text = out.join(" ").replace(/\s+/g, " ").trim();
//     return text || "(Không có nội dung)";
//   } catch {
//     return raw;
//   }
// }

// function timeToMinutesLabel(hms: string) {
//   const parts = (hms || "").split(":").map((x) => Number(x));
//   if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return hms;
//   const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
//   const totalMin = Math.round(hh * 60 + mm + ss / 60);
//   return `${totalMin} phút`;
// }

// function typeLabel(t: string) {
//   if (t === "nghe") return "Nghe";
//   if (t === "tracnghiem") return "Trắc nghiệm";
//   if (t === "tuluan") return "Tự luận";
//   return t || "-";
// }

// /** =======================
//  * API (inline)
//  * ======================= */
// async function getExams() {
//   const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
//   return res.data;
// }
// async function deleteExam(id: string) {
//   const res = await http.delete(`/api/exams/de-thi/${id}/`);
//   return res.data;
// }
// async function getTeachers() {
//   const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
//   return res.data;
// }

// /** =======================
//  * Page
//  * ======================= */
// type FormValues = {
//   teacher: string; // GiaoVienID
//   search: string;
// };

// export default function ExamsTwoColumnsPage(): JSX.Element {
//   const forms = useForm<FormValues>({
//     defaultValues: {
//       teacher: "",
//       search: "",
//     },
//   });

//   const [exams, setExams] = useState<ExamItem[]>([]);
//   const [teachers, setTeachers] = useState<TeacherItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   const [selectedExamId, setSelectedExamId] = useState<string>("");

//   useEffect(() => {
//     let mounted = true;

//     (async () => {
//       setLoading(true);
//       setErrMsg(null);
//       try {
//         const [exData, tData] = await Promise.all([getExams(), getTeachers()]);
//         if (!mounted) return;
//         const list = exData.results ?? [];
//         setExams(list);
//         setTeachers(tData.results ?? []);

//         if (list.length > 0) setSelectedExamId(list[0].IDDeThi);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const teacherOptions = useMemo(() => {
//     return [
//       { label: "Tất cả giáo viên", value: "" },
//       ...(teachers || []).map((t) => {
//         const name = t?.TaiKhoan_detail?.HoTen || t.GiaoVienID;
//         const email = t?.TaiKhoan_detail?.Email;
//         return {
//           label: email ? `${name} • ${email}` : name,
//           value: t.GiaoVienID,
//         };
//       }),
//     ];
//   }, [teachers]);

//   const selectedTeacher = forms.watch("teacher") || "";
//   const keyword = (forms.watch("search") || "").trim().toLowerCase();

//   const filteredExams = useMemo(() => {
//     return (exams || [])
//       .filter((x) => (selectedTeacher ? x.IDGiaoVien === selectedTeacher : true))
//       .filter((x) => {
//         if (!keyword) return true;
//         const teacherName =
//           x.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//           x.IDGiaoVien_detail?.GiaoVienID ||
//           x.IDGiaoVien ||
//           "";
//         const teacherEmail = x.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";

//         return (
//           x.IDDeThi.toLowerCase().includes(keyword) ||
//           (x.TenDeThi || "").toLowerCase().includes(keyword) ||
//           teacherName.toLowerCase().includes(keyword) ||
//           teacherEmail.toLowerCase().includes(keyword)
//         );
//       });
//   }, [exams, selectedTeacher, keyword]);

//   useEffect(() => {
//     if (!filteredExams.length) {
//       setSelectedExamId("");
//       return;
//     }
//     const exists = filteredExams.some((x) => x.IDDeThi === selectedExamId);
//     if (!exists) setSelectedExamId(filteredExams[0].IDDeThi);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filteredExams]);

//   const selectedExam = useMemo(() => {
//     return filteredExams.find((x) => x.IDDeThi === selectedExamId) || filteredExams[0];
//   }, [filteredExams, selectedExamId]);

//   const onDelete = async (id: string) => {
//     const ok = window.confirm("Sếp có chắc muốn xóa đề thi này không?");
//     if (!ok) return;

//     setDeletingId(id);
//     setErrMsg(null);
//     try {
//       await deleteExam(id);
//       setExams((prev) => prev.filter((x) => x.IDDeThi !== id));

//       if (selectedExamId === id) {
//         const next = filteredExams.find((x) => x.IDDeThi !== id);
//         setSelectedExamId(next?.IDDeThi || "");
//       }
//     } catch (err: any) {
//       setErrMsg(getApiErrorMessage(err));
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Danh sách đề kiểm tra">
//         {errMsg ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
//             {errMsg}
//           </div>
//         ) : null}

//         {/* FILTER BAR */}
//         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex flex-wrap items-end justify-between gap-4">
//             <div>
//               <div className="text-xl font-bold text-slate-800">Bộ lọc</div>
//               <div className="mt-1 text-slate-500">
//                 Chọn giáo viên / tìm theo tên hoặc ID đề thi.
//               </div>
//             </div>

//             <div className="flex flex-wrap items-end gap-3">
//               <div className="w-90 max-w-full">
//                 <Input
//                   name="search"
//                   type="search"
//                   label="Tìm kiếm"
//                   placeholder="Nhập tên đề thi / ID / giáo viên..."
//                   inputClassName="focus:ring-4 focus:ring-violet-100"
//                 />
//               </div>

//               <div className="w-90 max-w-full">
//                 <DropdownSelectPortal
//                   name="teacher"
//                   label="Giáo viên"
//                   placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
//                   options={teacherOptions}
//                   menuWidth={520}
//                   placement="bottom"
//                   disabled={loading}
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="mt-4 flex items-center justify-between gap-3">
//             <div className="font-semibold text-slate-700">
//               {filteredExams.length} / {exams.length} đề
//             </div>
//             {loading ? (
//               <div className="text-sm font-semibold text-slate-500">Đang tải...</div>
//             ) : null}
//           </div>
//         </div>

//         {/* TWO COLUMNS */}
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
//           {/* LEFT: list exams */}
//           <div className="lg:col-span-5">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               <div className="mb-3 flex items-center justify-between">
//                 <div className="text-lg font-bold text-slate-800">Bài kiểm tra</div>
//                 <div className="text-sm font-semibold text-slate-500">
//                   {filteredExams.length} đề
//                 </div>
//               </div>

//               <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
//                 <div className="space-y-3">
//                   {filteredExams.map((exam) => {
//                     const active = exam.IDDeThi === selectedExamId;
//                     const teacherName =
//                       exam.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen || exam.IDGiaoVien;

//                     return (
//                       <button
//                         key={exam.IDDeThi}
//                         type="button"
//                         onClick={() => setSelectedExamId(exam.IDDeThi)}
//                         className={[
//                           "w-full text-left rounded-xl border-2 over p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
//                           active
//                             ? "border-violet-300 bg-white"
//                             : "border-slate-200 bg-white hover:bg-slate-50",
//                         ].join(" ")}
//                       >
//                         <div className="flex items-start justify-between">
//                           <div className="min-w-0">
//                             <div className="truncate text-base font-bold text-slate-800">
//                               {exam.TenDeThi}
//                             </div>
//                             <div className="mt-1 text-xs text-slate-500">ID: {exam.IDDeThi}</div>

//                             <div className="mt-2 flex flex-wrap gap-2">
//                               <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
//                                 ⏱ {timeToMinutesLabel(exam.ThoiGianLamBaiThi)}
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
//                                 🧾 {exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0} câu
//                               </span>
//                               <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
//                                 👨‍🏫 {teacherName}
//                               </span>
//                             </div>
//                           </div>

//                           <div className="flex items-center gap-3">
//                             <Link
//                               to={`/teacher/exams/${exam.IDDeThi}`}
//                               className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//                             >
//                               Sửa
//                             </Link>

//                             <button
//                               type="button"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 onDelete(exam.IDDeThi);
//                               }}
//                               disabled={deletingId === exam.IDDeThi}
//                               className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
//                             >
//                               {deletingId === exam.IDDeThi ? "Đang xóa..." : "Xóa"}
//                             </button>
//                           </div>
//                         </div>
//                       </button>
//                     );
//                   })}

//                   {!loading && filteredExams.length === 0 ? (
//                     <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
//                       Không có đề thi nào phù hợp.
//                     </div>
//                   ) : null}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* RIGHT: details */}
//           <div className="lg:col-span-7">
//             <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               {!selectedExam ? (
//                 <div className="text-slate-600">Chọn một bài kiểm tra để xem chi tiết câu hỏi.</div>
//               ) : (
//                 <>
//                   <div className="flex flex-wrap items-start justify-between gap-3">
//                     <div className="min-w-0">
//                       <div className="text-xl font-bold text-slate-800">{selectedExam.TenDeThi}</div>
//                       <div className="mt-1 text-sm text-slate-500">
//                         <span className="font-semibold text-slate-700">ID:</span> {selectedExam.IDDeThi} •{" "}
//                         <span className="font-semibold text-slate-700">Thời gian:</span>{" "}
//                         {selectedExam.ThoiGianLamBaiThi} ({timeToMinutesLabel(selectedExam.ThoiGianLamBaiThi)})
//                       </div>
//                     </div>

//                     <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
//                       {selectedExam.so_cau_hoi ?? selectedExam.chi_tiet?.length ?? 0} câu hỏi
//                     </span>
//                   </div>

//                   <div className="mt-5 space-y-3">
//                     {(selectedExam.chi_tiet || [])
//                       .slice()
//                       .sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0))
//                       .map((ct) => {
//                         const q = ct.IDCauHoi_detail;
//                         const contentText = tiptapToText(q?.NoiDungCauHoi);

//                         return (
//                           <div
//                             key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
//                             className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                           >
//                             <div className="flex flex-wrap items-start justify-between gap-3">
//                               <div>
//                                 <div className="text-sm font-bold text-slate-800">
//                                   Câu {ct.ThuTuCauHoi} • {typeLabel(q?.LoaiCauHoi)}
//                                 </div>
//                                 <div className="mt-1 text-xs text-slate-500">
//                                   {q?.IDCauHoi} • {q?.IDBaiHoc}
//                                 </div>
//                               </div>

//                               {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                                 <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
//                                   🔊 Audio
//                                 </span>
//                               ) : null}
//                             </div>

//                             <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
//                               {contentText}
//                             </div>

//                             {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
//                               <div className="mt-3">
//                                 <audio controls className="w-full">
//                                   <source src={q.FileNghe_url || ""} />
//                                 </audio>
//                               </div>
//                             ) : null}

//                             {/* ✅ SỬA Ở ĐÂY: HIỂN THỊ LỰA CHỌN CHO CẢ NGHE + TRẮC NGHIỆM */}
//                             {q?.LoaiCauHoi !== "tuluan" && q?.lua_chon?.length ? (
//                               <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
//                                 {q.lua_chon.map((c) => (
//                                   <div
//                                     key={c.LuaChonID}
//                                     className={[
//                                       "rounded-xl border px-3 py-2 text-sm font-semibold",
//                                       c.DapAnDung
//                                         ? "border-emerald-200 bg-emerald-50 text-emerald-700"
//                                         : "border-slate-200 bg-white text-slate-700",
//                                     ].join(" ")}
//                                   >
//                                     {c.NoiDungLuaChon}
//                                   </div>
//                                 ))}
//                               </div>
//                             ) : null}

//                             {q?.GiaiThich ? (
//                               <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
//                                 <span className="font-bold">Giải thích:</span> {q.GiaiThich}
//                               </div>
//                             ) : null}
//                           </div>
//                         );
//                       })}

//                     {!selectedExam.chi_tiet || selectedExam.chi_tiet.length === 0 ? (
//                       <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
//                         Đề thi này chưa có câu hỏi.
//                       </div>
//                     ) : null}
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }
