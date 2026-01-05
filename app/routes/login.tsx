import { Link, useNavigate } from "react-router";
import { FormProvider, useForm } from "react-hook-form";
import { Input } from "elements"; // sửa path theo dự án
import { useAuth } from "hooks/useAuth";

type TLoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const forms = useForm<TLoginForm>();
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  return (
    <FormProvider {...forms}>
      <div className="section-wrapper pt-10 pb-20">
        <div className="max-w-125 mx-auto border border-[#e0e0e0] p-5 rounded-xl shadow-[0_4px_0_0_rgba(143,156,173,0.2)] space-y-4">
          <p>
            Đăng nhập ngay để bắt đầu trải nghiệm học tiếng Anh và luyện thi
            TOEIC/IELTS hiệu quả mỗi ngày.
          </p>

          <form
            onSubmit={forms.handleSubmit(async (data) => {
              try {
                const me = await login({
                  email: data.email,
                  password: data.password,
                });

                // Ví dụ: điều hướng theo role sau login
                if (me?.IDQuyen === 1)
                  navigate("/admin/dashboard", { replace: true });
                else if (me?.IDQuyen === 3)
                  navigate("/teacher/dashboard", { replace: true });
                else navigate("/", { replace: true });
              } catch {
                // lỗi đã nằm trong hook error rồi
              }
            })}
            className="space-y-2"
          >
            <Input
              name="email"
              label="Email"
              placeholder="admin@example.com"
              type="email"
              rules={{
                required: {
                  value: true,
                  message: "Không được bỏ trống Email!",
                },
              }}
            />
            <Input
              name="password"
              label="Mật khẩu"
              placeholder="Nhập mật khẩu của bạn"
              type="password"
              rules={{
                required: {
                  value: true,
                  message: "Không được bỏ trống Mật khẩu!",
                },
              }}
            />

            {error ? <p className="text-red-600 text-sm">{error}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="bg-black rounded-xl px-4 py-2 text-white w-full text-center cursor-pointer disabled:opacity-60"
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>

          <p>
            Bạn chưa là một thành viên?{" "}
            <Link
              to={"/register"}
              className="inline-block bg-[#FFC9F0] cursor-pointer decoration-black underline"
            >
              Đăng ký ngay!
            </Link>
          </p>
        </div>
      </div>
    </FormProvider>
  );
}
