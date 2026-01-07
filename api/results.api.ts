// src/api/results.api.ts
import { http } from "utils/libs/https";

export type PaginatedRes<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type ResultItem = {
  KetQuaID: string;
  DeThiID: string;
  HocVienID: string;
  LichThiID: string;
  ThoiGianBatDau?: string;
  ThoiGianNopBai?: string;
  DiemSo?: number;
  // ... các field khác nếu cần
};

/**
 * ✅ Fetch ALL results qua pagination (dựa trên "next").
 * - baseUrl: "/api/results/ket-qua/"
 * - nếu BE có page_size: truyền params { page_size: 200 } để giảm số lần gọi.
 */
export async function fetchAllResults(params?: Record<string, any>) {
  const all: ResultItem[] = [];

  // gọi trang 1
  let res = await http.get<PaginatedRes<ResultItem>>("/api/results/ket-qua/", {
    params: { ...params },
  });
  all.push(...(res.data?.results ?? []));

  // nếu có next thì cứ fetch theo next URL
  // http của sếp thường dùng axios, nên get(url) ok nếu url tuyệt đối.
  // nếu next trả về url tuyệt đối, axios vẫn ok.
  let next = res.data?.next;

  while (next) {
    const nextRes = await http.get<PaginatedRes<ResultItem>>(next);
    all.push(...(nextRes.data?.results ?? []));
    next = nextRes.data?.next;
  }

  return all;
}

/** ✅ Đếm lượt làm theo LichThiID */
export async function countAttemptsByScheduleId(lichThiId: string) {
  const all = await fetchAllResults({
    // nếu BE hỗ trợ page_size thì bật:
    // page_size: 200,
  });

  return all.filter((x) => x.LichThiID === lichThiId).length;
}
