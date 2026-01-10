import jsPDF from "jspdf";

let loadingPromise: Promise<void> | null = null;

// ✅ cache base64 (load 1 lần)
let regularB64: string | null = null;
let boldB64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function loadFontFilesOnce() {
  if (regularB64) return;

  // ===== Regular =====
  const regularPath = "/fonts/Roboto_Condensed-Regular.ttf";
  const regularRes = await fetch(regularPath);
  if (!regularRes.ok) {
    throw new Error(`Không load được font: ${regularPath}`);
  }
  const regularBuf = await regularRes.arrayBuffer();
  regularB64 = arrayBufferToBase64(regularBuf);

  // ===== Bold =====
  const boldPath = "/fonts/Roboto_Condensed-Bold.ttf";
  const boldRes = await fetch(boldPath);
  if (!boldRes.ok) {
    // bold có thể không bắt buộc
    console.warn(`Không load được font bold: ${boldPath}`);
    boldB64 = null;
  } else {
    const boldBuf = await boldRes.arrayBuffer();
    boldB64 = arrayBufferToBase64(boldBuf);
  }
}

function isFontRegistered(doc: jsPDF, fontName: string) {
  try {
    const list = (doc as any).getFontList?.();
    return !!list?.[fontName];
  } catch {
    return false;
  }
}

/**
 * ✅ FIX: mỗi doc PDF mới đều phải register font vào doc
 * - Load font file 1 lần (cache base64)
 * - Nhưng addFileToVFS/addFont cho từng doc nếu doc chưa có font
 */
export async function ensureVietnameseFont(doc: jsPDF) {
  if (!loadingPromise) {
    loadingPromise = loadFontFilesOnce();
  }
  await loadingPromise;

  // ✅ nếu doc này đã có font rồi thì khỏi add lại
  if (!isFontRegistered(doc, "RobotoCondensed")) {
    if (!regularB64) throw new Error("Font Regular chưa load được.");

    doc.addFileToVFS("Roboto_Condensed-Regular.ttf", regularB64);
    doc.addFont("Roboto_Condensed-Regular.ttf", "RobotoCondensed", "normal");

    if (boldB64) {
      doc.addFileToVFS("Roboto_Condensed-Bold.ttf", boldB64);
      doc.addFont("Roboto_Condensed-Bold.ttf", "RobotoCondensed", "bold");
    }
  }

  // ✅ set mặc định
  doc.setFont("RobotoCondensed", "normal");
}
