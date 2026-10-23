const EXPORT_OPTIONS = [
  { type: 'codex', label: 'Codex' },
  { type: 'claude', label: 'Claude Code' },
  { type: 'cursor', label: 'Cursor' },
  { type: 'developer', label: 'Developer' },
  { type: 'coordinate', label: 'Coordinate' },
  { type: 'json', label: 'JSON' },
];

const EXPORT_DESCRIPTIONS = {
  codex: '布局意图模式：适合交给 Codex 修改正式代码。',
  claude: '布局意图模式：适合交给 Claude Code 修改正式代码。',
  cursor: '布局意图模式：适合在 Cursor 中定位并修改代码。',
  developer: '布局意图模式：适合交给前端开发者实现。',
  coordinate: '坐标参考模式：仅用于记录视觉草稿位置，不建议直接作为生产 CSS。',
  json: 'JSON 模式：用于调试或后续工具链处理。',
};

export function createExportPanel({ getExportContent, getExportSettings, setExportSettings, copyToClipboard, showToast }) {
  let panel = null;
  let textarea = null;
  let currentType = 'codex';
  let mounted = false;

  function mount() {
    if (mounted) return;

    panel = document.createElement('div');
    panel.className = 'vde-export-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="vde-export-dialog" role="dialog" aria-modal="true" aria-label="导出 Visual Draft Editor 草稿">
        <div class="vde-export-header">
          <strong>导出草稿</strong>
          <button type="button" data-vde-export-action="close">关闭</button>
        </div>
        <div class="vde-export-tabs" role="tablist">
          ${EXPORT_OPTIONS.map((option) => `<button type="button" data-vde-export-type="${option.type}">${option.label}</button>`).join('')}
        </div>
        <p class="vde-export-description"></p>
        <div class="vde-export-settings" aria-label="导出策略设置">
          <label>
            <span>落地策略</span>
            <select data-vde-export-setting="implementationStrategy">
              <option value="normal-flow-layout">Normal Flow Layout</option>
              <option value="absolute-layout">Absolute Layout</option>
              <option value="coordinate-reference-only">Coordinate Reference Only</option>
            </select>
          </label>
          <label>
            <span>坐标模式</span>
            <select data-vde-export-setting="coordinateMode">
              <option value="root-container">root-container</option>
              <option value="viewport">viewport</option>
              <option value="parent-container">parent-container</option>
            </select>
          </label>
          <label>
            <span>定位根容器</span>
            <input type="text" data-vde-export-setting="positioningRootSelector" placeholder=".site-home">
          </label>
          <label>
            <span>移动端断点</span>
            <input type="number" min="320" max="1440" step="1" data-vde-export-setting="mobileBreakpoint">
          </label>
        </div>
        <textarea readonly spellcheck="false"></textarea>
        <div class="vde-export-actions">
          <button type="button" data-vde-export-action="refresh">预览导出内容</button>
          <button type="button" data-vde-export-action="copy">复制到剪贴板</button>
        </div>
      </div>
    `;
    textarea = panel.querySelector('textarea');
    panel.addEventListener('click', handleClick);
    panel.addEventListener('change', handleSettingsChange);
    document.body.appendChild(panel);
    mounted = true;
    updateTabs();
    syncSettingsFields();
  }

  function open(type = currentType) {
    mount();
    currentType = type;
    panel.classList.add('is-visible');
    panel.setAttribute('aria-hidden', 'false');
    renderPreview();
  }

  function close() {
    if (!panel) return;
    panel.classList.remove('is-visible');
    panel.setAttribute('aria-hidden', 'true');
  }

  function isVisible() {
    return Boolean(panel?.classList.contains('is-visible'));
  }

  function renderPreview() {
    mount();
    const content = getExportContent(currentType);
    const description = panel.querySelector('.vde-export-description');
    if (description) description.textContent = EXPORT_DESCRIPTIONS[currentType] || '';
    syncSettingsFields();
    textarea.value = content || '当前没有可导出的修改内容。';
    updateTabs();

    if (!content || !content.trim()) {
      showToast('当前没有可导出的修改内容。');
      return '';
    }

    showToast(`已生成 ${getCurrentLabel()} 导出预览`);
    return content;
  }

  async function copyCurrent() {
    const content = getExportContent(currentType);

    if (!content || !content.trim()) {
      textarea.value = '当前没有可导出的修改内容。';
      showToast('当前没有可导出的修改内容。');
      return false;
    }

    textarea.value = content;
    return copyToClipboard(content);
  }

  function handleClick(event) {
    const type = event.target.closest('[data-vde-export-type]')?.dataset.vdeExportType;
    if (type) {
      currentType = type;
      renderPreview();
      return;
    }

    const action = event.target.closest('[data-vde-export-action]')?.dataset.vdeExportAction;
    if (!action) return;

    if (action === 'close') close();
    if (action === 'refresh') renderPreview();
    if (action === 'copy') copyCurrent();
  }

  function handleSettingsChange(event) {
    const field = event.target.closest('[data-vde-export-setting]');
    if (!field) return;

    setExportSettings?.(readSettingsFields());
    renderPreview();
  }

  function updateTabs() {
    if (!panel) return;

    panel.querySelectorAll('[data-vde-export-type]').forEach((button) => {
      const isActive = button.dataset.vdeExportType === currentType;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
  }

  function syncSettingsFields() {
    if (!panel) return;
    const settings = getExportSettings?.() || {};

    panel.querySelectorAll('[data-vde-export-setting]').forEach((field) => {
      const key = field.dataset.vdeExportSetting;
      if (settings[key] === undefined || settings[key] === null) return;
      field.value = settings[key];
    });
  }

  function readSettingsFields() {
    const settings = {};
    if (!panel) return settings;

    panel.querySelectorAll('[data-vde-export-setting]').forEach((field) => {
      const key = field.dataset.vdeExportSetting;
      settings[key] = field.type === 'number' ? Number(field.value) : field.value;
    });

    return settings;
  }

  function getCurrentLabel() {
    return EXPORT_OPTIONS.find((option) => option.type === currentType)?.label || currentType;
  }

  function destroy() {
    if (panel) panel.removeEventListener('click', handleClick);
    if (panel) panel.removeEventListener('change', handleSettingsChange);
    if (panel) panel.remove();
    panel = null;
    textarea = null;
    mounted = false;
  }

  return {
    mount,
    open,
    close,
    isVisible,
    destroy,
  };
}
