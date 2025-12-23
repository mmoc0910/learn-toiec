import { http } from "utils/libs/https";


export type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getTeachers() {
  const res = await http.get<PaginatedRes<any>>("/api/auth/teachers/");
  return res.data;
}

export type PatchTeacherPayload = {
  TaiKhoan?: string;
  ChuyenMon?: string | null;
  KinhNghiem?: string | null;
  BangCapChungChi?: string | null;
  MoTaBanThan?: string | null;
  ThongTinNganHang?: string | null;
  TrangThaiLamViec?: string | null;
  SoTaiKhoan?: number | null;

  TaiKhoan_detail?: {
    Email?: string;
    password?: string;
    HoTen?: string;
    AnhDaiDien?: string | null;
    SoDienThoai?: number | null;
    IDQuyen?: number;
  };
};

export type QuyenDetail = {
  IDQuyen: number;
  TenQuyen: string;
};

export type TaiKhoanDetail = {
  IDTaiKhoan: string;
  Email: string;
  HoTen: string;
  AnhDaiDien: string | null;
  SoDienThoai: number | null;
  NgayTaoTaiKhoan: string;
  TrangThaiTaiKhoan: string | null;
  IDQuyen: number;
  IDQuyen_detail?: QuyenDetail | null;
};

export type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: TaiKhoanDetail | null;

  ChuyenMon: string | null;
  KinhNghiem: string | null;
  BangCapChungChi: string | null;
  MoTaBanThan: string | null;
  ThongTinNganHang: string | null;
  TrangThaiLamViec: string | null;
  SoTaiKhoan: number | null;
};

export type TeacherListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TeacherItem[];
};

export type CreateTeacherPayload = {
  TaiKhoan: string;
  TaiKhoan_detail: {
    IDTaiKhoan: string;
    Email: string;
    password: string;
    HoTen: string;
    AnhDaiDien?: string;
    SoDienThoai?: number;
    IDQuyen: number; // 3 = Giáo viên
  };
  ChuyenMon?: string;
  KinhNghiem?: string;
  BangCapChungChi?: string;
  MoTaBanThan?: string;
  ThongTinNganHang?: string;
  TrangThaiLamViec: number;
  SoTaiKhoan?: number;
};

export async function patchTeacher(id: string, payload: PatchTeacherPayload) {
  const res = await http.patch(`/api/auth/teachers/${id}/`, payload);
  return res.data;
}


export function createTeacher(payload: CreateTeacherPayload) {
  return http.post("/api/auth/teachers/", payload);
}