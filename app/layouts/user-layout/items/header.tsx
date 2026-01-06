import { useAuth } from "hooks/useAuth";
import { useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { cn } from "utils/helpers/class-name";
import { getInitials } from "utils/helpers/get-initials";

export function Header() {
  const navigate = useNavigate();
  const { user, accessToken, isLoading, logout, refreshMe } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="px-5 py-3 shadow flex items-center justify-between fixed top-0 left-0 right-0 z-10 bg-white h-16">
      {/* Logo */}
      <Link to={"/"} className="flex items-center gap-2">
        <img
          src="/images/logo.f874abb6.png"
          alt="logo"
          className="size-11 object-cover rounded-full shrink-0"
        />
        <span className="bg-[#9DDCFF] px-2 text-lg font-semibold">
          Turtle English
        </span>
      </Link>

      <nav>
        <ul className="flex items-center gap-5">
          <li>
            <NavLink
              to={"/"}
              className={({ isActive }) =>
                cn(
                  "inline-block font-medium capitalize px-2",
                  isActive && "bg-[#FFE68C]"
                )
              }
            >
              Giới thiệu
            </NavLink>
          </li>

          <li>
            <NavLink
              to={"/exams"}
              className={({ isActive }) =>
                cn(
                  "inline-block font-medium capitalize px-2",
                  isActive && "bg-[#FFE68C]"
                )
              }
            >
              Thư viện đề thi
            </NavLink>
          </li>

          <li>
            <NavLink
              to={"/exams-result"}
              className={({ isActive }) =>
                cn(
                  "inline-block font-medium capitalize px-2",
                  isActive && "bg-[#FFE68C]"
                )
              }
            >
              Bài thi của tôi
            </NavLink>
          </li>

          {/* ===== AUTH AREA ===== */}
          {!isLoading && !accessToken && (
            <li>
              <NavLink
                to={"/login"}
                className="inline-block font-medium capitalize bg-black rounded-full px-4 py-2 text-white"
              >
                Đăng nhập
              </NavLink>
            </li>
          )}

          {!isLoading && accessToken && user && (
            <li className="relative group">
              {/* Avatar + name */}
              <div className="flex items-center gap-2 cursor-pointer select-none">
                {/* Avatar chữ */}
                <div className="size-9 rounded-full bg-black text-white flex items-center justify-center font-semibold">
                  {getInitials(user.HoTen)}
                </div>

                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-sm font-semibold">{user.HoTen}</span>
                  <span className="text-xs text-gray-500">{user.Email}</span>
                </div>
              </div>

              {/* Box chỉ hiện khi hover */}
              <div
                className={cn(
                  "absolute right-0 mt-2 w-44 rounded-xl border border-[#e0e0e0] bg-white shadow-lg z-20",
                  "opacity-0 invisible translate-y-1",
                  "group-hover:opacity-100 group-hover:visible group-hover:translate-y-0",
                  "transition-all duration-150"
                )}
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl"
                >
                  Đăng xuất
                </button>
              </div>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
