// components/create-teacher-modal.tsx
import React, { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { http } from "utils/libs/https";
import { Modal } from "elements/modal/modal";

// ===== types payload (tối thiểu) =====
type CreateTeacherPayload = {
  // ✅ thêm GiaoVienID để id giáo viên sinh ngẫu nhiên
  GiaoVienID: string;

  TaiKhoan: string;
  TaiKhoan_detail: {
    IDTaiKhoan: string;
    Email: string;
    password: string;
    HoTen: string;
    AnhDaiDien?: string | null;
    SoDienThoai?: number | null;
    IDQuyen: number; // 3 = Giáo viên
  };
  ChuyenMon?: string | null;
  KinhNghiem?: string | null;
  BangCapChungChi?: string | null;
  MoTaBanThan?: string | null;
  ThongTinNganHang?: string | null;
  TrangThaiLamViec: number; // ✅ number
  SoTaiKhoan?: number | null;
};

// ===== API =====
async function createTeacher(payload: CreateTeacherPayload) {
  const res = await http.post("/api/auth/teachers/", payload);
  return res.data;
}

// ===== helper generate random IDs =====
function randStr(len = 8) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + len);
}

// ✅ sinh random TaiKhoan/IDTaiKhoan (không lấy từ email)
function generateTeacherAccount(prefix = "gv") {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return `${prefix}_${ymd}_${randStr(8)}`;
}

// ✅ sinh random GiaoVienID (id giáo viên)
function generateTeacherId(prefix = "teacher") {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `${prefix}_${uuid}`;
  } catch {
    // ignore
  }
  return `${prefix}_${Date.now()}_${randStr(10)}`;
}

function toNullableString(v: string) {
  const t = v.trim();
  return t ? t : null;
}
function toNullableNumber(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;

  // ✅ optional: nếu page muốn truyền sẵn id (em đã set ở TeachersPage)
  defaultTeacherId?: string; // GiaoVienID
};

type FormValues = {
  GiaoVienID: string; // ✅ auto generated
  TaiKhoan: string; // ✅ auto generated

  Email: string;
  password: string;
  HoTen: string;
  SoDienThoai: string;
  AnhDaiDien: string;

  ChuyenMon: string;
  KinhNghiem: string;
  BangCapChungChi: string;
  MoTaBanThan: string;
  ThongTinNganHang: string;
  SoTaiKhoan: string;

  TrangThaiLamViec: number | ""; // dropdown
};

export function CreateTeacherModal({
  open,
  onClose,
  onCreated,
  defaultTeacherId,
}: Props) {
  const forms = useForm<FormValues>({
    defaultValues: {
      GiaoVienID: "",
      TaiKhoan: "",
      Email: "",
      password: "",
      HoTen: "",
      SoDienThoai: "",
      AnhDaiDien: "",

      ChuyenMon: "",
      KinhNghiem: "",
      BangCapChungChi: "",
      MoTaBanThan: "",
      ThongTinNganHang: "",
      SoTaiKhoan: "",

      TrangThaiLamViec: "",
    },
    mode: "onSubmit",
  });

  const { reset, handleSubmit, formState, setValue } = forms;
  const isSubmitting = formState.isSubmitting;

  // ✅ mỗi lần mở modal => generate TaiKhoan + GiaoVienID mới
  useEffect(() => {
    if (!open) return;

    const tk = generateTeacherAccount("gv");
    const gvId = defaultTeacherId?.trim()
      ? defaultTeacherId.trim()
      : generateTeacherId("gv");

    reset({
      GiaoVienID: gvId,
      TaiKhoan: tk,
      Email: "",
      password: "",
      HoTen: "",
      SoDienThoai: "",
      AnhDaiDien: "",
      ChuyenMon: "",
      KinhNghiem: "",
      BangCapChungChi: "",
      MoTaBanThan: "",
      ThongTinNganHang: "",
      SoTaiKhoan: "",
      TrangThaiLamViec: "",
    });

    // nếu sếp muốn default trạng thái = 1
    // setValue("TrangThaiLamViec", 1);
  }, [open, reset, setValue, defaultTeacherId]);

  const footer = useMemo(() => {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Huỷ
        </button>
        <button
          type="submit"
          form="create-teacher-form"
          disabled={isSubmitting}
          className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:opacity-95 disabled:opacity-60"
        >
          {isSubmitting ? "Đang tạo..." : "Tạo giáo viên"}
        </button>
      </div>
    );
  }, [isSubmitting, onClose]);

  const onSubmit = async (vals: FormValues) => {
    console.log("Submit create teacher:", vals);
    if (vals.TrangThaiLamViec === "") {
      alert("Vui lòng chọn Trạng thái làm việc");
      return;
    }

    // basic validate
    if (!vals.GiaoVienID.trim()) {
      alert("Thiếu GiaoVienID");
      return;
    }
    if (!vals.TaiKhoan.trim()) {
      alert("Thiếu TaiKhoan");
      return;
    }

    const payload: CreateTeacherPayload = {
      GiaoVienID: vals.GiaoVienID.trim(),

      TaiKhoan: vals.TaiKhoan.trim(),
      TaiKhoan_detail: {
        IDTaiKhoan: vals.TaiKhoan.trim(), // ✅ không lấy từ email
        Email: vals.Email.trim(),
        password: vals.password,
        HoTen: vals.HoTen.trim(),
        AnhDaiDien: toNullableString(vals.AnhDaiDien) ?? null,
        SoDienThoai: toNullableNumber(vals.SoDienThoai),
        IDQuyen: 3,
      },

      ChuyenMon: toNullableString(vals.ChuyenMon),
      KinhNghiem: toNullableString(vals.KinhNghiem),
      BangCapChungChi: toNullableString(vals.BangCapChungChi),
      MoTaBanThan: toNullableString(vals.MoTaBanThan),
      ThongTinNganHang: toNullableString(vals.ThongTinNganHang),
      SoTaiKhoan: toNullableNumber(vals.SoTaiKhoan),

      TrangThaiLamViec: Number(vals.TrangThaiLamViec),
    };

    try {
      await createTeacher(payload);
      onCreated?.();
      onClose();
    } catch (e: any) {
      // show detail server errors (nếu trả object field)
      const data = e?.response?.data;

      if (data && typeof data === "object") {
        const msg =
          data?.detail ||
          data?.message ||
          Object.keys(data)
            .slice(0, 8)
            .map((k) => {
              const v = (data as any)[k];
              const text = Array.isArray(v) ? v.join(" ") : String(v);
              return `- ${k}: ${text}`;
            })
            .join("\n");

        alert(msg || "Tạo giáo viên thất bại");
        return;
      }

      alert(e?.message || "Tạo giáo viên thất bại");
    }
  };

  return (
    <FormProvider {...forms}>
      <Modal
        open={open}
        onClose={() => !isSubmitting && onClose()}
        title="Thêm giáo viên"
        width={920}
        closeOnOverlayClick={!isSubmitting}
        closeOnEsc={!isSubmitting}
        footer={footer}
      >
        <form
          id="create-teacher-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 overflow-auto"
        >
          {/* Thông tin tài khoản */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-bold text-slate-800">
              Thông tin tài khoản
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* ✅ GiaoVienID */}
              <Input
                name="GiaoVienID"
                label="GiaoVienID (tự sinh)"
                rules={{ required: "Bắt buộc" }}
                inputClassName="bg-slate-100 cursor-not-allowed"
              />

              {/* ✅ TaiKhoan */}
              <Input
                name="TaiKhoan"
                label="Id tài khoản (tự sinh)"
                rules={{ required: "Bắt buộc" }}
                inputClassName="bg-slate-100 cursor-not-allowed"
              />

              <Input
                name="Email"
                label="Email"
                type="email"
                placeholder="teacher@example.com"
                rules={{ required: "Bắt buộc" }}
              />

              <Input
                name="password"
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                rules={{ required: "Bắt buộc" }}
              />

              <Input
                name="HoTen"
                label="Họ tên"
                placeholder="Nguyễn Văn A"
                rules={{ required: "Bắt buộc" }}
              />

              <Input
                name="SoDienThoai"
                label="Số điện thoại"
                placeholder="0123456789"
              />

              <Input
                name="AnhDaiDien"
                label="Ảnh đại diện (URL)"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Thông tin giáo viên */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-bold text-slate-800">
              Thông tin giáo viên
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                name="ChuyenMon"
                label="Chuyên môn"
                placeholder="TOEIC / IELTS..."
              />
              <Input
                name="KinhNghiem"
                label="Kinh nghiệm"
                placeholder="Kinh nghiệm 5 năm"
              />

              <DropdownSelectPortal
                name="TrangThaiLamViec"
                label="Trạng thái làm việc"
                rules={{ required: "Bắt buộc" }}
                placeholder="Chọn trạng thái"
                options={[
                  { label: "Đang làm", value: 1 },
                  { label: "Tạm nghỉ", value: 2 },
                  { label: "Nghỉ việc", value: 3 },
                ]}
                menuWidth={260}
                placement="bottom"
                zIndex={1200}
              />

              <Input
                name="SoTaiKhoan"
                label="Số tài khoản"
                placeholder="123456789"
              />

              <Input
                name="ThongTinNganHang"
                label="Thông tin ngân hàng"
                placeholder="Tên NH - Chi nhánh..."
              />

              <div className="flex flex-col md:col-span-2">
                <label className="block text-sm font-medium">
                  Bằng cấp / Chứng chỉ
                </label>
                <textarea
                  {...forms.register("BangCapChungChi")}
                  className="min-h-17.5 w-full rounded-xl border border-[#e0e0e0] px-4 py-2 outline-none placeholder:text-slate-600 bg-white focus:ring-4 focus:ring-violet-100"
                  placeholder="TESOL / TOEIC 900..."
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="block text-sm font-medium">
                  Mô tả bản thân
                </label>
                <textarea
                  {...forms.register("MoTaBanThan")}
                  className="min-h-27.5 w-full rounded-xl border border-[#e0e0e0] px-4 py-2 outline-none placeholder:text-slate-600 bg-white focus:ring-4 focus:ring-violet-100"
                  placeholder="Giới thiệu ngắn..."
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </FormProvider>
  );
}

//-------------------------------------------------------------
// // components/create-teacher-modal.tsx
// import React, { useEffect, useMemo } from "react";
// import { FormProvider, useForm } from "react-hook-form";
// // sửa path đúng project
// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import { http } from "utils/libs/https"; // sửa đúng nơi sếp đang dùng
// import { Modal } from "elements/modal/modal";

// // ===== types payload (tối thiểu) =====
// type CreateTeacherPayload = {
//   TaiKhoan: string;
//   TaiKhoan_detail: {
//     IDTaiKhoan: string;
//     Email: string;
//     password: string;
//     HoTen: string;
//     AnhDaiDien?: string | null;
//     SoDienThoai?: number | null;
//     IDQuyen: number; // 3 = Giáo viên
//   };
//   ChuyenMon?: string | null;
//   KinhNghiem?: string | null;
//   BangCapChungChi?: string | null;
//   MoTaBanThan?: string | null;
//   ThongTinNganHang?: string | null;
//   TrangThaiLamViec: number; // ✅ number
//   SoTaiKhoan?: number | null;
// };

// // ===== API =====
// async function createTeacher(payload: CreateTeacherPayload) {
//   const res = await http.post("/api/auth/teachers/", payload);
//   return res.data;
// }

// // ===== helper generate random TaiKhoan =====
// function generateTeacherAccount(prefix = "gv") {
//   const d = new Date();
//   const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
//     d.getDate()
//   ).padStart(2, "0")}`;
//   const rand = Math.random().toString(36).slice(2, 8); // 6 chars
//   return `${prefix}_${ymd}_${rand}`;
// }

// function toNullableString(v: string) {
//   const t = v.trim();
//   return t ? t : null;
// }
// function toNullableNumber(v: string) {
//   const t = v.trim();
//   if (!t) return null;
//   const n = Number(t);
//   return Number.isFinite(n) ? n : null;
// }

// type Props = {
//   open: boolean;
//   onClose: () => void;
//   onCreated?: () => void; // gọi reload list
// };

// type FormValues = {
//   TaiKhoan: string; // ✅ auto generated
//   Email: string;
//   password: string;
//   HoTen: string;
//   SoDienThoai: string; // để input dễ, submit sẽ convert number|null
//   AnhDaiDien: string;

//   ChuyenMon: string;
//   KinhNghiem: string;
//   BangCapChungChi: string;
//   MoTaBanThan: string;
//   ThongTinNganHang: string;
//   SoTaiKhoan: string;

//   TrangThaiLamViec: number | ""; // ✅ dropdown number
// };

// export function CreateTeacherModal({ open, onClose, onCreated }: Props) {
//   const forms = useForm<FormValues>({
//     defaultValues: {
//       TaiKhoan: "",
//       Email: "",
//       password: "",
//       HoTen: "",
//       SoDienThoai: "",
//       AnhDaiDien: "",

//       ChuyenMon: "",
//       KinhNghiem: "",
//       BangCapChungChi: "",
//       MoTaBanThan: "",
//       ThongTinNganHang: "",
//       SoTaiKhoan: "",

//       TrangThaiLamViec: "",
//     },
//   });

//   const { reset, handleSubmit, formState, setValue } = forms;
//   const isSubmitting = formState.isSubmitting;

//   // ✅ mỗi lần mở modal => generate TaiKhoan mới
//   useEffect(() => {
//     if (!open) return;

//     const tk = generateTeacherAccount("gv");
//     reset({
//       TaiKhoan: tk,
//       Email: "",
//       password: "",
//       HoTen: "",
//       SoDienThoai: "",
//       AnhDaiDien: "",
//       ChuyenMon: "",
//       KinhNghiem: "",
//       BangCapChungChi: "",
//       MoTaBanThan: "",
//       ThongTinNganHang: "",
//       SoTaiKhoan: "",
//       TrangThaiLamViec: "",
//     });

//     // nếu sếp muốn default trạng thái = 1
//     // setValue("TrangThaiLamViec", 1);
//   }, [open, reset, setValue]);

//   const footer = useMemo(() => {
//     return (
//       <div className="flex items-center justify-end gap-2">
//         <button
//           type="button"
//           onClick={onClose}
//           disabled={isSubmitting}
//           className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//         >
//           Huỷ
//         </button>
//         <button
//           type="submit"
//           form="create-teacher-form"
//           disabled={isSubmitting}
//           className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:opacity-95 disabled:opacity-60"
//         >
//           {isSubmitting ? "Đang tạo..." : "Tạo giáo viên"}
//         </button>
//       </div>
//     );
//   }, [isSubmitting, onClose]);

//   const onSubmit = async (vals: FormValues) => {
//     if (vals.TrangThaiLamViec === "") {
//       alert("Vui lòng chọn Trạng thái làm việc");
//       return;
//     }

//     const payload: CreateTeacherPayload = {
//       TaiKhoan: vals.TaiKhoan,
//       TaiKhoan_detail: {
//         IDTaiKhoan: vals.TaiKhoan, // ✅ dùng đúng key
//         Email: vals.Email.trim(),
//         password: vals.password,
//         HoTen: vals.HoTen.trim(),
//         AnhDaiDien: toNullableString(vals.AnhDaiDien) ?? null,
//         SoDienThoai: toNullableNumber(vals.SoDienThoai),
//         IDQuyen: 3, // ✅ giáo viên
//       },

//       ChuyenMon: toNullableString(vals.ChuyenMon),
//       KinhNghiem: toNullableString(vals.KinhNghiem),
//       BangCapChungChi: toNullableString(vals.BangCapChungChi),
//       MoTaBanThan: toNullableString(vals.MoTaBanThan),
//       ThongTinNganHang: toNullableString(vals.ThongTinNganHang),
//       SoTaiKhoan: toNullableNumber(vals.SoTaiKhoan),

//       TrangThaiLamViec: Number(vals.TrangThaiLamViec),
//     };

//     try {
//       await createTeacher(payload);
//       onCreated?.();
//       onClose();
//     } catch (e: any) {
//       alert(
//         e?.response?.data?.detail ||
//           e?.response?.data?.message ||
//           e?.message ||
//           "Tạo giáo viên thất bại"
//       );
//     }
//   };

//   return (
//     <FormProvider {...forms}>
//       <Modal
//         open={open}
//         onClose={() => !isSubmitting && onClose()}
//         title="Thêm giáo viên"
//         width={920}
//         closeOnOverlayClick={!isSubmitting}
//         closeOnEsc={!isSubmitting}
//         footer={footer}
//       >
//         <form
//           id="create-teacher-form"
//           onSubmit={handleSubmit(onSubmit)}
//           className="space-y-5 overflow-auto"
//         >
//           {/* Thông tin tài khoản */}
//           <div className="rounded-2xl border border-slate-200 p-4">
//             <div className="mb-3 text-sm font-bold text-slate-800">
//               Thông tin tài khoản
//             </div>

//             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//               <Input
//                 name="TaiKhoan"
//                 label="Id tài khoản"
//                 rules={{ required: "Bắt buộc" }}
//                 inputClassName="bg-slate-100 cursor-not-allowed"
//               />

//               <Input
//                 name="Email"
//                 label="Email"
//                 type="email"
//                 placeholder="teacher@example.com"
//                 rules={{ required: "Bắt buộc" }}
//               />

//               <Input
//                 name="password"
//                 label="Mật khẩu"
//                 type="password"
//                 placeholder="••••••••"
//                 rules={{ required: "Bắt buộc" }}
//               />

//               <Input
//                 name="HoTen"
//                 label="Họ tên"
//                 placeholder="Nguyễn Văn A"
//                 rules={{ required: "Bắt buộc" }}
//               />

//               <Input
//                 name="SoDienThoai"
//                 label="Số điện thoại"
//                 placeholder="0123456789"
//               />

//               <Input
//                 name="AnhDaiDien"
//                 label="Ảnh đại diện (URL)"
//                 placeholder="https://..."
//               />
//             </div>
//           </div>

//           {/* Thông tin giáo viên */}
//           <div className="rounded-2xl border border-slate-200 p-4">
//             <div className="mb-3 text-sm font-bold text-slate-800">
//               Thông tin giáo viên
//             </div>

//             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//               <Input name="ChuyenMon" label="Chuyên môn" placeholder="TOEIC / IELTS..." />
//               <Input name="KinhNghiem" label="Kinh nghiệm" placeholder="Kinh nghiệm 5 năm" />

//               <DropdownSelectPortal
//                 name="TrangThaiLamViec"
//                 label="Trạng thái làm việc"
//                 rules={{ required: "Bắt buộc" }}
//                 placeholder="Chọn trạng thái"
//                 options={[
//                   { label: "Đang làm", value: 1 },
//                   { label: "Tạm nghỉ", value: 2 },
//                   { label: "Nghỉ việc", value: 3 },
//                 ]}
//                 menuWidth={260}
//                 placement="bottom"
//                 zIndex={1200} // ✅ nổi trên modal (modal default 1000)
//               />

//               <Input
//                 name="SoTaiKhoan"
//                 label="Số tài khoản"
//                 placeholder="123456789"
//               />

//               <Input
//                 name="ThongTinNganHang"
//                 label="Thông tin ngân hàng"
//                 placeholder="Tên NH - Chi nhánh..."
//               />

//               {/* Textarea (sếp chưa có component Textarea) */}
//               <div className="flex flex-col md:col-span-2">
//                 <label className="block text-sm font-medium">Bằng cấp / Chứng chỉ</label>
//                 <textarea
//                   {...forms.register("BangCapChungChi")}
//                   className="min-h-17.5 w-full rounded-xl border border-[#e0e0e0] px-4 py-2 outline-none placeholder:text-slate-600 bg-white focus:ring-4 focus:ring-violet-100"
//                   placeholder="TESOL / TOEIC 900..."
//                 />
//               </div>

//               <div className="flex flex-col md:col-span-2">
//                 <label className="block text-sm font-medium">Mô tả bản thân</label>
//                 <textarea
//                   {...forms.register("MoTaBanThan")}
//                   className="min-h-27.5 w-full rounded-xl border border-[#e0e0e0] px-4 py-2 outline-none placeholder:text-slate-600 bg-white focus:ring-4 focus:ring-violet-100"
//                   placeholder="Giới thiệu ngắn..."
//                 />
//               </div>
//             </div>
//           </div>
//         </form>
//       </Modal>
//     </FormProvider>
//   );
// }
