const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function getAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

function isValidTaskId(taskId) {
  const text = String(taskId || "").trim();
  return Boolean(text) && text !== "undefined" && text !== "null";
}

function mapApiError(status, detail, fallbackMessage) {
  const text = String(detail || "");

  if (status === 404) {
    if (text.includes("original image missing")) {
      return "任务不存在或原图已被删除，请重新上传";
    }
    return "任务不存在，请重新上传";
  }

  if (text.includes("Cannot load image") || text.includes("Cannot decode image")) {
    return "图片无法读取，请换一张图片";
  }

  if (text.includes("OCR") && text.includes("依赖")) {
    return "当前未安装 OCR 引擎，请先安装本地 OCR 依赖";
  }

  return detail || fallbackMessage;
}

async function parseError(response, fallbackMessage) {
  const error = await response.json().catch(() => null);
  return mapApiError(response.status, error?.detail, fallbackMessage);
}

async function requestJson(path, options = {}, fallbackMessage = "请求失败，请稍后再试。") {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error("无法连接后端服务，请确认服务是否启动");
  }

  if (!response.ok) {
    throw new Error(await parseError(response, fallbackMessage));
  }

  return response.json();
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson(
    "/api/upload",
    {
      method: "POST",
      body: formData,
    },
    "上传失败，请确认图片格式为 JPG、JPEG 或 PNG。",
  );
}

export async function vectorizeImage(taskId, options) {
  const body = { options };
  console.log("vectorize options:", JSON.stringify(body));
  return requestJson(
    `/api/vectorize/${taskId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    "生成 SVG 失败，请检查图片是否清晰，或调整参数后重试。",
  );
}

export async function runOcr(taskId, options) {
  if (!isValidTaskId(taskId)) {
    throw new Error("当前没有有效任务，请先上传图片");
  }
  console.log("OCR task_id:", taskId);
  console.log("OCR request url:", `/api/ocr/${taskId}`);
  return requestJson(
    `/api/ocr/${taskId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ options }),
    },
    "文字识别失败，请检查图片是否清晰。",
  );
}

export async function generateOcrLayout(taskId, items, options) {
  if (!isValidTaskId(taskId)) {
    throw new Error("当前没有有效任务，请先上传图片");
  }
  return requestJson(
    `/api/ocr-layout/${taskId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items, options }),
    },
    "生成文字排版 SVG 失败，请检查 OCR 文本框。",
  );
}

export async function listTasks(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return requestJson(`/api/tasks${query ? `?${query}` : ""}`, {}, "读取历史记录失败，请稍后再试。");
}

export async function getTask(taskId) {
  return requestJson(`/api/tasks/${taskId}`, {}, "任务不存在，请重新上传");
}

export async function deleteTask(taskId) {
  return requestJson(
    `/api/tasks/${taskId}`,
    {
      method: "DELETE",
    },
    "删除任务失败，请稍后再试。",
  );
}

export async function downloadSvg(fileUrl) {
  let response;
  try {
    response = await fetch(getAssetUrl(fileUrl), { cache: "no-store" });
  } catch {
    throw new Error("无法连接后端服务，请确认服务是否启动");
  }

  if (!response.ok) {
    throw new Error(await parseError(response, "下载文件失败，请重新生成后再试。"));
  }

  return response.blob();
}
