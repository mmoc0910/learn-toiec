import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

export default function Dashboard() {
  return (
    <ContentLayoutWrapper heading="Bảng điều khiển">
      <div className="content-area">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-4 gap-5">
          {/* Card 1 */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#0EA5E9" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Tổng học viên</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  1,248
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
                    stroke="#0EA5E9"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                +12.5%
              </span>
              <span className="text-[13px] text-slate-500">
                so với tháng trước
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#10B981" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Giáo viên</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  48
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                +3
              </span>
              <span className="text-[13px] text-slate-500">giáo viên mới</span>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#F59E0B" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Đề thi</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  326
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                +28
              </span>
              <span className="text-[13px] text-slate-500">đề thi mới</span>
            </div>
          </div>

          {/* Card 4 */}
          <div
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm border-l-4"
            style={{ borderLeftColor: "#8B5CF6" }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="mb-2 text-sm text-slate-500">Doanh thu</div>
                <div className="text-[32px] font-bold leading-none text-slate-800">
                  ₫48M
                </div>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
                    stroke="#8B5CF6"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                +18.2%
              </span>
              <span className="text-[13px] text-slate-500">tăng trưởng</span>
            </div>
          </div>
        </div>

        {/* Middle grid */}
        <div className="mb-8 grid grid-cols-3 gap-6">
          {/* Chart (col-span-2) */}
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="m-0 text-lg font-bold text-slate-800">
                  Lượt làm bài theo tháng
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  Thống kê 6 tháng gần nhất
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                2024
              </span>
            </div>

            <div className="flex h-48 items-end gap-4">
              {[
                { h: "65%", v: "2,450", l: "T8" },
                { h: "75%", v: "2,820", l: "T9" },
                { h: "85%", v: "3,180", l: "T10" },
                { h: "70%", v: "2,650", l: "T11" },
                { h: "90%", v: "3,420", l: "T12" },
                { h: "100%", v: "3,850", l: "T1" },
              ].map((x) => (
                <div
                  key={x.l}
                  className="group flex w-full flex-col items-center"
                >
                  <div
                    className="relative w-full rounded-xl bg-blue-100 transition group-hover:bg-blue-200"
                    style={{ height: x.h }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-slate-600">
                      {x.v}
                    </span>
                  </div>
                  <span className="mt-2 text-xs text-slate-500">{x.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Students */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-bold text-slate-800">
              Học viên mới
            </h3>

            <div className="flex flex-col gap-4">
              {[
                {
                  init: "NA",
                  name: "Nguyễn Thị Anh",
                  time: "Hôm nay",
                  badge: "Mới",
                  avatarClass: "bg-slate-200 text-slate-700",
                },
                {
                  init: "TB",
                  name: "Trần Văn Bình",
                  time: "Hôm nay",
                  badge: "Mới",
                  avatarClass: "bg-emerald-600 text-white",
                },
                {
                  init: "LC",
                  name: "Lê Thị Cúc",
                  time: "Hôm qua",
                  badge: "Mới",
                  avatarClass: "bg-amber-500 text-white",
                  badgeBlue: true,
                },
                {
                  init: "PD",
                  name: "Phạm Văn Dũng",
                  time: "Hôm qua",
                  badge: "Mới",
                  avatarClass: "bg-purple-600 text-white",
                  badgeBlue: true,
                },
                {
                  init: "HE",
                  name: "Hoàng Thị Em",
                  time: "2 ngày trước",
                  badge: "Mới",
                  avatarClass: "bg-red-600 text-white",
                  badgeBlue: true,
                },
              ].map((s) => (
                <div key={s.init} className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${s.avatarClass}`}
                  >
                    {s.init}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500">{s.time}</div>
                  </div>
                  <span
                    className={
                      s.badgeBlue
                        ? "rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
                        : "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                    }
                  >
                    {s.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Popular exams */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-bold text-slate-800">
              Đề thi phổ biến
            </h3>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-3 font-semibold">Tên đề thi</th>
                  <th className="pb-3 font-semibold">Lượt làm</th>
                  <th className="pb-3 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-t [&>tr]:border-slate-100">
                {[
                  {
                    name: "TOEIC Mock Test 05",
                    count: "1,248",
                    status: "Hoạt động",
                    st: "green",
                  },
                  {
                    name: "TOEIC Mock Test 04",
                    count: "1,156",
                    status: "Hoạt động",
                    st: "green",
                  },
                  {
                    name: "Part 5 - Grammar",
                    count: "892",
                    status: "Hoạt động",
                    st: "green",
                  },
                  {
                    name: "Part 7 - Reading",
                    count: "756",
                    status: "Hoạt động",
                    st: "green",
                  },
                  {
                    name: "TOEIC Mock Test 03",
                    count: "684",
                    status: "Bảo trì",
                    st: "yellow",
                  },
                ].map((r) => (
                  <tr key={r.name}>
                    <td className="py-3 font-semibold text-slate-800">
                      {r.name}
                    </td>
                    <td className="py-3 text-slate-600">{r.count}</td>
                    <td className="py-3">
                      <span
                        className={
                          r.st === "green"
                            ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-bold text-slate-800">
              Hoạt động gần đây
            </h3>

            <div className="space-y-4">
              {[
                {
                  title: "Học viên mới đăng ký",
                  desc: "Nguyễn Thị Anh vừa đăng ký khóa TOEIC 550+",
                  time: "5 phút trước",
                  iconBg: "bg-blue-100",
                  iconStroke: "#0EA5E9",
                  icon: (
                    <>
                      <path
                        d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                        stroke="#0EA5E9"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
                        stroke="#0EA5E9"
                        strokeWidth="2"
                      />
                    </>
                  ),
                },
                {
                  title: "Đề thi mới được tạo",
                  desc: 'Thầy Minh đã tạo đề "TOEIC Mock Test 06"',
                  time: "1 giờ trước",
                  iconBg: "bg-emerald-100",
                  icon: (
                    <path
                      d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                  ),
                },
                {
                  title: "Đánh giá mới",
                  desc: "Trần Văn Bình đã đánh giá 5 sao cho khóa học",
                  time: "2 giờ trước",
                  iconBg: "bg-amber-100",
                  icon: (
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke="#F59E0B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ),
                },
                {
                  title: "Thanh toán thành công",
                  desc: "Lê Thị Cúc đã thanh toán ₫2,500,000",
                  time: "3 giờ trước",
                  iconBg: "bg-purple-100",
                  icon: (
                    <path
                      d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  ),
                },
              ].map((a) => (
                <div
                  key={a.title}
                  className="flex gap-3 rounded-xl border border-slate-100 p-4"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg}`}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {a.icon}
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">
                      {a.title}
                    </div>
                    <div className="mt-0.5 text-[13px] text-slate-500">
                      {a.desc}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ContentLayoutWrapper>
  );
}
