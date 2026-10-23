import { downloadSvg } from "../api/client";

export async function downloadFile(url, filename, cacheKey = Date.now()) {
  if (!url) return;

  const blob = await downloadSvg(`${url}?t=${cacheKey}`);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
