// src/utils/apis/exam-schedules.ts
import { http } from "utils/libs/https";

export type CreateExamSchedulePayload = {
  IDLichThi: string;
  IDDeThi: string;
  IDLopHoc: string;
  ThoiGianBatDau: string; // ISO string
  ThoiGianKetThuc: string; // ISO string
};

export async function createExamSchedule(payload: CreateExamSchedulePayload) {
  const res = await http.post("/api/exams/lich-thi/", payload);
  return res.data;
}

type ExamQuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;
  FileNghe_download_url?: string | null;
  FileHinhAnh_url?: string | null;
  lua_chon: ExamQuestionChoice[];

  // ✅ thêm 2 loại mới (nếu backend trả về)
  tu_sap_xep?: { IDTu: string; NoiDungTu: string; ThuTuDung: number }[];
  cap_tu_khop?: { IDCapTu: string; TuBenTrai: string; TuBenPhai: string; LaDung: boolean }[];
};

type ExamChiTiet = {
  IDDeThi: string;
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail: ExamQuestionDetail;
};

export type ExamItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  chi_tiet: ExamChiTiet[];
  so_cau_hoi: number;
};


export type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getExamsForSelect() {
  const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
  return res.data;
}

/**
 * NOTE: Endpoint lớp học tùy backend của sếp.
 * Em để default "/api/lessons/lop-hoc/" — sếp đổi lại đúng endpoint của mình.
 */
export type ClassItem = {
  IDLopHoc: string;
  TenLopHoc: string;
};

export async function getClassesForSelect(endpoint = "api/classes/lop-hoc") {
  const res = await http.get<PaginatedRes<ClassItem>>(endpoint);
  return res.data;
}
