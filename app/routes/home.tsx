import React, { useEffect, useMemo, useState } from "react";

import type { Route } from "./+types/home";
import { Banner } from "components/banner";
// import { Header } from "~/layouts/user-layout/items/header";
// import { Footer } from "~/layouts/user-layout/items/footer";
// import { Courses } from "components/courses";
// import { Exams } from "components/exams";

import { http } from "utils/libs/https";
import { useAuth } from "hooks/useAuth";
import { Link, useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

/** =======================
 * Types theo API /api/classes/lop-hoc/
 * ======================= */
type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type LopHocApi = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;
  IDGiaoVien_detail?: {
    TaiKhoan_detail?: {
      IDTaiKhoan: string;
      Email: string;
      HoTen: string;
      AnhDaiDien: string | null;
    };
  };
  hoc_vien: Array<{
    LopHocID: string;
    IDHocVien: string;
    IDHocVien_detail?: {
      TaiKhoan_detail?: {
        IDTaiKhoan: string;
        Email: string;
        HoTen: string;
      };
    };
  }>;
  so_hoc_vien: number;
};

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

async function fetchAllClasses(): Promise<LopHocApi[]> {
  // API next trả full URL http://localhost:8080/... nên mình cứ gọi trực tiếp next
  let url: string | null = "/api/classes/lop-hoc/";
  const all: LopHocApi[] = [];

  while (url) {
    const res = await http.get<Paginated<LopHocApi>>(url);
    all.push(...(res.data.results ?? []));
    url = res.data.next; // null => dừng
  }

  return all;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<LopHocApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setErrMsg(null);
      try {
        const all = await fetchAllClasses();
        if (!mounted) return;
        setClasses(all);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(getApiErrorMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    // chỉ fetch khi đã có user (tránh undefined lúc init)
    if (user) run();

    return () => {
      mounted = false;
    };
  }, [user]);

  const myIdentifierSet = useMemo(() => {
    // Vì bên bạn có nơi dùng Email làm ID, nơi dùng IDTaiKhoan, nên gom hết
    const set = new Set<string>();

    const anyUser: any = user ?? {};
    const idCandidates = [
      anyUser?.IDTaiKhoan,
      anyUser?.id_tai_khoan,
      anyUser?.user_id,
      anyUser?.Email,
      anyUser?.email,
      anyUser?.TaiKhoan,
      anyUser?.username,
    ]
      .filter(Boolean)
      .map((x: any) => String(x).trim());

    idCandidates.forEach((x) => set.add(x));
    return set;
  }, [user]);

  const myClasses = useMemo(() => {
    if (!myIdentifierSet.size) return [];
    return (classes ?? []).filter((cls) => {
      const list = cls?.hoc_vien ?? [];
      return list.some((hv) => myIdentifierSet.has(String(hv.IDHocVien)));
    });
  }, [classes, myIdentifierSet]);

  return (
    <div className="">
      <Banner />

      <div className="py-10" />

      {/* Danh sách lớp của học viên */}
      <div className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Lớp học của tôi
            </h2>
            <p className="mt-1 text-slate-600">
              Các lớp mà tài khoản của bạn đang tham gia.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setErrMsg(null);
              try {
                const all = await fetchAllClasses();
                setClasses(all);
              } catch (e: any) {
                setErrMsg(getApiErrorMessage(e));
              } finally {
                setLoading(false);
              }
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Reload"}
          </button>
        </div>

        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errMsg}
          </div>
        ) : null}

        {loading && myClasses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
            Đang tải danh sách lớp...
          </div>
        ) : null}

        {!loading && myClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-700">
            Hiện tại bạn chưa tham gia lớp nào.
          </div>
        ) : null}

        {myClasses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myClasses.map((cls) => {
              const teacher =
                cls.IDGiaoVien_detail?.TaiKhoan_detail?.HoTen || cls.IDGiaoVien;
              const teacherEmail =
                cls.IDGiaoVien_detail?.TaiKhoan_detail?.Email || "";
              const teacherInitials = getInitials(teacher);

              return (
                <div
                  key={cls.IDLopHoc}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-extrabold text-slate-900">
                        {cls.TenLopHoc}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-slate-500">
                        {cls.IDLopHoc}
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                      👥 {cls.so_hoc_vien ?? cls.hoc_vien?.length ?? 0}
                    </span>
                  </div>

                  <div className="mt-3 line-clamp-3 text-sm text-slate-700">
                    {cls.MoTa || "—"}
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                      {teacherInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {teacher}
                      </div>
                      <div className="truncate text-xs text-slate-600">
                        {teacherEmail || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to={`classes/${cls.IDLopHoc}`}
                      type="button"
                      className="flex items-center justify-center h-10 flex-1 rounded-xl bg-violet-600 px-4 font-semibold text-white hover:bg-violet-700"
                    >
                      Xem lớp
                    </Link>

                    {/* <button
                      type="button"
                      onClick={() => {
                        // có thể mở modal show danh sách học viên
                        alert(
                          `Số học viên: ${
                            cls.so_hoc_vien ?? cls.hoc_vien?.length ?? 0
                          }`
                        );
                      }}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      DS HV
                    </button> */}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* <Courses/> */}
      {/* <Exams/> */}
    </div>
  );
}
