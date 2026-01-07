// src/components/modals/AttemptsSummaryModal.tsx
import React from "react";
import { Modal } from "elements/modal/modal";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  attempts?: number;
};

export const AttemptsSummaryModal: React.FC<Props> = ({
  open,
  onClose,
  title = "Tạo lịch thi thành công",
  message = "Đã tạo lịch thi. Dưới đây là thống kê lượt làm hiện tại:",
  attempts = 0,
}) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[520px] max-w-[92vw] rounded-2xl bg-white p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm text-slate-600">Số lượt làm (attempts)</div>
          <div className="mt-1 text-3xl font-bold">{attempts}</div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
