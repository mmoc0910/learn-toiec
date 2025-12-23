// src/api/auth.api.ts

import { authStorage, http } from "utils/libs/https";


export type LoginRequest = {
  Email: string;
  password: string;
};

export type LoginResponse = {
  refresh: string;
  access: string;
};

export type RoleDetail = {
  IDQuyen: 1 | 2 | 3;
  TenQuyen: "Quản trị viên" | "Học Viên" | "Giáo Viên";
};

export type MeResponse = {
  IDTaiKhoan: string;
  Email: string;
  HoTen: string;
  AnhDaiDien: string | null;
  SoDienThoai: string | null;
  NgayTaoTaiKhoan: string; // ISO string
  TrangThaiTaiKhoan: any | null;
  IDQuyen: 1 | 2 | 3;
  IDQuyen_detail: RoleDetail;
};

export type RegisterRequest = {
  IDTaiKhoan: string; // lấy email làm IDTaiKhoan
  Email: string;
  password: string;
  password_confirm: string;
  HoTen: string;
  SoDienThoai: number; // server đang để number
};

export type RegisterResponse = {
  message: string;
  user: MeResponse;
};

export async function loginApi(payload: LoginRequest) {
  const res = await http.post<LoginResponse>("/api/auth/login/", payload);
  authStorage.setTokens({ access: res.data.access, refresh: res.data.refresh });
  return res.data;
}

export async function getMeApi() {
  const res = await http.get<MeResponse>("/api/auth/users/me/");
  return res.data;
}

export async function registerApi(payload: RegisterRequest) {
  const res = await http.post<RegisterResponse>(
    "/api/auth/users/register/",
    payload
  );
  return res.data;
}

export function logoutApi() {
  authStorage.clear();
}
