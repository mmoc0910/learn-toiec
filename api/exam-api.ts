// src/utils/apis/exams.ts

import { http } from "utils/libs/https";

export type CreateExamPayload = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // backend đang là string -> giữ nguyên theo API
  IDGiaoVien: string;
  cau_hoi_ids: string[];
};

export async function createExam(payload: CreateExamPayload) {
  const res = await http.post("/api/exams/de-thi/", payload);
  return res.data;
}

export type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function getExams() {
  const res = await http.get<PaginatedRes<any>>("/api/exams/de-thi/");
  return res.data;
}

export async function deleteExam(id: string) {
  const res = await http.delete(`/api/exams/de-thi/${id}/`);
  return res.data;
}