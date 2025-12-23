import { http } from "utils/libs/https";


export type LessonChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

export type LessonQuestion = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;
  GiaiThich: string | null;
  FileNghe: string | null; // backend trả null
  FileNghe_url: string | null;
  FileNghe_download_url: string | null;
  lua_chon: LessonChoice[];
};

export type LessonItem = {
  IDBaiHoc: string;
  IDChuDe: string;
  IDChuDe_detail: string | null;
  TenBaiHoc: string;
  NoiDungBaiHoc: string | null;
  IDCauHoi: string | null;
  cau_hoi: LessonQuestion[];
};

export type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getLessons() {
  const res = await http.get<PaginatedRes<LessonItem>>("/api/lessons/bai-hoc/");
  return res.data;
}
