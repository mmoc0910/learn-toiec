// Pagination.tsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

type PaginationProps = {
  totalItems: number; // tổng record từ API
  pageSize: number; // limit
  pageParam?: string; // default: "page"
  className?: string;
};

const DESKTOP_ITEMS = 10;
const MOBILE_ITEMS = 5;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

type Token = number | "...";

/**
 * Tạo danh sách token (số trang + ...) sao cho:
 * - Nếu totalPages <= maxItems: hiển thị hết
 * - Nếu totalPages > maxItems: luôn hiển thị đúng maxItems token
 */
function buildTokens(
  totalPages: number,
  currentPage: number,
  maxItems: number
): Token[] {
  if (totalPages <= maxItems) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const tokens: Token[] = [];
  tokens.push(1);

  const middleSlots = maxItems - 2; // trừ 1 và totalPages
  const wantLeftDots = currentPage > Math.ceil(middleSlots / 2) + 1;
  const wantRightDots = currentPage < totalPages - Math.floor(middleSlots / 2);

  // Trường hợp gần đầu: 1 2 3 ... total
  if (!wantLeftDots && wantRightDots) {
    const end = 1 + (middleSlots - 1); // chừa 1 slot cho "..."
    for (let p = 2; p <= end; p++) tokens.push(p);
    tokens.push("...");
    tokens.push(totalPages);
    return tokens.slice(0, maxItems);
  }

  // Trường hợp gần cuối: 1 ... (n-...) n
  if (wantLeftDots && !wantRightDots) {
    tokens.push("...");
    const start = totalPages - (middleSlots - 1);
    for (let p = start; p <= totalPages - 1; p++) tokens.push(p);
    tokens.push(totalPages);
    return tokens.slice(0, maxItems);
  }

  // Trường hợp giữa: 1 ... [window] ... total
  // middleSlots = 6 (desktop) hoặc 1 (mobile) tùy maxItems
  // Ta chừa 2 slot cho 2 dấu ... => windowSlots = middleSlots - 2
  const windowSlots = middleSlots - 2;
  tokens.push("...");

  let start = currentPage - Math.floor(windowSlots / 2);
  let end = start + windowSlots - 1;

  // bảo đảm window nằm trong (2 .. totalPages-1)
  if (start < 2) {
    start = 2;
    end = start + windowSlots - 1;
  }
  if (end > totalPages - 1) {
    end = totalPages - 1;
    start = end - windowSlots + 1;
  }

  for (let p = start; p <= end; p++) tokens.push(p);

  tokens.push("...");
  tokens.push(totalPages);

  return tokens.slice(0, maxItems);
}

export function getOffsetLimit(page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const limit = Math.max(1, pageSize);
  const offset = (safePage - 1) * limit;
  return { offset, limit };
}

export function Pagination({
  totalItems,
  pageSize,
  pageParam = "page",
  className = "",
}: PaginationProps) {
  const isMobile = useIsMobile(640);
  const maxItems = isMobile ? MOBILE_ITEMS : DESKTOP_ITEMS;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const [searchParams, setSearchParams] = useSearchParams();
  const raw = Number(searchParams.get(pageParam) ?? "1");
  const currentPage = clamp(Number.isFinite(raw) ? raw : 1, 1, totalPages);

  const tokens = useMemo(
    () => buildTokens(totalPages, currentPage, maxItems),
    [totalPages, currentPage, maxItems]
  );

  const setPage = (next: number) => {
    const page = clamp(next, 1, totalPages);
    const nextParams = new URLSearchParams(searchParams);
    if (page === 1)
      nextParams.delete(pageParam); // optional: page=1 thì bỏ cho URL sạch
    else nextParams.set(pageParam, String(page));
    setSearchParams(nextParams, { replace: false });
  };

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => setPage(1)}
        className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          className="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5"
          />
        </svg>
      </button>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => setPage(currentPage - 1)}
        className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          className="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <AnimatePresence mode="popLayout" initial={false}>
        {tokens.map((t, idx) =>
          t === "..." ? (
            <motion.span
              key={`dots-${idx}-${currentPage}-${maxItems}`}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              className="px-2 text-slate-500"
            >
              ...
            </motion.span>
          ) : (
            <motion.button
              key={`p-${t}-${currentPage}-${maxItems}`}
              type="button"
              onClick={() => setPage(t)}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 3 }}
              className={` rounded cursor-pointer px-2 py-1 ${
                t === currentPage
                  ? "bg-black text-white"
                  : "hover:bg-slate-100"
              }`}
            >
              {t}
            </motion.button>
          )
        )}
      </AnimatePresence>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => setPage(currentPage + 1)}
        className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          className="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m8.25 4.5 7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => setPage(totalPages)}
        className="rounded p-1 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          className="size-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>
    </div>
  );
}
