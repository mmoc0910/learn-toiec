import React, { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { Input } from "elements"; // hoặc "elements/input" tuỳ project
import {
  patchTeacher,
  type PatchTeacherPayload,
  type TeacherItem,
} from "api/teachers";
import { Modal } from "elements/modal/modal";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";

type Props = {
  open: boolean;
  teacher: TeacherItem | null;
  onClose: () => void;
  onUpdated: (updated: TeacherItem) => void;
};

type FormValues = {
  Email: string;
  HoTen: string;
  SoDienThoai: string;
  AnhDaiDien: string;

  ChuyenMon: string;
  KinhNghiem: string;
  BangCapChungChi: string;
  MoTaBanThan: string;
  ThongTinNganHang: string;
  TrangThaiLamViec: string;
  SoTaiKhoan: string;
};

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

export default function EditTeacherModal({
  open,
  teacher,
  onClose,
  onUpdated,
}: Props) {
  const forms = useForm<FormValues>({
    defaultValues: {
      Email: "",
      HoTen: "",
      SoDienThoai: "",
      AnhDaiDien: "",

      ChuyenMon: "",
      KinhNghiem: "",
      BangCapChungChi: "",
      MoTaBanThan: "",
      ThongTinNganHang: "",
      TrangThaiLamViec: "",
      SoTaiKhoan: "",
    },
  });

  const { reset, handleSubmit, formState } = forms;
  const isSubmitting = formState.isSubmitting;

  useEffect(() => {
    if (!open) return;

    // để modal luôn hiện form, kể cả teacher null
    if (!teacher) {
      reset({
        Email: "",
        HoTen: "",
        SoDienThoai: "",
        AnhDaiDien: "",
        ChuyenMon: "",
        KinhNghiem: "",
        BangCapChungChi: "",
        MoTaBanThan: "",
        ThongTinNganHang: "",
        TrangThaiLamViec: "",
        SoTaiKhoan: "",
      });
      return;
    }

    reset({
      Email: teacher.TaiKhoan_detail?.Email ?? "",
      HoTen: teacher.TaiKhoan_detail?.HoTen ?? "",
      SoDienThoai:
        teacher.TaiKhoan_detail?.SoDienThoai != null
          ? String(teacher.TaiKhoan_detail.SoDienThoai)
          : "",
      AnhDaiDien: teacher.TaiKhoan_detail?.AnhDaiDien ?? "",

      ChuyenMon: teacher.ChuyenMon ?? "",
      KinhNghiem: teacher.KinhNghiem ?? "",
      BangCapChungChi: teacher.BangCapChungChi ?? "",
      MoTaBanThan: teacher.MoTaBanThan ?? "",
      ThongTinNganHang: teacher.ThongTinNganHang ?? "",
      TrangThaiLamViec: teacher.TrangThaiLamViec ?? "",
      SoTaiKhoan: teacher.SoTaiKhoan != null ? String(teacher.SoTaiKhoan) : "",
    });
  }, [open, teacher, reset]);

  const title = useMemo(() => {
    return teacher ? `Sửa giáo viên • ${teacher.GiaoVienID}` : "Sửa giáo viên";
  }, [teacher]);

  const onSubmit = async (vals: FormValues) => {
    if (!teacher) return;

    const payload: PatchTeacherPayload = {
      ChuyenMon: toNullableString(vals.ChuyenMon),
      KinhNghiem: toNullableString(vals.KinhNghiem),
      BangCapChungChi: toNullableString(vals.BangCapChungChi),
      MoTaBanThan: toNullableString(vals.MoTaBanThan),
      ThongTinNganHang: toNullableString(vals.ThongTinNganHang),
      TrangThaiLamViec: toNullableString(vals.TrangThaiLamViec),
      SoTaiKhoan: toNullableNumber(vals.SoTaiKhoan),

      // nếu backend không support nested PATCH → xoá block TaiKhoan_detail này
      TaiKhoan_detail: {
        Email: vals.Email.trim() || undefined,
        HoTen: vals.HoTen.trim() || undefined,
        AnhDaiDien: vals.AnhDaiDien.trim() || null,
        SoDienThoai: toNullableNumber(vals.SoDienThoai),
      },
    };

    try {
      const updated: TeacherItem = await patchTeacher(
        teacher.GiaoVienID,
        payload
      );
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      alert(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Cập nhật giáo viên thất bại"
      );
    }
  };

  const footer = (
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
        form="edit-teacher-form"
        disabled={isSubmitting || !teacher}
        className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:opacity-95 disabled:opacity-60"
      >
        {isSubmitting ? "Đang lưu..." : "Lưu"}
      </button>
    </div>
  );

  return (
    <FormProvider {...forms}>
      <Modal
        open={open}
        onClose={() => !isSubmitting && onClose()}
        title={title}
        width={920}
        closeOnOverlayClick={!isSubmitting}
        closeOnEsc={!isSubmitting}
        footer={footer}
      >
        <form
          id="edit-teacher-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
        >
          {!teacher ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
              Không có dữ liệu giáo viên để sửa.
            </div>
          ) : null}

          {/* Thông tin tài khoản */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="mb-3 text-sm font-bold text-slate-800">
              Thông tin tài khoản
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                name="Email"
                label="Email"
                placeholder="teacher@example.com"
              />
              <Input name="HoTen" label="Họ tên" placeholder="Nguyễn Văn A" />
              <Input
                name="SoDienThoai"
                label="Số điện thoại"
                placeholder="0123456789"
                type="text"
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
              <Input
                name="BangCapChungChi"
                label="Bằng cấp / Chứng chỉ"
                placeholder="TESOL / TOEIC 900..."
              />
              <DropdownSelectPortal
                name="TrangThaiLamViec"
                label="Trạng thái làm việc"
                placeholder="Chọn trạng thái"
                options={[
                  { label: "Đang làm", value: "1" },
                  { label: "Tạm nghỉ", value: "2" },
                  { label: "Nghỉ việc", value: "3" },
                ]}
                menuWidth={260}
                placement="bottom"
                // ✅ optional: maxMenuHeight={240}
                zIndex={1200}
              />

              <Input
                name="SoTaiKhoan"
                label="Số tài khoản"
                placeholder="123456789"
                type="text"
              />
              <Input
                name="ThongTinNganHang"
                label="Thông tin ngân hàng"
                placeholder="Tên NH - Chi nhánh..."
              />

              {/* Textarea: vì Input component của sếp chỉ hỗ trợ <input>, nên dùng textarea thường */}
              <div className="flex flex-col md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
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
