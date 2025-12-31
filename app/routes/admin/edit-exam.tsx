import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { http } from "utils/libs/https";
import { getLessons, type LessonItem } from "api/lesson-api";
import { getQuestions, type QuestionItem } from "api/question-api";
import { minutesToTimeString } from "utils/helpers/helpers";
import { TiptapViewer } from "components/tiptap-viewer";

/** =======================
 * Types
 * ======================= */
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: {
    IDTaiKhoan: string;
    Email: string;
    HoTen: string;
  };
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;

  lua_chon?: { LuaChonID: string; NoiDungLuaChon: string; DapAnDung: boolean }[];
  tu_sap_xep?: { IDTu: string; NoiDungTu: string; ThuTuDung: number }[];
  cap_tu_khop?: { IDCapTu: string; TuBenTrai: string; TuBenPhai: string; LaDung: boolean }[];
};

type ExamChiTiet = {
  IDDeThi: string;
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail?: ExamQuestionDetail;
};

type ExamDetail = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  IDGiaoVien: string;
  IDGiaoVien_detail?: TeacherItem;
  chi_tiet?: ExamChiTiet[];
  so_cau_hoi?: number;
};

type FormValues = {
  // core
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // minutes input
  IDGiaoVien: string;

  // UI filters (client only)
  IDBaiHocFilter: string;
  LoaiFilter: "" | "nghe" | "tracnghiem" | "tuluan" | "sapxeptu" | "khoptu";
  Search: string;
};

/** =======================
 * Helpers
 * ======================= */
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

function labelLoai(loai: string) {
  if (loai === "nghe") return "Nghe";
  if (loai === "tracnghiem") return "Trắc nghiệm";
  if (loai === "tuluan") return "Tự luận";
  if (loai === "sapxeptu") return "Sắp xếp từ";
  if (loai === "khoptu") return "Khớp từ";
  return loai || "-";
}

function timeToMinutes(hms: string): string {
  // "HH:MM:SS" -> minutes string
  const parts = (hms || "").split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return "60";
  const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  const totalMin = Math.round(hh * 60 + mm + ss / 60);
  return `${totalMin}`;
}

function safeParseTipTap(raw: any) {
  if (!raw) return { type: "doc", content: [{ type: "paragraph" }] };
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: raw }] }],
      };
    }
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function tiptapToText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(tiptapToText).join("");
  if (typeof node === "object") {
    if (typeof node.text === "string") return node.text;
    if (node.content) return tiptapToText(node.content);
  }
  return "";
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function askHowMany(max: number) {
  const raw = window.prompt(
    `Sếp muốn random bao nhiêu câu? (1 - ${max})`,
    `${Math.min(10, max)}`
  );
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    window.alert("Vui lòng nhập số nguyên dương.");
    return null;
  }
  if (n > max) {
    window.alert(`Số câu random không được vượt quá ${max}.`);
    return null;
  }
  return n;
}

/** =======================
 * API
 * ======================= */
async function getTeachers() {
  const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
  return res.data;
}

async function getExamDetail(id: string) {
  const res = await http.get<ExamDetail>(`/api/exams/de-thi/${id}/`);
  return res.data;
}

async function patchExam(id: string, payload: any) {
  const res = await http.patch(`/api/exams/de-thi/${id}/`, payload);
  return res.data;
}

/** =======================
 * Page
 * ======================= */
export default function EditExamPage() {
  const navigate = useNavigate();
  const params = useParams();

  const examIdFromUrl = (params as any)?.IDDeThi || (params as any)?.id || "";

  const forms = useForm<FormValues>({
    defaultValues: {
      IDDeThi: examIdFromUrl || "",
      TenDeThi: "",
      ThoiGianLamBaiThi: "60",
      IDGiaoVien: "",

      IDBaiHocFilter: "",
      LoaiFilter: "",
      Search: "",
    },
  });

  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const idBaiHocFilter = forms.watch("IDBaiHocFilter");
  const loaiFilter = forms.watch("LoaiFilter");
  const search = forms.watch("Search");

  /** ===== load lessons ===== */
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

  /** ===== load teachers ===== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingTeachers(true);
        const t = await getTeachers();
        if (!mounted) return;
        setTeachers(t.results || []);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoadingTeachers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** ===== load questions ===== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingQuestions(true);
        const data = await getQuestions();
        if (!mounted) return;
        setQuestions(data.results || []);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoadingQuestions(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** ===== load exam detail ===== */
  useEffect(() => {
    if (!examIdFromUrl) {
      setErrorMsg("Thiếu IDDeThi trong URL.");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingDetail(true);
        setErrorMsg("");
        setSuccessMsg("");

        const data = await getExamDetail(examIdFromUrl);
        if (!mounted) return;

        const preSelected = new Set<string>((data.chi_tiet || []).map((x) => x.IDCauHoi));
        setSelectedIds(preSelected);

        forms.reset({
          ...forms.getValues(),
          IDDeThi: data.IDDeThi || examIdFromUrl,
          TenDeThi: data.TenDeThi || "",
          ThoiGianLamBaiThi: timeToMinutes(data.ThoiGianLamBaiThi),
          IDGiaoVien: data.IDGiaoVien || "",
        });
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
  }, [examIdFromUrl]);

  /** ===== options ===== */
  const lessonOptions = useMemo(
    () => [
      { label: "Tất cả bài học", value: "" },
      ...lessons.map((l) => ({
        label: l.TenBaiHoc || l.IDBaiHoc,
        value: l.IDBaiHoc,
      })),
    ],
    [lessons]
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((t) => ({
        label: t?.TaiKhoan_detail?.HoTen
          ? `${t.TaiKhoan_detail.HoTen} (ID: ${t.GiaoVienID})`
          : t.GiaoVienID,
        value: t.GiaoVienID,
      })),
    [teachers]
  );

  const typeOptions = useMemo(
    () => [
      { label: "Tất cả loại", value: "" },
      { label: "Nghe", value: "nghe" },
      { label: "Trắc nghiệm", value: "tracnghiem" },
      { label: "Tự luận", value: "tuluan" },
      { label: "Sắp xếp từ", value: "sapxeptu" },
      { label: "Khớp từ", value: "khoptu" },
    ],
    []
  );

  /** ===== filter questions (client) ===== */
  const filteredQuestions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();

    return (questions || []).filter((item) => {
      if (idBaiHocFilter && item.IDBaiHoc !== idBaiHocFilter) return false;
      if (loaiFilter && item.LoaiCauHoi !== loaiFilter) return false;

      if (!q) return true;

      const content =
        typeof item.NoiDungCauHoi === "string"
          ? item.NoiDungCauHoi
          : tiptapToText(item.NoiDungCauHoi);

      const haystack = `${item.IDCauHoi} ${item.IDBaiHoc} ${item.LoaiCauHoi} ${content}`
        .toLowerCase()
        .trim();

      return haystack.includes(q);
    });
  }, [questions, idBaiHocFilter, loaiFilter, search]);

  /** ===== selection ===== */
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredQuestions.forEach((x) => next.add(x.IDCauHoi));
      return next;
    });
  };

  const clearAll = () => setSelectedIds(new Set());

  const randomFromFiltered = () => {
    if (!filteredQuestions.length) {
      window.alert("Không có câu hỏi nào trong bộ lọc hiện tại để random.");
      return;
    }
    const n = askHowMany(filteredQuestions.length);
    if (n == null) return;

    const randomPicked = shuffle(filteredQuestions).slice(0, n).map((x) => x.IDCauHoi);
    setSelectedIds(new Set(randomPicked));
  };

  /** ===== submit ===== */
  const validateBeforeSubmit = (values: FormValues) => {
    if (!values.IDDeThi?.trim()) return "Thiếu ID đề thi.";
    if (!values.TenDeThi?.trim()) return "Vui lòng nhập tên đề thi.";
    if (!values.ThoiGianLamBaiThi?.trim()) return "Vui lòng nhập thời gian.";
    if (!values.IDGiaoVien?.trim()) return "Vui lòng chọn giáo viên.";
    if (selectedIds.size === 0) return "Vui lòng chọn ít nhất 1 câu hỏi.";
    return "";
  };

  const onSubmit = forms.handleSubmit(async (values) => {
    setErrorMsg("");
    setSuccessMsg("");

    const msg = validateBeforeSubmit(values);
    if (msg) return setErrorMsg(msg);

    try {
      setSubmitting(true);

      const id = (examIdFromUrl || values.IDDeThi).trim();

      const payload: any = {
        IDDeThi: id,
        TenDeThi: values.TenDeThi.trim(),
        ThoiGianLamBaiThi: minutesToTimeString(values.ThoiGianLamBaiThi),
        IDGiaoVien: values.IDGiaoVien.trim(),

        // ✅ thực tế tạo exam đang dùng field này → PATCH kèm theo để update list câu hỏi
        cau_hoi_ids: Array.from(selectedIds),
      };

      await patchExam(id, payload);

      setSuccessMsg("Cập nhật đề thi thành công!");
      navigate("/teacher/exams");
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Sửa đề thi">
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

          {/* ===== Info ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <input type="hidden" {...forms.register("IDDeThi")} />

            <div className="grid grid-cols-2 gap-5">
              <div className="">
                <div className="text-sm font-medium">ID đề thi</div>
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-semibold">
                  {loadingDetail ? "Đang tải..." : examIdFromUrl || "—"}
                </div>
              </div>

              <Input
                name="TenDeThi"
                label="Tên đề thi"
                placeholder="VD: TOEIC Mini Test 01"
                rules={{ required: { value: true, message: "Bắt buộc" } }}
              />

              <Input
                name="ThoiGianLamBaiThi"
                label="Thời gian làm bài (phút)"
                placeholder="VD: 60"
                rules={{
                  required: { value: true, message: "Bắt buộc" },
                  validate: (v: any) => {
                    const n = Number(v);
                    if (!Number.isFinite(n)) return "Vui lòng nhập số phút.";
                    if (!Number.isInteger(n)) return "Vui lòng nhập số nguyên.";
                    if (n <= 0) return "Phải lớn hơn 0.";
                    if (n > 24 * 60) return "Tối đa 1440 phút (24 giờ).";
                    return true;
                  },
                }}
              />

              <DropdownSelectPortal
                name="IDGiaoVien"
                label="Giáo viên"
                placeholder={loadingTeachers ? "Đang tải..." : "Chọn giáo viên"}
                options={teacherOptions}
                menuWidth={420}
                placement="bottom"
                disabled={loadingTeachers || teacherOptions.length === 0}
              />
            </div>
          </div>

          {/* ===== Filters ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-800">Chọn câu hỏi</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">
                  {selectedIds.size} đã chọn
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={randomFromFiltered}
                  className="h-10 rounded-xl bg-black px-4 font-semibold text-white hover:opacity-95 disabled:opacity-60"
                  disabled={filteredQuestions.length === 0}
                >
                  Random câu hỏi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <DropdownSelectPortal
                name="IDBaiHocFilter"
                label="Lọc theo bài học"
                placeholder={loadingLessons ? "Đang tải..." : "Chọn bài học"}
                options={lessonOptions}
                menuWidth={520}
                placement="bottom"
                disabled={loadingLessons}
              />

              <DropdownSelectPortal
                name="LoaiFilter"
                label="Lọc theo loại câu hỏi"
                placeholder="Tất cả loại"
                options={typeOptions}
                menuWidth={260}
                placement="bottom"
              />

              <Input
                name="Search"
                label="Tìm kiếm"
                type="search"
                placeholder="Nhập nội dung / ID câu hỏi..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                disabled={filteredQuestions.length === 0}
              >
                Chọn tất cả (đang lọc)
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                disabled={selectedIds.size === 0}
              >
                Bỏ chọn tất cả
              </button>

              <div className="ml-auto text-sm font-semibold text-slate-600">
                {loadingQuestions ? "Đang tải câu hỏi..." : `${filteredQuestions.length} câu hỏi`}
              </div>
            </div>
          </div>

          {/* ===== Question list ===== */}
          <div className="space-y-3">
            {filteredQuestions.map((q) => {
              const checked = selectedIds.has(q.IDCauHoi);

              // data 2 loại mới (nếu QuestionItem chưa update type)
              const tuSapXep: any[] = (q as any).tu_sap_xep || [];
              const capTuKhop: any[] = (q as any).cap_tu_khop || [];

              const sortedWords = tuSapXep.slice().sort((a, b) => (a.ThuTuDung ?? 0) - (b.ThuTuDung ?? 0));
              const correctSentence = sortedWords.length ? sortedWords.map((w) => w.NoiDungTu).join(" ") : "";

              return (
                <label
                  key={q.IDCauHoi}
                  className={[
                    "block w-full cursor-pointer rounded-2xl border bg-white p-5",
                    "shadow-[0_4px_0_0_rgba(143,156,173,0.2)]",
                    checked ? "border-violet-300 ring-4 ring-violet-100" : "border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      className="mt-1 size-5 cursor-pointer"
                      checked={checked}
                      onChange={() => toggleOne(q.IDCauHoi)}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-bold text-slate-800">{q.IDCauHoi}</div>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {labelLoai(q.LoaiCauHoi)}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {q.IDBaiHoc}
                        </span>
                      </div>

                      <div className="mt-2 font-medium text-slate-700 wrap-break-word">
                        <TiptapViewer content={safeParseTipTap(q.NoiDungCauHoi)} />
                      </div>

                      {/* NGHE */}
                      {q.LoaiCauHoi === "nghe" && q.FileNghe_url ? (
                        <div className="mt-3">
                          <audio controls className="w-full">
                            <source src={q.FileNghe_url} />
                          </audio>
                        </div>
                      ) : null}

                      {/* TRẮC NGHIỆM */}
                      {q.LoaiCauHoi === "tracnghiem" && (q.lua_chon || []).length ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {q.lua_chon.map((c) => (
                            <div
                              key={c.LuaChonID}
                              className={[
                                "rounded-xl border px-3 py-2 text-sm font-semibold",
                                c.DapAnDung
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700",
                              ].join(" ")}
                            >
                              {c.NoiDungLuaChon}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* SẮP XẾP TỪ */}
                      {q.LoaiCauHoi === "sapxeptu" && sortedWords.length ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 text-sm font-semibold text-slate-700">Từ cần sắp xếp</div>
                          <div className="flex flex-wrap gap-2">
                            {sortedWords.map((w: any) => (
                              <span
                                key={w.IDTu}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                              >
                                <span className="text-xs font-bold text-slate-500">{w.ThuTuDung}</span>
                                <span className="font-semibold">{w.NoiDungTu}</span>
                              </span>
                            ))}
                          </div>

                          {correctSentence ? (
                            <div className="mt-3 text-sm text-slate-700">
                              <span className="font-semibold text-slate-800">Câu đúng:</span>{" "}
                              <span className="font-semibold">{correctSentence}</span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* KHỚP TỪ */}
                      {q.LoaiCauHoi === "khoptu" && capTuKhop.length ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 text-sm font-semibold text-slate-700">Cặp từ khớp</div>

                          <div className="grid gap-2">
                            {capTuKhop.map((p: any) => (
                              <div
                                key={p.IDCapTu}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="min-w-0 flex-1 text-slate-800">
                                  <span className="font-semibold">{p.TuBenTrai}</span>
                                  <span className="mx-2 text-slate-400">→</span>
                                  <span className="font-semibold">{p.TuBenPhai}</span>
                                </div>
                                <span className={p.LaDung ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                                  {p.LaDung ? "✅ Đúng" : "Sai"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}

            {!loadingQuestions && filteredQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                Không có câu hỏi phù hợp bộ lọc.
              </div>
            ) : null}
          </div>

          {/* ===== Submit ===== */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/teacher/exams")}
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

//-------------------------------------------------------------

// import React, { useEffect, useMemo, useState } from "react";
// import { FormProvider, useFieldArray, useForm } from "react-hook-form";
// import { useNavigate, useParams } from "react-router";

// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// import { http } from "utils/libs/https";
// import { getLessons, type LessonItem } from "api/lesson-api";
// import { uploadAudio } from "api/question-api";
// import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";

// type ApiChoice = {
//   LuaChonID: string;
//   CauHoiID?: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean;
// };

// type QuestionDetailResponse = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: any; // string JSON tiptap
//   LoaiCauHoi: "nghe" | "tracnghiem" | "tuluan" | string;
//   GiaiThich: string | null;

//   FileNghe: string | null;
//   FileNghe_url: string | null;
//   FileNghe_download_url?: string | null;

//   lua_chon: ApiChoice[] | null;
// };

// type ChoiceForm = {
//   LuaChonID: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean;
// };

// type FormValues = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: any;
//   LoaiCauHoi: "nghe" | "tracnghiem" | "tuluan";
//   GiaiThich?: string;
//   FileNghe_url?: string;

//   lua_chon_data: ChoiceForm[];
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

// function safeParseTipTap(raw: any) {
//   if (!raw) return "";
//   if (typeof raw === "object") return raw;
//   if (typeof raw === "string") {
//     try {
//       return JSON.parse(raw);
//     } catch {
//       return raw;
//     }
//   }
//   return "";
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

// function normalizeLoai(raw: any): "nghe" | "tracnghiem" | "tuluan" {
//   const s = String(raw ?? "").trim().toLowerCase();
//   if (s === "nghe") return "nghe";
//   if (s === "tuluan" || s === "tu_luan") return "tuluan";
//   if (s === "tracnghiem" || s === "trac_nghiem") return "tracnghiem";
//   // fallback
//   return "tracnghiem";
// }

// function ensureAtLeast2Choices(idCauHoi: string, arr?: ChoiceForm[] | null): ChoiceForm[] {
//   const base = (arr || []).map((c, i) => ({
//     LuaChonID: c.LuaChonID || buildChoiceId(idCauHoi, i + 1),
//     NoiDungLuaChon: c.NoiDungLuaChon ?? "",
//     DapAnDung: !!c.DapAnDung,
//   }));

//   if (base.length >= 2) return base;

//   const need = 2 - base.length;
//   const add: ChoiceForm[] = Array.from({ length: need }).map((_, k) => {
//     const idx = base.length + k + 1;
//     return {
//       LuaChonID: buildChoiceId(idCauHoi, idx),
//       NoiDungLuaChon: idx === 1 ? "A" : idx === 2 ? "B" : "",
//       DapAnDung: idx === 1,
//     };
//   });

//   return [...base, ...add];
// }

// async function getQuestionDetail(id: string) {
//   const res = await http.get<QuestionDetailResponse>(`/api/lessons/cau-hoi/${id}/`);
//   return res.data;
// }

// async function patchQuestion(id: string, payload: any) {
//   return http.patch(`/api/lessons/cau-hoi/${id}/`, payload);
// }

// export default function EditQuestionPage() {
//   const navigate = useNavigate();
//   const params = useParams();
//   const idFromUrl = (params as any)?.IDCauHoi || (params as any)?.id || "";

//   const forms = useForm<FormValues>({
//     defaultValues: {
//       IDCauHoi: idFromUrl,
//       IDBaiHoc: "",
//       NoiDungCauHoi: "",
//       LoaiCauHoi: "tracnghiem",
//       GiaiThich: "",
//       FileNghe_url: "",
//       lua_chon_data: [
//         { LuaChonID: buildChoiceId(idFromUrl, 1), NoiDungLuaChon: "A", DapAnDung: true },
//         { LuaChonID: buildChoiceId(idFromUrl, 2), NoiDungLuaChon: "B", DapAnDung: false },
//       ],
//     },
//   });

//   const { fields, append, remove, update, replace } = useFieldArray({
//     control: forms.control,
//     name: "lua_chon_data",
//   });

//   const idCauHoi = forms.watch("IDCauHoi");
//   const loai = forms.watch("LoaiCauHoi");
//   const fileUrl = forms.watch("FileNghe_url");

//   // ✅ nghe vẫn có lựa chọn
//   const showChoices = loai === "tracnghiem" || loai === "nghe";
//   const showAudio = loai === "nghe";

//   const [lessons, setLessons] = useState<LessonItem[]>([]);
//   const [loadingLessons, setLoadingLessons] = useState(false);

//   const [loadingDetail, setLoadingDetail] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [uploading, setUploading] = useState(false);

//   const [errorMsg, setErrorMsg] = useState("");
//   const [successMsg, setSuccessMsg] = useState("");

//   // lessons
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

//   // ✅ load detail (CHỐT: map lua_chon -> lua_chon_data + replace để render)
//   useEffect(() => {
//     if (!idFromUrl) {
//       setErrorMsg("Thiếu IDCauHoi trong URL.");
//       return;
//     }

//     let mounted = true;
//     (async () => {
//       setErrorMsg("");
//       setSuccessMsg("");
//       try {
//         setLoadingDetail(true);

//         const data = await getQuestionDetail(idFromUrl);
//         if (!mounted) return;

//         const normalizedLoai = normalizeLoai(data.LoaiCauHoi);

//         const mappedChoices: ChoiceForm[] = (data.lua_chon || []).map((c, i) => ({
//           LuaChonID: c.LuaChonID || buildChoiceId(data.IDCauHoi, i + 1),
//           NoiDungLuaChon: c.NoiDungLuaChon ?? "",
//           DapAnDung: !!c.DapAnDung,
//         }));

//         // ✅ nghe cũng cần choices, nếu API rỗng thì bơm A/B
//         const finalChoices =
//           normalizedLoai === "nghe" || normalizedLoai === "tracnghiem"
//             ? ensureAtLeast2Choices(data.IDCauHoi, mappedChoices)
//             : mappedChoices;

//         // ✅ reset
//         forms.reset({
//           IDCauHoi: data.IDCauHoi || idFromUrl,
//           IDBaiHoc: data.IDBaiHoc || "",
//           NoiDungCauHoi: safeParseTipTap(data.NoiDungCauHoi),
//           LoaiCauHoi: normalizedLoai,
//           GiaiThich: data.GiaiThich ?? "",
//           FileNghe_url: data.FileNghe_url ?? "",
//           lua_chon_data: finalChoices,
//         });

//         // ✅ QUAN TRỌNG: replace để fieldArray render ra UI
//         replace(finalChoices);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrorMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoadingDetail(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [idFromUrl]);

//   // ✅ nếu user đổi sang nghe/trắc nghiệm mà đang không có choices => bơm A/B
//   useEffect(() => {
//     if (!showChoices) return;
//     const current = forms.getValues("lua_chon_data") || [];
//     if (current.length >= 2) return;
//     const seed = ensureAtLeast2Choices(idCauHoi, current);
//     replace(seed);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [showChoices, idCauHoi]);

//   // ✅ sync LuaChonID theo IDCauHoi
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

//   const validateBeforeSubmit = (values: FormValues) => {
//     if (!values.IDCauHoi?.trim()) return "Thiếu IDCauHoi.";
//     if (!values.IDBaiHoc) return "Vui lòng chọn bài học.";

//     const content = normalizeEditorValue(values.NoiDungCauHoi);
//     if (!content.trim()) return "Vui lòng nhập nội dung câu hỏi.";

//     if (values.LoaiCauHoi === "nghe") {
//       if (!values.FileNghe_url) return "Câu hỏi nghe cần file audio (FileNghe_url).";
//     }

//     if (values.LoaiCauHoi === "nghe" || values.LoaiCauHoi === "tracnghiem") {
//       const arr = values.lua_chon_data || [];
//       if (arr.length < 2) return "Cần ít nhất 2 lựa chọn.";
//       if (!arr.some((x) => x.DapAnDung)) return "Phải có ít nhất 1 đáp án đúng.";
//       if (arr.some((x) => !x.NoiDungLuaChon?.trim())) return "Nội dung lựa chọn không được để trống.";
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

//     const id = values.IDCauHoi.trim();

//     try {
//       setSubmitting(true);

//       const payload: any = {
//         IDCauHoi: id,
//         IDBaiHoc: values.IDBaiHoc,
//         NoiDungCauHoi: normalizeEditorValue(values.NoiDungCauHoi).trim(),
//         LoaiCauHoi: values.LoaiCauHoi,
//         GiaiThich: values.GiaiThich?.trim() ? values.GiaiThich.trim() : null,
//         FileNghe_url: values.LoaiCauHoi === "nghe" ? values.FileNghe_url || null : null,
//       };

//       // ✅ nghe + trắc nghiệm đều gửi choices
//       if (values.LoaiCauHoi === "nghe" || values.LoaiCauHoi === "tracnghiem") {
//         payload.lua_chon_data = (values.lua_chon_data || []).map((c, i) => ({
//           LuaChonID: buildChoiceId(id, i + 1),
//           NoiDungLuaChon: String(c.NoiDungLuaChon ?? "").trim(),
//           DapAnDung: !!c.DapAnDung,
//         }));
//       } else {
//         payload.lua_chon_data = [];
//       }

//       await patchQuestion(id, payload);

//       setSuccessMsg("Cập nhật câu hỏi thành công!");
//       navigate("/teacher/questions");
//     } catch (err: any) {
//       setErrorMsg(getApiErrorMessage(err));
//     } finally {
//       setSubmitting(false);
//     }
//   });

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Sửa câu hỏi">
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

//           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="text-lg font-bold text-slate-800">Thông tin câu hỏi</div>
//               <div className="text-sm font-semibold text-slate-500">
//                 {loadingDetail ? "Đang tải..." : idFromUrl}
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-5">
//               <Input name="IDCauHoi" label="ID Câu hỏi" disabled />

//               <DropdownSelectPortal
//                 name="IDBaiHoc"
//                 label="Bài học"
//                 placeholder={loadingLessons ? "Đang tải..." : "Chọn bài học"}
//                 options={lessonOptions}
//                 menuWidth={520}
//                 placement="bottom"
//                 disabled={loadingLessons || lessonOptions.length === 0}
//                 rules={{ required: { value: true, message: "Bắt buộc" } }}
//               />

//               <div className="col-span-2">
//                 <SimpleEditor
//                   name="NoiDungCauHoi"
//                   label="Nội dung câu hỏi"
//                   rules={{ required: { value: true, message: "Bắt buộc" } }}
//                 />
//               </div>

//               <DropdownSelectPortal
//                 name="LoaiCauHoi"
//                 label="Loại câu hỏi"
//                 placeholder="Chọn loại câu hỏi"
//                 options={questionTypeOptions}
//                 menuWidth={260}
//                 placement="bottom"
//               />

//               <Input name="GiaiThich" label="Giải thích (tuỳ chọn)" placeholder="Nhập giải thích..." />
//             </div>
//           </div>

//           {showAudio && (
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-3">
//               <div className="flex items-center justify-between gap-3">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">File nghe</div>
//                   <div className="text-sm text-slate-500">Chọn file audio → upload → set FileNghe_url.</div>
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

//           {/* ✅ CỰC QUAN TRỌNG: nghe vẫn render choices */}
//           {showChoices && (
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
//               <div className="flex items-center justify-between gap-3">
//                 <div>
//                   <div className="text-lg font-bold text-slate-800">Lựa chọn đáp án</div>
//                   <div className="text-sm text-slate-500">
//                     Loại: <b>{loai}</b> (Nghe cũng có đáp án để học viên chọn)
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
//                           rules={{ required: { value: true, message: "Bắt buộc" } }}
//                         />
//                       </div>

//                       <div className="flex items-center gap-2 pt-8">
//                         <input
//                           type="checkbox"
//                           className="size-5 cursor-pointer"
//                           checked={!!forms.getValues(`lua_chon_data.${idx}.DapAnDung`)}
//                           onChange={(e) => {
//                             const checked = e.target.checked;
//                             const current = forms.getValues("lua_chon_data") || [];
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
//                         disabled={fields.length <= 2}
//                       >
//                         Xóa
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}

//           {loai === "tuluan" && (
//             <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//               <div className="text-sm text-slate-600">
//                 Câu hỏi tự luận: không cần audio và không cần lựa chọn.
//               </div>
//             </div>
//           )}

//           <div className="flex items-center justify-end gap-2">
//             <button
//               type="button"
//               onClick={() => navigate("/teacher/questions")}
//               className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50"
//               disabled={submitting}
//             >
//               Hủy
//             </button>

//             <button
//               type="submit"
//               disabled={submitting || uploading || loadingDetail}
//               className="h-11 rounded-xl bg-black px-6 font-semibold text-white disabled:opacity-60"
//             >
//               {submitting ? "Đang lưu..." : "Lưu thay đổi"}
//             </button>
//           </div>
//         </form>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }
