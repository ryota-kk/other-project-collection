import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { showcaseProjects as projectData } from "../src/pages/showcaseProjects.js";

const root = resolve(import.meta.dirname, "..");

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function assertIncludes(content, expected, description) {
  if (!content.includes(expected)) {
    throw new Error(`Missing ${description}: ${expected}`);
  }
}

function assertNotIncludes(content, unexpected, description) {
  if (content.includes(unexpected)) {
    throw new Error(`Unexpected ${description}: ${unexpected}`);
  }
}

const app = read("src/App.jsx");
const personalHomePage = read("src/pages/PersonalHomePage.jsx");
const showcaseProjects = read("src/pages/showcaseProjects.js");
const homePage = read("src/pages/HomePage.jsx");
const historyPage = read("src/pages/HistoryPage.jsx");
const resultPage = read("src/pages/ResultPage.jsx");
const parameterPanel = read("src/components/ParameterPanel.jsx");
const client = read("src/api/client.js");

assertIncludes(app, "/history", "history route");
assertIncludes(app, "/result/", "result route");
assertIncludes(app, "/vector", "vector route");
assertIncludes(app, "PersonalHomePage", "personal home page route");

assertIncludes(personalHomePage, "其他项目", "selected work title");
assertIncludes(personalHomePage, "onClick={onOpenVector}", "vector tool entry");
assertIncludes(personalHomePage, "showcaseProjects.map", "project list rendering");
assertIncludes(personalHomePage, "rel=\"noopener noreferrer\"", "safe external project links");
for (const id of ["visual-draft-editor", "bitmap-to-vector", "esports-data-platform"]) {
  assertIncludes(showcaseProjects, `id: "${id}"`, `${id} project`);
}
assertNotIncludes(showcaseProjects, "皇帝电竞", "private client brand");
for (const project of projectData) {
  if (!project.image.startsWith("/projects/")) throw new Error(`Invalid project image path: ${project.image}`);
  if (!existsSync(resolve(root, "public", project.image.slice(1)))) {
    throw new Error(`Missing project image: ${project.image}`);
  }
}

assertIncludes(homePage, "上传图片转 SVG", "vector upload page title");
assertIncludes(homePage, "uploadImage", "upload API still used");
assertIncludes(homePage, "历史记录", "history entry on vector page");

assertIncludes(historyPage, "original_filename", "history filename display");
assertIncludes(historyPage, "created_at", "created time");
assertIncludes(historyPage, "updated_at", "updated time");
assertIncludes(historyPage, "getModeLabel(task.mode)", "history mode display");
assertIncludes(historyPage, "warnings_count", "warnings count");
assertIncludes(historyPage, "onOpenTask", "open result action");
assertIncludes(historyPage, "handleDownload(task, \"svg\")", "history SVG download");
assertIncludes(historyPage, "handleDownload(task, \"pdf\")", "history PDF download");
assertIncludes(historyPage, "handleDownload(task, \"png\")", "history PNG download");
assertIncludes(historyPage, "window.confirm", "delete confirmation");
assertNotIncludes(historyPage, "customer_name", "customer field");
assertNotIncludes(historyPage, "order_no", "order field");
assertNotIncludes(historyPage, "manual_status", "manual status field");

assertIncludes(resultPage, "getTask", "load result by task id");
assertIncludes(resultPage, "stats-row", "stats row");
assertIncludes(resultPage, "image_analysis", "image analysis");
assertIncludes(resultPage, "图片提示", "simple image hint");
assertIncludes(resultPage, "请人工检查结果", "simple manual check hint");
assertIncludes(resultPage, "getModeLabel", "mode label");
assertIncludes(resultPage, "setCacheKey(Date.now())", "cache busting");
assertIncludes(resultPage, "?t=${cacheKey}", "timestamped preview URL");
assertIncludes(resultPage, "print_settings", "print settings response");
assertIncludes(resultPage, "getDownloadName", "download filenames");
assertIncludes(resultPage, "文字识别与重排", "OCR section");
assertIncludes(resultPage, "runOcr", "OCR API call");
assertIncludes(resultPage, "generateOcrLayout", "OCR layout API call");
assertIncludes(resultPage, "text_layout_svg_url", "text layout URL state");
assertIncludes(resultPage, "addOcrItem", "manual OCR item add action");
assertIncludes(resultPage, "deleteOcrItem", "manual OCR item delete action");
assertIncludes(resultPage, "isValidTaskId", "valid task id guard");
assertIncludes(resultPage, "当前没有有效任务，请先上传图片", "empty OCR task message");
assertIncludes(resultPage, "console.log(\"OCR task_id:\", currentTaskId)", "OCR task id debug log");
assertIncludes(resultPage, "下载文字 SVG", "text layout SVG download");
assertIncludes(resultPage, "下载文字 PDF", "text layout PDF download");
assertNotIncludes(resultPage, "刀模线 CutContour", "cutline UI");
assertNotIncludes(resultPage, "generateCutline", "cutline UI API call");
assertNotIncludes(resultPage, "下载 cutline.svg", "cutline download UI");
assertNotIncludes(resultPage, "recommended_mode", "recommended mode UI");
assertNotIncludes(resultPage, "color_analysis", "color analysis UI");
assertNotIncludes(resultPage, "应用推荐参数", "recommended options action");
assertNotIncludes(resultPage, "customer_name", "customer field");
assertNotIncludes(resultPage, "order_no", "order field");
assertNotIncludes(resultPage, "manual_status", "manual status field");
assertNotIncludes(resultPage, "updateTask", "task metadata update API");

assertIncludes(parameterPanel, "mode", "mode option");
assertIncludes(parameterPanel, "logo_bw", "black and white mode");
assertIncludes(parameterPanel, "color_flat", "color flat mode");
assertIncludes(parameterPanel, "threshold", "threshold option");
assertIncludes(parameterPanel, "color_count", "color count option");
assertIncludes(parameterPanel, "color_tolerance", "color tolerance option");
assertIncludes(parameterPanel, "remove_background", "remove background option");
assertIncludes(parameterPanel, "min_area", "min area option");
assertIncludes(parameterPanel, "smooth", "smooth option");
assertIncludes(parameterPanel, "auto_crop", "auto crop option");
assertIncludes(parameterPanel, "denoise", "denoise option");
assertIncludes(parameterPanel, "invert", "invert option");
assertNotIncludes(parameterPanel, "colorPresets", "color presets");
assertNotIncludes(parameterPanel, "参数预设", "preset selector");
assertNotIncludes(parameterPanel, "upscale_factor", "upscale option");
assertIncludes(parameterPanel, "output_unit", "output unit option");
assertIncludes(parameterPanel, "output_width_mm", "output width option");
assertIncludes(parameterPanel, "output_height_mm", "output height option");
assertIncludes(parameterPanel, "dpi", "dpi option");
assertIncludes(parameterPanel, "preserve_aspect_ratio", "preserve aspect ratio option");
assertIncludes(parameterPanel, "canvas_padding_mm", "canvas padding option");
assertIncludes(parameterPanel, "background", "background option");

assertIncludes(client, "POST", "vectorize POST request");
assertIncludes(client, "/api/vectorize/${taskId}", "vectorize endpoint");
assertIncludes(client, "/api/ocr/${taskId}", "OCR endpoint");
assertIncludes(client, "/api/ocr-layout/${taskId}", "OCR layout endpoint");
assertIncludes(client, "console.log(\"OCR request url:\", `/api/ocr/${taskId}`)", "OCR request debug log");
assertIncludes(client, "当前没有有效任务，请先上传图片", "OCR empty task guard");
assertIncludes(client, "const body = { options }", "options request body");
assertIncludes(client, "JSON.stringify(body)", "serialized options body");
assertIncludes(client, "console.log(\"vectorize options:\", JSON.stringify(body))", "vectorize options debug log");
assertIncludes(client, "/api/tasks", "tasks endpoint");
assertIncludes(client, "DELETE", "delete task request");
assertNotIncludes(client, "PATCH", "patch task request");
assertNotIncludes(client, "updateTask", "metadata update client");

console.log("Result, history, and color mode UI verification passed.");
