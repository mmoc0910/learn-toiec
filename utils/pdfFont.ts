// utils/pdfFont.ts
import jsPDF from "jspdf";

let fontLoaded = false;
let loadingPromise: Promise<void> | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Load Roboto Condensed (Regular/Bold) from /public/fonts and register into jsPDF (VFS).
 * Call this before doc.text / autoTable to avoid Vietnamese font issues.
 */
export async function ensureVietnameseFont(doc: jsPDF) {
  if (fontLoaded) {
    // ✅ đảm bảo doc đang dùng đúng font
    doc.setFont("RobotoCondensed", "normal");
    return;
  }

  if (!loadingPromise) {
    loadingPromise = (async () => {
      // ===== Regular =====
      const regularPath = "/fonts/Roboto_Condensed-Regular.ttf";
      const regularRes = await fetch(regularPath);
      if (!regularRes.ok) {
        throw new Error(`Không load được font: ${regularPath}`);
      }
      const regularBuf = await regularRes.arrayBuffer();
      const regularB64 = arrayBufferToBase64(regularBuf);

      doc.addFileToVFS("Roboto_Condensed-Regular.ttf", regularB64);
      doc.addFont("Roboto_Condensed-Regular.ttf", "RobotoCondensed", "normal");

      // ===== Bold =====
      const boldPath = "/fonts/Roboto_Condensed-Bold.ttf";
      const boldRes = await fetch(boldPath);
      if (!boldRes.ok) {
        console.warn(`Không load được font bold: ${boldPath}`);
      } else {
        const boldBuf = await boldRes.arrayBuffer();
        const boldB64 = arrayBufferToBase64(boldBuf);

        doc.addFileToVFS("Roboto_Condensed-Bold.ttf", boldB64);
        doc.addFont("Roboto_Condensed-Bold.ttf", "RobotoCondensed", "bold");
      }

      fontLoaded = true;

      // ✅ set mặc định
      doc.setFont("RobotoCondensed", "normal");
    })();
  }

  await loadingPromise;
  doc.setFont("RobotoCondensed", "normal");
}
