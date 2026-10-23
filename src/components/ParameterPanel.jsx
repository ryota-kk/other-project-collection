function clampNumber(value, min, max) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function optionalNumber(value) {
  if (value === "") return null;
  const number = Number(value);
  return Number.isNaN(number) || number <= 0 ? null : number;
}

export default function ParameterPanel({
  params,
  disabled,
  onChange,
  onRegenerate,
  canDownload,
  onDownload,
  canDownloadPng,
  onDownloadPng,
}) {
  const update = (patch) => onChange({ ...params, ...patch });
  const isColorMode = params.mode === "color_flat";

  return (
    <aside className="panel" data-edit-id="parameter-panel" data-edit-label="Parameter panel">
      <h2>参数调节</h2>

      <label className="field">
        <span>转换模式</span>
        <select disabled={disabled} value={params.mode} onChange={(event) => update({ mode: event.target.value, grayscale: event.target.value === "logo_bw" })}>
          <option value="logo_bw">黑白 Logo / 图标</option>
          <option value="color_flat">彩色 Logo / 图标</option>
        </select>
        <small>黑白适合单色图；彩色适合少色块图。</small>
      </label>

      <label className="check-field">
        <input
          type="checkbox"
          checked={params.use_ocr_enhancement || false}
          disabled={disabled}
          onChange={(event) => update({ use_ocr_enhancement: event.target.checked })}
        />
        <span>
          智能文字识别
          <small>启用后自动识别图片中的文字，生成清晰的文字层（约增加 2-5 秒）</small>
        </span>
      </label>

      {!isColorMode ? (
        <>
          <label className="field">
            <span>二值化阈值</span>
            <div className="inline-controls">
              <input
                type="range"
                min="0"
                max="255"
                value={params.threshold}
                disabled={disabled}
                onChange={(event) => update({ threshold: Number(event.target.value) })}
              />
              <input
                className="number-input"
                type="number"
                min="0"
                max="255"
                value={params.threshold}
                disabled={disabled}
                onChange={(event) => update({ threshold: clampNumber(event.target.value, 0, 255) })}
              />
            </div>
            <small>数值越高，越容易保留深色区域。</small>
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={params.auto_crop}
              disabled={disabled}
              onChange={(event) => update({ auto_crop: event.target.checked })}
            />
            <span>
              裁剪白边
              <small>自动去掉四周空白。</small>
            </span>
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={params.denoise}
              disabled={disabled}
              onChange={(event) => update({ denoise: event.target.checked })}
            />
            <span>
              去除小噪点
              <small>减少零散黑点。</small>
            </span>
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={params.invert}
              disabled={disabled}
              onChange={(event) => update({ invert: event.target.checked })}
            />
            <span>
              反色
              <small>适合黑底白图。</small>
            </span>
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span>最大颜色数量</span>
            <div className="inline-controls">
              <input
                type="range"
                min="2"
                max="16"
                value={params.color_count}
                disabled={disabled}
                onChange={(event) => update({ color_count: Number(event.target.value) })}
              />
              <input
                className="number-input"
                type="number"
                min="2"
                max="16"
                value={params.color_count}
                disabled={disabled}
                onChange={(event) => update({ color_count: clampNumber(event.target.value, 2, 16) })}
              />
            </div>
            <small>颜色越多，细节越多。</small>
          </label>

          <label className="field">
            <span>颜色合并容差</span>
            <div className="inline-controls">
              <input
                type="range"
                min="0"
                max="128"
                value={params.color_tolerance}
                disabled={disabled}
                onChange={(event) => update({ color_tolerance: Number(event.target.value) })}
              />
              <input
                className="number-input"
                type="number"
                min="0"
                max="128"
                value={params.color_tolerance}
                disabled={disabled}
                onChange={(event) => update({ color_tolerance: clampNumber(event.target.value, 0, 128) })}
              />
            </div>
            <small>数值越大，相近颜色越容易合并。</small>
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={params.remove_background}
              disabled={disabled}
              onChange={(event) => update({ remove_background: event.target.checked })}
            />
            <span>
              尝试去除背景
              <small>适合白底或纯色底图。</small>
            </span>
          </label>
        </>
      )}

      <label className="field">
        <span>最小碎片面积</span>
        <input
          type="number"
          min="1"
          max="500"
          value={params.min_area}
          disabled={disabled}
          onChange={(event) => update({ min_area: clampNumber(event.target.value, 1, 500) })}
        />
        <small>数值越大，越容易删除小噪点。</small>
      </label>

      <label className="field">
        <span>路径平滑</span>
        <div className="inline-controls">
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={params.smooth}
            disabled={disabled}
            onChange={(event) => update({ smooth: Number(event.target.value) })}
          />
          <input
            className="number-input"
            type="number"
            min="0"
            max="4"
            step="0.1"
            value={params.smooth}
            disabled={disabled}
            onChange={(event) => update({ smooth: clampNumber(event.target.value, 0, 4) })}
          />
        </div>
        <small>数值越大，路径越平滑。</small>
      </label>

      <details className="panel-section advanced-settings" data-edit-id="parameter-advanced-settings" data-edit-label="Advanced settings">
        <summary>高级设置</summary>

        <label className="field">
          <span>输出单位</span>
          <select disabled={disabled} value={params.output_unit} onChange={(event) => update({ output_unit: event.target.value })}>
            <option value="px">px</option>
            <option value="mm">mm</option>
          </select>
          <small>mm 适合印刷交付。</small>
        </label>

        <label className="field">
          <span>宽度 mm</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={params.output_width_mm ?? ""}
            disabled={disabled}
            placeholder="自动"
            onChange={(event) => update({ output_width_mm: optionalNumber(event.target.value) })}
          />
          <small>可填写标签实际宽度。</small>
        </label>

        <label className="field">
          <span>高度 mm</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={params.output_height_mm ?? ""}
            disabled={disabled}
            placeholder="自动"
            onChange={(event) => update({ output_height_mm: optionalNumber(event.target.value) })}
          />
          <small>保持比例时可只填一边。</small>
        </label>

        <label className="field">
          <span>DPI</span>
          <input
            type="number"
            min="72"
            max="1200"
            value={params.dpi}
            disabled={disabled}
            onChange={(event) => update({ dpi: clampNumber(event.target.value, 72, 1200) })}
          />
          <small>默认 300。</small>
        </label>

        <label className="check-field">
          <input
            type="checkbox"
            checked={params.preserve_aspect_ratio}
            disabled={disabled}
            onChange={(event) => update({ preserve_aspect_ratio: event.target.checked })}
          />
          <span>
            保持比例
            <small>避免 Logo 拉伸。</small>
          </span>
        </label>

        <label className="field">
          <span>画板边距 mm</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={params.canvas_padding_mm}
            disabled={disabled}
            onChange={(event) => update({ canvas_padding_mm: clampNumber(event.target.value, 0, 100) })}
          />
          <small>给画板四周增加边距。</small>
        </label>

        <label className="field">
          <span>背景</span>
          <select disabled={disabled} value={params.background} onChange={(event) => update({ background: event.target.value })}>
            <option value="transparent">透明</option>
            <option value="white">白色</option>
          </select>
          <small>主体仍是真实 path。</small>
        </label>
      </details>

      <div className="panel-actions" data-edit-id="parameter-panel-actions" data-edit-label="Parameter panel actions">
        <button type="button" disabled={disabled} onClick={onRegenerate} data-edit-id="parameter-regenerate-button" data-edit-label="Panel regenerate button">
          {disabled ? "生成中..." : "重新生成 SVG"}
        </button>
        <button className="secondary-button" type="button" disabled={!canDownload || disabled} onClick={onDownload} data-edit-id="parameter-download-svg-button" data-edit-label="Panel download SVG button">
          下载 SVG
        </button>
        <button className="secondary-button" type="button" disabled={!canDownloadPng || disabled} onClick={onDownloadPng} data-edit-id="parameter-download-png-button" data-edit-label="Panel download PNG button">
          下载 PNG 预览图
        </button>
      </div>
    </aside>
  );
}
