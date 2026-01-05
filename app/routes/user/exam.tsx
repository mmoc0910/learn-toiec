import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { http } from "utils/libs/https";
import { TiptapViewer } from "components/tiptap-viewer";
import { useAuth } from "hooks/useAuth";

/** =======================
 * Types theo API
 * ======================= */
type ExamQuestionChoice = {
  LuaChonID: string;
  CauHoiID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type TuSapXep = {
  IDTu: string;
  CauHoiID: string;
  NoiDungTu: string;
  ThuTuDung: number;
};

type CapTuKhop = {
  IDCapTu: string;
  CauHoiID: string;
  TuBenTrai: string;
  TuBenPhai: string;
  LaDung: boolean;
};

type ExamQuestionDetail = {
  IDCauHoi: string;
  IDBaiHoc: string;
  NoiDungCauHoi: any;
  LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | "sapxeptu" | "khoptu" | string;
  GiaiThich: string | null;
  FileNghe_url: string | null;
  lua_chon: ExamQuestionChoice[];
  tu_sap_xep: TuSapXep[];
  cap_tu_khop: CapTuKhop[];
};

type ExamChiTiet = {
  IDDeThi: string;
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail: ExamQuestionDetail;
};

type ExamDetail = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string; // "HH:MM:SS"
  IDGiaoVien: string;
  chi_tiet: ExamChiTiet[];
  so_cau_hoi: number;
};

type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type LichThiItem = {
  IDLichThi: string;
  IDDeThi: string;
  ThoiGianBatDau: string;
  ThoiGianKetThuc: string;
};

type NopBaiChiTiet = {
  ChiTietBaiLamID: string;
  CauHoiID: string;
  LuaChon: string; // ✅ LUÔN là string (không null)
  TraLoiTuLuan: string; // ✅ LUÔN là string (không null)
  LaDung?: boolean | null;
};

type NopBaiPayload = {
  KetQuaID: string;
  DeThiID: string;
  LichThiID: string;
  ThoiGianBatDau: string;

  // ✅ thường backend yêu cầu học viên
  HocVienID?: string;
  IDHocVien?: string;

  chi_tiet_data: NopBaiChiTiet[];
};

/** =======================
 * Helpers
 * ======================= */
function parseTipTap(raw: any) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: raw }] },
        ],
      };
    }
  }
  return null;
}

function hmsToSeconds(hms: string) {
  const parts = (hms || "").split(":").map((x) => Number(x));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return 0;
  const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  return hh * 3600 + mm * 60 + ss;
}

function secondsToClock(total: number) {
  const n = Math.max(0, Math.floor(total));
  const hh = Math.floor(n / 3600);
  const mm = Math.floor((n % 3600) / 60);
  const ss = n % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

function nowInRange(startIso: string, endIso: string) {
  const now = Date.now();
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  return Number.isFinite(s) && Number.isFinite(e) && now >= s && now <= e;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeSubmitError(err: any): string {
  const data = err?.response?.data;

  // list: ["Trường này là bắt buộc."]
  if (Array.isArray(data)) return data.join("\n");

  // object: { field: ["..."] }
  if (data && typeof data === "object") {
    const lines: string[] = [];
    for (const k of Object.keys(data)) {
      const v = (data as any)[k];
      if (Array.isArray(v)) lines.push(`${k}: ${v.join(", ")}`);
      else lines.push(`${k}: ${String(v)}`);
    }
    if (lines.length) return lines.join("\n");
  }

  return (
    data?.detail ||
    data?.message ||
    err?.message ||
    "Có lỗi xảy ra khi nộp bài."
  );
}

function typeLabel(t: string) {
  if (t === "nghe") return "Nghe";
  if (t === "tracnghiem") return "Trắc nghiệm";
  if (t === "tuluan") return "Tự luận";
  if (t === "sapxeptu") return "Sắp xếp từ";
  if (t === "khoptu") return "Khớp từ";
  return t || "-";
}

/** =======================
 * Answers
 * ======================= */
type AnswerMap = Record<
  string,
  | { type: "choice"; value: string }
  | { type: "text"; value: string }
  | { type: "sapxeptu"; value: string[] }
  | { type: "khoptu"; value: string[] }
>;

export default function TakeExamPage() {
  const navigate = useNavigate();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();

  const examId =
    (params as any)?.IDDeThi ||
    (params as any)?.id ||
    (params as any)?.examId ||
    "";

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [lichThi, setLichThi] = useState<LichThiItem | null>(null);
  const [canTake, setCanTake] = useState(false);
  const [timeInfo, setTimeInfo] = useState<string>("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const startedAtRef = useRef<string>("");
  const ketQuaIdRef = useRef<string>("");

  const questions = useMemo(() => {
    const list = exam?.chi_tiet ? [...exam.chi_tiet] : [];
    list.sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0));
    return list;
  }, [exam]);

  const current = questions[currentIndex]?.IDCauHoi_detail;

  const currentTipTap = useMemo(() => {
    return parseTipTap(current?.NoiDungCauHoi);
  }, [current?.NoiDungCauHoi]);

  /** =======================
   * Load: lịch thi + đề thi
   * ======================= */
  useEffect(() => {
    if (!examId) {
      setErrMsg("Thiếu IDDeThi trong URL.");
      return;
    }

    let mounted = true;

    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        // 1) lịch thi
        const lichRes = await http.get<PaginatedRes<LichThiItem>>(
          "/api/exams/lich-thi/"
        );
        const list = lichRes.data?.results ?? [];
        const matched = list.find((x) => x.IDDeThi === examId) || null;

        if (!mounted) return;

        if (!matched) {
          setLichThi(null);
          setCanTake(false);
          setTimeInfo("Đề này chưa có lịch thi → không thể làm bài.");
          setExam(null);
          return;
        }

        setLichThi(matched);

        const inTime = nowInRange(
          matched.ThoiGianBatDau,
          matched.ThoiGianKetThuc
        );
        setCanTake(inTime);

        if (!inTime) {
          const s = new Date(matched.ThoiGianBatDau).toLocaleString();
          const e = new Date(matched.ThoiGianKetThuc).toLocaleString();
          setTimeInfo(`Chỉ được thi trong thời gian: ${s} → ${e}`);
          setExam(null);
          return;
        }

        // 2) đề thi
        const res = await http.get<ExamDetail>(`/api/exams/de-thi/${examId}/`);
        if (!mounted) return;

        setExam(res.data);

        const secs = hmsToSeconds(res.data.ThoiGianLamBaiThi);
        setTimeLeft(secs > 0 ? secs : 0);

        startedAtRef.current = new Date().toISOString();
        ketQuaIdRef.current = makeId("ketqua");

        const init: AnswerMap = {};
        (res.data.chi_tiet || []).forEach((ct) => {
          const q = ct.IDCauHoi_detail;
          if (q.LoaiCauHoi === "tuluan") {
            init[q.IDCauHoi] = { type: "text", value: "" };
          } else if (q.LoaiCauHoi === "sapxeptu") {
            const sorted = [...(q.tu_sap_xep || [])].sort(
              (a, b) => (a.ThuTuDung ?? 0) - (b.ThuTuDung ?? 0)
            );
            init[q.IDCauHoi] = {
              type: "sapxeptu",
              value: sorted.map((x) => x.IDTu),
            };
          } else if (q.LoaiCauHoi === "khoptu") {
            init[q.IDCauHoi] = { type: "khoptu", value: [] };
          } else {
            init[q.IDCauHoi] = { type: "choice", value: "" };
          }
        });
        setAnswers(init);
      } catch (err: any) {
        if (!mounted) return;
        setErrMsg(normalizeSubmitError(err));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [examId]);

  /** =======================
   * Timer FIX (không reset mỗi giây)
   * ======================= */
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);

    if (!exam) return;
    if (!canTake) return;
    if (timeLeft <= 0) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        return next >= 0 ? next : 0;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, canTake]);

  /** =======================
   * Auto submit FIX
   * ======================= */
  useEffect(() => {
    if (!exam) return;
    if (!canTake) return;
    if (timeLeft !== 0) return;
    if (submittedRef.current) return;

    submittedRef.current = true;
    alert("Hết giờ! Hệ thống sẽ nộp bài.");
    void handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, exam, canTake]);

  const answeredCount = useMemo(() => {
    if (!questions.length) return 0;
    let n = 0;
    questions.forEach((ct) => {
      const q = ct.IDCauHoi_detail;
      const a = answers[q.IDCauHoi];
      if (!a) return;
      if (a.type === "choice" && a.value) n += 1;
      if (a.type === "text" && a.value.trim()) n += 1;
      if (a.type === "sapxeptu" && a.value.length) n += 1;
      if (a.type === "khoptu" && a.value.length) n += 1;
    });
    return n;
  }, [answers, questions]);

  const percent = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round((answeredCount / questions.length) * 100);
  }, [answeredCount, questions.length]);

  function setChoice(questionId: string, choiceId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { type: "choice", value: choiceId },
    }));
  }

  function setText(questionId: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { type: "text", value },
    }));
  }

  function moveSapXep(questionId: string, fromIdx: number, dir: -1 | 1) {
    setAnswers((prev) => {
      const a = prev[questionId];
      if (!a || a.type !== "sapxeptu") return prev;
      const arr = [...a.value];
      const toIdx = fromIdx + dir;
      if (toIdx < 0 || toIdx >= arr.length) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, [questionId]: { type: "sapxeptu", value: arr } };
    });
  }

  function toggleKhopTu(questionId: string, capId: string) {
    setAnswers((prev) => {
      const a = prev[questionId];
      if (!a || a.type !== "khoptu") return prev;
      const set = new Set(a.value);
      if (set.has(capId)) set.delete(capId);
      else set.add(capId);
      return { ...prev, [questionId]: { type: "khoptu", value: [...set] } };
    });
  }

  function goTo(i: number) {
    if (i < 0 || i >= questions.length) return;
    setCurrentIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function next() {
    goTo(currentIndex + 1);
  }
  function prev() {
    goTo(currentIndex - 1);
  }

  /** ✅ QUAN TRỌNG: chi_tiet_data LUÔN gửi string, không null */
  function buildChiTietData(): NopBaiChiTiet[] {
    return questions.map((ct) => {
      const q = ct.IDCauHoi_detail;
      const a = answers[q.IDCauHoi];

      const base: NopBaiChiTiet = {
        ChiTietBaiLamID: makeId("ctbl"),
        CauHoiID: q.IDCauHoi,
        LuaChon: "", // ✅ không null
        TraLoiTuLuan: "", // ✅ không null
      };

      if (!a) return base;

      if (q.LoaiCauHoi === "tuluan") {
        return {
          ...base,
          LuaChon: "", // ✅ tránh required
          TraLoiTuLuan: a.type === "text" ? a.value : "",
        };
      }

      if (q.LoaiCauHoi === "sapxeptu") {
        const arr = a.type === "sapxeptu" ? a.value : [];
        return {
          ...base,
          LuaChon: JSON.stringify(arr),
          TraLoiTuLuan: "",
        };
      }

      if (q.LoaiCauHoi === "khoptu") {
        const arr = a.type === "khoptu" ? a.value : [];
        return {
          ...base,
          LuaChon: JSON.stringify(arr),
          TraLoiTuLuan: "",
        };
      }

      // tracnghiem / nghe
      return {
        ...base,
        LuaChon: a.type === "choice" ? a.value : "",
        TraLoiTuLuan: "",
      };
    });
  }

  // async function handleSubmit(isAuto = false) {
  //   if (!exam || !lichThi) return;

  //   // ✅ bắt buộc có user (nhiều backend yêu cầu)
  //   if (!user?.IDTaiKhoan) {
  //     alert("Bạn chưa đăng nhập hoặc chưa lấy được thông tin user.");
  //     submittedRef.current = false;
  //     return;
  //   }

  //   try {
  //     const payload: NopBaiPayload = {
  //       KetQuaID: ketQuaIdRef.current || makeId("ketqua"),
  //       DeThiID: exam.IDDeThi,
  //       LichThiID: lichThi.IDLichThi,
  //       ThoiGianBatDau: startedAtRef.current || new Date().toISOString(),

  //       // ✅ add user id để tránh lỗi required (backend field nào cũng OK)
  //       HocVienID: user.IDTaiKhoan,
  //       IDHocVien: user.IDTaiKhoan,

  //       chi_tiet_data: buildChiTietData(),
  //     };

  //     // DEBUG: nếu còn lỗi, nhìn payload ngay
  //     console.log("NOP_BAI payload =>", payload);

  //     await http.post("/api/results/ket-qua/nop_bai/", payload);

  //     alert(isAuto ? "Đã auto nộp bài!" : "Nộp bài thành công!");
  //     navigate("/student/exams");
  //   } catch (err: any) {
  //     console.error("NOP_BAI error raw =>", err?.response?.data || err);
  //     alert(normalizeSubmitError(err));
  //     submittedRef.current = false;
  //   }
  // }
  async function handleSubmit(isAuto = false) {
    if (!exam || !lichThi) return;

    if (!user?.IDTaiKhoan) {
      alert("Bạn chưa đăng nhập hoặc chưa lấy được thông tin user.");
      submittedRef.current = false;
      return;
    }

    try {
      const payload: NopBaiPayload = {
        KetQuaID: ketQuaIdRef.current || makeId("ketqua"),
        DeThiID: exam.IDDeThi,
        LichThiID: lichThi.IDLichThi,
        ThoiGianBatDau: startedAtRef.current || new Date().toISOString(),
        HocVienID: user.IDTaiKhoan,
        IDHocVien: user.IDTaiKhoan,
        chi_tiet_data: buildChiTietData(),
      };

      console.log("NOP_BAI payload =>", payload);

      // ✅ BE trả về object có KetQuaID
      const res = await http.post("/api/results/ket-qua/nop_bai/", payload);
      const ketQuaID = res?.data?.KetQuaID || payload.KetQuaID; // fallback nếu BE không trả

      alert(isAuto ? "Đã auto nộp bài!" : "Nộp bài thành công!");

      // ✅ Redirect sang trang tổng kết
      navigate(`/exams/result/${ketQuaID}`);
    } catch (err: any) {
      console.error("NOP_BAI error raw =>", err?.response?.data || err);
      alert(normalizeSubmitError(err));
      submittedRef.current = false;
    }
  }

  if (authLoading && !user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          Đang kiểm tra đăng nhập...
        </div>
      </div>
    );
  }

  if (loading && !exam && !errMsg) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          Đang tải...
        </div>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700 whitespace-pre-wrap">
          {errMsg}
        </div>
      </div>
    );
  }

  if (!canTake) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="text-lg font-bold">Không thể vào làm bài</div>
          <div className="mt-2 text-sm font-semibold">{timeInfo}</div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 h-10 rounded-xl bg-black px-5 font-semibold text-white"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const total = questions.length;
  const currentNo = currentIndex + 1;

  const renderAnswerArea = () => {
    if (!current) return null;

    if (current.LoaiCauHoi === "tracnghiem" || current.LoaiCauHoi === "nghe") {
      return (
        <>
          <div className="text-sm font-bold text-slate-800">Chọn đáp án</div>
          {current.lua_chon?.length ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {current.lua_chon.map((c) => {
                const a = answers[current.IDCauHoi];
                const checked = a?.type === "choice" && a.value === c.LuaChonID;
                return (
                  <label
                    key={c.LuaChonID}
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
                      checked
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={current.IDCauHoi}
                      checked={checked}
                      onChange={() => setChoice(current.IDCauHoi, c.LuaChonID)}
                    />
                    <div className="text-sm font-semibold text-slate-800">
                      {c.NoiDungLuaChon}
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Câu này chưa có lựa chọn.
            </div>
          )}
        </>
      );
    }

    if (current.LoaiCauHoi === "tuluan") {
      return (
        <>
          <div className="text-sm font-bold text-slate-800">
            Trả lời tự luận
          </div>
          <textarea
            className="mt-2 min-h-36 w-full rounded-2xl border border-slate-200 p-4 text-slate-800 outline-none focus:ring-4 focus:ring-violet-100"
            placeholder="Nhập câu trả lời..."
            value={
              answers[current.IDCauHoi]?.type === "text"
                ? (answers[current.IDCauHoi] as any).value
                : ""
            }
            onChange={(e) => setText(current.IDCauHoi, e.target.value)}
          />
        </>
      );
    }

    if (current.LoaiCauHoi === "sapxeptu") {
      const a = answers[current.IDCauHoi];
      const order = a?.type === "sapxeptu" ? a.value : [];
      const dict = new Map((current.tu_sap_xep || []).map((x) => [x.IDTu, x]));

      return (
        <>
          <div className="text-sm font-bold text-slate-800">Sắp xếp từ</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.map((id, idx) => {
              const w = dict.get(id)?.NoiDungTu ?? id;
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {w}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      disabled={idx === 0}
                      onClick={() => moveSapXep(current.IDCauHoi, idx, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                      disabled={idx === order.length - 1}
                      onClick={() => moveSapXep(current.IDCauHoi, idx, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    }

    if (current.LoaiCauHoi === "khoptu") {
      const a = answers[current.IDCauHoi];
      const selected =
        a?.type === "khoptu" ? new Set(a.value) : new Set<string>();

      return (
        <>
          <div className="text-sm font-bold text-slate-800">Khớp từ</div>
          {current.cap_tu_khop?.length ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {current.cap_tu_khop.map((cap) => {
                const checked = selected.has(cap.IDCapTu);
                return (
                  <button
                    key={cap.IDCapTu}
                    type="button"
                    onClick={() => toggleKhopTu(current.IDCauHoi, cap.IDCapTu)}
                    className={[
                      "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      checked
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {cap.TuBenTrai} ↔ {cap.TuBenPhai}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        ID: {cap.IDCapTu}
                      </div>
                    </div>
                    <div
                      className={[
                        "h-6 w-6 rounded-full border",
                        checked
                          ? "border-violet-400 bg-violet-500"
                          : "border-slate-300 bg-white",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Câu này chưa có cặp từ.
            </div>
          )}
        </>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loại câu hỏi chưa hỗ trợ: <b>{current.LoaiCauHoi}</b>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* TOP BAR */}
      <div className="sticky top-0 z-20 mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-slate-800">
              {exam.TenDeThi}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              User:{" "}
              <span className="font-semibold text-slate-700">
                {user?.Email || user?.IDTaiKhoan}
              </span>{" "}
              • {total} câu • Đã làm:{" "}
              <span className="font-semibold text-slate-700">
                {answeredCount}
              </span>{" "}
              ({percent}%)
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={[
                "rounded-xl px-4 py-2 font-bold",
                timeLeft <= 60
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-slate-50 text-slate-800 border border-slate-200",
              ].join(" ")}
            >
              ⏱ {secondsToClock(timeLeft)}
            </div>

            <button
              type="button"
              onClick={() => {
                const ok = window.confirm("Sếp chắc chắn muốn nộp bài không?");
                if (ok) {
                  submittedRef.current = true;
                  void handleSubmit(false);
                }
              }}
              className="h-10 rounded-xl bg-black px-5 font-semibold text-white hover:opacity-95"
            >
              Nộp bài
            </button>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-violet-600 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* LAYOUT */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-bold text-slate-800">Câu hỏi</div>
              <div className="text-sm font-semibold text-slate-500">
                {currentIndex + 1}/{total}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-6">
              {questions.map((ct, idx) => {
                const q = ct.IDCauHoi_detail;
                const a = answers[q.IDCauHoi];

                const done =
                  (a?.type === "choice" && !!a.value) ||
                  (a?.type === "text" && !!a.value.trim()) ||
                  (a?.type === "sapxeptu" && a.value.length > 0) ||
                  (a?.type === "khoptu" && a.value.length > 0);

                const active = idx === currentIndex;

                return (
                  <button
                    key={q.IDCauHoi}
                    type="button"
                    onClick={() => goTo(idx)}
                    className={[
                      "h-10 rounded-xl border text-sm font-bold transition",
                      active
                        ? "border-violet-300 bg-violet-50 text-violet-700"
                        : done
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                    title={`${typeLabel(q.LoaiCauHoi)} • ${q.IDCauHoi}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-8">
          {!current ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              Không có câu hỏi.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Câu {currentNo} • {typeLabel(current.LoaiCauHoi)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {current.IDCauHoi} • {current.IDBaiHoc}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <TiptapViewer content={currentTipTap} />
              </div>

              {current.LoaiCauHoi === "nghe" && current.FileNghe_url ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 text-sm font-bold text-slate-700">
                    Nghe audio
                  </div>
                  <audio controls className="w-full">
                    <source src={current.FileNghe_url} />
                  </audio>
                </div>
              ) : null}

              <div className="mt-5">{renderAnswerArea()}</div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={prev}
                  disabled={currentIndex === 0}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  ← Câu trước
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const ok = window.confirm(
                        "Sếp chắc chắn muốn nộp bài không?"
                      );
                      if (ok) {
                        submittedRef.current = true;
                        void handleSubmit(false);
                      }
                    }}
                    className="h-11 rounded-xl bg-black px-6 font-semibold text-white hover:opacity-95"
                  >
                    Nộp bài
                  </button>

                  <button
                    type="button"
                    onClick={next}
                    disabled={currentIndex >= total - 1}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Câu sau →
                  </button>
                </div>
              </div>

              {current.GiaiThich ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <span className="font-bold">Gợi ý/giải thích:</span>{" "}
                  {current.GiaiThich}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

//-------------------------------------------------------------------->
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate, useParams } from "react-router";
// import { http } from "utils/libs/https";

// /** =======================
//  * Types theo API sếp đưa
//  * ======================= */
// type ExamQuestionChoice = {
//   LuaChonID: string;
//   CauHoiID: string;
//   NoiDungLuaChon: string;
//   DapAnDung: boolean; // server trả về, khi làm bài FE không nên dùng để show đúng/sai
// };

// type ExamQuestionDetail = {
//   IDCauHoi: string;
//   IDBaiHoc: string;
//   NoiDungCauHoi: any; // tiptap json string
//   LoaiCauHoi: "tracnghiem" | "nghe" | "tuluan" | string;
//   GiaiThich: string | null;
//   FileNghe_url: string | null;
//   lua_chon: ExamQuestionChoice[];
// };

// type ExamChiTiet = {
//   IDDeThi: string;
//   IDCauHoi: string;
//   ThuTuCauHoi: number;
//   IDCauHoi_detail: ExamQuestionDetail;
// };

// type ExamDetail = {
//   IDDeThi: string;
//   TenDeThi: string;
//   ThoiGianLamBaiThi: string; // "HH:MM:SS"
//   IDGiaoVien: string;
//   chi_tiet: ExamChiTiet[];
//   so_cau_hoi: number;
// };

// /** =======================
//  * Helpers
//  * ======================= */
// function getApiErrorMessage(err: any) {
//   const data = err?.response?.data;
//   if (!data) return err?.message || "Có lỗi xảy ra.";
//   if (typeof data?.detail === "string") return data.detail;
//   if (typeof data?.message === "string") return data.message;
//   const firstKey = Object.keys(data)[0];
//   const val = data[firstKey];
//   if (Array.isArray(val)) return val[0];
//   if (typeof val === "string") return val;
//   return "Có lỗi xảy ra.";
// }

// function parseTipTap(raw: any) {
//   if (!raw) return null;
//   if (typeof raw === "object") return raw;
//   if (typeof raw === "string") {
//     try {
//       return JSON.parse(raw);
//     } catch {
//       // nếu backend trả plain text
//       return {
//         type: "doc",
//         content: [{ type: "paragraph", content: [{ type: "text", text: raw }] }],
//       };
//     }
//   }
//   return null;
// }

// function hmsToSeconds(hms: string) {
//   const parts = (hms || "").split(":").map((x) => Number(x));
//   if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return 0;
//   const [hh, mm, ss] = [parts[0] || 0, parts[1] || 0, parts[2] || 0];
//   return hh * 3600 + mm * 60 + ss;
// }

// function secondsToClock(total: number) {
//   const n = Math.max(0, Math.floor(total));
//   const hh = Math.floor(n / 3600);
//   const mm = Math.floor((n % 3600) / 60);
//   const ss = n % 60;
//   const pad = (x: number) => String(x).padStart(2, "0");
//   return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
// }

// function typeLabel(t: string) {
//   if (t === "nghe") return "Nghe";
//   if (t === "tracnghiem") return "Trắc nghiệm";
//   if (t === "tuluan") return "Tự luận";
//   return t || "-";
// }

// /** =======================
//  * Tiptap Viewer SAFE (SSR-safe)
//  * ======================= */
// // NOTE: cần cài các package nếu project chưa có:
// // npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align
// import { useEditor, EditorContent } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import Underline from "@tiptap/extension-underline";
// import TextAlign from "@tiptap/extension-text-align";
// import { TiptapViewer } from "components/tiptap-viewer";

// function TiptapViewerSafe({ content }: { content: any }) {
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   const editor = useEditor(
//     {
//       extensions: [
//         StarterKit,
//         Underline,
//         TextAlign.configure({
//           types: ["heading", "paragraph"],
//         }),
//       ],
//       content,
//       editable: false,
//       // ✅ Fix SSR hydration mismatch
//       immediatelyRender: false,
//     },
//     // ✅ chỉ khởi tạo trên client
//     [mounted]
//   );

//   if (!mounted) {
//     // skeleton tránh SSR lỗi
//     return (
//       <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500">
//         Đang tải nội dung...
//       </div>
//     );
//   }

//   if (!editor) return null;

//   return (
//     <div className="prose max-w-none prose-p:my-2 prose-strong:text-slate-900">
//       <EditorContent editor={editor} />
//     </div>
//   );
// }

// /** =======================
//  * Page: Làm bài thi
//  * ======================= */
// type AnswerMap = Record<
//   string,
//   | { type: "choice"; value: string } // LuaChonID
//   | { type: "text"; value: string } // tuluan
// >;

// export default function TakeExamPage() {
//   const navigate = useNavigate();
//   const params = useParams();

//   // sếp có thể đổi param name theo route của sếp
//   const examId =
//     (params as any)?.IDDeThi ||
//     (params as any)?.id ||
//     (params as any)?.examId ||
//     "";

//   const [exam, setExam] = useState<ExamDetail | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [errMsg, setErrMsg] = useState<string | null>(null);

//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [answers, setAnswers] = useState<AnswerMap>({});
//   const [timeLeft, setTimeLeft] = useState<number>(0);

//   const timerRef = useRef<number | null>(null);

//   const questions = useMemo(() => {
//     const list = exam?.chi_tiet ? [...exam.chi_tiet] : [];
//     list.sort((a, b) => (a.ThuTuCauHoi ?? 0) - (b.ThuTuCauHoi ?? 0));
//     return list;
//   }, [exam]);

//   const current = questions[currentIndex]?.IDCauHoi_detail;

//   // load exam detail
//   useEffect(() => {
//     if (!examId) {
//       setErrMsg("Thiếu IDDeThi trong URL.");
//       return;
//     }

//     let mounted = true;
//     (async () => {
//       setLoading(true);
//       setErrMsg(null);
//       try {
//         const res = await http.get<ExamDetail>(`/api/exams/de-thi/${examId}/`);
//         if (!mounted) return;
//         setExam(res.data);

//         // init timer
//         const secs = hmsToSeconds(res.data.ThoiGianLamBaiThi);
//         setTimeLeft(secs > 0 ? secs : 0);

//         // init answers map empty (không bắt buộc)
//         const init: AnswerMap = {};
//         (res.data.chi_tiet || []).forEach((ct) => {
//           const q = ct.IDCauHoi_detail;
//           if (q.LoaiCauHoi === "tuluan") {
//             init[q.IDCauHoi] = { type: "text", value: "" };
//           } else {
//             init[q.IDCauHoi] = { type: "choice", value: "" };
//           }
//         });
//         setAnswers(init);
//       } catch (err: any) {
//         if (!mounted) return;
//         setErrMsg(getApiErrorMessage(err));
//       } finally {
//         if (!mounted) return;
//         setLoading(false);
//       }
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, [examId]);

//   // countdown timer
//   useEffect(() => {
//     // clear old timer
//     if (timerRef.current) window.clearInterval(timerRef.current);

//     if (!exam) return;
//     if (timeLeft <= 0) return;

//     timerRef.current = window.setInterval(() => {
//       setTimeLeft((prev) => {
//         const next = prev - 1;
//         return next >= 0 ? next : 0;
//       });
//     }, 1000);

//     return () => {
//       if (timerRef.current) window.clearInterval(timerRef.current);
//     };
//   }, [exam, timeLeft]);

//   // auto submit when time over (UI only)
//   useEffect(() => {
//     if (!exam) return;
//     if (timeLeft !== 0) return;
//     // hết giờ -> hiện alert và gọi submit
//     // (sếp có thể đổi thành modal)
//     // eslint-disable-next-line no-alert
//     alert("Hết giờ! Hệ thống sẽ nộp bài.");
//     void handleSubmit(true);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [timeLeft, exam]);

//   const answeredCount = useMemo(() => {
//     if (!questions.length) return 0;
//     let n = 0;
//     questions.forEach((ct) => {
//       const q = ct.IDCauHoi_detail;
//       const a = answers[q.IDCauHoi];
//       if (!a) return;
//       if (a.type === "choice" && a.value) n += 1;
//       if (a.type === "text" && a.value.trim()) n += 1;
//     });
//     return n;
//   }, [answers, questions]);

//   const percent = useMemo(() => {
//     if (!questions.length) return 0;
//     return Math.round((answeredCount / questions.length) * 100);
//   }, [answeredCount, questions.length]);

//   function setChoice(questionId: string, choiceId: string) {
//     setAnswers((prev) => ({
//       ...prev,
//       [questionId]: { type: "choice", value: choiceId },
//     }));
//   }

//   function setText(questionId: string, value: string) {
//     setAnswers((prev) => ({
//       ...prev,
//       [questionId]: { type: "text", value },
//     }));
//   }

//   function goTo(i: number) {
//     if (i < 0 || i >= questions.length) return;
//     setCurrentIndex(i);
//     // scroll top on change (nice UX)
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   }

//   function next() {
//     goTo(currentIndex + 1);
//   }

//   function prev() {
//     goTo(currentIndex - 1);
//   }

//   async function handleSubmit(isAuto = false) {
//     if (!exam) return;

//     // ✅ build payload (sếp chỉnh theo API nộp bài của backend)
//     const payload = {
//       IDDeThi: exam.IDDeThi,
//       answers: questions.map((ct) => {
//         const q = ct.IDCauHoi_detail;
//         const a = answers[q.IDCauHoi];
//         if (q.LoaiCauHoi === "tuluan") {
//           return {
//             IDCauHoi: q.IDCauHoi,
//             type: "tuluan",
//             text: a?.type === "text" ? a.value : "",
//           };
//         }
//         return {
//           IDCauHoi: q.IDCauHoi,
//           type: q.LoaiCauHoi,
//           LuaChonID: a?.type === "choice" ? a.value : "",
//         };
//       }),
//       meta: {
//         submittedAt: new Date().toISOString(),
//         isAuto,
//         timeLeft,
//       },
//     };

//     try {
//       // 🔥 TODO: đổi endpoint theo backend thật (sếp chưa đưa API nộp bài)
//       // await http.post("/api/exams/submit/", payload);

//       console.log("SUBMIT PAYLOAD =>", payload);
//       alert(isAuto ? "Đã auto nộp bài (log console)." : "Đã nộp bài (log console).");

//       // điều hướng sau khi nộp
//       navigate("/student/exams"); // sếp đổi route theo dự án
//     } catch (err: any) {
//       alert(getApiErrorMessage(err));
//     }
//   }

//   if (loading && !exam) {
//     return (
//       <div className="p-6">
//         <div className="rounded-2xl border border-slate-200 bg-white p-6">
//           Đang tải đề thi...
//         </div>
//       </div>
//     );
//   }

//   if (errMsg) {
//     return (
//       <div className="p-6">
//         <div className="rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
//           {errMsg}
//         </div>
//       </div>
//     );
//   }

//   if (!exam) return null;

//   const total = questions.length;
//   const currentNo = currentIndex + 1;

//   return (
//     <div className="mx-auto max-w-7xl p-4 md:p-6">
//       {/* TOP BAR */}
//       <div className="sticky top-0 z-20 mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
//         <div className="flex flex-wrap items-center justify-between gap-3">
//           <div className="min-w-0">
//             <div className="truncate text-lg font-bold text-slate-800">
//               {exam.TenDeThi}
//             </div>
//             <div className="mt-1 text-sm text-slate-500">
//               ID: <span className="font-semibold text-slate-700">{exam.IDDeThi}</span>{" "}
//               • {total} câu • Đã làm:{" "}
//               <span className="font-semibold text-slate-700">{answeredCount}</span>{" "}
//               ({percent}%)
//             </div>
//           </div>

//           <div className="flex items-center gap-3">
//             <div
//               className={[
//                 "rounded-xl px-4 py-2 font-bold",
//                 timeLeft <= 60
//                   ? "bg-red-50 text-red-700 border border-red-200"
//                   : "bg-slate-50 text-slate-800 border border-slate-200",
//               ].join(" ")}
//               title="Thời gian còn lại"
//             >
//               ⏱ {secondsToClock(timeLeft)}
//             </div>

//             <button
//               type="button"
//               onClick={() => {
//                 const ok = window.confirm("Sếp chắc chắn muốn nộp bài không?");
//                 if (ok) void handleSubmit(false);
//               }}
//               className="h-10 rounded-xl bg-black px-5 font-semibold text-white hover:opacity-95"
//             >
//               Nộp bài
//             </button>
//           </div>
//         </div>

//         {/* progress bar */}
//         <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
//           <div
//             className="h-full bg-violet-600 transition-all"
//             style={{ width: `${percent}%` }}
//           />
//         </div>
//       </div>

//       {/* LAYOUT */}
//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
//         {/* LEFT: Navigator */}
//         <div className="lg:col-span-4">
//           <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
//             <div className="mb-3 flex items-center justify-between">
//               <div className="text-lg font-bold text-slate-800">Câu hỏi</div>
//               <div className="text-sm font-semibold text-slate-500">
//                 {currentNo}/{total}
//               </div>
//             </div>

//             <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-6">
//               {questions.map((ct, idx) => {
//                 const q = ct.IDCauHoi_detail;
//                 const a = answers[q.IDCauHoi];
//                 const done =
//                   (a?.type === "choice" && !!a.value) ||
//                   (a?.type === "text" && !!a.value.trim());

//                 const active = idx === currentIndex;

//                 return (
//                   <button
//                     key={q.IDCauHoi}
//                     type="button"
//                     onClick={() => goTo(idx)}
//                     className={[
//                       "h-10 rounded-xl border text-sm font-bold transition",
//                       active
//                         ? "border-violet-300 bg-violet-50 text-violet-700"
//                         : done
//                         ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
//                         : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
//                     ].join(" ")}
//                     title={`${typeLabel(q.LoaiCauHoi)} • ${q.IDCauHoi}`}
//                   >
//                     {idx + 1}
//                   </button>
//                 );
//               })}
//             </div>

//             <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
//               <span className="inline-flex items-center gap-2">
//                 <span className="size-3 rounded-full bg-emerald-400" />
//                 Đã làm
//               </span>
//               <span className="inline-flex items-center gap-2">
//                 <span className="size-3 rounded-full bg-violet-500" />
//                 Đang chọn
//               </span>
//               <span className="inline-flex items-center gap-2">
//                 <span className="size-3 rounded-full bg-slate-300" />
//                 Chưa làm
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* RIGHT: Current question */}
//         <div className="lg:col-span-8">
//           {!current ? (
//             <div className="rounded-2xl border border-slate-200 bg-white p-6">
//               Không có câu hỏi.
//             </div>
//           ) : (
//             <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.15)]">
//               <div className="flex flex-wrap items-start justify-between gap-3">
//                 <div>
//                   <div className="text-sm font-bold text-slate-800">
//                     Câu {currentNo} • {typeLabel(current.LoaiCauHoi)}
//                   </div>
//                   <div className="mt-1 text-xs text-slate-500">
//                     {current.IDCauHoi} • {current.IDBaiHoc}
//                   </div>
//                 </div>

//                 {current.LoaiCauHoi === "nghe" && current.FileNghe_url ? (
//                   <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
//                     🔊 Audio
//                   </span>
//                 ) : null}
//               </div>

//               {/* QUESTION CONTENT (TipTap render đúng underline, xuống dòng, ...) */}
//               <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
//                 {/* <TiptapViewerSafe content={parseTipTap(current.NoiDungCauHoi)} /> */}
//                 <TiptapViewer content={parseTipTap(current.NoiDungCauHoi)} />
//               </div>

//               {/* AUDIO */}
//               {current.LoaiCauHoi === "nghe" && current.FileNghe_url ? (
//                 <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
//                   <div className="mb-2 text-sm font-bold text-slate-700">
//                     Nghe audio
//                   </div>
//                   <audio controls className="w-full">
//                     <source src={current.FileNghe_url} />
//                   </audio>
//                 </div>
//               ) : null}

//               {/* ANSWERS */}
//               <div className="mt-5">
//                 {(current.LoaiCauHoi === "nghe" ||
//                   current.LoaiCauHoi === "tracnghiem") && (
//                   <>
//                     <div className="text-sm font-bold text-slate-800">
//                       Chọn đáp án
//                     </div>

//                     {/* ✅ HIỂN THỊ CHO CẢ NGHE + TRẮC NGHIỆM */}
//                     {current.lua_chon?.length ? (
//                       <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
//                         {current.lua_chon.map((c) => {
//                           const a = answers[current.IDCauHoi];
//                           const checked =
//                             a?.type === "choice" && a.value === c.LuaChonID;

//                           return (
//                             <label
//                               key={c.LuaChonID}
//                               className={[
//                                 "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
//                                 checked
//                                   ? "border-violet-300 bg-violet-50"
//                                   : "border-slate-200 bg-white hover:bg-slate-50",
//                               ].join(" ")}
//                             >
//                               <input
//                                 type="radio"
//                                 name={current.IDCauHoi}
//                                 checked={checked}
//                                 onChange={() => setChoice(current.IDCauHoi, c.LuaChonID)}
//                               />
//                               <div className="text-sm font-semibold text-slate-800">
//                                 {c.NoiDungLuaChon}
//                               </div>
//                             </label>
//                           );
//                         })}
//                       </div>
//                     ) : (
//                       <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
//                         Câu này chưa có lựa chọn.
//                       </div>
//                     )}
//                   </>
//                 )}

//                 {current.LoaiCauHoi === "tuluan" && (
//                   <>
//                     <div className="text-sm font-bold text-slate-800">
//                       Trả lời tự luận
//                     </div>
//                     <textarea
//                       className="mt-2 min-h-36 w-full rounded-2xl border border-slate-200 p-4 text-slate-800 outline-none focus:ring-4 focus:ring-violet-100"
//                       placeholder="Nhập câu trả lời..."
//                       value={
//                         answers[current.IDCauHoi]?.type === "text"
//                           ? answers[current.IDCauHoi].value
//                           : ""
//                       }
//                       onChange={(e) => setText(current.IDCauHoi, e.target.value)}
//                     />
//                   </>
//                 )}
//               </div>

//               {/* NAV BUTTONS */}
//               <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
//                 <button
//                   type="button"
//                   onClick={prev}
//                   disabled={currentIndex === 0}
//                   className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
//                 >
//                   ← Câu trước
//                 </button>

//                 <div className="flex items-center gap-2">
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const ok = window.confirm("Sếp chắc chắn muốn nộp bài không?");
//                       if (ok) void handleSubmit(false);
//                     }}
//                     className="h-11 rounded-xl bg-black px-6 font-semibold text-white hover:opacity-95"
//                   >
//                     Nộp bài
//                   </button>

//                   <button
//                     type="button"
//                     onClick={next}
//                     disabled={currentIndex >= total - 1}
//                     className="h-11 rounded-xl border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
//                   >
//                     Câu sau →
//                   </button>
//                 </div>
//               </div>

//               {/* OPTIONAL: show hint / explanation area (không show đáp án đúng) */}
//               {current.GiaiThich ? (
//                 <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
//                   <span className="font-bold">Gợi ý/giải thích:</span>{" "}
//                   {current.GiaiThich}
//                 </div>
//               ) : null}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
