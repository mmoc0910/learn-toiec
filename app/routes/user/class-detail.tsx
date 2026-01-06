import React, { useEffect, useMemo, useState } from "react";
import type { Route } from "./+types/user/class-detail"; // nếu route file riêng thì đổi lại
import { Link, useNavigate, useParams } from "react-router";
import { http } from "utils/libs/https";

type LopHocDetail = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;
  IDGiaoVien_detail?: {
    TaiKhoan_detail?: {
      IDTaiKhoan: string;
      Email: string;
      HoTen: string;
      AnhDaiDien: string | null;
      SoDienThoai?: number | string;
    };
  };
  hoc_vien: Array<{
    LopHocID: string;
    IDHocVien: string;
    IDHocVien_detail?: {
      TaiKhoan_detail?: {
        IDTaiKhoan: string;
        Email: string;
        HoTen: string;
        AnhDaiDien: string | null;
        BiVoHieuHoa?: boolean;
        is_active?: boolean;
      };
    };
  }>;
  so_hoc_vien: number;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type LichThi = {
  IDLichThi: string;
  IDDeThi: string;
  IDDeThi_detail?: {
    IDDeThi: string;
    TenDeThi: string;
    ThoiGianLamBaiThi: string; // "02:00:00"
    chi_tiet?: Array<{
      IDCauHoi_detail?: {
        IDBaiHoc?: string;
      };
    }>;
    so_cau_hoi?: number;
  };
  IDLopHoc: string;
  IDLopHoc_detail?: {
    IDLopHoc: string;
    TenLopHoc: string;
  };
  ThoiGianBatDau: string; // ISO
  ThoiGianKetThuc: string; // ISO
};

type ChuDe = {
  IDChuDe: string;
  TenChuDe: string;
  bai_hoc: Array<{
    IDBaiHoc: string;
    IDChuDe: string;
    IDChuDe_detail?: string;
    TenBaiHoc: string;
    NoiDungBaiHoc: any;
    IDCauHoi: string | null;
    cau_hoi: any[];
  }>;
  so_bai_hoc: number;
};

function getApiErrorMessage(err: any) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  const firstKey =
    data && typeof data === "object" ? Object.keys(data)[0] : null;
  if (firstKey) {
    const val = data[firstKey];
    if (Array.isArray(val)) return val[0];
    if (typeof val === "string") return val;
  }
  return "Có lỗi xảy ra.";
}

function formatDateTimeVN(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function diffStatus(now: number, startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end))
    return { label: "Không rõ", kind: "neutral" as const };

  if (now < start) return { label: "Sắp diễn ra", kind: "upcoming" as const };
  if (now >= start && now <= end)
    return { label: "Đang diễn ra", kind: "running" as const };
  return { label: "Đã kết thúc", kind: "ended" as const };
}

function badgeClass(kind: "upcoming" | "running" | "ended" | "neutral") {
  switch (kind) {
    case "upcoming":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "running":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ended":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chi tiết lớp học" },
    { name: "description", content: "Xem bài học và lịch thi của lớp" },
  ];
}

type TabKey = "overview" | "lessons" | "exams" | "students";

export default function LopHocDetailPage() {
  const { id } = useParams(); // /lop-hoc/:id
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("overview");

  const [lopHoc, setLopHoc] = useState<LopHocDetail | null>(null);
  const [lichThiAll, setLichThiAll] = useState<LichThi[]>([]);
  const [chuDeAll, setChuDeAll] = useState<ChuDe[]>([]);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!id) return;
      setLoading(true);
      setErrMsg(null);

      try {
        const [lopRes, lichRes, chuDeRes] = await Promise.all([
          http.get<LopHocDetail>(`/api/classes/lop-hoc/${id}/`),
          http.get<Paginated<LichThi>>(`/api/exams/lich-thi/`),
          http.get<Paginated<ChuDe>>(`/api/lessons/chu-de/`),
        ]);

        if (!mounted) return;

        setLopHoc(lopRes.data);
        setLichThiAll(lichRes.data.results ?? []);
        setChuDeAll(chuDeRes.data.results ?? []);
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

  const lichThiOfClass = useMemo(() => {
    if (!id) return [];
    const arr = (lichThiAll ?? []).filter(
      (x) => String(x.IDLopHoc) === String(id)
    );
    return arr.sort(
      (a, b) =>
        new Date(a.ThoiGianBatDau).getTime() -
        new Date(b.ThoiGianBatDau).getTime()
    );
  }, [lichThiAll, id]);

  // lấy list IDBaiHoc “liên quan lớp” bằng cách quét chi tiết đề trong lịch thi của lớp
  const lessonIdSetFromExams = useMemo(() => {
    const set = new Set<string>();
    for (const lt of lichThiOfClass) {
      const chiTiet = lt.IDDeThi_detail?.chi_tiet ?? [];
      for (const item of chiTiet) {
        const baiHocId = item?.IDCauHoi_detail?.IDBaiHoc;
        if (baiHocId) set.add(String(baiHocId));
      }
    }
    return set;
  }, [lichThiOfClass]);

  const chuDeWithLessonsOfClass = useMemo(() => {
    // Nếu lớp chưa có lịch thi => chưa suy ra được bài học => show rỗng + gợi ý
    if (!lessonIdSetFromExams.size) return [];

    return (chuDeAll ?? [])
      .map((cd) => {
        const lessons = (cd.bai_hoc ?? []).filter((bh) =>
          lessonIdSetFromExams.has(String(bh.IDBaiHoc))
        );
        return { ...cd, bai_hoc: lessons, so_bai_hoc: lessons.length };
      })
      .filter((cd) => (cd.bai_hoc?.length ?? 0) > 0);
  }, [chuDeAll, lessonIdSetFromExams]);

  const teacherName =
    lopHoc?.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
    lopHoc?.IDGiaoVien ||
    "—";
  const teacherEmail = lopHoc?.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "—";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-slate-500">Chi tiết lớp</div>
          <h1 className="mt-1 truncate text-2xl font-extrabold text-slate-900">
            {lopHoc?.TenLopHoc || (loading ? "Đang tải..." : "—")}
          </h1>
          <div className="mt-1 text-sm text-slate-600">
            {lopHoc?.IDLopHoc || id || "—"}
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

          <button
            type="button"
            onClick={() => {
              // Reload nhanh
              window.location.reload();
            }}
            className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:bg-violet-700"
          >
            Reload
          </button>
        </div>
      </div>

      {/* Error */}
      {errMsg ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errMsg}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "overview", label: "Tổng quan" },
          { key: "lessons", label: "Bài học" },
          { key: "exams", label: "Lịch thi" },
          { key: "students", label: "Học viên" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as TabKey)}
            className={[
              "h-10 rounded-xl px-4 font-semibold",
              tab === t.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {loading && !lopHoc ? (
          <div className="text-slate-700">Đang tải dữ liệu...</div>
        ) : null}

        {/* OVERVIEW */}
        {tab === "overview" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="text-lg font-extrabold text-slate-900">Mô tả</div>
              <div className="mt-2 whitespace-pre-wrap text-slate-700">
                {lopHoc?.MoTa || "—"}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Số học viên
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">
                    {lopHoc?.so_hoc_vien ?? lopHoc?.hoc_vien?.length ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Số lịch thi
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">
                    {lichThiOfClass.length}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-500">
                    Số bài học liên quan
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-slate-900">
                    {lessonIdSetFromExams.size}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-lg font-extrabold text-slate-900">
                Giáo viên
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-bold text-slate-900">
                  {teacherName}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {teacherEmail}
                </div>
              </div>

              {/* <div className="mt-4 text-sm text-slate-600">
                Tip: Bài học của lớp hiện đang được suy ra từ <b>các câu hỏi</b>{" "}
                nằm trong đề thi của lịch thi (dựa theo <code>IDBaiHoc</code>).
              </div> */}
            </div>
          </div>
        ) : null}

        {/* LESSONS */}
        {tab === "lessons" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  Bài học
                </div>
                {/* <div className="mt-1 text-sm text-slate-600">
                  Chỉ hiển thị bài học xuất hiện trong câu hỏi của các đề thi
                  thuộc lớp này.
                </div> */}
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                {lessonIdSetFromExams.size} bài học
              </div>
            </div>

            {!lessonIdSetFromExams.size ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-700">
                Lớp này chưa có lịch thi (hoặc đề thi chưa gắn câu hỏi có{" "}
                <b>IDBaiHoc</b>), nên chưa suy ra được danh sách bài học.
              </div>
            ) : null}

            {chuDeWithLessonsOfClass.length ? (
              <div className="mt-4 space-y-4">
                {chuDeWithLessonsOfClass.map((cd) => (
                  <div
                    key={cd.IDChuDe}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base font-extrabold text-slate-900">
                        {cd.TenChuDe}
                      </div>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                        {cd.so_bai_hoc} bài
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(cd.bai_hoc ?? []).map((bh) => (
                        <Link
                          to={`/lessons/${bh.IDBaiHoc}`}
                          key={bh.IDBaiHoc}
                          type="button"
                          className="block rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-slate-100"
                        >
                          <div className="truncate text-sm font-extrabold text-slate-900">
                            {bh.TenBaiHoc}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-600">
                            {bh.IDBaiHoc}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : lessonIdSetFromExams.size ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                Có bài học liên quan ({lessonIdSetFromExams.size}) nhưng không
                tìm thấy trong API <code>/chu-de/</code>. Kiểm tra lại mapping{" "}
                <code>IDBaiHoc</code> giữa câu hỏi và bài học.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* EXAMS */}
        {tab === "exams" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  Lịch thi
                </div>
                {/* <div className="mt-1 text-sm text-slate-600">
                  Lọc từ API /api/exams/lich-thi/ theo IDLopHoc.
                </div> */}
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                {lichThiOfClass.length} lịch
              </div>
            </div>

            {!lichThiOfClass.length ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-700">
                Lớp này chưa có lịch thi.
              </div>
            ) : null}

            {lichThiOfClass.length ? (
              <div className="mt-4 space-y-3">
                {lichThiOfClass.map((lt) => {
                  const now = Date.now();
                  const st = diffStatus(
                    now,
                    lt.ThoiGianBatDau,
                    lt.ThoiGianKetThuc
                  );

                  return (
                    <div
                      key={lt.IDLichThi}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-extrabold text-slate-900">
                            {lt.IDDeThi_detail?.TenDeThi || lt.IDDeThi}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Bắt đầu:{" "}
                            <b>{formatDateTimeVN(lt.ThoiGianBatDau)}</b>
                            {" · "}
                            Kết thúc:{" "}
                            <b>{formatDateTimeVN(lt.ThoiGianKetThuc)}</b>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            IDLịch: {lt.IDLichThi} · IDĐề: {lt.IDDeThi}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                              badgeClass(st.kind),
                            ].join(" ")}
                          >
                            {st.label}
                          </span>

                          <div className="text-xs text-slate-600">
                            Thời gian làm bài:{" "}
                            <b>{lt.IDDeThi_detail?.ThoiGianLamBaiThi || "—"}</b>
                          </div>

                          <div className="text-xs text-slate-600">
                            Số câu:{" "}
                            <b>{lt.IDDeThi_detail?.so_cau_hoi ?? "—"}</b>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const deThiId = lt.IDDeThi;
                            const lichThiId = lt.IDLichThi;

                            if (!deThiId || !lichThiId) {
                              alert("Thiếu ID đề thi hoặc lịch thi.");
                              return;
                            }

                            navigate(
                              `/exams/${deThiId}?lichThiId=${encodeURIComponent(lichThiId)}`
                            );
                          }}
                          className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:bg-violet-700"
                        >
                          Vào thi
                        </button>

                        {/* <button
                          type="button"
                          onClick={() => {
                            const ids = (lt.IDDeThi_detail?.chi_tiet ?? [])
                              .map((x) => x?.IDCauHoi_detail?.IDBaiHoc)
                              .filter(Boolean);
                            alert(
                              `Bài học liên quan trong đề: \n${Array.from(new Set(ids)).join("\n") || "—"}`
                            );
                          }}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Bài học liên quan
                        </button> */}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* STUDENTS */}
        {tab === "students" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  Học viên
                </div>
                {/* <div className="mt-1 text-sm text-slate-600">
                  Danh sách học viên từ API chi tiết lớp.
                </div> */}
              </div>

              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                {lopHoc?.so_hoc_vien ?? lopHoc?.hoc_vien?.length ?? 0} học viên
              </div>
            </div>

            {!lopHoc?.hoc_vien?.length ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-700">
                Chưa có học viên trong lớp.
              </div>
            ) : null}

            {lopHoc?.hoc_vien?.length ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lopHoc.hoc_vien.map((hv, idx) => {
                  const tk = hv.IDHocVien_detail?.TaiKhoan_detail;
                  const name = tk?.HoTen || hv.IDHocVien;
                  const email = tk?.Email || "—";
                  const inactive =
                    tk?.is_active === false || tk?.BiVoHieuHoa === true;

                  return (
                    <div
                      key={`${hv.IDHocVien}-${idx}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="truncate text-sm font-extrabold text-slate-900">
                        {name}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-600">
                        {email}
                      </div>
                      {/* <div className="mt-1 truncate text-xs text-slate-500">
                        {hv.IDHocVien}
                      </div> */}

                      {/* <div className="mt-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
                            inactive
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                          ].join(" ")}
                        >
                          {inactive ? "Không hoạt động" : "Đang hoạt động"}
                        </span>
                      </div> */}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
