import { getAssetUrl } from "../api/client";

export default function PreviewCompare({ originalUrl, previewUrl, svgUrl }) {
  return (
    <section className="compare-grid">
      <div className="preview-pane">
        <h2>原图</h2>
        {originalUrl ? <img src={getAssetUrl(originalUrl)} alt="原始上传图片" /> : <p>等待上传图片</p>}
      </div>
      <div className="preview-pane">
        <h2>SVG 结果</h2>
        {previewUrl ? <img src={getAssetUrl(previewUrl)} alt="SVG PNG 预览" /> : <p>生成后显示预览</p>}
        {svgUrl ? (
          <a className="download-link" href={getAssetUrl(svgUrl)} download>
            下载 SVG
          </a>
        ) : null}
      </div>
    </section>
  );
}
