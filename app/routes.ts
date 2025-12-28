import {
  type RouteConfig,
  index,
  layout,
  route,
  prefix,
} from "@react-router/dev/routes";

export default [
  layout("layouts/user-layout/user-layout.tsx", [
    index("routes/home.tsx"),
    route("exams", "routes/exams.tsx"),
    route("exams/:IDDeThi", "routes/user/exam.tsx"),
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
  ]),
  ...prefix("admin", [
    layout("layouts/admin-layout/admin-layout.tsx", [
      route(`dashboard`, "routes/admin/dashboard.tsx"),
      route(`students`, "routes/admin/students.tsx"),
      route(`teachers`, "routes/admin/teachers.tsx"),
      route(`exams`, "routes/admin/exams.tsx"),
      route(`exam-create-new`, "routes/admin/create-exam.tsx"),
      route(`exams/:IDDeThi`, "routes/admin/edit-exam.tsx"),
    ]),
  ]),
  ...prefix("teacher", [
    layout("layouts/teacher-layout/teacher-layout.tsx", [
      route(`dashboard`, "routes/teacher/dashboard.tsx"),
      route(`topics`, "routes/teacher/topics.tsx"),
      route(`class`, "routes/teacher/class.tsx"),
      route(`lessons`, "routes/teacher/lessons.tsx"),
      route(`exams`, "routes/teacher/exams.tsx"),
      route(`lesson-create-new`, "routes/teacher/create-lesson.tsx"),
      route(`question-create-new`, "routes/teacher/create-question.tsx"),
      route(`exam-create-new`, "routes/teacher/create-exam.tsx"),
      route(`questions`, "routes/teacher/questions.tsx"),
      route(`questions/:IDCauHoi`, "routes/teacher/edit-question.tsx"),
      route(`exams/:IDDeThi`, "routes/teacher/edit-exam.tsx"),
      route(`exam-schedule`, "routes/teacher/exam-schedule.tsx"),
      route(`exam-schedule-create-new`, "routes/teacher/create-exam-schedule.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
