export function tiptapToText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(tiptapToText).join("");
  if (typeof node === "object") {
    if (typeof node.text === "string") return node.text;
    if (node.content) return tiptapToText(node.content);
  }
  return "";
}
