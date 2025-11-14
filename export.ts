import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";

type ExportTarget = {
  inputHtml: string;
  outputPdf: string;
};

const targets: ExportTarget[] = [
  { inputHtml: "en.html", outputPdf: "pdf/cv_en_howznguyen.pdf" },
  { inputHtml: "vi.html", outputPdf: "pdf/cv_vi_howznguyen.pdf" },
];

async function ensureDirectory(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function exportHtmlToPdf(
  { inputHtml, outputPdf }: ExportTarget,
): Promise<string> {
  const rootDir = process.cwd();
  const inputPath = path.resolve(rootDir, inputHtml);
  const outputPath = path.resolve(rootDir, outputPdf);

  if (!existsSync(inputPath)) {
    throw new Error(`Không tìm thấy file HTML: ${inputPath}`);
  }

  await ensureDirectory(path.dirname(outputPath));

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-crash-reporter",
      "--disable-crashpad",
      "--disable-breakpad",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754 });
    await page.goto(`file://${inputPath}`, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    await page.pdf({
      path: outputPath,
      printBackground: true,
      format: "A4",
      pageRanges: "1-3",
      margin: {
        top: "0mm",
        bottom: "0mm",
        left: "0mm",
        right: "0mm",
      },
    });

    console.log(`Đã xuất ${inputHtml} -> ${outputPdf}`);
    return outputPath;
  } finally {
    await browser.close();
  }
}

async function mergePdfFiles(pdfPaths: string[], outputPdf: string) {
  if (pdfPaths.length === 0) {
    return;
  }

  await ensureDirectory(path.dirname(outputPdf));

  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    if (!existsSync(pdfPath)) {
      throw new Error(`Không thể gộp. Thiếu file: ${pdfPath}`);
    }

    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(
      pdfDoc,
      pdfDoc.getPageIndices(),
    );
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  await writeFile(outputPdf, mergedBytes);
  console.log(`Đã gộp PDF -> ${outputPdf}`);
}

async function main() {
  const generatedPaths: string[] = [];

  for (const target of targets) {
    const pdfPath = await exportHtmlToPdf(target);
    generatedPaths.push(pdfPath);
  }

  const combinedOutput = path.resolve(
    process.cwd(),
    "pdf/cv_en_vi_howznguyen.pdf",
  );
  await mergePdfFiles(generatedPaths, combinedOutput);
}

main().catch((err) => {
  console.error("Xuất PDF thất bại:", err);
  process.exit(1);
});
