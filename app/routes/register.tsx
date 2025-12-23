import { Link, useNavigate } from "react-router";
import { FormProvider, useForm } from "react-hook-form";
import { Input } from "elements";// sửa path theo dự án
import { registerApi } from "api/auth.api";

type TRegisterForm = {
  name: string;
  email: string;
  phone: string; // input tel => string, mình sẽ convert sang number
  password: string;
  confirm_password: string;
};

export default function Register() {
  const forms = useForm<TRegisterForm>();
  const navigate = useNavigate();

  return (
    <FormProvider {...forms}>
      <div className="section-wrapper pt-10 pb-20">
        <div className="max-w-125 mx-auto border border-[#e0e0e0] p-5 rounded-xl shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
          <p>
            Đăng ký ngay để bắt đầu trải nghiệm học tiếng Anh và luyện thi
            TOEIC/IELTS hiệu quả mỗi ngày.
          </p>

          <form
            onSubmit={forms.handleSubmit(async (data) => {
              // clear lỗi cũ
              forms.clearErrors();

              // check confirm password phía client (nhanh + rõ)
              if (data.password !== data.confirm_password) {
                forms.setError("confirm_password", {
                  message: "Mật khẩu xác nhận không khớp!",
                });
                return;
              }

              try {
                // convert phone: chỉ lấy số
                const phoneNumber = Number(
                  String(data.phone).replace(/[^\d]/g, "")
                );

                if (!Number.isFinite(phoneNumber)) {
                  forms.setError("phone", { message: "Số điện thoại không hợp lệ!" });
                  return;
                }

                await registerApi({
                  // yêu cầu: IDTaiKhoan lấy email
                  IDTaiKhoan: data.email,
                  Email: data.email,
                  HoTen: data.name,
                  SoDienThoai: phoneNumber,
                  password: data.password,
                  password_confirm: data.confirm_password,
                });

                // đăng ký xong -> chuyển sang login
                navigate("/login", { replace: true });
              } catch (err: any) {
                /**
                 * Server trả lỗi kiểu:
                 * {
                 *  "IDTaiKhoan": ["..."],
                 *  "Email": ["..."],
                 *  "password": ["..."]
                 * }
                 */
                const serverData = err?.response?.data;

                // nếu lỗi dạng object field
                if (serverData && typeof serverData === "object") {
                  // map field backend -> field form
                  const fieldMap: Record<string, keyof TRegisterForm | "root"> = {
                    IDTaiKhoan: "email", // IDTaiKhoan tồn tại -> báo ngay ở email
                    Email: "email",
                    HoTen: "name",
                    SoDienThoai: "phone",
                    password: "password",
                    password_confirm: "confirm_password",
                  };

                  let hasAnyFieldError = false;

                  for (const key of Object.keys(serverData)) {
                    const formField = fieldMap[key] ?? "root";
                    const messages = serverData[key];

                    const messageText =
                      Array.isArray(messages) ? messages.join(" ") : String(messages);

                    if (formField === "root") {
                      forms.setError("root", { message: messageText });
                    } else {
                      forms.setError(formField, { message: messageText });
                      hasAnyFieldError = true;
                    }
                  }

                  // nếu không map được field nào thì show lỗi chung
                  if (!hasAnyFieldError && !forms.formState.errors.root?.message) {
                    forms.setError("root", { message: "Đăng ký thất bại." });
                  }

                  return;
                }

                // fallback
                forms.setError("root", {
                  message: err?.message || "Đăng ký thất bại.",
                });
              }
            })}
            className="space-y-2"
          >
            <Input
              name="name"
              label="Họ và tên"
              placeholder="Nhập họ và tên của bạn"
              rules={{
                required: { value: true, message: "Không được bỏ trống Họ và tên!" },
              }}
            />

            <Input
              name="email"
              label="Email"
              placeholder="example@gmail.com"
              type="email"
              rules={{
                required: { value: true, message: "Không được bỏ trống Email!" },
              }}
            />

            <Input
              name="phone"
              label="Số điện thoại"
              placeholder="Nhập số điện thoại của bạn"
              type="tel"
              rules={{
                required: {
                  value: true,
                  message: "Không được bỏ trống số điện thoại!",
                },
              }}
            />

            <Input
              name="password"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu của bạn"
              type="password"
              rules={{
                required: { value: true, message: "Không được bỏ trống mật khẩu!" },
              }}
            />

            <Input
              name="confirm_password"
              label="Xác nhận mật khẩu"
              placeholder="Xác nhận mật khẩu của bạn"
              type="password"
              rules={{
                required: { value: true, message: "Bạn chưa xác nhận mật khẩu!" },
              }}
            />

            {/* Lỗi chung */}
            {forms.formState.errors.root?.message ? (
              <p className="text-red-600 text-sm">
                {forms.formState.errors.root.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={forms.formState.isSubmitting}
              className="bg-black rounded-xl px-4 py-2 text-white w-full text-center cursor-pointer disabled:opacity-60"
            >
              {forms.formState.isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
            </button>
          </form>

          <p>
            Đã có tài khoản?{" "}
            <Link
              to={"/login"} 
              className="inline-block bg-[#FFC9F0] cursor-pointer decoration-black underline"
            >
              Đăng nhập ngay!
            </Link>
          </p>
        </div>
      </div>
    </FormProvider>
  );
}
