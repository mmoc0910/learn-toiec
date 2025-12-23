import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Input, Table, type Column } from "elements";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { http } from "utils/libs/https";
import EditTeacherModal from "components/edit-teacher-modal";
import { CreateTeacherModal } from "components/create-teacher-modal";

// ===== Types theo response API =====
type QuyenDetail = { IDQuyen: number; TenQuyen: string };

type TaiKhoanDetail = {
  IDTaiKhoan: string;
  Email: string;
  HoTen: string;
  AnhDaiDien: string | null;
  SoDienThoai: number | null;
  NgayTaoTaiKhoan: string;
  TrangThaiTaiKhoan: string | null;
  IDQuyen: number;
  IDQuyen_detail?: QuyenDetail | null;
};

type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: TaiKhoanDetail | null;

  ChuyenMon: string | null;
  KinhNghiem: string | null;
  BangCapChungChi: string | null;
  MoTaBanThan: string | null;
  ThongTinNganHang: string | null;
  TrangThaiLamViec: string | null;
  SoTaiKhoan: number | null;
};

type TeacherListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TeacherItem[];
};

type FormValues = { search: string };

// ===== API =====
async function getTeachers() {
  const res = await http.get<TeacherListResponse>("/api/auth/teachers/");
  return res.data;
}

async function deleteTeacher(giaoVienId: string) {
  return http.delete(`/api/auth/teachers/${giaoVienId}/`);
}

// ===== Helpers =====
function safeStr(v: unknown) {
  if (v == null) return "";
  return String(v);
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return safeStr(iso);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function RoleBadge({ role }: { role: string }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
  if (role === "Giáo Viên")
    return (
      <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
        Giáo Viên
      </span>
    );
  if (role === "Học Viên")
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
      >
        Học Viên
      </span>
    );
  return (
    <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>
      {role || "—"}
    </span>
  );
}

function statusLabel(v: string | null | undefined) {
  switch (v) {
    case "1":
      return {
        text: "Đang làm",
        cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "2":
      return {
        text: "Tạm nghỉ",
        cls: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "3":
      return {
        text: "Nghỉ việc",
        cls: "bg-rose-50 text-rose-700 border-rose-200",
      };
    default:
      return {
        text: "Chưa set",
        cls: "bg-slate-50 text-slate-700 border-slate-200",
      };
  }
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const s = statusLabel(value);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${s.cls}`}
    >
      {s.text}
      {typeof value === "number" ? (
        <span className="ml-2 text-[11px] opacity-70">({value})</span>
      ) : null}
    </span>
  );
}

export default function TeachersPage(): JSX.Element {
  const forms = useForm<FormValues>({ defaultValues: { search: "" } });

  const [openCreate, setOpenCreate] = useState(false);

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | null>(null);

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // deleting states
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const search = forms.watch("search") ?? "";

  const isDeleting = (id: string) => deletingIds.has(id);

  const setDeleting = (id: string, value: boolean) => {
    setDeletingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const openModalEdit = (t: TeacherItem) => {
    setEditing(t);
    setOpenEdit(true);
  };

  const closeModalEdit = () => {
    setOpenEdit(false);
    setEditing(null);
  };

  async function fetchAll() {
    setLoading(true);
    setErrMsg(null);
    try {
      const data = await getTeachers();
      setTeachers(data.results ?? []);
      setSelectedIds([]);
    } catch (e: any) {
      setErrMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Không tải được dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  // ✅ Search client-side
  const filtered = useMemo(() => {
    let list = teachers;
    const kw = search.trim().toLowerCase();
    if (!kw) return list;

    return list.filter((t) => {
      const tk = t.TaiKhoan_detail;
      const role = tk?.IDQuyen_detail?.TenQuyen ?? "";
      const text =
        `${t.GiaoVienID} ${t.TaiKhoan} ${tk?.Email ?? ""} ${tk?.HoTen ?? ""} ${
          tk?.SoDienThoai ?? ""
        } ${role} ${tk?.NgayTaoTaiKhoan ?? ""} ${t.ChuyenMon ?? ""} ${
          t.KinhNghiem ?? ""
        } ${t.BangCapChungChi ?? ""} ${t.TrangThaiLamViec ?? ""} ${
          t.SoTaiKhoan ?? ""
        } ${t.ThongTinNganHang ?? ""}`.toLowerCase();

      return text.includes(kw);
    });
  }, [teachers, search]);

  // ✅ xoá 1
  async function handleDeleteOne(item: TeacherItem) {
    const id = item.GiaoVienID;
    if (bulkDeleting || isDeleting(id)) return;

    const ok = window.confirm(`Bạn có chắc muốn xoá giáo viên: ${id} không?`);
    if (!ok) return;

    setDeleting(id, true);
    try {
      await deleteTeacher(id);

      setTeachers((prev) => prev.filter((x) => x.GiaoVienID !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Xoá giáo viên thất bại"
      );
    } finally {
      setDeleting(id, false);
    }
  }

  // ✅ xoá nhiều
  async function handleBulkDelete() {
    if (bulkDeleting) return;
    if (selectedIds.length === 0) return;

    const ok = window.confirm(
      `Bạn có chắc muốn xoá ${selectedIds.length} giáo viên đã chọn không?`
    );
    if (!ok) return;

    setBulkDeleting(true);
    selectedIds.forEach((id) => setDeleting(id, true));

    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) => deleteTeacher(id))
      );

      const successIds: string[] = [];
      const failed: { id: string; reason: any }[] = [];

      results.forEach((r, idx) => {
        const id = selectedIds[idx];
        if (r.status === "fulfilled") successIds.push(id);
        else failed.push({ id, reason: r.reason });
      });

      if (successIds.length > 0) {
        setTeachers((prev) =>
          prev.filter((t) => !successIds.includes(t.GiaoVienID))
        );
        setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)));
      }

      if (failed.length > 0) {
        const msg =
          `Xoá thất bại ${failed.length} giáo viên:\n` +
          failed
            .slice(0, 10)
            .map(
              (x) =>
                `- ${x.id}: ${
                  x.reason?.response?.data?.detail ||
                  x.reason?.response?.data?.message ||
                  x.reason?.message ||
                  "Lỗi"
                }`
            )
            .join("\n") +
          (failed.length > 10 ? `\n... và ${failed.length - 10} lỗi khác` : "");
        alert(msg);
      }
    } finally {
      selectedIds.forEach((id) => setDeleting(id, false));
      setBulkDeleting(false);
    }
  }

  const columns: Column<TeacherItem>[] = useMemo(
    () => [
      //   {
      //     key: "giaovienid",
      //     header: "GiaoVienID",
      //     sortable: true,
      //     sortValue: (r) => r.GiaoVienID,
      //     render: (r: TeacherItem) => (
      //       <span className="font-semibold">{r.GiaoVienID}</span>
      //     ),
      //   },
      {
        key: "email",
        header: "Email",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.Email ?? r.TaiKhoan ?? "",
        render: (r: TeacherItem) => (
          <div className="max-w-60 truncate">
            {safeStr(r?.TaiKhoan_detail?.Email ?? r.TaiKhoan)}
          </div>
        ),
      },
      {
        key: "hoten",
        header: "Họ tên",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.HoTen ?? "",
        render: (r: TeacherItem) => safeStr(r?.TaiKhoan_detail?.HoTen) || "—",
      },
      {
        key: "sdt",
        header: "SĐT",
        align: "right",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.SoDienThoai ?? -1,
        render: (r: TeacherItem) =>
          safeStr(r?.TaiKhoan_detail?.SoDienThoai) || "—",
      },
      //   {
      //     key: "quyen",
      //     header: "Quyền",
      //     sortable: true,
      //     sortValue: (r) => r?.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen ?? "",
      //     render: (r: TeacherItem) => (
      //       <RoleBadge
      //         role={r?.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen ?? ""}
      //       />
      //     ),
      //   },
      {
        key: "ngaytao",
        header: "Ngày tạo",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.NgayTaoTaiKhoan ?? "",
        render: (r: TeacherItem) => (
          <span className="whitespace-nowrap">
            {formatDateTime(r?.TaiKhoan_detail?.NgayTaoTaiKhoan)}
          </span>
        ),
      },
      {
        key: "chuyenmon",
        header: "Chuyên môn",
        sortable: true,
        sortValue: (r) => r?.ChuyenMon ?? "",
        render: (r: TeacherItem) => (
          <div className="max-w-55 truncate">
            {safeStr(r?.ChuyenMon) || "—"}
          </div>
        ),
      },
      {
        key: "kinhnghiem",
        header: "Kinh nghiệm",
        sortable: true,
        sortValue: (r) => r?.KinhNghiem ?? "",
        render: (r: TeacherItem) => (
          <div className="max-w-55 truncate">
            {safeStr(r?.KinhNghiem) || "—"}
          </div>
        ),
      },
      {
        key: "TrangThaiLamViec",
        header: "Trạng thái",
        align: "center",
        sortable: true,
        sortValue: (r: TeacherItem) => r.TrangThaiLamViec ?? -1, // null xuống cuối/đầu tuỳ sếp
        render: (r: TeacherItem) => <StatusBadge value={r.TrangThaiLamViec} />,
      },
      {
        key: "actions",
        header: "Thao tác",
        align: "right",
        render: (r: TeacherItem) => {
          const disabled = bulkDeleting || isDeleting(r.GiaoVienID);
          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={(e) => {
                  e.stopPropagation();
                  openModalEdit(r);
                }}
                disabled={bulkDeleting || isDeleting(r.GiaoVienID)}
              >
                Sửa
              </button>

              <button
                type="button"
                className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteOne(r);
                }}
                disabled={disabled}
              >
                {isDeleting(r.GiaoVienID) ? "Đang xoá..." : "Xoá"}
              </button>
            </div>
          );
        },
      },
    ],
    [bulkDeleting, deletingIds]
  );

  const anySelected = selectedIds.length > 0;

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Quản lý giáo viên">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errMsg}
          </div>
        ) : null}

        {/* Toolbar giống QuestionsPage */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-800">
                Danh sách giáo viên
              </h2>
              {/* <p className="mt-1 text-slate-500">
                Search client-side + chọn checkbox để xoá nhiều.
              </p> */}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Input
                name="search"
                type="search"
                placeholder="Tìm theo ID / email / họ tên / chuyên môn..."
                inputClassName="focus:ring-4 focus:ring-violet-100 w-[500px] min-w-[200px]"
              />

              <button
                type="button"
                onClick={fetchAll}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                disabled={loading || bulkDeleting || deletingIds.size > 0}
              >
                {loading ? "Đang tải..." : "Reload"}
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 shadow-sm transition hover:bg-red-100 active:scale-[0.99] disabled:opacity-60"
                disabled={!anySelected || bulkDeleting || loading}
                title={
                  !anySelected ? "Chọn ít nhất 1 giáo viên để xoá" : undefined
                }
              >
                {bulkDeleting
                  ? `Đang xoá (${selectedIds.length})...`
                  : `Xoá đã chọn (${selectedIds.length})`}
              </button>

              <div className="text-right font-semibold text-slate-700">
                {filtered.length} giáo viên
              </div>
              <button
                onClick={() => setOpenCreate(true)}
                className="h-10 px-4 rounded-xl bg-violet-600 text-white font-semibold"
              >
                + Thêm giáo viên
              </button>
            </div>
          </div>
        </div>

        <Table<TeacherItem>
          columns={columns}
          data={filtered.filter((t) => t.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 3)} // chỉ hiện giáo viên
          getRowId={(row) => row.GiaoVienID}
          loading={loading}
          emptyText="Không có giáo viên phù hợp."
          selectable
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onRowClick={(row) => console.log("Row click:", row)}
          maxHeightClassName="max-h-[640px]"
        />
      </ContentLayoutWrapper>
      <EditTeacherModal
        open={openEdit}
        teacher={editing}
        onClose={closeModalEdit}
        onUpdated={(updated) => {
          setTeachers((prev) =>
            prev.map((t) => (t.GiaoVienID === updated.GiaoVienID ? updated : t))
          );
        }}
      />
      <CreateTeacherModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={fetchAll}
      />
    </FormProvider>
  );
}
