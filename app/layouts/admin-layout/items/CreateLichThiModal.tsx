// src/components/modals/CreateLichThiModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "elements/modal/modal";
import { http } from "utils/libs/https";
import { cn } from "utils/helpers/class-name";

type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// ===== Types tối thiểu =====
type LopHocItem = {
  IDLopHoc: string;
  TenLopHoc: string;
};

type LuaChon = {
  LuaChonID: string;
  NoiDungLuaChon: string;
  DapAnDung: boolean;
};

type CauHoiDetail = {
  IDCauHoi: string;
  LoaiCauHoi: string;
  NoiDungCauHoi: string; // JSON string
  lua_chon: LuaChon[];
  tu_sap_xep: any[];
  cap_tu_khop: any[];
};

type DeThiChiTiet = {
  IDCauHoi: string;
  ThuTuCauHoi: number;
  IDCauHoi_detail: CauHoiDetail;
};

type DeThiItem = {
  IDDeThi: string;
  TenDeThi: string;
  ThoiGianLamBaiThi: string;
  so_cau_hoi: number;
  chi_tiet: DeThiChiTiet[];
};

type CreateLichThiPayload = {
  IDDeThi: string;
  IDLopHoc: string;
  ThoiGianBatDau: string; // ISO string
  ThoiGianKetThuc: string; // ISO string
  // ✅ optional: danh sách câu hỏi được chọn (nếu BE chưa dùng thì cũng không sao)
  SelectedQuestionIds?: string[];
};

function safeParseTipTapText(jsonStr: string): string {
  try {
    const obj = JSON.parse(jsonStr);
    // lấy text thô đơn giản
    const content = obj?.content ?? [];
    const texts: string[] = [];

    const walk = (node: any) => {
      if (!node) return;
      if (node.type === "text" && typeof node.text === "string") texts.push(node.text);
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };

    content.forEach(walk);
    return texts.join(" ").trim() || "(Không có nội dung text)";
  } catch {
    return "(Không đọc được nội dung câu hỏi)";
  }
}

export const CreateLichThiModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated?: (created: { IDLichThi: string }) => void;
}> = ({ open, onClose, onCreated }) => {
  const [loading, setLoading] = useState(false);

  const [lopHocs, setLopHocs] = useState<LopHocItem[]>([]);
  const [deThis, setDeThis] = useState<DeThiItem[]>([]);

  const [IDLopHoc, setIDLopHoc] = useState("");
  const [IDDeThi, setIDDeThi] = useState("");
  const [ThoiGianBatDau, setThoiGianBatDau] = useState("");
  const [ThoiGianKetThuc, setThoiGianKetThuc] = useState("");

  // ✅ câu hỏi được chọn
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const selectedDeThi = useMemo(() => {
    return deThis.find((d) => d.IDDeThi === IDDeThi) ?? null;
  }, [deThis, IDDeThi]);

  // Khi đổi đề thi → mặc định chọn hết câu hỏi
  useEffect(() => {
    if (!selectedDeThi) {
      setSelectedQuestionIds([]);
      return;
    }
    const ids = (selectedDeThi.chi_tiet ?? []).map((x) => x.IDCauHoi);
    setSelectedQuestionIds(ids);
  }, [selectedDeThi]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        // ✅ Sếp đổi endpoint theo hệ thống của sếp
        // Ví dụ:
        // - GET /api/classes/
        // - GET /api/tests/
        const [lopRes, deRes] = await Promise.all([
          http.get<PaginatedRes<LopHocItem>>("/api/classes/", { params: { page_size: 200 } }),
          http.get<PaginatedRes<DeThiItem>>("/api/tests/", { params: { page_size: 200 } }),
        ]);

        setLopHocs(lopRes.data?.results ?? []);
        setDeThis(deRes.data?.results ?? []);
      } catch (e) {
        // tuỳ dự án sếp
        console.error(e);
      }
    })();
  }, [open]);

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const selectAll = () => {
    if (!selectedDeThi) return;
    setSelectedQuestionIds(selectedDeThi.chi_tiet.map((x) => x.IDCauHoi));
  };

  const clearAll = () => setSelectedQuestionIds([]);

  const submit = async () => {
    if (!IDLopHoc || !IDDeThi || !ThoiGianBatDau || !ThoiGianKetThuc) {
      alert("Vui lòng nhập đủ thông tin lịch thi.");
      return;
    }
    if (selectedQuestionIds.length === 0) {
      alert("Sếp phải chọn ít nhất 1 câu hỏi.");
      return;
    }

    setLoading(true);
    try {
      const payload: CreateLichThiPayload = {
        IDDeThi,
        IDLopHoc,
        ThoiGianBatDau,
        ThoiGianKetThuc,
        SelectedQuestionIds: selectedQuestionIds,
      };

      // ✅ Endpoint tạo lịch thi (sếp đổi đúng theo BE)
      const res = await http.post<{ IDLichThi: string }>("/api/lich-thi/", payload);

      onCreated?.({ IDLichThi: res.data?.IDLichThi });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Tạo lịch thi thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[920px] max-w-[95vw] rounded-2xl bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Tạo lịch thi</h3>
            <p className="mt-1 text-sm text-slate-500">
              Chọn lớp, đề thi, thời gian, và tick chọn câu hỏi muốn áp dụng.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Lớp học</label>
            <select
              value={IDLopHoc}
              onChange={(e) => setIDLopHoc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn lớp --</option>
              {lopHocs.map((l) => (
                <option key={l.IDLopHoc} value={l.IDLopHoc}>
                  {l.TenLopHoc} ({l.IDLopHoc})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Đề thi</label>
            <select
              value={IDDeThi}
              onChange={(e) => setIDDeThi(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn đề thi --</option>
              {deThis.map((d) => (
                <option key={d.IDDeThi} value={d.IDDeThi}>
                  {d.TenDeThi} ({d.so_cau_hoi} câu)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              value={ThoiGianBatDau}
              onChange={(e) => setThoiGianBatDau(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Thời gian kết thúc</label>
            <input
              type="datetime-local"
              value={ThoiGianKetThuc}
              onChange={(e) => setThoiGianKetThuc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* ✅ Danh sách câu hỏi */}
        <div className="mt-5 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
            <div>
              <div className="text-sm font-semibold">Lựa chọn câu hỏi</div>
              <div className="text-xs text-slate-500">
                Đã chọn: <b>{selectedQuestionIds.length}</b>
                {selectedDeThi ? ` / ${selectedDeThi.chi_tiet.length}` : ""}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                disabled={!selectedDeThi}
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                disabled={!selectedDeThi}
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-3">
            {!selectedDeThi ? (
              <div className="text-sm text-slate-500">Chọn đề thi để xem danh sách câu hỏi.</div>
            ) : (
              <div className="space-y-2">
                {selectedDeThi.chi_tiet
                  .slice()
                  .sort((a, b) => a.ThuTuCauHoi - b.ThuTuCauHoi)
                  .map((q) => {
                    const id = q.IDCauHoi;
                    const checked = selectedQuestionIds.includes(id);
                    const qDetail = q.IDCauHoi_detail;

                    const title = safeParseTipTapText(qDetail.NoiDungCauHoi);
                    const type = qDetail.LoaiCauHoi;

                    return (
                      <label
                        key={id}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-xl border px-3 py-2",
                          checked ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleQuestion(id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">
                              Câu {q.ThuTuCauHoi}: <span className="font-normal">{title}</span>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {type}
                            </span>
                          </div>

                          {type === "tracnghiem" && (qDetail.lua_chon?.length ?? 0) > 0 && (
                            <div className="mt-2 grid gap-1 text-xs text-slate-600">
                              {qDetail.lua_chon.slice(0, 4).map((lc) => (
                                <div key={lc.LuaChonID} className="truncate">
                                  • {lc.NoiDungLuaChon}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Huỷ
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Đang tạo..." : "Tạo lịch thi"}
          </button>
        </div>
      </div>
    </Modal>
  );
};
