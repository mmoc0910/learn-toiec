// import React, { useEffect, useMemo, useState } from "react";
// import { FormProvider, useFieldArray, useForm } from "react-hook-form";

// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// import { getLessons, type LessonItem } from "api/lesson-api";
// import {
//   createQuestion,
//   uploadAudio,
//   type CreateQuestionPayload,
// } from "api/question-api";
// import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";
// import { useNavigate } from "react-router";

// type FormValues = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: string;
//   LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan";
//   GiaiThich?: string;
//   FileNghe_url?: string;

//   lua_chon_data: Array<{
//     LuaChonID: string;
//     NoiDungLuaChon: string;
//     DapAnDung: boolean;
//   }>;
// };

// function getApiErrorMessage(err: any) {
//   const data = err?.response?.data;
//   if (!data) return err?.message || "Có lỗi xảy ra.";
//   if (typeof data?.detail === "string") return data.detail;
//   if (typeof data?.message === "string") return data.message;
//   const firstKey = Object.keys(data)[0];
//   const val = data[firstKey];
//   if (Array.isArray(val)) return val[0];
//   if (typeof val === "string") return val;
//   return "Có lỗi xảy ra.";
// }

// function buildChoiceId(questionId: string, index1: number) {
//   const q = (questionId || "").trim();
//   return q ? `${q}_lc${index1}` : `lc${index1}`;
// }

// function normalizeEditorValue(v: unknown): string {
//   if (v == null) return "";
//   if (typeof v === "string") return v;
//   try {
//     return JSON.stringify(v);
//   } catch {
//     return String(v);
//   }
// }

// export default function CreateQuestionPage() {
//   const navigate = useNavigate();

//   const forms = useForm<FormValues>({
//     defaultValues: {
//       IDCauHoi: `cauhoi_${Date.now()}`,
//       IDBaiHoc: "",
//       NoiDungCauHoi: "",
//       LoaiCauHoi: "tracnghiem",
//       GiaiThich: "",
//       FileNghe_url: "",
//       lua_chon_data: [
//         { LuaChonID: "", NoiDungLuaChon: "A", DapAnDung: true },
//         { LuaChonID: "", NoiDungLuaChon: "B", DapAnDung: false },
//       ],
//     },
//   });

//   const idCauHoi = forms.watch("IDCauHoi");
//   const loai = forms.watch("LoaiCauHoi");
//   const fileUrl = forms.watch("FileNghe_url");

//   const { fields, append, remove, update, replace } = useFieldArray({
//     control: forms.control,
//     name: "lua_chon_data",
//   });

//   const [lessons, setLessons] = useState<LessonItem[]>([]);
//   const [loadingLessons, setLoadingLessons] = useState(false);

//   const [uploading, setUploading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);

//   const [errorMsg, setErrorMsg] = useState("");
//   const [successMsg, setSuccessMsg] = useState("");

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setLoadingLessons(true);
//         const data = await getLessons();
//         if (!mounted) return;
//         setLessons(data.results || []);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrorMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoadingLessons(false);
//       }
//     })();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const lessonOptions = useMemo(
//     () =>
//       lessons.map((l) => ({
//         label: l.TenBaiHoc || l.IDBaiHoc,
//         value: l.IDBaiHoc,
//       })),
//     [lessons]
//   );

//   const questionTypeOptions = useMemo(
//     () => [
//       { label: "Trắc nghiệm", value: "tracnghiem" },
//       { label: "Nghe", value: "nghe" },
//       { label: "Tự luận", value: "tuluan" },
//     ],
//     []
//   );

//   // ✅ NGHE cũng có lựa chọn
//   const showChoices = loai === "tracnghiem" || loai === "nghe";
//   const showAudio = loai === "nghe";

//   // ✅ luôn đồng bộ LuaChonID theo IDCauHoi (nhưng không render input)
//   useEffect(() => {
//     const current = forms.getValues("lua_chon_data") || [];
//     if (!current.length) return;

//     replace(
//       current.map((c, i) => ({
//         ...c,
//         LuaChonID: buildChoiceId(idCauHoi, i + 1),
//       }))
//     );
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [idCauHoi]);

//   // ✅ khi đổi loại câu hỏi:
//   // - nếu chuyển sang tuluan => clear audio + reset lựa chọn về 2 option mặc định
//   // - nếu chuyển sang nghe/tracnghiem mà đang rỗng => tạo default A/B
//   useEffect(() => {
//     if (loai === "tuluan") {
//       forms.setValue("FileNghe_url", "");
//       const current = forms.getValues("lua_chon_data") || [];
//       if (current.length) {
//         replace([
//           { LuaChonID: buildChoiceId(idCauHoi, 1), NoiDungLuaChon: "A", DapAnDung: true },
//           { LuaChonID: buildChoiceId(idCauHoi, 2), NoiDungLuaChon: "B", DapAnDung: false },
//         ]);
//       }
//       return;
//     }

//     // nghe/tracnghiem
//     const current = forms.getValues("lua_chon_data") || [];
//     if (!current.length) {
//       replace([
//         { LuaChonID: buildChoiceId(idCauHoi, 1), NoiDungLuaChon: "A", DapAnDung: true },
//         { LuaChonID: buildChoiceId(idCauHoi, 2), NoiDungLuaChon: "B", DapAnDung: false },
//       ]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [loai]);

//   const validateBeforeSubmit = (values: FormValues) => {
//     if (!values.IDBaiHoc) return "Vui lòng chọn bài học.";
//     if (!values.IDCauHoi?.trim()) return "Vui lòng nhập IDCauHoi.";
//     const content = normalizeEditorValue(values.NoiDungCauHoi);
//     if (!content.trim()) return "Vui lòng nhập nội dung câu hỏi.";

//     if (values.LoaiCauHoi === "nghe") {
//       if (!values.FileNghe_url)
//         return "Câu hỏi nghe bắt buộc upload file audio để lấy URL.";
//     }

//     // ✅ nghe + trắc nghiệm đều phải có lựa chọn
//     if (values.LoaiCauHoi === "tracnghiem" || values.LoaiCauHoi === "nghe") {
//       if (!values.lua_chon_data?.length)
//         return "Cần ít nhất 1 lựa chọn.";
//       if (!values.lua_chon_data.some((x) => x.DapAnDung))
//         return "Phải có ít nhất 1 đáp án đúng.";
//       if (values.lua_chon_data.some((x) => !x.NoiDungLuaChon?.trim()))
//         return "Nội dung lựa chọn không được để trống.";
//     }

//     return "";
//   };

//   const onPickAudio = async (file?: File | null) => {
//     if (!file) return;
//     setErrorMsg("");
//     setSuccessMsg("");

//     if (!file.type.startsWith("audio/")) {
//       setErrorMsg("Vui lòng chọn file audio (mp3/wav...).");
//       return;
//     }

//     try {
//       setUploading(true);
//       const res = await uploadAudio(file);
//       forms.setValue("FileNghe_url", res.url, { shouldValidate: true });
//       setSuccessMsg(res.message || "Upload file thành công.");
//     } catch (err: any) {
//       setErrorMsg(getApiErrorMessage(err));
//     } finally {
//       setUploading(false);
//     }
//   };

//   const onSubmit = forms.handleSubmit(async (values) => {
//     setErrorMsg("");
//     setSuccessMsg("");

//     const msg = validateBeforeSubmit(values);
//     if (msg) {
//       setErrorMsg(msg);
//       return;
//     }

//     try {
//       setSubmitting(true);
//       const content = normalizeEditorValue(values.NoiDungCauHoi);

//       const payload: CreateQuestionPayload = {
//         IDCauHoi: values.IDCauHoi.trim(),
//         IDBaiHoc: values.IDBaiHoc,
//         NoiDungCauHoi: content.trim(),
//         LoaiCauHoi: values.LoaiCauHoi,
//         GiaiThich: values.GiaiThich?.trim() ? values.GiaiThich.trim() : null,
//       };

//       if (values.LoaiCauHoi === "nghe") {
//         payload.FileNghe_url = values.FileNghe_url || null;
//       }

//       // ✅ nghe + trắc nghiệm đều gửi lua_chon_data
//       if (values.LoaiCauHoi === "tracnghiem" || values.LoaiCauHoi === "nghe") {
//         payload.lua_chon_data = (values.lua_chon_data || []).map((c, i) => ({
//           ...c,
//           LuaChonID: buildChoiceId(values.IDCauHoi, i + 1),
//         }));
//       }

//       await createQuestion(payload);

//       setSuccessMsg("Tạo câu hỏi thành công!");

//       forms.reset({
//         IDCauHoi: `cauhoi_${Date.now()}`,
//         IDBaiHoc: values.IDBaiHoc,
//         NoiDungCauHoi: "",
//         LoaiCauHoi: values.LoaiCauHoi,
//         GiaiThich: "",
//         FileNghe_url: "",
//         lua_chon_data: [
//           { LuaChonID: "", NoiDungLuaChon: "A", DapAnDung: true },
//           { LuaChonID: "", NoiDungLuaChon: "B", DapAnDung: false },
//         ],
//       });

//       navigate("/teacher/questions");
//     } catch (err: any) {
//       setErrorMsg(getApiErrorMessage(err));
//     } finally {
//       setSubmitting(false);
//     }
//   });

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Tạo câu hỏi">
//         <form onSubmit={onSubmit} className="space-y-5">
//           {(errorMsg || successMsg) && (
//             <div
//               className={[
//                 "rounded-xl border px-4 py-3 font-semibold",
//                 errorMsg
//                   ? "border-red-200 bg-red-50 text-red-700"
//                   : "border-emerald-200 bg-emerald-50 text-emerald-700",
//               ].join(" ")}
//             >
//               {errorMsg || successMsg}
//             </div>
//           )}

//           <div className="grid grid-cols-2 gap-5">
//             <Input
//               name="IDCauHoi"
//               label="ID Câu hỏi"
//               placeholder="VD: cauhoi_nghe_1"
//               rules={{ required: { value: true, message: "Bắt buộc" } }}
//             />

//             <DropdownSelectPortal
//               name="IDBaiHoc"
//               label="Bài học"
//               placeholder={loadingLessons ? "Đang tải bài học..." : "Chọn bài học"}
//               options={lessonOptions}
//               menuWidth={520}
//               placement="bottom"
//               disabled={loadingLessons || lessonOptions.length === 0}
//             />

//             <div className="col-span-2">
//               <SimpleEditor
//                 name="NoiDungCauHoi"
//                 label="Nội dung câu hỏi"
//                 rules={{ required: { value: true, message: "Bắt buộc" } }}
//               />
//             </div>

//             <DropdownSelectPortal
//               name="LoaiCauHoi"
//               label="Loại câu hỏi"
//               placeholder="Chọn loại câu hỏi"
//               options={questionTypeOptions}
//               menuWidth={260}
//               placement="bottom"
//             />

//             <Input
//               name="GiaiThich"
//               label="Giải thích (tuỳ chọn)"
//               placeholder="Nhập giải thích..."
//             />
//           </div>

//           {/* NGHE */}
//           {showAudio && (
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-3">
//               <div className="flex items-center justify-between gap-3">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">File nghe</div>
//                   <div className="text-sm text-slate-500">
//                     Chọn file audio → upload → tự set FileNghe_url.
//                   </div>
//                 </div>

//                 <label className="inline-flex h-11 cursor-pointer items-center rounded-xl bg-black px-4 font-semibold text-white">
//                   {uploading ? "Đang upload..." : "Chọn file audio"}
//                   <input
//                     type="file"
//                     accept="audio/*"
//                     className="hidden"
//                     onChange={(e) => onPickAudio(e.target.files?.[0])}
//                     disabled={uploading}
//                   />
//                 </label>
//               </div>

//               <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
//                 <div className="text-sm font-semibold text-slate-700">FileNghe_url:</div>
//                 <div className="break-all text-sm text-slate-600">
//                   {fileUrl || "Chưa có. Vui lòng upload file."}
//                 </div>
//               </div>

//               {fileUrl ? (
//                 <audio controls className="w-full">
//                   <source src={fileUrl} />
//                 </audio>
//               ) : null}
//             </div>
//           )}

//           {/* LỰA CHỌN (TRẮC NGHIỆM + NGHE) */}
//           {showChoices && (
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
//               <div className="flex items-center justify-between gap-3">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">
//                     Lựa chọn đáp án
//                   </div>
//                   <div className="text-sm text-slate-500">
//                     LuaChonID tự sinh theo IDCauHoi: <b>{idCauHoi}</b>
//                   </div>
//                 </div>

//                 <button
//                   type="button"
//                   className="h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
//                   onClick={() =>
//                     append({
//                       LuaChonID: buildChoiceId(idCauHoi, fields.length + 1),
//                       NoiDungLuaChon: "",
//                       DapAnDung: false,
//                     })
//                   }
//                 >
//                   + Thêm lựa chọn
//                 </button>
//               </div>

//               <div className="space-y-3">
//                 {fields.map((f, idx) => {
//                   const autoId = buildChoiceId(idCauHoi, idx + 1);

//                   return (
//                     <div
//                       key={f.id}
//                       className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
//                     >
//                       <div className="pt-1 mt-auto">
//                         <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-slate-700">
//                           {autoId}
//                         </span>
//                       </div>

//                       <div className="flex-1 min-w-60">
//                         <Input
//                           name={`lua_chon_data.${idx}.NoiDungLuaChon`}
//                           label={`Lựa chọn ${idx + 1}`}
//                           placeholder="VD: A"
//                           rules={{
//                             required: { value: true, message: "Bắt buộc" },
//                           }}
//                         />
//                       </div>

//                       <div className="flex items-center gap-2 pt-8">
//                         <input
//                           type="checkbox"
//                           className="size-5 cursor-pointer"
//                           checked={
//                             !!forms.getValues(`lua_chon_data.${idx}.DapAnDung`)
//                           }
//                           onChange={(e) => {
//                             const checked = e.target.checked;
//                             const current = forms.getValues("lua_chon_data");

//                             // ✅ chỉ 1 đáp án đúng
//                             current.forEach((c, i) => {
//                               update(i, {
//                                 ...c,
//                                 LuaChonID: buildChoiceId(idCauHoi, i + 1),
//                                 DapAnDung: i === idx ? checked : false,
//                               });
//                             });
//                           }}
//                         />
//                         <span className="font-semibold text-slate-700">Đúng</span>
//                       </div>

//                       <button
//                         type="button"
//                         className="ml-auto mt-auto h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
//                         onClick={() => remove(idx)}
//                         disabled={fields.length <= 1}
//                       >
//                         Xóa
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {/* TỰ LUẬN */}
//           {loai === "tuluan" && (
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               <div className="text-sm text-slate-600">
//                 Câu hỏi tự luận: không cần audio và không cần lựa chọn.
//               </div>
//             </div>
//           )}

//           <div className="flex items-center justify-end">
//             <button
//               type="submit"
//               disabled={submitting || uploading || loadingLessons}
//               className="h-11 rounded-xl bg-black px-6 font-semibold text-white disabled:opacity-60"
//             >
//               {submitting ? "Đang lưu..." : "Tạo câu hỏi"}
//             </button>
//           </div>
//         </form>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }

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

/** =======================
 *  Types
 *  ======================= */
type QuestionType = "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu";

type FormValues = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any; // SimpleEditor có thể trả object | string
  LoaiCauHoi: QuestionType;
  GiaiThich?: string;
  FileNghe_url?: string;

  // tracnghiem | nghe
  lua_chon_data: Array<{
    LuaChonID: string;
    NoiDungLuaChon: string;
    DapAnDung: boolean;
  }>;

  // sapxeptu
  tu_sap_xep_data: Array<{
    IDTu: string;
    NoiDungTu: string;
    ThuTuDung: number;
  }>;

  // khoptu
  cap_tu_khop_data: Array<{
    IDCapTu: string;
    TuBenTrai: string;
    TuBenPhai: string;
    LaDung: boolean;
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

// sapxeptu
function buildWordId(questionId: string, index1: number) {
  const q = (questionId || "").trim();
  return q ? `${q}_tu${index1}` : `tu${index1}`;
}

// khoptu
function buildPairId(questionId: string, index1: number) {
  const q = (questionId || "").trim();
  return q ? `${q}_cap${index1}` : `cap${index1}`;
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

      tu_sap_xep_data: [
        { IDTu: "", NoiDungTu: "I", ThuTuDung: 1 },
        { IDTu: "", NoiDungTu: "am", ThuTuDung: 2 },
      ],

      cap_tu_khop_data: [
        {
          IDCapTu: "",
          TuBenTrai: "Hello",
          TuBenPhai: "Xin chào",
          LaDung: true,
        },
        {
          IDCapTu: "",
          TuBenTrai: "Goodbye",
          TuBenPhai: "Tạm biệt",
          LaDung: false,
        },
      ],
    },
  });

  const idCauHoi = forms.watch("IDCauHoi");
  const loai = forms.watch("LoaiCauHoi");
  const fileUrl = forms.watch("FileNghe_url");

  /** Field arrays */
  const choicesArr = useFieldArray({
    control: forms.control,
    name: "lua_chon_data",
  });

  const sortWordsArr = useFieldArray({
    control: forms.control,
    name: "tu_sap_xep_data",
  });

  const matchPairsArr = useFieldArray({
    control: forms.control,
    name: "cap_tu_khop_data",
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
      { label: "Sắp xếp từ", value: "sapxeptu" },
      { label: "Khớp từ", value: "khoptu" },
    ],
    []
  );

  /** UI flags */
  const showChoices = loai === "tracnghiem" || loai === "nghe";
  const showAudio = loai === "nghe";

  const showSortWords = loai === "sapxeptu";
  const showMatchPairs = loai === "khoptu";

  /** =========
   *  Sync IDs
   *  ========= */

  // choices ids
  useEffect(() => {
    const current = forms.getValues("lua_chon_data") || [];
    if (!current.length) return;
    choicesArr.replace(
      current.map((c, i) => ({
        ...c,
        LuaChonID: buildChoiceId(idCauHoi, i + 1),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCauHoi]);

  // sort words ids
  useEffect(() => {
    const current = forms.getValues("tu_sap_xep_data") || [];
    if (!current.length) return;
    sortWordsArr.replace(
      current.map((w, i) => ({
        ...w,
        IDTu: buildWordId(idCauHoi, i + 1),
        ThuTuDung: typeof w.ThuTuDung === "number" ? w.ThuTuDung : i + 1,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCauHoi]);

  // match pairs ids
  useEffect(() => {
    const current = forms.getValues("cap_tu_khop_data") || [];
    if (!current.length) return;
    matchPairsArr.replace(
      current.map((p, i) => ({
        ...p,
        IDCapTu: buildPairId(idCauHoi, i + 1),
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCauHoi]);

  /** =========
   *  When type changes => reset relevant sections
   *  ========= */
  useEffect(() => {
    // tuluan
    if (loai === "tuluan") {
      forms.setValue("FileNghe_url", "");
      return;
    }

    // nghe
    if (loai === "nghe") {
      const current = forms.getValues("lua_chon_data") || [];
      if (!current.length) {
        choicesArr.replace([
          {
            LuaChonID: buildChoiceId(idCauHoi, 1),
            NoiDungLuaChon: "A",
            DapAnDung: true,
          },
          {
            LuaChonID: buildChoiceId(idCauHoi, 2),
            NoiDungLuaChon: "B",
            DapAnDung: false,
          },
        ]);
      }
      return;
    }

    // tracnghiem
    if (loai === "tracnghiem") {
      forms.setValue("FileNghe_url", "");
      const current = forms.getValues("lua_chon_data") || [];
      if (!current.length) {
        choicesArr.replace([
          {
            LuaChonID: buildChoiceId(idCauHoi, 1),
            NoiDungLuaChon: "A",
            DapAnDung: true,
          },
          {
            LuaChonID: buildChoiceId(idCauHoi, 2),
            NoiDungLuaChon: "B",
            DapAnDung: false,
          },
        ]);
      }
      return;
    }

    // sapxeptu
    if (loai === "sapxeptu") {
      forms.setValue("FileNghe_url", "");
      // đảm bảo có ít nhất 2 từ
      const current = forms.getValues("tu_sap_xep_data") || [];
      if (!current.length) {
        sortWordsArr.replace([
          { IDTu: buildWordId(idCauHoi, 1), NoiDungTu: "", ThuTuDung: 1 },
          { IDTu: buildWordId(idCauHoi, 2), NoiDungTu: "", ThuTuDung: 2 },
        ]);
      }
      return;
    }

    // khoptu
    if (loai === "khoptu") {
      forms.setValue("FileNghe_url", "");
      const current = forms.getValues("cap_tu_khop_data") || [];
      if (!current.length) {
        matchPairsArr.replace([
          {
            IDCapTu: buildPairId(idCauHoi, 1),
            TuBenTrai: "",
            TuBenPhai: "",
            LaDung: true,
          },
          {
            IDCapTu: buildPairId(idCauHoi, 2),
            TuBenTrai: "",
            TuBenPhai: "",
            LaDung: false,
          },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loai]);

  /** =========
   *  Validate
   *  ========= */
  const validateBeforeSubmit = (values: FormValues) => {
    if (!values.IDBaiHoc) return "Vui lòng chọn bài học.";
    if (!values.IDCauHoi?.trim()) return "Vui lòng nhập IDCauHoi.";
    const content = normalizeEditorValue(values.NoiDungCauHoi);
    if (!content.trim()) return "Vui lòng nhập nội dung câu hỏi.";

    if (values.LoaiCauHoi === "nghe") {
      if (!values.FileNghe_url)
        return "Câu hỏi nghe bắt buộc upload file audio để lấy URL.";
    }

    // tracnghiem | nghe
    if (values.LoaiCauHoi === "tracnghiem" || values.LoaiCauHoi === "nghe") {
      if (!values.lua_chon_data?.length) return "Cần ít nhất 1 lựa chọn.";
      if (!values.lua_chon_data.some((x) => x.DapAnDung))
        return "Phải có ít nhất 1 đáp án đúng.";
      if (values.lua_chon_data.some((x) => !x.NoiDungLuaChon?.trim()))
        return "Nội dung lựa chọn không được để trống.";
    }

    // sapxeptu
    if (values.LoaiCauHoi === "sapxeptu") {
      const arr = values.tu_sap_xep_data || [];
      if (arr.length < 2) return "Sắp xếp từ cần ít nhất 2 từ.";
      if (arr.some((x) => !x.NoiDungTu?.trim()))
        return "Nội dung từ không được để trống.";
      const orders = arr.map((x) => x.ThuTuDung);
      const uniq = new Set(orders);
      if (uniq.size !== orders.length) return "ThuTuDung không được trùng.";
      if (orders.some((n) => !Number.isFinite(n) || n <= 0))
        return "ThuTuDung phải là số > 0.";
    }

    // khoptu
    if (values.LoaiCauHoi === "khoptu") {
      const arr = values.cap_tu_khop_data || [];
      if (arr.length < 2) return "Khớp từ cần ít nhất 2 cặp.";
      if (arr.some((x) => !x.TuBenTrai?.trim() || !x.TuBenPhai?.trim()))
        return "Từ bên trái/bên phải không được để trống.";
      if (!arr.some((x) => x.LaDung))
        return "Phải có ít nhất 1 cặp đúng (LaDung=true).";
    }

    return "";
  };

  /** =========
   *  Upload audio
   *  ========= */
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

  /** =========
   *  Submit
   *  ========= */
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

      // nghe
      if (values.LoaiCauHoi === "nghe") {
        payload.FileNghe_url = values.FileNghe_url || null;
      }

      // tracnghiem | nghe
      if (values.LoaiCauHoi === "tracnghiem" || values.LoaiCauHoi === "nghe") {
        payload.lua_chon_data = (values.lua_chon_data || []).map((c, i) => ({
          ...c,
          LuaChonID: buildChoiceId(values.IDCauHoi, i + 1),
        }));
      }

      // sapxeptu
      if (values.LoaiCauHoi === "sapxeptu") {
        payload.tu_sap_xep_data = (values.tu_sap_xep_data || []).map(
          (w, i) => ({
            ...w,
            IDTu: buildWordId(values.IDCauHoi, i + 1),
            ThuTuDung: Number(w.ThuTuDung),
          })
        );
      }

      // khoptu
      if (values.LoaiCauHoi === "khoptu") {
        payload.cap_tu_khop_data = (values.cap_tu_khop_data || []).map(
          (p, i) => ({
            ...p,
            IDCapTu: buildPairId(values.IDCauHoi, i + 1),
            LaDung: !!p.LaDung,
          })
        );
      }

      await createQuestion(payload);

      setSuccessMsg("Tạo câu hỏi thành công!");

      // reset giữ lại bài học + loại (giống code cũ)
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
        tu_sap_xep_data: [
          { IDTu: "", NoiDungTu: "", ThuTuDung: 1 },
          { IDTu: "", NoiDungTu: "", ThuTuDung: 2 },
        ],
        cap_tu_khop_data: [
          { IDCapTu: "", TuBenTrai: "", TuBenPhai: "", LaDung: true },
          { IDCapTu: "", TuBenTrai: "", TuBenPhai: "", LaDung: false },
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
              placeholder={
                loadingLessons ? "Đang tải bài học..." : "Chọn bài học"
              }
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

          {/* ===== NGHE ===== */}
          {showAudio && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">
                    File nghe
                  </div>
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
                <div className="text-sm font-semibold text-slate-700">
                  FileNghe_url:
                </div>
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

          {/* ===== LỰA CHỌN (TRẮC NGHIỆM + NGHE) ===== */}
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
                    choicesArr.append({
                      LuaChonID: buildChoiceId(
                        idCauHoi,
                        choicesArr.fields.length + 1
                      ),
                      NoiDungLuaChon: "",
                      DapAnDung: false,
                    })
                  }
                >
                  + Thêm lựa chọn
                </button>
              </div>

              <div className="space-y-3">
                {choicesArr.fields.map((f, idx) => {
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
                              choicesArr.update(i, {
                                ...c,
                                LuaChonID: buildChoiceId(idCauHoi, i + 1),
                                DapAnDung: i === idx ? checked : false,
                              });
                            });
                          }}
                        />
                        <span className="font-semibold text-slate-700">
                          Đúng
                        </span>
                      </div>

                      <button
                        type="button"
                        className="ml-auto mt-auto h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        onClick={() => choicesArr.remove(idx)}
                        disabled={choicesArr.fields.length <= 1}
                      >
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== SẮP XẾP TỪ ===== */}
          {showSortWords && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">
                    Sắp xếp từ
                  </div>
                  <div className="text-sm text-slate-500">
                    IDTu tự sinh theo IDCauHoi: <b>{idCauHoi}</b> • ThuTuDung là
                    thứ tự đúng
                  </div>
                </div>

                <button
                  type="button"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    sortWordsArr.append({
                      IDTu: buildWordId(
                        idCauHoi,
                        sortWordsArr.fields.length + 1
                      ),
                      NoiDungTu: "",
                      ThuTuDung: sortWordsArr.fields.length + 1,
                    })
                  }
                >
                  + Thêm từ
                </button>
              </div>

              <div className="space-y-3">
                {sortWordsArr.fields.map((w, idx) => {
                  const autoId = buildWordId(idCauHoi, idx + 1);

                  return (
                    <div
                      key={w.id}
                      className="grid grid-cols-12 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="col-span-3">
                        <div className="text-sm font-semibold text-slate-600">
                          IDTu
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700">
                          {autoId}
                        </div>
                      </div>

                      <div className="col-span-6">
                        <Input
                          name={`tu_sap_xep_data.${idx}.NoiDungTu`}
                          label={`Từ ${idx + 1}`}
                          placeholder="VD: student"
                          rules={{
                            required: { value: true, message: "Bắt buộc" },
                          }}
                        />
                      </div>

                      <div className="col-span-2">
                        <Input
                          name={`tu_sap_xep_data.${idx}.ThuTuDung`}
                          label="ThuTuDung"
                          placeholder="1"
                          rules={{
                            required: { value: true, message: "Bắt buộc" },
                          }}
                        />
                      </div>

                      <div className="col-span-1 flex items-end justify-end">
                        <button
                          type="button"
                          className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          onClick={() => sortWordsArr.remove(idx)}
                          disabled={sortWordsArr.fields.length <= 2}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-sm text-slate-600">
                Gợi ý: ThuTuDung phải là số duy nhất (không trùng) để backend
                biết thứ tự đúng.
              </div>
            </div>
          )}

          {/* ===== KHỚP TỪ ===== */}
          {showMatchPairs && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-800">
                    Khớp từ
                  </div>
                  <div className="text-sm text-slate-500">
                    IDCapTu tự sinh theo IDCauHoi: <b>{idCauHoi}</b> •
                    LaDung=true là cặp đúng
                  </div>
                </div>

                <button
                  type="button"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    matchPairsArr.append({
                      IDCapTu: buildPairId(
                        idCauHoi,
                        matchPairsArr.fields.length + 1
                      ),
                      TuBenTrai: "",
                      TuBenPhai: "",
                      LaDung: false,
                    })
                  }
                >
                  + Thêm cặp
                </button>
              </div>

              <div className="space-y-3">
                {matchPairsArr.fields.map((p, idx) => {
                  const autoId = buildPairId(idCauHoi, idx + 1);

                  return (
                    <div
                      key={p.id}
                      className="grid grid-cols-12 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="col-span-3">
                        <div className="text-xs font-semibold text-slate-600">
                          IDCapTu
                        </div>
                        <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700">
                          {autoId}
                        </div>
                      </div>

                      <div className="col-span-4">
                        <Input
                          name={`cap_tu_khop_data.${idx}.TuBenTrai`}
                          label="Từ bên trái"
                          placeholder="VD: Hello"
                          rules={{
                            required: { value: true, message: "Bắt buộc" },
                          }}
                        />
                      </div>

                      <div className="col-span-4">
                        <Input
                          name={`cap_tu_khop_data.${idx}.TuBenPhai`}
                          label="Từ bên phải"
                          placeholder="VD: Xin chào"
                          rules={{
                            required: { value: true, message: "Bắt buộc" },
                          }}
                        />
                      </div>

                      <div className="col-span-1 flex items-end gap-2">
                        <div className="flex items-center gap-2 pb-2">
                          <input
                            type="checkbox"
                            className="size-5 cursor-pointer"
                            checked={
                              !!forms.getValues(
                                `cap_tu_khop_data.${idx}.LaDung`
                              )
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              matchPairsArr.update(idx, {
                                ...forms.getValues(`cap_tu_khop_data.${idx}`),
                                IDCapTu: buildPairId(idCauHoi, idx + 1),
                                LaDung: checked,
                              });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                          onClick={() => matchPairsArr.remove(idx)}
                          disabled={matchPairsArr.fields.length <= 2}
                        >
                          Xóa
                        </button>
                      </div>

                      <div className="col-span-12 -mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                          LaDung:{" "}
                          {forms.getValues(`cap_tu_khop_data.${idx}.LaDung`)
                            ? "true"
                            : "false"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-sm text-slate-600">
                Lưu ý: Bạn có thể tạo nhiều cặp “nhiễu” (LaDung=false) để tăng
                độ khó, nhưng phải có ít nhất 1 cặp đúng.
              </div>
            </div>
          )}

          {/* ===== TỰ LUẬN ===== */}
          {loai === "tuluan" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              <div className="text-sm text-slate-600">
                Câu hỏi tự luận: không cần audio, không cần lựa chọn, không cần
                dữ liệu sắp xếp/khớp.
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
