import React, { useEffect, useMemo, useState } from "react";
import { http } from "utils/libs/https";
import { Modal } from "elements/modal/modal"; // ✅ đường dẫn đúng theo dự án của sếp
import { cn } from "utils/helpers/class-name";

// ===== API TYPES (rút gọn đủ dùng) =====
type ApiPaginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type KetQuaItem = {
  KetQuaID: string;
  LichThiID: string;
  DeThiID: string;
  ThoiGianNopBai?: string | null;
  LichThiID_detail?: {
    IDLichThi: string;
    ThoiGianBatDau: string;
    ThoiGianKetThuc: string;
    IDDeThi_detail?: {
      TenDeThi?: string;
    };
    IDLopHoc_detail?: {
      TenLopHoc?: string;
    };
  };
};

function safeDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTimeVN(value?: string | null) {
  const d = safeDate(value);
  if (!d) return "-";
  return d.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [count, setCount] = useState(0); // badge tổng lượt làm
  const [results, setResults] = useState<KetQuaItem[]>([]);

  const fetchResults = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await http.get<ApiPaginated<KetQuaItem>>("/api/results/ket-qua/");
      setCount(res.data?.count ?? 0);
      setResults(res.data?.results ?? []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Không thể tải thông báo.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Prefetch để có badge
  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Khi mở modal: refresh
  useEffect(() => {
    if (!open) return;
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ===== Group theo LichThiID và chỉ lấy lịch "đã kết thúc" =====
  const finishedGroups = useMemo(() => {
    const now = new Date();

    const map = new Map<
      string,
      {
        LichThiID: string;
        TenDeThi: string;
        TenLop: string;
        ThoiGianKetThuc: string;
        attempts: number;
        lastSubmitAt?: string | null;
      }
    >();

    for (const r of results) {
      const lichId = r.LichThiID;
      if (!lichId) continue;

      const endAt = r.LichThiID_detail?.ThoiGianKetThuc ?? null;
      const endDate = safeDate(endAt);

      // chỉ thông báo lịch thi đã kết thúc
      if (!endDate || endDate >= now) continue;

      const tenDeThi =
        r.LichThiID_detail?.IDDeThi_detail?.TenDeThi ??
        r.DeThiID ??
        "Không rõ đề thi";
      const tenLop = r.LichThiID_detail?.IDLopHoc_detail?.TenLopHoc ?? "Không rõ lớp";

      const existing = map.get(lichId);
      if (!existing) {
        map.set(lichId, {
          LichThiID: lichId,
          TenDeThi: tenDeThi,
          TenLop: tenLop,
          ThoiGianKetThuc: endAt ?? "",
          attempts: 1,
          lastSubmitAt: r.ThoiGianNopBai ?? null,
        });
      } else {
        existing.attempts += 1;

        const a = safeDate(existing.lastSubmitAt ?? null)?.getTime() ?? 0;
        const b = safeDate(r.ThoiGianNopBai ?? null)?.getTime() ?? 0;
        if (b > a) existing.lastSubmitAt = r.ThoiGianNopBai ?? existing.lastSubmitAt;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const da = safeDate(a.ThoiGianKetThuc)?.getTime() ?? 0;
      const db = safeDate(b.ThoiGianKetThuc)?.getTime() ?? 0;
      return db - da;
    });
  }, [results]);

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={fetchResults}
        disabled={loading}
        className={cn(
          "rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50",
          loading && "opacity-60 cursor-not-allowed"
        )}
      >
        Làm mới
      </button>

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-xl bg-[#FFE68C] px-3 py-2 text-sm font-semibold hover:opacity-90"
      >
        Đóng
      </button>
    </div>
  );

  return (
    <>
      {/* ===== Icon + badge ===== */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100"
        aria-label="Thông báo lịch thi"
        title="Thông báo lịch thi"
      >
        {/* Bell icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="size-6" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 17H9M18 17V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V17"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path d="M5 17H19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M10 19C10.4 20.2 11.1 21 12 21C12.9 21 13.6 20.2 14 19"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        {count > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* ===== Modal (modal của sếp) ===== */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Thông báo lịch thi"
        width={560}
        closeOnOverlayClick
        closeOnEsc
        lockBodyScroll
        footer={footer}
      >
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Đang tải thông báo...
          </div>
        )}

        {!loading && err && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {!loading && !err && finishedGroups.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Chưa có lịch thi nào kết thúc để thông báo.
          </div>
        )}

        {!loading && !err && finishedGroups.length > 0 && (
          <div className="space-y-2">
            {finishedGroups.map((g) => (
              <div key={g.LichThiID} className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{g.TenDeThi}</p>
                    <p className="text-sm text-slate-600 truncate">{g.TenLop}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Kết thúc: {formatDateTimeVN(g.ThoiGianKetThuc)} • Nộp gần nhất:{" "}
                      {formatDateTimeVN(g.lastSubmitAt ?? null)}
                    </p>
                  </div>

                  <span className="shrink-0 inline-flex items-center rounded-full bg-[#FFE68C] px-2 py-1 text-xs font-semibold text-slate-900">
                    {g.attempts} lượt làm
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
