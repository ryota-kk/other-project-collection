export function createVisibilityController({ state, getSelected, clearSelection }) {
  function hideSelected() {
    const selected = getSelected();
    if (!selected || document.activeElement?.isContentEditable) return false;

    const entry = state.getEntry(selected);
    state.updateEntryFromElement(selected, entry);
    entry.visible = false;
    state.updateDirtyState(entry, { visibilityChanged: true });
    selected.setAttribute('data-dm-hidden', 'true');
    clearSelection();
    return true;
  }

  function restoreElement(element) {
    const entry = state.getEntry(element);
    element.removeAttribute('data-dm-hidden');
    entry.visible = true;
    state.updateDirtyState(entry, { visibilityChanged: true });
  }

  return {
    hideSelected,
    restoreElement,
  };
}
