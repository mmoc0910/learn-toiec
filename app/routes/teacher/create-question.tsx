import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { getLessons, type LessonItem } from "api/lesson-api";
import {
  createQuestion,
  uploadAudio,
  type CreateQuestionPayload,
} from "api/question-api";
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";
import { useNavigate } from "react-router";

type FormValues = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan";
  GiaiThich?: string;
  FileNghe_url?: string;

  lua_chon_data: Array<{
    LuaChonID: string;
    NoiDungLuaChon: string;
    DapAnDung: boolean;
  }>;
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

function normalizeEditorValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function CreateQuestionPage() {
  const navigate = useNavigate();

  const forms = useForm<FormValues>({
    defaultValues: {
      IDCauHoi: `cauhoi_${Date.now()}`,
      IDBaiHoc: "",
      NoiDungCauHoi: "",
      LoaiCauHoi: "tracnghiem",
      GiaiThich: "",
      FileNghe_url: "",
      lua_chon_data: [
        { LuaChonID: "", NoiDungLuaChon: "A", DapAnDung: true },
        { LuaChonID: "", NoiDungLuaChon: "B", DapAnDung: false },
      ],
    },
  });

  const idCauHoi = forms.watch("IDCauHoi");
  const loai = forms.watch("LoaiCauHoi");
  const fileUrl = forms.watch("FileNghe_url");

  const { fields, append, remove, update, replace } = useFieldArray({
    control: forms.control,
    name: "lua_chon_data",
  });

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  // ✅ NGHE cũng có lựa chọn
  const showChoices = loai === "tracnghiem" || loai === "nghe";
  const showAudio = loai === "nghe";

  // ✅ luôn đồng bộ LuaChonID theo IDCauHoi (nhưng không render input)
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

  // ✅ khi đổi loại câu hỏi:
  // - nếu chuyển sang tuluan => clear audio + reset lựa chọn về 2 option mặc định
  // - nếu chuyển sang nghe/tracnghiem mà đang rỗng => tạo default A/B
  useEffect(() => {
    if (loai === "tuluan") {
      forms.setValue("FileNghe_url", "");
      const current = forms.getValues("lua_chon_data") || [];
      if (current.length) {
        replace([
          { LuaChonID: buildChoiceId(idCauHoi, 1), NoiDungLuaChon: "A", DapAnDung: true },
          { LuaChonID: buildChoiceId(idCauHoi, 2), NoiDungLuaChon: "B", DapAnDung: false },
        ]);
      }
      return;
    }

    // nghe/tracnghiem
    const current = forms.getValues("lua_chon_data") || [];
    if (!current.length) {
      replace([
        { LuaChonID: buildChoiceId(idCauHoi, 1), NoiDungLuaChon: "A", DapAnDung: true },
        { LuaChonID: buildChoiceId(idCauHoi, 2), NoiDungLuaChon: "B", DapAnDung: false },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loai]);

  const validateBeforeSubmit = (values: FormValues) => {
    if (!values.IDBaiHoc) return "Vui lòng chọn bài học.";
    if (!values.IDCauHoi?.trim()) return "Vui lòng nhập IDCauHoi.";
    const content = normalizeEditorValue(values.NoiDungCauHoi);
    if (!content.trim()) return "Vui lòng nhập nội dung câu hỏi.";

    if (values.LoaiCauHoi === "nghe") {
      if (!values.FileNghe_url)
        return "Câu hỏi nghe bắt buộc upload file audio để lấy URL.";
    }

    // ✅ nghe + trắc nghiệm đều phải có lựa chọn
    if (values.LoaiCauHoi === "tracnghiem" || values.LoaiCauHoi === "nghe") {
      if (!values.lua_chon_data?.length)
        return "Cần ít nhất 1 lựa chọn.";
      if (!values.lua_chon_data.some((x) => x.DapAnDung))
        return "Phải có ít nhất 1 đáp án đúng.";
      if (values.lua_chon_data.some((x) => !x.NoiDungLuaChon?.trim()))
        return "Nội dung lựa chọn không được để trống.";
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

    try {
      setSubmitting(true);
      const content = normalizeEditorValue(values.NoiDungCauHoi);

      const payload: CreateQuestionPayload = {
        IDCauHoi: values.IDCauHoi.trim(),
        IDBaiHoc: values.IDBaiHoc,
        NoiDungCauHoi: content.trim(),
        LoaiCauHoi: values.LoaiCauHoi,
        GiaiThich: values.GiaiThich?.trim() ? values.GiaiThich.trim() : null,
      };

      if (values.LoaiCauHoi === "nghe") {
        payload.FileNghe_url = values.FileNghe_url || null;
      }

      // ✅ nghe + trắc nghiệm đều gửi lua_chon_data
      if (values.LoaiCauHoi === "tracnghiem" || values.LoaiCauHoi === "nghe") {
        payload.lua_chon_data = (values.lua_chon_data || []).map((c, i) => ({
          ...c,
          LuaChonID: buildChoiceId(values.IDCauHoi, i + 1),
        }));
      }

      await createQuestion(payload);

      setSuccessMsg("Tạo câu hỏi thành công!");

      forms.reset({
        IDCauHoi: `cauhoi_${Date.now()}`,
        IDBaiHoc: values.IDBaiHoc,
        NoiDungCauHoi: "",
        LoaiCauHoi: values.LoaiCauHoi,
        GiaiThich: "",
        FileNghe_url: "",
        lua_chon_data: [
          { LuaChonID: "", NoiDungLuaChon: "A", DapAnDung: true },
          { LuaChonID: "", NoiDungLuaChon: "B", DapAnDung: false },
        ],
      });

      navigate("/teacher/questions");
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Tạo câu hỏi">
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

          <div className="grid grid-cols-2 gap-5">
            <Input
              name="IDCauHoi"
              label="ID Câu hỏi"
              placeholder="VD: cauhoi_nghe_1"
              rules={{ required: { value: true, message: "Bắt buộc" } }}
            />

            <DropdownSelectPortal
              name="IDBaiHoc"
              label="Bài học"
              placeholder={loadingLessons ? "Đang tải bài học..." : "Chọn bài học"}
              options={lessonOptions}
              menuWidth={520}
              placement="bottom"
              disabled={loadingLessons || lessonOptions.length === 0}
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

            <Input
              name="GiaiThich"
              label="Giải thích (tuỳ chọn)"
              placeholder="Nhập giải thích..."
            />
          </div>

          {/* NGHE */}
          {showAudio && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">File nghe</div>
                  <div className="text-sm text-slate-500">
                    Chọn file audio → upload → tự set FileNghe_url.
                  </div>
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

          {/* LỰA CHỌN (TRẮC NGHIỆM + NGHE) */}
          {showChoices && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">
                    Lựa chọn đáp án
                  </div>
                  <div className="text-sm text-slate-500">
                    LuaChonID tự sinh theo IDCauHoi: <b>{idCauHoi}</b>
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
                          rules={{
                            required: { value: true, message: "Bắt buộc" },
                          }}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-8">
                        <input
                          type="checkbox"
                          className="size-5 cursor-pointer"
                          checked={
                            !!forms.getValues(`lua_chon_data.${idx}.DapAnDung`)
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const current = forms.getValues("lua_chon_data");

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
                        disabled={fields.length <= 1}
                      >
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TỰ LUẬN */}
          {loai === "tuluan" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              <div className="text-sm text-slate-600">
                Câu hỏi tự luận: không cần audio và không cần lựa chọn.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting || uploading || loadingLessons}
              className="h-11 rounded-xl bg-black px-6 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Tạo câu hỏi"}
            </button>
          </div>
        </form>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
