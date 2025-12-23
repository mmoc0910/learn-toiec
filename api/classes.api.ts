// src/api/classes.api.ts

import { http } from "utils/libs/https";

export type TaiKhoanDetail = {
  IDTaiKhoan: string;
  Email: string;
  HoTen: string;
  AnhDaiDien: string | null;
  SoDienThoai: number | null;
  NgayTaoTaiKhoan: string;
  TrangThaiTaiKhoan: any | null;
  IDQuyen: 1 | 2 | 3;
  IDQuyen_detail: { IDQuyen: 1 | 2 | 3; TenQuyen: string };
};

export type HocVienDetail = {
  HocVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail: TaiKhoanDetail;
  NgaySinh: string | null;
  MucTieu: string | null;
  TruongHoc: string | null;
  TrinhDoHienTai: string | null;
  GhiChuCaNhan: string | null;
};

export type LopHocHocVien = {
  LopHocID: string;
  IDHocVien: string;
  IDHocVien_detail: HocVienDetail;
};

export type LopHoc = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;
  // IDGiaoVien_detail: ... (nếu cần dùng sau)
  hoc_vien: LopHocHocVien[];
  so_hoc_vien: number;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getClassesApi() {
  const res = await http.get<Paginated<LopHoc>>("/api/classes/lop-hoc/");
  return res.data;
}
