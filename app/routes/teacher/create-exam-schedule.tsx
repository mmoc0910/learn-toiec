import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";
import { createExamSchedule, getClassesForSelect, getExamsForSelect, type ClassItem, type ExamItem } from "api/exam-schedules";


type FormValues = {
  exam_id: string; // IDDeThi
  class_id: string; // IDLopHoc
  start_time: string; // datetime-local (string)
  end_time: string; // datetime-local (string)
};

function genScheduleId() {
  return `lich_thi_${Date.now()}`;
}

function toISO(datetimeLocal: string) {
  // datetime-local thường dạng: "2025-12-27T14:30"
  // new Date(...) sẽ parse theo timezone local của máy người dùng
  const d = new Date(datetimeLocal);
  return d.toISOString();
}

export default function CreateExamSchedulePage() {
  const navigate = useNavigate();

  const forms = useForm<FormValues>({
    defaultValues: {
      exam_id: "",
      class_id: "",
      start_time: "",
      end_time: "",
    },
    mode: "onSubmit",
  });

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load exams
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      setErrorMsg(null);
      try {
        const res = await getExamsForSelect();
        const list = res.results ?? [];
        setExams(list);

        const current = forms.getValues("exam_id");
        if (!current && list[0]?.IDDeThi) {
          forms.setValue("exam_id", list[0].IDDeThi, { shouldValidate: true });
        }
      } catch (e: any) {
        setErrorMsg(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Không tải được danh sách đề thi."
        );
      } finally {
        setLoadingExams(false);
      }
    };

    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load classes
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setErrorMsg(null);
      try {
        // TODO: nếu endpoint lớp học khác, đổi tại đây:
        // const res = await getClassesForSelect("/api/classes/lop-hoc/");
        const res = await getClassesForSelect();
        const list = res.results ?? [];
        setClasses(list);

        const current = forms.getValues("class_id");
        if (!current && list[0]?.IDLopHoc) {
          forms.setValue("class_id", list[0].IDLopHoc, {
            shouldValidate: true,
          });
        }
      } catch (e: any) {
        setErrorMsg(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Không tải được danh sách lớp học."
        );
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const examOptions = useMemo(
    () =>
      exams.map((x) => ({
        label: x.TenDeThi ?? x.IDDeThi,
        value: x.IDDeThi,
      })),
    [exams]
  );

  const classOptions = useMemo(
    () =>
      classes.map((x) => ({
        label: x.TenLopHoc ?? x.IDLopHoc,
        value: x.IDLopHoc,
      })),
    [classes]
  );

  const onSubmit = forms.handleSubmit(async (values) => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      // validate nhanh: end > start
      const startMs = new Date(values.start_time).getTime();
      const endMs = new Date(values.end_time).getTime();
      if (!values.start_time || !values.end_time) {
        throw new Error("Vui lòng chọn thời gian bắt đầu và kết thúc.");
      }
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        throw new Error("Thời gian không hợp lệ.");
      }
      if (endMs <= startMs) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      }

      const payload = {
        IDLichThi: genScheduleId(),
        IDDeThi: values.exam_id,
        IDLopHoc: values.class_id,
        ThoiGianBatDau: toISO(values.start_time),
        ThoiGianKetThuc: toISO(values.end_time),
      };

      await createExamSchedule(payload);

      // ✅ redirect sau khi tạo thành công (sếp đổi route theo project)
      navigate("/teacher/exam-schedule");
    } catch (e: any) {
      const apiErr = e?.response?.data;

      const msg =
        apiErr?.IDLichThi?.[0] ||
        apiErr?.IDDeThi?.[0] ||
        apiErr?.IDLopHoc?.[0] ||
        apiErr?.ThoiGianBatDau?.[0] ||
        apiErr?.ThoiGianKetThuc?.[0] ||
        apiErr?.detail ||
        apiErr?.message ||
        e?.message ||
        "Tạo lịch thi thất bại.";

      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Tạo lịch thi">
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <form className="grid grid-cols-2 gap-5" onSubmit={onSubmit}>
          <DropdownSelectPortal
            name="exam_id"
            label="Đề thi"
            placeholder={loadingExams ? "Đang tải đề thi..." : "Chọn đề thi"}
            options={examOptions}
            menuWidth={320}
            placement="bottom"
            rules={{
              required: { value: true, message: "Vui lòng chọn đề thi" },
            }}
            disabled={loadingExams || examOptions.length === 0}
          />

          <DropdownSelectPortal
            name="class_id"
            label="Lớp học"
            placeholder={
              loadingClasses ? "Đang tải lớp học..." : "Chọn lớp học"
            }
            options={classOptions}
            menuWidth={320}
            placement="bottom"
            rules={{
              required: { value: true, message: "Vui lòng chọn lớp học" },
            }}
            disabled={loadingClasses || classOptions.length === 0}
          />

          {/* datetime-local: dùng Input của project (như CreateLessonPage) */}
          <Input
            name="start_time"
            label="Thời gian bắt đầu"
            type="datetime-local"
            rules={{
              required: {
                value: true,
                message: "Vui lòng chọn thời gian bắt đầu",
              },
            }}
          />

          <Input
            name="end_time"
            label="Thời gian kết thúc"
            type="datetime-local"
            rules={{
              required: {
                value: true,
                message: "Vui lòng chọn thời gian kết thúc",
              },
            }}
          />

          <div className="col-span-2">
            <button
              type="submit"
              disabled={submitting || loadingExams || loadingClasses}
              className="py-2 rounded-xl px-4 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0_99] disabled:opacity-60 bg-black w-full"
            >
              {submitting ? "Đang tạo..." : "Tạo lịch thi"}
            </button>
          </div>
        </form>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
