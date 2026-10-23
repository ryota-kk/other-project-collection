import { isTextEditable } from './state.js';

export function createTextEditController({ state, selectElement, isEnabled, rootContains }) {
  function onDoubleClick(event) {
    if (!isEnabled()) return;

    const element = event.target.closest('[data-edit-id]');
    if (!element || isInsideEditorUi(event.target) || !rootContains(element) || !isTextEditable(element)) return;

    event.preventDefault();
    event.stopPropagation();
    selectElement(element);
    beginTextEdit(element);
  }

  function beginTextEdit(element) {
    element.setAttribute('contenteditable', 'true');
    element.classList.add('vde-text-editing');
    element.focus({ preventScroll: true });
    selectAllText(element);

    const finish = () => {
      element.removeEventListener('blur', finish);
      element.removeAttribute('contenteditable');
      element.classList.remove('vde-text-editing');
      state.updateEntryFromElement(element, state.getEntry(element));
    };

    element.addEventListener('blur', finish);
  }

  return {
    onDoubleClick,
  };
}

function selectAllText(element) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function isInsideEditorUi(target) {
  return Boolean(target.closest('.vde-toolbar, .vde-toggle, .vde-copy-panel'));
}
