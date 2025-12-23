import * as React from "react";
import { createPortal } from "react-dom";
import { useController, type UseControllerProps } from "react-hook-form";
import { cn } from "utils/helpers/class-name";

type Option = {
  label: React.ReactNode;
  value: string | number;
  disabled?: boolean;
};

type Placement = "bottom" | "top";

type Props = {
  label?: string;
  placeholder?: string;
  options: Option[];

  containerClassName?: string;

  // style
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
  optionActiveClassName?: string;
  optionSelectedClassName?: string;

  // behavior
  renderValue?: (selected?: Option) => React.ReactNode;
  closeOnSelect?: boolean;
  disabled?: boolean;

  // portal + position
  offset?: number;
  placement?: Placement;

  /**
   * ✅ NEW: optional
   * - undefined => menu KHÔNG scroll
   * - number => menu có maxHeight + scroll
   */
  maxMenuHeight?: number;

  zIndex?: number;

  // ✅ width cố định
  menuWidth?: number | string; // ex: 260 | "16rem" | "260px"
  triggerWidth?: number | string;

  // ✅ khoảng cách an toàn với mép viewport + scrollbar
  viewportPadding?: number; // ex: 16
} & UseControllerProps;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toCssSize(v: number | string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === "number" ? `${v}px` : v;
}

function useIsMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

function getScrollbarWidth() {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

function useOnClickOutside(
  refs: React.RefObject<HTMLElement>[],
  handler: () => void,
  when: boolean
) {
  React.useEffect(() => {
    if (!when) return;
    if (typeof document === "undefined") return;

    const listener = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      for (const r of refs) {
        const el = r.current;
        if (el && el.contains(target)) return;
      }
      handler();
    };

    document.addEventListener("mousedown", listener, true);
    document.addEventListener("touchstart", listener, true);
    return () => {
      document.removeEventListener("mousedown", listener, true);
      document.removeEventListener("touchstart", listener, true);
    };
  }, [refs, handler, when]);
}

type MenuPosition = {
  top: number;
  left: number;
  placement: Placement;
};

export function DropdownSelectPortal({
  label,
  placeholder = "Chọn...",
  options,

  containerClassName,
  triggerClassName,
  menuClassName,
  optionClassName,
  optionActiveClassName,
  optionSelectedClassName,

  renderValue,
  closeOnSelect = true,
  disabled,

  offset = 8,
  placement = "bottom",
  maxMenuHeight, // ✅ default undefined => không scroll nếu không truyền
  zIndex = 60,

  menuWidth = 260,
  triggerWidth,

  viewportPadding = 16,

  ...props
}: Props) {
  const {
    field,
    fieldState: { error },
  } = useController(props);

  const mounted = useIsMounted();

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [menuPos, setMenuPos] = React.useState<MenuPosition>({
    top: 0,
    left: 0,
    placement,
  });

  const selected = React.useMemo(
    () => options.find((o) => `${o.value}` === `${field.value}`),
    [options, field.value]
  );

  const isDisabledAll = !!disabled;

  const closeMenu = React.useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useOnClickOutside([triggerRef as any, menuRef as any], closeMenu, open);

  const computePosition = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;

    const rect = triggerEl.getBoundingClientRect();

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const scrollbarW = getScrollbarWidth();
    const effectiveViewportW = viewportW - scrollbarW;

    const menuWidthForClamp =
      typeof menuWidth === "number" ? menuWidth : rect.width;

    // ✅ nếu không set maxMenuHeight => không dùng estimate height để "ép scroll"
    // Nhưng để flip/clamp top/bottom mượt, mình vẫn đo menuRef nếu có.
    // Nếu chưa có menuRef height (lần đầu), dùng estimate nhẹ (KHÔNG liên quan scroll).
    const estimatedItemH = 40;
    const estimatedMenuH = Math.max(estimatedItemH, options.length * estimatedItemH + 8);

    const measuredH = menuRef.current?.getBoundingClientRect().height;
    const rawMenuH = measuredH ?? estimatedMenuH;

    // ✅ nếu có maxMenuHeight => height effective dùng để flip/clamp = min(rawMenuH, maxMenuHeight)
    // ✅ nếu không có => dùng rawMenuH (menu sẽ mở full, không scroll)
    const menuH = maxMenuHeight ? Math.min(maxMenuHeight, rawMenuH) : rawMenuH;

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;

    let finalPlacement: Placement = placement;

    // ✅ chỉ flip dựa trên menuH (đã xử lý theo maxMenuHeight hoặc full)
    if (placement === "bottom" && spaceBelow < menuH + offset && spaceAbove > spaceBelow) {
      finalPlacement = "top";
    }
    if (placement === "top" && spaceAbove < menuH + offset && spaceBelow > spaceAbove) {
      finalPlacement = "bottom";
    }

    const rawTop =
      finalPlacement === "bottom"
        ? rect.bottom + offset
        : rect.top - offset - menuH;

    const rawLeft = rect.left;

    const left = clamp(
      rawLeft,
      viewportPadding,
      effectiveViewportW - menuWidthForClamp - viewportPadding
    );

    const top = clamp(
      rawTop,
      viewportPadding,
      viewportH - menuH - viewportPadding
    );

    setMenuPos({
      top: top + window.scrollY,
      left: left + window.scrollX,
      placement: finalPlacement,
    });
  }, [menuWidth, maxMenuHeight, options.length, offset, placement, viewportPadding]);

  const openMenu = React.useCallback(() => {
    if (isDisabledAll) return;

    setOpen(true);

    const selectedIndex = options.findIndex(
      (o) => `${o.value}` === `${field.value}` && !o.disabled
    );
    if (selectedIndex >= 0) setActiveIndex(selectedIndex);
    else setActiveIndex(options.findIndex((o) => !o.disabled));

    computePosition();
  }, [isDisabledAll, options, field.value, computePosition]);

  const selectOption = React.useCallback(
    (opt: Option) => {
      if (opt.disabled) return;

      field.onChange(opt.value);
      field.onBlur();

      if (closeOnSelect) {
        closeMenu();
        if (typeof window !== "undefined") {
          window.requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }
    },
    [field, closeOnSelect, closeMenu]
  );

  const moveActive = React.useCallback(
    (delta: 1 | -1) => {
      if (!options.length) return;

      let idx = activeIndex;
      if (idx < 0) {
        idx = options.findIndex((o) => !o.disabled);
        setActiveIndex(idx);
        return;
      }

      for (let step = 0; step < options.length; step++) {
        idx = (idx + delta + options.length) % options.length;
        if (!options[idx]?.disabled) {
          setActiveIndex(idx);
          return;
        }
      }
    },
    [options, activeIndex]
  );

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabledAll) return;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        if (!open) openMenu();
        else moveActive(e.key === "ArrowDown" ? 1 : -1);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        if (!open) openMenu();
        else {
          const opt = options[activeIndex];
          if (opt) selectOption(opt);
        }
        break;
      }
      case "Escape": {
        if (!open) return;
        e.preventDefault();
        closeMenu();
        break;
      }
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        moveActive(e.key === "ArrowDown" ? 1 : -1);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        const opt = options[activeIndex];
        if (opt) selectOption(opt);
        break;
      }
      case "Escape": {
        e.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
        break;
      }
      case "Tab": {
        closeMenu();
        break;
      }
    }
  };

  // update vị trí khi scroll/resize
  React.useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    const onUpdate = () => computePosition();
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);

    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [open, computePosition]);

  // khi menu mount xong -> đo height thật để flip/chỉnh top chuẩn
  React.useLayoutEffect(() => {
    if (!open) return;
    if (!mounted) return;
    if (typeof window === "undefined") return;
    computePosition();
  }, [open, mounted, computePosition]);

  // scroll option active vào view
  React.useEffect(() => {
    if (!open) return;
    if (activeIndex < 0) return;

    const menuEl = menuRef.current;
    if (!menuEl) return;

    const optionEl = menuEl.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    optionEl?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const renderLabelEl = () => {
    if (!label) return null;
    return (
      <label className="block text-sm font-medium">
        {label}
        {props.rules?.required && (
          <span className="text-red-700 font-bold text-xl">*</span>
        )}
      </label>
    );
  };

  const renderError = () => {
    if (!error) return null;
    return <p className="text-red-700 text-xs">{error?.message}</p>;
  };

  const triggerText = renderValue
    ? renderValue(selected)
    : selected?.label ?? <span className="text-slate-600">{placeholder}</span>;

  const listboxId = React.useId();

  const enableScroll = typeof maxMenuHeight === "number";

  const menuNode =
    mounted && open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            style={{
              position: "absolute",
              top: menuPos.top,
              left: menuPos.left,
              width: toCssSize(menuWidth), // ✅ width cố định
              ...(enableScroll ? { maxHeight: maxMenuHeight } : {}),
              zIndex,
            }}
            className={cn(
              // ✅ chỉ gắn scrollbar + overflow-auto khi có maxMenuHeight
              enableScroll && "scrollbar-thin-custom overflow-auto",
              !enableScroll && "overflow-visible",
              // ✅ GIỮ NGUYÊN style gốc của sếp
              "border border-[#e0e0e0] rounded-xl bg-white shadow p-1",
              menuClassName
            )}
          >
            {options.map((opt, idx) => {
              const isSelected = `${opt.value}` === `${field.value}`;
              const isActive = idx === activeIndex;
              const isOptDisabled = !!opt.disabled;

              return (
                <button
                  key={`${opt.value}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isOptDisabled}
                  data-option-index={idx}
                  onMouseEnter={() => !isOptDisabled && setActiveIndex(idx)}
                  onClick={() => selectOption(opt)}
                  className={cn(
                    // ✅ GIỮ NGUYÊN style option gốc của sếp
                    "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2",
                    isOptDisabled && "opacity-50 cursor-not-allowed",
                    !isOptDisabled && "hover:bg-slate-100",
                    optionClassName,
                    isActive && "bg-slate-100",
                    isActive && optionActiveClassName,
                    isSelected && "font-semibold",
                    isSelected && optionSelectedClassName
                  )}
                >
                  {/* ✅ không làm giãn menu */}
                  <span className="min-w-0 truncate">{opt.label}</span>
                  {isSelected && <span className="ml-auto">✓</span>}
                </button>
              );
            })}

            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-600">
                Không có lựa chọn
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={cn("flex flex-col flex-1 justify-between", containerClassName)}>
      {renderLabelEl()}

      <input type="hidden" name={field.name} value={field.value ?? ""} />

      <button
        ref={triggerRef}
        type="button"
        disabled={isDisabledAll}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onTriggerKeyDown}
        style={{ width: toCssSize(triggerWidth) }}
        className={cn(
          // ✅ GIỮ NGUYÊN style trigger gốc của sếp
          "outline-none border border-[#e0e0e0] px-4 py-2 rounded-xl bg-white text-left flex items-center justify-between gap-3",
          isDisabledAll && "opacity-60 cursor-not-allowed",
          triggerClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
      >
        <div className="min-w-0 truncate">{triggerText}</div>
        <span className={cn("shrink-0 transition-transform", open && "rotate-180")}>
          ▾
        </span>
      </button>

      {menuNode}

      {renderError()}
    </div>
  );
}
