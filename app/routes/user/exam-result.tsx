import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { http } from "utils/libs/https";
import { cn } from "utils/helpers/class-name";
import { useAuth } from "hooks/useAuth";
import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";

/** =======================
 * Types (rút gọn đủ dùng)
 * ======================= */
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ExamDetail = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string;
  so_cau_hoi: number;
};

type LopHocDetail = {
  IDLopHoc: string;
  TenLopHoc: string;
};

type LichThiDetail = {
  IDLichThi: string;
  ThoiGianBatDau: string;
  ThoiGianKetThuc: string;
  IDLopHoc_detail?: LopHocDetail | null;
};

type QuestionChoice = {
  LuaChonID: string;
  NoiDungLuaChon: string;
  DapAnDung?: boolean;
};

type TuSapXep = {
  IDTu: string;
  NoiDungTu: string;
  ThuTuDung: number;
};

type CapTuKhop = {
  IDCapTu: string;
  TuBenTrai: string;
  TuBenPhai: string;
  LaDung: boolean;
};

type QuestionDetail = {
  IDCauHoi: string;
  NoiDungCauHoi: any;
  LoaiCauHoi: string;
  lua_chon: QuestionChoice[];
  tu_sap_xep: TuSapXep[];
  cap_tu_khop: CapTuKhop[];
};

type KetQuaChiTiet = {
  ChiTietBaiLamID: string;
  CauHoiID: string;
  CauHoiID_detail: QuestionDetail;
  LuaChon: string; // có thể "" | "lc1" | '["tu1","tu2"]'
  TraLoiTuLuan: string;
  LaDung: boolean;
};

type KetQuaItem = {
  KetQuaID: string;
  DeThiID: string;
  DeThiID_detail: ExamDetail;
  HocVienID: string;
  LichThiID: string;
  LichThiID_detail?: LichThiDetail | null;
  ThoiGianBatDau: string;
  ThoiGianNopBai: string;
  DiemSo: number;
  chi_tiet: KetQuaChiTiet[];
};

/** =======================
 * Helpers
 * ======================= */
function normalizeError(err: any): string {
  const data = err?.response?.data;
  if (Array.isArray(data)) return data.join("\n");
  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    if (!keys.length) return "Có lỗi xảy ra.";
    return keys
      .map((k) => {
        const v = (data as any)[k];
        return `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`;
      })
      .join("\n");
  }
  return data?.detail || data?.message || err?.message || "Có lỗi xảy ra.";
}

function formatDate(iso: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function safeJsonArray(input: string): string[] {
  if (!input) return [];
  try {
    const x = JSON.parse(input);
    return Array.isArray(x) ? x.map((i) => String(i)) : [];
  } catch {
    return [];
  }
}

function correctCount(item: KetQuaItem) {
  return (item.chi_tiet || []).filter((x) => x.LaDung).length;
}

/** ✅ parse yyyy-mm-dd -> Date local start/end day */
function startOfDayFromYMD(ymd: string) {
  const [y, m, d] = (ymd || "").split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
function endOfDayFromYMD(ymd: string) {
  const [y, m, d] = (ymd || "").split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

type FilterForm = {
  q: string;
  classId: string; // "ALL" | IDLopHoc
  examId: string; // "ALL" | IDDeThi
  fromDate: string; // "" | "2026-01-05"
  toDate: string; // "" | "2026-01-05"
};

const DEFAULT_FILTERS: FilterForm = {
  q: "",
  classId: "ALL",
  examId: "ALL",
  fromDate: "",
  toDate: "",
};

export default function MyResultsSplitPage() {
  const { user, accessToken } = useAuth();

  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [results, setResults] = useState<KetQuaItem[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const form = useForm<FilterForm>({
    defaultValues: DEFAULT_FILTERS,
    mode: "onChange",
  });

  const q = form.watch("q");
  const classId = form.watch("classId");
  const examId = form.watch("examId");
  const fromDate = form.watch("fromDate");
  const toDate = form.watch("toDate");

  // ✅ Load list kết quả của tôi
  useEffect(() => {
    let mounted = true;

    if (!accessToken || !user?.IDTaiKhoan) return;

    (async () => {
      setLoadingList(true);
      setListError(null);
      try {
        const res = await http.get<PaginatedRes<KetQuaItem>>(
          "/api/results/ket-qua/"
        );
        if (!mounted) return;

        const mine = (res.data?.results || []).filter(
          (x) => x.HocVienID === user.IDTaiKhoan
        );

        mine.sort(
          (a, b) =>
            new Date(b.ThoiGianNopBai).getTime() -
            new Date(a.ThoiGianNopBai).getTime()
        );

        setResults(mine);

        // auto select item đầu tiên (nếu chưa chọn)
        if (!selectedId && mine.length) setSelectedId(mine[0].KetQuaID);
      } catch (err: any) {
        if (!mounted) return;
        setListError(normalizeError(err));
      } finally {
        if (!mounted) return;
        setLoadingList(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user?.IDTaiKhoan]);

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    results.forEach((x) => {
      const cls = x.LichThiID_detail?.IDLopHoc_detail;
      if (cls?.IDLopHoc) map.set(cls.IDLopHoc, cls.TenLopHoc || cls.IDLopHoc);
    });
    return [{ value: "ALL", label: "Tất cả lớp" }].concat(
      Array.from(map.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      }))
    );
  }, [results]);

  const examOptions = useMemo(() => {
    const map = new Map<string, string>();
    results.forEach((x) => {
      const ex = x.DeThiID_detail;
      if (ex?.IDDeThi) map.set(ex.IDDeThi, ex.TenDeThi || ex.IDDeThi);
    });
    return [{ value: "ALL", label: "Tất cả đề" }].concat(
      Array.from(map.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      }))
    );
  }, [results]);

  const filtered = useMemo(() => {
    const keyword = (q || "").trim().toLowerCase();
    const from = fromDate ? startOfDayFromYMD(fromDate) : null;
    const to = toDate ? endOfDayFromYMD(toDate) : null;

    return results.filter((x) => {
      const ex = x.DeThiID_detail;
      const cls = x.LichThiID_detail?.IDLopHoc_detail;

      const okClass = classId === "ALL" ? true : cls?.IDLopHoc === classId;
      const okExam = examId === "ALL" ? true : ex?.IDDeThi === examId;

      const haystack = [
        ex?.TenDeThi,
        ex?.IDDeThi,
        cls?.TenLopHoc,
        cls?.IDLopHoc,
        x.KetQuaID,
        x.LichThiID,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const okSearch = keyword ? haystack.includes(keyword) : true;

      // ✅ filter theo ngày nộp
      let okDate = true;
      if (from || to) {
        const submitted = new Date(x.ThoiGianNopBai);
        if (Number.isNaN(submitted.getTime())) okDate = false;
        if (from && submitted < from) okDate = false;
        if (to && submitted > to) okDate = false;
      }

      return okClass && okExam && okSearch && okDate;
    });
  }, [results, q, classId, examId, fromDate, toDate]);

  /** ✅ FIX: selected phải dựa trên FILTERED + auto sync khi filter đổi */
  useEffect(() => {
    // đang loading / lỗi thì thôi
    if (loadingList || listError) return;

    // nếu filtered rỗng => clear selected
    if (!filtered.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }

    // nếu selectedId không còn nằm trong filtered => chọn item đầu tiên
    const stillExists = selectedId
      ? filtered.some((x) => x.KetQuaID === selectedId)
      : false;

    if (!stillExists) {
      setSelectedId(filtered[0].KetQuaID);
    }
  }, [filtered, selectedId, loadingList, listError]);

  /** ✅ FIX: selected lấy từ filtered */
  const selected = useMemo(() => {
    if (!selectedId) return null;
    return filtered.find((x) => x.KetQuaID === selectedId) || null;
  }, [filtered, selectedId]);

  /** ✅ Reset filter button */
  const handleResetFilters = () => {
    form.reset(DEFAULT_FILTERS);

    // sau reset -> chọn item đầu tiên của full list (nếu có)
    if (results.length) setSelectedId(results[0].KetQuaID);
    else setSelectedId(null);
  };

  return (
    <FormProvider {...form}>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        {/* TOP FILTER BAR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-slate-900">
                Kết quả kiểm tra của tôi
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {user?.HoTen || user?.Email || user?.IDTaiKhoan}
                <span className="mx-2">•</span>
                Tổng: <b>{results.length}</b> bài
              </div>
            </div>

            {/* ✅ Nút reset filter (đặt ở header cho dễ thấy) */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-black"
            >
              Reset bộ lọc
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <Input
                name="q"
                placeholder="Tìm theo tên đề, mã đề, mã lịch thi, mã kết quả, tên lớp..."
              />
            </div>

            <div className="md:col-span-2">
              <Input name="fromDate" type="date" placeholder="Từ ngày" />
            </div>

            <div className="md:col-span-2">
              <Input name="toDate" type="date" placeholder="Đến ngày" />
            </div>

            <div className="md:col-span-3">
              <DropdownSelectPortal
                name="classId"
                options={classOptions.map((x) => ({
                  value: x.value,
                  label: x.label,
                }))}
                placeholder="Chọn lớp..."
                menuWidth="320px"
                maxMenuHeight={320}
              />
            </div>

            <div className="md:col-span-3">
              <DropdownSelectPortal
                name="examId"
                options={examOptions.map((x) => ({
                  value: x.value,
                  label: x.label,
                }))}
                placeholder="Chọn đề..."
                menuWidth="360px"
                maxMenuHeight={320}
              />
            </div>
          </div>
        </div>

        {/* 2 COLUMNS */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT: LIST */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.12)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-extrabold text-slate-900">
                  Danh sách
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  {filtered.length}/{results.length}
                </div>
              </div>

              {loadingList ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  Đang tải...
                </div>
              ) : listError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 whitespace-pre-wrap">
                  {listError}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  Không có kết quả phù hợp.
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((x) => {
                    const isActive = x.KetQuaID === selectedId;
                    const ex = x.DeThiID_detail;
                    const cls = x.LichThiID_detail?.IDLopHoc_detail;
                    const total = ex?.so_cau_hoi ?? x.chi_tiet?.length ?? 0;
                    const correct = correctCount(x);

                    return (
                      <button
                        key={x.KetQuaID}
                        type="button"
                        onClick={() => setSelectedId(x.KetQuaID)}
                        className={cn(
                          "w-full rounded-2xl border p-4 text-left transition",
                          isActive
                            ? "border-violet-300 bg-violet-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-extrabold text-slate-900">
                              {ex?.TenDeThi || x.DeThiID}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              Lớp:{" "}
                              <b className="text-slate-800">
                                {cls?.TenLopHoc || "-"}
                              </b>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Nộp: {formatDate(x.ThoiGianNopBai)}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xs font-bold text-slate-600">
                              Điểm
                            </div>
                            <div className="text-2xl font-extrabold text-slate-900">
                              {x.DiemSo}
                            </div>
                            <div className="text-xs font-semibold text-slate-600">
                              Đúng {correct}/{total}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          KetQuaID:{" "}
                          <span className="font-mono">{x.KetQuaID}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: DETAIL */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.12)]">
              {!selected ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  {filtered.length === 0
                    ? "Không có dữ liệu để hiển thị. Hãy điều chỉnh bộ lọc."
                    : "Chọn một bài ở cột trái để xem chi tiết."}
                </div>
              ) : (
                <ResultDetailPanel item={selected} />
              )}
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

/** =======================
 * DETAIL PANEL (RIGHT)
 * ======================= */
function ResultDetailPanel({ item }: { item: KetQuaItem }) {
  const ex = item.DeThiID_detail;
  const cls = item.LichThiID_detail?.IDLopHoc_detail;
  const total = ex?.so_cau_hoi ?? item.chi_tiet?.length ?? 0;
  const correct = correctCount(item);

  return (
    <div>
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl font-extrabold text-slate-900">
            {ex?.TenDeThi || item.DeThiID}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Lớp: <b className="text-slate-800">{cls?.TenLopHoc || "-"}</b>
            <span className="mx-2">•</span>
            Lịch thi: <span className="font-mono">{item.LichThiID}</span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Bắt đầu:{" "}
            <b className="text-slate-800">{formatDate(item.ThoiGianBatDau)}</b>
            <span className="mx-2">•</span>
            Nộp:{" "}
            <b className="text-slate-800">{formatDate(item.ThoiGianNopBai)}</b>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            KetQuaID: <span className="font-mono">{item.KetQuaID}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
          <div className="text-xs font-bold text-emerald-700">Điểm</div>
          <div className="mt-1 text-3xl font-extrabold text-emerald-900">
            {item.DiemSo}
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-800">
            Đúng {correct}/{total}
          </div>
        </div>
      </div>

      {/* QUESTIONS */}
      <div className="mt-5 space-y-3">
        {(item.chi_tiet || []).map((ct, idx) => {
          const q = ct.CauHoiID_detail;
          const isCorrect = ct.LaDung;

          return (
            <div
              key={ct.ChiTietBaiLamID}
              className={cn(
                "rounded-2xl border p-4",
                isCorrect
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Câu {idx + 1} •{" "}
                    <span className="uppercase">{q.LoaiCauHoi}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    CauHoiID: <span className="font-mono">{ct.CauHoiID}</span>
                  </div>
                </div>

                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    isCorrect
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-red-200 text-red-900"
                  )}
                >
                  {isCorrect ? "ĐÚNG" : "SAI"}
                </span>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <AnswerViewer ct={ct} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnswerViewer({ ct }: { ct: any }) {
  const q = ct.CauHoiID_detail;

  if (q.LoaiCauHoi === "tracnghiem" || q.LoaiCauHoi === "nghe") {
    const picked = q.lua_chon?.find((x: any) => x.LuaChonID === ct.LuaChon);
    const correct = q.lua_chon?.find((x: any) => x.DapAnDung);

    return (
      <div className="space-y-2 text-sm">
        <div>
          <div className="font-bold text-slate-800">Bạn chọn:</div>
          <div className="text-slate-700">
            {picked?.NoiDungLuaChon || ct.LuaChon || "(chưa chọn)"}
          </div>
        </div>
        <div>
          <div className="font-bold text-slate-800">Đáp án đúng:</div>
          <div className="text-slate-700">
            {correct?.NoiDungLuaChon || "(không có dữ liệu đáp án đúng)"}
          </div>
        </div>
      </div>
    );
  }

  if (q.LoaiCauHoi === "tuluan") {
    return (
      <div className="text-sm">
        <div className="font-bold text-slate-800">Bài làm:</div>
        <div className="mt-1 whitespace-pre-wrap text-slate-700">
          {ct.TraLoiTuLuan || "(trống)"}
        </div>
      </div>
    );
  }

  if (q.LoaiCauHoi === "sapxeptu") {
    const pickedIds = safeJsonArray(ct.LuaChon);
    const pickedWords = pickedIds
      .map(
        (id) => q.tu_sap_xep?.find((w: any) => w.IDTu === id)?.NoiDungTu || id
      )
      .join(" ");

    const correctSorted = [...(q.tu_sap_xep || [])].sort(
      (a: any, b: any) => (a.ThuTuDung ?? 0) - (b.ThuTuDung ?? 0)
    );
    const correctWords = correctSorted.map((w: any) => w.NoiDungTu).join(" ");

    return (
      <div className="space-y-2 text-sm">
        <div>
          <div className="font-bold text-slate-800">Bạn sắp xếp:</div>
          <div className="text-slate-700">{pickedWords || "(trống)"}</div>
        </div>
        <div>
          <div className="font-bold text-slate-800">Đúng:</div>
          <div className="text-slate-700">
            {correctWords || "(không có dữ liệu)"}
          </div>
        </div>
      </div>
    );
  }

  if (q.LoaiCauHoi === "khoptu") {
    const pickedCapIds = safeJsonArray(ct.LuaChon);
    const pickedPairs = pickedCapIds
      .map((id) => {
        const cap = q.cap_tu_khop?.find((c: any) => c.IDCapTu === id);
        return cap ? `${cap.TuBenTrai} ↔ ${cap.TuBenPhai}` : id;
      })
      .join("\n");

    const correctPairs = (q.cap_tu_khop || [])
      .filter((c: any) => c.LaDung)
      .map((c: any) => `${c.TuBenTrai} ↔ ${c.TuBenPhai}`)
      .join("\n");

    return (
      <div className="space-y-2 text-sm">
        <div>
          <div className="font-bold text-slate-800">Bạn chọn cặp:</div>
          <div className="mt-1 whitespace-pre-wrap text-slate-700">
            {pickedPairs || "(trống)"}
          </div>
        </div>
        <div>
          <div className="font-bold text-slate-800">Các cặp đúng:</div>
          <div className="mt-1 whitespace-pre-wrap text-slate-700">
            {correctPairs || "(không có dữ liệu)"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm text-slate-700">
      Không hỗ trợ loại câu hỏi: <b>{q.LoaiCauHoi}</b>
    </div>
  );
}
