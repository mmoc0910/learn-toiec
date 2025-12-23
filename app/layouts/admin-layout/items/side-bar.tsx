import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router";
import { cn } from "utils/helpers/class-name";
import { logoutApi } from "api/auth.api";
import { useAuth } from "hooks/useAuth";

export type SidebarMenuItem = {
  id: string;
  label: string;
  href?: string;
  children?: SidebarMenuItem[];
};

export const SideBar: FC<{ sidebaMenu: SidebarMenuItem[] }> = (props) => {
  const { user, logout } = useAuth();
  const [openId, setOpenId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  // ✅ Tìm parentId đang chứa child có href match với pathname hiện tại
  const activeParentId = useMemo(() => {
    const pathname = location.pathname;

    for (const parent of props.sidebaMenu) {
      if (!parent.children?.length) continue;

      const matched = parent.children.some((child) => {
        if (!child.href) return false;

        // match exact theo pathname
        // nếu muốn match theo prefix (vd: /a/b cũng active /a) thì mình chỉnh thêm
        return child.href === pathname;
      });

      if (matched) return parent.id;
    }

    return null;
  }, [location.pathname, props.sidebaMenu]);

  // ✅ Khi load lại trang / đổi route -> auto mở submenu đúng
  useEffect(() => {
    if (!activeParentId) return;
    setOpenId(activeParentId);
  }, [activeParentId]);

  const fcLogout = () => {
    logout();
    navigate("/login");
  };

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
          <div className="flex gap-3">
            <img
              src={user?.AnhDaiDien || "https://images.unsplash.com/photo-1742206594477-15139139c0df"}
              className="size-11 rounded-full border border-black object-cover"
              alt=""
            />
            <div>
              <div>
                <p className="text-md font-medium">{user?.HoTen}</p>
                <p className="text-sm text-slate-500">{user?.Email}</p>
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
      </div>
    </aside>
  );
};
