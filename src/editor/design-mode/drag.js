export function createDragController({ state, responsiveGuard, selectElement, isEnabled, rootContains, preventRootMove, showToast }) {
  let drag = null;

  function onPointerDown(event) {
    if (!isEnabled() || !responsiveGuard.isDesktop() || event.button !== 0) return;

    const element = getDragTarget(event.target);
    if (!element || isInsideEditorUi(event.target) || !rootContains(element)) return;
    if (element.isContentEditable) return;

    event.preventDefault();
    event.stopPropagation();

    state.refreshEditables();
    selectElement(element);

    if (state.isMoveLocked(element) && preventRootMove()) {
      showToast?.('当前元素是页面根容器，不建议移动。请移动内部 section 或内容块，避免子元素坐标叠加。');
      return;
    }

    const entry = state.getEntry(element);
    drag = {
      element,
      startX: event.clientX,
      startY: event.clientY,
      baseX: entry.dx,
      baseY: entry.dy,
      moved: false,
    };
  }

  function onPointerMove(event) {
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 3) return;

    drag.moved = true;
    const entry = state.getEntry(drag.element);
    entry.dx = Math.round(drag.baseX + dx);
    entry.dy = Math.round(drag.baseY + dy);
    responsiveGuard.applyDesktopPosition(drag.element, entry, true);
    state.updateEntryFromElement(drag.element, entry);
  }

  function onPointerUp() {
    if (drag?.moved) {
      state.updateEntryFromElement(drag.element, state.getEntry(drag.element), { movedByUser: true });
    }
    drag = null;
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}

function getDragTarget(target) {
  return target.closest('[data-edit-id]');
}

function isInsideEditorUi(target) {
  return Boolean(target.closest('.vde-toolbar, .vde-toggle, .vde-copy-panel'));
}
