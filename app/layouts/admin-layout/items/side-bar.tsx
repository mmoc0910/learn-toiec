import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router";
import { cn } from "utils/helpers/class-name";
import { useAuth } from "hooks/useAuth";
import { http } from "utils/libs/https";
import { Modal } from "elements/modal/modal"; // ✅ dùng modal của sếp (đổi path cho đúng)

export type SidebarMenuItem = {
  id: string;
  label: string;
  href?: string;
  children?: SidebarMenuItem[];
};

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
      ThoiGianLamBaiThi?: string;
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

export const SideBar: FC<{ sidebaMenu: SidebarMenuItem[] }> = (props) => {
  const { user, logout } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // ===== Notifications state =====
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [resultsCount, setResultsCount] = useState<number>(0);
  const [results, setResults] = useState<KetQuaItem[]>([]);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  const activeParentId = useMemo(() => {
    const pathname = location.pathname;

    for (const parent of props.sidebaMenu) {
      if (!parent.children?.length) continue;

      const matched = parent.children.some((child) => {
        if (!child.href) return false;
        return child.href === pathname;
      });

      if (matched) return parent.id;
    }

    return null;
  }, [location.pathname, props.sidebaMenu]);

  useEffect(() => {
    if (!activeParentId) return;
    setOpenId(activeParentId);
  }, [activeParentId]);

  const fcLogout = () => {
    logout();
    navigate("/login");
  };

  // ===== Fetch results (attempts) =====
  const fetchResults = async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const res = await http.get<ApiPaginated<KetQuaItem>>(
        "/api/results/ket-qua/"
      );
      setResultsCount(res.data?.count ?? 0);
      setResults(res.data?.results ?? []);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message ||
        "Không thể tải thông báo.";
      setNotifError(msg);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Email]);

  useEffect(() => {
    if (!isNotifOpen) return;
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotifOpen]);

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

      const endAt = r.LichThiID_detail?.ThoiGianKetThuc;
      const endDate = safeDate(endAt);

      if (!endDate || endDate >= now) continue;

      const tenDeThi =
        r.LichThiID_detail?.IDDeThi_detail?.TenDeThi ??
        r.DeThiID ??
        "Không rõ đề thi";
      const tenLop =
        r.LichThiID_detail?.IDLopHoc_detail?.TenLopHoc ?? "Không rõ lớp";

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
        if (b > a)
          existing.lastSubmitAt = r.ThoiGianNopBai ?? existing.lastSubmitAt;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const da = safeDate(a.ThoiGianKetThuc)?.getTime() ?? 0;
      const db = safeDate(b.ThoiGianKetThuc)?.getTime() ?? 0;
      return db - da;
    });
  }, [results]);

  const renderSidebarItem = (item: SidebarMenuItem) => {
    if (item.children?.length) {
      const isOpen = openId === item.id;

      return (
        <div key={item.id} className="select-none">
          <button
            type="button"
            onClick={() => toggle(item.id)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100"
            aria-expanded={isOpen}
            aria-controls={`submenu-${item.id}`}
          >
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {item.label}
            </div>

            <motion.svg
              className="size-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </motion.svg>
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                id={`submenu-${item.id}`}
                className="ml-6 mt-1 overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <motion.div
                  className="flex flex-col gap-1 pb-1 text-slate-700"
                  initial={{ y: -6 }}
                  animate={{ y: 0 }}
                  exit={{ y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {item.children.map((child) => (
                    <NavLink
                      to={child?.href ?? ""}
                      key={child.id}
                      className={({ isActive }) =>
                        cn(
                          "rounded-lg px-3 py-2 text-left hover:bg-slate-100 cursor-pointer",
                          isActive && "bg-[#FFE68C]"
                        )
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <NavLink
        to={item?.href ?? ""}
        key={item.id}
        className={({ isActive }) =>
          cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 cursor-pointer",
            isActive && "bg-[#FFE68C]"
          )
        }
      >
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        {item.label}
      </NavLink>
    );
  };

  return (
    <aside className="min-h-screen max-h-screen relative h-full w-72">
      <div className="flex flex-col fixed inset-0 w-72 border-r border-slate-200 bg-white text-slate-800">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
          <img
            src="/images/logo.f874abb6.png"
            alt=""
            className="size-11 object-cover rounded-full shrink-0"
          />
          <span className="bg-[#9DDCFF] px-2 text-lg font-semibold">
            Turtle English
          </span>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 custom-scrollbar">
          {props?.sidebaMenu.map(renderSidebarItem)}
        </nav>

        <div className="border-t border-slate-200 p-4">
          {user?.IDQuyen === 1 && (
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className="relative inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100"
                aria-label="Thông báo"
                title="Thông báo lịch thi"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M15 17H9M18 17V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V17"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5 17H19"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 19C10.4 20.2 11.1 21 12 21C12.9 21 13.6 20.2 14 19"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>

                {resultsCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] font-semibold text-white">
                    {resultsCount > 99 ? "99+" : resultsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <img
              src={
                user?.AnhDaiDien ||
                "https://images.unsplash.com/photo-1742206594477-15139139c0df"
              }
              className="size-11 rounded-full border border-black object-cover"
              alt=""
            />
            <div className="min-w-0">
              <div className="min-w-0">
                <p className="text-md font-medium truncate">{user?.HoTen}</p>
                <p className="text-sm text-slate-500 truncate">{user?.Email}</p>
              </div>

              <button
                type="button"
                onClick={fcLogout}
                className="cursor-pointer text-sm font-medium text-[#2e7cff] underline"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Modal của sếp */}
        <Modal
          open={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          title="Thông báo lịch thi"
          width={560}
          padding={16}
          contentClassName="w-[92vw]"
          footer={
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={fetchResults}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                disabled={notifLoading}
              >
                Làm mới
              </button>
              <button
                type="button"
                onClick={() => setIsNotifOpen(false)}
                className="rounded-xl bg-[#FFE68C] px-3 py-2 text-sm font-semibold hover:opacity-90"
              >
                Đóng
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-500">
            Lịch thi đã kết thúc và số lượt làm.
          </p>

          <div className="mt-4">
            {notifLoading && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Đang tải thông báo...
              </div>
            )}

            {!notifLoading && notifError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {notifError}
              </div>
            )}

            {!notifLoading && !notifError && finishedGroups.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Chưa có lịch thi nào kết thúc để thông báo.
              </div>
            )}

            {!notifLoading && !notifError && finishedGroups.length > 0 && (
              <div className="max-h-[52vh] overflow-auto pr-1 custom-scrollbar">
                <div className="space-y-2">
                  {finishedGroups.map((g) => (
                    <div
                      key={g.LichThiID}
                      className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{g.TenDeThi}</p>
                          <p className="text-sm text-slate-600 truncate">
                            {g.TenLop}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Kết thúc: {formatDateTimeVN(g.ThoiGianKetThuc)} •
                            Nộp gần nhất:{" "}
                            {formatDateTimeVN(g.lastSubmitAt ?? null)}
                          </p>
                        </div>

                        <div className="shrink-0">
                          <span className="inline-flex items-center rounded-full bg-[#FFE68C] px-2 py-1 text-xs font-semibold text-slate-900">
                            {g.attempts} lượt làm
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </aside>
  );
};

// import type { FC } from "react";
// import { useEffect, useMemo, useState } from "react";
// import { AnimatePresence, motion } from "framer-motion";
// import { NavLink, useLocation, useNavigate } from "react-router";
// import { cn } from "utils/helpers/class-name";
// import { useAuth } from "hooks/useAuth";
// import { http } from "utils/libs/https"; // ✅ dùng axios instance của bạn

// export type SidebarMenuItem = {
//   id: string;
//   label: string;
//   href?: string;
//   children?: SidebarMenuItem[];
// };

// // ===== API TYPES (rút gọn đủ dùng) =====
// type ApiPaginated<T> = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: T[];
// };

// type KetQuaItem = {
//   KetQuaID: string;
//   LichThiID: string;
//   DeThiID: string;
//   ThoiGianNopBai?: string | null;
//   LichThiID_detail?: {
//     IDLichThi: string;
//     ThoiGianBatDau: string;
//     ThoiGianKetThuc: string;
//     IDDeThi_detail?: {
//       TenDeThi?: string;
//       ThoiGianLamBaiThi?: string;
//     };
//     IDLopHoc_detail?: {
//       TenLopHoc?: string;
//     };
//   };
// };

// function safeDate(value?: string | null) {
//   if (!value) return null;
//   const d = new Date(value);
//   return Number.isNaN(d.getTime()) ? null : d;
// }

// function formatDateTimeVN(value?: string | null) {
//   const d = safeDate(value);
//   if (!d) return "-";
//   return d.toLocaleString("vi-VN", {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// export const SideBar: FC<{ sidebaMenu: SidebarMenuItem[] }> = (props) => {
//   const { user, logout } = useAuth();
//   const [openId, setOpenId] = useState<string | null>(null);
//   const location = useLocation();
//   const navigate = useNavigate();

//   // ===== Notifications state =====
//   const [isNotifOpen, setIsNotifOpen] = useState(false);
//   const [notifLoading, setNotifLoading] = useState(false);
//   const [notifError, setNotifError] = useState<string | null>(null);
//   const [resultsCount, setResultsCount] = useState<number>(0);
//   const [results, setResults] = useState<KetQuaItem[]>([]);

//   const toggle = (id: string) => {
//     setOpenId((prev) => (prev === id ? null : id));
//   };

//   // ✅ Tìm parentId đang chứa child có href match với pathname hiện tại
//   const activeParentId = useMemo(() => {
//     const pathname = location.pathname;

//     for (const parent of props.sidebaMenu) {
//       if (!parent.children?.length) continue;

//       const matched = parent.children.some((child) => {
//         if (!child.href) return false;
//         return child.href === pathname;
//       });

//       if (matched) return parent.id;
//     }

//     return null;
//   }, [location.pathname, props.sidebaMenu]);

//   // ✅ Khi load lại trang / đổi route -> auto mở submenu đúng
//   useEffect(() => {
//     if (!activeParentId) return;
//     setOpenId(activeParentId);
//   }, [activeParentId]);

//   const fcLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   // ===== Fetch results (attempts) =====
//   const fetchResults = async () => {
//     setNotifLoading(true);
//     setNotifError(null);
//     try {
//       const res = await http.get<ApiPaginated<KetQuaItem>>("/api/results/ket-qua/");
//       setResultsCount(res.data?.count ?? 0);
//       setResults(res.data?.results ?? []);
//     } catch (err: any) {
//       const msg =
//         err?.response?.data?.detail ||
//         (typeof err?.response?.data === "string" ? err.response.data : null) ||
//         err?.message ||
//         "Không thể tải thông báo.";
//       setNotifError(msg);
//     } finally {
//       setNotifLoading(false);
//     }
//   };

//   // Prefetch 1 lần khi sidebar mount (để có badge)
//   useEffect(() => {
//     if (!user) return;
//     fetchResults();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [user?.Email]);

//   // Khi mở modal thì refresh (đảm bảo mới nhất)
//   useEffect(() => {
//     if (!isNotifOpen) return;
//     fetchResults();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isNotifOpen]);

//   // ===== Group results by schedule (LichThiID) + only finished schedules =====
//   const finishedGroups = useMemo(() => {
//     const now = new Date();

//     const map = new Map<
//       string,
//       {
//         LichThiID: string;
//         TenDeThi: string;
//         TenLop: string;
//         ThoiGianKetThuc: string;
//         attempts: number;
//         lastSubmitAt?: string | null;
//       }
//     >();

//     for (const r of results) {
//       const lichId = r.LichThiID;
//       if (!lichId) continue;

//       const endAt = r.LichThiID_detail?.ThoiGianKetThuc;
//       const endDate = safeDate(endAt);

//       // chỉ thông báo lịch thi "đã kết thúc"
//       if (!endDate || endDate >= now) continue;

//       const tenDeThi = r.LichThiID_detail?.IDDeThi_detail?.TenDeThi ?? r.DeThiID ?? "Không rõ đề thi";
//       const tenLop = r.LichThiID_detail?.IDLopHoc_detail?.TenLopHoc ?? "Không rõ lớp";
//       const key = lichId;

//       const existing = map.get(key);
//       if (!existing) {
//         map.set(key, {
//           LichThiID: lichId,
//           TenDeThi: tenDeThi,
//           TenLop: tenLop,
//           ThoiGianKetThuc: endAt ?? "",
//           attempts: 1,
//           lastSubmitAt: r.ThoiGianNopBai ?? null,
//         });
//       } else {
//         existing.attempts += 1;

//         // cập nhật lastSubmitAt lớn hơn
//         const a = safeDate(existing.lastSubmitAt ?? null)?.getTime() ?? 0;
//         const b = safeDate(r.ThoiGianNopBai ?? null)?.getTime() ?? 0;
//         if (b > a) existing.lastSubmitAt = r.ThoiGianNopBai ?? existing.lastSubmitAt;
//       }
//     }

//     // sort mới nhất (end time) lên trên
//     return Array.from(map.values()).sort((a, b) => {
//       const da = safeDate(a.ThoiGianKetThuc)?.getTime() ?? 0;
//       const db = safeDate(b.ThoiGianKetThuc)?.getTime() ?? 0;
//       return db - da;
//     });
//   }, [results]);

//   const renderSidebarItem = (item: SidebarMenuItem) => {
//     if (item.children?.length) {
//       const isOpen = openId === item.id;

//       return (
//         <div key={item.id} className="select-none">
//           <button
//             type="button"
//             onClick={() => toggle(item.id)}
//             className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100"
//             aria-expanded={isOpen}
//             aria-controls={`submenu-${item.id}`}
//           >
//             <div className="flex items-center gap-3">
//               <span className="h-2 w-2 rounded-full bg-slate-400" />
//               {item.label}
//             </div>

//             <motion.svg
//               className="size-5"
//               xmlns="http://www.w3.org/2000/svg"
//               fill="none"
//               viewBox="0 0 24 24"
//               strokeWidth={1.5}
//               stroke="currentColor"
//               animate={{ rotate: isOpen ? 90 : 0 }}
//               transition={{ duration: 0.2, ease: "easeOut" }}
//             >
//               <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
//             </motion.svg>
//           </button>

//           <AnimatePresence initial={false}>
//             {isOpen && (
//               <motion.div
//                 id={`submenu-${item.id}`}
//                 className="ml-6 mt-1 overflow-hidden"
//                 initial={{ height: 0, opacity: 0 }}
//                 animate={{ height: "auto", opacity: 1 }}
//                 exit={{ height: 0, opacity: 0 }}
//                 transition={{ duration: 0.25, ease: "easeOut" }}
//               >
//                 <motion.div
//                   className="flex flex-col gap-1 pb-1 text-slate-700"
//                   initial={{ y: -6 }}
//                   animate={{ y: 0 }}
//                   exit={{ y: -6 }}
//                   transition={{ duration: 0.2, ease: "easeOut" }}
//                 >
//                   {item.children.map((child) => (
//                     <NavLink
//                       to={child?.href ?? ""}
//                       key={child.id}
//                       className={({ isActive }) =>
//                         cn("rounded-lg px-3 py-2 text-left hover:bg-slate-100 cursor-pointer", isActive && "bg-[#FFE68C]")
//                       }
//                     >
//                       {child.label}
//                     </NavLink>
//                   ))}
//                 </motion.div>
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </div>
//       );
//     }

//     return (
//       <NavLink
//         to={item?.href ?? ""}
//         key={item.id}
//         className={({ isActive }) =>
//           cn(
//             "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-100 cursor-pointer",
//             isActive && "bg-[#FFE68C]"
//           )
//         }
//       >
//         <span className="h-2 w-2 rounded-full bg-slate-400" />
//         {item.label}
//       </NavLink>
//     );
//   };

//   return (
//     <aside className="min-h-screen max-h-screen relative h-full w-72">
//       <div className="flex flex-col fixed inset-0 w-72 border-r border-slate-200 bg-white text-slate-800">
//         <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
//           <img src="/images/logo.f874abb6.png" alt="" className="size-11 object-cover rounded-full shrink-0" />
//           <span className="bg-[#9DDCFF] px-2 text-lg font-semibold">Turtle English</span>
//         </div>

//         <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 custom-scrollbar">
//           {props?.sidebaMenu.map(renderSidebarItem)}
//         </nav>

//         {/* ===== Footer: Notifications + Profile ===== */}
//         <div className="border-t border-slate-200 p-4">
//           {/* ✅ icon thông báo nằm phía trên profile */}
//           <div className="mb-3 flex items-center justify-end">
//             <button
//               type="button"
//               onClick={() => setIsNotifOpen(true)}
//               className="relative inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100"
//               aria-label="Thông báo"
//               title="Thông báo lịch thi"
//             >
//               {/* Bell icon */}
//               <svg xmlns="http://www.w3.org/2000/svg" className="size-6" viewBox="0 0 24 24" fill="none">
//                 <path
//                   d="M15 17H9M18 17V11C18 7.686 15.314 5 12 5C8.686 5 6 7.686 6 11V17"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                 />
//                 <path
//                   d="M5 17H19"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                 />
//                 <path
//                   d="M10 19C10.4 20.2 11.1 21 12 21C12.9 21 13.6 20.2 14 19"
//                   stroke="currentColor"
//                   strokeWidth="1.6"
//                   strokeLinecap="round"
//                 />
//               </svg>

//               {/* Badge: tổng lượt làm (count) */}
//               {resultsCount > 0 && (
//                 <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1 text-center text-[11px] font-semibold text-white">
//                   {resultsCount > 99 ? "99+" : resultsCount}
//                 </span>
//               )}
//             </button>
//           </div>

//           <div className="flex gap-3">
//             <img
//               src={user?.AnhDaiDien || "https://images.unsplash.com/photo-1742206594477-15139139c0df"}
//               className="size-11 rounded-full border border-black object-cover"
//               alt=""
//             />
//             <div className="min-w-0">
//               <div className="min-w-0">
//                 <p className="text-md font-medium truncate">{user?.HoTen}</p>
//                 <p className="text-sm text-slate-500 truncate">{user?.Email}</p>
//               </div>

//               <button
//                 type="button"
//                 onClick={fcLogout}
//                 className="cursor-pointer text-sm font-medium text-[#2e7cff] underline"
//               >
//                 Đăng xuất
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* ===== Modal notifications ===== */}
//         <AnimatePresence>
//           {isNotifOpen && (
//             <>
//               <motion.div
//                 className="fixed inset-0 z-[60] bg-black/30"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 onClick={() => setIsNotifOpen(false)}
//               />

//               <motion.div
//                 className="fixed left-1/2 top-1/2 z-[61] w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-4 shadow-xl"
//                 initial={{ opacity: 0, scale: 0.98, y: 8 }}
//                 animate={{ opacity: 1, scale: 1, y: 0 }}
//                 exit={{ opacity: 0, scale: 0.98, y: 8 }}
//                 transition={{ duration: 0.18, ease: "easeOut" }}
//                 role="dialog"
//                 aria-modal="true"
//                 aria-label="Thông báo lịch thi"
//               >
//                 <div className="flex items-start justify-between gap-3">
//                   <div>
//                     <h3 className="text-lg font-semibold">Thông báo lịch thi</h3>
//                     <p className="text-sm text-slate-500">
//                       Lịch thi đã kết thúc và số lượt làm (attempts).
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={() => setIsNotifOpen(false)}
//                     className="rounded-lg p-2 hover:bg-slate-100"
//                     aria-label="Đóng"
//                   >
//                     <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 24 24" fill="none">
//                       <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
//                     </svg>
//                   </button>
//                 </div>

//                 <div className="mt-4">
//                   {notifLoading && (
//                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
//                       Đang tải thông báo...
//                     </div>
//                   )}

//                   {!notifLoading && notifError && (
//                     <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//                       {notifError}
//                     </div>
//                   )}

//                   {!notifLoading && !notifError && finishedGroups.length === 0 && (
//                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
//                       Chưa có lịch thi nào kết thúc để thông báo.
//                     </div>
//                   )}

//                   {!notifLoading && !notifError && finishedGroups.length > 0 && (
//                     <div className="max-h-[52vh] overflow-auto pr-1 custom-scrollbar">
//                       <div className="space-y-2">
//                         {finishedGroups.map((g) => (
//                           <div
//                             key={g.LichThiID}
//                             className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
//                           >
//                             <div className="flex items-start justify-between gap-3">
//                               <div className="min-w-0">
//                                 <p className="font-semibold truncate">{g.TenDeThi}</p>
//                                 <p className="text-sm text-slate-600 truncate">{g.TenLop}</p>
//                                 <p className="mt-1 text-xs text-slate-500">
//                                   Kết thúc: {formatDateTimeVN(g.ThoiGianKetThuc)} • Nộp gần nhất:{" "}
//                                   {formatDateTimeVN(g.lastSubmitAt ?? null)}
//                                 </p>
//                               </div>

//                               <div className="shrink-0">
//                                 <span className="inline-flex items-center rounded-full bg-[#FFE68C] px-2 py-1 text-xs font-semibold text-slate-900">
//                                   {g.attempts} lượt làm
//                                 </span>
//                               </div>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 <div className="mt-4 flex items-center justify-end gap-2">
//                   <button
//                     type="button"
//                     onClick={fetchResults}
//                     className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
//                     disabled={notifLoading}
//                   >
//                     Làm mới
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => setIsNotifOpen(false)}
//                     className="rounded-xl bg-[#FFE68C] px-3 py-2 text-sm font-semibold hover:opacity-90"
//                   >
//                     Đóng
//                   </button>
//                 </div>
//               </motion.div>
//             </>
//           )}
//         </AnimatePresence>
//       </div>
//     </aside>
//   );
// };
