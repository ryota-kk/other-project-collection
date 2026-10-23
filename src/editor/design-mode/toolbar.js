export function createToolbar(actions) {
  let toggleButton = null;
  let toolbar = null;
  let statusTimer = 0;
  let mounted = false;

  function mount() {
    if (mounted) return;

    toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'vde-toggle';
    toggleButton.textContent = 'Design Mode';
    toggleButton.setAttribute('aria-pressed', 'false');
    toggleButton.addEventListener('click', actions.toggle);

    toolbar = document.createElement('div');
    toolbar.className = 'vde-toolbar';
    toolbar.setAttribute('aria-hidden', 'true');
    toolbar.innerHTML = `
      <button type="button" data-vde-action="save">保存草稿</button>
      <button type="button" data-vde-action="load">加载草稿预览</button>
      <button type="button" data-vde-action="reset">重置草稿</button>
      <button type="button" data-vde-action="restore">恢复隐藏</button>
      <button type="button" data-vde-action="autoTag">自动标记 / Auto Tag</button>
      <button type="button" data-vde-action="exportAutoTag">导出标记建议</button>
      <button type="button" data-vde-action="export">导出</button>
      <button type="button" data-vde-action="close">关闭编辑模式</button>
    `;
    toolbar.addEventListener('click', handleToolbarClick);

    document.body.appendChild(toggleButton);
    document.body.appendChild(toolbar);
    mounted = true;
  }

  function handleToolbarClick(event) {
    const action = event.target.closest('[data-vde-action]')?.dataset.vdeAction;
    if (!action) return;

    if (action === 'save') actions.saveDraft();
    if (action === 'load') actions.loadDraftPreview();
    if (action === 'reset') actions.resetDraft();
    if (action === 'restore') actions.restoreHidden();
    if (action === 'autoTag') actions.autoTagScan();
    if (action === 'exportAutoTag') actions.exportAutoTagSuggestions();
    if (action === 'export') actions.exportInstructions();
    if (action === 'close') actions.disable();
  }

  function setActive(isActive) {
    if (!toggleButton || !toolbar) return;
    toggleButton.setAttribute('aria-pressed', String(isActive));
    toggleButton.textContent = isActive ? '编辑模式 ON' : 'Design Mode';
    toolbar.classList.toggle('is-visible', isActive);
    toolbar.setAttribute('aria-hidden', String(!isActive));
  }

  function showToast(message) {
    if (!toolbar) return;

    toolbar.dataset.status = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      delete toolbar.dataset.status;
    }, 2200);
  }

  function destroy() {
    window.clearTimeout(statusTimer);
    if (toolbar) toolbar.removeEventListener('click', handleToolbarClick);
    if (toggleButton) toggleButton.removeEventListener('click', actions.toggle);
    if (toggleButton) toggleButton.remove();
    if (toolbar) toolbar.remove();
    toggleButton = null;
    toolbar = null;
    mounted = false;
  }

  return {
    mount,
    setActive,
    showToast,
    destroy,
  };
}
