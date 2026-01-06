// Dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { http } from "utils/libs/https";
import { useAuth } from "hooks/useAuth";
import { Link } from "react-router";

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

// ===== TYPES =====
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ClassItem = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa?: string;
  IDGiaoVien: string;
  so_hoc_vien: number;
};

type ResultItem = {
  KetQuaID: string;
  DiemSo: number;
  DeThiID: string;
  DeThiID_detail?: {
    IDDeThi: string;
    TenDeThi: string;
    IDGiaoVien: string;

    // ⚠️ nếu backend có lớp trong đề thi thì thường nằm ở đây (tuỳ project)
    LopHocID_detail?: {
      TenLopHoc?: string;
    };
  };

  // ⚠️ hoặc lớp nằm trực tiếp ở Result (tuỳ backend)
  LopHocID_detail?: {
    TenLopHoc?: string;
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

  // số câu đúng theo phần
  ghepTu: number;
  doc: number;
  nghe: number;

  // tổng điểm backend
  tong: number;

  // đúng/tổng
  dung: number;
  tongCau: number;
  percent: number;
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

type ExamTableRow = {
  deThiId: string;
  tenDe: string;
  tenLop: string;
  tenGiaoVien: string;
  topStudents: Array<{ name: string; tong: number; percent: number }>;
  attempts: number;
};

// ===== HELPERS =====
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

async function fetchAllClasses(): Promise<ClassItem[]> {
  let page = 1;
  const acc: ClassItem[] = [];

  for (let guard = 0; guard < 200; guard++) {
    const res = await http.get<PaginatedRes<ClassItem>>(
      `/api/classes/lop-hoc/?page=${page}`
    );
    acc.push(...(res.data?.results || []));

    const nextPage = getNextPage(res.data?.next || null);
    if (!nextPage) break;
    page = nextPage;
  }

  return acc;
}

async function fetchAllResults(): Promise<ResultItem[]> {
  let page = 1;
  const acc: ResultItem[] = [];

  for (let guard = 0; guard < 300; guard++) {
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

// Mapping loại câu hỏi -> bucket (đang dùng cho chart tổng quan: GhepTu/Doc/Nghe)
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

// ✅ bucket 4 phần cho PDF/table: Khớp Từ / Nghe / Đọc / Sắp Xếp
function getBucket4(
  loai?: string
): "KhopTu" | "Nghe" | "Doc" | "SapXep" | "Other" {
  switch (loai) {
    case "khoptu":
      return "KhopTu";
    case "nghe":
      return "Nghe";
    case "tracnghiem":
      return "Doc";
    case "sapxeptu":
      return "SapXep";
    default:
      return "Other";
  }
}

function toPercent(correct: number, total: number) {
  if (!total) return 0;
  return Math.round((correct / total) * 1000) / 10; // 1 decimal
}

// ✅ phân loại theo % đúng
type LevelKey = "< TB" | "TB" | "Khá" | "Giỏi";
function classifyLevel(percent: number): LevelKey {
  if (percent < 50) return "< TB";
  if (percent < 65) return "TB";
  if (percent < 80) return "Khá";
  return "Giỏi";
}

function safeText(v: any) {
  if (v == null) return "";
  return String(v);
}

export default function Dashboard() {
  const { user, accessToken } = useAuth();

  // ===== Classes state =====
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // ===== Results state =====
  const [loadingResults, setLoadingResults] = useState(false);
  const [errResults, setErrResults] = useState<string | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);

  // ✅ load classes
  useEffect(() => {
    let mounted = true;
    if (!accessToken || !user?.IDTaiKhoan) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const all = await fetchAllClasses();
        if (!mounted) return;
        setClasses(all);
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
  }, [accessToken, user?.IDTaiKhoan]);

  // ✅ load results
  useEffect(() => {
    let mounted = true;
    if (!accessToken || !user?.IDTaiKhoan) return;

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
  }, [accessToken, user?.IDTaiKhoan]);

  // ✅ only classes of current teacher
  const myClasses = useMemo(() => {
    const myId = user?.IDTaiKhoan;
    return classes.filter((c) => c.IDGiaoVien === myId);
  }, [classes, user?.IDTaiKhoan]);

  const classCount = myClasses.length;

  const totalStudents = useMemo(() => {
    return myClasses.reduce((sum, c) => sum + (c.so_hoc_vien || 0), 0);
  }, [myClasses]);

  // ✅ chỉ lấy kết quả thuộc đề thi của teacher hiện tại
  const myResults = useMemo(() => {
    const myId = user?.IDTaiKhoan;
    if (!myId) return [];
    return (results || []).filter((r) => r?.DeThiID_detail?.IDGiaoVien === myId);
  }, [results, user?.IDTaiKhoan]);

  // ✅ build rows table (mỗi lượt thi = 1 dòng) -> vẫn dùng cho chart tổng quan
  const rows: Row[] = useMemo(() => {
    const built = myResults.map((r, idx) => {
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

    built.sort((a, b) => b.tong - a.tong);
    return built.map((x, i) => ({ ...x, stt: i + 1 }));
  }, [myResults]);

  // ✅ aggregate theo đề thi (cho biểu đồ)
  const examAgg: ExamAgg[] = useMemo(() => {
    const mp = new Map<string, ExamAgg>();

    for (const r of myResults) {
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
  }, [myResults]);

  // ✅ pie data: phân loại theo % đúng của từng lượt thi
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

  // ===== NEW: bảng "kết quả đề thi" (mỗi đề 1 dòng) =====
  const examTableRows: ExamTableRow[] = useMemo(() => {
    const mp = new Map<string, ExamTableRow>();

    const tenGiaoVien =
      (user as any)?.HoTen || user?.Email || user?.IDTaiKhoan || "—";

    for (const r of myResults) {
      const deThiId = r?.DeThiID || "—";
      const tenDe = r?.DeThiID_detail?.TenDeThi || r?.DeThiID || "—";

      // ✅ Lớp (fallback —). Nếu backend khác key, sếp sửa dòng này cho đúng field.
      const tenLop =
        r?.DeThiID_detail?.LopHocID_detail?.TenLopHoc ||
        r?.LopHocID_detail?.TenLopHoc ||
        "—";

      let dung = 0;
      let tongCau = 0;
      for (const ct of r?.chi_tiet || []) {
        tongCau += 1;
        if (ct?.LaDung) dung += 1;
      }
      const percent = toPercent(dung, tongCau);

      const studentName =
        r?.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
        r?.HocVienID_detail?.TaiKhoan_detail?.Email ||
        r?.HocVienID ||
        "—";

      const cur =
        mp.get(deThiId) ||
        ({
          deThiId,
          tenDe,
          tenLop,
          tenGiaoVien,
          topStudents: [],
          attempts: 0,
        } as ExamTableRow);

      cur.attempts += 1;
      cur.topStudents.push({
        name: studentName,
        tong: Number(r?.DiemSo) || 0,
        percent,
      });

      mp.set(deThiId, cur);
    }

    // top 5 theo điểm
    const arr = Array.from(mp.values()).map((x) => {
      const sorted = [...x.topStudents].sort((a, b) => b.tong - a.tong);
      return { ...x, topStudents: sorted.slice(0, 5) };
    });

    // sort theo lượt làm giảm dần
    arr.sort((a, b) => b.attempts - a.attempts);
    return arr;
  }, [myResults, user]);

  // ===== EXPORT PDF theo đề =====
  function buildAttemptRow(r: ResultItem) {
    const studentName =
      r?.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
      r?.HocVienID_detail?.TaiKhoan_detail?.Email ||
      r?.HocVienID ||
      "—";

    let khopTu = 0;
    let nghe = 0;
    let doc = 0;
    let sapXep = 0;

    let dung = 0;
    let tongCau = 0;

    for (const ct of r?.chi_tiet || []) {
      tongCau += 1;
      const b = getBucket4(ct?.CauHoiID_detail?.LoaiCauHoi);
      if (ct?.LaDung) {
        dung += 1;
        if (b === "KhopTu") khopTu += 1;
        if (b === "Nghe") nghe += 1;
        if (b === "Doc") doc += 1;
        if (b === "SapXep") sapXep += 1;
      }
    }

    const percent = toPercent(dung, tongCau);

    return {
      studentName,
      khopTu,
      nghe,
      doc,
      sapXep,
      percent,
      tong: Number(r?.DiemSo) || 0,
    };
  }

  const exportExamPdf = (exam: ExamTableRow) => {
    const byExam = myResults.filter((r) => (r?.DeThiID || "—") === exam.deThiId);

    // top 5 theo điểm
    const attempts = byExam
      .map(buildAttemptRow)
      .sort((a, b) => b.tong - a.tong)
      .slice(0, 5);

    const docPdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    // ===== Header giống mẫu =====
    docPdf.setFontSize(16);
    docPdf.text("Kết quả thi", 420, 50, { align: "center" });

    docPdf.setFontSize(11);
    docPdf.text("Lớp", 300, 90);
    docPdf.text(safeText(exam.tenLop || "—"), 420, 90);

    docPdf.text("Giáo viên:", 300, 115);
    docPdf.text(safeText(exam.tenGiaoVien || "—"), 420, 115);

    docPdf.text("Đề Thi:", 300, 140);
    docPdf.text(safeText(exam.tenDe || "—"), 420, 140);

    // ===== Bảng điểm =====
    autoTable(docPdf, {
      startY: 220,
      head: [
        [
          "STT",
          "Tên học viên",
          "Khớp Từ",
          "Nghe",
          "Đọc",
          "Sắp Xếp",
          "Tổng số câu đúng (%)",
          "Tổng điểm",
        ],
      ],
      body: attempts.map((a, idx) => [
        idx + 1,
        a.studentName,
        a.khopTu,
        a.nghe,
        a.doc,
        a.sapXep,
        `${a.percent}%`,
        a.tong,
      ]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.5,
      theme: "grid",
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 220 },
        2: { cellWidth: 80, halign: "center" },
        3: { cellWidth: 80, halign: "center" },
        4: { cellWidth: 80, halign: "center" },
        5: { cellWidth: 90, halign: "center" },
        6: { cellWidth: 160, halign: "center" },
        7: { cellWidth: 80, halign: "center" },
      },
    });

    docPdf.save(`ket-qua-${exam.tenDe || exam.deThiId}.pdf`);
  };

  // ===== Chart colors =====
  const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  return (
    <ContentLayoutWrapper heading="Tổng quan">
      {/* ===== TOP GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ===== Tổng quan lớp học ===== */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Tổng quan lớp học
                </h3>
                <p className="text-sm text-slate-500">Thống kê các lớp đang dạy</p>
              </div>

              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
                {err}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-3xl font-bold text-blue-600" id="class-count">
                  {loading ? "…" : classCount}
                </div>
                <div className="text-sm text-slate-500">Lớp đang dạy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600" id="student-count">
                  {loading ? "…" : totalStudents}
                </div>
                <div className="text-sm text-slate-500">Tổng học viên</div>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              *Chỉ tính lớp có <span className="font-mono">IDGiaoVien</span> = tài khoản hiện tại.
            </div>
          </div>
        </div>

        {/* ===== Quản lý lớp ===== */}
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Quản lý lớp học</h3>
              <p className="text-sm text-slate-500">Danh sách các lớp đang giảng dạy</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Đang tải danh sách lớp...
            </div>
          ) : myClasses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Chưa có lớp nào thuộc giáo viên hiện tại.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Tên lớp</th>
                    <th className="px-4 py-3 text-left">Số học viên</th>
                    <th className="px-4 py-3 text-left">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {myClasses.map((c) => (
                    <tr
                      key={c.IDLopHoc}
                      className="odd:bg-white even:bg-slate-50 border-t border-slate-200"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{c.TenLopHoc}</div>
                        <div className="text-xs text-slate-500">
                          ID: <span className="font-mono">{c.IDLopHoc}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {c.so_hoc_vien} học viên
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            to={"/teacher/class"}
                            className="block px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Chi tiết
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 text-xs text-slate-500">
            *Các thống kê nâng cao cần API khác, hiện đang lấy từ /ket-qua/ để vẽ biểu đồ.
          </div>
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Pie */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Phân loại kết quả</div>
              <div className="text-sm text-slate-500">
                Theo % đúng: &lt;50, 50–64, 65–79, ≥80
              </div>
            </div>
          </div>

          {loadingResults ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Đang tải biểu đồ...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Chưa có dữ liệu.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={levelPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
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

        {/* Bar */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="mb-2">
            <div className="text-lg font-extrabold text-slate-900">% đúng trung bình theo đề</div>
            <div className="text-sm text-slate-500">Trục X hiển thị tên đề (có label)</div>
          </div>

          {loadingResults ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Đang tải biểu đồ...
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
                  <XAxis dataKey="tenDe" interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgPercent" name="% đúng TB" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Stacked */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="mb-2">
            <div className="text-lg font-extrabold text-slate-900">Số câu đúng theo phần (theo đề)</div>
            <div className="text-sm text-slate-500">GhepTu / Đọc / Nghe = số câu đúng (stack)</div>
          </div>

          {loadingResults ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Đang tải biểu đồ...
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
                  <XAxis dataKey="tenDe" interval={0} angle={-15} textAnchor="end" height={70} />
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

      {/* ===== NEW: BẢNG KẾT QUẢ ĐỀ THI + EXPORT PDF THEO DÒNG ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Bảng kết quả đề thi</div>
            <div className="text-sm text-slate-500">
              Mỗi dòng = 1 đề · Hiển thị lớp, giáo viên, 5 học viên · Xuất PDF theo mẫu
            </div>
          </div>
        </div>

        {errResults ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
            {errResults}
          </div>
        ) : null}

        {loadingResults ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
            Đang tải dữ liệu...
          </div>
        ) : examTableRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
            Chưa có đề thi nào có kết quả thuộc giáo viên hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Tên đề thi</th>
                  <th className="px-4 py-3 text-left">Lớp</th>
                  <th className="px-4 py-3 text-left">Giáo viên</th>
                  <th className="px-4 py-3 text-left">Học viên làm đề</th>
                  <th className="px-4 py-3 text-right">Lượt làm</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>

              <tbody>
                {examTableRows.map((ex) => (
                  <tr
                    key={ex.deThiId}
                    className="odd:bg-white even:bg-slate-50 border-t border-slate-200"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{ex.tenDe}</div>
                      <div className="text-xs text-slate-500">
                        ID: <span className="font-mono">{ex.deThiId}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">{ex.tenLop}</td>
                    <td className="px-4 py-3">{ex.tenGiaoVien}</td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {ex.topStudents.length === 0 ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          ex.topStudents.map((s, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                              <span className="truncate max-w-[320px] font-medium text-slate-900">
                                {i + 1}. {s.name}
                              </span>
                              <span className="text-xs text-slate-600 whitespace-nowrap">
                                {s.tong} điểm · {s.percent}%
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">{ex.attempts}</td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => exportExamPdf(ex)}
                        className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                      >
                        Xuất PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ContentLayoutWrapper>
  );
}


// import React, { useEffect, useMemo, useState } from "react";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// import { http } from "utils/libs/https";
// import { useAuth } from "hooks/useAuth";
// import { Link } from "react-router";

// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";

// import {
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   Tooltip,
//   Legend,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
// } from "recharts";

// // ===== TYPES =====
// type PaginatedRes<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// type ClassItem = {
//   IDLopHoc: string;
//   TenLopHoc: string;
//   MoTa?: string;
//   IDGiaoVien: string;
//   so_hoc_vien: number;
// };

// type ResultItem = {
//   KetQuaID: string;
//   DiemSo: number;
//   DeThiID: string;
//   DeThiID_detail?: {
//     IDDeThi: string;
//     TenDeThi: string;
//     IDGiaoVien: string;
//   };
//   HocVienID?: string;
//   HocVienID_detail?: {
//     TaiKhoan_detail?: {
//       HoTen?: string;
//       Email?: string;
//     };
//   };
//   chi_tiet?: Array<{
//     LaDung?: boolean;
//     CauHoiID_detail?: {
//       LoaiCauHoi?: string; // khoptu | tracnghiem | nghe | sapxeptu | tuluan ...
//     };
//   }>;
// };

// type Row = {
//   stt: number;
//   name: string;
//   tenDe: string;

//   // ✅ “điểm phần” = số câu đúng của phần đó
//   ghepTu: number;
//   doc: number;
//   nghe: number;

//   // ✅ tổng điểm backend
//   tong: number;

//   // ✅ đúng/tổng
//   dung: number;
//   tongCau: number;
//   percent: number; // % đúng
// };

// type ExamAgg = {
//   deThiId: string;
//   tenDe: string;
//   attempts: number;
//   totalCorrect: number;
//   totalQuestions: number;
//   avgPercent: number;

//   ghepTuCorrect: number;
//   docCorrect: number;
//   ngheCorrect: number;
// };

// // ===== HELPERS =====
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

// function getNextPage(next: string | null): number | null {
//   if (!next) return null;
//   try {
//     const u = new URL(next);
//     const p = u.searchParams.get("page");
//     return p ? Number(p) : null;
//   } catch {
//     const m = next.match(/page=(\d+)/);
//     return m ? Number(m[1]) : null;
//   }
// }

// async function fetchAllClasses(): Promise<ClassItem[]> {
//   let page = 1;
//   const acc: ClassItem[] = [];

//   for (let guard = 0; guard < 200; guard++) {
//     const res = await http.get<PaginatedRes<ClassItem>>(
//       `/api/classes/lop-hoc/?page=${page}`
//     );
//     acc.push(...(res.data?.results || []));

//     const nextPage = getNextPage(res.data?.next || null);
//     if (!nextPage) break;
//     page = nextPage;
//   }

//   return acc;
// }

// async function fetchAllResults(): Promise<ResultItem[]> {
//   let page = 1;
//   const acc: ResultItem[] = [];

//   for (let guard = 0; guard < 300; guard++) {
//     const res = await http.get<PaginatedRes<ResultItem>>(
//       `/api/results/ket-qua/?page=${page}`
//     );
//     acc.push(...(res.data?.results || []));

//     const nextPage = getNextPage(res.data?.next || null);
//     if (!nextPage) break;
//     page = nextPage;
//   }

//   return acc;
// }

// // Mapping loại câu hỏi -> bucket
// function getBucket(loai?: string): "GhepTu" | "Doc" | "Nghe" | "Other" {
//   switch (loai) {
//     case "khoptu":
//       return "GhepTu";
//     case "nghe":
//       return "Nghe";
//     case "tracnghiem":
//     case "sapxeptu":
//       return "Doc";
//     default:
//       return "Other"; // tuluan, ...
//   }
// }

// function toPercent(correct: number, total: number) {
//   if (!total) return 0;
//   return Math.round((correct / total) * 1000) / 10; // 1 decimal
// }

// // ✅ phân loại theo % đúng
// type LevelKey = "< TB" | "TB" | "Khá" | "Giỏi";
// function classifyLevel(percent: number): LevelKey {
//   if (percent < 50) return "< TB";
//   if (percent < 65) return "TB";
//   if (percent < 80) return "Khá";
//   return "Giỏi";
// }

// export default function Dashboard() {
//   const { user, accessToken } = useAuth();

//   // ===== Classes state =====
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState<string | null>(null);
//   const [classes, setClasses] = useState<ClassItem[]>([]);

//   // ===== Results state =====
//   const [loadingResults, setLoadingResults] = useState(false);
//   const [errResults, setErrResults] = useState<string | null>(null);
//   const [results, setResults] = useState<ResultItem[]>([]);

//   // ✅ load classes
//   useEffect(() => {
//     let mounted = true;
//     if (!accessToken || !user?.IDTaiKhoan) return;

//     (async () => {
//       setLoading(true);
//       setErr(null);
//       try {
//         const all = await fetchAllClasses();
//         if (!mounted) return;
//         setClasses(all);
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
//   }, [accessToken, user?.IDTaiKhoan]);

//   // ✅ load results
//   useEffect(() => {
//     let mounted = true;
//     if (!accessToken || !user?.IDTaiKhoan) return;

//     (async () => {
//       setLoadingResults(true);
//       setErrResults(null);
//       try {
//         const all = await fetchAllResults();
//         if (!mounted) return;
//         setResults(all);
//       } catch (e: any) {
//         if (!mounted) return;
//         setErrResults(normalizeError(e));
//       } finally {
//         if (!mounted) return;
//         setLoadingResults(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, [accessToken, user?.IDTaiKhoan]);

//   // ✅ only classes of current teacher
//   const myClasses = useMemo(() => {
//     const myId = user?.IDTaiKhoan;
//     return classes.filter((c) => c.IDGiaoVien === myId);
//   }, [classes, user?.IDTaiKhoan]);

//   const classCount = myClasses.length;

//   const totalStudents = useMemo(() => {
//     return myClasses.reduce((sum, c) => sum + (c.so_hoc_vien || 0), 0);
//   }, [myClasses]);

//   // ✅ chỉ lấy kết quả thuộc đề thi của teacher hiện tại
//   const myResults = useMemo(() => {
//     const myId = user?.IDTaiKhoan;
//     if (!myId) return [];
//     return (results || []).filter((r) => r?.DeThiID_detail?.IDGiaoVien === myId);
//   }, [results, user?.IDTaiKhoan]);

//   // ✅ build rows table (mỗi lượt thi = 1 dòng)
//   const rows: Row[] = useMemo(() => {
//     const built = myResults.map((r, idx) => {
//       const studentName =
//         r?.HocVienID_detail?.TaiKhoan_detail?.HoTen ||
//         r?.HocVienID_detail?.TaiKhoan_detail?.Email ||
//         r?.HocVienID ||
//         "—";

//       const tenDe = r?.DeThiID_detail?.TenDeThi || r?.DeThiID || "—";

//       let ghepTu = 0;
//       let doc = 0;
//       let nghe = 0;

//       let dung = 0;
//       let tongCau = 0;

//       for (const ct of r?.chi_tiet || []) {
//         const loai = ct?.CauHoiID_detail?.LoaiCauHoi;
//         const b = getBucket(loai);

//         tongCau += 1;
//         if (ct?.LaDung) {
//           dung += 1;

//           // ✅ điểm phần = số câu đúng theo bucket
//           if (b === "GhepTu") ghepTu += 1;
//           if (b === "Doc") doc += 1;
//           if (b === "Nghe") nghe += 1;
//         }
//       }

//       const percent = toPercent(dung, tongCau);

//       return {
//         stt: idx + 1,
//         name: studentName,
//         tenDe,
//         ghepTu,
//         doc,
//         nghe,
//         tong: Number(r?.DiemSo) || 0,
//         dung,
//         tongCau,
//         percent,
//       };
//     });

//     // sort theo tổng điểm giảm dần
//     built.sort((a, b) => b.tong - a.tong);
//     return built.map((x, i) => ({ ...x, stt: i + 1 }));
//   }, [myResults]);

//   // ✅ aggregate theo đề thi (cho biểu đồ)
//   const examAgg: ExamAgg[] = useMemo(() => {
//     const mp = new Map<string, ExamAgg>();

//     for (const r of rows) {
//       // tìm DeThiID từ myResults theo TenDe + index thì không ổn.
//       // => dùng lại data gốc:
//       // cách chắc chắn: duyệt myResults song song
//     }

//     // ✅ duyệt myResults để lấy DeThiID thật + tính đúng/tổng
//     for (const r of myResults) {
//       const deThiId = r?.DeThiID || "—";
//       const tenDe = r?.DeThiID_detail?.TenDeThi || r?.DeThiID || "—";

//       let totalQuestions = 0;
//       let totalCorrect = 0;

//       let ghepTuCorrect = 0;
//       let docCorrect = 0;
//       let ngheCorrect = 0;

//       for (const ct of r?.chi_tiet || []) {
//         const loai = ct?.CauHoiID_detail?.LoaiCauHoi;
//         const b = getBucket(loai);

//         totalQuestions += 1;
//         if (ct?.LaDung) {
//           totalCorrect += 1;
//           if (b === "GhepTu") ghepTuCorrect += 1;
//           if (b === "Doc") docCorrect += 1;
//           if (b === "Nghe") ngheCorrect += 1;
//         }
//       }

//       const cur =
//         mp.get(deThiId) ||
//         ({
//           deThiId,
//           tenDe,
//           attempts: 0,
//           totalCorrect: 0,
//           totalQuestions: 0,
//           avgPercent: 0,
//           ghepTuCorrect: 0,
//           docCorrect: 0,
//           ngheCorrect: 0,
//         } as ExamAgg);

//       cur.attempts += 1;
//       cur.totalCorrect += totalCorrect;
//       cur.totalQuestions += totalQuestions;

//       cur.ghepTuCorrect += ghepTuCorrect;
//       cur.docCorrect += docCorrect;
//       cur.ngheCorrect += ngheCorrect;

//       mp.set(deThiId, cur);
//     }

//     const arr = Array.from(mp.values()).map((x) => ({
//       ...x,
//       avgPercent: toPercent(x.totalCorrect, x.totalQuestions),
//     }));

//     // sort theo avgPercent giảm dần
//     arr.sort((a, b) => b.avgPercent - a.avgPercent);
//     return arr;
//   }, [myResults]);

//   // ✅ pie data: phân loại theo % đúng của từng lượt thi
//   const levelPieData = useMemo(() => {
//     const counts: Record<LevelKey, number> = {
//       "< TB": 0,
//       TB: 0,
//       Khá: 0,
//       Giỏi: 0,
//     };

//     for (const r of rows) {
//       counts[classifyLevel(r.percent)] += 1;
//     }

//     return (Object.keys(counts) as LevelKey[]).map((k) => ({
//       name: k,
//       value: counts[k],
//     }));
//   }, [rows]);

//   // ===== EXPORT PDF =====
//   const exportPdf = () => {
//     const doc = new jsPDF({
//       orientation: "landscape",
//       unit: "pt",
//       format: "a4",
//     });

//     doc.setFontSize(14);
//     doc.text("BẢNG KẾT QUẢ BÀI THI (TEACHER)", 40, 40);

//     doc.setFontSize(10);
//     doc.text(`Tổng dòng: ${rows.length}`, 40, 58);

//     autoTable(doc, {
//       startY: 75,
//       head: [["STT", "Name", "Tên đề", "GhepTu", "Đọc", "Nghe", "Đúng/Tổng", "Tổng"]],
//       body: rows.map((r) => [
//         r.stt,
//         r.name,
//         r.tenDe,
//         r.ghepTu,
//         r.doc,
//         r.nghe,
//         `${r.dung}/${r.tongCau} (${r.percent}%)`,
//         r.tong,
//       ]),
//       styles: {
//         fontSize: 9,
//         cellPadding: 6,
//         overflow: "linebreak",
//       },
//       headStyles: {
//         fillColor: [15, 23, 42], // slate-900
//         textColor: 255,
//         fontStyle: "bold",
//       },
//       columnStyles: {
//         0: { cellWidth: 45 },
//         1: { cellWidth: 160 },
//         2: { cellWidth: 260 },
//         3: { cellWidth: 70, halign: "right" },
//         4: { cellWidth: 70, halign: "right" },
//         5: { cellWidth: 70, halign: "right" },
//         6: { cellWidth: 140 },
//         7: { cellWidth: 70, halign: "right" },
//       },
//     });

//     doc.save("ket-qua-bai-thi.pdf");
//   };

//   // ===== Chart colors (màu rõ ràng để phân biệt phần) =====
//   const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"]; // đỏ, vàng, xanh, xanh lá

//   return (
//     <ContentLayoutWrapper heading="Tổng quan">
//       {/* ===== TOP GRID ===== */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         {/* ===== Tổng quan lớp học ===== */}
//         <div>
//           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="flex items-start justify-between mb-5">
//               <div>
//                 <h3 className="text-lg font-bold text-slate-800 mb-2">
//                   Tổng quan lớp học
//                 </h3>
//                 <p className="text-sm text-slate-500">Thống kê các lớp đang dạy</p>
//               </div>

//               <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//                 <svg
//                   width="24"
//                   height="24"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                   <path
//                     d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                   <path
//                     d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                   <path
//                     d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </div>
//             </div>

//             {err && (
//               <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
//                 {err}
//               </div>
//             )}

//             <div className="grid grid-cols-2 gap-4 mb-6">
//               <div>
//                 <div className="text-3xl font-bold text-blue-600" id="class-count">
//                   {loading ? "…" : classCount}
//                 </div>
//                 <div className="text-sm text-slate-500">Lớp đang dạy</div>
//               </div>
//               <div>
//                 <div className="text-3xl font-bold text-blue-600" id="student-count">
//                   {loading ? "…" : totalStudents}
//                 </div>
//                 <div className="text-sm text-slate-500">Tổng học viên</div>
//               </div>
//             </div>

//             <div className="text-xs text-slate-500">
//               *Chỉ tính lớp có <span className="font-mono">IDGiaoVien</span> = tài khoản hiện tại.
//             </div>
//           </div>
//         </div>

//         {/* ===== Quản lý lớp ===== */}
//         <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
//           <div className="flex items-center justify-between mb-5">
//             <div>
//               <h3 className="text-xl font-bold text-slate-800 mb-1">Quản lý lớp học</h3>
//               <p className="text-sm text-slate-500">Danh sách các lớp đang giảng dạy</p>
//             </div>
//           </div>

//           {loading ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Đang tải danh sách lớp...
//             </div>
//           ) : myClasses.length === 0 ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Chưa có lớp nào thuộc giáo viên hiện tại.
//             </div>
//           ) : (
//             <div className="overflow-x-auto rounded-xl border border-slate-200">
//               <table className="min-w-full text-sm">
//                 <thead className="bg-slate-100 text-slate-700 font-semibold">
//                   <tr>
//                     <th className="px-4 py-3 text-left">Tên lớp</th>
//                     <th className="px-4 py-3 text-left">Số học viên</th>
//                     <th className="px-4 py-3 text-left">Hành động</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {myClasses.map((c) => (
//                     <tr
//                       key={c.IDLopHoc}
//                       className="odd:bg-white even:bg-slate-50 border-t border-slate-200"
//                     >
//                       <td className="px-4 py-3">
//                         <div className="font-semibold text-slate-800">{c.TenLopHoc}</div>
//                         <div className="text-xs text-slate-500">
//                           ID: <span className="font-mono">{c.IDLopHoc}</span>
//                         </div>
//                       </td>

//                       <td className="px-4 py-3 font-medium text-slate-800">
//                         {c.so_hoc_vien} học viên
//                       </td>

//                       <td className="px-4 py-3">
//                         <div className="flex gap-2">
//                           <Link
//                             to={"/teacher/class"}
//                             className="block px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100"
//                           >
//                             Chi tiết
//                           </Link>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           <div className="mt-3 text-xs text-slate-500">
//             *Các thống kê nâng cao cần API khác, hiện đang lấy từ /ket-qua/ để vẽ biểu đồ.
//           </div>
//         </div>
//       </div>

//       {/* ===== CHARTS ===== */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         {/* Pie: phân loại điểm */}
//         <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex items-start justify-between mb-2">
//             <div>
//               <div className="text-lg font-extrabold text-slate-900">
//                 Phân loại kết quả
//               </div>
//               <div className="text-sm text-slate-500">
//                 Theo % đúng: &lt;50, 50–64, 65–79, ≥80
//               </div>
//             </div>
//           </div>

//           {loadingResults ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Đang tải biểu đồ...
//             </div>
//           ) : rows.length === 0 ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Chưa có dữ liệu.
//             </div>
//           ) : (
//             <div className="h-72">
//               <ResponsiveContainer>
//                 <PieChart>
//                   <Pie
//                     data={levelPieData}
//                     dataKey="value"
//                     nameKey="name"
//                     outerRadius={90}
//                     label
//                   >
//                     {levelPieData.map((_, i) => (
//                       <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
//                     ))}
//                   </Pie>
//                   <Tooltip />
//                   <Legend />
//                 </PieChart>
//               </ResponsiveContainer>
//             </div>
//           )}
//         </div>

//         {/* Bar: % đúng trung bình theo đề */}
//         <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="mb-2">
//             <div className="text-lg font-extrabold text-slate-900">
//               % đúng trung bình theo đề
//             </div>
//             <div className="text-sm text-slate-500">
//               Trục X hiển thị tên đề (có label)
//             </div>
//           </div>

//           {loadingResults ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Đang tải biểu đồ...
//             </div>
//           ) : examAgg.length === 0 ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Chưa có dữ liệu.
//             </div>
//           ) : (
//             <div className="h-80">
//               <ResponsiveContainer>
//                 <BarChart data={examAgg}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="tenDe"
//                     interval={0}
//                     angle={-15}
//                     textAnchor="end"
//                     height={70}
//                   />
//                   <YAxis domain={[0, 100]} />
//                   <Tooltip />
//                   <Legend />
//                   <Bar dataKey="avgPercent" name="% đúng TB" fill="#3b82f6" />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           )}
//         </div>

//         {/* Stacked bar: đúng theo phần */}
//         <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="mb-2">
//             <div className="text-lg font-extrabold text-slate-900">
//               Số câu đúng theo phần (theo đề)
//             </div>
//             <div className="text-sm text-slate-500">
//               GhepTu / Đọc / Nghe = số câu đúng (stack)
//             </div>
//           </div>

//           {loadingResults ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Đang tải biểu đồ...
//             </div>
//           ) : examAgg.length === 0 ? (
//             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//               Chưa có dữ liệu.
//             </div>
//           ) : (
//             <div className="h-80">
//               <ResponsiveContainer>
//                 <BarChart data={examAgg}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis
//                     dataKey="tenDe"
//                     interval={0}
//                     angle={-15}
//                     textAnchor="end"
//                     height={70}
//                   />
//                   <YAxis />
//                   <Tooltip />
//                   <Legend />
//                   <Bar dataKey="ghepTuCorrect" name="GhepTu (đúng)" stackId="a" fill="#f59e0b" />
//                   <Bar dataKey="docCorrect" name="Đọc (đúng)" stackId="a" fill="#3b82f6" />
//                   <Bar dataKey="ngheCorrect" name="Nghe (đúng)" stackId="a" fill="#22c55e" />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ===== BẢNG KẾT QUẢ + EXPORT PDF ===== */}
//       <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//         <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
//           <div>
//             <div className="text-lg font-extrabold text-slate-900">
//               Bảng kết quả bài thi
//             </div>
//             <div className="text-sm text-slate-500">
//               GhepTu | Đọc | Nghe = số câu đúng · Thêm cột Đúng/Tổng
//             </div>
//           </div>

//           <button
//             type="button"
//             onClick={exportPdf}
//             disabled={loadingResults || rows.length === 0}
//             className={[
//               "h-10 rounded-xl px-4 font-semibold text-white",
//               loadingResults || rows.length === 0
//                 ? "bg-slate-400 cursor-not-allowed"
//                 : "bg-violet-600 hover:bg-violet-700",
//             ].join(" ")}
//           >
//             Xuất PDF
//           </button>
//         </div>

//         {errResults ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
//             {errResults}
//           </div>
//         ) : null}

//         {loadingResults ? (
//           <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//             Đang tải dữ liệu...
//           </div>
//         ) : rows.length === 0 ? (
//           <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
//             Chưa có kết quả thuộc đề thi của giáo viên hiện tại.
//           </div>
//         ) : (
//           <div className="overflow-x-auto rounded-xl border border-slate-200">
//             <table className="min-w-full text-sm">
//               <thead className="bg-slate-100 text-slate-700 font-semibold">
//                 <tr>
//                   <th className="px-4 py-3 text-left">STT</th>
//                   <th className="px-4 py-3 text-left">Name</th>
//                   <th className="px-4 py-3 text-left">Tên đề</th>
//                   <th className="px-4 py-3 text-right">GhepTu</th>
//                   <th className="px-4 py-3 text-right">Đọc</th>
//                   <th className="px-4 py-3 text-right">Nghe</th>
//                   <th className="px-4 py-3 text-right">Đúng/Tổng</th>
//                   <th className="px-4 py-3 text-right">Tổng</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {rows.map((r) => (
//                   <tr
//                     key={`${r.stt}-${r.name}-${r.tenDe}`}
//                     className="odd:bg-white even:bg-slate-50 border-t border-slate-200"
//                   >
//                     <td className="px-4 py-3">{r.stt}</td>

//                     <td className="px-4 py-3">
//                       <div className="font-semibold text-slate-900 truncate max-w-[240px]">
//                         {r.name}
//                       </div>
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="font-semibold text-slate-900 truncate max-w-[420px]">
//                         {r.tenDe}
//                       </div>
//                     </td>

//                     <td className="px-4 py-3 text-right font-semibold">{r.ghepTu}</td>
//                     <td className="px-4 py-3 text-right font-semibold">{r.doc}</td>
//                     <td className="px-4 py-3 text-right font-semibold">{r.nghe}</td>

//                     <td className="px-4 py-3 text-right font-semibold text-slate-900">
//                       {r.dung}/{r.tongCau} ({r.percent}%)
//                     </td>

//                     <td className="px-4 py-3 text-right font-extrabold text-violet-700">
//                       {r.tong}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* <div className="mt-3 text-xs text-slate-500">
//           * GhepTu = khoptu, Đọc = tracnghiem + sapxeptu, Nghe = nghe. Tổng = DiemSo từ backend.
//         </div> */}
//       </div>
//     </ContentLayoutWrapper>
//   );
// }

// // import React, { useEffect, useMemo, useState } from "react";
// // import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// // import { cn } from "utils/helpers/class-name";
// // import { http } from "utils/libs/https";
// // import { useAuth } from "hooks/useAuth";
// // import { Link } from "react-router";

// // // ===== TYPES =====
// // type PaginatedRes<T> = {
// //   count: number;
// //   next: string | null;
// //   previous: string | null;
// //   results: T[];
// // };

// // type ClassItem = {
// //   IDLopHoc: string;
// //   TenLopHoc: string;
// //   MoTa?: string;
// //   IDGiaoVien: string;
// //   so_hoc_vien: number;
// //   // hoc_vien?: any[]; // có, nhưng không cần dùng vì có so_hoc_vien
// // };

// // function normalizeError(err: any): string {
// //   const data = err?.response?.data;
// //   if (data?.detail) return data.detail;
// //   if (typeof data === "string") return data;
// //   if (data && typeof data === "object") {
// //     return Object.entries(data)
// //       .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
// //       .join("\n");
// //   }
// //   return err?.message || "Có lỗi xảy ra.";
// // }

// // // ✅ lấy page param từ next url
// // function getNextPage(next: string | null): number | null {
// //   if (!next) return null;
// //   try {
// //     const u = new URL(next);
// //     const p = u.searchParams.get("page");
// //     return p ? Number(p) : null;
// //   } catch {
// //     // nếu next không phải absolute url (hiếm)
// //     const m = next.match(/page=(\d+)/);
// //     return m ? Number(m[1]) : null;
// //   }
// // }

// // // ✅ fetch all pages
// // async function fetchAllClasses(): Promise<ClassItem[]> {
// //   let page = 1;
// //   const acc: ClassItem[] = [];

// //   // chống loop vô hạn
// //   for (let guard = 0; guard < 200; guard++) {
// //     const res = await http.get<PaginatedRes<ClassItem>>(
// //       `/api/classes/lop-hoc/?page=${page}`
// //     );

// //     acc.push(...(res.data?.results || []));

// //     const nextPage = getNextPage(res.data?.next || null);
// //     if (!nextPage) break;
// //     page = nextPage;
// //   }

// //   return acc;
// // }

// // export default function Dashboard() {
// //   const { user, accessToken } = useAuth();

// //   const [loading, setLoading] = useState(false);
// //   const [err, setErr] = useState<string | null>(null);
// //   const [classes, setClasses] = useState<ClassItem[]>([]);

// //   // ✅ load classes
// //   useEffect(() => {
// //     let mounted = true;

// //     if (!accessToken || !user?.IDTaiKhoan) return;

// //     (async () => {
// //       setLoading(true);
// //       setErr(null);
// //       try {
// //         // Nếu http chưa auto attach token, sếp dùng cách này:
// //         // const res = await http.get("/api/classes/lop-hoc/", { headers: { Authorization: `Bearer ${accessToken}` }});

// //         const all = await fetchAllClasses();
// //         if (!mounted) return;
// //         setClasses(all);
// //       } catch (e: any) {
// //         if (!mounted) return;
// //         setErr(normalizeError(e));
// //       } finally {
// //         if (!mounted) return;
// //         setLoading(false);
// //       }
// //     })();

// //     return () => {
// //       mounted = false;
// //     };
// //   }, [accessToken, user?.IDTaiKhoan]);

// //   // ✅ chỉ lấy lớp mà GV hiện tại đang dạy
// //   const myClasses = useMemo(() => {
// //     const myId = user?.IDTaiKhoan;
// //     return classes.filter((c) => c.IDGiaoVien === myId);
// //   }, [classes, user?.IDTaiKhoan]);

// //   const classCount = myClasses.length;

// //   const totalStudents = useMemo(() => {
// //     return myClasses.reduce((sum, c) => sum + (c.so_hoc_vien || 0), 0);
// //   }, [myClasses]);

// //   return (
// //     <ContentLayoutWrapper heading="Tổng quan">
// //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
// //         {/* ===== Tổng quan lớp học ===== */}
// //         <div>
// //           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
// //             <div className="flex items-start justify-between mb-5">
// //               <div>
// //                 <h3 className="text-lg font-bold text-slate-800 mb-2">
// //                   Tổng quan lớp học
// //                 </h3>
// //                 <p className="text-sm text-slate-500">
// //                   Thống kê các lớp đang dạy
// //                 </p>
// //               </div>

// //               <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
// //                 {/* USERS SVG */}
// //                 <svg
// //                   width="24"
// //                   height="24"
// //                   viewBox="0 0 24 24"
// //                   fill="none"
// //                   xmlns="http://www.w3.org/2000/svg"
// //                 >
// //                   <path
// //                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
// //                     stroke="#2563EB"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                   />
// //                   <path
// //                     d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
// //                     stroke="#2563EB"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                   />
// //                   <path
// //                     d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
// //                     stroke="#2563EB"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                   />
// //                   <path
// //                     d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
// //                     stroke="#2563EB"
// //                     strokeWidth="2"
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                   />
// //                 </svg>
// //               </div>
// //             </div>

// //             {err && (
// //               <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
// //                 {err}
// //               </div>
// //             )}

// //             <div className="grid grid-cols-2 gap-4 mb-6">
// //               <div>
// //                 <div className="text-3xl font-bold text-blue-600" id="class-count">
// //                   {loading ? "…" : classCount}
// //                 </div>
// //                 <div className="text-sm text-slate-500">Lớp đang dạy</div>
// //               </div>
// //               <div>
// //                 <div className="text-3xl font-bold text-blue-600" id="student-count">
// //                   {loading ? "…" : totalStudents}
// //                 </div>
// //                 <div className="text-sm text-slate-500">Tổng học viên</div>
// //               </div>
// //             </div>

// //             <div className="text-xs text-slate-500">
// //               *Chỉ tính lớp có <span className="font-mono">IDGiaoVien</span> =
// //               tài khoản hiện tại.
// //             </div>
// //           </div>
// //         </div>

// //         {/* ===== BẢNG QUẢN LÝ LỚP HỌC ===== */}
// //         <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
// //           <div className="flex items-center justify-between mb-5">
// //             <div>
// //               <h3 className="text-xl font-bold text-slate-800 mb-1">
// //                 Quản lý lớp học
// //               </h3>
// //               <p className="text-sm text-slate-500">
// //                 Danh sách các lớp đang giảng dạy
// //               </p>
// //             </div>
// //           </div>

// //           {loading ? (
// //             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
// //               Đang tải danh sách lớp...
// //             </div>
// //           ) : myClasses.length === 0 ? (
// //             <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
// //               Chưa có lớp nào thuộc giáo viên hiện tại.
// //             </div>
// //           ) : (
// //             <div className="overflow-x-auto rounded-xl border border-slate-200">
// //               <table className="min-w-full text-sm">
// //                 <thead className="bg-slate-100 text-slate-700 font-semibold">
// //                   <tr>
// //                     <th className="px-4 py-3 text-left">Tên lớp</th>
// //                     <th className="px-4 py-3 text-left">Số học viên</th>
// //                     <th className="px-4 py-3 text-left">Hành động</th>
// //                   </tr>
// //                 </thead>

// //                 <tbody>
// //                   {myClasses.map((c) => {
// //                     // ✅ hiện tại API classes chưa có avg/progress/status,
// //                     // nên để placeholder “—” để không bịa dữ liệu
// //                     return (
// //                       <tr
// //                         key={c.IDLopHoc}
// //                         className="odd:bg-white even:bg-slate-100 border-t border-slate-200"
// //                       >
// //                         <td className="px-4 py-3">
// //                           <div className="font-semibold text-slate-800">
// //                             {c.TenLopHoc}
// //                           </div>
// //                           <div className="text-xs text-slate-500">
// //                             ID: <span className="font-mono">{c.IDLopHoc}</span>
// //                           </div>
// //                         </td>

// //                         <td className="px-4 py-3 font-medium text-slate-800">
// //                           {c.so_hoc_vien} học viên
// //                         </td>
// //                         <td className="px-4 py-3">
// //                           <div className="flex gap-2">
                           
// //                             <Link to={'/teacher/class'} className="block px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100">
// //                               Chi tiết
// //                             </Link>
// //                           </div>
// //                         </td>
// //                       </tr>
// //                     );
// //                   })}
// //                 </tbody>
// //               </table>
// //             </div>
// //           )}

// //           {/* hint nhỏ */}
// //           <div className="mt-3 text-xs text-slate-500">
// //             *Điểm TB / Tiến độ / Trạng thái: cần thêm API khác (vd: thống kê điểm
// //             theo lớp, tiến độ bài học). Hiện tạm hiển thị “—”.
// //           </div>
// //         </div>
// //       </div>
// //     </ContentLayoutWrapper>
// //   );
// // }

// // //-------------------------------------------------------
// // // import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// // // import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

// // // export default function Dashboard() {
// // //   return (
// // //     <ContentLayoutWrapper heading="Tổng quan">
// // //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
// // //         {/* ===== Tổng quan lớp học ===== */}
// // //         <div>
// // //           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
// // //             <div className="flex items-start justify-between mb-5">
// // //               <div>
// // //                 <h3 className="text-lg font-bold text-slate-800 mb-2">
// // //                   Tổng quan lớp học
// // //                 </h3>
// // //                 <p className="text-sm text-slate-500">
// // //                   Thống kê các lớp đang dạy
// // //                 </p>
// // //               </div>

// // //               <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
// // //                 {/* USERS SVG */}
// // //                 <svg
// // //                   width="24"
// // //                   height="24"
// // //                   viewBox="0 0 24 24"
// // //                   fill="none"
// // //                   xmlns="http://www.w3.org/2000/svg"
// // //                 >
// // //                   <path
// // //                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
// // //                     stroke="#2563EB"
// // //                     strokeWidth="2"
// // //                     strokeLinecap="round"
// // //                     strokeLinejoin="round"
// // //                   />
// // //                   <path
// // //                     d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
// // //                     stroke="#2563EB"
// // //                     strokeWidth="2"
// // //                     strokeLinecap="round"
// // //                     strokeLinejoin="round"
// // //                   />
// // //                   <path
// // //                     d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
// // //                     stroke="#2563EB"
// // //                     strokeWidth="2"
// // //                     strokeLinecap="round"
// // //                     strokeLinejoin="round"
// // //                   />
// // //                   <path
// // //                     d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
// // //                     stroke="#2563EB"
// // //                     strokeWidth="2"
// // //                     strokeLinecap="round"
// // //                     strokeLinejoin="round"
// // //                   />
// // //                 </svg>
// // //               </div>
// // //             </div>

// // //             <div className="grid grid-cols-2 gap-4 mb-6">
// // //               <div>
// // //                 <div
// // //                   className="text-3xl font-bold text-blue-600"
// // //                   id="class-count"
// // //                 >
// // //                   3
// // //                 </div>
// // //                 <div className="text-sm text-slate-500">Lớp đang dạy</div>
// // //               </div>
// // //               <div>
// // //                 <div
// // //                   className="text-3xl font-bold text-blue-600"
// // //                   id="student-count"
// // //                 >
// // //                   85
// // //                 </div>
// // //                 <div className="text-sm text-slate-500">Tổng học viên</div>
// // //               </div>
// // //             </div>

// // //             {/* <div>
// // //             <div className="text-sm font-semibold text-slate-800 mb-3">
// // //               Điểm trung bình theo lớp
// // //             </div>

// // //             <div className="h-64">
// // //               <ResponsiveContainer>
// // //                 <BarChart
// // //                   data={[
// // //                     { name: "Lớp A", score: 620 },
// // //                     { name: "Lớp B", score: 580 },
// // //                     { name: "Lớp C", score: 700 },
// // //                     { name: "Lớp D", score: 589 },
// // //                     { name: "Lớp E", score: 456 },
// // //                     { name: "Lớp F", score: 345 },
// // //                     { name: "Lớp G", score: 123 },
// // //                     { name: "Lớp H", score: 678 },
// // //                     { name: "Lớp I", score: 546 },
// // //                   ]}
// // //                 >
// // //                   <XAxis dataKey="name" />
// // //                   <Tooltip />
// // //                   <Bar dataKey="score" fill="#2563EB" radius={[6, 6, 0, 0]} />
// // //                 </BarChart>
// // //               </ResponsiveContainer>
// // //             </div>
// // //           </div> */}
// // //           </div>
// // //         </div>

// // //         {/* ===== Công việc hôm nay ===== */}
// // //         {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
// // //           <div className="flex items-start justify-between mb-5">
// // //             <div>
// // //               <h3 className="text-lg font-bold text-slate-800 mb-2">
// // //                 Công việc hôm nay
// // //               </h3>
// // //               <p className="text-sm text-slate-500">Các bài test cần chấm</p>
// // //             </div>

// // //             <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
          
// // //               <svg
// // //                 width="24"
// // //                 height="24"
// // //                 viewBox="0 0 24 24"
// // //                 fill="none"
// // //                 xmlns="http://www.w3.org/2000/svg"
// // //               >
// // //                 <path
// // //                   d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                   strokeLinejoin="round"
// // //                 />
// // //                 <path
// // //                   d="M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                   strokeLinejoin="round"
// // //                 />
// // //                 <path
// // //                   d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                   strokeLinejoin="round"
// // //                 />
// // //                 <path
// // //                   d="M12 12H15"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                 />
// // //                 <path
// // //                   d="M12 16H15"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                 />
// // //                 <path
// // //                   d="M9 12H9.01"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                 />
// // //                 <path
// // //                   d="M9 16H9.01"
// // //                   stroke="#F59E0B"
// // //                   strokeWidth="2"
// // //                   strokeLinecap="round"
// // //                 />
// // //               </svg>
// // //             </div>
// // //           </div>

// // //           <div className="bg-amber-100 rounded-lg p-4 text-center mb-6">
// // //             <div
// // //               className="text-5xl font-bold text-orange-500"
// // //               id="pending-tests"
// // //             >
// // //               4
// // //             </div>
// // //             <div className="text-sm font-medium text-amber-800">
// // //               Bài test cần chấm
// // //             </div>
// // //           </div>

// // //           <div className="flex flex-col gap-3">
// // //             {[
// // //               { name: "Nguyễn Văn A", test: "Full Test 01", avatar: "N" },
// // //               { name: "Trần Thị B", test: "Mini Test 02", avatar: "T" },
// // //               { name: "Lê Minh C", test: "Part 5 Practice", avatar: "L" },
// // //             ].map((t) => (
// // //               <div
// // //                 key={t.name}
// // //                 className="flex items-center justify-between p-3 bg-slate-100 rounded-lg"
// // //               >
// // //                 <div className="flex items-center gap-3">
// // //                   <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
// // //                     {t.avatar}
// // //                   </div>
// // //                   <div>
// // //                     <div className="font-semibold text-slate-800 text-sm">
// // //                       {t.name}
// // //                     </div>
// // //                     <div className="text-xs text-slate-500">{t.test}</div>
// // //                   </div>
// // //                 </div>
// // //                 <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-100">
// // //                   Chấm ngay
// // //                 </button>
// // //               </div>
// // //             ))}
// // //           </div>
// // //         </div> */}
// // //         <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
// // //           <div className="flex items-center justify-between mb-5">
// // //             <div>
// // //               <h3 className="text-xl font-bold text-slate-800 mb-1">
// // //                 Quản lý lớp học
// // //               </h3>
// // //               <p className="text-sm text-slate-500">
// // //                 Danh sách các lớp đang giảng dạy
// // //               </p>
// // //             </div>

// // //             {/* <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
// // //               + Tạo lớp mới
// // //             </button> */}
// // //           </div>

// // //           <div className="overflow-x-auto rounded-xl border border-slate-200">
// // //             <table className="min-w-full text-sm">
// // //               <thead className="bg-slate-100 text-slate-700 font-semibold">
// // //                 <tr>
// // //                   <th className="px-4 py-3 text-left">Tên lớp</th>
// // //                   <th className="px-4 py-3 text-left">Số học viên</th>
// // //                   <th className="px-4 py-3 text-left">Điểm TB</th>
// // //                   <th className="px-4 py-3 text-left">Tiến độ</th>
// // //                   <th className="px-4 py-3 text-left">Trạng thái</th>
// // //                   <th className="px-4 py-3 text-left">Hành động</th>
// // //                 </tr>
// // //               </thead>

// // //               <tbody>
// // //                 {[
// // //                   {
// // //                     name: "TOEIC 500+ K13",
// // //                     start: "15/01/2024",
// // //                     students: "30 học viên",
// // //                     avg: 615,
// // //                     progress: 65,
// // //                     status: "Đang học",
// // //                     statusType: "success",
// // //                   },
// // //                   {
// // //                     name: "TOEIC 700+ K4",
// // //                     start: "10/12/2023",
// // //                     students: "20 học viên",
// // //                     avg: 690,
// // //                     progress: 88,
// // //                     status: "Sắp thi",
// // //                     statusType: "warning",
// // //                   },
// // //                   {
// // //                     name: "TOEIC 600+ K8",
// // //                     start: "20/01/2024",
// // //                     students: "35 học viên",
// // //                     avg: 580,
// // //                     progress: 45,
// // //                     status: "Đang học",
// // //                     statusType: "success",
// // //                   },
// // //                 ].map((row) => (
// // //                   <tr
// // //                     key={row.name}
// // //                     className="odd:bg-white even:bg-slate-100 border-t border-slate-200"
// // //                   >
// // //                     <td className="px-4 py-3">
// // //                       <div className="font-semibold text-slate-800">
// // //                         {row.name}
// // //                       </div>
// // //                       <div className="text-xs text-slate-500">
// // //                         Khai giảng: {row.start}
// // //                       </div>
// // //                     </td>

// // //                     <td className="px-4 py-3 font-medium text-slate-800">
// // //                       {row.students}
// // //                     </td>

// // //                     <td className="px-4 py-3">
// // //                       <div className="font-semibold text-blue-600 text-base">
// // //                         {row.avg}
// // //                       </div>
// // //                     </td>

// // //                     <td className="px-4 py-3">
// // //                       <div className="w-30">
// // //                         <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
// // //                           <div
// // //                             className="h-full bg-blue-600"
// // //                             style={{ width: `${row.progress}%` }}
// // //                           />
// // //                         </div>
// // //                         <div className="text-[11px] text-slate-500 mt-1">
// // //                           {row.progress}%
// // //                         </div>
// // //                       </div>
// // //                     </td>

// // //                     <td className="px-4 py-3">
// // //                       {row.statusType === "success" ? (
// // //                         <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
// // //                           {row.status}
// // //                         </span>
// // //                       ) : (
// // //                         <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
// // //                           {row.status}
// // //                         </span>
// // //                       )}
// // //                     </td>

// // //                     <td className="px-4 py-3">
// // //                       <div className="flex gap-2">
// // //                         <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-100">
// // //                           Vào lớp
// // //                         </button>
// // //                         <button className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100">
// // //                           Chi tiết
// // //                         </button>
// // //                       </div>
// // //                     </td>
// // //                   </tr>
// // //                 ))}
// // //               </tbody>
// // //             </table>
// // //           </div>
// // //         </div>
// // //       </div>

// // //       {/* ================= CLASS MANAGEMENT TABLE ================= */}
// // //     </ContentLayoutWrapper>
// // //   );
// // // }
