import { Input } from "elements";
import React, { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { Link } from "react-router";
import { http } from "utils/libs/https";
import { ContentLayoutWrapper } from "~/layouts/admin-layout/items/content-layout-wrapper";

/** =======================
 *  Types
 *  ======================= */
type Config = {
  background_color: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  surface_color: string;
  page_title: string;
  search_placeholder: string;
  font_family: string;
  font_size: number;
};

type LessonApi = {
  IDBaiHoc: string;
  IDChuDe: string;
  IDChuDe_detail: string; // tên chủ đề
  TenBaiHoc: string;
  NoiDungBaiHoc: string;
  IDCauHoi: string | null;
  cau_hoi: any[];
};

type CategoryApi = {
  IDChuDe: string;
  TenChuDe: string;
  bai_hoc: LessonApi[];
  so_bai_hoc: number;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type CategoryUI = {
  id: string; // IDChuDe
  name: string; // TenChuDe
  courses: number; // backend chưa có -> 0
  lessons: number; // so_bai_hoc
};

type LessonUI = {
  id: string; // IDBaiHoc
  title: string; // TenBaiHoc
  code: string; // #IDBaiHoc
  subject: string; // backend chưa có -> "—"
  level: string; // backend chưa có -> "—"
  duration: string; // backend chưa có -> "—"
  exercises: number; // backend chưa có -> cau_hoi.length
  teacher: string; // backend chưa có -> "—"
  students: number; // backend chưa có -> 0
  completion: number; // backend chưa có -> 0
  status: string; // backend chưa có -> "—"
  createdAt: string; // backend chưa có -> "—"
  iconGradient: string;
  raw: LessonApi;
};

type FormValues = {
  TenChuDe: string;
};

const defaultConfig: Config = {
  background_color: "#F8FAFC",
  primary_color: "#F59E0B",
  secondary_color: "#10B981",
  text_color: "#1E293B",
  surface_color: "#FFFFFF",
  page_title: "Quản lý bài học",
  search_placeholder: "Tìm kiếm theo tên bài học, nội dung, mã bài học...",
  font_family: "Inter",
  font_size: 16,
};

/** =======================
 *  Helpers
 *  ======================= */
function slugifyToId(name: string): string {
  const trimmed = name.trim();
  const id = trimmed
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return id;
}

function badgeBySubject(subject: string): string {
  switch (subject) {
    case "Listening":
      return "bg-blue-100 text-blue-700";
    case "Reading":
      return "bg-violet-100 text-violet-700";
    case "Grammar":
      return "bg-emerald-100 text-emerald-700";
    case "Speaking":
      return "bg-orange-100 text-orange-700";
    case "Vocabulary":
      return "bg-cyan-100 text-cyan-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function badgeByLevel(level: string): string {
  switch (level) {
    case "Beginner":
      return "bg-emerald-100 text-emerald-700";
    case "Intermediate":
      return "bg-amber-100 text-amber-700";
    case "Advanced":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function badgeByStatus(status: string): string {
  switch (status) {
    case "Xuất bản":
      return "bg-emerald-100 text-emerald-700";
    case "Nháp":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function pickGradient(seed: string) {
  const gradients = [
    "from-sky-500 to-sky-700",
    "from-violet-500 to-violet-700",
    "from-emerald-500 to-emerald-700",
    "from-red-500 to-red-700",
    "from-amber-500 to-amber-700",
    "from-cyan-500 to-cyan-700",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
}

function mapLessonApiToUI(l: LessonApi): LessonUI {
  return {
    id: l.IDBaiHoc,
    title: l.TenBaiHoc || "(Chưa có tên bài học)",
    code: `#${l.IDBaiHoc}`,
    subject: "—",
    level: "—",
    duration: "—",
    exercises: Array.isArray(l.cau_hoi) ? l.cau_hoi.length : 0,
    teacher: "—",
    students: 0,
    completion: 0,
    status: "—",
    createdAt: "—",
    iconGradient: pickGradient(l.IDBaiHoc),
    raw: l,
  };
}

/** =======================
 *  Page
 *  ======================= */
export default function Lessons() {
  const forms = useForm<FormValues>({
    defaultValues: { TenChuDe: "" },
  });

  const [config, setConfig] = useState<Config>(defaultConfig);

  // server categories (full)
  const [categoriesApi, setCategoriesApi] = useState<CategoryApi[]>([]);
  const [categories, setCategories] = useState<CategoryUI[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // filters
  const [categoryKeyword, setCategoryKeyword] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("Tất cả môn học");
  const [levelFilter, setLevelFilter] = useState<string>("Tất cả cấp độ");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** Apply config to page */
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--page-bg",
      config.background_color
    );
    document.body.style.background = config.background_color;
    document.body.style.fontFamily = `${config.font_family}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    document.body.style.fontSize = `${config.font_size}px`;
  }, [config]);

  /** elementSdk (optional) */
  useEffect(() => {
    const w = window as unknown as {
      elementSdk?: {
        init: (args: {
          defaultConfig: Config;
          onConfigChange: (cfg: Partial<Config>) => void;
          mapToCapabilities: (cfg: Partial<Config>) => unknown;
          mapToEditPanelValues: (cfg: Partial<Config>) => Map<string, unknown>;
        }) => void;
        setConfig: (cfg: Partial<Config>) => void;
      };
    };

    if (!w.elementSdk) return;

    const onConfigChange = (partial: Partial<Config>) => {
      setConfig((prev) => ({ ...prev, ...partial }));
    };

    const mapToCapabilities = (cfg: Partial<Config>) => ({
      recolorables: [
        {
          get: () => cfg.background_color || defaultConfig.background_color,
          set: (value: string) =>
            w.elementSdk?.setConfig({ background_color: value }),
        },
        {
          get: () => cfg.surface_color || defaultConfig.surface_color,
          set: (value: string) =>
            w.elementSdk?.setConfig({ surface_color: value }),
        },
        {
          get: () => cfg.text_color || defaultConfig.text_color,
          set: (value: string) =>
            w.elementSdk?.setConfig({ text_color: value }),
        },
        {
          get: () => cfg.primary_color || defaultConfig.primary_color,
          set: (value: string) =>
            w.elementSdk?.setConfig({ primary_color: value }),
        },
        {
          get: () => cfg.secondary_color || defaultConfig.secondary_color,
          set: (value: string) =>
            w.elementSdk?.setConfig({ secondary_color: value }),
        },
      ],
      borderables: [],
      fontEditable: {
        get: () => cfg.font_family || defaultConfig.font_family,
        set: (value: string) => w.elementSdk?.setConfig({ font_family: value }),
      },
      fontSizeable: {
        get: () => cfg.font_size || defaultConfig.font_size,
        set: (value: number) => w.elementSdk?.setConfig({ font_size: value }),
      },
    });

    const mapToEditPanelValues = (cfg: Partial<Config>) =>
      new Map<string, unknown>([
        ["page_title", cfg.page_title || defaultConfig.page_title],
        [
          "search_placeholder",
          cfg.search_placeholder || defaultConfig.search_placeholder,
        ],
      ]);

    w.elementSdk.init({
      defaultConfig,
      onConfigChange,
      mapToCapabilities,
      mapToEditPanelValues,
    });
  }, []);

  /** API: GET categories (kèm bài học) */
  const fetchCategories = async () => {
    setLoadingCategories(true);
    setErrorMsg(null);
    try {
      const res = await http.get<Paginated<CategoryApi>>(
        "/api/lessons/chu-de/"
      );
      const results = res.data.results ?? [];

      setCategoriesApi(results);

      const mapped: CategoryUI[] = results.map((c) => ({
        id: c.IDChuDe,
        name: c.TenChuDe,
        courses: 0,
        lessons: c.so_bai_hoc ?? 0,
      }));
      setCategories(mapped);

      setActiveCategoryId((prev) => prev ?? mapped[0]?.id ?? null);
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          e?.message ||
          "Không tải được danh sách chủ đề."
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** API: POST category */
  const handleAddCategory = forms.handleSubmit(async (data) => {
    const name = (data.TenChuDe || "").trim();
    if (!name) return;

    const IDChuDe = slugifyToId(name);
    if (!IDChuDe) return;

    if (categories.some((c) => c.id === IDChuDe)) {
      alert("Chủ đề đã tồn tại.");
      return;
    }

    setMutating(true);
    setErrorMsg(null);
    try {
      await http.post("/api/lessons/chu-de/", { IDChuDe, TenChuDe: name });
      forms.reset({ TenChuDe: "" });
      await fetchCategories();
      setActiveCategoryId(IDChuDe);
    } catch (e: any) {
      const apiErr = e?.response?.data;
      const msg =
        apiErr?.TenChuDe?.[0] ||
        apiErr?.IDChuDe?.[0] ||
        apiErr?.detail ||
        apiErr?.message ||
        e?.message ||
        "Thêm chủ đề thất bại.";
      setErrorMsg(msg);
    } finally {
      setMutating(false);
    }
  });

  /** API: PATCH category */
  const handleEditCategory = async (id: string) => {
    const current = categories.find((c) => c.id === id);
    if (!current) return;

    const value = window.prompt("Nhập tên chủ đề mới:", current.name);
    if (!value || !value.trim()) return;

    setMutating(true);
    setErrorMsg(null);
    try {
      await http.patch(`/api/lessons/chu-de/${id}/`, {
        IDChuDe: id,
        TenChuDe: value.trim(),
      });
      await fetchCategories();
    } catch (e: any) {
      const apiErr = e?.response?.data;
      const msg =
        apiErr?.TenChuDe?.[0] ||
        apiErr?.IDChuDe?.[0] ||
        apiErr?.detail ||
        apiErr?.message ||
        e?.message ||
        "Sửa chủ đề thất bại.";
      setErrorMsg(msg);
    } finally {
      setMutating(false);
    }
  };

  /** API: DELETE category */
  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa chủ đề này?")) return;

    setMutating(true);
    setErrorMsg(null);
    try {
      await http.delete(`/api/lessons/chu-de/${id}/`);
      await fetchCategories();

      setActiveCategoryId((prev) => {
        if (prev !== id) return prev;
        const next = categories.filter((c) => c.id !== id)[0]?.id ?? null;
        return next;
      });
    } catch (e: any) {
      const apiErr = e?.response?.data;
      const msg =
        apiErr?.detail ||
        apiErr?.message ||
        e?.message ||
        "Xóa chủ đề thất bại.";
      setErrorMsg(msg);
    } finally {
      setMutating(false);
    }
  };

  /** UI: filter categories */
  const filteredCategories = useMemo(() => {
    const kw = categoryKeyword.trim().toLowerCase();
    if (!kw) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) || c.id.toLowerCase().includes(kw)
    );
  }, [categories, categoryKeyword]);

  /** Active category API (kèm bài học) */
  const activeCategoryApi = useMemo(() => {
    if (!activeCategoryId) return null;
    return categoriesApi.find((c) => c.IDChuDe === activeCategoryId) || null;
  }, [categoriesApi, activeCategoryId]);

  /** Map lessons from API => UI */
  const lessonsInActiveCategory = useMemo<LessonUI[]>(() => {
    const list = activeCategoryApi?.bai_hoc ?? [];
    return list.map(mapLessonApiToUI);
  }, [activeCategoryApi]);

  /** Filter lessons (search/filters UI giữ nguyên; subject/level/status backend chưa có nên sẽ “—”) */
  const filteredLessons = useMemo(() => {
    return lessonsInActiveCategory.filter((l) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.raw.NoiDungBaiHoc || "").toLowerCase().includes(q);

      const matchSubject =
        subjectFilter === "Tất cả môn học" || l.subject === subjectFilter;

      const matchLevel =
        levelFilter === "Tất cả cấp độ" || l.level === levelFilter;

      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
            ? l.status === "Xuất bản"
            : l.status === "Nháp";

      return matchSearch && matchSubject && matchLevel && matchStatus;
    });
  }, [
    lessonsInActiveCategory,
    search,
    subjectFilter,
    levelFilter,
    statusFilter,
  ]);

  return (
    <FormProvider {...forms}>
      <ContentLayoutWrapper heading={config.page_title}>
        {/* Error */}
        {errorMsg ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {errorMsg}
          </div>
        ) : null}

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Tạo và quản lý nội dung học tập cho học viên
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="cursor-not-allowed inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-600 shadow-sm transition hover:border-amber-400 hover:text-amber-600 active:scale-[0.99]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 7C3 6.46957 3.21071 5.96086 3.58579 5.58579C3.96086 5.21071 4.46957 5 5 5H9L11 7H19C19.5304 7 20.0391 7.21071 20.4142 7.58579C20.7893 7.96086 21 8.46957 21 9V18C21 18.5304 20.7893 19.0391 20.4142 19.4142C20.0391 19.7893 19.5304 20 19 20H5C4.46957 20 3.96086 19.7893 3.58579 19.4142C3.21071 19.0391 3 18.5304 3 18V7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              Thư mục
            </button>

            <Link
              to="/teacher/lessons/create-new"
              className="inline-flex h-11 items-center gap-2 rounded-xl px-4 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
              style={{ background: config.primary_color }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5V19M5 12H19"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Tạo bài học mới
            </Link>
          </div>
        </div>

        {/* Filters Card */}
        <div
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]"
          style={{ background: config.surface_color }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-65 flex-1">
              {/* <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span> */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
                placeholder={config.search_placeholder}
                className="w-full outline-none border border-[#e0e0e0] px-4 py-2 rounded-xl placeholder:text-slate-600 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
            </div>

            {/* subject / level (backend chưa có nên hiện lọc UI vẫn giữ) */}
            {/* <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-11 min-w-45 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 shadow-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            >
              <option>Tất cả môn học</option>
              <option>Listening</option>
              <option>Reading</option>
              <option>Grammar</option>
              <option>Speaking</option>
              <option>Vocabulary</option>
            </select> */}
          </div>
        </div>

        {/* Category Card */}
        <div
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_0_0_rgba(143,156,173,0.2)]"
          style={{ background: config.surface_color }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Chủ đề môn học
              </h3>
              <p className="mt-1 text-slate-500">
                Phân nhóm lớn và quản lý nhanh (thêm/sửa/xóa).
              </p>

              <div className="mt-3">
                <input
                  value={categoryKeyword}
                  onChange={(e) => setCategoryKeyword(e.target.value)}
                  placeholder="Tìm chủ đề..."
                  className="outline-none border border-[#e0e0e0] px-4 py-2 rounded-xl placeholder:text-slate-600 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>
            </div>

            <form
              onSubmit={handleAddCategory}
              className="flex flex-wrap items-center gap-2"
            >
              <div className="min-w-70">
                <Input
                  name="TenChuDe"
                  placeholder="Thêm chủ đề mới (VD: Business English)"
                  inputClassName="focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                />
              </div>

              <button
                type="submit"
                disabled={mutating}
                className="h-11 rounded-xl px-4 font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
                style={{ background: config.primary_color }}
              >
                {mutating ? "Đang thêm..." : "Thêm chủ đề"}
              </button>

              <button
                type="button"
                onClick={fetchCategories}
                disabled={loadingCategories || mutating}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
              >
                {loadingCategories ? "Đang tải..." : "Tải lại"}
              </button>
            </form>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => {
              const isActive = cat.id === activeCategoryId;

              return (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveCategoryId(cat.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setActiveCategoryId(cat.id);
                  }}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 transition",
                    "hover:bg-slate-50",
                    isActive
                      ? "border-blue-500 shadow-[0_8px_24px_rgba(37,99,235,0.08)]"
                      : "border-slate-200",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="font-bold text-slate-800">{cat.name}</div>
                    <div className="text-sm text-slate-500">
                      Bài học: {cat.lessons}
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      ID: {cat.id}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditCategory(cat.id);
                      }}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.id);
                      }}
                      className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}

            {!loadingCategories && filteredCategories.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                Không có chủ đề phù hợp.
              </div>
            ) : null}
          </div>
        </div>

        {/* Lesson Card */}
        {!activeCategoryApi ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_4px_0_0_rgba(143,156,173,0.2)]">
            <h3 className="mb-2 text-lg font-bold text-slate-800">
              Chọn một chủ đề
            </h3>
            <p className="text-slate-500">
              Hãy bấm vào một chủ đề ở trên để xem và quản lý các bài học.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-800">
                Danh sách bài học
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {activeCategoryApi.TenChuDe} • {activeCategoryApi.so_bai_hoc}{" "}
                bài
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-separate border-spacing-0">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-sm [&>th]:font-semibold [&>th]:text-slate-700">
                    <th className="w-10">
                      <input type="checkbox" className="cursor-pointer" />
                    </th>
                    <th>Bài học</th>
                    <th>Môn học</th>
                    <th>Cấp độ</th>
                    <th>Thời lượng</th>
                    <th>Bài tập</th>
                    <th>Giáo viên</th>
                    <th>Học viên</th>
                    <th>Hoàn thành</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>

                <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-slate-200">
                  {filteredLessons.map((l) => (
                    <tr key={l.id} className="bg-white hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <input type="checkbox" className="cursor-pointer" />
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={[
                              "flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br",
                              l.iconGradient,
                            ].join(" ")}
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M15.536 11.293L9 4.757V19.243L15.536 12.707C15.9265 12.3165 15.9265 11.6835 15.536 11.293Z"
                                stroke="white"
                                strokeWidth="2"
                              />
                            </svg>
                          </div>

                          <div>
                            <div className="font-semibold text-slate-800">
                              {l.title}
                            </div>
                            <div className="text-sm text-slate-500">
                              {l.code}
                            </div>

                            {/* Hiển thị thêm mô tả (NoiDungBaiHoc) nếu muốn */}
                            {l.raw.NoiDungBaiHoc ? (
                              <div className="mt-1 line-clamp-1 text-sm text-slate-400">
                                {l.raw.NoiDungBaiHoc}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeBySubject(
                            l.subject
                          )}`}
                        >
                          {l.subject}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeByLevel(
                            l.level
                          )}`}
                        >
                          {l.level}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-500">{l.duration}</td>

                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {l.exercises}
                      </td>

                      <td className="px-4 py-4 text-slate-500">{l.teacher}</td>

                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {l.students}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-emerald-600"
                              style={{ width: `${l.completion}%` }}
                            />
                          </div>
                          <span
                            className={[
                              "text-sm font-semibold",
                              l.completion > 0
                                ? "text-emerald-700"
                                : "text-slate-500",
                            ].join(" ")}
                          >
                            {l.completion}%
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeByStatus(
                            l.status
                          )}`}
                        >
                          {l.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-500">
                        {l.createdAt}
                      </td>
                    </tr>
                  ))}

                  {filteredLessons.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Chủ đề này chưa có bài học (hoặc không khớp bộ lọc).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </ContentLayoutWrapper>
    </FormProvider>
  );
}
