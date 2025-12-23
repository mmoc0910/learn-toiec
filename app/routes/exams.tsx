import React from "react";
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/exams";
import { Pagination } from "elements";
import { http } from "utils/libs/https";

/** =======================
 * Types theo response sếp đưa
 * ======================= */
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ExamQuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: string; // tiptap json string
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;
  FileNghe_download_url?: string | null;
  lua_chon: ExamQuestionChoice[];
};

type ExamChiTiet = {
  IDDeThi: string;
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail: ExamQuestionDetail;
};

type TeacherItem = {
  GiaoVienID: string;
  TaiKhoan: string;
  TaiKhoan_detail?: {
    IDTaiKhoan?: string;
    Email?: string;
    HoTen?: string;
  };
};

type ExamItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  IDGiaoVien: string;
  IDGiaoVien_detail?: TeacherItem;
  chi_tiet: ExamChiTiet[];
  so_cau_hoi: number;
};

function timeToMinutes(hms: string) {
  const parts = (hms || "").split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return 0;
  const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  return Math.round(hh * 60 + mm + ss / 60);
}

function pickTags(exam: ExamItem) {
  // tags demo theo dữ liệu sếp: lấy lessonId đầu tiên + loại câu hỏi đầu tiên
  const firstQ = exam?.chi_tiet?.[0]?.IDCauHoi_detail;
  const tag1 = firstQ?.IDBaiHoc ? `#${firstQ.IDBaiHoc}` : "#Exam";
  const tag2 = firstQ?.LoaiCauHoi ? `#${firstQ.LoaiCauHoi}` : "#Mixed";
  return `${tag1} ${tag2}`;
}

/** =======================
 * Loader (React Router v7)
 * ======================= */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("page_size") || "12");

  // nếu backend chưa hỗ trợ page/page_size thì vẫn OK:
  // - axios sẽ trả toàn bộ list
  // - FE vẫn render, pagination sẽ “1 trang”
  const res = await http.get<PaginatedRes<ExamItem>>("/api/exams/de-thi/", {
    params: { page, page_size: pageSize },
  });

  const data = res.data;

  // fallback nếu backend không paginate thật
  const count = Number.isFinite(data?.count)
    ? data.count
    : (data?.results?.length ?? 0);

  return {
    page,
    pageSize,
    count,
    results: data.results ?? [],
    next: data.next,
    previous: data.previous,
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Thư viện đề thi" },
    { name: "description", content: "Welcome to Thư viện đề thi!" },
  ];
}

export default function ExamsLibraryPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { results, count, page, pageSize } = useLoaderData<typeof loader>();

  const totalPages = Math.max(1, Math.ceil((count || 0) / (pageSize || 12)));

  const goPage = (p: number) => {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    next.set("page_size", String(pageSize || 12));
    nav(`/exams?${next.toString()}`);
  };

  return (
    <div className="section-wrapper pt-10 pb-20 space-y-6">
      <h1 className="text-2xl capitalize font-medium">Thư viện đề thi</h1>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {(results || []).map((exam) => {
            const minutes = timeToMinutes(exam.ThoiGianLamBaiThi);
            const totalQ = exam.so_cau_hoi ?? exam.chi_tiet?.length ?? 0;

            return (
              <div
                key={exam.IDDeThi}
                className="rounded-2xl border border-[#e0e0e0] shadow-[0_4px_0_0_rgba(143,156,173,0.2)] p-3 space-y-2 bg-white"
              >
                <p className="font-medium line-clamp-2">{exam.TenDeThi}</p>

                <p className="text-sm font-light text-slate-600">
                  {pickTags(exam)}
                </p>

                <div className="flex items-center gap-1 text-slate-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    className="size-4"
                  >
                    <path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
                  </svg>

                  <span className="font-light">
                    {minutes || 0} phút • {totalQ} câu
                  </span>
                </div>

                {/* Nút Chi tiết: sếp đổi route theo dự án nếu cần */}
                <Link
                  to={`/exams/${exam.IDDeThi}`}
                  className="block w-full border border-black rounded-md px-4 py-1 text-center text-sm transition-all duration-150 hover:bg-black hover:text-white cursor-pointer"
                >
                  Chi tiết
                </Link>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {/* <div className="flex justify-center">
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(p: number) => goPage(p)}
          />
        </div> */}
      </div>
    </div>
  );
}
