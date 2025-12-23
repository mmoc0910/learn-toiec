import { http } from "utils/libs/https";

export type UploadAudioRes = {
  url: string;
  filename: string;
  size: number;
  message: string;
};

export type CreateQuestionPayload = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan";
  GiaiThich?: string | null;

  // chỉ dùng cho "nghe"
  FileNghe_url?: string | null;

  // chỉ dùng cho "tracnghiem"
  lua_chon_data?: Array<{
    LuaChonID: string;
    NoiDungLuaChon: string;
    DapAnDung: boolean;
  }>;
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
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;

  // ✅ luôn là string | null (không undefined)
  GiaiThich: string | null;

  FileNghe: string | null; // backend trả null
  FileNghe_url: string | null;
  FileNghe_download_url: string | null;

  lua_chon: QuestionChoice[];
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

  // lưu ý: không cho sửa type trên UI, nhưng PATCH vẫn gửi lại type hiện tại
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;

  GiaiThich: string | null;

  // chỉ dùng cho "nghe"
  FileNghe_url?: string | null;
};

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

/**
 * ✅ List questions
 * - params là optional (backend có thể hỗ trợ, nhưng FE có thể lọc local)
 */
export async function getQuestions(params?: { IDBaiHoc?: string }) {
  const res = await http.get<PaginatedRes<QuestionItem>>("/api/lessons/cau-hoi/", {
    params,
  });

  // ✅ normalize: đảm bảo không có undefined
  const data = res.data;
  return {
    ...data,
    results: (data.results || []).map((q) => ({
      ...q,
      GiaiThich: q.GiaiThich ?? null,
    })),
  };
}

/** ✅ GET detail question */
export async function getQuestionById(id: string) {
  const res = await http.get<QuestionItem>(`/api/lessons/cau-hoi/${id}/`);
  const q = res.data;
  return { ...q, GiaiThich: q.GiaiThich ?? null };
}

/** ✅ PATCH edit question */
export async function patchQuestionById(id: string, payload: PatchQuestionPayload) {
  const res = await http.patch(`/api/lessons/cau-hoi/${id}/`, payload);
  return res.data;
}

export async function deleteQuestion(id: string) {
  const res = await http.delete(`/api/lessons/cau-hoi/${id}/`);
  return res.data;
}
