import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Input, Table, type Column } from "elements";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { http } from "utils/libs/https";
import EditTeacherModal from "components/edit-teacher-modal";
import { CreateTeacherModal } from "components/create-teacher-modal";

// ✅ PDF Export
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ensureVietnameseFont } from "utils/pdfFont";

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

  // ✅ status
  BiVoHieuHoa?: boolean;
  is_active?: boolean;
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

// ✅ encode pk để email có @ không bị 404
function encPk(pk: string) {
  return encodeURIComponent(pk);
}

// ✅ active/disable user account
async function activateUser(userPk: string) {
  const res = await http.post(`/api/auth/users/${encPk(userPk)}/activate/`);
  return res.data;
}
async function deactivateUser(userPk: string) {
  const res = await http.post(`/api/auth/users/${encPk(userPk)}/deactivate/`);
  return res.data;
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
  return <span className={`${s.cls}`}>{s.text}</span>;
}

// ✅ Account status badge (active/disabled)
function AccountBadge({
  isActive,
  disabledFlag,
}: {
  isActive?: boolean;
  disabledFlag?: boolean;
}) {
  const inactive = disabledFlag === true || isActive === false;

  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
  if (inactive) {
    return (
      <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
        Disabled
      </span>
    );
  }
  return (
    <span
      className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
    >
      Active
    </span>
  );
}

// ✅ Generate random teacher id
function generateRandomTeacherId(prefix = "gv") {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
  } catch {
    // ignore
  }
  const rand = `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
    .toString(16)
    .slice(2)}`;
  return `${prefix}_${rand}`;
}

// ✅ export helpers
function getWorkStatusText(v: string | null | undefined) {
  return statusLabel(v).text;
}
function getAccountText(isActive?: boolean, disabledFlag?: boolean) {
  const inactive = disabledFlag === true || isActive === false;
  return inactive ? "Disabled" : "Active";
}

export default function TeachersPage(): JSX.Element {
  const forms = useForm<FormValues>({ defaultValues: { search: "" } });

  const [openCreate, setOpenCreate] = useState(false);
  const [createDefaultId, setCreateDefaultId] = useState<string>("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | null>(null);

  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // ✅ account toggling
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const search = forms.watch("search") ?? "";

  const isToggling = (pk: string) => togglingIds.has(pk);
  const setToggling = (pk: string, v: boolean) => {
    setTogglingIds((prev) => {
      const next = new Set(prev);
      if (v) next.add(pk);
      else next.delete(pk);
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

  // ✅ Toggle account (activate/deactivate)
  async function handleToggleAccount(item: TeacherItem) {
    const userPk = item?.TaiKhoan_detail?.IDTaiKhoan || item.TaiKhoan;
    if (!userPk) return;
    if (isToggling(userPk)) return;

    const inactive =
      item?.TaiKhoan_detail?.BiVoHieuHoa === true ||
      item?.TaiKhoan_detail?.is_active === false;

    const actionText = inactive ? "Kích hoạt" : "Vô hiệu hoá";
    const ok = window.confirm(
      `Sếp có chắc muốn ${actionText} tài khoản này không?\n(${userPk})`
    );
    if (!ok) return;

    setToggling(userPk, true);
    try {
      // gọi API
      const updatedUser = inactive
        ? await activateUser(userPk)
        : await deactivateUser(userPk);

      /**
       * Backend có thể trả về:
       * - object user
       * - hoặc {detail: "..."} / message
       * => mình merge an toàn vào teacher.TaiKhoan_detail
       */
      setTeachers((prev) =>
        prev.map((t) => {
          const pk2 = t?.TaiKhoan_detail?.IDTaiKhoan || t.TaiKhoan;
          if (pk2 !== userPk) return t;

          return {
            ...t,
            TaiKhoan_detail: {
              ...(t.TaiKhoan_detail || ({} as TaiKhoanDetail)),
              ...(typeof updatedUser === "object" ? updatedUser : {}),
            },
          };
        })
      );

      // nếu server không trả đủ -> reload cho chắc
      await fetchAll();
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Đổi trạng thái tài khoản thất bại"
      );
    } finally {
      setToggling(userPk, false);
    }
  }

  // ✅ Export PDF danh sách giáo viên (danh sách đang hiển thị)
  // async function exportTeachersPdf() {
  //   try {
  //     const list = filtered.filter(
  //       (t) => t.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 3
  //     );

  //     if (list.length === 0) {
  //       alert("Không có giáo viên để export.");
  //       return;
  //     }

  //     const doc = new jsPDF({
  //       orientation: "landscape",
  //       unit: "pt",
  //       format: "a4",
  //     });

  //     // ✅ load font Vietnamese
  //     await ensureVietnameseFont(doc);

  //     const now = new Date();
  //     const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
  //       2,
  //       "0"
  //     )}-${String(now.getDate()).padStart(2, "0")}_${String(
  //       now.getHours()
  //     ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  //     // Header
  //     doc.setFont("RobotoCondensed", "bold");
  //     doc.setFontSize(16);
  //     doc.text("DANH SÁCH GIÁO VIÊN", 40, 40);

  //     doc.setFont("RobotoCondensed", "normal");
  //     doc.setFontSize(10);
  //     doc.text(
  //       `Tổng: ${list.length} | Xuất lúc: ${formatDateTime(now.toISOString())}`,
  //       40,
  //       58
  //     );

  //     autoTable(doc, {
  //       startY: 75,
  //       styles: {
  //         font: "RobotoCondensed",
  //         fontStyle: "normal",
  //         fontSize: 9,
  //         cellPadding: 6,
  //         overflow: "linebreak",
  //       },
  //       headStyles: {
  //         font: "RobotoCondensed",
  //         fontStyle: "bold",
  //       },
  //       columnStyles: {
  //         0: { cellWidth: 35, halign: "right" }, // STT
  //         1: { cellWidth: 180 }, // Email
  //         2: { cellWidth: 130 }, // Họ tên
  //         3: { cellWidth: 70, halign: "center" }, // Account
  //         4: { cellWidth: 75, halign: "right" }, // SĐT
  //         5: { cellWidth: 105 }, // Ngày tạo
  //         6: { cellWidth: 120 }, // Chuyên môn
  //         7: { cellWidth: 120 }, // Kinh nghiệm
  //         8: { cellWidth: 85, halign: "center" }, // Trạng thái
  //       },
  //       head: [
  //         [
  //           "STT",
  //           "Email",
  //           "Họ tên",
  //           "Account",
  //           "SĐT",
  //           "Ngày tạo",
  //           "Chuyên môn",
  //           "Kinh nghiệm",
  //           "Trạng thái",
  //         ],
  //       ],
  //       body: list.map((t, idx) => {
  //         const tk = t.TaiKhoan_detail;
  //         return [
  //           idx + 1,
  //           safeStr(tk?.Email ?? t.TaiKhoan) || "—",
  //           safeStr(tk?.HoTen) || "—",
  //           getAccountText(tk?.is_active, tk?.BiVoHieuHoa),
  //           safeStr(tk?.SoDienThoai) || "—",
  //           formatDateTime(tk?.NgayTaoTaiKhoan),
  //           safeStr(t.ChuyenMon) || "—",
  //           safeStr(t.KinhNghiem) || "—",
  //           getWorkStatusText(t.TrangThaiLamViec),
  //         ];
  //       }),
  //       didDrawPage: () => {
  //         const pageCount = doc.getNumberOfPages();
  //         const pageCurrent = doc.getCurrentPageInfo().pageNumber;

  //         doc.setFont("RobotoCondensed", "normal");
  //         doc.setFontSize(9);
  //         doc.text(
  //           `Trang ${pageCurrent}/${pageCount}`,
  //           doc.internal.pageSize.getWidth() - 60,
  //           doc.internal.pageSize.getHeight() - 20,
  //           { align: "right" }
  //         );
  //       },
  //     });

  //     doc.save(`teachers_${stamp}.pdf`);
  //   } catch (e: any) {
  //     alert(e?.message || "Export PDF thất bại");
  //   }
  // }
  async function exportTeachersPdf() {
    try {
      const list = filtered.filter(
        (t) => t.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 3
      );

      if (list.length === 0) {
        alert("Không có giáo viên để export.");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      await ensureVietnameseFont(doc);

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")}_${String(
        now.getHours()
      ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

      // ===== Header =====
      const MARGIN_X = 36; // 0.5 inch
      const MARGIN_TOP = 36;

      doc.setFont("RobotoCondensed", "bold");
      doc.setFontSize(16);
      doc.text("DANH SÁCH GIÁO VIÊN", MARGIN_X, MARGIN_TOP);

      doc.setFont("RobotoCondensed", "normal");
      doc.setFontSize(10);
      doc.text(
        `Tổng: ${list.length} | Xuất lúc: ${formatDateTime(now.toISOString())}`,
        MARGIN_X,
        MARGIN_TOP + 18
      );

      // ===== Table =====
      autoTable(doc, {
        startY: MARGIN_TOP + 30,

        // ✅ quan trọng: để bảng tự co giãn theo trang
        tableWidth: "wrap",
        margin: { left: MARGIN_X, right: MARGIN_X },

        styles: {
          font: "RobotoCondensed",
          fontStyle: "normal",
          fontSize: 8, // ✅ giảm font để vừa trang
          cellPadding: 4,
          overflow: "linebreak", // ✅ wrap xuống dòng
          cellWidth: "wrap", // ✅ auto wrap cell
          valign: "middle",
        },

        headStyles: {
          font: "RobotoCondensed",
          fontStyle: "bold",
          fontSize: 8,
        },

        // ✅ set width theo kiểu "auto/wrap" thay vì số pt cứng
        columnStyles: {
          0: { halign: "right", cellWidth: "auto" }, // STT
          1: { cellWidth: "wrap" }, // Email (dài)
          2: { cellWidth: "auto" }, // Họ tên
          3: { halign: "center", cellWidth: "auto" }, // Account
          4: { halign: "right", cellWidth: "auto" }, // SĐT
          5: { cellWidth: "auto" }, // Ngày tạo
          6: { cellWidth: "wrap" }, // Chuyên môn (dài)
          7: { cellWidth: "wrap" }, // Kinh nghiệm (dài)
          8: { halign: "center", cellWidth: "auto" }, // Trạng thái làm việc
        },

        head: [
          [
            "STT",
            "Email",
            "Họ tên",
            "Account",
            "SĐT",
            "Ngày tạo",
            "Chuyên môn",
            "Kinh nghiệm",
            "Trạng thái",
          ],
        ],

        body: list.map((t, idx) => {
          const tk = t.TaiKhoan_detail;

          const accountText = getAccountText(tk?.is_active, tk?.BiVoHieuHoa);
          const workStatusText = getWorkStatusText(t.TrangThaiLamViec);

          return [
            idx + 1,
            safeStr(tk?.Email ?? t.TaiKhoan) || "—",
            safeStr(tk?.HoTen) || "—",
            accountText,
            safeStr(tk?.SoDienThoai) || "—",
            formatDateTime(tk?.NgayTaoTaiKhoan),
            safeStr(t.ChuyenMon) || "—",
            safeStr(t.KinhNghiem) || "—",
            workStatusText,
          ];
        }),

        // ✅ nếu vẫn dài quá, autoTable sẽ xuống dòng; đồng thời lặp header
        showHead: "everyPage",

        didDrawPage: () => {
          const pageCount = doc.getNumberOfPages();
          const pageCurrent = doc.getCurrentPageInfo().pageNumber;

          doc.setFont("RobotoCondensed", "normal");
          doc.setFontSize(9);
          doc.text(
            `Trang ${pageCurrent}/${pageCount}`,
            doc.internal.pageSize.getWidth() - MARGIN_X,
            doc.internal.pageSize.getHeight() - 18,
            { align: "right" }
          );
        },
      });

      doc.save(`teachers_${stamp}.pdf`);
    } catch (e: any) {
      alert(e?.message || "Export PDF thất bại");
    }
  }

  const columns: Column<TeacherItem>[] = useMemo(
    () => [
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
        key: "account_status",
        header: "Account",
        align: "center",
        sortable: true,
        sortValue: (r) => (r?.TaiKhoan_detail?.is_active === false ? 0 : 1),
        render: (r) => (
          <AccountBadge
            isActive={r?.TaiKhoan_detail?.is_active}
            disabledFlag={r?.TaiKhoan_detail?.BiVoHieuHoa}
          />
        ),
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
        sortValue: (r: TeacherItem) => r.TrangThaiLamViec ?? "-1",
        render: (r: TeacherItem) => <StatusBadge value={r.TrangThaiLamViec} />,
      },
      {
        key: "actions",
        header: "Thao tác",
        align: "right",
        render: (r: TeacherItem) => {
          const userPk = r?.TaiKhoan_detail?.IDTaiKhoan || r.TaiKhoan;
          const disabled = loading || isToggling(userPk);

          const inactive =
            r?.TaiKhoan_detail?.BiVoHieuHoa === true ||
            r?.TaiKhoan_detail?.is_active === false;

          return (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={(e) => {
                  e.stopPropagation();
                  openModalEdit(r);
                }}
                disabled={disabled}
              >
                Sửa
              </button>

              {/* ✅ Active/Disable */}
              <button
                type="button"
                className={[
                  "h-9 rounded-lg px-3 text-sm font-semibold border disabled:opacity-60",
                  inactive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                ].join(" ")}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAccount(r);
                }}
                disabled={disabled || !userPk}
                title={!userPk ? "Không tìm thấy user_id (pk)" : undefined}
              >
                {isToggling(userPk)
                  ? "Đang xử lý..."
                  : inactive
                    ? "Activate"
                    : "Disable"}
              </button>
            </div>
          );
        },
      },
    ],
    [loading, togglingIds]
  );

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Quản lý giáo viên">
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errMsg}
          </div>
        ) : null}

        {/* Toolbar */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-800">
                Danh sách giáo viên
              </h2>
              <p className="mt-1 text-slate-500">
                Quản lý tài khoản (Activate/Disable). Đã ẩn chức năng xoá.
              </p>
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
                disabled={loading || togglingIds.size > 0}
              >
                {loading ? "Đang tải..." : "Reload"}
              </button>

              {/* ✅ Export PDF */}
              <button
                type="button"
                onClick={exportTeachersPdf}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
                disabled={loading || togglingIds.size > 0}
                title="Export danh sách giáo viên (đang hiển thị) ra PDF"
              >
                Export PDF
              </button>

              <div className="text-right font-semibold text-slate-700">
                {filtered.length} giáo viên
              </div>

              <button
                type="button"
                onClick={() => {
                  // ✅ set default random id mỗi lần mở create
                  setCreateDefaultId(generateRandomTeacherId());
                  setOpenCreate(true);
                }}
                className="h-10 px-4 rounded-xl bg-violet-600 text-white font-semibold"
              >
                + Thêm giáo viên
              </button>
            </div>
          </div>
        </div>

        <Table<TeacherItem>
          columns={columns}
          data={filtered.filter(
            (t) => t.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 3
          )} // chỉ hiện giáo viên
          getRowId={(row) => row.GiaoVienID}
          loading={loading}
          emptyText="Không có giáo viên phù hợp."
          selectable={false}
          maxHeightClassName="max-h-[640px]"
          onRowClick={(row) => console.log("Row click:", row)}
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

      {/* ✅ Create teacher: truyền defaultTeacherId để modal set default */}
      <CreateTeacherModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={fetchAll}
        defaultTeacherId={createDefaultId}
      />
    </FormProvider>
  );
}

// import React, { useEffect, useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";
// import { Input, Table, type Column } from "elements";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// import { http } from "utils/libs/https";
// import EditTeacherModal from "components/edit-teacher-modal";
// import { CreateTeacherModal } from "components/create-teacher-modal";

// // ===== Types theo response API =====
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

//   // ✅ status
//   BiVoHieuHoa?: boolean;
//   is_active?: boolean;
// };

// type TeacherItem = {
//   GiaoVienID: string;
//   TaiKhoan: string;
//   TaiKhoan_detail?: TaiKhoanDetail | null;

//   ChuyenMon: string | null;
//   KinhNghiem: string | null;
//   BangCapChungChi: string | null;
//   MoTaBanThan: string | null;
//   ThongTinNganHang: string | null;
//   TrangThaiLamViec: string | null;
//   SoTaiKhoan: number | null;
// };

// type TeacherListResponse = {
//   count: number;
//   next: string | null;
//   previous: string | null;
//   results: TeacherItem[];
// };

// type FormValues = { search: string };

// // ===== API =====
// async function getTeachers() {
//   const res = await http.get<TeacherListResponse>("/api/auth/teachers/");
//   return res.data;
// }

// // ✅ encode pk để email có @ không bị 404
// function encPk(pk: string) {
//   return encodeURIComponent(pk);
// }

// // ✅ active/disable user account
// async function activateUser(userPk: string) {
//   const res = await http.post(`/api/auth/users/${encPk(userPk)}/activate/`);
//   return res.data;
// }
// async function deactivateUser(userPk: string) {
//   const res = await http.post(`/api/auth/users/${encPk(userPk)}/deactivate/`);
//   return res.data;
// }

// // ===== Helpers =====
// function safeStr(v: unknown) {
//   if (v == null) return "";
//   return String(v);
// }

// function formatDateTime(iso?: string | null) {
//   if (!iso) return "—";
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) return safeStr(iso);

//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   const hh = String(d.getHours()).padStart(2, "0");
//   const mi = String(d.getMinutes()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
// }

// function statusLabel(v: string | null | undefined) {
//   switch (v) {
//     case "1":
//       return {
//         text: "Đang làm",
//         cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
//       };
//     case "2":
//       return {
//         text: "Tạm nghỉ",
//         cls: "bg-amber-50 text-amber-700 border-amber-200",
//       };
//     case "3":
//       return {
//         text: "Nghỉ việc",
//         cls: "bg-rose-50 text-rose-700 border-rose-200",
//       };
//     default:
//       return {
//         text: "Chưa set",
//         cls: "bg-slate-50 text-slate-700 border-slate-200",
//       };
//   }
// }

// function StatusBadge({ value }: { value: string | null | undefined }) {
//   const s = statusLabel(value);
//   return (
//     <span
//       className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${s.cls}`}
//     >
//       {s.text}
//     </span>
//   );
// }

// // ✅ Account status badge (active/disabled)
// function AccountBadge({
//   isActive,
//   disabledFlag,
// }: {
//   isActive?: boolean;
//   disabledFlag?: boolean;
// }) {
//   const inactive = disabledFlag === true || isActive === false;

//   const base =
//     "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
//   if (inactive) {
//     return (
//       <span className={`${base} bg-rose-50 text-rose-700 border-rose-200`}>
//         Disabled
//       </span>
//     );
//   }
//   return (
//     <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}>
//       Active
//     </span>
//   );
// }

// // ✅ Generate random teacher id
// function generateRandomTeacherId(prefix = "gv") {
//   try {
//     const uuid = globalThis.crypto?.randomUUID?.();
//     if (uuid) return `${prefix}_${uuid}`;
//   } catch {
//     // ignore
//   }
//   const rand = `${Date.now()}_${Math.random().toString(16).slice(2)}_${Math.random()
//     .toString(16)
//     .slice(2)}`;
//   return `${prefix}_${rand}`;
// }

// export default function TeachersPage(): JSX.Element {
//   const forms = useForm<FormValues>({ defaultValues: { search: "" } });

//   const [openCreate, setOpenCreate] = useState(false);
//   const [createDefaultId, setCreateDefaultId] = useState<string>("");

//   const [openEdit, setOpenEdit] = useState(false);
//   const [editing, setEditing] = useState<TeacherItem | null>(null);

//   const [teachers, setTeachers] = useState<TeacherItem[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);

//   // ✅ account toggling
//   const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

//   const search = forms.watch("search") ?? "";

//   const isToggling = (pk: string) => togglingIds.has(pk);
//   const setToggling = (pk: string, v: boolean) => {
//     setTogglingIds((prev) => {
//       const next = new Set(prev);
//       if (v) next.add(pk);
//       else next.delete(pk);
//       return next;
//     });
//   };

//   const openModalEdit = (t: TeacherItem) => {
//     setEditing(t);
//     setOpenEdit(true);
//   };

//   const closeModalEdit = () => {
//     setOpenEdit(false);
//     setEditing(null);
//   };

//   async function fetchAll() {
//     setLoading(true);
//     setErrMsg(null);
//     try {
//       const data = await getTeachers();
//       setTeachers(data.results ?? []);
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

//   // ✅ Search client-side
//   const filtered = useMemo(() => {
//     let list = teachers;
//     const kw = search.trim().toLowerCase();
//     if (!kw) return list;

//     return list.filter((t) => {
//       const tk = t.TaiKhoan_detail;
//       const role = tk?.IDQuyen_detail?.TenQuyen ?? "";
//       const text =
//         `${t.GiaoVienID} ${t.TaiKhoan} ${tk?.Email ?? ""} ${tk?.HoTen ?? ""} ${
//           tk?.SoDienThoai ?? ""
//         } ${role} ${tk?.NgayTaoTaiKhoan ?? ""} ${t.ChuyenMon ?? ""} ${
//           t.KinhNghiem ?? ""
//         } ${t.BangCapChungChi ?? ""} ${t.TrangThaiLamViec ?? ""} ${
//           t.SoTaiKhoan ?? ""
//         } ${t.ThongTinNganHang ?? ""}`.toLowerCase();

//       return text.includes(kw);
//     });
//   }, [teachers, search]);

//   // ✅ Toggle account (activate/deactivate)
//   async function handleToggleAccount(item: TeacherItem) {
//     const userPk = item?.TaiKhoan_detail?.IDTaiKhoan || item.TaiKhoan;
//     if (!userPk) return;
//     if (isToggling(userPk)) return;

//     const inactive =
//       item?.TaiKhoan_detail?.BiVoHieuHoa === true ||
//       item?.TaiKhoan_detail?.is_active === false;

//     const actionText = inactive ? "Kích hoạt" : "Vô hiệu hoá";
//     const ok = window.confirm(`Sếp có chắc muốn ${actionText} tài khoản này không?\n(${userPk})`);
//     if (!ok) return;

//     setToggling(userPk, true);
//     try {
//       // gọi API
//       const updatedUser =
//         inactive ? await activateUser(userPk) : await deactivateUser(userPk);

//       /**
//        * Backend có thể trả về:
//        * - object user
//        * - hoặc {detail: "..."} / message
//        * => mình merge an toàn vào teacher.TaiKhoan_detail
//        */
//       setTeachers((prev) =>
//         prev.map((t) => {
//           const pk2 = t?.TaiKhoan_detail?.IDTaiKhoan || t.TaiKhoan;
//           if (pk2 !== userPk) return t;

//           return {
//             ...t,
//             TaiKhoan_detail: {
//               ...(t.TaiKhoan_detail || ({} as TaiKhoanDetail)),
//               ...(typeof updatedUser === "object" ? updatedUser : {}),
//             },
//           };
//         })
//       );

//       // nếu server không trả đủ -> reload cho chắc
//       await fetchAll();
//     } catch (e: any) {
//       alert(
//         e?.response?.data?.detail ||
//           e?.response?.data?.message ||
//           e?.message ||
//           "Đổi trạng thái tài khoản thất bại"
//       );
//     } finally {
//       setToggling(userPk, false);
//     }
//   }

//   const columns: Column<TeacherItem>[] = useMemo(
//     () => [
//       {
//         key: "email",
//         header: "Email",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.Email ?? r.TaiKhoan ?? "",
//         render: (r: TeacherItem) => (
//           <div className="max-w-60 truncate">
//             {safeStr(r?.TaiKhoan_detail?.Email ?? r.TaiKhoan)}
//           </div>
//         ),
//       },
//       {
//         key: "hoten",
//         header: "Họ tên",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.HoTen ?? "",
//         render: (r: TeacherItem) => safeStr(r?.TaiKhoan_detail?.HoTen) || "—",
//       },
//       {
//         key: "account_status",
//         header: "Account",
//         align: "center",
//         sortable: true,
//         sortValue: (r) => (r?.TaiKhoan_detail?.is_active === false ? 0 : 1),
//         render: (r) => (
//           <AccountBadge
//             isActive={r?.TaiKhoan_detail?.is_active}
//             disabledFlag={r?.TaiKhoan_detail?.BiVoHieuHoa}
//           />
//         ),
//       },
//       {
//         key: "sdt",
//         header: "SĐT",
//         align: "right",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.SoDienThoai ?? -1,
//         render: (r: TeacherItem) =>
//           safeStr(r?.TaiKhoan_detail?.SoDienThoai) || "—",
//       },
//       {
//         key: "ngaytao",
//         header: "Ngày tạo",
//         sortable: true,
//         sortValue: (r) => r?.TaiKhoan_detail?.NgayTaoTaiKhoan ?? "",
//         render: (r: TeacherItem) => (
//           <span className="whitespace-nowrap">
//             {formatDateTime(r?.TaiKhoan_detail?.NgayTaoTaiKhoan)}
//           </span>
//         ),
//       },
//       {
//         key: "chuyenmon",
//         header: "Chuyên môn",
//         sortable: true,
//         sortValue: (r) => r?.ChuyenMon ?? "",
//         render: (r: TeacherItem) => (
//           <div className="max-w-55 truncate">{safeStr(r?.ChuyenMon) || "—"}</div>
//         ),
//       },
//       {
//         key: "kinhnghiem",
//         header: "Kinh nghiệm",
//         sortable: true,
//         sortValue: (r) => r?.KinhNghiem ?? "",
//         render: (r: TeacherItem) => (
//           <div className="max-w-55 truncate">{safeStr(r?.KinhNghiem) || "—"}</div>
//         ),
//       },
//       {
//         key: "TrangThaiLamViec",
//         header: "Trạng thái",
//         align: "center",
//         sortable: true,
//         sortValue: (r: TeacherItem) => r.TrangThaiLamViec ?? "-1",
//         render: (r: TeacherItem) => <StatusBadge value={r.TrangThaiLamViec} />,
//       },
//       {
//         key: "actions",
//         header: "Thao tác",
//         align: "right",
//         render: (r: TeacherItem) => {
//           const userPk = r?.TaiKhoan_detail?.IDTaiKhoan || r.TaiKhoan;
//           const disabled = loading || isToggling(userPk);

//           const inactive =
//             r?.TaiKhoan_detail?.BiVoHieuHoa === true ||
//             r?.TaiKhoan_detail?.is_active === false;

//           return (
//             <div className="flex justify-end gap-2">
//               <button
//                 type="button"
//                 className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   openModalEdit(r);
//                 }}
//                 disabled={disabled}
//               >
//                 Sửa
//               </button>

//               {/* ✅ Active/Disable */}
//               <button
//                 type="button"
//                 className={[
//                   "h-9 rounded-lg px-3 text-sm font-semibold border disabled:opacity-60",
//                   inactive
//                     ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
//                     : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
//                 ].join(" ")}
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   handleToggleAccount(r);
//                 }}
//                 disabled={disabled || !userPk}
//                 title={!userPk ? "Không tìm thấy user_id (pk)" : undefined}
//               >
//                 {isToggling(userPk)
//                   ? "Đang xử lý..."
//                   : inactive
//                   ? "Activate"
//                   : "Disable"}
//               </button>

//               {/* ❌ Ẩn chức năng xoá */}
//             </div>
//           );
//         },
//       },
//     ],
//     [loading, togglingIds]
//   );

//   return (
//     <FormProvider {...forms}>
//       <ContentLayoutWrapper heading="Quản lý giáo viên">
//         {errMsg ? (
//           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
//             {errMsg}
//           </div>
//         ) : null}

//         {/* Toolbar */}
//         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex flex-wrap items-center justify-between gap-4">
//             <div>
//               <h2 className="m-0 text-xl font-bold text-slate-800">Danh sách giáo viên</h2>
//               <p className="mt-1 text-slate-500">
//                 Quản lý tài khoản (Activate/Disable). Đã ẩn chức năng xoá.
//               </p>
//             </div>

//             <div className="flex flex-wrap items-center gap-3">
//               <Input
//                 name="search"
//                 type="search"
//                 placeholder="Tìm theo ID / email / họ tên / chuyên môn..."
//                 inputClassName="focus:ring-4 focus:ring-violet-100 w-[500px] min-w-[200px]"
//               />

//               <button
//                 type="button"
//                 onClick={fetchAll}
//                 className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
//                 disabled={loading || togglingIds.size > 0}
//               >
//                 {loading ? "Đang tải..." : "Reload"}
//               </button>

//               <div className="text-right font-semibold text-slate-700">
//                 {filtered.length} giáo viên
//               </div>

//               <button
//                 type="button"
//                 onClick={() => {
//                   // ✅ set default random id mỗi lần mở create
//                   setCreateDefaultId(generateRandomTeacherId());
//                   setOpenCreate(true);
//                 }}
//                 className="h-10 px-4 rounded-xl bg-violet-600 text-white font-semibold"
//               >
//                 + Thêm giáo viên
//               </button>
//             </div>
//           </div>
//         </div>

//         <Table<TeacherItem>
//           columns={columns}
//           data={filtered.filter((t) => t.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 3)} // chỉ hiện giáo viên
//           getRowId={(row) => row.GiaoVienID}
//           loading={loading}
//           emptyText="Không có giáo viên phù hợp."
//           // ✅ không cần selectable nữa vì đã bỏ bulk delete (tuỳ sếp muốn giữ)
//           selectable={false}
//           maxHeightClassName="max-h-[640px]"
//           onRowClick={(row) => console.log("Row click:", row)}
//         />
//       </ContentLayoutWrapper>

//       <EditTeacherModal
//         open={openEdit}
//         teacher={editing}
//         onClose={closeModalEdit}
//         onUpdated={(updated) => {
//           setTeachers((prev) =>
//             prev.map((t) => (t.GiaoVienID === updated.GiaoVienID ? updated : t))
//           );
//         }}
//       />

//       {/* ✅ Create teacher: truyền defaultTeacherId để modal set default */}
//       <CreateTeacherModal
//         open={openCreate}
//         onClose={() => setOpenCreate(false)}
//         onCreated={fetchAll}
//         defaultTeacherId={createDefaultId}
//       />
//     </FormProvider>
//   );
// }

// //-----------------------------------------------------

// // import React, { useEffect, useMemo, useState, type JSX } from "react";
// // import { FormProvider, useForm } from "react-hook-form";
// // import { Input, Table, type Column } from "elements";
// // import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// // import { http } from "utils/libs/https";
// // import EditTeacherModal from "components/edit-teacher-modal";
// // import { CreateTeacherModal } from "components/create-teacher-modal";

// // // ===== Types theo response API =====
// // type QuyenDetail = { IDQuyen: number; TenQuyen: string };

// // type TaiKhoanDetail = {
// //   IDTaiKhoan: string;
// //   Email: string;
// //   HoTen: string;
// //   AnhDaiDien: string | null;
// //   SoDienThoai: number | null;
// //   NgayTaoTaiKhoan: string;
// //   TrangThaiTaiKhoan: string | null;
// //   IDQuyen: number;
// //   IDQuyen_detail?: QuyenDetail | null;
// // };

// // type TeacherItem = {
// //   GiaoVienID: string;
// //   TaiKhoan: string;
// //   TaiKhoan_detail?: TaiKhoanDetail | null;

// //   ChuyenMon: string | null;
// //   KinhNghiem: string | null;
// //   BangCapChungChi: string | null;
// //   MoTaBanThan: string | null;
// //   ThongTinNganHang: string | null;
// //   TrangThaiLamViec: string | null;
// //   SoTaiKhoan: number | null;
// // };

// // type TeacherListResponse = {
// //   count: number;
// //   next: string | null;
// //   previous: string | null;
// //   results: TeacherItem[];
// // };

// // type FormValues = { search: string };

// // // ===== API =====
// // async function getTeachers() {
// //   const res = await http.get<TeacherListResponse>("/api/auth/teachers/");
// //   return res.data;
// // }

// // async function deleteTeacher(giaoVienId: string) {
// //   return http.delete(`/api/auth/teachers/${giaoVienId}/`);
// // }

// // // ===== Helpers =====
// // function safeStr(v: unknown) {
// //   if (v == null) return "";
// //   return String(v);
// // }

// // function formatDateTime(iso?: string | null) {
// //   if (!iso) return "—";
// //   const d = new Date(iso);
// //   if (Number.isNaN(d.getTime())) return safeStr(iso);

// //   const yyyy = d.getFullYear();
// //   const mm = String(d.getMonth() + 1).padStart(2, "0");
// //   const dd = String(d.getDate()).padStart(2, "0");
// //   const hh = String(d.getHours()).padStart(2, "0");
// //   const mi = String(d.getMinutes()).padStart(2, "0");
// //   return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
// // }

// // function RoleBadge({ role }: { role: string }) {
// //   const base =
// //     "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border";
// //   if (role === "Giáo Viên")
// //     return (
// //       <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
// //         Giáo Viên
// //       </span>
// //     );
// //   if (role === "Học Viên")
// //     return (
// //       <span
// //         className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}
// //       >
// //         Học Viên
// //       </span>
// //     );
// //   return (
// //     <span className={`${base} bg-slate-50 text-slate-700 border-slate-200`}>
// //       {role || "—"}
// //     </span>
// //   );
// // }

// // function statusLabel(v: string | null | undefined) {
// //   switch (v) {
// //     case "1":
// //       return {
// //         text: "Đang làm",
// //         cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
// //       };
// //     case "2":
// //       return {
// //         text: "Tạm nghỉ",
// //         cls: "bg-amber-50 text-amber-700 border-amber-200",
// //       };
// //     case "3":
// //       return {
// //         text: "Nghỉ việc",
// //         cls: "bg-rose-50 text-rose-700 border-rose-200",
// //       };
// //     default:
// //       return {
// //         text: "Chưa set",
// //         cls: "bg-slate-50 text-slate-700 border-slate-200",
// //       };
// //   }
// // }

// // function StatusBadge({ value }: { value: string | null | undefined }) {
// //   const s = statusLabel(value);
// //   return (
// //     <span
// //       className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${s.cls}`}
// //     >
// //       {s.text}
// //       {typeof value === "number" ? (
// //         <span className="ml-2 text-[11px] opacity-70">({value})</span>
// //       ) : null}
// //     </span>
// //   );
// // }

// // export default function TeachersPage(): JSX.Element {
// //   const forms = useForm<FormValues>({ defaultValues: { search: "" } });

// //   const [openCreate, setOpenCreate] = useState(false);

// //   const [openEdit, setOpenEdit] = useState(false);
// //   const [editing, setEditing] = useState<TeacherItem | null>(null);

// //   const [teachers, setTeachers] = useState<TeacherItem[]>([]);
// //   const [loading, setLoading] = useState(false);
// //   const [errMsg, setErrMsg] = useState<string | null>(null);

// //   // selection
// //   const [selectedIds, setSelectedIds] = useState<string[]>([]);

// //   // deleting states
// //   const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
// //   const [bulkDeleting, setBulkDeleting] = useState(false);

// //   const search = forms.watch("search") ?? "";

// //   const isDeleting = (id: string) => deletingIds.has(id);

// //   const setDeleting = (id: string, value: boolean) => {
// //     setDeletingIds((prev) => {
// //       const next = new Set(prev);
// //       if (value) next.add(id);
// //       else next.delete(id);
// //       return next;
// //     });
// //   };

// //   const openModalEdit = (t: TeacherItem) => {
// //     setEditing(t);
// //     setOpenEdit(true);
// //   };

// //   const closeModalEdit = () => {
// //     setOpenEdit(false);
// //     setEditing(null);
// //   };

// //   async function fetchAll() {
// //     setLoading(true);
// //     setErrMsg(null);
// //     try {
// //       const data = await getTeachers();
// //       setTeachers(data.results ?? []);
// //       setSelectedIds([]);
// //     } catch (e: any) {
// //       setErrMsg(
// //         e?.response?.data?.detail ||
// //           e?.response?.data?.message ||
// //           e?.message ||
// //           "Không tải được dữ liệu."
// //       );
// //     } finally {
// //       setLoading(false);
// //     }
// //   }

// //   useEffect(() => {
// //     fetchAll();
// //   }, []);

// //   // ✅ Search client-side
// //   const filtered = useMemo(() => {
// //     let list = teachers;
// //     const kw = search.trim().toLowerCase();
// //     if (!kw) return list;

// //     return list.filter((t) => {
// //       const tk = t.TaiKhoan_detail;
// //       const role = tk?.IDQuyen_detail?.TenQuyen ?? "";
// //       const text =
// //         `${t.GiaoVienID} ${t.TaiKhoan} ${tk?.Email ?? ""} ${tk?.HoTen ?? ""} ${
// //           tk?.SoDienThoai ?? ""
// //         } ${role} ${tk?.NgayTaoTaiKhoan ?? ""} ${t.ChuyenMon ?? ""} ${
// //           t.KinhNghiem ?? ""
// //         } ${t.BangCapChungChi ?? ""} ${t.TrangThaiLamViec ?? ""} ${
// //           t.SoTaiKhoan ?? ""
// //         } ${t.ThongTinNganHang ?? ""}`.toLowerCase();

// //       return text.includes(kw);
// //     });
// //   }, [teachers, search]);

// //   // ✅ xoá 1
// //   async function handleDeleteOne(item: TeacherItem) {
// //     const id = item.GiaoVienID;
// //     if (bulkDeleting || isDeleting(id)) return;

// //     const ok = window.confirm(`Bạn có chắc muốn xoá giáo viên: ${id} không?`);
// //     if (!ok) return;

// //     setDeleting(id, true);
// //     try {
// //       await deleteTeacher(id);

// //       setTeachers((prev) => prev.filter((x) => x.GiaoVienID !== id));
// //       setSelectedIds((prev) => prev.filter((x) => x !== id));
// //     } catch (e: any) {
// //       alert(
// //         e?.response?.data?.detail ||
// //           e?.response?.data?.message ||
// //           e?.message ||
// //           "Xoá giáo viên thất bại"
// //       );
// //     } finally {
// //       setDeleting(id, false);
// //     }
// //   }

// //   // ✅ xoá nhiều
// //   async function handleBulkDelete() {
// //     if (bulkDeleting) return;
// //     if (selectedIds.length === 0) return;

// //     const ok = window.confirm(
// //       `Bạn có chắc muốn xoá ${selectedIds.length} giáo viên đã chọn không?`
// //     );
// //     if (!ok) return;

// //     setBulkDeleting(true);
// //     selectedIds.forEach((id) => setDeleting(id, true));

// //     try {
// //       const results = await Promise.allSettled(
// //         selectedIds.map((id) => deleteTeacher(id))
// //       );

// //       const successIds: string[] = [];
// //       const failed: { id: string; reason: any }[] = [];

// //       results.forEach((r, idx) => {
// //         const id = selectedIds[idx];
// //         if (r.status === "fulfilled") successIds.push(id);
// //         else failed.push({ id, reason: r.reason });
// //       });

// //       if (successIds.length > 0) {
// //         setTeachers((prev) =>
// //           prev.filter((t) => !successIds.includes(t.GiaoVienID))
// //         );
// //         setSelectedIds((prev) => prev.filter((id) => !successIds.includes(id)));
// //       }

// //       if (failed.length > 0) {
// //         const msg =
// //           `Xoá thất bại ${failed.length} giáo viên:\n` +
// //           failed
// //             .slice(0, 10)
// //             .map(
// //               (x) =>
// //                 `- ${x.id}: ${
// //                   x.reason?.response?.data?.detail ||
// //                   x.reason?.response?.data?.message ||
// //                   x.reason?.message ||
// //                   "Lỗi"
// //                 }`
// //             )
// //             .join("\n") +
// //           (failed.length > 10 ? `\n... và ${failed.length - 10} lỗi khác` : "");
// //         alert(msg);
// //       }
// //     } finally {
// //       selectedIds.forEach((id) => setDeleting(id, false));
// //       setBulkDeleting(false);
// //     }
// //   }

// //   const columns: Column<TeacherItem>[] = useMemo(
// //     () => [
// //       //   {
// //       //     key: "giaovienid",
// //       //     header: "GiaoVienID",
// //       //     sortable: true,
// //       //     sortValue: (r) => r.GiaoVienID,
// //       //     render: (r: TeacherItem) => (
// //       //       <span className="font-semibold">{r.GiaoVienID}</span>
// //       //     ),
// //       //   },
// //       {
// //         key: "email",
// //         header: "Email",
// //         sortable: true,
// //         sortValue: (r) => r?.TaiKhoan_detail?.Email ?? r.TaiKhoan ?? "",
// //         render: (r: TeacherItem) => (
// //           <div className="max-w-60 truncate">
// //             {safeStr(r?.TaiKhoan_detail?.Email ?? r.TaiKhoan)}
// //           </div>
// //         ),
// //       },
// //       {
// //         key: "hoten",
// //         header: "Họ tên",
// //         sortable: true,
// //         sortValue: (r) => r?.TaiKhoan_detail?.HoTen ?? "",
// //         render: (r: TeacherItem) => safeStr(r?.TaiKhoan_detail?.HoTen) || "—",
// //       },
// //       {
// //         key: "sdt",
// //         header: "SĐT",
// //         align: "right",
// //         sortable: true,
// //         sortValue: (r) => r?.TaiKhoan_detail?.SoDienThoai ?? -1,
// //         render: (r: TeacherItem) =>
// //           safeStr(r?.TaiKhoan_detail?.SoDienThoai) || "—",
// //       },
// //       //   {
// //       //     key: "quyen",
// //       //     header: "Quyền",
// //       //     sortable: true,
// //       //     sortValue: (r) => r?.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen ?? "",
// //       //     render: (r: TeacherItem) => (
// //       //       <RoleBadge
// //       //         role={r?.TaiKhoan_detail?.IDQuyen_detail?.TenQuyen ?? ""}
// //       //       />
// //       //     ),
// //       //   },
// //       {
// //         key: "ngaytao",
// //         header: "Ngày tạo",
// //         sortable: true,
// //         sortValue: (r) => r?.TaiKhoan_detail?.NgayTaoTaiKhoan ?? "",
// //         render: (r: TeacherItem) => (
// //           <span className="whitespace-nowrap">
// //             {formatDateTime(r?.TaiKhoan_detail?.NgayTaoTaiKhoan)}
// //           </span>
// //         ),
// //       },
// //       {
// //         key: "chuyenmon",
// //         header: "Chuyên môn",
// //         sortable: true,
// //         sortValue: (r) => r?.ChuyenMon ?? "",
// //         render: (r: TeacherItem) => (
// //           <div className="max-w-55 truncate">
// //             {safeStr(r?.ChuyenMon) || "—"}
// //           </div>
// //         ),
// //       },
// //       {
// //         key: "kinhnghiem",
// //         header: "Kinh nghiệm",
// //         sortable: true,
// //         sortValue: (r) => r?.KinhNghiem ?? "",
// //         render: (r: TeacherItem) => (
// //           <div className="max-w-55 truncate">
// //             {safeStr(r?.KinhNghiem) || "—"}
// //           </div>
// //         ),
// //       },
// //       {
// //         key: "TrangThaiLamViec",
// //         header: "Trạng thái",
// //         align: "center",
// //         sortable: true,
// //         sortValue: (r: TeacherItem) => r.TrangThaiLamViec ?? -1, // null xuống cuối/đầu tuỳ sếp
// //         render: (r: TeacherItem) => <StatusBadge value={r.TrangThaiLamViec} />,
// //       },
// //       {
// //         key: "actions",
// //         header: "Thao tác",
// //         align: "right",
// //         render: (r: TeacherItem) => {
// //           const disabled = bulkDeleting || isDeleting(r.GiaoVienID);
// //           return (
// //             <div className="flex justify-end gap-2">
// //               <button
// //                 type="button"
// //                 className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
// //                 onClick={(e) => {
// //                   e.stopPropagation();
// //                   openModalEdit(r);
// //                 }}
// //                 disabled={bulkDeleting || isDeleting(r.GiaoVienID)}
// //               >
// //                 Sửa
// //               </button>

// //               <button
// //                 type="button"
// //                 className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
// //                 onClick={(e) => {
// //                   e.stopPropagation();
// //                   handleDeleteOne(r);
// //                 }}
// //                 disabled={disabled}
// //               >
// //                 {isDeleting(r.GiaoVienID) ? "Đang xoá..." : "Xoá"}
// //               </button>
// //             </div>
// //           );
// //         },
// //       },
// //     ],
// //     [bulkDeleting, deletingIds]
// //   );

// //   const anySelected = selectedIds.length > 0;

// //   return (
// //     <FormProvider {...forms}>
// //       <ContentLayoutWrapper heading="Quản lý giáo viên">
// //         {errMsg ? (
// //           <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
// //             {errMsg}
// //           </div>
// //         ) : null}

// //         {/* Toolbar giống QuestionsPage */}
// //         <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
// //           <div className="flex flex-wrap items-center justify-between gap-4">
// //             <div>
// //               <h2 className="m-0 text-xl font-bold text-slate-800">
// //                 Danh sách giáo viên
// //               </h2>
// //               {/* <p className="mt-1 text-slate-500">
// //                 Search client-side + chọn checkbox để xoá nhiều.
// //               </p> */}
// //             </div>

// //             <div className="flex flex-wrap items-center gap-3">
// //               <Input
// //                 name="search"
// //                 type="search"
// //                 placeholder="Tìm theo ID / email / họ tên / chuyên môn..."
// //                 inputClassName="focus:ring-4 focus:ring-violet-100 w-[500px] min-w-[200px]"
// //               />

// //               <button
// //                 type="button"
// //                 onClick={fetchAll}
// //                 className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60"
// //                 disabled={loading || bulkDeleting || deletingIds.size > 0}
// //               >
// //                 {loading ? "Đang tải..." : "Reload"}
// //               </button>

// //               <button
// //                 type="button"
// //                 onClick={handleBulkDelete}
// //                 className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-700 shadow-sm transition hover:bg-red-100 active:scale-[0.99] disabled:opacity-60"
// //                 disabled={!anySelected || bulkDeleting || loading}
// //                 title={
// //                   !anySelected ? "Chọn ít nhất 1 giáo viên để xoá" : undefined
// //                 }
// //               >
// //                 {bulkDeleting
// //                   ? `Đang xoá (${selectedIds.length})...`
// //                   : `Xoá đã chọn (${selectedIds.length})`}
// //               </button>

// //               <div className="text-right font-semibold text-slate-700">
// //                 {filtered.length} giáo viên
// //               </div>
// //               <button
// //                 onClick={() => setOpenCreate(true)}
// //                 className="h-10 px-4 rounded-xl bg-violet-600 text-white font-semibold"
// //               >
// //                 + Thêm giáo viên
// //               </button>
// //             </div>
// //           </div>
// //         </div>

// //         <Table<TeacherItem>
// //           columns={columns}
// //           data={filtered.filter((t) => t.TaiKhoan_detail?.IDQuyen_detail?.IDQuyen === 3)} // chỉ hiện giáo viên
// //           getRowId={(row) => row.GiaoVienID}
// //           loading={loading}
// //           emptyText="Không có giáo viên phù hợp."
// //           selectable
// //           selectedIds={selectedIds}
// //           onSelectedIdsChange={setSelectedIds}
// //           onRowClick={(row) => console.log("Row click:", row)}
// //           maxHeightClassName="max-h-[640px]"
// //         />
// //       </ContentLayoutWrapper>
// //       <EditTeacherModal
// //         open={openEdit}
// //         teacher={editing}
// //         onClose={closeModalEdit}
// //         onUpdated={(updated) => {
// //           setTeachers((prev) =>
// //             prev.map((t) => (t.GiaoVienID === updated.GiaoVienID ? updated : t))
// //           );
// //         }}
// //       />
// //       <CreateTeacherModal
// //         open={openCreate}
// //         onClose={() => setOpenCreate(false)}
// //         onCreated={fetchAll}
// //       />
// //     </FormProvider>
// //   );
// // }
