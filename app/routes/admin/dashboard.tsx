import React, { useEffect, useMemo, useState } from "react";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { cn } from "utils/helpers/class-name";
import { http } from "utils/libs/https";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// ====== CLASSES ======
type ClassItem = {
  IDLopHoc: string;
  TenLopHoc: string;
  IDGiaoVien: string;
  so_hoc_vien: number;
};

// ====== TEACHERS ======
type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TrangThaiLamViec?: string | null;
  ChuyenMon?: string | null;
  TaiKhoan_detail?: {
    IDTaiKhoan: string;
    Email: string;
    HoTen: string;
    AnhDaiDien: string | null;
    SoDienThoai: number | null;
    is_active: boolean;
    IDQuyen?: number | null; // 1 admin, 2 student, 3 teacher
    IDQuyen_detail?: { IDQuyen: number; TenQuyen: string };
  };
};

// ====== STUDENTS ======
type StudentItem = {
  HocVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: {
    IDTaiKhoan: string;
    Email: string;
    HoTen: string;
    AnhDaiDien: string | null;
    SoDienThoai: number | null;
    is_active: boolean;
    BiVoHieuHoa?: boolean;
    IDQuyen?: number | null; // 1 admin, 2 student, 3 teacher
    IDQuyen_detail?: { IDQuyen: number; TenQuyen: string };
    NgayTaoTaiKhoan?: string;
  };
};

// ====== EXAMS ======
type ExamItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "01:00:00"
  so_cau_hoi: number;
  IDGiaoVien: string;
  IDGiaoVien_detail?: {
    TaiKhoan_detail?: {
      HoTen: string;
      Email: string;
      IDQuyen?: number;
    };
  };
};

// ====== RESULTS (for charts + table) ======
type ResultItem = {
  KetQuaID: string;
  DiemSo: number;
  DeThiID: string;
  DeThiID_detail?: {
    IDDeThi: string;
    TenDeThi: string;
    IDGiaoVien?: string;
  };
  HocVienID?: string;
  HocVienID_detail?: {
    TaiKhoan_detail?: {
      HoTen?: string;
      Email?: string;
    };
  };
  chi_tiet?: Array<{
    LaDung?: boolean;
    CauHoiID_detail?: {
      LoaiCauHoi?: string; // khoptu | tracnghiem | nghe | sapxeptu | tuluan ...
    };
  }>;
};

type Row = {
  stt: number;
  name: string;
  tenDe: string;
  ghepTu: number; // số câu đúng
  doc: number; // số câu đúng
  nghe: number; // số câu đúng
  tong: number; // DiemSo backend
  dung: number;
  tongCau: number;
  percent: number; // % đúng
};

type ExamAgg = {
  deThiId: string;
  tenDe: string;
  attempts: number;
  totalCorrect: number;
  totalQuestions: number;
  avgPercent: number;
  ghepTuCorrect: number;
  docCorrect: number;
  ngheCorrect: number;
};

function normalizeError(err: any): string {
  const data = err?.response?.data;
  if (data?.detail) return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("\n");
  }
  return err?.message || "Có lỗi xảy ra.";
}

function mapTrangThai(t?: boolean) {
  if (t) return { text: "Hoạt động", tone: "success" as const };
  return { text: "Đã khoá", tone: "warning" as const };
}

function mapTrangThaiGV(trangThai?: string | null) {
  if (trangThai === "1") return { text: "Đang dạy", tone: "success" as const };
  if (trangThai === "3") return { text: "Tạm nghỉ", tone: "warning" as const };
  if (trangThai === "s") return { text: "Khác", tone: "neutral" as const };
  return { text: "—", tone: "neutral" as const };
}

// ===== helpers for results =====
function getNextPage(next: string | null): number | null {
  if (!next) return null;
  try {
    const u = new URL(next);
    const p = u.searchParams.get("page");
    return p ? Number(p) : null;
  } catch {
    const m = next.match(/page=(\d+)/);
    return m ? Number(m[1]) : null;
  }
}

async function fetchAllResults(): Promise<ResultItem[]> {
  let page = 1;
  const acc: ResultItem[] = [];

  for (let guard = 0; guard < 400; guard++) {
    const res = await http.get<PaginatedRes<ResultItem>>(
      `/api/results/ket-qua/?page=${page}`
    );
    acc.push(...(res.data?.results || []));
    const nextPage = getNextPage(res.data?.next || null);
    if (!nextPage) break;
    page = nextPage;
  }
  return acc;
}

function getBucket(loai?: string): "GhepTu" | "Doc" | "Nghe" | "Other" {
  switch (loai) {
    case "khoptu":
      return "GhepTu";
    case "nghe":
      return "Nghe";
    case "tracnghiem":
    case "sapxeptu":
      return "Doc";
    default:
      return "Other";
  }
}

function toPercent(correct: number, total: number) {
  if (!total) return 0;
  return Math.round((correct / total) * 1000) / 10; // 1 decimal
}

type LevelKey = "< TB" | "TB" | "Khá" | "Giỏi";
function classifyLevel(percent: number): LevelKey {
  if (percent < 50) return "< TB";
  if (percent < 65) return "TB";
  if (percent < 80) return "Khá";
  return "Giỏi";
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [classesRes, setClassesRes] = useState<PaginatedRes<ClassItem> | null>(
    null
  );
  const [teachersRes, setTeachersRes] =
    useState<PaginatedRes<TeacherItem> | null>(null);
  const [studentsRes, setStudentsRes] =
    useState<PaginatedRes<StudentItem> | null>(null);
  const [examsRes, setExamsRes] = useState<PaginatedRes<ExamItem> | null>(null);

  // ✅ results state (for charts + table)
  const [loadingResults, setLoadingResults] = useState(false);
  const [errResults, setErrResults] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [c, t, s, e] = await Promise.all([
          http
            .get<PaginatedRes<ClassItem>>("/api/classes/lop-hoc/")
            .then((r) => r.data),
          http
            .get<PaginatedRes<TeacherItem>>("/api/auth/teachers/")
            .then((r) => r.data),
          http
            .get<PaginatedRes<StudentItem>>("/api/auth/students/")
            .then((r) => r.data),
          http
            .get<PaginatedRes<ExamItem>>("/api/exams/de-thi/")
            .then((r) => r.data),
        ]);

        if (!mounted) return;
        setClassesRes(c);
        setTeachersRes(t);
        setStudentsRes(s);
        setExamsRes(e);
      } catch (e: any) {
        if (!mounted) return;
        setErr(normalizeError(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ✅ load ALL results (admin => không lọc)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingResults(true);
      setErrResults(null);
      try {
        const all = await fetchAllResults();
        if (!mounted) return;
        setResults(all);
      } catch (e: any) {
        if (!mounted) return;
        setErrResults(normalizeError(e));
      } finally {
        if (!mounted) return;
        setLoadingResults(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ===== Fix lỗi BE tạm thời ở FE: lọc đúng role =====
  const studentsFiltered = useMemo(() => {
    const list = studentsRes?.results || [];
    const onlyStudents = list.filter((x) => {
      const role =
        x.TaiKhoan_detail?.IDQuyen ?? x.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen;
      const roleName = x.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen;

      if (role != null) return role === 2;
      if (roleName) return roleName.toLowerCase().includes("học viên");
      return true;
    });
    return onlyStudents;
  }, [studentsRes]);

  const totalStudents = studentsFiltered.length;

  const totalTeachers = teachersRes?.count ?? 0;
  const totalExams = examsRes?.count ?? 0;
  const totalClasses = classesRes?.count ?? 0;

  const topTeachers = (teachersRes?.results || []).slice(0, 5);
  const topStudents = studentsFiltered.slice(0, 5);
  const topExams = (examsRes?.results || []).slice(0, 5);

  // ====== BUILD TABLE ROWS (admin => ALL results) ======
  const rows: Row[] = useMemo(() => {
    const built = (results || []).map((r, idx) => {
      const studentName =
        r?.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
        r?.HocVienID_detail?.TaiKhoan_detail?.Email ||
        r?.HocVienID ||
        "—";

      const tenDe = r?.DeThiID_detail?.TenDeThi || r?.DeThiID || "—";

      let ghepTu = 0;
      let doc = 0;
      let nghe = 0;
      let dung = 0;
      let tongCau = 0;

      for (const ct of r?.chi_tiet || []) {
        const loai = ct?.CauHoiID_detail?.LoaiCauHoi;
        const b = getBucket(loai);

        tongCau += 1;
        if (ct?.LaDung) {
          dung += 1;
          if (b === "GhepTu") ghepTu += 1;
          if (b === "Doc") doc += 1;
          if (b === "Nghe") nghe += 1;
        }
      }

      const percent = toPercent(dung, tongCau);

      return {
        stt: idx + 1,
        name: studentName,
        tenDe,
        ghepTu,
        doc,
        nghe,
        tong: Number(r?.DiemSo) || 0,
        dung,
        tongCau,
        percent,
      };
    });

    // sort theo tổng điểm giảm dần
    built.sort((a, b) => b.tong - a.tong);
    return built.map((x, i) => ({ ...x, stt: i + 1 }));
  }, [results]);

  // ====== AGG BY EXAM (admin => ALL exams in results) ======
  const examAgg: ExamAgg[] = useMemo(() => {
    const mp = new Map<string, ExamAgg>();

    for (const r of results || []) {
      const deThiId = r?.DeThiID || "—";
      const tenDe = r?.DeThiID_detail?.TenDeThi || r?.DeThiID || "—";

      let totalQuestions = 0;
      let totalCorrect = 0;

      let ghepTuCorrect = 0;
      let docCorrect = 0;
      let ngheCorrect = 0;

      for (const ct of r?.chi_tiet || []) {
        const loai = ct?.CauHoiID_detail?.LoaiCauHoi;
        const b = getBucket(loai);

        totalQuestions += 1;
        if (ct?.LaDung) {
          totalCorrect += 1;
          if (b === "GhepTu") ghepTuCorrect += 1;
          if (b === "Doc") docCorrect += 1;
          if (b === "Nghe") ngheCorrect += 1;
        }
      }

      const cur =
        mp.get(deThiId) ||
        ({
          deThiId,
          tenDe,
          attempts: 0,
          totalCorrect: 0,
          totalQuestions: 0,
          avgPercent: 0,
          ghepTuCorrect: 0,
          docCorrect: 0,
          ngheCorrect: 0,
        } as ExamAgg);

      cur.attempts += 1;
      cur.totalCorrect += totalCorrect;
      cur.totalQuestions += totalQuestions;
      cur.ghepTuCorrect += ghepTuCorrect;
      cur.docCorrect += docCorrect;
      cur.ngheCorrect += ngheCorrect;

      mp.set(deThiId, cur);
    }

    const arr = Array.from(mp.values()).map((x) => ({
      ...x,
      avgPercent: toPercent(x.totalCorrect, x.totalQuestions),
    }));

    arr.sort((a, b) => b.avgPercent - a.avgPercent);
    return arr;
  }, [results]);

  // ====== PIE DATA (level distribution) ======
  const levelPieData = useMemo(() => {
    const counts: Record<LevelKey, number> = {
      "< TB": 0,
      TB: 0,
      Khá: 0,
      Giỏi: 0,
    };

    for (const r of rows) {
      counts[classifyLevel(r.percent)] += 1;
    }

    return (Object.keys(counts) as LevelKey[]).map((k) => ({
      name: k,
      value: counts[k],
    }));
  }, [rows]);

  // ====== EXPORT PDF ======
  const exportPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    doc.setFontSize(14);
    doc.text("BẢNG KẾT QUẢ BÀI THI (ADMIN)", 40, 40);

    doc.setFontSize(10);
    doc.text(`Tổng dòng: ${rows.length}`, 40, 58);

    autoTable(doc, {
      startY: 75,
      head: [["STT", "Name", "Tên đề", "GhepTu", "Đọc", "Nghe", "Đúng/Tổng", "Tổng"]],
      body: rows.map((r) => [
        r.stt,
        r.name,
        r.tenDe,
        r.ghepTu,
        r.doc,
        r.nghe,
        `${r.dung}/${r.tongCau} (${r.percent}%)`,
        r.tong,
      ]),
      styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 160 },
        2: { cellWidth: 260 },
        3: { cellWidth: 70, halign: "right" },
        4: { cellWidth: 70, halign: "right" },
        5: { cellWidth: 70, halign: "right" },
        6: { cellWidth: 140 },
        7: { cellWidth: 70, halign: "right" },
      },
    });

    doc.save("ket-qua-bai-thi-admin.pdf");
  };

  const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  return (
    <ContentLayoutWrapper heading="Bảng điều khiển">
      <div className="content-area">
        {err && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 whitespace-pre-wrap">
            {err}
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-4 gap-5">
          {/* Tổng học viên */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#0EA5E9" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Tổng học viên</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  {loading ? "…" : totalStudents.toLocaleString("vi-VN")}
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                    stroke="#0EA5E9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
                    stroke="#0EA5E9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                {loading ? "…" : `${totalClasses} lớp`}
              </span>
              <span className="text-[13px] text-slate-500">đang quản lý</span>
            </div>
          </div>

          {/* Giáo viên */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#10B981" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Giáo viên</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  {loading ? "…" : totalTeachers.toLocaleString("vi-VN")}
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                {loading ? "…" : "Role = 3"}
              </span>
              <span className="text-[13px] text-slate-500">teacher</span>
            </div>
          </div>

          {/* Đề thi */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#F59E0B" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Đề thi</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  {loading ? "…" : totalExams.toLocaleString("vi-VN")}
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                {loading ? "…" : "Bài kiểm tra"}
              </span>
              <span className="text-[13px] text-slate-500">theo hệ thống</span>
            </div>
          </div>
        </div>

        {/* ===== 3 bảng (mỗi bảng 5 record) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Teachers */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-800">Giáo viên</div>
                  <div className="text-sm text-slate-500">5 giáo viên</div>
                </div>
                <button className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                  Xem tất cả
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Họ tên</th>
                      <th className="px-3 py-2 text-left">Chuyên môn</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTeachers.map((t) => {
                      const status = mapTrangThaiGV(t.TrangThaiLamViec);
                      const name = t.TaiKhoan_detail?.HoTen || t.GiaoVienID;
                      const major = t.ChuyenMon || "—";

                      return (
                        <tr key={t.GiaoVienID} className="border-t border-slate-200">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800">{name}</div>
                            <div className="text-xs text-slate-500">
                              {t.TaiKhoan_detail?.Email || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-800">{major}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                status.tone === "success" && "bg-emerald-100 text-emerald-700",
                                status.tone === "warning" && "bg-amber-100 text-amber-700",
                                status.tone === "neutral" && "bg-slate-200 text-slate-700"
                              )}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {!loading && topTeachers.length === 0 && (
                      <tr className="border-t border-slate-200">
                        <td colSpan={3} className="px-3 py-4 text-slate-500">
                          Chưa có dữ liệu giáo viên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Students */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-800">Học viên</div>
                  <div className="text-sm text-slate-500">5 học viên (lọc role=2)</div>
                </div>
                <button className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                  Xem tất cả
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Họ tên</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStudents.map((s) => {
                      const name = s.TaiKhoan_detail?.HoTen || s.HocVienID;
                      const email = s.TaiKhoan_detail?.Email || "—";
                      const status = mapTrangThai(!!s.TaiKhoan_detail?.is_active);

                      return (
                        <tr key={s.HocVienID} className="border-t border-slate-200">
                          <td className="px-3 py-2 font-semibold text-slate-800">{name}</td>
                          <td className="px-3 py-2 text-slate-700">{email}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                                status.tone === "success" && "bg-emerald-100 text-emerald-700",
                                status.tone === "warning" && "bg-amber-100 text-amber-700"
                              )}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {!loading && topStudents.length === 0 && (
                      <tr className="border-t border-slate-200">
                        <td colSpan={3} className="px-3 py-4 text-slate-500">
                          Chưa có dữ liệu học viên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Exams */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-800">Bài kiểm tra</div>
                  <div className="text-sm text-slate-500">5 đề thi</div>
                </div>
                <button className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
                  Xem tất cả
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Tên đề</th>
                      <th className="px-3 py-2 text-left">Câu</th>
                      <th className="px-3 py-2 text-left">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topExams.map((ex) => {
                      const teacherName =
                        ex.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
                        ex.IDGiaoVien ||
                        "—";

                      return (
                        <tr key={ex.IDDeThi} className="border-t border-slate-200">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800">{ex.TenDeThi}</div>
                            <div className="text-xs text-slate-500">GV: {teacherName}</div>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{ex.so_cau_hoi}</td>
                          <td className="px-3 py-2 text-slate-700">{ex.ThoiGianLamBaiThi}</td>
                        </tr>
                      );
                    })}

                    {!loading && topExams.length === 0 && (
                      <tr className="border-t border-slate-200">
                        <td colSpan={3} className="px-3 py-4 text-slate-500">
                          Chưa có dữ liệu đề thi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ===== CHARTS (ADMIN: ALL RESULTS) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Pie */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2">
              <div className="text-lg font-bold text-slate-800">Phân loại kết quả</div>
              <div className="text-sm text-slate-500">
                Theo % đúng: &lt;50, 50–64, 65–79, ≥80
              </div>
            </div>

            {errResults && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
                {errResults}
              </div>
            )}

            {loadingResults ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                Đang tải dữ liệu...
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                Chưa có dữ liệu.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={levelPieData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {levelPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Bar avg percent per exam */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2">
              <div className="text-lg font-bold text-slate-800">% đúng trung bình theo đề</div>
              <div className="text-sm text-slate-500">Trục X hiển thị tên đề</div>
            </div>

            {loadingResults ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                Đang tải dữ liệu...
              </div>
            ) : examAgg.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                Chưa có dữ liệu.
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={examAgg}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tenDe"
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgPercent" name="% đúng TB" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Stacked bar correct by section */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2">
              <div className="text-lg font-bold text-slate-800">Số câu đúng theo phần (theo đề)</div>
              <div className="text-sm text-slate-500">
                GhepTu / Đọc / Nghe = số câu đúng (stack)
              </div>
            </div>

            {loadingResults ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                Đang tải dữ liệu...
              </div>
            ) : examAgg.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                Chưa có dữ liệu.
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer>
                  <BarChart data={examAgg}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tenDe"
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ghepTuCorrect" name="GhepTu (đúng)" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="docCorrect" name="Đọc (đúng)" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="ngheCorrect" name="Nghe (đúng)" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ===== TABLE + PDF ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-slate-800">Bảng kết quả bài thi</div>
              <div className="text-sm text-slate-500">
                Admin xem tất cả · GhepTu/Đọc/Nghe = số câu đúng · có Đúng/Tổng
              </div>
            </div>

            <button
              type="button"
              onClick={exportPdf}
              disabled={loadingResults || rows.length === 0}
              className={cn(
                "h-10 rounded-xl px-4 font-semibold text-white",
                loadingResults || rows.length === 0
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700"
              )}
            >
              Xuất PDF
            </button>
          </div>

          {errResults && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
              {errResults}
            </div>
          )}

          {loadingResults ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Đang tải dữ liệu...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Chưa có dữ liệu kết quả.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">STT</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Tên đề</th>
                    <th className="px-4 py-3 text-right">GhepTu</th>
                    <th className="px-4 py-3 text-right">Đọc</th>
                    <th className="px-4 py-3 text-right">Nghe</th>
                    <th className="px-4 py-3 text-right">Đúng/Tổng</th>
                    <th className="px-4 py-3 text-right">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.stt}-${r.name}-${r.tenDe}`}
                      className="odd:bg-white even:bg-slate-50 border-t border-slate-200"
                    >
                      <td className="px-4 py-3">{r.stt}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[240px]">
                          {r.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[420px]">
                          {r.tenDe}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{r.ghepTu}</td>
                      <td className="px-4 py-3 text-right font-semibold">{r.doc}</td>
                      <td className="px-4 py-3 text-right font-semibold">{r.nghe}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {r.dung}/{r.tongCau} ({r.percent}%)
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-violet-700">
                        {r.tong}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 text-xs text-slate-500">
            * Mapping: GhepTu=khoptu, Đọc=tracnghiem+sapxeptu, Nghe=nghe. Tổng=DiemSo backend.
          </div>
        </div>
      </div>
    </ContentLayoutWrapper>
  );
}

// import React, { useEffect, useMemo, useState } from "react";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// import { cn } from "utils/helpers/class-name";
// import { http } from "utils/libs/https";

// type PaginatedRes<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// // ====== CLASSES ======
// type ClassItem = {
//   IDLopHoc: string;
//   TenLopHoc: string;
//   IDGiaoVien: string;
//   so_hoc_vien: number;
// };

// // ====== TEACHERS ======
// type TeacherItem = {
//   GiaoVienID: string;
//   TaiKhoan: string;
//   TrangThaiLamViec?: string | null;
//   ChuyenMon?: string | null;
//   TaiKhoan_detail?: {
//     IDTaiKhoan: string;
//     Email: string;
//     HoTen: string;
//     AnhDaiDien: string | null;
//     SoDienThoai: number | null;
//     is_active: boolean;
//     IDQuyen?: number | null; // 1 admin, 2 student, 3 teacher
//     IDQuyen_detail?: { IDQuyen: number; TenQuyen: string };
//   };
// };

// // ====== STUDENTS ======
// type StudentItem = {
//   HocVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: {
//     IDTaiKhoan: string;
//     Email: string;
//     HoTen: string;
//     AnhDaiDien: string | null;
//     SoDienThoai: number | null;
//     is_active: boolean;
//     BiVoHieuHoa?: boolean;
//     IDQuyen?: number | null; // 1 admin, 2 student, 3 teacher
//     IDQuyen_detail?: { IDQuyen: number; TenQuyen: string };
//     NgayTaoTaiKhoan?: string;
//   };
// };

// // ====== EXAMS ======
// type ExamItem = {
//   IDDeThi: string;
//   TenDeThi: string;
//   ThoiGianLamBaiThi: string; // "01:00:00"
//   so_cau_hoi: number;
//   IDGiaoVien: string;
//   IDGiaoVien_detail?: {
//     TaiKhoan_detail?: {
//       HoTen: string;
//       Email: string;
//       IDQuyen?: number;
//     };
//   };
// };

// function normalizeError(err: any): string {
//   const data = err?.response?.data;
//   if (data?.detail) return data.detail;
//   if (typeof data === "string") return data;
//   if (data && typeof data === "object") {
//     return Object.entries(data)
//       .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
//       .join("\n");
//   }
//   return err?.message || "Có lỗi xảy ra.";
// }

// function mapTrangThai(t?: boolean) {
//   if (t) return { text: "Hoạt động", tone: "success" as const };
//   return { text: "Đã khoá", tone: "warning" as const };
// }

// function mapTrangThaiGV(trangThai?: string | null) {
//   if (trangThai === "1") return { text: "Đang dạy", tone: "success" as const };
//   if (trangThai === "3") return { text: "Tạm nghỉ", tone: "warning" as const };
//   if (trangThai === "s") return { text: "Khác", tone: "neutral" as const };
//   return { text: "—", tone: "neutral" as const };
// }

// export default function Dashboard() {
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);

//   const [classesRes, setClassesRes] = useState<PaginatedRes<ClassItem> | null>(
//     null
//   );
//   const [teachersRes, setTeachersRes] =
//     useState<PaginatedRes<TeacherItem> | null>(null);
//   const [studentsRes, setStudentsRes] =
//     useState<PaginatedRes<StudentItem> | null>(null);
//   const [examsRes, setExamsRes] = useState<PaginatedRes<ExamItem> | null>(null);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       setLoading(true);
//       setErr(null);
//       try {
//         const [c, t, s, e] = await Promise.all([
//           http
//             .get<PaginatedRes<ClassItem>>("/api/classes/lop-hoc/")
//             .then((r) => r.data),
//           http
//             .get<PaginatedRes<TeacherItem>>("/api/auth/teachers/")
//             .then((r) => r.data),
//           http
//             .get<PaginatedRes<StudentItem>>("/api/auth/students/")
//             .then((r) => r.data),
//           http
//             .get<PaginatedRes<ExamItem>>("/api/exams/de-thi/")
//             .then((r) => r.data),
//         ]);

//         if (!mounted) return;
//         setClassesRes(c);
//         setTeachersRes(t);
//         setStudentsRes(s);
//         setExamsRes(e);
//       } catch (e: any) {
//         if (!mounted) return;
//         setErr(normalizeError(e));
//       } finally {
//         if (!mounted) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   // ===== Fix lỗi BE tạm thời ở FE: lọc đúng role =====
//   const studentsFiltered = useMemo(() => {
//     const list = studentsRes?.results || [];

//     // Ưu tiên check IDQuyen (1 admin, 2 student, 3 teacher)
//     const onlyStudents = list.filter((x) => {
//       const role =
//         x.TaiKhoan_detail?.IDQuyen ??
//         x.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen;

//       // Nếu API bị thiếu IDQuyen, fallback check TenQuyen
//       const roleName = x.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen;

//       if (role != null) return role === 2;
//       if (roleName) return roleName.toLowerCase().includes("học viên");
//       return true; // không có role thì tạm cho qua
//     });

//     return onlyStudents;
//   }, [studentsRes]);

//   // Tổng học viên nên lấy từ studentsFiltered cho đúng (tránh lẫn teacher)
//   const totalStudents = studentsFiltered.length;

//   const totalTeachers = teachersRes?.count ?? 0;
//   const totalExams = examsRes?.count ?? 0;
//   const totalClasses = classesRes?.count ?? 0;

//   // top 5 cho bảng
//   const topTeachers = (teachersRes?.results || []).slice(0, 5);
//   const topStudents = studentsFiltered.slice(0, 5);
//   const topExams = (examsRes?.results || []).slice(0, 5);

//   return (
//     <ContentLayoutWrapper heading="Bảng điều khiển">
//       <div className="content-area">
//         {err && (
//           <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 whitespace-pre-wrap">
//             {err}
//           </div>
//         )}

//         {/* Stats */}
//         <div className="mb-8 grid grid-cols-4 gap-5">
//           {/* Tổng học viên */}
//           <div
//             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
//             style={{ borderLeftColor: "#0EA5E9" }}
//           >
//             <div className="mb-4 flex items-start justify-between">
//               <div>
//                 <div className="mb-2 text-sm text-slate-500">Tổng học viên</div>
//                 <div className="text-[32px] font-bold leading-none text-slate-800">
//                   {loading ? "…" : totalStudents.toLocaleString("vi-VN")}
//                 </div>
//               </div>

//               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
//                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
//                   <path
//                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
//                     stroke="#0EA5E9"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                   <path
//                     d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
//                     stroke="#0EA5E9"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
//                 {loading ? "…" : `${totalClasses} lớp`}
//               </span>
//               <span className="text-[13px] text-slate-500">đang quản lý</span>
//             </div>
//           </div>

//           {/* Giáo viên */}
//           <div
//             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
//             style={{ borderLeftColor: "#10B981" }}
//           >
//             <div className="mb-4 flex items-start justify-between">
//               <div>
//                 <div className="mb-2 text-sm text-slate-500">Giáo viên</div>
//                 <div className="text-[32px] font-bold leading-none text-slate-800">
//                   {loading ? "…" : totalTeachers.toLocaleString("vi-VN")}
//                 </div>
//               </div>

//               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
//                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
//                   <path
//                     d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
//                     stroke="#10B981"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                   <path
//                     d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
//                     stroke="#10B981"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
//                 {loading ? "…" : "Role = 3"}
//               </span>
//               <span className="text-[13px] text-slate-500">teacher</span>
//             </div>
//           </div>

//           {/* Đề thi */}
//           <div
//             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
//             style={{ borderLeftColor: "#F59E0B" }}
//           >
//             <div className="mb-4 flex items-start justify-between">
//               <div>
//                 <div className="mb-2 text-sm text-slate-500">Đề thi</div>
//                 <div className="text-[32px] font-bold leading-none text-slate-800">
//                   {loading ? "…" : totalExams.toLocaleString("vi-VN")}
//                 </div>
//               </div>

//               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
//                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
//                   <path
//                     d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
//                     stroke="#F59E0B"
//                     strokeWidth="2"
//                   />
//                 </svg>
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
//                 {loading ? "…" : "Bài kiểm tra"}
//               </span>
//               <span className="text-[13px] text-slate-500">theo hệ thống</span>
//             </div>
//           </div>

//           {/* trạng thái tải */}
//           {/* <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
//             <div className="text-sm text-slate-500">Tình trạng tải</div>
//             <div className="mt-2 text-xs text-slate-400">
//               {loading ? "Đang tải dữ liệu…" : "Đã tải xong"}
//             </div>
//             {studentsRes &&
//               studentsRes.results.length !== studentsFiltered.length && (
//                 <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
//                   API students đang trả lẫn role != 2. FE đã lọc tạm theo
//                   role=2.
//                 </div>
//               )}
//           </div> */}
//         </div>

//         {/* ===== 3 bảng (mỗi bảng 5 record) ===== */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
//           {/* Teachers */}
//           <div>
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//               <div className="mb-4 flex items-center justify-between">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">
//                     Giáo viên
//                   </div>
//                   <div className="text-sm text-slate-500">5 giáo viên</div>
//                 </div>
//                 <button className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
//                   Xem tất cả
//                 </button>
//               </div>

//               <div className="overflow-hidden rounded-xl border border-slate-200">
//                 <table className="w-full text-sm">
//                   <thead className="bg-slate-100 text-slate-700">
//                     <tr>
//                       <th className="px-3 py-2 text-left">Họ tên</th>
//                       <th className="px-3 py-2 text-left">Chuyên môn</th>
//                       <th className="px-3 py-2 text-left">Trạng thái</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {topTeachers.map((t) => {
//                       const status = mapTrangThaiGV(t.TrangThaiLamViec);
//                       const name = t.TaiKhoan_detail?.HoTen || t.GiaoVienID;
//                       const major = t.ChuyenMon || "—";

//                       return (
//                         <tr
//                           key={t.GiaoVienID}
//                           className="border-t border-slate-200"
//                         >
//                           <td className="px-3 py-2">
//                             <div className="font-semibold text-slate-800">
//                               {name}
//                             </div>
//                             <div className="text-xs text-slate-500">
//                               {t.TaiKhoan_detail?.Email || "—"}
//                             </div>
//                           </td>
//                           <td className="px-3 py-2 text-slate-800">{major}</td>
//                           <td className="px-3 py-2">
//                             <span
//                               className={cn(
//                                 "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
//                                 status.tone === "success" &&
//                                   "bg-emerald-100 text-emerald-700",
//                                 status.tone === "warning" &&
//                                   "bg-amber-100 text-amber-700",
//                                 status.tone === "neutral" &&
//                                   "bg-slate-200 text-slate-700"
//                               )}
//                             >
//                               {status.text}
//                             </span>
//                           </td>
//                         </tr>
//                       );
//                     })}

//                     {!loading && topTeachers.length === 0 && (
//                       <tr className="border-t border-slate-200">
//                         <td colSpan={3} className="px-3 py-4 text-slate-500">
//                           Chưa có dữ liệu giáo viên.
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>

//           {/* Students */}
//           <div>
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//               <div className="mb-4 flex items-center justify-between">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">
//                     Học viên
//                   </div>
//                   <div className="text-sm text-slate-500">
//                     5 học viên (lọc role=2)
//                   </div>
//                 </div>
//                 <button className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
//                   Xem tất cả
//                 </button>
//               </div>

//               <div className="overflow-hidden rounded-xl border border-slate-200">
//                 <table className="w-full text-sm">
//                   <thead className="bg-slate-100 text-slate-700">
//                     <tr>
//                       <th className="px-3 py-2 text-left">Họ tên</th>
//                       <th className="px-3 py-2 text-left">Email</th>
//                       <th className="px-3 py-2 text-left">Trạng thái</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {topStudents.map((s) => {
//                       const name = s.TaiKhoan_detail?.HoTen || s.HocVienID;
//                       const email = s.TaiKhoan_detail?.Email || "—";
//                       const status = mapTrangThai(
//                         !!s.TaiKhoan_detail?.is_active
//                       );

//                       return (
//                         <tr
//                           key={s.HocVienID}
//                           className="border-t border-slate-200"
//                         >
//                           <td className="px-3 py-2 font-semibold text-slate-800">
//                             {name}
//                           </td>
//                           <td className="px-3 py-2 text-slate-700">{email}</td>
//                           <td className="px-3 py-2">
//                             <span
//                               className={cn(
//                                 "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
//                                 status.tone === "success" &&
//                                   "bg-emerald-100 text-emerald-700",
//                                 status.tone === "warning" &&
//                                   "bg-amber-100 text-amber-700"
//                               )}
//                             >
//                               {status.text}
//                             </span>
//                           </td>
//                         </tr>
//                       );
//                     })}

//                     {!loading && topStudents.length === 0 && (
//                       <tr className="border-t border-slate-200">
//                         <td colSpan={3} className="px-3 py-4 text-slate-500">
//                           Chưa có dữ liệu học viên.
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </div>

//           {/* Exams */}
//           <div>
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//               <div className="mb-4 flex items-center justify-between">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">
//                     Bài kiểm tra
//                   </div>
//                   <div className="text-sm text-slate-500">5 đề thi</div>
//                 </div>
//                 <button className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50">
//                   Xem tất cả
//                 </button>
//               </div>

//               <div className="overflow-hidden rounded-xl border border-slate-200">
//                 <table className="w-full text-sm">
//                   <thead className="bg-slate-100 text-slate-700">
//                     <tr>
//                       <th className="px-3 py-2 text-left">Tên đề</th>
//                       <th className="px-3 py-2 text-left">Câu</th>
//                       <th className="px-3 py-2 text-left">Thời gian</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {topExams.map((ex) => {
//                       const teacherName =
//                         ex.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
//                         ex.IDGiaoVien ||
//                         "—";

//                       return (
//                         <tr
//                           key={ex.IDDeThi}
//                           className="border-t border-slate-200"
//                         >
//                           <td className="px-3 py-2">
//                             <div className="font-semibold text-slate-800">
//                               {ex.TenDeThi}
//                             </div>
//                             <div className="text-xs text-slate-500">
//                               GV: {teacherName}
//                             </div>
//                           </td>
//                           <td className="px-3 py-2 font-medium text-slate-800">
//                             {ex.so_cau_hoi}
//                           </td>
//                           <td className="px-3 py-2 text-slate-700">
//                             {ex.ThoiGianLamBaiThi}
//                           </td>
//                         </tr>
//                       );
//                     })}

//                     {!loading && topExams.length === 0 && (
//                       <tr className="border-t border-slate-200">
//                         <td colSpan={3} className="px-3 py-4 text-slate-500">
//                           Chưa có dữ liệu đề thi.
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               {/* <div className="mt-3 text-xs text-slate-500">
//               *Role chuẩn: 1=admin, 2=student, 3=teacher.
//             </div> */}
//             </div>
//           </div>
//         </div>
//       </div>
//     </ContentLayoutWrapper>
//   );
// }

// //------------------------------------------

// // import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// // export default function Dashboard() {
// //   return (
// //     <ContentLayoutWrapper heading="Bảng điều khiển">
// //       <div className="content-area">
// //         {/* Stats */}
// //         <div className="mb-8 grid grid-cols-4 gap-5">
// //           {/* Card 1 */}
// //           <div
// //             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
// //             style={{ borderLeftColor: "#0EA5E9" }}
// //           >
// //             <div className="mb-4 flex items-start justify-between">
// //               <div>
// //                 <div className="mb-2 text-sm text-slate-500">Tổng học viên</div>
// //                 <div className="text-[32px] font-bold leading-none text-slate-800">
// //                   1,248
// //                 </div>
// //               </div>

// //               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
// //                 <svg
// //                   width="28"
// //                   height="28"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   xmlns="http://www.w3.org/2000/svg"
// //                 >
// //                   <path
// //                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
// //                     stroke="#0EA5E9"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                   />
// //                 </svg>
// //               </div>
// //             </div>

// //             <div className="flex items-center gap-2">
// //               <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
// //                 +12.5%
// //               </span>
// //               <span className="text-[13px] text-slate-500">
// //                 so với tháng trước
// //               </span>
// //             </div>
// //           </div>

// //           {/* Card 2 */}
// //           <div
// //             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
// //             style={{ borderLeftColor: "#10B981" }}
// //           >
// //             <div className="mb-4 flex items-start justify-between">
// //               <div>
// //                 <div className="mb-2 text-sm text-slate-500">Giáo viên</div>
// //                 <div className="text-[32px] font-bold leading-none text-slate-800">
// //                   48
// //                 </div>
// //               </div>

// //               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
// //                 <svg
// //                   width="28"
// //                   height="28"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   xmlns="http://www.w3.org/2000/svg"
// //                 >
// //                   <path
// //                     d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
// //                     stroke="#10B981"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                   />
// //                 </svg>
// //               </div>
// //             </div>

// //             <div className="flex items-center gap-2">
// //               <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
// //                 +3
// //               </span>
// //               <span className="text-[13px] text-slate-500">giáo viên mới</span>
// //             </div>
// //           </div>

// //           {/* Card 3 */}
// //           <div
// //             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
// //             style={{ borderLeftColor: "#F59E0B" }}
// //           >
// //             <div className="mb-4 flex items-start justify-between">
// //               <div>
// //                 <div className="mb-2 text-sm text-slate-500">Đề thi</div>
// //                 <div className="text-[32px] font-bold leading-none text-slate-800">
// //                   326
// //                 </div>
// //               </div>

// //               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
// //                 <svg
// //                   width="28"
// //                   height="28"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   xmlns="http://www.w3.org/2000/svg"
// //                 >
// //                   <path
// //                     d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
// //                     stroke="#F59E0B"
// //                     strokeWidth="2"
// //                   />
// //                 </svg>
// //               </div>
// //             </div>

// //             <div className="flex items-center gap-2">
// //               <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
// //                 +28
// //               </span>
// //               <span className="text-[13px] text-slate-500">đề thi mới</span>
// //             </div>
// //           </div>

// //           {/* Card 4 */}
// //           <div
// //             className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
// //             style={{ borderLeftColor: "#8B5CF6" }}
// //           >
// //             <div className="mb-4 flex items-start justify-between">
// //               <div>
// //                 <div className="mb-2 text-sm text-slate-500">Doanh thu</div>
// //                 <div className="text-[32px] font-bold leading-none text-slate-800">
// //                   ₫48M
// //                 </div>
// //               </div>

// //               <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100">
// //                 <svg
// //                   width="28"
// //                   height="28"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   xmlns="http://www.w3.org/2000/svg"
// //                 >
// //                   <path
// //                     d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
// //                     stroke="#8B5CF6"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                   />
// //                 </svg>
// //               </div>
// //             </div>

// //             <div className="flex items-center gap-2">
// //               <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
// //                 +18.2%
// //               </span>
// //               <span className="text-[13px] text-slate-500">tăng trưởng</span>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Middle grid */}
// //         <div className="mb-8 grid grid-cols-3 gap-6">
// //           {/* Chart (col-span-2) */}
// //           <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
// //             <div className="mb-6 flex items-center justify-between">
// //               <div>
// //                 <h3 className="m-0 text-lg font-bold text-slate-800">
// //                   Lượt làm bài theo tháng
// //                 </h3>
// //                 <p className="mt-1 text-[13px] text-slate-500">
// //                   Thống kê 6 tháng gần nhất
// //                 </p>
// //               </div>
// //               <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
// //                 2024
// //               </span>
// //             </div>

// //             <div className="flex h-48 items-end gap-4">
// //               {[
// //                 { h: "65%", v: "2,450", l: "T8" },
// //                 { h: "75%", v: "2,820", l: "T9" },
// //                 { h: "85%", v: "3,180", l: "T10" },
// //                 { h: "70%", v: "2,650", l: "T11" },
// //                 { h: "90%", v: "3,420", l: "T12" },
// //                 { h: "100%", v: "3,850", l: "T1" },
// //               ].map((x) => (
// //                 <div
// //                   key={x.l}
// //                   className="group flex w-full flex-col items-center"
// //                 >
// //                   <div
// //                     className="relative w-full rounded-xl bg-blue-100 transition group-hover:bg-blue-200"
// //                     style={{ height: x.h }}
// //                   >
// //                     <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-600">
// //                       {x.v}
// //                     </span>
// //                   </div>
// //                   <span className="mt-2 text-xs text-slate-500">{x.l}</span>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>

// //           {/* New Students */}
// //           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
// //             <h3 className="mb-5 text-lg font-bold text-slate-800">
// //               Học viên mới
// //             </h3>

// //             <div className="flex flex-col gap-4">
// //               {[
// //                 {
// //                   init: "NA",
// //                   name: "Nguyễn Thị Anh",
// //                   time: "Hôm nay",
// //                   badge: "Mới",
// //                   avatarClass: "bg-slate-200 text-slate-700",
// //                 },
// //                 {
// //                   init: "TB",
// //                   name: "Trần Văn Bình",
// //                   time: "Hôm nay",
// //                   badge: "Mới",
// //                   avatarClass: "bg-emerald-600 text-white",
// //                 },
// //                 {
// //                   init: "LC",
// //                   name: "Lê Thị Cúc",
// //                   time: "Hôm qua",
// //                   badge: "Mới",
// //                   avatarClass: "bg-amber-500 text-white",
// //                   badgeBlue: true,
// //                 },
// //                 {
// //                   init: "PD",
// //                   name: "Phạm Văn Dũng",
// //                   time: "Hôm qua",
// //                   badge: "Mới",
// //                   avatarClass: "bg-purple-600 text-white",
// //                   badgeBlue: true,
// //                 },
// //                 {
// //                   init: "HE",
// //                   name: "Hoàng Thị Em",
// //                   time: "2 ngày trước",
// //                   badge: "Mới",
// //                   avatarClass: "bg-red-600 text-white",
// //                   badgeBlue: true,
// //                 },
// //               ].map((s) => (
// //                 <div key={s.init} className="flex items-center gap-3">
// //                   <div
// //                     className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${s.avatarClass}`}
// //                   >
// //                     {s.init}
// //                   </div>
// //                   <div className="flex-1">
// //                     <div className="text-sm font-semibold text-slate-800">
// //                       {s.name}
// //                     </div>
// //                     <div className="text-xs text-slate-500">{s.time}</div>
// //                   </div>
// //                   <span
// //                     className={
// //                       s.badgeBlue
// //                         ? "rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
// //                         : "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
// //                     }
// //                   >
// //                     {s.badge}
// //                   </span>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>
// //         </div>

// //         {/* Bottom grid */}
// //         <div className="grid grid-cols-2 gap-6">
// //           {/* Popular exams */}
// //           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
// //             <h3 className="mb-5 text-lg font-bold text-slate-800">
// //               Đề thi phổ biến
// //             </h3>

// //             <table className="w-full border-collapse text-sm">
// //               <thead>
// //                 <tr className="text-left text-slate-500">
// //                   <th className="pb-3 font-semibold">Tên đề thi</th>
// //                   <th className="pb-3 font-semibold">Lượt làm</th>
// //                   <th className="pb-3 font-semibold">Trạng thái</th>
// //                 </tr>
// //               </thead>
// //               <tbody className="[&>tr]:border-t [&>tr]:border-slate-100">
// //                 {[
// //                   {
// //                     name: "TOEIC Mock Test 05",
// //                     count: "1,248",
// //                     status: "Hoạt động",
// //                     st: "green",
// //                   },
// //                   {
// //                     name: "TOEIC Mock Test 04",
// //                     count: "1,156",
// //                     status: "Hoạt động",
// //                     st: "green",
// //                   },
// //                   {
// //                     name: "Part 5 - Grammar",
// //                     count: "892",
// //                     status: "Hoạt động",
// //                     st: "green",
// //                   },
// //                   {
// //                     name: "Part 7 - Reading",
// //                     count: "756",
// //                     status: "Hoạt động",
// //                     st: "green",
// //                   },
// //                   {
// //                     name: "TOEIC Mock Test 03",
// //                     count: "684",
// //                     status: "Bảo trì",
// //                     st: "yellow",
// //                   },
// //                 ].map((r) => (
// //                   <tr key={r.name}>
// //                     <td className="py-3 font-semibold text-slate-800">
// //                       {r.name}
// //                     </td>
// //                     <td className="py-3 text-slate-600">{r.count}</td>
// //                     <td className="py-3">
// //                       <span
// //                         className={
// //                           r.st === "green"
// //                             ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
// //                             : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
// //                         }
// //                       >
// //                         {r.status}
// //                       </span>
// //                     </td>
// //                   </tr>
// //                 ))}
// //               </tbody>
// //             </table>
// //           </div>

// //           {/* Recent activity */}
// //           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
// //             <h3 className="mb-5 text-lg font-bold text-slate-800">
// //               Hoạt động gần đây
// //             </h3>

// //             <div className="space-y-4">
// //               {[
// //                 {
// //                   title: "Học viên mới đăng ký",
// //                   desc: "Nguyễn Thị Anh vừa đăng ký khóa TOEIC 550+",
// //                   time: "5 phút trước",
// //                   iconBg: "bg-blue-100",
// //                   iconStroke: "#0EA5E9",
// //                   icon: (
// //                     <>
// //                       <path
// //                         d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
// //                         stroke="#0EA5E9"
// //                         strokeWidth="2"
// //                       />
// //                       <path
// //                         d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
// //                         stroke="#0EA5E9"
// //                         strokeWidth="2"
// //                       />
// //                     </>
// //                   ),
// //                 },
// //                 {
// //                   title: "Đề thi mới được tạo",
// //                   desc: 'Thầy Minh đã tạo đề "TOEIC Mock Test 06"',
// //                   time: "1 giờ trước",
// //                   iconBg: "bg-emerald-100",
// //                   icon: (
// //                     <path
// //                       d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
// //                       stroke="#10B981"
// //                       strokeWidth="2"
// //                     />
// //                   ),
// //                 },
// //                 {
// //                   title: "Đánh giá mới",
// //                   desc: "Trần Văn Bình đã đánh giá 5 sao cho khóa học",
// //                   time: "2 giờ trước",
// //                   iconBg: "bg-amber-100",
// //                   icon: (
// //                     <path
// //                       d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
// //                       stroke="#F59E0B"
// //                       strokeWidth="2"
// //                       strokeLinecap="round"
// //                       strokeLinejoin="round"
// //                     />
// //                   ),
// //                 },
// //                 {
// //                   title: "Thanh toán thành công",
// //                   desc: "Lê Thị Cúc đã thanh toán ₫2,500,000",
// //                   time: "3 giờ trước",
// //                   iconBg: "bg-purple-100",
// //                   icon: (
// //                     <path
// //                       d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
// //                       stroke="#8B5CF6"
// //                       strokeWidth="2"
// //                       strokeLinecap="round"
// //                     />
// //                   ),
// //                 },
// //               ].map((a) => (
// //                 <div
// //                   key={a.title}
// //                   className="flex gap-3 rounded-xl border border-slate-100 p-4"
// //                 >
// //                   <div
// //                     className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg}`}
// //                   >
// //                     <svg
// //                       width="20"
// //                       height="20"
// //                       viewBox="0 0 24 24"
// //                       fill="none"
// //                       xmlns="http://www.w3.org/2000/svg"
// //                     >
// //                       {a.icon}
// //                     </svg>
// //                   </div>
// //                   <div className="flex-1">
// //                     <div className="text-sm font-semibold text-slate-800">
// //                       {a.title}
// //                     </div>
// //                     <div className="mt-0.5 text-[13px] text-slate-500">
// //                       {a.desc}
// //                     </div>
// //                     <div className="mt-1 text-xs text-slate-400">{a.time}</div>
// //                   </div>
// //                 </div>
// //               ))}
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </ContentLayoutWrapper>
// //   );
// // }
