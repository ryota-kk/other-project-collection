import { useEffect, useState } from "react";

import { deleteTask, getAssetUrl, listTasks } from "../api/client";
import { downloadFile } from "../utils/downloadFile";
import { getDownloadName } from "../utils/downloadNames";

function formatTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getModeLabel(mode) {
  if (mode === "color_flat") return "彩色 Logo / 图标";
  if (mode === "logo_bw") return "黑白 Logo / 图标";
  return "-";
}

export default function HistoryPage({ onBack, onOpenTask }) {
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("正在读取历史记录...");
  const [cacheKey, setCacheKey] = useState(Date.now());

  async function loadTasks() {
    setStatus("loading");
    setMessage("正在读取历史记录...");
    try {
      const items = await listTasks();
      setTasks(items);
      setStatus("success");
      setMessage(items.length ? "" : "还没有历史任务，请先上传图片生成结果。");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  async function handleDownload(task, kind) {
    const url = kind === "png" ? task.png_preview_url || task.preview_url : task[`${kind}_url`];
    try {
      await downloadFile(url, getDownloadName(task, kind), cacheKey);
      setMessage(`已下载：${getDownloadName(task, kind)}`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "下载失败，请稍后再试。");
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`确认删除任务 ${task.original_filename || task.task_id}？`)) return;

    try {
      await deleteTask(task.task_id);
      setCacheKey(Date.now());
      await loadTasks();
      setMessage("任务已删除。");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  return (
    <main className="app-shell single-column" data-edit-id="history-page" data-edit-label="History page">
      <section className="workspace" data-edit-id="history-workspace" data-edit-label="History workspace">
        <div className="result-header" data-edit-id="history-header" data-edit-label="History header">
          <div className="masthead" data-edit-id="history-masthead" data-edit-label="History masthead">
            <p data-edit-id="history-eyebrow" data-edit-label="History eyebrow">Label Vectorizer MVP</p>
            <h1>历史记录</h1>
          </div>
          <div className="header-actions" data-edit-id="history-header-actions" data-edit-label="History header actions">
            <button className="secondary-button" type="button" onClick={onBack} data-edit-id="history-back-button" data-edit-label="History back button">
              返回上传页
            </button>
          </div>
        </div>

        {message ? (
          <p className={`status ${status}`} data-edit-id="history-status" data-edit-label="History status">
            {message}
          </p>
        ) : null}

        {tasks.length ? (
          <section className="history-list" data-edit-id="history-list" data-edit-label="History list">
            {tasks.map((task) => (
              <article className="history-item" key={task.task_id} data-edit-id={`history-item-${task.task_id}`} data-edit-label="History item">
                <div className="history-thumb" data-edit-id={`history-thumb-${task.task_id}`} data-edit-label="History thumbnail">
                  {task.preview_url ? (
                    <img src={`${getAssetUrl(task.preview_url)}?t=${cacheKey}`} alt={`${task.original_filename || task.task_id} 预览`} />
                  ) : (
                    <span>无预览</span>
                  )}
                </div>
                <div className="history-main" data-edit-id={`history-main-${task.task_id}`} data-edit-label="History item details">
                  <h2>{task.original_filename || task.task_id}</h2>
                  <dl>
                    <div>
                      <dt>原文件名</dt>
                      <dd>{task.original_filename || "-"}</dd>
                    </div>
                    <div>
                      <dt>task_id</dt>
                      <dd>{task.task_id}</dd>
                    </div>
                    <div>
                      <dt>创建时间</dt>
                      <dd>{formatTime(task.created_at)}</dd>
                    </div>
                    <div>
                      <dt>更新时间</dt>
                      <dd>{formatTime(task.updated_at)}</dd>
                    </div>
                    <div>
                      <dt>处理状态</dt>
                      <dd>{task.status}</dd>
                    </div>
                    <div>
                      <dt>转换模式</dt>
                      <dd>{getModeLabel(task.mode)}</dd>
                    </div>
                    <div>
                      <dt>warnings</dt>
                      <dd>{task.warnings_count || 0}</dd>
                    </div>
                  </dl>
                </div>
                <div className="history-actions" data-edit-id={`history-actions-${task.task_id}`} data-edit-label="History item actions">
                  <button className="primary-button" type="button" onClick={() => onOpenTask(task.task_id, task)}>
                    查看结果
                  </button>
                  <button className="secondary-button" type="button" disabled={!task.svg_url} onClick={() => handleDownload(task, "svg")}>
                    下载 SVG
                  </button>
                  <button className="secondary-button" type="button" disabled={!task.pdf_url} onClick={() => handleDownload(task, "pdf")}>
                    下载 PDF
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!task.preview_url}
                    onClick={() => handleDownload(task, "png")}
                  >
                    下载 PNG
                  </button>
                  <button className="danger-button" type="button" onClick={() => handleDelete(task)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </main>
  );
}
