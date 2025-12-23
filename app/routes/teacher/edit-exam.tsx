import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { http } from "utils/libs/https";
import { getLessons, type LessonItem } from "api/lesson-api";
import { uploadAudio } from "api/question-api";
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";

type ApiChoice = {
  LuaChonID: string;
  CauHoiID?: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type QuestionDetailResponse = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any; // string JSON tiptap
  LoaiCauHoi: "nghe" | "tracnghiem" | "tuluan" | string;
  GiaiThich: string | null;

  FileNghe: string | null;
  FileNghe_url: string | null;
  FileNghe_download_url?: string | null;

  lua_chon: ApiChoice[] | null;
};

type ChoiceForm = {
  LuaChonID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type FormValues = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any;
  LoaiCauHoi: "nghe" | "tracnghiem" | "tuluan";
  GiaiThich?: string;
  FileNghe_url?: string;

  lua_chon_data: ChoiceForm[];
};

function getApiErrorMessage(err: any) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  const firstKey = Object.keys(data)[0];
  const val = data[firstKey];
  if (Array.isArray(val)) return val[0];
  if (typeof val === "string") return val;
  return "Có lỗi xảy ra.";
}

function buildChoiceId(questionId: string, index1: number) {
  const q = (questionId || "").trim();
  return q ? `${q}_lc${index1}` : `lc${index1}`;
}

function safeParseTipTap(raw: any) {
  if (!raw) return "";
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return "";
}

function normalizeEditorValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function normalizeLoai(raw: any): "nghe" | "tracnghiem" | "tuluan" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "nghe") return "nghe";
  if (s === "tuluan" || s === "tu_luan") return "tuluan";
  if (s === "tracnghiem" || s === "trac_nghiem") return "tracnghiem";
  // fallback
  return "tracnghiem";
}

function ensureAtLeast2Choices(idCauHoi: string, arr?: ChoiceForm[] | null): ChoiceForm[] {
  const base = (arr || []).map((c, i) => ({
    LuaChonID: c.LuaChonID || buildChoiceId(idCauHoi, i + 1),
    NoiDungLuaChon: c.NoiDungLuaChon ?? "",
    DapAnDung: !!c.DapAnDung,
  }));

  if (base.length >= 2) return base;

  const need = 2 - base.length;
  const add: ChoiceForm[] = Array.from({ length: need }).map((_, k) => {
    const idx = base.length + k + 1;
    return {
      LuaChonID: buildChoiceId(idCauHoi, idx),
      NoiDungLuaChon: idx === 1 ? "A" : idx === 2 ? "B" : "",
      DapAnDung: idx === 1,
    };
  });

  return [...base, ...add];
}

async function getQuestionDetail(id: string) {
  const res = await http.get<QuestionDetailResponse>(`/api/lessons/cau-hoi/${id}/`);
  return res.data;
}

async function patchQuestion(id: string, payload: any) {
  return http.patch(`/api/lessons/cau-hoi/${id}/`, payload);
}

export default function EditQuestionPage() {
  const navigate = useNavigate();
  const params = useParams();
  const idFromUrl = (params as any)?.IDCauHoi || (params as any)?.id || "";

  const forms = useForm<FormValues>({
    defaultValues: {
      IDCauHoi: idFromUrl,
      IDBaiHoc: "",
      NoiDungCauHoi: "",
      LoaiCauHoi: "tracnghiem",
      GiaiThich: "",
      FileNghe_url: "",
      lua_chon_data: [
        { LuaChonID: buildChoiceId(idFromUrl, 1), NoiDungLuaChon: "A", DapAnDung: true },
        { LuaChonID: buildChoiceId(idFromUrl, 2), NoiDungLuaChon: "B", DapAnDung: false },
      ],
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({
    control: forms.control,
    name: "lua_chon_data",
  });

  const idCauHoi = forms.watch("IDCauHoi");
  const loai = forms.watch("LoaiCauHoi");
  const fileUrl = forms.watch("FileNghe_url");

  // ✅ nghe vẫn có lựa chọn
  const showChoices = loai === "tracnghiem" || loai === "nghe";
  const showAudio = loai === "nghe";

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // lessons
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingLessons(true);
        const data = await getLessons();
        if (!mounted) return;
        setLessons(data.results || []);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoadingLessons(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const lessonOptions = useMemo(
    () =>
      lessons.map((l) => ({
        label: l.TenBaiHoc || l.IDBaiHoc,
        value: l.IDBaiHoc,
      })),
    [lessons]
  );

  const questionTypeOptions = useMemo(
    () => [
      { label: "Trắc nghiệm", value: "tracnghiem" },
      { label: "Nghe", value: "nghe" },
      { label: "Tự luận", value: "tuluan" },
    ],
    []
  );

  // ✅ load detail (CHỐT: map lua_chon -> lua_chon_data + replace để render)
  useEffect(() => {
    if (!idFromUrl) {
      setErrorMsg("Thiếu IDCauHoi trong URL.");
      return;
    }

    let mounted = true;
    (async () => {
      setErrorMsg("");
      setSuccessMsg("");
      try {
        setLoadingDetail(true);

        const data = await getQuestionDetail(idFromUrl);
        if (!mounted) return;

        const normalizedLoai = normalizeLoai(data.LoaiCauHoi);

        const mappedChoices: ChoiceForm[] = (data.lua_chon || []).map((c, i) => ({
          LuaChonID: c.LuaChonID || buildChoiceId(data.IDCauHoi, i + 1),
          NoiDungLuaChon: c.NoiDungLuaChon ?? "",
          DapAnDung: !!c.DapAnDung,
        }));

        // ✅ nghe cũng cần choices, nếu API rỗng thì bơm A/B
        const finalChoices =
          normalizedLoai === "nghe" || normalizedLoai === "tracnghiem"
            ? ensureAtLeast2Choices(data.IDCauHoi, mappedChoices)
            : mappedChoices;

        // ✅ reset
        forms.reset({
          IDCauHoi: data.IDCauHoi || idFromUrl,
          IDBaiHoc: data.IDBaiHoc || "",
          NoiDungCauHoi: safeParseTipTap(data.NoiDungCauHoi),
          LoaiCauHoi: normalizedLoai,
          GiaiThich: data.GiaiThich ?? "",
          FileNghe_url: data.FileNghe_url ?? "",
          lua_chon_data: finalChoices,
        });

        // ✅ QUAN TRỌNG: replace để fieldArray render ra UI
        replace(finalChoices);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoadingDetail(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFromUrl]);

  // ✅ nếu user đổi sang nghe/trắc nghiệm mà đang không có choices => bơm A/B
  useEffect(() => {
    if (!showChoices) return;
    const current = forms.getValues("lua_chon_data") || [];
    if (current.length >= 2) return;
    const seed = ensureAtLeast2Choices(idCauHoi, current);
    replace(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChoices, idCauHoi]);

  // ✅ sync LuaChonID theo IDCauHoi
  useEffect(() => {
    const current = forms.getValues("lua_chon_data") || [];
    if (!current.length) return;
    replace(
      current.map((c, i) => ({
        ...c,
        LuaChonID: buildChoiceId(idCauHoi, i + 1),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCauHoi]);

  const validateBeforeSubmit = (values: FormValues) => {
    if (!values.IDCauHoi?.trim()) return "Thiếu IDCauHoi.";
    if (!values.IDBaiHoc) return "Vui lòng chọn bài học.";

    const content = normalizeEditorValue(values.NoiDungCauHoi);
    if (!content.trim()) return "Vui lòng nhập nội dung câu hỏi.";

    if (values.LoaiCauHoi === "nghe") {
      if (!values.FileNghe_url) return "Câu hỏi nghe cần file audio (FileNghe_url).";
    }

    if (values.LoaiCauHoi === "nghe" || values.LoaiCauHoi === "tracnghiem") {
      const arr = values.lua_chon_data || [];
      if (arr.length < 2) return "Cần ít nhất 2 lựa chọn.";
      if (!arr.some((x) => x.DapAnDung)) return "Phải có ít nhất 1 đáp án đúng.";
      if (arr.some((x) => !x.NoiDungLuaChon?.trim())) return "Nội dung lựa chọn không được để trống.";
    }

    return "";
  };

  const onPickAudio = async (file?: File | null) => {
    if (!file) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!file.type.startsWith("audio/")) {
      setErrorMsg("Vui lòng chọn file audio (mp3/wav...).");
      return;
    }

    try {
      setUploading(true);
      const res = await uploadAudio(file);
      forms.setValue("FileNghe_url", res.url, { shouldValidate: true });
      setSuccessMsg(res.message || "Upload file thành công.");
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = forms.handleSubmit(async (values) => {
    setErrorMsg("");
    setSuccessMsg("");

    const msg = validateBeforeSubmit(values);
    if (msg) {
      setErrorMsg(msg);
      return;
    }

    const id = values.IDCauHoi.trim();

    try {
      setSubmitting(true);

      const payload: any = {
        IDCauHoi: id,
        IDBaiHoc: values.IDBaiHoc,
        NoiDungCauHoi: normalizeEditorValue(values.NoiDungCauHoi).trim(),
        LoaiCauHoi: values.LoaiCauHoi,
        GiaiThich: values.GiaiThich?.trim() ? values.GiaiThich.trim() : null,
        FileNghe_url: values.LoaiCauHoi === "nghe" ? values.FileNghe_url || null : null,
      };

      // ✅ nghe + trắc nghiệm đều gửi choices
      if (values.LoaiCauHoi === "nghe" || values.LoaiCauHoi === "tracnghiem") {
        payload.lua_chon_data = (values.lua_chon_data || []).map((c, i) => ({
          LuaChonID: buildChoiceId(id, i + 1),
          NoiDungLuaChon: String(c.NoiDungLuaChon ?? "").trim(),
          DapAnDung: !!c.DapAnDung,
        }));
      } else {
        payload.lua_chon_data = [];
      }

      await patchQuestion(id, payload);

      setSuccessMsg("Cập nhật câu hỏi thành công!");
      navigate("/teacher/questions");
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Sửa câu hỏi">
        <form onSubmit={onSubmit} className="space-y-5">
          {(errorMsg || successMsg) && (
            <div
              className={[
                "rounded-xl border px-4 py-3 font-semibold",
                errorMsg
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {errorMsg || successMsg}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold text-slate-800">Thông tin câu hỏi</div>
              <div className="text-sm font-semibold text-slate-500">
                {loadingDetail ? "Đang tải..." : idFromUrl}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <Input name="IDCauHoi" label="ID Câu hỏi" disabled />

              <DropdownSelectPortal
                name="IDBaiHoc"
                label="Bài học"
                placeholder={loadingLessons ? "Đang tải..." : "Chọn bài học"}
                options={lessonOptions}
                menuWidth={520}
                placement="bottom"
                disabled={loadingLessons || lessonOptions.length === 0}
                rules={{ required: { value: true, message: "Bắt buộc" } }}
              />

              <div className="col-span-2">
                <SimpleEditor
                  name="NoiDungCauHoi"
                  label="Nội dung câu hỏi"
                  rules={{ required: { value: true, message: "Bắt buộc" } }}
                />
              </div>

              <DropdownSelectPortal
                name="LoaiCauHoi"
                label="Loại câu hỏi"
                placeholder="Chọn loại câu hỏi"
                options={questionTypeOptions}
                menuWidth={260}
                placement="bottom"
              />

              <Input name="GiaiThich" label="Giải thích (tuỳ chọn)" placeholder="Nhập giải thích..." />
            </div>
          </div>

          {showAudio && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">File nghe</div>
                  <div className="text-sm text-slate-500">Chọn file audio → upload → set FileNghe_url.</div>
                </div>

                <label className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-black px-4 font-semibold text-white">
                  {uploading ? "Đang upload..." : "Chọn file audio"}
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => onPickAudio(e.target.files?.[0])}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-700">FileNghe_url:</div>
                <div className="break-all text-sm text-slate-600">
                  {fileUrl || "Chưa có. Vui lòng upload file."}
                </div>
              </div>

              {fileUrl ? (
                <audio controls className="w-full">
                  <source src={fileUrl} />
                </audio>
              ) : null}
            </div>
          )}

          {/* ✅ CỰC QUAN TRỌNG: nghe vẫn render choices */}
          {showChoices && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">Lựa chọn đáp án</div>
                  <div className="text-sm text-slate-500">
                    Loại: <b>{loai}</b> (Nghe cũng có đáp án để học viên chọn)
                  </div>
                </div>

                <button
                  type="button"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    append({
                      LuaChonID: buildChoiceId(idCauHoi, fields.length + 1),
                      NoiDungLuaChon: "",
                      DapAnDung: false,
                    })
                  }
                >
                  + Thêm lựa chọn
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((f, idx) => {
                  const autoId = buildChoiceId(idCauHoi, idx + 1);

                  return (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="pt-1 mt-auto">
                        <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-700">
                          {autoId}
                        </span>
                      </div>

                      <div className="flex-1 min-w-60">
                        <Input
                          name={`lua_chon_data.${idx}.NoiDungLuaChon`}
                          label={`Lựa chọn ${idx + 1}`}
                          placeholder="VD: A"
                          rules={{ required: { value: true, message: "Bắt buộc" } }}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-8">
                        <input
                          type="checkbox"
                          className="size-5 cursor-pointer"
                          checked={!!forms.getValues(`lua_chon_data.${idx}.DapAnDung`)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = forms.getValues("lua_chon_data") || [];
                            // ✅ chỉ 1 đáp án đúng
                            current.forEach((c, i) => {
                              update(i, {
                                ...c,
                                LuaChonID: buildChoiceId(idCauHoi, i + 1),
                                DapAnDung: i === idx ? checked : false,
                              });
                            });
                          }}
                        />
                        <span className="font-semibold text-slate-700">Đúng</span>
                      </div>

                      <button
                        type="button"
                        className="ml-auto mt-auto h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        onClick={() => remove(idx)}
                        disabled={fields.length <= 2}
                      >
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loai === "tuluan" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              <div className="text-sm text-slate-600">
                Câu hỏi tự luận: không cần audio và không cần lựa chọn.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/teacher/questions")}
              className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50"
              disabled={submitting}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting || uploading || loadingDetail}
              className="h-11 rounded-xl bg-black px-6 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
