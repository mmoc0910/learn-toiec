import React, { useEffect, useMemo, useState } from "react";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { cn } from "utils/helpers/class-name";
import { http } from "utils/libs/https";
import { useAuth } from "hooks/useAuth";
import { Link } from "react-router";

// ===== TYPES =====
type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ClassItem = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa?: string;
  IDGiaoVien: string;
  so_hoc_vien: number;
  // hoc_vien?: any[]; // có, nhưng không cần dùng vì có so_hoc_vien
};

function normalizeError(err: any): string {
  const data = err?.response?.data;
  if (data?.detail) return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("\n");
  }
  return err?.message || "Có lỗi xảy ra.";
}

// ✅ lấy page param từ next url
function getNextPage(next: string | null): number | null {
  if (!next) return null;
  try {
    const u = new URL(next);
    const p = u.searchParams.get("page");
    return p ? Number(p) : null;
  } catch {
    // nếu next không phải absolute url (hiếm)
    const m = next.match(/page=(\d+)/);
    return m ? Number(m[1]) : null;
  }
}

// ✅ fetch all pages
async function fetchAllClasses(): Promise<ClassItem[]> {
  let page = 1;
  const acc: ClassItem[] = [];

  // chống loop vô hạn
  for (let guard = 0; guard < 200; guard++) {
    const res = await http.get<PaginatedRes<ClassItem>>(
      `/api/classes/lop-hoc/?page=${page}`
    );

    acc.push(...(res.data?.results || []));

    const nextPage = getNextPage(res.data?.next || null);
    if (!nextPage) break;
    page = nextPage;
  }

  return acc;
}

export default function Dashboard() {
  const { user, accessToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // ✅ load classes
  useEffect(() => {
    let mounted = true;

    if (!accessToken || !user?.IDTaiKhoan) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Nếu http chưa auto attach token, sếp dùng cách này:
        // const res = await http.get("/api/classes/lop-hoc/", { headers: { Authorization: `Bearer ${accessToken}` }});

        const all = await fetchAllClasses();
        if (!mounted) return;
        setClasses(all);
      } catch (e: any) {
        if (!mounted) return;
        setErr(normalizeError(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [accessToken, user?.IDTaiKhoan]);

  // ✅ chỉ lấy lớp mà GV hiện tại đang dạy
  const myClasses = useMemo(() => {
    const myId = user?.IDTaiKhoan;
    return classes.filter((c) => c.IDGiaoVien === myId);
  }, [classes, user?.IDTaiKhoan]);

  const classCount = myClasses.length;

  const totalStudents = useMemo(() => {
    return myClasses.reduce((sum, c) => sum + (c.so_hoc_vien || 0), 0);
  }, [myClasses]);

  return (
    <ContentLayoutWrapper heading="Tổng quan">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ===== Tổng quan lớp học ===== */}
        <div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Tổng quan lớp học
                </h3>
                <p className="text-sm text-slate-500">
                  Thống kê các lớp đang dạy
                </p>
              </div>

              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                {/* USERS SVG */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">
                {err}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-3xl font-bold text-blue-600" id="class-count">
                  {loading ? "…" : classCount}
                </div>
                <div className="text-sm text-slate-500">Lớp đang dạy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600" id="student-count">
                  {loading ? "…" : totalStudents}
                </div>
                <div className="text-sm text-slate-500">Tổng học viên</div>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              *Chỉ tính lớp có <span className="font-mono">IDGiaoVien</span> =
              tài khoản hiện tại.
            </div>
          </div>
        </div>

        {/* ===== BẢNG QUẢN LÝ LỚP HỌC ===== */}
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                Quản lý lớp học
              </h3>
              <p className="text-sm text-slate-500">
                Danh sách các lớp đang giảng dạy
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Đang tải danh sách lớp...
            </div>
          ) : myClasses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
              Chưa có lớp nào thuộc giáo viên hiện tại.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Tên lớp</th>
                    <th className="px-4 py-3 text-left">Số học viên</th>
                    <th className="px-4 py-3 text-left">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {myClasses.map((c) => {
                    // ✅ hiện tại API classes chưa có avg/progress/status,
                    // nên để placeholder “—” để không bịa dữ liệu
                    return (
                      <tr
                        key={c.IDLopHoc}
                        className="odd:bg-white even:bg-slate-100 border-t border-slate-200"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {c.TenLopHoc}
                          </div>
                          <div className="text-xs text-slate-500">
                            ID: <span className="font-mono">{c.IDLopHoc}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-800">
                          {c.so_hoc_vien} học viên
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                           
                            <Link to={'/teacher/class'} className="block px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100">
                              Chi tiết
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* hint nhỏ */}
          <div className="mt-3 text-xs text-slate-500">
            *Điểm TB / Tiến độ / Trạng thái: cần thêm API khác (vd: thống kê điểm
            theo lớp, tiến độ bài học). Hiện tạm hiển thị “—”.
          </div>
        </div>
      </div>
    </ContentLayoutWrapper>
  );
}

//-------------------------------------------------------
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
// import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

// export default function Dashboard() {
//   return (
//     <ContentLayoutWrapper heading="Tổng quan">
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         {/* ===== Tổng quan lớp học ===== */}
//         <div>
//           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="flex items-start justify-between mb-5">
//               <div>
//                 <h3 className="text-lg font-bold text-slate-800 mb-2">
//                   Tổng quan lớp học
//                 </h3>
//                 <p className="text-sm text-slate-500">
//                   Thống kê các lớp đang dạy
//                 </p>
//               </div>

//               <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//                 {/* USERS SVG */}
//                 <svg
//                   width="24"
//                   height="24"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                   <path
//                     d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                   <path
//                     d="M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                   <path
//                     d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </div>
//             </div>

//             <div className="grid grid-cols-2 gap-4 mb-6">
//               <div>
//                 <div
//                   className="text-3xl font-bold text-blue-600"
//                   id="class-count"
//                 >
//                   3
//                 </div>
//                 <div className="text-sm text-slate-500">Lớp đang dạy</div>
//               </div>
//               <div>
//                 <div
//                   className="text-3xl font-bold text-blue-600"
//                   id="student-count"
//                 >
//                   85
//                 </div>
//                 <div className="text-sm text-slate-500">Tổng học viên</div>
//               </div>
//             </div>

//             {/* <div>
//             <div className="text-sm font-semibold text-slate-800 mb-3">
//               Điểm trung bình theo lớp
//             </div>

//             <div className="h-64">
//               <ResponsiveContainer>
//                 <BarChart
//                   data={[
//                     { name: "Lớp A", score: 620 },
//                     { name: "Lớp B", score: 580 },
//                     { name: "Lớp C", score: 700 },
//                     { name: "Lớp D", score: 589 },
//                     { name: "Lớp E", score: 456 },
//                     { name: "Lớp F", score: 345 },
//                     { name: "Lớp G", score: 123 },
//                     { name: "Lớp H", score: 678 },
//                     { name: "Lớp I", score: 546 },
//                   ]}
//                 >
//                   <XAxis dataKey="name" />
//                   <Tooltip />
//                   <Bar dataKey="score" fill="#2563EB" radius={[6, 6, 0, 0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </div> */}
//           </div>
//         </div>

//         {/* ===== Công việc hôm nay ===== */}
//         {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="flex items-start justify-between mb-5">
//             <div>
//               <h3 className="text-lg font-bold text-slate-800 mb-2">
//                 Công việc hôm nay
//               </h3>
//               <p className="text-sm text-slate-500">Các bài test cần chấm</p>
//             </div>

//             <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
          
//               <svg
//                 width="24"
//                 height="24"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 xmlns="http://www.w3.org/2000/svg"
//               >
//                 <path
//                   d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//                 <path
//                   d="M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//                 <path
//                   d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//                 <path
//                   d="M12 12H15"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                 />
//                 <path
//                   d="M12 16H15"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                 />
//                 <path
//                   d="M9 12H9.01"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                 />
//                 <path
//                   d="M9 16H9.01"
//                   stroke="#F59E0B"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                 />
//               </svg>
//             </div>
//           </div>

//           <div className="bg-amber-100 rounded-lg p-4 text-center mb-6">
//             <div
//               className="text-5xl font-bold text-orange-500"
//               id="pending-tests"
//             >
//               4
//             </div>
//             <div className="text-sm font-medium text-amber-800">
//               Bài test cần chấm
//             </div>
//           </div>

//           <div className="flex flex-col gap-3">
//             {[
//               { name: "Nguyễn Văn A", test: "Full Test 01", avatar: "N" },
//               { name: "Trần Thị B", test: "Mini Test 02", avatar: "T" },
//               { name: "Lê Minh C", test: "Part 5 Practice", avatar: "L" },
//             ].map((t) => (
//               <div
//                 key={t.name}
//                 className="flex items-center justify-between p-3 bg-slate-100 rounded-lg"
//               >
//                 <div className="flex items-center gap-3">
//                   <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
//                     {t.avatar}
//                   </div>
//                   <div>
//                     <div className="font-semibold text-slate-800 text-sm">
//                       {t.name}
//                     </div>
//                     <div className="text-xs text-slate-500">{t.test}</div>
//                   </div>
//                 </div>
//                 <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-100">
//                   Chấm ngay
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div> */}
//         <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
//           <div className="flex items-center justify-between mb-5">
//             <div>
//               <h3 className="text-xl font-bold text-slate-800 mb-1">
//                 Quản lý lớp học
//               </h3>
//               <p className="text-sm text-slate-500">
//                 Danh sách các lớp đang giảng dạy
//               </p>
//             </div>

//             {/* <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
//               + Tạo lớp mới
//             </button> */}
//           </div>

//           <div className="overflow-x-auto rounded-xl border border-slate-200">
//             <table className="min-w-full text-sm">
//               <thead className="bg-slate-100 text-slate-700 font-semibold">
//                 <tr>
//                   <th className="px-4 py-3 text-left">Tên lớp</th>
//                   <th className="px-4 py-3 text-left">Số học viên</th>
//                   <th className="px-4 py-3 text-left">Điểm TB</th>
//                   <th className="px-4 py-3 text-left">Tiến độ</th>
//                   <th className="px-4 py-3 text-left">Trạng thái</th>
//                   <th className="px-4 py-3 text-left">Hành động</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {[
//                   {
//                     name: "TOEIC 500+ K13",
//                     start: "15/01/2024",
//                     students: "30 học viên",
//                     avg: 615,
//                     progress: 65,
//                     status: "Đang học",
//                     statusType: "success",
//                   },
//                   {
//                     name: "TOEIC 700+ K4",
//                     start: "10/12/2023",
//                     students: "20 học viên",
//                     avg: 690,
//                     progress: 88,
//                     status: "Sắp thi",
//                     statusType: "warning",
//                   },
//                   {
//                     name: "TOEIC 600+ K8",
//                     start: "20/01/2024",
//                     students: "35 học viên",
//                     avg: 580,
//                     progress: 45,
//                     status: "Đang học",
//                     statusType: "success",
//                   },
//                 ].map((row) => (
//                   <tr
//                     key={row.name}
//                     className="odd:bg-white even:bg-slate-100 border-t border-slate-200"
//                   >
//                     <td className="px-4 py-3">
//                       <div className="font-semibold text-slate-800">
//                         {row.name}
//                       </div>
//                       <div className="text-xs text-slate-500">
//                         Khai giảng: {row.start}
//                       </div>
//                     </td>

//                     <td className="px-4 py-3 font-medium text-slate-800">
//                       {row.students}
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="font-semibold text-blue-600 text-base">
//                         {row.avg}
//                       </div>
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="w-30">
//                         <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
//                           <div
//                             className="h-full bg-blue-600"
//                             style={{ width: `${row.progress}%` }}
//                           />
//                         </div>
//                         <div className="text-[11px] text-slate-500 mt-1">
//                           {row.progress}%
//                         </div>
//                       </div>
//                     </td>

//                     <td className="px-4 py-3">
//                       {row.statusType === "success" ? (
//                         <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
//                           {row.status}
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
//                           {row.status}
//                         </span>
//                       )}
//                     </td>

//                     <td className="px-4 py-3">
//                       <div className="flex gap-2">
//                         <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-100">
//                           Vào lớp
//                         </button>
//                         <button className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100">
//                           Chi tiết
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>

//       {/* ================= CLASS MANAGEMENT TABLE ================= */}
//     </ContentLayoutWrapper>
//   );
// }
