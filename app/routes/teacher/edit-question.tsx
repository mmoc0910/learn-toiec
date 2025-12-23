import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { getLessons, type LessonItem } from "api/lesson-api";
import { http } from "utils/libs/https";
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";

/** =========================
 * Types theo response sếp đưa
 ========================== */
type ChoiceApi = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type QuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any; // tiptap json string
  LoaiCauHoi: "nghe" | "tracnghiem" | "tuluan" | string;
  GiaiThich: string | null;

  FileNghe_url?: string | null;
  lua_chon?: ChoiceApi[];
};

type FormChoice = {
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

  lua_chon_data: FormChoice[];
};

/** =========================
 * Helpers
 ========================== */
function getApiErrorMessage(err: any) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  const firstKey = Object.keys(data)[0];
  const val = (data as any)[firstKey];
  if (Array.isArray(val)) return val[0];
  if (typeof val === "string") return val;
  return "Có lỗi xảy ra.";
}

function normalizeLoai(v: any): "nghe" | "tracnghiem" | "tuluan" {
  if (v === "nghe") return "nghe";
  if (v === "tracnghiem") return "tracnghiem";
  return "tuluan";
}

// TipTap JSON string -> object an toàn
function safeParseTipTap(raw: any) {
  if (!raw) return { type: "doc", content: [{ type: "paragraph" }] };
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      // nếu backend trả plain text
      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: raw }] },
        ],
      };
    }
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function buildChoiceId(questionId: string, index1: number) {
  const q = (questionId || "").trim();
  return q ? `${q}_lc${index1}` : `lc${index1}`;
}

// đảm bảo nghe + trắc nghiệm luôn có >= 2 lựa chọn
function ensureAtLeast2Choices(questionId: string, list: FormChoice[]) {
  const next = [...(list || [])];

  while (next.length < 2) {
    const i = next.length + 1;
    next.push({
      LuaChonID: buildChoiceId(questionId, i),
      NoiDungLuaChon: i === 1 ? "A" : "B",
      DapAnDung: i === 1,
    });
  }

  // chỉ cho đúng 1 đáp án đúng
  const firstTrue = next.findIndex((x) => x.DapAnDung);
  if (firstTrue === -1 && next.length) next[0].DapAnDung = true;
  if (firstTrue !== -1) {
    next.forEach((x, idx) => {
      x.DapAnDung = idx === firstTrue;
    });
  }

  // fix LuaChonID thiếu
  next.forEach((x, idx) => {
    if (!x.LuaChonID) x.LuaChonID = buildChoiceId(questionId, idx + 1);
  });

  return next;
}

/** =========================
 * API
 ========================== */
async function getQuestionDetail(id: string) {
  const res = await http.get<QuestionDetail>(`/api/lessons/cau-hoi/${id}/`);
  return res.data;
}

// Tuỳ backend: PATCH /api/lessons/cau-hoi/{id}/
async function updateQuestion(id: string, payload: any) {
  return http.patch(`/api/lessons/cau-hoi/${id}/`, payload);
}

/** =========================
 * Page
 ========================== */
export default function EditQuestionPage() {
  const navigate = useNavigate();
  const params = useParams();

  // ✅ ưu tiên đúng key param (sếp đổi theo route của sếp)
  const questionIdFromUrl =
    (params as any)?.IDCauHoi || (params as any)?.id || "";

  const forms = useForm<FormValues>({
    defaultValues: {
      IDCauHoi: questionIdFromUrl || "",
      IDBaiHoc: "",
      NoiDungCauHoi: { type: "doc", content: [{ type: "paragraph" }] },
      LoaiCauHoi: "tracnghiem",
      GiaiThich: "",
      FileNghe_url: "",
      lua_chon_data: [
        { LuaChonID: "", NoiDungLuaChon: "A", DapAnDung: true },
        { LuaChonID: "", NoiDungLuaChon: "B", DapAnDung: false },
      ],
    },
  });

  const { fields, append, remove, update, replace } = useFieldArray({
    control: forms.control,
    name: "lua_chon_data",
  });

  const loai = forms.watch("LoaiCauHoi");
  const idCauHoiInForm = forms.watch("IDCauHoi");
  const showChoices = loai !== "tuluan"; // ✅ nghe + tracnghiem đều hiện
  const loadingIdText = questionIdFromUrl || idCauHoiInForm || "";

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ===== load lessons =====
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

  // ===== load question detail =====
  useEffect(() => {
    if (!questionIdFromUrl) {
      setErrorMsg("Thiếu IDCauHoi trong URL.");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingDetail(true);
        setErrorMsg("");
        setSuccessMsg("");

        const data = await getQuestionDetail(questionIdFromUrl);
        if (!mounted) return;

        const normalizedLoai = normalizeLoai(data.LoaiCauHoi);

        const mappedChoices: FormChoice[] = (data.lua_chon || []).map((c, i) => ({
          LuaChonID: c.LuaChonID || buildChoiceId(data.IDCauHoi, i + 1),
          NoiDungLuaChon: c.NoiDungLuaChon ?? "",
          DapAnDung: !!c.DapAnDung,
        }));

        const finalChoices =
          normalizedLoai !== "tuluan"
            ? ensureAtLeast2Choices(data.IDCauHoi, mappedChoices)
            : [];

        const finalId = (data.IDCauHoi || questionIdFromUrl).trim();

        // ✅ reset RHF
        forms.reset({
          IDCauHoi: finalId,
          IDBaiHoc: data.IDBaiHoc || "",
          NoiDungCauHoi: safeParseTipTap(data.NoiDungCauHoi),
          LoaiCauHoi: normalizedLoai,
          GiaiThich: data.GiaiThich ?? "",
          FileNghe_url: data.FileNghe_url ?? "",
          lua_chon_data: finalChoices,
        });

        // ✅ QUAN TRỌNG: replace để FieldArray render chắc chắn
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
  }, [questionIdFromUrl]);

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

  // ✅ khi đổi loại: nghe/trắc nghiệm => đảm bảo choices >=2, tuluan => clear
  useEffect(() => {
    const id = (questionIdFromUrl || idCauHoiInForm || "").trim();
    const current = forms.getValues("lua_chon_data") || [];

    if (loai === "tuluan") {
      replace([]);
      return;
    }

    const next = ensureAtLeast2Choices(id, current);
    replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loai]);

  const onSubmit = forms.handleSubmit(async (values) => {
    setErrorMsg("");
    setSuccessMsg("");

    // ✅ FIX: IDCauHoi luôn lấy từ URL trước, không phụ thuộc Input disabled
    const id = (questionIdFromUrl || values.IDCauHoi || "").trim();
    if (!id) return setErrorMsg("Thiếu IDCauHoi.");

    if (!values.IDBaiHoc) return setErrorMsg("Vui lòng chọn bài học.");
    if (!values.NoiDungCauHoi) return setErrorMsg("Vui lòng nhập nội dung.");

    if (values.LoaiCauHoi === "nghe" && !values.FileNghe_url) {
      return setErrorMsg("Câu hỏi nghe cần FileNghe_url.");
    }

    if (values.LoaiCauHoi !== "tuluan") {
      if (!values.lua_chon_data?.length)
        return setErrorMsg("Cần ít nhất 1 lựa chọn.");
      if (!values.lua_chon_data.some((x) => x.DapAnDung))
        return setErrorMsg("Phải có ít nhất 1 đáp án đúng.");
      if (values.lua_chon_data.some((x) => !x.NoiDungLuaChon?.trim()))
        return setErrorMsg("Nội dung lựa chọn không được để trống.");
    }

    try {
      setSubmitting(true);

      const payload: any = {
        IDCauHoi: id,
        IDBaiHoc: values.IDBaiHoc,
        NoiDungCauHoi:
          typeof values.NoiDungCauHoi === "string"
            ? values.NoiDungCauHoi
            : JSON.stringify(values.NoiDungCauHoi),
        LoaiCauHoi: values.LoaiCauHoi,
        GiaiThich: values.GiaiThich?.trim() ? values.GiaiThich.trim() : null,
      };

      if (values.LoaiCauHoi === "nghe") {
        payload.FileNghe_url = values.FileNghe_url || null;
      }

      if (values.LoaiCauHoi !== "tuluan") {
        payload.lua_chon_data = (values.lua_chon_data || []).map((c, i) => ({
          ...c,
          LuaChonID: c.LuaChonID || buildChoiceId(id, i + 1),
        }));
      }

      await updateQuestion(id, payload);

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

          {/* ===== Thông tin cơ bản ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            {/* ✅ IDCauHoi luôn giữ trong form state */}
            <input type="hidden" {...forms.register("IDCauHoi")} />

            <div className="grid grid-cols-2 gap-5">
              {/* ✅ hiển thị ID dạng text (không dùng Input disabled để tránh bug) */}
              <div className="col-span-2">
                <div className="text-sm font-medium">ID Câu hỏi</div>
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold">
                  {loadingDetail ? "Đang tải..." : loadingIdText || "—"}
                </div>
              </div>

              <DropdownSelectPortal
                name="IDBaiHoc"
                label="Bài học"
                placeholder={loadingLessons ? "Đang tải..." : "Chọn bài học"}
                options={lessonOptions}
                menuWidth={520}
                placement="bottom"
                disabled={loadingLessons || lessonOptions.length === 0}
              />

              <DropdownSelectPortal
                name="LoaiCauHoi"
                label="Loại câu hỏi"
                placeholder="Chọn loại"
                options={questionTypeOptions}
                menuWidth={260}
                placement="bottom"
              />

              <div className="col-span-2">
                <SimpleEditor
                  name="NoiDungCauHoi"
                  label="Nội dung câu hỏi"
                  rules={{ required: { value: true, message: "Bắt buộc" } }}
                />
              </div>

              <Input
                name="GiaiThich"
                label="Giải thích (tuỳ chọn)"
                placeholder="..."
              />

              {loai === "nghe" && (
                <div className="col-span-2">
                  <Input
                    name="FileNghe_url"
                    label="FileNghe_url"
                    placeholder="URL audio..."
                    rules={{
                      required: { value: true, message: "Bắt buộc với câu nghe" },
                    }}
                  />
                  <div className="mt-2">
                    {forms.watch("FileNghe_url") ? (
                      <audio controls className="w-full">
                        <source src={forms.watch("FileNghe_url")} />
                      </audio>
                    ) : (
                      <div className="text-sm text-slate-500">
                        Chưa có audio URL.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== Choices (NGHE + TRẮC NGHIỆM) ===== */}
          {showChoices && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">
                    Lựa chọn đáp án
                  </div>
                  <div className="text-sm text-slate-500">
                    (Loại: <b>{loai}</b>) • Số lựa chọn: <b>{fields.length}</b>
                  </div>
                </div>

                <button
                  type="button"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    const id = (questionIdFromUrl || idCauHoiInForm || "").trim();
                    append({
                      LuaChonID: buildChoiceId(id, fields.length + 1),
                      NoiDungLuaChon: "",
                      DapAnDung: false,
                    });
                  }}
                >
                  + Thêm lựa chọn
                </button>
              </div>

              <div className="space-y-3">
                {fields.map((f, idx) => {
                  const id = (questionIdFromUrl || idCauHoiInForm || "").trim();
                  const autoId = (f as any).LuaChonID || buildChoiceId(id, idx + 1);

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
                          placeholder="VD: A / 31. Car ..."
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
                            const current = forms.getValues("lua_chon_data") || [];

                            // ✅ chỉ 1 đáp án đúng
                            current.forEach((c, i) => {
                              update(i, {
                                ...c,
                                LuaChonID:
                                  c.LuaChonID || buildChoiceId(id, i + 1),
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

                {fields.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    Không có lựa chọn (fields=0). Nếu gặp trường hợp này thì do API
                    trả lua_chon rỗng + sếp đang để loại = tuluan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Submit ===== */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/teacher/questions")}
              className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting || loadingDetail}
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
