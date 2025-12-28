import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "utils/helpers/class-name";

type ModalProps = {
  open: boolean;
  onClose: () => void;

  // sizing
  width?: number | string; // undefined => fit-content
  minWidth?: number | string; // optional
  padding?: number; // padding an toàn so với viewport, default 16

  // content
  title?: React.ReactNode;
  header?: React.ReactNode; // header custom hoàn toàn
  children: React.ReactNode;
  footer?: React.ReactNode;

  // behavior
  closeOnOverlayClick?: boolean; // default true
  closeOnEsc?: boolean; // default true
  lockBodyScroll?: boolean; // default true

  // style
  overlayClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;

  zIndex?: number; // default 1000

  // animation
  animationDurationMs?: number; // default 220
};

function toCssSize(v?: number | string) {
  if (v === undefined) return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function Modal({
  open,
  onClose,

  width,
  minWidth,
  padding = 16,

  title,
  header,
  children,
  footer,

  closeOnOverlayClick = true,
  closeOnEsc = true,
  lockBodyScroll = true,

  overlayClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,

  zIndex = 1000,
  animationDurationMs = 220,
}: ModalProps) {
  const mounted = useMounted();

  // giữ modal trong DOM để chạy animation close
  const [isVisible, setIsVisible] = useState(open);
  const [animateIn, setAnimateIn] = useState(false);

  // lưu RAF ids (tránh lỗi optional chaining assignment)
  const raf1Ref = useRef<number | null>(null);
  const raf2Ref = useRef<number | null>(null);

  // open/close animation lifecycle
  useEffect(() => {
    // cleanup raf cũ
    const cancelRafs = () => {
      if (raf1Ref.current !== null) {
        cancelAnimationFrame(raf1Ref.current);
        raf1Ref.current = null;
      }
      if (raf2Ref.current !== null) {
        cancelAnimationFrame(raf2Ref.current);
        raf2Ref.current = null;
      }
    };

    if (open) {
      setIsVisible(true);
      // bắt đầu ở trạng thái "đóng" để có animation vào
      setAnimateIn(false);

      // đợi 2 frame để browser paint trạng thái ban đầu rồi mới animate in
      cancelRafs();
      raf1Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });

      return cancelRafs;
    }

    // đóng: animate out rồi mới unmount
    setAnimateIn(false);
    const t = window.setTimeout(() => setIsVisible(false), animationDurationMs);

    return () => {
      cancelRafs();
      window.clearTimeout(t);
    };
  }, [open, animationDurationMs]);

  // lock body scroll (khi visible, kể cả đang closing)
  useEffect(() => {
    if (!isVisible || !lockBodyScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isVisible, lockBodyScroll]);

  // ESC to close
  useEffect(() => {
    if (!isVisible || !closeOnEsc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isVisible, closeOnEsc, onClose]);

  const styles = useMemo<React.CSSProperties>(() => {
    const computedWidth = width ? toCssSize(width) : "fit-content";
    const maxW = `calc(100vw - ${padding * 2}px)`;
    const maxH = `calc(100vh - ${padding * 2}px)`;

    return {
      width: computedWidth,
      minWidth: toCssSize(minWidth),
      maxWidth: maxW,
      maxHeight: maxH, // ✅ giới hạn chiều cao của modal
    };
  }, [width, minWidth, padding]);

  if (!mounted || !isVisible) return null;

  const node = (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/50",
        // ✅ optional: giúp một số browser tính overflow tốt hơn
        "min-h-0",
        // overlay fade
        "transition-opacity ease-out",
        animateIn ? "opacity-100" : "opacity-0",
        overlayClassName
      )}
      style={{ zIndex, transitionDuration: `${animationDurationMs}ms` }}
      onMouseDown={(e) => {
        if (!closeOnOverlayClick) return;
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={cn(
          "bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden",
          // ✅ quan trọng: chia layout header/body/footer, và cho phép body scroll đúng
          "flex flex-col min-h-0",
          // content fade + slide + scale
          "transition-all ease-out",
          animateIn
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-95",
          contentClassName
        )}
        style={{ ...styles, transitionDuration: `${animationDurationMs}ms` }}
      >
        {(header || title) && (
          <div
            className={cn(
              "sticky top-0 z-10 bg-white border-b border-slate-200",
              "px-6 py-4 flex items-center justify-between gap-4",
              headerClassName
            )}
          >
            {header ? (
              header
            ) : (
              <div className="min-w-0">
                <div className="text-lg font-bold text-slate-800 truncate">
                  {title}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        {/* ✅ body: chiếm phần còn lại + cho phép scroll */}
        <div
          className={cn(
            "px-6 py-5 flex-1 min-h-0 overflow-auto",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              "border-t border-slate-200 bg-white px-6 py-4",
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
