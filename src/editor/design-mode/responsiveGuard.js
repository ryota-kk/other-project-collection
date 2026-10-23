const POSITION_STYLE_PROPS = [
  'transform',
  'left',
  'top',
  'right',
  'bottom',
  'width',
  'height',
  'position',
  'translate',
];

export function createResponsiveGuard(config, state) {
  function isDesktop() {
    return window.innerWidth >= config.desktopMinWidth;
  }

  function updateModeClasses({ isActive, isDraftPreviewLoaded }) {
    document.body.classList.toggle('vde-active', isActive);
    document.body.classList.toggle('vde-mobile', !isDesktop());
    document.body.classList.toggle('vde-draft-preview', isDraftPreviewLoaded);
  }

  function applyDesktopPosition(element, entry, force = false) {
    if (!force && !entry.dirty?.moved) {
      clearPositionStyles(element);
      return;
    }

    element.style.setProperty('--vde-x', `${entry.dx}px`);
    element.style.setProperty('--vde-y', `${entry.dy}px`);
    element.toggleAttribute('data-dm-layout', Math.abs(entry.dx) > 0 || Math.abs(entry.dy) > 0);
  }

  function clearPositionStyles(element) {
    POSITION_STYLE_PROPS.forEach((prop) => element.style.removeProperty(prop));
    element.style.removeProperty('--vde-x');
    element.style.removeProperty('--vde-y');
    element.removeAttribute('data-dm-layout');
  }

  function clearAllPositionStyles() {
    state.getEditables().forEach(clearPositionStyles);
  }

  function applyMobileGuard() {
    if (!isDesktop()) clearAllPositionStyles();
  }

  return {
    isDesktop,
    updateModeClasses,
    applyDesktopPosition,
    clearPositionStyles,
    clearAllPositionStyles,
    applyMobileGuard,
  };
}
