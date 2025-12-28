import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { http } from "utils/libs/https";
import { getLessons, type LessonItem } from "api/lesson-api";
import { getQuestions, type QuestionItem } from "api/question-api";
import { createExam, type CreateExamPayload } from "api/exam-api";
import { TiptapViewer } from "components/tiptap-viewer";
import { minutesToTimeString } from "utils/helpers/helpers";
import { useNavigate } from "react-router";

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

type FormValues = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string;
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

// TipTap JSON -> text preview (fallback)
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
  // ✅ yêu cầu: trước khi random phải hỏi muốn random bao nhiêu câu
  const raw = window.prompt(`Sếp muốn random bao nhiêu câu? (1 - ${max})`, `${Math.min(10, max)}`);
  if (raw == null) return null; // cancel
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

export default function CreateExamPage() {
  const navigate = useNavigate();

  const forms = useForm<FormValues>({
    defaultValues: {
      IDDeThi: `dethi_${Date.now()}`,
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

  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // checkbox state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const idBaiHocFilter = forms.watch("IDBaiHocFilter"); // client filter only
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
        const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
        if (!mounted) return;

        const list = res.data.results || [];
        setTeachers(list);

        const cur = forms.getValues("IDGiaoVien");
        if (!cur && list.length) forms.setValue("IDGiaoVien", list[0].GiaoVienID);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Load ALL questions once =====
  useEffect(() => {
    let mounted = true;

    (async () => {
      setErrorMsg("");
      setSuccessMsg("");
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

  // ===== Khi đổi filter bài học => clear tick để tránh chọn nhầm =====
  useEffect(() => {
    setSelectedIds(new Set());
  }, [idBaiHocFilter]);

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

  // ✅ Lọc 100% ở client: bài học + loại + search
  const filteredQuestions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();

    return (questions || []).filter((item) => {
      if (idBaiHocFilter && item.IDBaiHoc !== idBaiHocFilter) return false;
      if (loaiFilter && item.LoaiCauHoi !== loaiFilter) return false;

      if (!q) return true;

      const content =
        typeof item.NoiDungCauHoi === "string" ? item.NoiDungCauHoi : tiptapToText(item.NoiDungCauHoi);

      const haystack = `${item.IDCauHoi} ${item.IDBaiHoc} ${item.LoaiCauHoi} ${content}`
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
    setSelectedIds(new Set(filteredQuestions.map((x) => x.IDCauHoi)));
  };

  const clearAll = () => setSelectedIds(new Set());

  /** =======================
   * ✅ RANDOM LOGIC
   * ======================= */
  const randomFromFiltered = (mode: "replace" | "add") => {
    if (!filteredQuestions.length) {
      window.alert("Không có câu hỏi nào trong bộ lọc hiện tại để random.");
      return;
    }

    const n = askHowMany(filteredQuestions.length);
    if (n == null) return;

    const randomPicked = shuffle(filteredQuestions).slice(0, n).map((x) => x.IDCauHoi);

    setSelectedIds((prev) => {
      if (mode === "replace") return new Set(randomPicked);

      // mode === "add": cộng vào những cái đã tick sẵn
      const next = new Set(prev);
      randomPicked.forEach((id) => next.add(id));
      return next;
    });
  };

  const validateBeforeSubmit = (values: FormValues) => {
    if (!values.IDDeThi?.trim()) return "Vui lòng nhập ID đề thi.";
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

    try {
      setSubmitting(true);

      const payload: CreateExamPayload = {
        IDDeThi: values.IDDeThi.trim(),
        TenDeThi: values.TenDeThi.trim(),
        ThoiGianLamBaiThi: minutesToTimeString(values.ThoiGianLamBaiThi),
        IDGiaoVien: values.IDGiaoVien.trim(),
        cau_hoi_ids: Array.from(selectedIds),
      };

      await createExam(payload);

      setSuccessMsg("Tạo đề thi thành công!");
      setSelectedIds(new Set());

      forms.reset({
        ...forms.getValues(),
        IDDeThi: `dethi_${Date.now()}`,
        TenDeThi: "",
        ThoiGianLamBaiThi: values.ThoiGianLamBaiThi || "60",
      });

      navigate("/teacher/exams");
    } catch (err: any) {
      setErrorMsg(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Tạo đề thi">
        <form onSubmit={onSubmit} className="space-y-5">
          {(errorMsg || successMsg) && (
            <div
              className={[
                "rounded-xl border px-4 py-3 font-semibold",
                errorMsg ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {errorMsg || successMsg}
            </div>
          )}

          {/* ===== Form info ===== */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="grid grid-cols-2 gap-5">
              <Input
                name="IDDeThi"
                label="ID đề thi"
                placeholder="VD: dethi_toeic_01"
                rules={{ required: { value: true, message: "Bắt buộc" } }}
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
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-800">Chọn câu hỏi</div>
                <div className="mt-1 text-sm font-semibold text-slate-600">{selectedIds.size} đã chọn</div>
              </div>

              {/* ✅ Random buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => randomFromFiltered("replace")}
                  className="h-10 rounded-xl bg-black px-4 font-semibold text-white hover:opacity-95 disabled:opacity-60"
                  disabled={filteredQuestions.length === 0}
                  title="Random theo bộ lọc hiện tại và thay thế toàn bộ lựa chọn"
                >
                  Random câu hỏi
                </button>

                {/* <button
                  type="button"
                  onClick={() => randomFromFiltered("add")}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={filteredQuestions.length === 0}
                  title="Random theo bộ lọc hiện tại và cộng thêm vào lựa chọn"
                >
                  Random (cộng thêm)
                </button> */}
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
                        {/* Nếu NoiDungCauHoi là JSON string */}
                        {typeof q.NoiDungCauHoi === "string" ? (
                          <TiptapViewer content={JSON.parse(q.NoiDungCauHoi)} />
                        ) : (
                          <span>{tiptapToText(q.NoiDungCauHoi)}</span>
                        )}
                      </div>

                      {q.LoaiCauHoi === "nghe" && q.FileNghe_url ? (
                        <div className="mt-3">
                          <audio controls className="w-full">
                            <source src={q.FileNghe_url} />
                          </audio>
                        </div>
                      ) : null}

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
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting || loadingTeachers}
              className="h-11 rounded-xl bg-black px-6 font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Đang tạo..." : "Tạo đề thi"}
            </button>
          </div>
        </form>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
