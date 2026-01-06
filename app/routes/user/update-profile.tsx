import { updateStudentProfile } from "api/auth.api";
import { Input } from "elements";
import { useAuth } from "hooks/useAuth";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

type FormValues = {
  HoTen: string;
  SoDienThoai: string; // nhập dạng text để dễ validate
  AnhDaiDien: string; // string URL/path
};

function extractAxiosErrorMessage(err: any): string {
  const data = err?.response?.data;
  if (!data) return err?.message || "Có lỗi xảy ra";
  if (typeof data === "string") return data;
  return data?.detail || data?.message || JSON.stringify(data);
}

export default function StudentUpdateProfileForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const methods = useForm<FormValues>({
    mode: "onBlur",
    defaultValues: {
      HoTen: user?.HoTen || "",
      SoDienThoai: user?.SoDienThoai || "",
      AnhDaiDien: user?.AnhDaiDien || "",
    },
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = methods;

  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");

  const anhDaiDien = watch("AnhDaiDien");

  useEffect(() => {
    reset({
      HoTen: user?.HoTen || "",
      SoDienThoai: user?.SoDienThoai || "",
      AnhDaiDien: user?.AnhDaiDien || "",
    });
  }, [user?.Email]);

  const onSubmit = async (values: FormValues) => {
    console.log("Submitting update profile:", values);
    setServerError("");
    setServerSuccess("");

    // Build payload chỉ gửi field có giá trị
    const payload: {
      HoTen?: string;
      SoDienThoai?: number;
      AnhDaiDien?: string;
    } = {};

    const hoTen = values.HoTen.trim();
    const sdt = String(values.SoDienThoai).trim();
    const avatar = values.AnhDaiDien.trim();

    if (hoTen) payload.HoTen = hoTen;
    if (avatar) payload.AnhDaiDien = avatar;

    if (sdt) {
      // validate numeric
      if (!/^\d+$/.test(sdt)) {
        methods.setError("SoDienThoai", {
          type: "validate",
          message: "Số điện thoại chỉ được chứa chữ số (0-9)",
        });
        return;
      }
      payload.SoDienThoai = Number(sdt);
    }

    if (Object.keys(payload).length === 0) {
      setServerError("Chưa có thông tin nào để cập nhật.");
      return;
    }

    try {
      await updateStudentProfile(payload);
      setServerSuccess("Cập nhật hồ sơ thành công ✅");
      window.location.reload();

      // nếu muốn giữ data thì bỏ reset, còn muốn clear form thì reset:
      // reset();
    } catch (err: any) {
      setServerError(extractAxiosErrorMessage(err));
    }
  };

  const avatarPreviewOk = useMemo(
    () => Boolean(anhDaiDien?.trim()),
    [anhDaiDien]
  );

  return (
    <div className="section-wrapper pt-10 pb-20 space-y-5">
      <h2 className="text-xl font-bold mb-1">Cập nhật hồ sơ học sinh</h2>
      <p className="text-slate-500 mb-4">
        Sửa: Họ tên, Số điện thoại, Ảnh đại diện (string URL/path)
      </p>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Avatar (string) + preview */}
          <div className="border border-slate-200 rounded-2xl p-4">
            <div className="font-semibold mb-3">Ảnh đại diện</div>

            <div className="flex gap-4 items-center flex-wrap">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                {avatarPreviewOk ? (
                  <img
                    src={anhDaiDien.trim()}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Nếu URL lỗi, hiển thị fallback
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <span className="text-xs text-slate-400">No image</span>
                )}
              </div>

              <Input
                name="AnhDaiDien"
                label="Link / Path ảnh"
                placeholder="VD: https://... hoặc /uploads/avatar.png"
                rules={{
                  // không bắt buộc, nhưng nếu nhập thì tối thiểu 3 ký tự cho đỡ rác
                  validate: (v) =>
                    !v?.trim() || v.trim().length >= 3 || "Link ảnh quá ngắn",
                }}
                containerClassName="min-w-[260px]"
              />
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Backend nhận <b>AnhDaiDien</b> dạng string, không upload file,
              không base64.
            </p>
          </div>

          {/* Họ tên + Số điện thoại */}
          <div className="flex gap-4 flex-wrap">
            <Input
              name="HoTen"
              label="Họ tên"
              placeholder="Nhập họ tên"
              rules={{
                validate: (v) =>
                  !v?.trim() ||
                  v.trim().length >= 2 ||
                  "Họ tên phải >= 2 ký tự",
              }}
            />

            <Input
              name="SoDienThoai"
              label="Số điện thoại"
              placeholder="Nhập số điện thoại"
              type="text"
              rules={{
                // validate: (v) => {
                //   const s = (v || "")?.trim();
                //   if (!s) return true;
                //   return (
                //     /^\d+$/.test(s) ||
                //     "Số điện thoại chỉ được chứa chữ số (0-9)"
                //   );
                // },
              }}
            />
          </div>

          {/* Server messages */}
          {serverError && (
            <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-3 text-sm whitespace-pre-wrap">
              {serverError}
            </div>
          )}
          {serverSuccess && (
            <div className="border border-green-200 bg-green-50 text-green-700 rounded-xl p-3 text-sm">
              {serverSuccess}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-60"
            >
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setServerError("");
                setServerSuccess("");
                reset();
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold disabled:opacity-60"
            >
              Xoá form
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
