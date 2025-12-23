export function Exams() {
  return (
    <div className="section-wrapper pb-20 space-y-5">
      <h3 className="text-center font-medium text-3xl capitalize">
        Đề thi mới nhất
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[#e0e0e0] shadow-[0_4px_0_0_rgba(143,156,173,0.2)] p-3 space-y-2"
          >
            <p className="font-medium">
              IELTS Simulation Listening test 1{item}
            </p>
            <p className="text-sm font-light">#Toiec Academic#Listening</p>

            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                className="size-4"
              >
                <path d="M528 320C528 434.9 434.9 528 320 528C205.1 528 112 434.9 112 320C112 205.1 205.1 112 320 112C434.9 112 528 205.1 528 320zM64 320C64 461.4 178.6 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z" />
              </svg>
              <span className="font-light">40 phút_40 câu</span>
            </div>
            <button
              type="button"
              className="w-full border border-black rounded-md px-4 py-1 text-center text-sm transition-all duration-150 hover:bg-black hover:text-white cursor-pointer"
            >
              Chi tiết
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
