import { useAuth } from "hooks/useAuth";
import { NavLink } from "react-router";
import { cn } from "utils/helpers/class-name";
import { getInitials } from "utils/helpers/get-initials";



export function Header() {
  const { user, accessToken, isLoading, logout } = useAuth();

  return (
    <header className="px-5 py-3 shadow flex items-center justify-between fixed top-0 left-0 right-0 z-10 bg-white h-16">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <img
          src="/images/logo.f874abb6.png"
          alt="logo"
          className="size-11 object-cover rounded-full shrink-0"
        />
        <span className="bg-[#9DDCFF] px-2 text-lg font-semibold">
          Turtle English
        </span>
      </div>

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
              <div className="flex items-center gap-2 cursor-pointer">
                {/* Avatar chữ */}
                <div className="size-9 rounded-full bg-black text-white flex items-center justify-center font-semibold">
                  {getInitials(user.HoTen)}
                </div>

                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-sm font-semibold">
                    {user.HoTen}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user.Email}
                  </span>
                </div>
              </div>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}
