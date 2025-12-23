export function Footer() {
  return (
    <footer className="border-t border-t-slate-300 py-10">
      <div className="section-wrapper grid grid-cols-4 gap-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black font-bold text-white">
            TO
          </div>
          <span className="bg-[#9DDCFF] px-2 text-lg font-semibold">
            ToiecExamFree
          </span>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-lg">Về ToiecExamFree</p>
          <p>Giới thiệu</p>
          <p>Liên hệ</p>
          <p>Điều khoản bảo mật</p>
          <p>Điều khoản sử dụng</p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-lg">Tài nguyên</p>
          <p>Thư viện đề thi</p>
          <p>Blog</p>
          <p>Tổng hợp tài liệu</p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-lg">Chính sách chung</p>
          <p>Hướng dẫn sử dụng</p>
          <p>Phản hồi, khiếu nại</p>
        </div>
        <div className="col-span-4">
          <p className="text-center">
            IELTS is a registered trademark of University of Cambridge, the
            British Council, and IDP Education Australia. This site and its
            owners are not affiliated, approved or endorsed by the University of
            Cambridge ESOL, the British Council, and IDP Education Australia.
            ETS®, TOEIC® and TOEFL® are registered trademarks of Educational
            Testing Service (ETS). This web site is not endorsed or approved by
            ETS.
          </p>
        </div>
      </div>
    </footer>
  );
}
