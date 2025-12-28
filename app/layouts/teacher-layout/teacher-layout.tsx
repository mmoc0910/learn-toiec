import { Outlet } from "react-router";
import {
  SideBar,
  type SidebarMenuItem,
} from "~/layouts/admin-layout/items/side-bar";

export const SIDEBAR_MENU: SidebarMenuItem[] = [
  { id: "dashboard", label: "Tổng quan", href: "/teacher/dashboard" },
  {
    id: "class",
    label: "Lớp học",
    href: "/teacher/class" 
  },
  {
    id: "lessons",
    label: "Bài học",
    children: [
      { id: "lessons", label: "Bài học", href: "/teacher/lessons" },
      { id: "lessons-create", label: "Tạo mới bài học", href: "/teacher/lesson-create-new" },
    ],
  },
 
  {
    id: "questions",
    label: "Ngân hàng câu hỏi",
    children: [
      { id: "questions", label: "Ngân hàng câu hỏi", href: "/teacher/questions" },
      { id: "questions-create", label: "Tạo mới câu hỏi", href: "/teacher/question-create-new" },
    ],
  },
  {
    id: "exams",
    label: "Đề thi",
    children: [
      { id: "exams", label: "Đề thi", href: "/teacher/exams" },
      { id: "exams-create", label: "Tạo mới đề thi", href: "/teacher/exam-create-new" },
    ],
  },
  {
    id: "exam-schedule",
    label: "Lịch thi",
    children: [
      { id: "exam-schedule", label: "Lịch thi", href: "/teacher/exam-schedule" },
      { id: "exam-schedule-create", label: "Tạo mới lịch thi", href: "/teacher/exam-schedule-create-new" },
    ],
  },
  // {
  //   id: "statistics",
  //   label: "Thống kê lớp học",
  //   href: "/teacher/statistics" 
  // },
];
export default function TeacherLayout() {
  return (
    <div className="bg-slate-100 min-h-screen flex">
      <SideBar sidebaMenu={SIDEBAR_MENU} />
      <div className="flex flex-1 flex-col relative">
        <Outlet></Outlet>
      </div>
    </div>
  );
}
