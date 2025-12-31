import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Input, Table, type Column } from "elements";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { http } from "utils/libs/https";
import { formatDateTime } from "utils/helpers/helpers";

// ===== Types =====
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

  BiVoHieuHoa?: boolean;
  is_active?: boolean;
};

type StudentItem = {
  HocVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: TaiKhoanDetail | null;

  NgaySinh: string | null;
  MucTieu: string | null;
  TruongHoc: string | null;
  TrinhDoHienTai: string | null;
  GhiChuCaNhan: string | null;
};

type StudentListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: StudentItem[];
};

type FormValues = { search: string };

// ===== API =====
type ToggleAction = "activate" | "deactivate";

async function toggleUserStatus(userId: string, action?: ToggleAction) {
  // ✅ FIX 404: encode email / special chars
  const safeId = encodeURIComponent(userId);
  const body = action ? { action } : undefined;
  return http.post(`/api/auth/users/${safeId}/toggle_status/`, body);
}

// ===== Helpers =====
function safeStr(v: unknown) {
  if (v == null) return "";
  return String(v);
}

function getApiErrorMessage(err: any) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    "Có lỗi xảy ra."
  );
}

function getAccountStatus(tk?: TaiKhoanDetail | null): { disabled: boolean; label: string } {
  if (!tk) return { disabled: false, label: "—" };
  const isActive = tk.is_active ?? true;
  const biVoHieu = tk.BiVoHieuHoa ?? false;
  const disabled = !isActive || biVoHieu;
  return { disabled, label: disabled ? "Disabled" : "Active" };
}

function StatusBadge({ disabled }: { disabled: boolean }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
  if (disabled) {
    return <span className={`${base} bg-red-50 text-red-700 border-red-200`}>Disabled</span>;
  }
  return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>Active</span>;
}

export default function StudentsTablePage(): JSX.Element {
  const forms = useForm<FormValues>({ defaultValues: { search: "" } });

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // acting states
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  const search = forms.watch("search") ?? "";

  async function fetchAll() {
    setLoading(true);
    setErrMsg(null);
    try {
      const res = await http.get<StudentListResponse>("/api/auth/students/");
      setStudents(res.data?.results ?? []);
      setSelectedIds([]);
    } catch (e: any) {
      setErrMsg(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const list = students || [];
    const kw = search.trim().toLowerCase();
    if (!kw) return list;

    return list.filter((s) => {
      const tk = s.TaiKhoan_detail;
      const role = tk?.IDQuyen_detail?.TenQuyen ?? "";
      const statusText = `${tk?.is_active ?? ""} ${tk?.BiVoHieuHoa ?? ""}`;

      const text =
        `${s.HocVienID} ${s.TaiKhoan} ${tk?.Email ?? ""} ${tk?.HoTen ?? ""} ${
          tk?.SoDienThoai ?? ""
        } ${role} ${tk?.NgayTaoTaiKhoan ?? ""} ${statusText} ${s.TruongHoc ?? ""} ${
          s.TrinhDoHienTai ?? ""
        } ${s.MucTieu ?? ""} ${s.GhiChuCaNhan ?? ""}`.toLowerCase();

      return text.includes(kw);
    });
  }, [students, search]);

  // ✅ chỉ học viên
  const data = useMemo(
    () => filtered.filter((s) => s.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 2),
    [filtered]
  );

  const isActing = (hocVienId: string) => actingIds.has(hocVienId);

  const setActing = (hocVienId: string, value: boolean) => {
    setActingIds((prev) => {
      const next = new Set(prev);
      if (value) next.add(hocVienId);
      else next.delete(hocVienId);
      return next;
    });
  };

  function getUserIdFromStudent(s: StudentItem) {
    return s?.TaiKhoan_detail?.IDTaiKhoan || s.TaiKhoan || "";
  }

  async function handleToggleOne(student: StudentItem) {
    const userId = getUserIdFromStudent(student);
    if (!userId) {
      alert("Không tìm thấy IDTaiKhoan.");
      return;
    }
    if (bulkActing || isActing(student.HocVienID)) return;

    const { disabled } = getAccountStatus(student.TaiKhoan_detail);
    const action: ToggleAction = disabled ? "activate" : "deactivate";

    const ok = window.confirm(
      disabled
        ? `Sếp muốn KÍCH HOẠT tài khoản: ${userId} ?`
        : `Sếp muốn VÔ HIỆU tài khoản: ${userId} ?`
    );
    if (!ok) return;

    setActing(student.HocVienID, true);
    try {
      await toggleUserStatus(userId, action);

      // optimistic update
      setStudents((prev) =>
        prev.map((s) => {
          if (s.HocVienID !== student.HocVienID) return s;
          const tk = s.TaiKhoan_detail;
          if (!tk) return s;

          return {
            ...s,
            TaiKhoan_detail: {
              ...tk,
              is_active: action === "activate",
              BiVoHieuHoa: action === "deactivate",
            },
          };
        })
      );
    } catch (e: any) {
      alert(getApiErrorMessage(e));
    } finally {
      setActing(student.HocVienID, false);
    }
  }

  async function handleBulk(action: ToggleAction) {
    if (bulkActing) return;
    if (selectedIds.length === 0) return;

    const ok = window.confirm(
      action === "activate"
        ? `Sếp có chắc muốn KÍCH HOẠT ${selectedIds.length} tài khoản đã chọn không?`
        : `Sếp có chắc muốn VÔ HIỆU ${selectedIds.length} tài khoản đã chọn không?`
    );
    if (!ok) return;

    setBulkActing(true);
    selectedIds.forEach((id) => setActing(id, true));

    try {
      const selectedStudents = selectedIds
        .map((hocVienId) => data.find((x) => x.HocVienID === hocVienId))
        .filter(Boolean) as StudentItem[];

      const jobs = selectedStudents.map((s) => {
        const userId = getUserIdFromStudent(s);
        if (!userId) return Promise.reject(new Error(`Thiếu IDTaiKhoan: ${s.HocVienID}`));
        return toggleUserStatus(userId, action);
      });

      const results = await Promise.allSettled(jobs);

      const successHocVienIds: string[] = [];
      const failed: { hocVienId: string; reason: any }[] = [];

      results.forEach((r, idx) => {
        const hvId = selectedStudents[idx].HocVienID;
        if (r.status === "fulfilled") successHocVienIds.push(hvId);
        else failed.push({ hocVienId: hvId, reason: r.reason });
      });

      if (successHocVienIds.length) {
        setStudents((prev) =>
          prev.map((s) => {
            if (!successHocVienIds.includes(s.HocVienID)) return s;
            const tk = s.TaiKhoan_detail;
            if (!tk) return s;

            return {
              ...s,
              TaiKhoan_detail: {
                ...tk,
                is_active: action === "activate",
                BiVoHieuHoa: action === "deactivate",
              },
            };
          })
        );
      }

      if (failed.length) {
        const msg =
          `Thao tác thất bại ${failed.length} học viên:\n` +
          failed
            .slice(0, 10)
            .map(
              (x) =>
                `- ${x.hocVienId}: ${
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
      selectedIds.forEach((id) => setActing(id, false));
      setBulkActing(false);
    }
  }

  const columns: Column<StudentItem>[] = useMemo(
    () => [
      {
        key: "hocvienid",
        header: "HocVienID",
        sortable: true,
        sortValue: (r) => r.HocVienID,
        render: (r) => <span className="font-semibold">{r.HocVienID}</span>,
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.Email ?? r.TaiKhoan ?? "",
        render: (r) => (
          <div className="max-w-65 truncate">{safeStr(r?.TaiKhoan_detail?.Email ?? r.TaiKhoan)}</div>
        ),
      },
      {
        key: "hoten",
        header: "Họ tên",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.HoTen ?? "",
        render: (r) => safeStr(r?.TaiKhoan_detail?.HoTen) || "—",
      },
      {
        key: "sdt",
        header: "SĐT",
        align: "right",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.SoDienThoai ?? -1,
        render: (r) => safeStr(r?.TaiKhoan_detail?.SoDienThoai) || "—",
      },
      {
        key: "status",
        header: "Trạng thái",
        sortable: true,
        sortValue: (r) => (getAccountStatus(r.TaiKhoan_detail).disabled ? 0 : 1),
        render: (r) => <StatusBadge disabled={getAccountStatus(r.TaiKhoan_detail).disabled} />,
      },
      {
        key: "ngaytao",
        header: "Ngày tạo",
        sortable: true,
        sortValue: (r) => r?.TaiKhoan_detail?.NgayTaoTaiKhoan ?? "",
        render: (r) => (
          <span className="whitespace-nowrap">{formatDateTime(r?.TaiKhoan_detail?.NgayTaoTaiKhoan)}</span>
        ),
      },
      {
        key: "actions",
        header: "Thao tác",
        align: "right",
        render: (r) => {
          const disabledRow = bulkActing || isActing(r.HocVienID) || loading;
          const { disabled } = getAccountStatus(r.TaiKhoan_detail);
          const nextAction: ToggleAction = disabled ? "activate" : "deactivate";

          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={[
                  "h-9 rounded-lg px-3 text-sm font-semibold border disabled:opacity-60",
                  nextAction === "activate"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                ].join(" ")}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleOne(r);
                }}
                disabled={disabledRow}
              >
                {isActing(r.HocVienID)
                  ? "Đang xử lý..."
                  : nextAction === "activate"
                  ? "Kích hoạt"
                  : "Vô hiệu"}
              </button>
            </div>
          );
        },
      },
    ],
    [bulkActing, actingIds, loading]
  );

  const anySelected = selectedIds.length > 0;

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Quản lý học viên">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{errMsg}</div>
        ) : null}

        {/* Toolbar */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-800">Danh sách học viên</h2>
              <p className="mt-1 text-slate-500">Chọn học viên bằng checkbox để kích hoạt / vô hiệu nhiều.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Input
                name="search"
                type="search"
                placeholder="Tìm theo ID / email / họ tên / SĐT..."
                inputClassName="focus:ring-4 focus:ring-violet-100 min-w-[200px] w-[500px]"
              />

              <button
                type="button"
                onClick={fetchAll}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                disabled={loading || bulkActing || actingIds.size > 0}
              >
                {loading ? "Đang tải..." : "Reload"}
              </button>

              <button
                type="button"
                onClick={() => handleBulk("activate")}
                className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 active:scale-[0.99] disabled:opacity-60"
                disabled={!anySelected || bulkActing || loading}
              >
                {bulkActing ? "Đang xử lý..." : `Kích hoạt (${selectedIds.length})`}
              </button>

              <button
                type="button"
                onClick={() => handleBulk("deactivate")}
                className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 shadow-sm transition hover:bg-red-100 active:scale-[0.99] disabled:opacity-60"
                disabled={!anySelected || bulkActing || loading}
              >
                {bulkActing ? "Đang xử lý..." : `Vô hiệu (${selectedIds.length})`}
              </button>

              <div className="text-right font-semibold text-slate-700">{data.length} học viên</div>
            </div>
          </div>
        </div>

        <Table<StudentItem>
          columns={columns}
          data={data}
          getRowId={(row) => row.HocVienID}
          loading={loading}
          emptyText="Không có học viên phù hợp."
          selectable
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onRowClick={(row) => console.log("Row click:", row)}
          maxHeightClassName="max-h-[640px]"
        />
      </ContentLayoutWrapper>
    </FormProvider>
  );
}

//---------------------------------------------------------------------------

// import React, { useEffect, useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";
// import { Input, Table, type Column } from "elements";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// import { http } from "utils/libs/https";
// import { formatDateTime } from "utils/helpers/helpers";

// // ===== Types =====
// type QuyenDetail = { IDQuyen: number; TenQuyen: string };

// type TaiKhoanDetail = {
//   IDTaiKhoan: string;
//   Email: string;
//   HoTen: string;
//   AnhDaiDien: string | null;
//   SoDienThoai: number | null;
//   NgayTaoTaiKhoan: string;
//   TrangThaiTaiKhoan: string | null;
//   IDQuyen: number;
//   IDQuyen_detail?: QuyenDetail | null;
// };

// type StudentItem = {
//   HocVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: TaiKhoanDetail | null;

//   NgaySinh: string | null;
//   MucTieu: string | null;
//   TruongHoc: string | null;
//   TrinhDoHienTai: string | null;
//   GhiChuCaNhan: string | null;
// };

// type StudentListResponse = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: StudentItem[];
// };

// type FormValues = { search: string };

// // ===== API =====
// async function deleteStudent(hocVienId: string) {
//   return http.delete(`/api/auth/students/${hocVienId}/`);
// }

// // ===== Helpers =====
// function safeStr(v: unknown) {
//   if (v == null) return "";
//   return String(v);
// }

// function RoleBadge({ role }: { role: string }) {
//   const base =
//     "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
//   if (role === "Học Viên")
//     return (
//       <span
//         className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
//       >
//         Học Viên
//       </span>
//     );
//   if (role === "Giáo Viên")
//     return (
//       <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
//         Giáo Viên
//       </span>
//     );
//   return (
//     <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>
//       {role || "—"}
//     </span>
//   );
// }

// export default function StudentsTablePage(): JSX.Element {
//   const forms = useForm<FormValues>({ defaultValues: { search: "" } });

//   const [students, setStudents] = useState<StudentItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);

//   // selection
//   const [selectedIds, setSelectedIds] = useState<string[]>([]);

//   // deleting states
//   const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
//   const [bulkDeleting, setBulkDeleting] = useState(false);

//   const search = forms.watch("search") ?? "";

//   async function fetchAll() {
//     setLoading(true);
//     setErrMsg(null);
//     try {
//       const res = await http.get<StudentListResponse>("/api/auth/students/");
//       setStudents(res.data?.results ?? []);
//       setSelectedIds([]);
//     } catch (e: any) {
//       setErrMsg(
//         e?.response?.data?.detail ||
//           e?.response?.data?.message ||
//           e?.message ||
//           "Không tải được dữ liệu."
//       );
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     fetchAll();
//   }, []);

//   // ✅ filter client-side
//   const filtered = useMemo(() => {
//     let list = students;
//     const kw = search.trim().toLowerCase();
//     if (!kw) return list;

//     return list.filter((s) => {
//       const tk = s.TaiKhoan_detail;
//       const role = tk?.IDQuyen_detail?.TenQuyen ?? "";
//       const text =
//         `${s.HocVienID} ${s.TaiKhoan} ${tk?.Email ?? ""} ${tk?.HoTen ?? ""} ${
//           tk?.SoDienThoai ?? ""
//         } ${role} ${tk?.NgayTaoTaiKhoan ?? ""} ${s.TruongHoc ?? ""} ${
//           s.TrinhDoHienTai ?? ""
//         } ${s.MucTieu ?? ""} ${s.GhiChuCaNhan ?? ""}`.toLowerCase();
//       return text.includes(kw);
//     });
//   }, [students, search]);

//   const isDeleting = (id: string) => deletingIds.has(id);

//   const setDeleting = (id: string, value: boolean) => {
//     setDeletingIds((prev) => {
//       const next = new Set(prev);
//       if (value) next.add(id);
//       else next.delete(id);
//       return next;
//     });
//   };

//   // ✅ xoá 1
//   async function handleDeleteOne(student: StudentItem) {
//     const id = student.HocVienID;
//     if (isDeleting(id) || bulkDeleting) return;

//     const ok = window.confirm(`Bạn có chắc muốn xoá học viên: ${id} không?`);
//     if (!ok) return;

//     setDeleting(id, true);
//     try {
//       await deleteStudent(id);

//       setStudents((prev) => prev.filter((s) => s.HocVienID !== id));
//       setSelectedIds((prev) => prev.filter((x) => x !== id));
//     } catch (e: any) {
//       alert(
//         e?.response?.data?.detail ||
//           e?.response?.data?.message ||
//           e?.message ||
//           "Xoá học viên thất bại"
//       );
//     } finally {
//       setDeleting(id, false);
//     }
//   }

//   // ✅ bulk delete theo checkbox
//   async function handleBulkDelete() {
//     if (bulkDeleting) return;
//     if (selectedIds.length === 0) return;

//     const ok = window.confirm(
//       `Bạn có chắc muốn xoá ${selectedIds.length} học viên đã chọn không?`
//     );
//     if (!ok) return;

//     setBulkDeleting(true);

//     // lock tất cả id đang xoá để disable nút từng dòng
//     selectedIds.forEach((id) => setDeleting(id, true));

//     try {
//       // chạy song song, nhưng vẫn giữ kết quả từng cái (allSettled)
//       const results = await Promise.allSettled(
//         selectedIds.map((id) => deleteStudent(id))
//       );

//       const successIds: string[] = [];
//       const failedIds: { id: string; reason: any }[] = [];

//       results.forEach((r, idx) => {
//         const id = selectedIds[idx];
//         if (r.status === "fulfilled") successIds.push(id);
//         else failedIds.push({ id, reason: r.reason });
//       });

//       // ✅ remove các item xoá thành công khỏi state
//       if (successIds.length > 0) {
//         setStudents((prev) =>
//           prev.filter((s) => !successIds.includes(s.HocVienID))
//         );
//         setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)));
//       }

//       // ✅ thông báo lỗi nếu có
//       if (failedIds.length > 0) {
//         const msg =
//           `Xoá thất bại ${failedIds.length} học viên:\n` +
//           failedIds
//             .slice(0, 10)
//             .map(
//               (x) =>
//                 `- ${x.id}: ${
//                   x.reason?.response?.data?.detail ||
//                   x.reason?.response?.data?.message ||
//                   x.reason?.message ||
//                   "Lỗi"
//                 }`
//             )
//             .join("\n") +
//           (failedIds.length > 10
//             ? `\n... và ${failedIds.length - 10} lỗi khác`
//             : "");
//         alert(msg);
//       }
//     } finally {
//       // unlock
//       selectedIds.forEach((id) => setDeleting(id, false));
//       setBulkDeleting(false);
//     }
//   }

//   const columns: Column<StudentItem>[] = useMemo(
//     () => [
//       {
//         key: "hocvienid",
//         header: "HocVienID",
//         sortable: true,
//         sortValue: (r) => r.HocVienID,
//         render: (r) => (
//           <span className="font-semibold">{r.HocVienID}</span>
//         ),
//       },
//       {
//         key: "email",
//         header: "Email",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.Email ?? r.TaiKhoan ?? "",
//         render: (r) => (
//           <div className="max-w-65 truncate">
//             {safeStr(r?.TaiKhoan_detail?.Email ?? r.TaiKhoan)}
//           </div>
//         ),
//       },
//       {
//         key: "hoten",
//         header: "Họ tên",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.HoTen ?? "",
//         render: (r) => safeStr(r?.TaiKhoan_detail?.HoTen) || "—",
//       },
//       {
//         key: "sdt",
//         header: "SĐT",
//         align: "right",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.SoDienThoai ?? -1,
//         render: (r) =>
//           safeStr(r?.TaiKhoan_detail?.SoDienThoai) || "—",
//       },
//       //   {
//       //     key: "quyen",
//       //     header: "Quyền",
//       //     sortable: true,
//       //     sortValue: (r) => r?.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen ?? "",
//       //     render: (r: StudentItem) => (
//       //       <RoleBadge role={r?.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen ?? ""} />
//       //     ),
//       //   },
//       //   {
//       //     key: "truong",
//       //     header: "Trường",
//       //     sortable: true,
//       //     sortValue: (r) => r?.TruongHoc ?? "",
//       //     render: (r: StudentItem) => (
//       //       <div className="max-w-55 truncate">{safeStr(r?.TruongHoc) || "—"}</div>
//       //     ),
//       //   },
//       //   {
//       //     key: "trinhdo",
//       //     header: "Trình độ",
//       //     sortable: true,
//       //     sortValue: (r) => r?.TrinhDoHienTai ?? "",
//       //     render: (r: StudentItem) => (
//       //       <div className="max-w-55 truncate">{safeStr(r?.TrinhDoHienTai) || "—"}</div>
//       //     ),
//       //   },
//       {
//         key: "ngaytao",
//         header: "Ngày tạo",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.NgayTaoTaiKhoan ?? "",
//         render: (r) => (
//           <span className="whitespace-nowrap">
//             {formatDateTime(r?.TaiKhoan_detail?.NgayTaoTaiKhoan)}
//           </span>
//         ),
//       },
//       {
//         key: "actions",
//         header: "Thao tác",
//         align: "right",
//         render: (r) => {
//           const disabled = bulkDeleting || isDeleting(r.HocVienID);
//           return (
//             <div className="flex justify-end gap-2">
//               {/* <button
//                 type="button"
//                 className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   console.log("View:", r);
//                 }}
//                 disabled={disabled}
//               >
//                 Xem
//               </button> */}

//               <button
//                 type="button"
//                 className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleDeleteOne(r);
//                 }}
//                 disabled={disabled}
//               >
//                 {isDeleting(r.HocVienID) ? "Đang xoá..." : "Xoá"}
//               </button>
//             </div>
//           );
//         },
//       },
//     ],
//     [bulkDeleting, deletingIds]
//   );

//   const anySelected = selectedIds.length > 0;

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Quản lý học viên">
//         {errMsg ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
//             {errMsg}
//           </div>
//         ) : null}

//         {/* Toolbar */}
//         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex flex-wrap items-center justify-between gap-4">
//             <div>
//               <h2 className="m-0 text-xl font-bold text-slate-800">
//                 Danh sách học viên
//               </h2>
//               <p className="mt-1 text-slate-500">
//                 Chọn học viên bằng checkbox để xoá nhiều.
//               </p>
//             </div>

//             <div className="flex flex-wrap items-center gap-3">
//               <Input
//                 name="search"
//                 type="search"
//                 placeholder="Tìm theo ID / email / họ tên / SĐT..."
//                 inputClassName="focus:ring-4 focus:ring-violet-100 min-w-[200px] w-[500px]"
//               />

//               <button
//                 type="button"
//                 onClick={fetchAll}
//                 className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
//                 disabled={loading || bulkDeleting || deletingIds.size > 0}
//               >
//                 {loading ? "Đang tải..." : "Reload"}
//               </button>

//               <button
//                 type="button"
//                 onClick={handleBulkDelete}
//                 className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 shadow-sm transition hover:bg-red-100 active:scale-[0.99] disabled:opacity-60"
//                 disabled={!anySelected || bulkDeleting || loading}
//                 title={
//                   !anySelected ? "Chọn ít nhất 1 học viên để xoá" : undefined
//                 }
//               >
//                 {bulkDeleting
//                   ? `Đang xoá (${selectedIds.length})...`
//                   : `Xoá đã chọn (${selectedIds.length})`}
//               </button>

//               <div className="text-right font-semibold text-slate-700">
//                 {filtered.length} học viên
//               </div>
//             </div>
//           </div>
//         </div>

//         <Table<StudentItem>
//           columns={columns}
//           data={filtered.filter(
//             (s) => s.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 2
//           )}
//           getRowId={(row) => row.HocVienID}
//           loading={loading}
//           emptyText="Không có học viên phù hợp."
//           selectable
//           selectedIds={selectedIds}
//           onSelectedIdsChange={setSelectedIds}
//           onRowClick={(row) => console.log("Row click:", row)}
//           maxHeightClassName="max-h-[640px]"
//         />
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }
