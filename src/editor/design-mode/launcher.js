import './design-mode.css';
import { createDesignMode } from './core.js';

const DEFAULT_LAUNCHER_OPTIONS = {
  rootSelector: '#app',
  storageKey: 'visual-draft-editor-draft',
  editableSelector: '[data-edit-id]',
  exportTitle: '当前页面',
  desktopMinWidth: 768,
  draftOnly: true,
  implementationStrategy: 'normal-flow-layout',
  coordinateMode: 'root-container',
  positioningRootSelector: '',
  mobileBreakpoint: 768,
  preventRootMove: true,
  globalName: 'visualDraftEditor',
  autoEnable: false,
};

export function mountVDELauncher(options = {}) {
  if (typeof document === 'undefined') return null;

  const settings = {
    ...DEFAULT_LAUNCHER_OPTIONS,
    ...options,
  };

  const root = settings.root || document.querySelector(settings.rootSelector);
  if (!root) {
    console.warn(`[Visual Draft Editor] launcher root not found: ${settings.rootSelector}`);
    return null;
  }

  const editor = createDesignMode({
    root,
    storageKey: settings.storageKey,
    editableSelector: settings.editableSelector,
    exportTitle: settings.exportTitle,
    desktopMinWidth: settings.desktopMinWidth,
    draftOnly: settings.draftOnly,
    implementationStrategy: settings.implementationStrategy,
    coordinateMode: settings.coordinateMode,
    positioningRootSelector: settings.positioningRootSelector || settings.rootSelector,
    mobileBreakpoint: settings.mobileBreakpoint,
    preventRootMove: settings.preventRootMove,
    autoTagNamespace: settings.autoTagNamespace,
    autoTagGroup: settings.autoTagGroup,
    globalName: settings.globalName,
  });

  editor.mount();
  if (settings.autoEnable) editor.enable();
  return editor;
}
