import { http } from "utils/libs/https";

/** ======================
 * Types
 * ====================== */
export type UploadAudioRes = {
  url: string;
  filename: string;
  size: number;
  message: string;
};

export type QuestionType =
  | "tracnghiem"
  | "nghe"
  | "tuluan"
  | "sapxeptu"
  | "khoptu";

export type TracNghiemChoice = {
  LuaChonID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

export type SapXepTuItem = {
  IDTu: string;
  NoiDungTu: string;
  ThuTuDung: number;
};

export type KhopTuPair = {
  IDCapTu: string;
  TuBenTrai: string;
  TuBenPhai: string;
  LaDung: boolean;
};

export type CreateQuestionPayload = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string;
  LoaiCauHoi: QuestionType;
  GiaiThich?: string | null;

  // nghe
  FileNghe_url?: string | null;

  // tracnghiem | nghe
  lua_chon_data?: TracNghiemChoice[];

  // sapxeptu
  tu_sap_xep_data?: SapXepTuItem[];

  // khoptu
  cap_tu_khop_data?: KhopTuPair[];
};

export type QuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

export type QuestionItem = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string;
  LoaiCauHoi: QuestionType | string;

  GiaiThich: string | null;

  FileNghe: string | null;
  FileNghe_url: string | null;
  FileNghe_download_url: string | null;

  lua_chon: QuestionChoice[];

  // 2 loại mới (backend có trả hay không tùy)
  tu_sap_xep?: SapXepTuItem[];
  cap_tu_khop?: KhopTuPair[];
};

export type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PatchQuestionPayload = {
  IDBaiHoc: string;
  NoiDungCauHoi: string;

  LoaiCauHoi: QuestionType | string;

  GiaiThich: string | null;

  FileNghe_url?: string | null;

  // nếu backend cho patch thêm các data mới thì bật dần
  lua_chon_data?: TracNghiemChoice[];
  tu_sap_xep_data?: SapXepTuItem[];
  cap_tu_khop_data?: KhopTuPair[];
};

/** ======================
 * API
 * ====================== */
export async function uploadAudio(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await http.post<UploadAudioRes>(
    "/api/lessons/upload-audio/upload_audio/",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return res.data;
}

export async function createQuestion(payload: CreateQuestionPayload) {
  const res = await http.post("/api/lessons/cau-hoi/", payload);
  return res.data;
}

export async function getQuestions(params?: { IDBaiHoc?: string }) {
  const res = await http.get<PaginatedRes<QuestionItem>>("/api/lessons/cau-hoi/", {
    params,
  });

  const data = res.data;
  return {
    ...data,
    results: (data.results || []).map((q) => ({
      ...q,
      GiaiThich: q.GiaiThich ?? null,
    })),
  };
}

export async function getQuestionById(id: string) {
  const res = await http.get<QuestionItem>(`/api/lessons/cau-hoi/${id}/`);
  const q = res.data;
  return { ...q, GiaiThich: q.GiaiThich ?? null };
}

export async function patchQuestionById(id: string, payload: PatchQuestionPayload) {
  const res = await http.patch(`/api/lessons/cau-hoi/${id}/`, payload);
  return res.data;
}

export async function deleteQuestion(id: string) {
  const res = await http.delete(`/api/lessons/cau-hoi/${id}/`);
  return res.data;
}
