import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { Input } from "elements";
import { DropdownSelectPortal } from "elements/dropdown/dropdown";
import { TextEditor } from "elements/text-editor/text-editor";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper"; // axios instance có Bearer token
import { http } from "utils/libs/https";
import { SimpleEditor } from "~/components/tiptap-templates/simple/simple-editor";

type CategoryApi = {
  IDChuDe: string;
  TenChuDe: string;
  bai_hoc: any[];
  so_bai_hoc: number;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type FormValues = {
  lesson_name: string;
  topic: string; // IDChuDe
  content: any; // TextEditor output (string | JSONContent | etc)
};

function genLessonId() {
  // tránh trùng: bai_hoc_1700000000000
  return `bai_hoc_${Date.now()}`;
}

export default function CreateLessonPage() {
  const navigate = useNavigate();
  const forms = useForm<FormValues>({
    defaultValues: {
      lesson_name: "",
      topic: "",
      content: null,
    },
    mode: "onSubmit",
  });

  const [topics, setTopics] = useState<CategoryApi[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load topics
  useEffect(() => {
    const fetchTopics = async () => {
      setLoadingTopics(true);
      setErrorMsg(null);
      try {
        const res = await http.get<Paginated<CategoryApi>>(
          "/api/lessons/chu-de/"
        );
        const list = res.data.results ?? [];
        setTopics(list);

        // nếu form chưa chọn topic, set default = topic đầu tiên
        const current = forms.getValues("topic");
        if (!current && list[0]?.IDChuDe) {
          forms.setValue("topic", list[0].IDChuDe, { shouldValidate: true });
        }
      } catch (e: any) {
        setErrorMsg(
          e?.response?.data?.detail ||
            e?.response?.data?.message ||
            e?.message ||
            "Không tải được danh sách chủ đề."
        );
      } finally {
        setLoadingTopics(false);
      }
    };

    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topicOptions = useMemo(
    () =>
      topics.map((t) => ({
        label: t.TenChuDe, // ✅ label = tên chủ đề
        value: t.IDChuDe, // ✅ value = IDChuDe
      })),
    [topics]
  );

  const onSubmit = forms.handleSubmit(async (values) => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        IDBaiHoc: genLessonId(),
        IDChuDe: values.topic,
        TenBaiHoc: values.lesson_name,
        NoiDungBaiHoc:
          typeof values.content === "string"
            ? values.content
            : values.content
              ? JSON.stringify(values.content)
              : "",
        IDCauHoi: null,
      };

      await http.post("/api/lessons/bai-hoc/", payload);

      // ✅ redirect sau khi tạo thành công
      navigate("/teacher/lessons");
    } catch (e: any) {
      const apiErr = e?.response?.data;

      // DRF thường trả dạng { field: ["msg"] }
      const msg =
        apiErr?.TenBaiHoc?.[0] ||
        apiErr?.IDBaiHoc?.[0] ||
        apiErr?.IDChuDe?.[0] ||
        apiErr?.NoiDungBaiHoc?.[0] ||
        apiErr?.detail ||
        apiErr?.message ||
        e?.message ||
        "Tạo bài học thất bại.";

      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading="Tạo bài học mới">
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <form className="grid grid-cols-2 gap-5" onSubmit={onSubmit}>
          <Input
            name="lesson_name"
            rules={{
              required: { value: true, message: "Tên bài học là bắt buộc" },
            }}
            label="Tên bài học"
            placeholder="Nhập tên bài học"
          />

          <DropdownSelectPortal
            name="topic"
            label="Chủ đề"
            placeholder={loadingTopics ? "Đang tải chủ đề..." : "Chọn chủ đề"}
            options={topicOptions}
            menuWidth={320}
            placement="bottom"
            rules={{
              required: { value: true, message: "Vui lòng chọn chủ đề" },
            }}
            disabled={loadingTopics || topicOptions.length === 0}
          />

          <div className="col-span-2">
            {/* <TextEditor
              name="content"
              label="Nội dung bài học"
              placeholder="Nhập nội dung..."
              rules={{
                required: { value: true, message: "Nội dung là bắt buộc" },
              }}
            /> */}
            <SimpleEditor
              name="content"
              label="Nội dung bài học"
              rules={{
                required: { value: true, message: "Nội dung là bắt buộc" },
              }}
            />
          </div>

          <div className="col-span-2">
            <button
              type="submit"
              disabled={submitting || loadingTopics}
              className="py-2 rounded-xl px-4 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0_99] disabled:opacity-60 bg-black w-full"
            >
              {submitting ? "Đang thêm..." : "Thêm bài học"}
            </button>
          </div>
        </form>
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
