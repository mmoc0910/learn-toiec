import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  return (
    <ContentLayoutWrapper heading="Tổng quan">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ===== Tổng quan lớp học ===== */}
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

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div
                className="text-3xl font-bold text-blue-600"
                id="class-count"
              >
                3
              </div>
              <div className="text-sm text-slate-500">Lớp đang dạy</div>
            </div>
            <div>
              <div
                className="text-3xl font-bold text-blue-600"
                id="student-count"
              >
                85
              </div>
              <div className="text-sm text-slate-500">Tổng học viên</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-800 mb-3">
              Điểm trung bình theo lớp
            </div>

            <div className="h-64">
              <ResponsiveContainer>
                <BarChart
                  data={[
                    { name: "Lớp A", score: 620 },
                    { name: "Lớp B", score: 580 },
                    { name: "Lớp C", score: 700 },
                    { name: "Lớp D", score: 589 },
                    { name: "Lớp E", score: 456 },
                    { name: "Lớp F", score: 345 },
                    { name: "Lớp G", score: 123 },
                    { name: "Lớp H", score: 678 },
                    { name: "Lớp I", score: 546 },
                  ]}
                >
                  <XAxis dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="score" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== Công việc hôm nay ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Công việc hôm nay
              </h3>
              <p className="text-sm text-slate-500">Các bài test cần chấm</p>
            </div>

            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              {/* CLIPBOARD SVG */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 12H15"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 16H15"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M9 12H9.01"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M9 16H9.01"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="bg-amber-100 rounded-lg p-4 text-center mb-6">
            <div
              className="text-5xl font-bold text-orange-500"
              id="pending-tests"
            >
              4
            </div>
            <div className="text-sm font-medium text-amber-800">
              Bài test cần chấm
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { name: "Nguyễn Văn A", test: "Full Test 01", avatar: "N" },
              { name: "Trần Thị B", test: "Mini Test 02", avatar: "T" },
              { name: "Lê Minh C", test: "Part 5 Practice", avatar: "L" },
            ].map((t) => (
              <div
                key={t.name}
                className="flex items-center justify-between p-3 bg-slate-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-500">{t.test}</div>
                  </div>
                </div>
                <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-100">
                  Chấm ngay
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= CLASS MANAGEMENT TABLE ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)] mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">
              Quản lý lớp học
            </h3>
            <p className="text-sm text-slate-500">
              Danh sách các lớp đang giảng dạy
            </p>
          </div>

          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">
            + Tạo lớp mới
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3 text-left">Tên lớp</th>
                <th className="px-4 py-3 text-left">Số học viên</th>
                <th className="px-4 py-3 text-left">Điểm TB</th>
                <th className="px-4 py-3 text-left">Tiến độ</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Hành động</th>
              </tr>
            </thead>

            <tbody>
              {[
                {
                  name: "TOEIC 500+ K13",
                  start: "15/01/2024",
                  students: "30 học viên",
                  avg: 615,
                  progress: 65,
                  status: "Đang học",
                  statusType: "success",
                },
                {
                  name: "TOEIC 700+ K4",
                  start: "10/12/2023",
                  students: "20 học viên",
                  avg: 690,
                  progress: 88,
                  status: "Sắp thi",
                  statusType: "warning",
                },
                {
                  name: "TOEIC 600+ K8",
                  start: "20/01/2024",
                  students: "35 học viên",
                  avg: 580,
                  progress: 45,
                  status: "Đang học",
                  statusType: "success",
                },
              ].map((row) => (
                <tr
                  key={row.name}
                  className="odd:bg-white even:bg-slate-100 border-t border-slate-200"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">
                      {row.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      Khai giảng: {row.start}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.students}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-blue-600 text-base">
                      {row.avg}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="w-30">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {row.progress}%
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {row.statusType === "success" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {row.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        {row.status}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-100">
                        Vào lớp
                      </button>
                      <button className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100">
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= TEST MANAGEMENT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== Test List (2fr) ===== */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <h3 className="text-xl font-bold text-slate-800 mb-5">
            Đề thi đã tạo
          </h3>

          <div className="flex flex-col gap-3">
            {[
              {
                title: "Mock Test 01",
                desc: "120 phút • 200 câu • Full test",
                badge: "56 học viên",
                border: "border-blue-600",
              },
              {
                title: "Mini Test Part 5",
                desc: "20 phút • 30 câu • Grammar",
                badge: "30 học viên",
                border: "border-amber-500",
              },
              {
                title: "Listening Practice 01",
                desc: "45 phút • 100 câu • Listening",
                badge: "42 học viên",
                border: "border-emerald-600",
              },
            ].map((t) => (
              <div
                key={t.title}
                className={`p-4 bg-slate-100 rounded-lg border-l-4 ${t.border}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-base font-semibold text-slate-800 mb-1">
                      {t.title}
                    </h4>
                    <p className="text-[13px] text-slate-500">{t.desc}</p>
                  </div>

                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {t.badge}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button className="px-4 py-1.5 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-100">
                    Xem đề
                  </button>
                  <button className="px-4 py-1.5 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-100">
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== Create New Test (1fr) ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
          <h3 className="text-xl font-bold text-slate-800 mb-5">Tạo đề mới</h3>

          <form className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="test-name"
                className="block text-sm font-medium text-slate-800 mb-2"
              >
                Tên đề thi
              </label>
              <input
                type="text"
                id="test-name"
                placeholder="VD: Mock Test 02"
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="test-type"
                className="block text-sm font-medium text-slate-800 mb-2"
              >
                Loại đề
              </label>
              <select
                id="test-type"
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white cursor-pointer transition-colors"
              >
                <option>Full Test (200 câu)</option>
                <option>Mini Test (100 câu)</option>
                <option>Part 1-4 (Listening)</option>
                <option>Part 5-7 (Reading)</option>
                <option>Part riêng lẻ</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="test-duration"
                className="block text-sm font-medium text-slate-800 mb-2"
              >
                Thời gian (phút)
              </label>
              <input
                type="number"
                id="test-duration"
                placeholder="120"
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="test-class"
                className="block text-sm font-medium text-slate-800 mb-2"
              >
                Giao cho lớp
              </label>
              <select
                id="test-class"
                className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white cursor-pointer transition-colors"
              >
                <option>Tất cả lớp</option>
                <option>TOEIC 500+ K13</option>
                <option>TOEIC 700+ K4</option>
                <option>TOEIC 600+ K8</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 transition-colors"
            >
              ✓ Tạo đề thi
            </button>
          </form>
        </div>
      </div>
    </ContentLayoutWrapper>
  );
}
