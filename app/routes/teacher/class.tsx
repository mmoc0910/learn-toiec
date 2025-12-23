// import { Input } from "elements";
// import { DropdownSelectPortal } from "elements/dropdown/dropdown";
// import React, { useMemo, useState, type JSX } from "react";
// import { FormProvider, useForm } from "react-hook-form";
// import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

// /** ===== Types ===== */
// type ClassId =
//   | "toeic550"
//   | "ielts65"
//   | "business_english"
//   | "toeic700"
//   | "ielts7"
//   | "presentation"
//   | "writing_business"
//   | "toeic_foundation";

// type ClassItem = {
//   id: ClassId;
//   name: string;
//   semester: string;
//   studentCount: number;
//   avgScore: string; // có thể là "620" hoặc "7.2" hoặc "B+"
//   completion: number; // %
//   pending: number; // số bài chưa chấm
//   color: `#${string}`; // hex color
// };

// type ClassListPanelProps = {
//   classData: ClassItem[];
//   selectedId: ClassId;
//   onSelectClass: (id: ClassId) => void;
//   onManage?: () => void;
// };

// /** ===== Helpers ===== */
// function hexToRgba(hex: string, alpha = 0.12): string {
//   if (!hex) return `rgba(124, 58, 237, ${alpha})`;

//   const normalized = hex.replace("#", "");
//   const isShort = normalized.length === 3;
//   const full = isShort
//     ? normalized
//         .split("")
//         .map((c) => c + c)
//         .join("")
//     : normalized;

//   const r = parseInt(full.slice(0, 2), 16);
//   const g = parseInt(full.slice(2, 4), 16);
//   const b = parseInt(full.slice(4, 6), 16);
//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// }

// const StatPill: React.FC<React.PropsWithChildren> = ({ children }) => (
//   <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-700">
//     {children}
//   </span>
// );

// /** ===== Component: ClassListPanel ===== */
// const ClassListPanel: React.FC<ClassListPanelProps> = ({
//   classData,
//   selectedId,
//   onSelectClass,
//   onManage,
// }) => {
//   const [keyword, setKeyword] = useState<string>("");

//   const filtered = useMemo(() => {
//     const q = keyword.trim().toLowerCase();
//     if (!q) return classData;
//     return classData.filter(
//       (c) =>
//         c.name.toLowerCase().includes(q) || c.semester.toLowerCase().includes(q)
//     );
//   }, [classData, keyword]);

//   return (
//     <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//       <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
//         <div>
//           <h2 className="m-0 text-xl font-bold text-slate-800">
//             Quản lý lớp học
//           </h2>
//           <p className="mt-1 text-slate-500">
//             Chọn lớp để xem thống kê hoặc chuyển nhanh.
//           </p>
//         </div>

//         <div className="flex flex-wrap items-center gap-2.5">
//           {/* Search */}
//           <div className="relative">
//             {/* <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
//               <svg
//                 width="16"
//                 height="16"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 xmlns="http://www.w3.org/2000/svg"
//               >
//                 <path
//                   d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
//                   stroke="currentColor"
//                   strokeWidth="2"
//                   strokeLinecap="round"
//                 />
//               </svg>
//             </span> */}
//             <Input
//               name="search_class"
//               type="search"
//               placeholder="Tìm lớp..."
//               inputClassName="focus:ring-4 focus:ring-violet-100"
//             />
//             {/* <input
//               type="search"
//               value={keyword}
//               onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//                 setKeyword(e.target.value)
//               }
//               placeholder="Tìm lớp..."
//               className="h-10 w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
//             /> */}
//           </div>

//           {/* Count */}
//           <div className="min-w-22.5 text-right font-semibold text-slate-700">
//             {filtered.length} lớp
//           </div>

//           {/* Manage */}
//           <button
//             type="button"
//             onClick={onManage}
//             className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
//           >
//             Thêm / quản lý lớp
//           </button>
//         </div>
//       </div>

//       {/* List wrapper */}
//       <div className="max-h-125 py-3 overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
//           {filtered.map((cls) => {
//             const isActive = cls.id === selectedId;
//             return (
//               <div
//                 key={cls.id}
//                 // className={[
//                 //   "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition",
//                 //   isActive
//                 //     ? "border-violet-300 ring-4 ring-violet-100"
//                 //     : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md",
//                 // ].join(" ")}
//                 className={[
//                   "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] transition border-slate-200",
//                 ].join(" ")}
//               >
//                 <div className="flex items-start justify-between gap-3">
//                   <div>
//                     <div className="text-base font-bold text-slate-800">
//                       {cls.name}
//                     </div>
//                     <div className="text-[13px] text-slate-500">
//                       {cls.semester}
//                     </div>
//                   </div>

//                   <span
//                     className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
//                     style={{
//                       background: hexToRgba(cls.color, 0.12),
//                       color: cls.color,
//                     }}
//                   >
//                     Lớp
//                   </span>
//                 </div>

//                 <div className="flex flex-wrap gap-2">
//                   <StatPill>👥 {cls.studentCount} HV</StatPill>
//                   <StatPill>📈 {cls.avgScore} TB</StatPill>
//                   <StatPill>✅ {cls.completion}% HT</StatPill>
//                   <StatPill>⏳ {cls.pending} bài đợi</StatPill>
//                 </div>

//                 <button
//                   type="button"
//                   onClick={() => onSelectClass(cls.id)}
//                   className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 active:scale-[0.99]"
//                 >
//                   Xem lớp
//                 </button>
//               </div>
//             );
//           })}

//           {filtered.length === 0 && (
//             <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
//               Không tìm thấy lớp phù hợp.
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// /** ===== Page ===== */
// export default function Class(): JSX.Element {
//   const forms = useForm();
//   const classData = useMemo<ClassItem[]>(
//     () => [
//       {
//         id: "toeic550",
//         name: "TOEIC 550+",
//         semester: "Học kỳ 1/2024",
//         studentCount: 24,
//         avgScore: "620",
//         completion: 87,
//         pending: 12,
//         color: "#7C3AED",
//       },
//       {
//         id: "ielts65",
//         name: "IELTS 6.5",
//         semester: "Học kỳ 1/2024",
//         studentCount: 18,
//         avgScore: "7.2",
//         completion: 82,
//         pending: 9,
//         color: "#2563EB",
//       },
//       {
//         id: "business_english",
//         name: "Business English",
//         semester: "Học kỳ 2/2024",
//         studentCount: 20,
//         avgScore: "B+",
//         completion: 80,
//         pending: 6,
//         color: "#F59E0B",
//       },
//       {
//         id: "toeic700",
//         name: "TOEIC 700",
//         semester: "Học kỳ 2/2024",
//         studentCount: 22,
//         avgScore: "680",
//         completion: 78,
//         pending: 8,
//         color: "#0EA5E9",
//       },
//       {
//         id: "ielts7",
//         name: "IELTS 7.0",
//         semester: "Học kỳ 2/2024",
//         studentCount: 16,
//         avgScore: "7.5",
//         completion: 84,
//         pending: 5,
//         color: "#10B981",
//       },
//       {
//         id: "presentation",
//         name: "Presentation Skills",
//         semester: "Học kỳ 1/2025",
//         studentCount: 19,
//         avgScore: "A-",
//         completion: 76,
//         pending: 7,
//         color: "#EC4899",
//       },
//       {
//         id: "writing_business",
//         name: "Business Writing",
//         semester: "Học kỳ 1/2025",
//         studentCount: 14,
//         avgScore: "B",
//         completion: 72,
//         pending: 6,
//         color: "#F97316",
//       },
//       {
//         id: "toeic_foundation",
//         name: "TOEIC Foundation",
//         semester: "Học kỳ 1/2024",
//         studentCount: 28,
//         avgScore: "560",
//         completion: 69,
//         pending: 11,
//         color: "#6366F1",
//       },
//     ],
//     []
//   );

//   const [selectedId, setSelectedId] = useState<ClassId>(
//     classData[0]?.id ?? "toeic550"
//   );

//   const selectedClass = useMemo<ClassItem>(() => {
//     return classData.find((c) => c.id === selectedId) ?? classData[0];
//   }, [classData, selectedId]);

//   return (
//     <FormProvider {...forms}>
//       {" "}
//       <ContentLayoutWrapper heading="Quản lý lớp học">
//         {/* Header line + switcher */}
//         <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
//           <div>
//             <p className="m-0 text-base text-slate-500">
//               Lớp{" "}
//               <span
//                 className="font-semibold"
//                 style={{ color: selectedClass?.color ?? "#7C3AED" }}
//               >
//                 {selectedClass?.name}
//               </span>{" "}
//               • <span>{selectedClass?.semester}</span>
//             </p>
//           </div>

//           <div className="flex items-center gap-3">
//             <label
//               htmlFor="class-switcher"
//               className="font-semibold text-slate-800"
//             >
//               Chọn lớp:
//             </label>
//             <DropdownSelectPortal
//               name="class"
//               placeholder="Chọn lớp học"
//               options={[
//                 {
//                   label: "toeic550",
//                   value: "TOEIC 550+",
//                 },
//                 {
//                   label: "ielts65",
//                   value: "IELTS 6.5",
//                 },
//                 {
//                   label: "business_english",
//                   value: "Business English",
//                 },
//                 {
//                   label: "toeic700",
//                   value: "TOEIC 700",
//                 },
//                 {
//                   label: "ielts7",
//                   value: "IELTS 7.0",
//                 },
//                 {
//                   label: "presentation",
//                   value: "Presentation Skills",
//                 },
//                 {
//                   label: "writing_business",
//                   value: "Business Writing",
//                 },
//                 {
//                   label: "toeic_foundation",
//                   value: "TOEIC Foundation",
//                 },
//               ]}
//               menuWidth={200}
//               placement="bottom"
//             />

//             {/* <select
//             id="class-switcher"
//             value={selectedId}
//             onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
//               setSelectedId(e.target.value as ClassId)
//             }
//             className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
//           >
//             {classData.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {c.name}
//               </option>
//             ))}
//           </select> */}
//           </div>
//         </div>

//         {/* Stats Cards (bind theo selectedClass) */}
//         <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
//                 {/* icon... giữ nguyên */}
//                 <svg
//                   width="24"
//                   height="24"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
//                     stroke="#7C3AED"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </div>
//             </div>
//             <div className="mb-1 text-3xl font-bold text-slate-800">
//               {selectedClass?.studentCount ?? 0}
//             </div>
//             <div className="text-sm text-slate-500">Tổng học viên</div>
//           </div>

//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
//                 <svg
//                   width="24"
//                   height="24"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
//                     stroke="#2563EB"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </div>
//             </div>
//             <div className="mb-1 text-3xl font-bold text-slate-800">
//               {selectedClass?.avgScore ?? "-"}
//             </div>
//             <div className="text-sm text-slate-500">Điểm TB lớp</div>
//           </div>

//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
//                 <svg
//                   width="24"
//                   height="24"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
//                     stroke="#16A34A"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                   />
//                 </svg>
//               </div>
//             </div>
//             <div className="mb-1 text-3xl font-bold text-slate-800">
//               {selectedClass?.completion ?? 0}%
//             </div>
//             <div className="text-sm text-slate-500">Tỷ lệ hoàn thành</div>
//           </div>

//           <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
//                 <svg
//                   width="24"
//                   height="24"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
//                     stroke="#F59E0B"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//               </div>
//             </div>
//             <div className="mb-1 text-3xl font-bold text-slate-800">
//               {selectedClass?.pending ?? 0}
//             </div>
//             <div className="text-sm text-slate-500">Bài tập chưa chấm</div>
//           </div>
//         </div>

//         {/* ✅ Class list (component) */}
//         <ClassListPanel
//           classData={classData}
//           selectedId={selectedId}
//           onSelectClass={(id) => setSelectedId(id)}
//           onManage={() =>
//             alert(
//               "Tính năng quản lý thêm/xóa lớp sẽ được bổ sung sau. Hiện tại bạn có thể chọn lớp để xem thống kê."
//             )
//           }
//         />

//         <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
//           <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
//             <h2 className="m-0 text-xl font-bold text-slate-800">
//               Danh sách học viên
//             </h2>

//             <div className="flex gap-3">
//               <Input
//                 name="search_student"
//                 type="search"
//                 placeholder="Tìm học viên..."
//                 inputClassName="focus:ring-4 focus:ring-violet-100"
//               />
//               {/* <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]">
//                 <svg
//                   className="mr-1.5 inline-block align-middle"
//                   width="16"
//                   height="16"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
//                     stroke="currentColor"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//                 Tìm kiếm
//               </button> */}

//               {/* <button className="h-10 rounded-xl bg-violet-600 px-4 font-semibold text-white shadow-sm transition hover:bg-violet-700 active:scale-[0.99]">
//                 <svg
//                   className="mr-1.5 inline-block align-middle"
//                   width="16"
//                   height="16"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <path
//                     d="M12 5V19M5 12H19"
//                     stroke="white"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                   />
//                 </svg>
//                 Thêm học viên
//               </button> */}
//             </div>
//           </div>

//           <div className="overflow-x-auto rounded-xl border border-slate-200">
//             <table className="w-full min-w-225 border-separate border-spacing-0">
//               <thead className="bg-slate-50">
//                 <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-sm [&>th]:font-semibold [&>th]:text-slate-700">
//                   <th>Học viên</th>
//                   <th>Điểm Listening</th>
//                   <th>Điểm Reading</th>
//                   <th>Tổng điểm</th>
//                   <th>Tiến độ</th>
//                   <th>Trạng thái</th>
//                   <th>Hành động</th>
//                 </tr>
//               </thead>

//               <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-slate-200">
//                 {/* Student 1 */}
//                 <tr className="bg-white hover:bg-slate-50">
//                   <td className="px-4 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-violet-300 text-sm font-bold text-white">
//                         N
//                       </div>
//                       <div>
//                         <div className="font-semibold text-slate-800">
//                           Nguyễn Văn A
//                         </div>
//                         <div className="text-[13px] text-slate-500">
//                           nguyenvana@email.com
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="font-semibold text-slate-800">380</span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="font-semibold text-slate-800">340</span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="text-base font-bold text-emerald-600">
//                       720
//                     </span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <div className="flex items-center gap-2">
//                       <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
//                         <div className="h-full w-[92%] bg-emerald-600" />
//                       </div>
//                       <span className="text-[13px] font-semibold text-slate-500">
//                         92%
//                       </span>
//                     </div>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
//                       Xuất sắc
//                     </span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <div className="flex gap-2">
//                       <button className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
//                         Xem
//                       </button>
//                       {/* <button className="h-9 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900">
//                         Nhắn tin
//                       </button> */}
//                     </div>
//                   </td>
//                 </tr>

//                 {/* Student 2 */}
//                 <tr className="bg-white hover:bg-slate-50">
//                   <td className="px-4 py-4">
//                     <div className="flex items-center gap-3">
//                       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-blue-300 text-sm font-bold text-white">
//                         T
//                       </div>
//                       <div>
//                         <div className="font-semibold text-slate-800">
//                           Trần Thị B
//                         </div>
//                         <div className="text-[13px] text-slate-500">
//                           tranthib@email.com
//                         </div>
//                       </div>
//                     </div>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="font-semibold text-slate-800">350</span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="font-semibold text-slate-800">320</span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="text-base font-bold text-blue-600">
//                       670
//                     </span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <div className="flex items-center gap-2">
//                       <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
//                         <div className="h-full w-[85%] bg-blue-600" />
//                       </div>
//                       <span className="text-[13px] font-semibold text-slate-500">
//                         85%
//                       </span>
//                     </div>
//                   </td>
//                   <td className="px-4 py-4">
//                     <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
//                       Xuất sắc
//                     </span>
//                   </td>
//                   <td className="px-4 py-4">
//                     <div className="flex gap-2">
//                       <button className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
//                         Xem
//                       </button>
//                       {/* <button className="h-9 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900">
//                         Nhắn tin
//                       </button> */}
//                     </div>
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </ContentLayoutWrapper>
//     </FormProvider>
//   );
// }

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import React, { useEffect, useMemo, useState, type JSX } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { http } from "utils/libs/https";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

/** =======================
 *  API Types (theo response backend)
 *  ======================= */
type LopHocApi = {
  IDLopHoc: string;
  TenLopHoc: string;
  MoTa: string;
  IDGiaoVien: string;
  hoc_vien: Array<{
    LopHocID: string;
    IDHocVien: string;
    IDHocVien_detail: {
      HocVienID: string;
      TaiKhoan_detail: {
        IDTaiKhoan: string;
        Email: string;
        HoTen: string;
        AnhDaiDien: string | null;
        SoDienThoai: number | null;
        NgayTaoTaiKhoan: string;
        TrangThaiTaiKhoan: any | null;
        IDQuyen: 1 | 2 | 3;
        IDQuyen_detail: {
          IDQuyen: 1 | 2 | 3;
          TenQuyen: string;
        };
      };
    };
  }>;
  so_hoc_vien: number;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** =======================
 *  UI Types
 *  ======================= */
type ClassId = string;

type ClassItem = {
  id: ClassId; // = IDLopHoc
  name: string; // = TenLopHoc
  semester: string; // backend chưa có -> "-"
  studentCount: number; // = so_hoc_vien
  avgScore: string; // backend chưa có -> "-"
  completion: number; // backend chưa có -> 0
  pending: number; // backend chưa có -> 0
  color: `#${string}`;
};

type ClassListPanelProps = {
  classData: ClassItem[];
  selectedId: ClassId;
  onSelectClass: (id: ClassId) => void;
  onManage?: () => void;
};

/** =======================
 *  Helpers
 *  ======================= */
function hexToRgba(hex: string, alpha = 0.12): string {
  if (!hex) return `rgba(124, 58, 237, ${alpha})`;
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const full = isShort
    ? normalized
        .split("")
        .map((c) => c + c)
        .join("")
    : normalized;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function colorFromId(id: string): `#${string}` {
  const palette = [
    "#7C3AED",
    "#2563EB",
    "#F59E0B",
    "#0EA5E9",
    "#10B981",
    "#EC4899",
    "#F97316",
    "#6366F1",
  ] as const;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
    .join("") || "?";
}

const StatPill: React.FC<React.PropsWithChildren> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-700">
    {children}
  </span>
);

/** =======================
 *  Component: ClassListPanel
 *  ======================= */
const ClassListPanel: React.FC<
  ClassListPanelProps & { keyword: string }
> = ({ classData, selectedId, onSelectClass, onManage, keyword }) => {
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return classData;
    return classData.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [classData, keyword]);

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-bold text-slate-800">
            Quản lý lớp học
          </h2>
          <p className="mt-1 text-slate-500">
            Chọn lớp để xem danh sách học viên và chuyển nhanh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-22.5 text-right font-semibold text-slate-700">
            {filtered.length} lớp
          </div>

          <button
            type="button"
            onClick={onManage}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Thêm / quản lý lớp
          </button>
        </div>
      </div>

      <div className="max-h-125 py-3 overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cls) => {
            const isActive = cls.id === selectedId;
            return (
              <div
                key={cls.id}
                className={[
                  "flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] transition",
                  isActive
                    ? "border-violet-300 ring-4 ring-violet-100"
                    : "border-slate-200",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-bold text-slate-800">
                      {cls.name}
                    </div>
                    <div className="text-[13px] text-slate-500">{cls.id}</div>
                  </div>

                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: hexToRgba(cls.color, 0.12),
                      color: cls.color,
                    }}
                  >
                    Lớp
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatPill>👥 {cls.studentCount} HV</StatPill>
                  <StatPill>📈 {cls.avgScore} TB</StatPill>
                  <StatPill>✅ {cls.completion}% HT</StatPill>
                  <StatPill>⏳ {cls.pending} bài đợi</StatPill>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectClass(cls.id)}
                  className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 active:scale-[0.99]"
                >
                  Xem lớp
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
              Không tìm thấy lớp phù hợp.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** =======================
 *  Page
 *  ======================= */
type FormValues = {
  class: string; // ✅ value = IDLopHoc
  search_class: string;
  search_student: string;
};

export default function Class(): JSX.Element {
  const forms = useForm<FormValues>({
    defaultValues: {
      class: "",
      search_class: "",
      search_student: "",
    },
  });

  const [rawClasses, setRawClasses] = useState<LopHocApi[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Fetch API
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const res = await http.get<Paginated<LopHocApi>>("/api/classes/lop-hoc/");
        if (!mounted) return;
        setRawClasses(res.data.results ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Không tải được danh sách lớp."
        );
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Map API -> UI
  const classData = useMemo<ClassItem[]>(() => {
    return rawClasses.map((c) => ({
      id: c.IDLopHoc,
      name: c.TenLopHoc,
      semester: "-", // backend chưa có
      studentCount: c.so_hoc_vien ?? 0,
      avgScore: "-", // backend chưa có
      completion: 0, // backend chưa có
      pending: 0, // backend chưa có
      color: colorFromId(c.IDLopHoc),
    }));
  }, [rawClasses]);

  // Auto set default selected class in form when loaded
  useEffect(() => {
    if (!classData.length) return;
    const current = forms.getValues("class");
    if (!current) forms.setValue("class", classData[0].id);
  }, [classData, forms]);

  // Selected from RHF (✅ đây là IDLopHoc)
  const selectedId = forms.watch("class") || classData[0]?.id || "";
  const keywordClass = forms.watch("search_class") || "";
  const keywordStudent = forms.watch("search_student") || "";

  const selectedClassUI = useMemo(() => {
    return classData.find((c) => c.id === selectedId) ?? classData[0];
  }, [classData, selectedId]);

  const selectedClassApi = useMemo(() => {
    return rawClasses.find((c) => c.IDLopHoc === selectedId) ?? rawClasses[0];
  }, [rawClasses, selectedId]);

  // Filter học viên theo keyword
  const filteredStudents = useMemo(() => {
    const list = selectedClassApi?.hoc_vien ?? [];
    const q = keywordStudent.trim().toLowerCase();
    if (!q) return list;

    return list.filter((hv) => {
      const tk = hv.IDHocVien_detail?.TaiKhoan_detail;
      const name = tk?.HoTen ?? "";
      const email = tk?.Email ?? hv.IDHocVien ?? "";
      return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
    });
  }, [selectedClassApi, keywordStudent]);

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Quản lý lớp học">
        {/* Error banner */}
        {errMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errMsg}
          </div>
        ) : null}

        {/* Loading */}
        {loading && classData.length === 0 ? (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
            Đang tải danh sách lớp...
          </div>
        ) : null}

        {/* Header line + switcher */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="m-0 text-base text-slate-500">
              Lớp{" "}
              <span
                className="font-semibold"
                style={{ color: selectedClassUI?.color ?? "#7C3AED" }}
              >
                {selectedClassUI?.name ?? "-"}
              </span>{" "}
              • <span>{selectedClassUI?.id ?? "-"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="font-semibold text-slate-800">Chọn lớp:</label>

            {/* ✅ FIX: label = tên lớp, value = IDLopHoc */}
            <DropdownSelectPortal
              name="class"
              placeholder="Chọn lớp học"
              options={classData.map((c) => ({
                label: c.name, // ✅ TenLopHoc (hiển thị)
                value: c.id,   // ✅ IDLopHoc (lưu vào form)
              }))}
              menuWidth={320}
              placement="bottom"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.studentCount ?? 0}
            </div>
            <div className="text-sm text-slate-500">Tổng học viên</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.avgScore ?? "-"}
            </div>
            <div className="text-sm text-slate-500">Điểm TB lớp</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.completion ?? 0}%
            </div>
            <div className="text-sm text-slate-500">Tỷ lệ hoàn thành</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <div className="mb-1 text-3xl font-bold text-slate-800">
              {selectedClassUI?.pending ?? 0}
            </div>
            <div className="text-sm text-slate-500">Bài tập chưa chấm</div>
          </div>
        </div>

        {/* Search lớp (RHF) */}
        <div className="mb-4">
          <Input
            name="search_class"
            type="search"
            placeholder="Tìm lớp..."
            inputClassName="focus:ring-4 focus:ring-violet-100"
          />
        </div>

        {/* ✅ Class list */}
        <ClassListPanel
          classData={classData}
          selectedId={selectedId}
          onSelectClass={(id) => forms.setValue("class", id)} // ✅ set IDLopHoc
          onManage={() => alert("Tính năng quản lý lớp sẽ bổ sung sau")}
          keyword={keywordClass}
        />

        {/* ===== Danh sách học viên ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-xl font-bold text-slate-800">
              Danh sách học viên ({filteredStudents.length})
            </h2>

            <div className="flex gap-3">
              <Input
                name="search_student"
                type="search"
                placeholder="Tìm học viên..."
                inputClassName="focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-225 border-separate border-spacing-0">
              <thead className="bg-slate-50">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-sm [&>th]:font-semibold [&>th]:text-slate-700">
                  <th>Học viên</th>
                  <th>Điểm Listening</th>
                  <th>Điểm Reading</th>
                  <th>Tổng điểm</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-slate-200">
                {filteredStudents.map((hv) => {
                  const tk = hv.IDHocVien_detail?.TaiKhoan_detail;
                  const name = tk?.HoTen ?? hv.IDHocVien;
                  const email = tk?.Email ?? hv.IDHocVien;
                  const initials = getInitials(name);

                  return (
                    <tr
                      key={`${hv.LopHocID}-${hv.IDHocVien}`}
                      className="bg-white hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {name}
                            </div>
                            <div className="text-[13px] text-slate-500">
                              {email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Backend chưa có điểm/tiến độ -> placeholder */}
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800">-</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800">-</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-base font-bold text-slate-700">
                          -
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] font-semibold text-slate-500">
                          -
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          -
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            Xem
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-slate-600"
                    >
                      Không có học viên trong lớp này (hoặc không khớp từ khóa).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
