import { useEffect, useMemo, useState } from "react";

import { generateOcrLayout, getAssetUrl, getTask, runOcr, vectorizeImage } from "../api/client";
import ParameterPanel from "../components/ParameterPanel";
import { downloadFile } from "../utils/downloadFile";
import { getDownloadName } from "../utils/downloadNames";

const defaultParams = {
  auto_crop: true,
  grayscale: false,
  threshold: 128,
  denoise: true,
  min_area: 8,
  invert: false,
  smooth: 1.0,
  mode: "logo_bw",
  use_ocr_enhancement: false,
  color_count: 6,
  color_tolerance: 24,
  remove_background: true,
  background_color: "auto",
  output_unit: "px",
  output_width_mm: null,
  output_height_mm: null,
  dpi: 300,
  preserve_aspect_ratio: true,
  canvas_padding_mm: 0,
  background: "transparent",
};

function getStatusLabel(status) {
  const labels = {
    idle: "未生成",
    loading: "读取中",
    generating: "生成中",
    success: "成功",
    partial: "尚未生成",
    error: "失败",
  };
  return labels[status] || status;
}

function normalizeSuggestedOptions(options = {}) {
  const mode = options.mode || defaultParams.mode;
  return {
    ...defaultParams,
    ...options,
    mode,
    grayscale: mode === "logo_bw",
  };
}

function getModeLabel(mode) {
  return mode === "color_flat" ? "彩色 Logo / 图标" : "黑白 Logo / 图标";
}

function getSimpleSuitability(analysis, warnings) {
  if (!analysis) return null;
  if (warnings.length) {
    return "请人工检查结果";
  }
  return "适合矢量化";
}

function isValidTaskId(value) {
  const text = String(value || "").trim();
  return Boolean(text) && text !== "undefined" && text !== "null";
}

export default function ResultPage({ upload, taskId, onBack, onHistory }) {
  const [task, setTask] = useState(upload);
  const [params, setParams] = useState(() => normalizeSuggestedOptions(upload?.image_analysis?.suggested_options || defaultParams));
  const [result, setResult] = useState(upload?.svg_url ? upload : null);
  const [status, setStatus] = useState(upload?.svg_url ? "success" : "idle");
  const [message, setMessage] = useState("");
  const [cacheKey, setCacheKey] = useState(Date.now());
  const [originalFailed, setOriginalFailed] = useState(false);
  const [svgFailed, setSvgFailed] = useState(false);
  const [pngFailed, setPngFailed] = useState(false);
  const [ocrItems, setOcrItems] = useState(upload?.ocr_items || []);
  const [ocrMessage, setOcrMessage] = useState("");
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);
  const [textLayoutFailed, setTextLayoutFailed] = useState(false);

  const currentTask = result || task || upload;
  const rawTaskId = currentTask?.task_id || taskId;
  const currentTaskId = isValidTaskId(rawTaskId) ? rawTaskId : null;
  const isGenerating = status === "generating" || status === "loading";
  const stats = result?.stats || task?.stats;
  const printSettings = result?.print_settings || task?.print_settings;
  const analysis = result?.image_analysis || task?.image_analysis || upload?.image_analysis;
  const warnings = [...(analysis?.warnings || []), ...(result?.warnings || task?.warnings || [])].filter(Boolean);
  const uniqueWarnings = [...new Set(warnings)];
  const suitability = getSimpleSuitability(analysis, uniqueWarnings);

  function applyLoadedTask(loaded, loadedMessage) {
    setTask(loaded);
    setResult(loaded.svg_url ? loaded : null);
    setOcrItems(loaded.ocr_items || []);
    setParams(normalizeSuggestedOptions(loaded.image_analysis?.suggested_options || defaultParams));
    setStatus(loaded.svg_url ? "success" : "partial");
    setMessage(loadedMessage);
    setCacheKey(Date.now());
  }

  async function loadTaskById(nextTaskId) {
    if (!nextTaskId) return;
    setStatus("loading");
    setMessage("正在读取任务...");
    try {
      const loaded = await getTask(nextTaskId);
      applyLoadedTask(loaded, loaded.svg_url ? "已打开历史任务。" : "任务存在，但尚未生成 SVG。");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "任务不存在，请重新上传");
    }
  }

  async function runVectorize(nextParams = params) {
    if (!currentTaskId) return;

    setStatus("generating");
    setMessage("正在生成 SVG...");
    setSvgFailed(false);
    setPngFailed(false);

    try {
      const nextResult = await vectorizeImage(currentTaskId, nextParams);
      setTask(nextResult);
      setResult(nextResult);
      setCacheKey(Date.now());
      setStatus("success");
      setMessage("SVG 已生成，可以预览和下载。");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  async function handleDownload(kind) {
    const source = result || task;
    if (!source) return;
    const url = getDownloadUrl(source, kind);

    try {
      await downloadFile(url, getDownloadName(source, kind), cacheKey);
      setMessage(`已下载：${getDownloadName(source, kind)}`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "下载失败，请重新生成后再试。");
    }
  }

  async function handleRunOcr() {
    if (!currentTaskId) {
      setOcrMessage("当前没有有效任务，请先上传图片");
      return;
    }
    console.log("OCR task_id:", currentTaskId);
    setIsRunningOcr(true);
    setOcrMessage("正在识别文字...");

    try {
      const ocr = await runOcr(currentTaskId, { language: "auto", preprocess: true });
      const merged = {
        ...(task || {}),
        ...(result || {}),
        ocr_url: ocr.ocr_url,
        ocr_items: ocr.ocr_items,
        download_filenames: {
          ...((result || task)?.download_filenames || {}),
          ...(ocr.download_filenames || {}),
        },
      };
      setOcrItems(ocr.ocr_items || []);
      setTask(merged);
      setResult(merged.svg_url ? merged : null);
      setCacheKey(Date.now());
      setOcrMessage((ocr.warnings || []).length ? ocr.warnings.join(" ") : "OCR 已完成，请人工校对文字。");
    } catch (error) {
      setOcrMessage(error.message || "文字识别失败。");
    } finally {
      setIsRunningOcr(false);
    }
  }

  async function handleGenerateTextLayout() {
    if (!currentTaskId) {
      setOcrMessage("当前没有有效任务，请先上传图片");
      return;
    }
    setIsGeneratingLayout(true);
    setOcrMessage("正在生成文字排版 SVG...");
    setTextLayoutFailed(false);

    try {
      const layout = await generateOcrLayout(currentTaskId, ocrItems, {
        font_family: "Arial, sans-serif",
        fill: "#000000",
      });
      const merged = {
        ...(task || {}),
        ...(result || {}),
        text_layout_svg_url: layout.text_layout_svg_url,
        text_layout_pdf_url: layout.text_layout_pdf_url,
        ocr_items: ocrItems,
        download_filenames: {
          ...((result || task)?.download_filenames || {}),
          ...(layout.download_filenames || {}),
        },
      };
      setTask(merged);
      setResult(merged.svg_url ? merged : null);
      setCacheKey(Date.now());
      setOcrMessage((layout.warnings || []).length ? layout.warnings.join(" ") : "文字排版 SVG 已生成。");
    } catch (error) {
      setOcrMessage(error.message || "生成文字排版 SVG 失败。");
    } finally {
      setIsGeneratingLayout(false);
    }
  }

  function updateOcrText(index, text) {
    setOcrItems((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, text } : item)));
  }

  function addOcrItem() {
    setOcrItems((items) => [
      ...items,
      {
        id: `manual_text_${items.length + 1}`,
        text: "",
        confidence: 1,
        bbox: { x: 20, y: 20 + items.length * 36, width: 160, height: 32 },
        font_size: 24,
      },
    ]);
  }

  function deleteOcrItem(index) {
    setOcrItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  useEffect(() => {
    setOriginalFailed(false);
    setSvgFailed(false);
    setPngFailed(false);
    setTextLayoutFailed(false);

    if (upload?.task_id && upload.task_id === taskId) {
      setTask(upload);
      setResult(upload.svg_url ? upload : null);
      setOcrItems(upload.ocr_items || []);
      const initialParams = normalizeSuggestedOptions(upload?.image_analysis?.suggested_options || defaultParams);
      setParams(initialParams);
      if (!upload.svg_url) {
        runVectorize(initialParams);
      }
      return;
    }

    if (taskId) {
      loadTaskById(taskId);
    }
  }, [taskId, upload?.task_id]);

  const svgPreviewUrl = useMemo(() => {
    if (!result?.svg_url) return "";
    return `${getAssetUrl(result.svg_url)}?t=${cacheKey}`;
  }, [result?.svg_url, cacheKey]);

  const pngPreviewUrl = useMemo(() => {
    const url = result?.png_preview_url || result?.preview_url || task?.png_preview_url || task?.preview_url;
    if (!url) return "";
    return `${getAssetUrl(url)}?t=${cacheKey}`;
  }, [result?.png_preview_url, result?.preview_url, task?.png_preview_url, task?.preview_url, cacheKey]);

  const originalUrl = currentTask?.original_url;
  const textLayoutUrl = currentTask?.text_layout_svg_url ? `${getAssetUrl(currentTask.text_layout_svg_url)}?t=${cacheKey}` : "";
  const displayFilename = currentTask?.original_filename || currentTask?.filename || "-";

  if (!currentTask && status !== "loading") {
    return (
      <main className="app-shell single-column" data-edit-id="result-empty-page" data-edit-label="Result empty state page">
        <section className="workspace upload-workspace" data-edit-id="result-empty-workspace" data-edit-label="Result empty workspace">
          <div className="masthead" data-edit-id="result-empty-masthead" data-edit-label="Result empty masthead">
            <p data-edit-id="result-empty-eyebrow" data-edit-label="Result empty eyebrow">Label Vectorizer MVP</p>
            <h1>结果页</h1>
          </div>
          <p className="status error">{message || "任务不存在，请重新上传"}</p>
          <div className="action-row" data-edit-id="result-empty-actions" data-edit-label="Result empty actions">
            <button className="primary-button" type="button" onClick={onBack} data-edit-id="result-empty-back-button" data-edit-label="Result empty back button">
              返回上传
            </button>
            <button className="secondary-button" type="button" onClick={onHistory} data-edit-id="result-empty-history-button" data-edit-label="Result empty history button">
              返回历史记录
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell" data-edit-id="result-page" data-edit-label="Result page">
      <section className="workspace" data-edit-id="result-workspace" data-edit-label="Result workspace">
        <div className="result-header" data-edit-id="result-header" data-edit-label="Result header">
          <div className="masthead" data-edit-id="result-masthead" data-edit-label="Result masthead">
            <p data-edit-id="result-eyebrow" data-edit-label="Result eyebrow">Label Vectorizer MVP</p>
            <h1>Logo / 图标转 SVG</h1>
          </div>
          <dl className="task-summary" data-edit-id="result-task-summary" data-edit-label="Task summary">
            <div>
              <dt>状态</dt>
              <dd>
                <span className={`status-pill ${status}`}>{getStatusLabel(status)}</span>
              </dd>
            </div>
            <div>
              <dt>原始文件名</dt>
              <dd>{displayFilename}</dd>
            </div>
            <div>
              <dt>task_id</dt>
              <dd>{currentTaskId}</dd>
            </div>
          </dl>
        </div>

        {message ? (
          <p className={`status ${status}`} data-edit-id="result-status" data-edit-label="Result status">
            {message}
          </p>
        ) : null}

        {suitability ? (
          <section className="analysis-card simple-analysis" data-edit-id="result-analysis-card" data-edit-label="Image analysis card">
            <div>
              <h2>图片提示</h2>
              <p>{suitability}</p>
            </div>
            {analysis?.width && analysis?.height ? (
              <dl>
                <div>
                  <dt>图片尺寸</dt>
                  <dd>{analysis.width} × {analysis.height} px</dd>
                </div>
              </dl>
            ) : null}
          </section>
        ) : null}

        {uniqueWarnings.length ? (
          <section className="warning-box" data-edit-id="result-warning-box" data-edit-label="Warnings box">
            <h2>提示</h2>
            <ul>
              {uniqueWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {stats ? (
          <dl className="stats-row" data-edit-id="result-stats-row" data-edit-label="Result stats row">
            <div>
              <dt>转换模式</dt>
              <dd>{getModeLabel(stats.mode)}</dd>
            </div>
            <div>
              <dt>图片尺寸</dt>
              <dd>{stats.width} × {stats.height}</dd>
            </div>
            <div>
              <dt>路径数量</dt>
              <dd>{stats.path_count}</dd>
            </div>
            {stats.mode === "color_flat" ? (
              <div>
                <dt>颜色数量</dt>
                <dd>{stats.color_count ?? stats.colors?.length ?? 0}</dd>
              </div>
            ) : null}
            {printSettings ? (
              <div>
                <dt>输出尺寸</dt>
                <dd>
                  {printSettings.output_unit === "mm"
                    ? `${printSettings.width_mm} × ${printSettings.height_mm} mm`
                    : `${printSettings.width_px} × ${printSettings.height_px} px`}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <section className="compare-grid result-compare" data-edit-id="result-preview-compare" data-edit-label="Preview compare grid">
          <div className="preview-pane" data-edit-id="result-original-preview-pane" data-edit-label="Original preview pane">
            <h2>原图</h2>
            <div className="preview-frame">
              {originalFailed || !originalUrl ? (
                <p className="preview-error">原图加载失败，请返回重新上传。</p>
              ) : (
                <img src={getAssetUrl(originalUrl)} alt="上传原图预览" onError={() => setOriginalFailed(true)} />
              )}
            </div>
          </div>

          <div className="preview-pane" data-edit-id="result-svg-preview-pane" data-edit-label="SVG preview pane">
            <h2>SVG 结果</h2>
            <div className="preview-frame checkerboard">
              {!svgFailed && svgPreviewUrl ? (
                <img src={svgPreviewUrl} alt="SVG 矢量预览" onError={() => setSvgFailed(true)} />
              ) : !pngFailed && pngPreviewUrl ? (
                <img src={pngPreviewUrl} alt="PNG 预览兜底" onError={() => setPngFailed(true)} />
              ) : svgFailed ? (
                <p className="preview-error">SVG 预览失败，请重新生成或下载文件检查。</p>
              ) : (
                <p className="preview-placeholder">生成后显示 SVG 预览</p>
              )}
            </div>
            {svgFailed && pngPreviewUrl && !pngFailed ? (
              <p className="preview-note">当前显示 PNG 预览图，仅用于查看，不代表可编辑矢量文件。</p>
            ) : null}
          </div>
        </section>

        <details className="ocr-card" data-edit-id="result-ocr-card" data-edit-label="OCR card">
          <summary>文字识别与重排</summary>
          <p className="preview-note">OCR 结果需要人工校对，字体和排版第一版仅做基础还原。</p>
          <div className="ocr-actions" data-edit-id="result-ocr-actions" data-edit-label="OCR actions">
            <button className="primary-button" type="button" disabled={isGenerating || isRunningOcr || !currentTaskId} onClick={handleRunOcr} data-edit-id="result-run-ocr-button" data-edit-label="Run OCR button">
              {isRunningOcr ? "识别中..." : "识别文字"}
            </button>
            <button className="secondary-button" type="button" disabled={isGeneratingLayout || !currentTaskId} onClick={addOcrItem} data-edit-id="result-add-ocr-item-button" data-edit-label="Add OCR item button">
              新增文字
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={isGeneratingLayout || !ocrItems.length}
              onClick={handleGenerateTextLayout}
              data-edit-id="result-generate-text-layout-button"
              data-edit-label="Generate text layout button"
            >
              {isGeneratingLayout ? "生成中..." : "生成文字排版 SVG"}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!currentTask?.text_layout_svg_url || isGeneratingLayout}
              onClick={() => handleDownload("text_layout_svg")}
              data-edit-id="result-download-text-svg-button"
              data-edit-label="Download text SVG button"
            >
              下载文字 SVG
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={!currentTask?.text_layout_pdf_url || isGeneratingLayout}
              onClick={() => handleDownload("text_layout_pdf")}
              data-edit-id="result-download-text-pdf-button"
              data-edit-label="Download text PDF button"
            >
              下载文字 PDF
            </button>
          </div>
          {ocrMessage ? <p className="preview-note">{ocrMessage}</p> : null}
          {ocrItems.length ? (
            <div className="ocr-list" data-edit-id="result-ocr-list" data-edit-label="OCR item list">
              {ocrItems.map((item, index) => (
                <label className="ocr-item" key={item.id || index}>
                  <span>
                    文本 {index + 1}
                    <small>
                      置信度 {Math.round((item.confidence ?? 0) * 100)}% · bbox {item.bbox?.x ?? 0}, {item.bbox?.y ?? 0},{" "}
                      {item.bbox?.width ?? 0} × {item.bbox?.height ?? 0}
                    </small>
                  </span>
                  <input type="text" value={item.text || ""} onChange={(event) => updateOcrText(index, event.target.value)} />
                  <button className="secondary-button compact-button" type="button" onClick={() => deleteOcrItem(index)}>
                    删除
                  </button>
                </label>
              ))}
            </div>
          ) : (
            <p className="preview-placeholder">识别后会显示可编辑文字列表</p>
          )}
          <div className="preview-frame checkerboard text-layout-preview" data-edit-id="result-text-layout-preview" data-edit-label="Text layout preview">
            {!textLayoutFailed && textLayoutUrl ? (
              <img src={textLayoutUrl} alt="文字排版 SVG 预览" onError={() => setTextLayoutFailed(true)} />
            ) : textLayoutFailed ? (
              <p className="preview-error">文字排版 SVG 预览失败，请下载文件检查。</p>
            ) : (
              <p className="preview-placeholder">生成后显示 text_layout.svg 预览</p>
            )}
          </div>
        </details>

        <div className="action-row" data-edit-id="result-actions" data-edit-label="Result actions">
          <button className="primary-button" type="button" disabled={isGenerating || !currentTaskId} onClick={() => runVectorize(params)} data-edit-id="result-regenerate-button" data-edit-label="Regenerate SVG button">
            {isGenerating ? "生成中..." : "重新生成 SVG"}
          </button>
          <button className="primary-button" type="button" disabled={!result?.svg_url || isGenerating} onClick={() => handleDownload("svg")} data-edit-id="result-download-svg-button" data-edit-label="Download SVG button">
            下载 SVG
          </button>
          <button className="secondary-button" type="button" disabled={!pngPreviewUrl || isGenerating} onClick={() => handleDownload("png")} data-edit-id="result-download-png-button" data-edit-label="Download PNG button">
            下载 PNG 预览图
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!result?.pdf_url || isGenerating}
            title={result?.pdf_url ? "下载 PDF" : "PDF 暂不可用，请下载 SVG 后用 Illustrator 打开另存为 PDF"}
            onClick={() => handleDownload("pdf")}
            data-edit-id="result-download-pdf-button"
            data-edit-label="Download PDF button"
          >
            下载 PDF
          </button>
          <button className="secondary-button" type="button" onClick={onHistory} data-edit-id="result-history-button" data-edit-label="Open history button">
            返回历史记录
          </button>
          <button className="secondary-button" type="button" onClick={onBack} data-edit-id="result-back-button" data-edit-label="Back to upload button">
            返回上传页
          </button>
        </div>
        {!result?.pdf_url && result ? (
          <p className="preview-note">PDF 暂不可用，请下载 SVG 后用 Illustrator 打开另存为 PDF。</p>
        ) : null}
      </section>

      <ParameterPanel
        params={params}
        disabled={isGenerating}
        onChange={setParams}
        onRegenerate={() => runVectorize(params)}
        canDownload={Boolean(result?.svg_url)}
        onDownload={() => handleDownload("svg")}
        canDownloadPng={Boolean(pngPreviewUrl)}
        onDownloadPng={() => handleDownload("png")}
      />
    </main>
  );
}

function getDownloadUrl(source, kind) {
  if (kind === "png") return source.png_preview_url || source.preview_url;
  if (kind === "text_layout_svg") return source.text_layout_svg_url;
  if (kind === "text_layout_pdf") return source.text_layout_pdf_url;
  if (kind === "ocr") return source.ocr_url;
  return source[`${kind}_url`];
}
