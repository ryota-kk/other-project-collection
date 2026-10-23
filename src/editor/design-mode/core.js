import { createAutoTagController } from './autoTag.js';
import { createClipboard } from './clipboard.js';
import { createDragController } from './drag.js';
import { getDirtyItems, getExportContent, getExportRisks } from './exporter.js';
import { createExportPanel } from './exportPanel.js';
import { createResponsiveGuard } from './responsiveGuard.js';
import { createEditorState, getEditId, isTextEditable, setEditableText } from './state.js';
import { createDraftStorage } from './storage.js';
import { createTextEditController } from './textEdit.js';
import { createToolbar } from './toolbar.js';
import { createVisibilityController } from './visibility.js';

const DEFAULT_CONFIG = {
  root: null,
  storageKey: 'visual-draft-editor',
  legacyStorageKey: '',
  editableSelector: '[data-edit-id]',
  exportTitle: '当前页面',
  desktopMinWidth: 768,
  draftOnly: true,
  autoTagNamespace: '',
  previewStrategy: 'translate',
  implementationStrategy: 'normal-flow-layout',
  coordinateMode: 'root-container',
  positioningRootSelector: '',
  mobileBreakpoint: 768,
  preventRootMove: true,
  globalName: '',
};

export function createDesignMode(userConfig = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  let root = config.root || getDefaultRoot();
  let mounted = false;
  let isActive = false;
  let isDraftPreviewLoaded = false;
  let selected = null;
  let observer = null;
  let refreshFrame = 0;

  const state = createEditorState(config);
  const storage = createDraftStorage(config.storageKey, config.legacyStorageKey);
  const responsiveGuard = createResponsiveGuard(config, state);
  const clipboard = createClipboard({ showToast });
  const autoTag = createAutoTagController({
    config,
    getRoot: () => root,
    copyToClipboard: clipboard.copyToClipboard,
    showToast,
  });
  const exportPanel = createExportPanel({
    getExportContent: prepareExportContent,
    getExportSettings: () => getExportSettings(),
    setExportSettings,
    copyToClipboard: clipboard.copyToClipboard,
    showToast,
  });
  const toolbar = createToolbar({
    toggle,
    saveDraft,
    loadDraftPreview,
    resetDraft,
    restoreHidden,
    autoTagScan,
    exportAutoTagSuggestions,
    exportInstructions,
    disable,
  });
  const drag = createDragController({
    state,
    responsiveGuard,
    selectElement,
    isEnabled: () => isActive,
    rootContains,
    preventRootMove: () => config.preventRootMove,
    showToast,
  });
  const textEdit = createTextEditController({
    state,
    selectElement,
    isEnabled: () => isActive,
    rootContains,
  });
  const visibility = createVisibilityController({
    state,
    getSelected: () => selected,
    clearSelection,
  });

  function mount() {
    if (mounted) return api;

    root = root || config.root || getDefaultRoot();
    if (!isValidRoot(root)) {
      warnEditor('Design Mode root 不存在，插件未挂载。');
      return api;
    }

    config.root = root;

    toolbar.mount();
    clipboard.mount();
    state.refreshEditables();
    if (!state.getEditables().length) {
      showToast('未找到可编辑元素');
      warnEditor('未找到可编辑元素。请确认页面中存在 data-edit-id，或检查 editableSelector 配置。');
    }
    state.resetWorkingDraftFromDom();
    updateModeClasses();
    observeRoot();
    attachEvents();
    mounted = true;
    setGlobalReference();

    return api;
  }

  function enable() {
    mount();
    if (isActive) return;

    isActive = true;
    if (!isDraftPreviewLoaded) {
      state.recordInitialStates();
      state.resetWorkingDraftFromDom();
    }

    toolbar.setActive(true);
    updateModeClasses();
    refreshEditablesForMode();

    if (!responsiveGuard.isDesktop()) {
      showToast('移动端不应用桌面拖拽坐标');
    }
  }

  function disable() {
    if (!isActive) return;

    isActive = false;
    toolbar.setActive(false);
    clearSelection();
    updateModeClasses();
    refreshEditablesForMode();
  }

  function destroy() {
    if (!mounted) return;

    detachEvents();
    if (observer) observer.disconnect();
    observer = null;
    if (refreshFrame) {
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = 0;
    }

    clipboard.destroy();
    exportPanel.destroy();
    autoTag.destroy();
    toolbar.destroy();
    clearSelection();
    responsiveGuard.clearAllPositionStyles();
    state.getEditables().forEach((element) => {
      element.classList.remove('vde-editable', 'vde-text-editing');
      element.removeAttribute('data-dm-selected');
      element.removeAttribute('data-dm-hidden');
      element.removeAttribute('data-dm-layout');
    });
    state.clearAll();

    document.body.classList.remove('vde-active', 'vde-mobile', 'vde-draft-preview');
    clearGlobalReference();
    isActive = false;
    isDraftPreviewLoaded = false;
    mounted = false;
  }

  function saveDraft() {
    state.refreshEditables();
    collectCurrentEntries();
    storage.saveDraft(state.buildDraft());
    showToast('草稿已保存，不会自动成为正式布局');
  }

  function loadDraftPreview() {
    const draft = storage.loadDraft();
    if (!draft) {
      showToast('没有可加载的草稿');
      return;
    }

    state.refreshEditables();
    state.clearEntries();
    state.getEditables().forEach((element) => {
      const editId = getEditId(element);
      const draftItem = draft.items[editId];
      state.setEntry(editId, draftItem ? state.createEntryFromDraft(editId, draftItem, element) : state.createEntryFromElement(element));
    });

    isDraftPreviewLoaded = true;
    updateModeClasses();
    applyDraftToDom();
    showToast(responsiveGuard.isDesktop() ? '已加载桌面草稿预览' : '移动端仅加载文本和显示状态');
  }

  function resetDraft() {
    storage.clearDraft();
    isDraftPreviewLoaded = false;
    updateModeClasses();

    state.getEditables().forEach((element) => {
      const editId = getEditId(element);
      const original = state.originals.get(editId);

      responsiveGuard.clearPositionStyles(element);
      element.removeAttribute('data-dm-hidden');
      element.removeAttribute('data-dm-layout');
      element.removeAttribute('data-dm-selected');

      if (original && isTextEditable(element)) setEditableText(element, original.initialText);
    });

    state.clearAll();
    state.refreshEditables();
    state.resetWorkingDraftFromDom();
    clearSelection();
    clipboard.hideManualCopyPanel();
    exportPanel.close();
    showToast('草稿已重置，页面恢复正式布局');
  }

  function clearDraft() {
    const cleared = storage.clearDraft();
    showToast(cleared ? 'Design Mode 草稿数据已清除' : 'Design Mode 草稿数据不可用或已为空');
    return cleared;
  }

  function restoreHidden() {
    state.refreshEditables();

    let restoredCount = 0;
    state.getEditables().forEach((element) => {
      if (!element.hasAttribute('data-dm-hidden')) return;
      visibility.restoreElement(element);
      restoredCount += 1;
    });

    if (isDraftPreviewLoaded) applyDraftToDom();
    else refreshEditablesForMode();

    showToast(restoredCount ? `已恢复 ${restoredCount} 个隐藏组件` : '当前没有隐藏组件');
  }

  function exportInstructions(type = 'codex') {
    exportPanel.open(type);
    return true;
  }

  function autoTagScan() {
    mount();
    return autoTag.scan();
  }

  function exportAutoTagSuggestions() {
    mount();
    return autoTag.exportSuggestions();
  }

  function prepareExportContent(type = 'codex') {
    state.refreshEditables();
    collectCurrentEntries();
    const draft = state.buildDraft();
    const settings = getExportSettings();
    const risks = getExportRisks({ draft, originals: state.originals }, settings);
    const exportText = getExportContent(type, { draft, originals: state.originals }, settings);

    if (!exportText || !exportText.trim()) {
      logExportDebug(exportText, draft);
    } else if (risks.length) {
      showToast(`检测到 ${risks.length} 个导出风险，已写入导出内容`);
    }

    return exportText;
  }

  function getExportSettings() {
    return {
      exportTitle: config.exportTitle,
      previewStrategy: config.previewStrategy,
      implementationStrategy: config.implementationStrategy,
      coordinateMode: config.coordinateMode,
      positioningRootSelector: config.positioningRootSelector,
      mobileBreakpoint: config.mobileBreakpoint || config.desktopMinWidth,
      preventRootMove: config.preventRootMove,
    };
  }

  function setExportSettings(nextSettings = {}) {
    if (nextSettings.implementationStrategy) config.implementationStrategy = nextSettings.implementationStrategy;
    if (nextSettings.coordinateMode) config.coordinateMode = nextSettings.coordinateMode;
    if (typeof nextSettings.positioningRootSelector === 'string') config.positioningRootSelector = nextSettings.positioningRootSelector.trim();
    if (nextSettings.mobileBreakpoint) config.mobileBreakpoint = Number(nextSettings.mobileBreakpoint) || config.mobileBreakpoint;
  }

  function applyDraftToDom() {
    state.getEditables().forEach((element) => {
      const entry = state.getEntry(element);

      if (typeof entry.text === 'string' && isTextEditable(element) && element.innerText.trim() !== entry.text) {
        setEditableText(element, entry.text);
      }

      element.toggleAttribute('data-dm-hidden', entry.visible === false);
      element.classList.toggle('vde-editable', isActive && responsiveGuard.isDesktop());
      element.toggleAttribute('data-dm-selected', element === selected);

      if (responsiveGuard.isDesktop()) {
        responsiveGuard.applyDesktopPosition(element, entry);
      } else {
        responsiveGuard.clearPositionStyles(element);
      }
    });
  }

  function collectCurrentEntries() {
    state.getEditables().forEach((element) => {
      const entry = state.getEntry(element);
      if (entry.visible !== false) state.updateEntryFromElement(element, entry);
    });
  }

  function refreshEditablesForMode() {
    state.refreshEditables();
    state.getEditables().forEach((element) => {
      element.classList.toggle('vde-editable', isActive && responsiveGuard.isDesktop());
      element.toggleAttribute('data-dm-selected', element === selected);
    });
  }

  function observeRoot() {
    if (!root || root === document) return;

    observer = new MutationObserver(scheduleRefresh);
    observer.observe(root, { childList: true, subtree: true });
  }

  function scheduleRefresh() {
    if (refreshFrame) return;

    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      state.refreshEditables();
      if (isDraftPreviewLoaded) applyDraftToDom();
      else if (!isActive) responsiveGuard.clearAllPositionStyles();
      else refreshEditablesForMode();
    });
  }

  function attachEvents() {
    document.addEventListener('pointerdown', drag.onPointerDown, true);
    window.addEventListener('pointermove', drag.onPointerMove);
    window.addEventListener('pointerup', drag.onPointerUp);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('dblclick', textEdit.onDoubleClick, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
  }

  function detachEvents() {
    document.removeEventListener('pointerdown', drag.onPointerDown, true);
    window.removeEventListener('pointermove', drag.onPointerMove);
    window.removeEventListener('pointerup', drag.onPointerUp);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('dblclick', textEdit.onDoubleClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleResize);
  }

  function handleClick(event) {
    if (!isActive) return;

    const element = event.target.closest(config.editableSelector);
    if (!element || isInsideEditorUi(event.target) || !rootContains(element)) return;

    event.preventDefault();
    event.stopPropagation();
    selectElement(element);
  }

  function handleKeyDown(event) {
    if (!isActive) return;

    if (event.key === 'Escape') {
      if (clipboard.isVisible()) {
        clipboard.hideManualCopyPanel();
        return;
      }
      if (exportPanel.isVisible()) {
        exportPanel.close();
        return;
      }
      if (document.activeElement?.isContentEditable) document.activeElement.blur();
      clearSelection();
      return;
    }

    if (event.key === 'Delete' && visibility.hideSelected()) {
      event.preventDefault();
    }
  }

  function handleResize() {
    updateModeClasses();
    responsiveGuard.applyMobileGuard();
    if (isDraftPreviewLoaded) applyDraftToDom();
  }

  function selectElement(element) {
    if (selected && selected !== element) selected.removeAttribute('data-dm-selected');
    selected = element;
    selected.setAttribute('data-dm-selected', 'true');
  }

  function clearSelection() {
    if (selected) selected.removeAttribute('data-dm-selected');
    selected = null;
  }

  function toggle() {
    if (isActive) disable();
    else enable();
  }

  function updateModeClasses() {
    responsiveGuard.updateModeClasses({ isActive, isDraftPreviewLoaded });
  }

  function showToast(message) {
    toolbar.showToast(message);
  }

  function logExportDebug(exportText, draft = state.buildDraft()) {
    console.info('Design Mode export debug:', {
      exportTextLength: exportText ? exportText.length : 0,
      dirtyItems: getDirtyItems(draft),
      draft,
    });
  }

  function rootContains(element) {
    if (!root || root === document) return true;
    return root.contains(element);
  }

  function setGlobalReference() {
    if (!config.globalName || typeof window === 'undefined') return;
    window[config.globalName] = api;
  }

  function clearGlobalReference() {
    if (!config.globalName || typeof window === 'undefined') return;
    if (window[config.globalName] === api) delete window[config.globalName];
  }

  const api = {
    mount,
    enable,
    disable,
    destroy,
    saveDraft,
    loadDraftPreview,
    resetDraft,
    clearDraft,
    exportInstructions,
    autoTagScan,
    exportAutoTagSuggestions,
  };

  return api;
}

function isInsideEditorUi(target) {
  return Boolean(target.closest('.vde-toolbar, .vde-toggle, .vde-copy-panel'));
}

function getDefaultRoot() {
  return typeof document === 'undefined' ? null : document.body;
}

function isValidRoot(root) {
  return Boolean(root && typeof root.querySelectorAll === 'function' && typeof root.contains === 'function');
}

function warnEditor(message) {
  console.warn(`[Visual Draft Editor] ${message}`);
}
