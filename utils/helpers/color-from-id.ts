// utils/helpers/color-from-id.ts
export function colorFromId(id: string) {
  const palette = [
    "#7C3AED",
    "#2563EB",
    "#F59E0B",
    "#0EA5E9",
    "#10B981",
    "#EC4899",
    "#F97316",
    "#6366F1",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}
