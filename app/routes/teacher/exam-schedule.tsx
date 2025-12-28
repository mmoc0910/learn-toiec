import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Link } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { http } from "utils/libs/https";
import { Modal } from "elements/modal/modal";
import dayjs from "dayjs";

/** =======================
 * Types
 * ======================= */
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ClassItem = {
  IDLopHoc: string;
  TenLopHoc: string;
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
  FileNghe_download_url?: string | null;
  FileHinhAnh_url?: string | null;
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
  chi_tiet: ExamChiTiet[];
  so_cau_hoi: number;
};

type ExamScheduleItem = {
  IDLichThi: string;

  IDDeThi: string;
  IDDeThi_detail?: ExamItem;

  IDLopHoc: string;
  IDLopHoc_detail?: ClassItem;

  ThoiGianBatDau: string; // ISO string (+07:00)
  ThoiGianKetThuc: string; // ISO string (+07:00)
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

function formatDateTime(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function isoToDatetimeLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function datetimeLocalToISO(datetimeLocal: string) {
  const d = new Date(datetimeLocal);
  return d.toISOString();
}

/** =======================
 * API (inline)
 * ======================= */
async function getExamSchedules() {
  const res = await http.get<PaginatedRes<ExamScheduleItem>>("/api/exams/lich-thi/");
  return res.data;
}

async function deleteExamSchedule(id: string) {
  const res = await http.delete(`/api/exams/lich-thi/${id}/`);
  return res.data;
}

async function patchExamSchedule(
  id: string,
  payload: Partial<Pick<ExamScheduleItem, "IDLopHoc" | "ThoiGianBatDau" | "ThoiGianKetThuc">>
) {
  // ✅ PATCH chỉ gửi field muốn sửa
  const res = await http.patch(`/api/exams/lich-thi/${id}/`, payload);
  return res.data;
}

async function getClasses() {
  // ✅ đổi endpoint nếu project sếp khác
  const res = await http.get<PaginatedRes<ClassItem>>("/api/classes/lop-hoc/");
  return res.data;
}

/** =======================
 * Page
 * ======================= */
type FilterFormValues = {
  class_id: string;
  search: string;
};

type EditFormValues = {
  class_id: string;
  start_time: string; // datetime-local
  end_time: string; // datetime-local
};

export default function ExamSchedulesTwoColumnsPage(): JSX.Element {
  const forms = useForm<FilterFormValues>({
    defaultValues: { class_id: "", search: "" },
  });

  const editForms = useForm<EditFormValues>({
    defaultValues: { class_id: "", start_time: "", end_time: "" },
    mode: "onSubmit",
  });

  const [schedules, setSchedules] = useState<ExamScheduleItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  // modal edit
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const [scData, classData] = await Promise.all([getExamSchedules(), getClasses()]);
        if (!mounted) return;

        const list = scData.results ?? [];
        setSchedules(list);
        setClasses(classData.results ?? []);

        if (list.length > 0) setSelectedId(list[0].IDLichThi);
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

  const classOptions = useMemo(() => {
    return [
      { label: "Tất cả lớp", value: "" },
      ...(classes || []).map((c) => ({
        label: c.TenLopHoc || c.IDLopHoc,
        value: c.IDLopHoc,
      })),
    ];
  }, [classes]);

  const selectedClass = forms.watch("class_id") || "";
  const keyword = (forms.watch("search") || "").trim().toLowerCase();

  const filteredSchedules = useMemo(() => {
    return (schedules || [])
      .filter((x) => (selectedClass ? x.IDLopHoc === selectedClass : true))
      .filter((x) => {
        if (!keyword) return true;

        const examName = x.IDDeThi_detail?.TenDeThi || "";
        const className = x.IDLopHoc_detail?.TenLopHoc || "";
        return (
          x.IDLichThi.toLowerCase().includes(keyword) ||
          (x.IDDeThi || "").toLowerCase().includes(keyword) ||
          (x.IDLopHoc || "").toLowerCase().includes(keyword) ||
          examName.toLowerCase().includes(keyword) ||
          className.toLowerCase().includes(keyword)
        );
      });
  }, [schedules, selectedClass, keyword]);

  useEffect(() => {
    if (!filteredSchedules.length) {
      setSelectedId("");
      return;
    }
    const exists = filteredSchedules.some((x) => x.IDLichThi === selectedId);
    if (!exists) setSelectedId(filteredSchedules[0].IDLichThi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSchedules]);

  const selectedSchedule = useMemo(() => {
    return filteredSchedules.find((x) => x.IDLichThi === selectedId) || filteredSchedules[0];
  }, [filteredSchedules, selectedId]);

  const onDelete = async (id: string) => {
    const ok = window.confirm("Sếp có chắc muốn xóa lịch thi này không?");
    if (!ok) return;

    setDeletingId(id);
    setErrMsg(null);
    try {
      await deleteExamSchedule(id);
      setSchedules((prev) => prev.filter((x) => x.IDLichThi !== id));

      if (selectedId === id) {
        const next = filteredSchedules.find((x) => x.IDLichThi !== id);
        setSelectedId(next?.IDLichThi || "");
      }
    } catch (err: any) {
      setErrMsg(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (item: ExamScheduleItem) => {
    setEditErr(null);
    setEditingId(item.IDLichThi);

    editForms.reset({
      class_id: item.IDLopHoc || "",
      start_time: isoToDatetimeLocal(item.ThoiGianBatDau),
      end_time: isoToDatetimeLocal(item.ThoiGianKetThuc),
    });

    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingId(null);
    setEditErr(null);
    setSavingEdit(false);
  };

  const onSaveEdit = editForms.handleSubmit(async (values) => {
    if (!editingId) return;

    setSavingEdit(true);
    setEditErr(null);

    try {
      const startMs = new Date(values.start_time).getTime();
      const endMs = new Date(values.end_time).getTime();

      if (!values.start_time || !values.end_time) throw new Error("Vui lòng chọn đủ thời gian.");
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) throw new Error("Thời gian không hợp lệ.");
      if (endMs <= startMs) throw new Error("Kết thúc phải sau bắt đầu.");

      const payload = {
        // ✅ PATCH đúng yêu cầu: sửa IDLop, startdate, enddate
        IDLopHoc: values.class_id,
        ThoiGianBatDau: datetimeLocalToISO(values.start_time),
        ThoiGianKetThuc: datetimeLocalToISO(values.end_time),
      };

      const updated = await patchExamSchedule(editingId, payload);

      // merge local list
      setSchedules((prev) => prev.map((x) => (x.IDLichThi === editingId ? { ...x, ...updated } : x)));

      closeEdit();
    } catch (err: any) {
      setEditErr(getApiErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Danh sách lịch thi">
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
              <div className="mt-1 text-slate-500">Chọn lớp / tìm theo lịch thi, đề thi.</div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-90 max-w-full">
                <Input
                  name="search"
                  type="search"
                  label="Tìm kiếm"
                  placeholder="Nhập tên đề / ID lịch thi / ID lớp..."
                  inputClassName="focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="w-90 max-w-full">
                <DropdownSelectPortal
                  name="class_id"
                  label="Lớp học"
                  placeholder={loading ? "Đang tải..." : "Chọn lớp"}
                  options={classOptions}
                  menuWidth={520}
                  placement="bottom"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-700">
              {filteredSchedules.length} / {schedules.length} lịch
            </div>
            {loading ? <div className="text-sm font-semibold text-slate-500">Đang tải...</div> : null}
          </div>
        </div>

        {/* TWO COLUMNS */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* LEFT: list schedules */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-bold text-slate-800">Lịch thi</div>
                <div className="text-sm font-semibold text-slate-500">{filteredSchedules.length} lịch</div>
              </div>

              <div className="max-h-[70vh] overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
                <div className="space-y-3">
                  {filteredSchedules.map((it) => {
                    const active = it.IDLichThi === selectedId;
                    const examName = it.IDDeThi_detail?.TenDeThi || it.IDDeThi;
                    const className = it.IDLopHoc_detail?.TenLopHoc || it.IDLopHoc;

                    return (
                      <button
                        key={it.IDLichThi}
                        type="button"
                        onClick={() => setSelectedId(it.IDLichThi)}
                        className={[
                          "w-full text-left rounded-xl border-2 p-4 transition shadow-[0_4px_0_0_rgba(143,156,173,0.15)]",
                          active ? "border-violet-300 bg-white" : "border-slate-200 bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-bold text-slate-800">{examName}</div>
                            <div className="mt-1 text-xs text-slate-500">IDLichThi: {it.IDLichThi}</div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                🏫 {className}
                              </span>

                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                🕒 {dayjs(it.ThoiGianBatDau).format('DD/MM/YYYY HH:MM')} → {dayjs(it.ThoiGianKetThuc).format('DD/MM/YYYY HH:MM')}
                                {/* 🕒 {formatDateTime(it.ThoiGianBatDau)} → {formatDateTime(it.ThoiGianKetThuc)} */}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(it);
                              }}
                              className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                            >
                              Sửa
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(it.IDLichThi);
                              }}
                              disabled={deletingId === it.IDLichThi}
                              className="h-10 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId === it.IDLichThi ? "Đang xóa..." : "Xóa"}
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {!loading && filteredSchedules.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                      Không có lịch thi nào phù hợp.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: details + exam questions */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
              {!selectedSchedule ? (
                <div className="text-slate-600">Chọn một lịch thi để xem chi tiết.</div>
              ) : (
                <>
                  {/* ====== Schedule summary ====== */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xl font-bold text-slate-800">
                        {selectedSchedule.IDDeThi_detail?.TenDeThi || selectedSchedule.IDDeThi}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">IDLichThi:</span> {selectedSchedule.IDLichThi}
                        {" • "}
                        <span className="font-semibold text-slate-700">IDDeThi:</span> {selectedSchedule.IDDeThi}
                        {" • "}
                        <span className="font-semibold text-slate-700">IDLopHoc:</span> {selectedSchedule.IDLopHoc}
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">Lớp:</span>{" "}
                        {selectedSchedule.IDLopHoc_detail?.TenLopHoc || "-"}
                      </div>

                      <div className="mt-2 text-sm text-slate-600">
                        <span className="font-semibold text-slate-700">Thời gian:</span>{" "}
                        {formatDateTime(selectedSchedule.ThoiGianBatDau)} → {formatDateTime(selectedSchedule.ThoiGianKetThuc)}
                      </div>

                      {selectedSchedule.IDDeThi_detail?.ThoiGianLamBaiThi ? (
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">Thời lượng làm bài:</span>{" "}
                          {selectedSchedule.IDDeThi_detail.ThoiGianLamBaiThi} (
                          {timeToMinutesLabel(selectedSchedule.IDDeThi_detail.ThoiGianLamBaiThi)})
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        to={`/teacher/exam-schedules/${selectedSchedule.IDLichThi}`}
                        className="h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
                      >
                        Chi tiết
                      </Link>

                      <button
                        type="button"
                        onClick={() => openEdit(selectedSchedule)}
                        className="h-10 flex items-center justify-center rounded-xl bg-black px-4 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
                      >
                        Sửa lịch
                      </button>
                    </div>
                  </div>

                  {/* ====== Exam details (questions) ====== */}
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-slate-800">Chi tiết đề thi</div>
                        <div className="mt-1 text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">Tên đề:</span>{" "}
                          {selectedSchedule.IDDeThi_detail?.TenDeThi || "-"}
                          {" • "}
                          <span className="font-semibold text-slate-700">Thời lượng:</span>{" "}
                          {selectedSchedule.IDDeThi_detail?.ThoiGianLamBaiThi
                            ? `${selectedSchedule.IDDeThi_detail.ThoiGianLamBaiThi} (${timeToMinutesLabel(
                                selectedSchedule.IDDeThi_detail.ThoiGianLamBaiThi
                              )})`
                            : "-"}
                        </div>
                      </div>

                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        {(selectedSchedule.IDDeThi_detail?.so_cau_hoi ??
                          selectedSchedule.IDDeThi_detail?.chi_tiet?.length ??
                          0) + " câu hỏi"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(selectedSchedule.IDDeThi_detail?.chi_tiet || [])
                        .slice()
                        .sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0))
                        .map((ct) => {
                          const q = ct.IDCauHoi_detail;
                          const contentText = tiptapToText(q?.NoiDungCauHoi);

                          return (
                            <div
                              key={`${ct.IDDeThi}-${ct.IDCauHoi}-${ct.ThuTuCauHoi}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
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

                              {/* ✅ hiển thị lựa chọn cho nghe + trắc nghiệm */}
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
                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                  <span className="font-bold">Giải thích:</span> {q.GiaiThich}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}

                      {!selectedSchedule.IDDeThi_detail?.chi_tiet ||
                      selectedSchedule.IDDeThi_detail.chi_tiet.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-600">
                          Đề thi này chưa có câu hỏi.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* EDIT MODAL */}
        <Modal
          open={editOpen}
          onClose={closeEdit}
          title="Sửa lịch thi"
          width={720}
          closeOnOverlayClick={!savingEdit}
          closeOnEsc={!savingEdit}
        >
          <FormProvider {...editForms}>
            {editErr ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
                {editErr}
              </div>
            ) : null}

            <form className="grid grid-cols-2 gap-5" onSubmit={onSaveEdit}>
              <DropdownSelectPortal
                name="class_id"
                label="Lớp học"
                placeholder={loading ? "Đang tải..." : "Chọn lớp"}
                options={(classes || []).map((c) => ({
                  label: c.TenLopHoc || c.IDLopHoc,
                  value: c.IDLopHoc,
                }))}
                menuWidth={520}
                placement="bottom"
                rules={{ required: { value: true, message: "Vui lòng chọn lớp" } }}
                disabled={savingEdit}
                zIndex={1200}
              />

              <div />

              <Input
                name="start_time"
                label="Thời gian bắt đầu"
                type="datetime-local"
                rules={{ required: { value: true, message: "Vui lòng chọn thời gian bắt đầu" } }}
              />

              <Input
                name="end_time"
                label="Thời gian kết thúc"
                type="datetime-local"
                rules={{ required: { value: true, message: "Vui lòng chọn thời gian kết thúc" } }}
              />

              <div className="col-span-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={savingEdit}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={savingEdit}
                  className="h-10 rounded-xl bg-black px-5 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
                >
                  {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </FormProvider>
        </Modal>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
