import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { http } from "utils/libs/https";
import { Modal } from "elements/modal/modal";
import { useAuth } from "hooks/useAuth";

/** =======================
 * API Types (theo response backend)
 * ======================= */
type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: {
    IDTaiKhoan: string;
    Email: string;
    HoTen: string;
    AnhDaiDien: string | null;
    SoDienThoai: number | null;
    NgayTaoTaiKhoan: string;
    TrangThaiTaiKhoan: any | null;
    IDQuyen: number;
    IDQuyen_detail?: {
      IDQuyen: number;
      TenQuyen: string;
    };
  };
};

type LopHocApi = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;

  hoc_vien: Array<{
    LopHocID: string;
    IDHocVien: string;
    IDHocVien_detail: {
      HocVienID: string;
      TaiKhoan_detail: {
        IDTaiKhoan: string;
        Email: string;
        HoTen: string;
        AnhDaiDien: string | null;
        SoDienThoai: number | null;
        NgayTaoTaiKhoan: string;
        TrangThaiTaiKhoan: any | null;
        IDQuyen: number;
      };
    };
  }>;

  so_hoc_vien: number;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** =======================
 * UI Types
 * ======================= */
type ClassId = string;

type ClassItem = {
  id: ClassId; // = IDLopHoc
  name: string; // = TenLopHoc
  semester: string; // backend chưa có
  studentCount: number; // = so_hoc_vien
  avgScore: string; // backend chưa có
  completion: number; // backend chưa có
  pending: number; // backend chưa có
  color: `#${string}`;
};

type ClassListPanelProps = {
  classData: ClassItem[];
  selectedId: ClassId;
  onSelectClass: (id: ClassId) => void;
  onDeleteClass: (id: ClassId) => void;
  onEditClass: (id: ClassId) => void;
  onManage?: () => void;
  keyword: string;
  deletingId?: string | null;
};

/** =======================
 * Helpers
 * ======================= */
function hexToRgba(hex: string, alpha = 0.12): string {
  if (!hex) return `rgba(124, 58, 237, ${alpha})`;
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const full = isShort
    ? normalized
        .split("")
        .map((c) => c + c)
        .join("")
    : normalized;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function colorFromId(id: string): `#${string}` {
  const palette = [
    "#7C3AED",
    "#2563EB",
    "#F59E0B",
    "#0EA5E9",
    "#10B981",
    "#EC4899",
    "#F97316",
    "#6366F1",
  ] as const;

  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ""))
      .join("") || "?"
  );
}

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

const StatPill: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-700">
    {children}
  </span>
);

/** =======================
 * Component: ClassListPanel
 * ======================= */
const ClassListPanel: React.FC<ClassListPanelProps> = ({
  classData,
  selectedId,
  onSelectClass,
  onDeleteClass,
  onEditClass,
  onManage,
  keyword,
  deletingId,
}) => {
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return classData;
    return classData.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [classData, keyword]);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-bold text-slate-800">
            Quản lý lớp học
          </h2>
          <p className="mt-1 text-slate-500">
            Chọn lớp để xem danh sách học viên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-22.5 text-right font-semibold text-slate-700">
            {filtered.length} lớp
          </div>

          <button
            type="button"
            onClick={onManage}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Thêm / quản lý lớp
          </button>
        </div>
      </div>

      <div className="max-h-125 py-3 overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cls) => {
            const isActive = cls.id === selectedId;

            return (
              <div
                key={cls.id}
                className={[
                  "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] transition",
                  isActive
                    ? "border-violet-300 ring-4 ring-violet-100"
                    : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-slate-800 truncate">
                      {cls.name}
                    </div>
                    <div className="text-[13px] text-slate-500 truncate">
                      {cls.id}
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: hexToRgba(cls.color, 0.12),
                      color: cls.color,
                    }}
                  >
                    Lớp
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatPill>👥 {cls.studentCount} HV</StatPill>
                  <StatPill>📈 {cls.avgScore} TB</StatPill>
                  <StatPill>✅ {cls.completion}% HT</StatPill>
                  <StatPill>⏳ {cls.pending} bài đợi</StatPill>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectClass(cls.id)}
                    className="h-10 flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 active:scale-[0.99]"
                  >
                    Xem
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditClass(cls.id)}
                    className="h-10 rounded-xl border border-amber-200 bg-amber-50 px-4 font-semibold text-amber-800 transition hover:bg-amber-100 hover:border-amber-300 active:scale-[0.99]"
                  >
                    Sửa
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteClass(cls.id)}
                    disabled={deletingId === cls.id}
                    className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 transition hover:bg-red-100 hover:border-red-300 active:scale-[0.99] disabled:opacity-60"
                  >
                    {deletingId === cls.id ? "Đang xoá..." : "Xoá"}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              Không tìm thấy lớp phù hợp.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** =======================
 * Page
 * ======================= */
type FormValues = {
  class: string; // value = IDLopHoc
  search_class: string;
  search_student: string;
};

type AddClassForm = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;
};

type EditClassForm = {
  IDLopHoc: string; // readonly (ID để patch)
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;
};

export default function Class(): JSX.Element {
  const { user } = useAuth();
  const forms = useForm<FormValues>({
    defaultValues: { class: "", search_class: "", search_student: "" },
  });

  const addForms = useForm<AddClassForm>({
    defaultValues: { IDLopHoc: "", TenLopHoc: "", MoTa: "", IDGiaoVien: "" },
  });

  const editForms = useForm<EditClassForm>({
    defaultValues: { IDLopHoc: "", TenLopHoc: "", MoTa: "", IDGiaoVien: "" },
  });

  const [rawClasses, setRawClasses] = useState<LopHocApi[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /** ===== Fetch Classes + Teachers ===== */
  async function fetchAll() {
    setLoading(true);
    setErrMsg(null);
    try {
      const [clsRes, tRes] = await Promise.all([
        http.get<Paginated<LopHocApi>>("/api/classes/lop-hoc/"),
        http.get<Paginated<TeacherItem>>("/api/auth/teachers/"),
      ]);
      setRawClasses(
        clsRes.data.results?.filter(
          (item) => item?.IDGiaoVien_detail?.TaiKhoan_detail?.Email === user?.Email
        ) ?? []
      );
      // setRawClasses(clsRes.data.results ?? []);
      setTeachers(tRes.data.results ?? []);
    } catch (e: any) {
      setErrMsg(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, [user]);

  /** ===== Map API -> UI ===== */
  const classData = useMemo<ClassItem[]>(() => {
    return (rawClasses || []).map((c) => ({
      id: c.IDLopHoc,
      name: c.TenLopHoc,
      semester: "-",
      studentCount: c.so_hoc_vien ?? 0,
      avgScore: "-",
      completion: 0,
      pending: 0,
      color: colorFromId(c.IDLopHoc),
    }));
  }, [rawClasses]);

  /** ===== Auto set default selected class ===== */
  useEffect(() => {
    if (!classData.length) return;
    const current = forms.getValues("class");
    if (!current) forms.setValue("class", classData[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classData.length]);

  /** ===== Selected from RHF ===== */
  const selectedId = forms.watch("class") || classData[0]?.id || "";
  const keywordClass = forms.watch("search_class") || "";
  const keywordStudent = forms.watch("search_student") || "";

  const selectedClassUI = useMemo(() => {
    return classData.find((c) => c.id === selectedId) ?? classData[0];
  }, [classData, selectedId]);

  const selectedClassApi = useMemo(() => {
    return rawClasses.find((c) => c.IDLopHoc === selectedId) ?? rawClasses[0];
  }, [rawClasses, selectedId]);

  /** ===== Filter học viên ===== */
  const filteredStudents = useMemo(() => {
    const list = selectedClassApi?.hoc_vien ?? [];
    const q = keywordStudent.trim().toLowerCase();
    if (!q) return list;
    return list.filter((hv) => {
      const tk = hv.IDHocVien_detail?.TaiKhoan_detail;
      const name = tk?.HoTen ?? "";
      const email = tk?.Email ?? hv.IDHocVien ?? "";
      return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
    });
  }, [selectedClassApi, keywordStudent]);

  /** ===== Teachers options ===== */
  const teacherOptions = useMemo(() => {
    return [
      { label: "Chọn giáo viên", value: "" },
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

  /** =======================
   * ADD CLASS (POST)
   * ======================= */
  async function handleAddClass(values: AddClassForm) {
    if (!values.IDLopHoc.trim()) return alert("❗ Vui lòng nhập IDLopHoc");
    if (!values.TenLopHoc.trim()) return alert("❗ Vui lòng nhập TenLopHoc");
    if (!values.IDGiaoVien.trim()) return alert("❗ Vui lòng chọn giáo viên");

    setSaving(true);
    try {
      const payload = {
        IDLopHoc: values.IDLopHoc.trim(),
        TenLopHoc: values.TenLopHoc.trim(),
        MoTa: values.MoTa?.trim() || "",
        IDGiaoVien: values.IDGiaoVien.trim(),
      };

      const res = await http.post<LopHocApi>("/api/classes/lop-hoc/", payload);

      setRawClasses((prev) => [res.data, ...prev]);
      forms.setValue("class", res.data.IDLopHoc);

      addForms.reset({ IDLopHoc: "", TenLopHoc: "", MoTa: "", IDGiaoVien: "" });
      setOpenAdd(false);

      alert("✅ Tạo lớp thành công");
    } catch (e: any) {
      alert(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  /** =======================
   * OPEN EDIT MODAL
   * ======================= */
  function openEditModal(classId: string) {
    const cls = rawClasses.find((c) => c.IDLopHoc === classId);
    if (!cls) return alert("Không tìm thấy lớp để sửa.");

    editForms.reset({
      IDLopHoc: cls.IDLopHoc,
      TenLopHoc: cls.TenLopHoc || "",
      MoTa: cls.MoTa || "",
      IDGiaoVien: cls.IDGiaoVien || "",
    });

    setOpenEdit(true);
  }

  /** =======================
   * EDIT CLASS (PATCH)
   * ======================= */
  async function handleEditClass(values: EditClassForm) {
    const id = values.IDLopHoc?.trim();
    if (!id) return alert("Thiếu IDLopHoc để sửa.");
    if (!values.TenLopHoc.trim()) return alert("❗ Vui lòng nhập TenLopHoc");
    if (!values.IDGiaoVien.trim()) return alert("❗ Vui lòng chọn giáo viên");

    setSavingEdit(true);
    try {
      const payload: Partial<LopHocApi> = {
        // Nếu backend CHO đổi IDLopHoc thì mở dòng này:
        // IDLopHoc: values.IDLopHoc.trim(),
        TenLopHoc: values.TenLopHoc.trim(),
        MoTa: values.MoTa?.trim() || "",
        IDGiaoVien: values.IDGiaoVien.trim(),
      };

      const res = await http.patch<LopHocApi>(
        `/api/classes/lop-hoc/${id}/`,
        payload
      );

      // update list tại chỗ
      setRawClasses((prev) =>
        prev.map((c) => (c.IDLopHoc === id ? { ...c, ...res.data } : c))
      );

      setOpenEdit(false);
      alert("✅ Cập nhật lớp thành công");
    } catch (e: any) {
      alert(getApiErrorMessage(e));
    } finally {
      setSavingEdit(false);
    }
  }

  /** =======================
   * DELETE CLASS (DELETE)
   * ======================= */
  async function handleDeleteClass(id: string) {
    const ok = window.confirm(
      `Sếp có chắc chắn muốn xoá lớp học "${id}" không?\nHành động này KHÔNG thể hoàn tác.`
    );
    if (!ok) return;

    setDeletingId(id);
    try {
      await http.delete(`/api/classes/lop-hoc/${id}/`);

      setRawClasses((prev) => prev.filter((c) => c.IDLopHoc !== id));

      const current = forms.getValues("class");
      if (current === id) {
        const remaining = rawClasses.filter((c) => c.IDLopHoc !== id);
        forms.setValue("class", remaining[0]?.IDLopHoc || "");
      }

      alert("✅ Đã xoá lớp học thành công");
    } catch (e: any) {
      alert(getApiErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  }

  /** ===== Modal footers ===== */
  const addFooter = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setOpenAdd(false)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
        disabled={saving}
      >
        Huỷ
      </button>
      <button
        type="button"
        onClick={addForms.handleSubmit(handleAddClass)}
        className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Đang lưu..." : "Tạo lớp"}
      </button>
    </div>
  );

  const editFooter = (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setOpenEdit(false)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
        disabled={savingEdit}
      >
        Huỷ
      </button>
      <button
        type="button"
        onClick={editForms.handleSubmit(handleEditClass)}
        className="h-10 rounded-xl bg-amber-600 px-4 font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        disabled={savingEdit}
      >
        {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Quản lý lớp học">
        {/* Error banner */}
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errMsg}
          </div>
        ) : null}

        {/* Loading */}
        {loading && classData.length === 0 ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
            Đang tải danh sách lớp...
          </div>
        ) : null}

        {/* Header + switcher */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="m-0 text-base text-slate-500">
              Lớp{" "}
              <span
                className="font-semibold"
                style={{ color: selectedClassUI?.color ?? "#7C3AED" }}
              >
                {selectedClassUI?.name ?? "-"}
              </span>{" "}
              • <span>{selectedClassUI?.id ?? "-"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="font-semibold text-slate-800">Chọn lớp:</label>

            <DropdownSelectPortal
              name="class"
              placeholder="Chọn lớp học"
              options={classData.map((c) => ({ label: c.name, value: c.id }))}
              menuWidth={320}
              placement="bottom"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.studentCount ?? 0}
            </div>
            <div className="text-sm text-slate-500">Tổng học viên</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.avgScore ?? "-"}
            </div>
            <div className="text-sm text-slate-500">Điểm TB lớp</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.completion ?? 0}%
            </div>
            <div className="text-sm text-slate-500">Tỷ lệ hoàn thành</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.pending ?? 0}
            </div>
            <div className="text-sm text-slate-500">Bài tập chưa chấm</div>
          </div>
        </div>

        {/* Search + actions */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <Input
              name="search_class"
              type="search"
              placeholder="Tìm lớp..."
              inputClassName="focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <button
            type="button"
            onClick={() => setOpenAdd(true)}
            className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:bg-violet-700"
          >
            + Thêm lớp
          </button>

          <button
            type="button"
            onClick={fetchAll}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Reload"}
          </button>
        </div>

        {/* List */}
        <ClassListPanel
          classData={classData}
          selectedId={selectedId}
          onSelectClass={(id) => forms.setValue("class", id)}
          onEditClass={(id) => openEditModal(id)}
          onDeleteClass={handleDeleteClass}
          onManage={() => setOpenAdd(true)}
          keyword={keywordClass}
          deletingId={deletingId}
        />

        {/* Students */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-xl font-bold text-slate-800">
              Danh sách học viên ({filteredStudents.length})
            </h2>

            <div className="flex gap-3">
              <Input
                name="search_student"
                type="search"
                placeholder="Tìm học viên..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-225 border-separate border-spacing-0">
              <thead className="bg-slate-50">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-sm [&>th]:font-semibold [&>th]:text-slate-700">
                  <th>Học viên</th>
                  <th>Điểm Listening</th>
                  <th>Điểm Reading</th>
                  <th>Tổng điểm</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-slate-200">
                {filteredStudents.map((hv) => {
                  const tk = hv.IDHocVien_detail?.TaiKhoan_detail;
                  const name = tk?.HoTen ?? hv.IDHocVien;
                  const email = tk?.Email ?? hv.IDHocVien;
                  const initials = getInitials(name);

                  return (
                    <tr
                      key={`${hv.LopHocID}-${hv.IDHocVien}`}
                      className="bg-white hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {name}
                            </div>
                            <div className="text-[13px] text-slate-500">
                              {email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">-</td>
                      <td className="px-4 py-4">-</td>
                      <td className="px-4 py-4">-</td>
                      <td className="px-4 py-4">-</td>
                      <td className="px-4 py-4">-</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-slate-600"
                    >
                      Không có học viên trong lớp này (hoặc không khớp từ khóa).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =======================
         * Modal Add Class
         * ======================= */}
        <FormProvider {...addForms}>
          <Modal
            open={openAdd}
            onClose={() => {
              if (saving) return;
              setOpenAdd(false);
            }}
            title="Thêm lớp học"
            width={720}
            closeOnOverlayClick={!saving}
            closeOnEsc={!saving}
            footer={addFooter}
          >
            <div className="grid grid-cols-1 gap-4">
              <Input
                name="IDLopHoc"
                label="IDLopHoc"
                placeholder="VD: LH00125"
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />
              <Input
                name="TenLopHoc"
                label="TenLopHoc"
                placeholder="VD: TOEIC 0–450 Nền tảng"
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />
              <Input
                name="MoTa"
                label="Mô tả"
                placeholder="Mô tả ngắn..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />
              <DropdownSelectPortal
                name="IDGiaoVien"
                label="Giáo viên"
                placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
                options={teacherOptions}
                menuWidth={520}
                placement="bottom"
                disabled={loading || saving}
                zIndex={12000}
              />
            </div>
          </Modal>
        </FormProvider>

        {/* =======================
         * Modal Edit Class (PATCH)
         * ======================= */}
        <FormProvider {...editForms}>
          <Modal
            open={openEdit}
            onClose={() => {
              if (savingEdit) return;
              setOpenEdit(false);
            }}
            title="Sửa lớp học"
            width={720}
            closeOnOverlayClick={!savingEdit}
            closeOnEsc={!savingEdit}
            footer={editFooter}
          >
            <div className="grid grid-cols-1 gap-4">
              {/* IDLopHoc: readonly vì patch URL theo id */}
              <Input
                name="IDLopHoc"
                label="IDLopHoc"
                placeholder="IDLopHoc"
                inputClassName="focus:ring-4 focus:ring-violet-100"
                // disabled
              />

              <Input
                name="TenLopHoc"
                label="TenLopHoc"
                placeholder="Tên lớp..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />

              <Input
                name="MoTa"
                label="Mô tả"
                placeholder="Mô tả..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />

              <DropdownSelectPortal
                name="IDGiaoVien"
                label="Giáo viên"
                placeholder={loading ? "Đang tải..." : "Chọn giáo viên"}
                options={teacherOptions}
                menuWidth={520}
                placement="bottom"
                disabled={loading || savingEdit}
                zIndex={1200}
              />

              {/* <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                PATCH{" "}
                <span className="font-mono">
                  /api/classes/lop-hoc/{`{IDLopHoc}`}/
                </span>{" "}
                với{" "}
                <span className="font-mono">TenLopHoc, MoTa, IDGiaoVien</span>
              </div> */}
            </div>
          </Modal>
        </FormProvider>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
