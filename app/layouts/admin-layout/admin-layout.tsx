import { Outlet } from "react-router";
import {
  SideBar,
  type SidebarMenuItem,
} from "~/layouts/admin-layout/items/side-bar";

export const SIDEBAR_MENU: SidebarMenuItem[] = [
  { id: "dashboard", label: "Bảng điều khiển", href: "/admin/dashboard" },
  {
    id: "exams",
    label: "Đề thi",
    children: [
      { id: "exams", label: "Đề thi", href: "/admin/exams" },
      {
        id: "exams-create",
        label: "Tạo mới đề thi",
        href: "/admin/exam-create-new",
      },
    ],
  },
  {
    id: "students",
    label: "Quản lý học viên",
    href: "/admin/students",
  },
  {
    id: "teachers",
    label: "Quản lý giáo viên",
    href: "/admin/teachers",
  },
];
export default function AdminLayout() {
  return (
    <div className="bg-slate-100 min-h-screen flex">
      <SideBar sidebaMenu={SIDEBAR_MENU} />
      <div className="flex flex-1 flex-col relative">
        <Outlet></Outlet>
      </div>
    </div>
  );
}
