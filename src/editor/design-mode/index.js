import './design-mode.css';

export { buildSuggestionPrompt, createAutoTagController } from './autoTag.js';
export { createDesignMode } from './core.js';
export { mountVDELauncher } from './launcher.js';
export {
  buildDirtyChanges,
  exportAsClaudePrompt,
  exportAsCodexPrompt,
  exportAsCoordinatePrompt,
  exportAsCursorPrompt,
  exportAsDeveloperNotes,
  exportAsJson,
  getExportContent,
  getExportRisks,
} from './exporter.js';
