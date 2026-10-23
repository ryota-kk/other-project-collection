export function createClipboard({ showToast }) {
  let panel = null;
  let textarea = null;
  let mounted = false;

  function mount() {
    if (mounted) return;

    panel = document.createElement('div');
    panel.className = 'vde-copy-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="vde-copy-dialog" role="dialog" aria-modal="true" aria-label="导出内容手动复制">
        <div class="vde-copy-header">
          <strong>导出内容</strong>
          <button type="button" data-vde-copy-action="close">关闭</button>
        </div>
        <p>如果浏览器阻止自动复制，请手动选中文本后复制。</p>
        <textarea readonly spellcheck="false"></textarea>
        <div class="vde-copy-actions">
          <button type="button" data-vde-copy-action="retry">重新复制</button>
          <button type="button" data-vde-copy-action="close">关闭</button>
        </div>
      </div>
    `;
    textarea = panel.querySelector('textarea');
    panel.addEventListener('click', handlePanelClick);
    document.body.appendChild(panel);
    mounted = true;
  }

  async function copyToClipboard(text) {
    if (!text || !text.trim()) {
      showToast('没有可复制的内容');
      return false;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板');
        return true;
      }

      showManualCopyPanel(text);
      showToast('当前环境不支持自动复制，请手动复制');
      return false;
    } catch (error) {
      console.error('复制到剪贴板失败：', error);
      showManualCopyPanel(text);
      showToast('自动复制失败，请在弹出的文本框中手动复制');
      return false;
    }
  }

  function showManualCopyPanel(text) {
    mount();
    textarea.value = text;
    panel.classList.add('is-visible');
    panel.setAttribute('aria-hidden', 'false');
    textarea.focus({ preventScroll: true });
    textarea.select();
  }

  function hideManualCopyPanel() {
    if (!panel) return;
    panel.classList.remove('is-visible');
    panel.setAttribute('aria-hidden', 'true');
  }

  function isVisible() {
    return Boolean(panel?.classList.contains('is-visible'));
  }

  function handlePanelClick(event) {
    const action = event.target.closest('[data-vde-copy-action]')?.dataset.vdeCopyAction;
    if (!action) return;

    if (action === 'close') hideManualCopyPanel();
    if (action === 'retry') copyToClipboard(textarea?.value || '');
  }

  function destroy() {
    if (panel) panel.removeEventListener('click', handlePanelClick);
    if (panel) panel.remove();
    panel = null;
    textarea = null;
    mounted = false;
  }

  return {
    mount,
    copyToClipboard,
    showManualCopyPanel,
    hideManualCopyPanel,
    isVisible,
    destroy,
  };
}
