import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

import { http } from "utils/libs/https";
import { Link } from "react-router";

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
    HoTen?: string;
    Email?: string;
  };
};

type ExamQuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string; // tiptap json string
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;
  lua_chon: ExamQuestionChoice[];
};

type ExamChiTiet = {
  IDDeThi: string;
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail: ExamQuestionDetail;
};

type ExamItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  IDGiaoVien: string;
  IDGiaoVien_detail?: TeacherItem;
  chi_tiet: ExamChiTiet[];
  so_cau_hoi: number;
};

/** =======================
 * Helpers
 * ======================= */
function getApiErrorMessage(err: any) {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra.";
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;
  if (Array.isArray(data)) return data[0];
  const firstKey = Object.keys(data)[0];
  const val = data[firstKey];
  if (Array.isArray(val)) return val[0];
  if (typeof val === "string") return val;
  return "Có lỗi xảy ra.";
}

function tiptapToText(input: any): string {
  if (input == null) return "";
  const raw = typeof input === "string" ? input : JSON.stringify(input);

  if (!raw.trim().startsWith("{") && !raw.trim().startsWith("[")) return raw;

  try {
    const doc = typeof input === "string" ? JSON.parse(input) : input;
    const out: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type === "text" && typeof node.text === "string") out.push(node.text);
      if (node.content) walk(node.content);
    };
    walk(doc);
    const text = out.join(" ").replace(/\s+/g, " ").trim();
    return text || "(Không có nội dung)";
  } catch {
    return raw;
  }
}

function timeToMinutesLabel(hms: string) {
  const parts = (hms || "").split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return hms;
  const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  const totalMin = Math.round(hh * 60 + mm + ss / 60);
  return `${totalMin} phút`;
}

function typeLabel(t: string) {
  if (t === "nghe") return "Nghe";
  if (t === "tracnghiem") return "Trắc nghiệm";
  if (t === "tuluan") return "Tự luận";
  return t || "-";
}

/** =======================
 * API (inline)
 * ======================= */
async function getExams() {
  const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/");
  return res.data;
}
async function deleteExam(id: string) {
  const res = await http.delete(`/api/exams/de-thi/${id}/`);
  return res.data;
}
async function getTeachers() {
  const res = await http.get<PaginatedRes<TeacherItem>>("/api/auth/teachers/");
  return res.data;
}

/** =======================
 * Page
 * ======================= */
type FormValues = {
  teacher: string; // GiaoVienID
  search: string;
};

export default function ExamsTwoColumnsPage(): JSX.Element {
  const forms = useForm<FormValues>({
    defaultValues: {
      teacher: "",
      search: "",
    },
  });

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedExamId, setSelectedExamId] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const [exData, tData] = await Promise.all([getExams(), getTeachers()]);
        if (!mounted) return;
        const list = exData.results ?? [];
        setExams(list);
        setTeachers(tData.results ?? []);

        if (list.length > 0) setSelectedExamId(list[0].IDDeThi);
      } catch (err: any) {
        if (!mounted) return;
        setErrMsg(getApiErrorMessage(err));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const teacherOptions = useMemo(() => {
    return [
      { label: "Tất cả giáo viên", value: "" },
      ...(teachers || []).map((t) => {
        const name = t?.TaiKhoan_detail?.HoTen || t.GiaoVienID;
        const email = t?.TaiKhoan_detail?.Email;
        return {
          label: email ? `${name} • ${email}` : name,
          value: t.GiaoVienID,
        };
      }),
    ];
  }, [teachers]);

  const selectedTeacher = forms.watch("teacher") || "";
  const keyword = (forms.watch("search") || "").trim().toLowerCase();

  const filteredExams = useMemo(() => {
    return (exams || [])
      .filter((x) => (selectedTeacher ? x.IDGiaoVien === selectedTeacher : true))
      .filter((x) => {
        if (!keyword) return true;
        const teacherName =
          x.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen ||
          x.IDGiaoVien_detail?.GiaoVienID ||
          x.IDGiaoVien ||
          "";
        const teacherEmail = x.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";

        return (
          x.IDDeThi.toLowerCase().includes(keyword) ||
          (x.TenDeThi || "").toLowerCase().includes(keyword) ||
          teacherName.toLowerCase().includes(keyword) ||
          teacherEmail.toLowerCase().includes(keyword)
        );
      });
  }, [exams, selectedTeacher, keyword]);

  useEffect(() => {
    if (!filteredExams.length) {
      setSelectedExamId("");
      return;
    }
    const exists = filteredExams.some((x) => x.IDDeThi === selectedExamId);
    if (!exists) setSelectedExamId(filteredExams[0].IDDeThi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredExams]);

  const selectedExam = useMemo(() => {
    return filteredExams.find((x) => x.IDDeThi === selectedExamId) || filteredExams[0];
  }, [filteredExams, selectedExamId]);

  const onDelete = async (id: string) => {
    const ok = window.confirm("Sếp có chắc muốn xóa đề thi này không?");
    if (!ok) return;

    setDeletingId(id);
    setErrMsg(null);
    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((x) => x.IDDeThi !== id));

      if (selectedExamId === id) {
        const next = filteredExams.find((x) => x.IDDeThi !== id);
        setSelectedExamId(next?.IDDeThi || "");
      }
    } catch (err: any) {
      setErrMsg(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Danh sách đề kiểm tra">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {errMsg}
          </div>
        ) : null}

        {/* FILTER BAR */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xl font-bold text-slate-800">Bộ lọc</div>
              <div className="mt-1 text-slate-500">
                Chọn giáo viên / tìm theo tên hoặc ID đề thi.
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-90 max-w-full">
                <Input
                  name="search"
                  type="search"
                  label="Tìm kiếm"
                  placeholder="Nhập tên đề thi / ID / giáo viên..."
                  inputClassName="focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="w-90 max-w-full">
                <DropdownSelectPortal
                  name="teacher"
                  label="Giáo viên"
                  placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
                  options={teacherOptions}
                  menuWidth={520}
                  placement="bottom"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-700">
              {filteredExams.length} / {exams.length} đề
            </div>
            {loading ? (
              <div className="text-sm font-semibold text-slate-500">Đang tải...</div>
            ) : null}
          </div>
        </div>

        {/* TWO COLUMNS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT: list exams */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-bold text-slate-800">Bài kiểm tra</div>
                <div className="text-sm font-semibold text-slate-500">
                  {filteredExams.length} đề
                </div>
              </div>

              <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                <div className="space-y-3">
                  {filteredExams.map((exam) => {
                    const active = exam.IDDeThi === selectedExamId;
                    const teacherName =
                      exam.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen || exam.IDGiaoVien;

                    return (
                      <button
                        key={exam.IDDeThi}
                        type="button"
                        onClick={() => setSelectedExamId(exam.IDDeThi)}
                        className={[
                          "w-full text-left rounded-xl border-2 over p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
                          active
                            ? "border-violet-300 bg-white"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-slate-800">
                              {exam.TenDeThi}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">ID: {exam.IDDeThi}</div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                ⏱ {timeToMinutesLabel(exam.ThoiGianLamBaiThi)}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                🧾 {exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0} câu
                              </span>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                👨‍🏫 {teacherName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Link
                              to={`/teacher/exams/${exam.IDDeThi}`}
                              className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                            >
                              Sửa
                            </Link>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(exam.IDDeThi);
                              }}
                              disabled={deletingId === exam.IDDeThi}
                              className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId === exam.IDDeThi ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {!loading && filteredExams.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                      Không có đề thi nào phù hợp.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: details */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              {!selectedExam ? (
                <div className="text-slate-600">Chọn một bài kiểm tra để xem chi tiết câu hỏi.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xl font-bold text-slate-800">{selectedExam.TenDeThi}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">ID:</span> {selectedExam.IDDeThi} •{" "}
                        <span className="font-semibold text-slate-700">Thời gian:</span>{" "}
                        {selectedExam.ThoiGianLamBaiThi} ({timeToMinutesLabel(selectedExam.ThoiGianLamBaiThi)})
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                      {selectedExam.so_cau_hoi ?? selectedExam.chi_tiet?.length ?? 0} câu hỏi
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(selectedExam.chi_tiet || [])
                      .slice()
                      .sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0))
                      .map((ct) => {
                        const q = ct.IDCauHoi_detail;
                        const contentText = tiptapToText(q?.NoiDungCauHoi);

                        return (
                          <div
                            key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-bold text-slate-800">
                                  Câu {ct.ThuTuCauHoi} • {typeLabel(q?.LoaiCauHoi)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {q?.IDCauHoi} • {q?.IDBaiHoc}
                                </div>
                              </div>

                              {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                  🔊 Audio
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2 text-base font-semibold text-slate-800 wrap-break-word">
                              {contentText}
                            </div>

                            {q?.LoaiCauHoi === "nghe" && q?.FileNghe_url ? (
                              <div className="mt-3">
                                <audio controls className="w-full">
                                  <source src={q.FileNghe_url || ""} />
                                </audio>
                              </div>
                            ) : null}

                            {/* ✅ SỬA Ở ĐÂY: HIỂN THỊ LỰA CHỌN CHO CẢ NGHE + TRẮC NGHIỆM */}
                            {q?.LoaiCauHoi !== "tuluan" && q?.lua_chon?.length ? (
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {q.lua_chon.map((c) => (
                                  <div
                                    key={c.LuaChonID}
                                    className={[
                                      "rounded-xl border px-3 py-2 text-sm font-semibold",
                                      c.DapAnDung
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-white text-slate-700",
                                    ].join(" ")}
                                  >
                                    {c.NoiDungLuaChon}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {q?.GiaiThich ? (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                <span className="font-bold">Giải thích:</span> {q.GiaiThich}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                    {!selectedExam.chi_tiet || selectedExam.chi_tiet.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
                        Đề thi này chưa có câu hỏi.
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
