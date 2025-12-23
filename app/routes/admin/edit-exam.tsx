import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { http } from "utils/libs/https";
import { getLessons, type LessonItem } from "api/lesson-api";
import { getQuestions, type QuestionItem } from "api/question-api";
import { TiptapViewer } from "components/tiptap-viewer";
import { minutesToTimeString } from "utils/helpers/helpers";

// ===== Types =====
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

type ExamDetailItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  IDGiaoVien: string;
  chi_tiet?: Array<{
    IDCauHoi: string;
    ThuTuCauHoi?: number;
  }>;
  so_cau_hoi?: number;
};

type FormValues = {
  IDDeThi: string; // readonly
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // phút (string)
  IDGiaoVien: string;

  // UI filters (client only)
  IDBaiHocFilter: string;
  LoaiFilter: "" | "nghe" | "tracnghiem" | "tuluan";
  Search: string;
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

function labelLoai(loai: string) {
  if (loai === "nghe") return "Nghe";
  if (loai === "tracnghiem") return "Trắc nghiệm";
  if (loai === "tuluan") return "Tự luận";
  return loai;
}

// TipTap JSON string -> object an toàn
function safeParseTipTap(raw: any) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

// "HH:MM:SS" -> minutes string
function timeStringToMinutes(time?: string | null): string {
  if (!time) return "60";
  // time: "01:00:00" or "00:45:00"
  const parts = time.split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return "60";
  const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  const total = hh * 60 + mm + (ss >= 30 ? 1 : 0);
  return String(total > 0 ? total : 60);
}

export default function EditExamPage() {
  const navigate = useNavigate();
  const params = useParams();
  const examIdFromUrl = (params as any)?.IDDeThi || (params as any)?.id || ""; // tùy route param của sếp

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
  const [exam, setExam] = useState<ExamDetailItem | null>(null);

  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingExam, setLoadingExam] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // checkbox state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const idBaiHocFilter = forms.watch("IDBaiHocFilter");
  const loaiFilter = forms.watch("LoaiFilter");
  const search = forms.watch("Search");

  // ===== Load lessons =====
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

  // ===== Load teachers =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingTeachers(true);
        const res = await http.get<PaginatedRes<TeacherItem>>(
          "/api/auth/teachers/"
        );
        if (!mounted) return;
        setTeachers(res.data.results || []);
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

  // ===== Load ALL questions once (NO server params) =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingQuestions(true);
        const data = await getQuestions(); // ✅ fetch 1 lần
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

  // ===== Load exam detail =====
  useEffect(() => {
    if (!examIdFromUrl) {
      setErrorMsg("Thiếu IDDeThi trong URL.");
      return;
    }

    let mounted = true;
    (async () => {
      setErrorMsg("");
      setSuccessMsg("");
      try {
        setLoadingExam(true);

        // ✅ endpoint theo style của sếp: /api/exams/de-thi/{id}/
        const res = await http.get<ExamDetailItem>(
          `/api/exams/de-thi/${examIdFromUrl}/`
        );

        if (!mounted) return;

        const data = res.data;
        setExam(data);

        // ✅ nhét vào RHF (đây là chỗ fix lỗi thiếu IDDeThi)
        forms.reset({
          IDDeThi: data.IDDeThi || examIdFromUrl,
          TenDeThi: data.TenDeThi || "",
          ThoiGianLamBaiThi: timeStringToMinutes(data.ThoiGianLamBaiThi),
          IDGiaoVien: data.IDGiaoVien || "",

          IDBaiHocFilter: "",
          LoaiFilter: "",
          Search: "",
        });

        // ✅ tick selected từ chi_tiet
        const picked = new Set((data.chi_tiet || []).map((x) => x.IDCauHoi));
        setSelectedIds(picked);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoadingExam(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examIdFromUrl]);

  // ===== Khi đổi filter bài học => không auto clear (edit thường muốn giữ tick)
  // Nếu sếp muốn clear khi đổi bài học filter thì bật lại:
  // useEffect(() => setSelectedIds(new Set()), [idBaiHocFilter]);

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
    ],
    []
  );

  // ✅ Lọc 100% ở client
  const filteredQuestions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (questions || []).filter((item) => {
      if (idBaiHocFilter && item.IDBaiHoc !== idBaiHocFilter) return false;
      if (loaiFilter && item.LoaiCauHoi !== loaiFilter) return false;

      if (!q) return true;

      const raw = item.NoiDungCauHoi;
      const contentStr =
        typeof raw === "string" ? raw : JSON.stringify(raw ?? "");

      const haystack = `${item.IDCauHoi} ${item.IDBaiHoc} ${item.LoaiCauHoi} ${contentStr}`
        .toLowerCase()
        .trim();

      return haystack.includes(q);
    });
  }, [questions, idBaiHocFilter, loaiFilter, search]);

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

  const validateBeforeSubmit = (values: FormValues) => {
    const examId = examIdFromUrl || values.IDDeThi;
    if (!examId?.trim()) return "Thiếu IDDeThi.";
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
    if (msg) {
      setErrorMsg(msg);
      return;
    }

    const examId = examIdFromUrl || values.IDDeThi;

    try {
      setSubmitting(true);

      const payload = {
        IDDeThi: examId, // ✅ luôn chắc chắn có
        TenDeThi: values.TenDeThi.trim(),
        ThoiGianLamBaiThi: minutesToTimeString(values.ThoiGianLamBaiThi), // phút -> HH:MM:SS
        IDGiaoVien: values.IDGiaoVien.trim(),
        cau_hoi_ids: Array.from(selectedIds),
      };

      // ✅ PUT edit
      await http.patch(`/api/exams/de-thi/${examId}/`, payload);

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

          {/* ===== Form info ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold text-slate-800">
                Thông tin đề thi
              </div>
              <div className="text-sm font-semibold text-slate-500">
                {loadingExam ? "Đang tải đề thi..." : exam?.IDDeThi || examIdFromUrl}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* ✅ readonly, vẫn register để UI hiện */}
              <Input
                name="IDDeThi"
                label="ID đề thi"
                placeholder="IDDeThi"
                disabled
              />

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
                  required: { value: true, message: "This field is required!" },
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

          {/* ===== Filters (client only) ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-slate-800">
                Chọn câu hỏi ({selectedIds.size} đã chọn)
              </div>
              <div className="text-sm font-semibold text-slate-600">
                {loadingQuestions
                  ? "Đang tải câu hỏi..."
                  : `${filteredQuestions.length} câu hỏi (đang lọc)`}
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
            </div>
          </div>

          {/* ===== Question list ===== */}
          <div className="space-y-3">
            {filteredQuestions.map((q) => {
              const checked = selectedIds.has(q.IDCauHoi);
              const tiptapObj = safeParseTipTap(q.NoiDungCauHoi);

              return (
                <label
                  key={q.IDCauHoi}
                  className={[
                    "block w-full cursor-pointer rounded-2xl border bg-white p-5",
                    "shadow-[0_4px_0_0_rgba(143,156,173,0.2)]",
                    checked
                      ? "border-violet-300 ring-4 ring-violet-100"
                      : "border-slate-200 hover:bg-slate-50",
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
                        <div className="text-base font-bold text-slate-800">
                          {q.IDCauHoi}
                        </div>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {labelLoai(q.LoaiCauHoi)}
                        </span>

                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {q.IDBaiHoc}
                        </span>
                      </div>

                      <div className="mt-2 font-medium text-slate-700 wrap-break-word">
                        {tiptapObj ? (
                          <TiptapViewer content={tiptapObj} />
                        ) : (
                          <span className="text-slate-500">
                            {typeof q.NoiDungCauHoi === "string"
                              ? q.NoiDungCauHoi
                              : "-"}
                          </span>
                        )}
                      </div>

                      {q.LoaiCauHoi === "nghe" && q.FileNghe_url ? (
                        <div className="mt-3">
                          <audio controls className="w-full">
                            <source src={q.FileNghe_url} />
                          </audio>
                        </div>
                      ) : null}

                      {q.LoaiCauHoi === "tracnghiem" &&
                      (q.lua_chon || []).length ? (
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
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate("/teacher/exams")}
              className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={submitting || loadingTeachers || loadingExam}
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
