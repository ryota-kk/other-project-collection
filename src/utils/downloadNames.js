export function getDownloadName(task, kind = "svg") {
  const filenames = task?.download_filenames || {};
  if (filenames[kind]) return filenames[kind];

  const taskId = task?.task_id || "task";
  const rawName = task?.original_filename || task?.filename || "";
  const baseName = rawName.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\x00-\x1f]+/g, "-").trim();

  if (baseName) {
    if (kind === "png") return `${baseName}-preview.png`;
    if (kind === "pdf") return `${baseName}-vectorized.pdf`;
    if (kind === "json") return `${baseName}-result.json`;
    if (kind === "ocr") return `${baseName}-ocr.json`;
    if (kind === "text_layout_svg") return `${baseName}-text-layout.svg`;
    if (kind === "text_layout_pdf") return `${baseName}-text-layout.pdf`;
    return `${baseName}-vectorized.svg`;
  }

  if (kind === "png") return `preview-${taskId}.png`;
  if (kind === "pdf") return `vectorized-${taskId}.pdf`;
  if (kind === "json") return `result-${taskId}.json`;
  if (kind === "ocr") return `ocr-${taskId}.json`;
  if (kind === "text_layout_svg") return `text-layout-${taskId}.svg`;
  if (kind === "text_layout_pdf") return `text-layout-${taskId}.pdf`;
  return `vectorized-${taskId}.svg`;
}
