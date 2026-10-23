const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'P', 'SPAN', 'A', 'BUTTON', 'DD', 'DT']);

export function createEditorState(config) {
  const originals = new Map();
  const entries = new Map();
  const movePxThreshold = config.movePxThreshold ?? 8;
  const movePercentThreshold = config.movePercentThreshold ?? 0.5;

  function getEditables() {
    const root = config.root || document;
    const editables = [...root.querySelectorAll(config.editableSelector)];
    if (root !== document && root.matches?.(config.editableSelector)) {
      editables.unshift(root);
    }
    return [...new Set(editables)];
  }

  function refreshEditables() {
    getEditables().forEach((element) => {
      const editId = getEditId(element);
      if (!editId) return;

      if (!originals.has(editId)) {
        originals.set(editId, createInitialState(element));
      }

      if (!entries.has(editId)) {
        entries.set(editId, createEntryFromElement(element));
      }
    });
  }

  function recordInitialStates() {
    originals.clear();
    getEditables().forEach((element) => {
      const editId = getEditId(element);
      if (editId) originals.set(editId, createInitialState(element));
    });
  }

  function resetWorkingDraftFromDom() {
    entries.clear();
    getEditables().forEach((element) => {
      const editId = getEditId(element);
      if (editId) entries.set(editId, createEntryFromElement(element));
    });
  }

  function createInitialState(element) {
    const rect = element.getBoundingClientRect();
    const initialVisible = !element.hasAttribute('data-dm-hidden');
    const initialText = getEditableText(element);

    return {
      editId: getEditId(element),
      label: getEditLabel(element),
      role: getEditRole(element),
      group: getEditGroup(element),
      section: getEditSection(element),
      lockMove: isMoveLocked(element),
      childEditableCount: countChildEditables(element),
      tagName: element.tagName.toLowerCase(),
      parent: getParentInfo(element),
      initialX: Math.round(rect.left),
      initialY: Math.round(rect.top),
      initialWidth: Math.round(rect.width),
      initialHeight: Math.round(rect.height),
      initialLabel: getEditLabel(element),
      initialText,
      initialVisible,
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      text: initialText,
      visible: initialVisible,
      xPercent: toPercent(rect.left, window.innerWidth),
      yPercent: toPercent(rect.top, window.innerHeight),
    };
  }

  function createEntryFromElement(element) {
    const rect = element.getBoundingClientRect();

    return {
      editId: getEditId(element),
      label: getEditLabel(element),
      role: getEditRole(element),
      group: getEditGroup(element),
      section: getEditSection(element),
      lockMove: isMoveLocked(element),
      childEditableCount: countChildEditables(element),
      tagName: element.tagName.toLowerCase(),
      parent: getParentInfo(element),
      dx: 0,
      dy: 0,
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      xPercent: toPercent(rect.left, window.innerWidth),
      yPercent: toPercent(rect.top, window.innerHeight),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      text: getEditableText(element),
      visible: !element.hasAttribute('data-dm-hidden'),
      dirty: createCleanDirty(),
    };
  }

  function createEntryFromDraft(editId, draftItem, element) {
    const rect = element.getBoundingClientRect();
    const dirty = normalizeDirty(draftItem.dirty);
    const xPercent = numberOr(draftItem.xPercent, toPercent(numberOr(draftItem.x, rect.left), window.innerWidth));
    const yPercent = numberOr(draftItem.yPercent, toPercent(numberOr(draftItem.y, rect.top), window.innerHeight));
    const targetX = dirty.moved ? fromPercent(xPercent, window.innerWidth) : rect.left;
    const targetY = dirty.moved ? fromPercent(yPercent, window.innerHeight) : rect.top;

    return {
      editId,
      label: typeof draftItem.label === 'string' ? draftItem.label : getEditLabel(element),
      role: typeof draftItem.role === 'string' ? draftItem.role : getEditRole(element),
      group: typeof draftItem.group === 'string' ? draftItem.group : getEditGroup(element),
      section: typeof draftItem.section === 'string' ? draftItem.section : getEditSection(element),
      lockMove: Boolean(draftItem.lockMove || isMoveLocked(element)),
      childEditableCount: Number(draftItem.childEditableCount) || countChildEditables(element),
      tagName: element.tagName.toLowerCase(),
      parent: draftItem.parent || getParentInfo(element),
      dx: Math.round(targetX - rect.left),
      dy: Math.round(targetY - rect.top),
      x: Math.round(targetX),
      y: Math.round(targetY),
      xPercent,
      yPercent,
      width: Math.round(numberOr(draftItem.width, rect.width)),
      height: Math.round(numberOr(draftItem.height, rect.height)),
      text: typeof draftItem.text === 'string' ? draftItem.text : getEditableText(element),
      visible: draftItem.visible !== false,
      dirty,
    };
  }

  function getEntry(element) {
    const editId = getEditId(element);
    if (!entries.has(editId)) entries.set(editId, createEntryFromElement(element));
    return entries.get(editId);
  }

  function setEntry(editId, entry) {
    entries.set(editId, entry);
  }

  function clearEntries() {
    entries.clear();
  }

  function updateEntryFromElement(element, entry, options = {}) {
    const rect = element.getBoundingClientRect();
    entry.x = Math.round(rect.left);
    entry.y = Math.round(rect.top);
    entry.xPercent = toPercent(rect.left, window.innerWidth);
    entry.yPercent = toPercent(rect.top, window.innerHeight);
    entry.width = Math.round(rect.width);
    entry.height = Math.round(rect.height);
    entry.label = getEditLabel(element);
    entry.role = getEditRole(element);
    entry.group = getEditGroup(element);
    entry.section = getEditSection(element);
    entry.lockMove = isMoveLocked(element);
    entry.childEditableCount = countChildEditables(element);
    entry.tagName = element.tagName.toLowerCase();
    entry.parent = getParentInfo(element);
    entry.text = getEditableText(element);
    entry.visible = !element.hasAttribute('data-dm-hidden');
    updateDirtyState(entry, options);
  }

  function updateDirtyState(entry, options = {}) {
    const initial = originals.get(entry.editId);
    if (!initial) return;

    entry.dirty = entry.dirty || createCleanDirty();

    if (options.movedByUser) {
      entry.dirty.moved = hasMoved(entry, initial);
    }

    entry.dirty.textChanged = entry.text !== initial.initialText;
    entry.dirty.visibilityChanged = entry.visible !== initial.initialVisible;
  }

  function hasMoved(entry, initial) {
    const xDelta = Math.abs(entry.x - initial.initialX);
    const yDelta = Math.abs(entry.y - initial.initialY);
    const xPercentDelta = Math.abs(entry.xPercent - initial.xPercent);
    const yPercentDelta = Math.abs(entry.yPercent - initial.yPercent);

    return (
      xDelta >= movePxThreshold ||
      yDelta >= movePxThreshold ||
      xPercentDelta >= movePercentThreshold ||
      yPercentDelta >= movePercentThreshold
    );
  }

  function buildDraft() {
    const items = {};
    entries.forEach((entry, editId) => {
      const dirty = normalizeDirty(entry.dirty);
      items[editId] = {
        x: Math.round(entry.x),
        y: Math.round(entry.y),
        xPercent: roundOne(entry.xPercent),
        yPercent: roundOne(entry.yPercent),
        width: Math.round(entry.width || 0),
        height: Math.round(entry.height || 0),
        label: entry.label || editId,
        role: entry.role || '',
        group: entry.group || '',
        section: entry.section || '',
        lockMove: Boolean(entry.lockMove),
        childEditableCount: Number(entry.childEditableCount) || 0,
        tagName: entry.tagName || '',
        parent: entry.parent || null,
        coordinateReference: buildCoordinateReference(entry),
        text: entry.text,
        visible: entry.visible !== false,
        dirty: { ...dirty },
        layoutIntent: dirty.moved ? inferLayoutIntent(entry, [...entries.values()]) : null,
      };
    });

    return {
      version: 1,
      mode: 'draft-only',
      exportTitle: config.exportTitle,
      previewStrategy: config.previewStrategy || 'translate',
      implementationStrategy: config.implementationStrategy || 'normal-flow-layout',
      coordinateMode: config.coordinateMode || 'root-container',
      positioningRootSelector: config.positioningRootSelector || '',
      mobileBreakpoint: config.mobileBreakpoint || config.desktopMinWidth || 768,
      preventRootMove: config.preventRootMove !== false,
      coordinateContext: buildCoordinateContext(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      items,
    };
  }

  function clearAll() {
    originals.clear();
    entries.clear();
  }

  return {
    originals,
    entries,
    getEditables,
    refreshEditables,
    recordInitialStates,
    resetWorkingDraftFromDom,
    createEntryFromElement,
    createEntryFromDraft,
    getEntry,
    setEntry,
    clearEntries,
    updateEntryFromElement,
    updateDirtyState,
    buildDraft,
    inferLayoutIntent,
    isMoveLocked,
    clearAll,
  };

  function inferLayoutIntent(entry, allEntries = [...entries.values()]) {
    const initial = originals.get(entry.editId);
    const movedX = initial ? Math.round(entry.x - initial.initialX) : 0;
    const movedY = initial ? Math.round(entry.y - initial.initialY) : 0;
    const verticalMove = Math.abs(movedY) >= Math.abs(movedX);
    const horizontalMove = Math.abs(movedX) > Math.abs(movedY);
    const references = allEntries.filter((candidate) => candidate.editId !== entry.editId && isLayoutReference(candidate));
    const nearestBefore = findNearestBefore(entry, references);
    const nearestAfter = findNearestAfter(entry, references);
    const alignWith = findAlignedReference(entry, references) || entry.parent;
    const moveAsSection = shouldMoveAsSection(entry);
    const likelyMicroAdjustment = Math.abs(movedX) < 16 && Math.abs(movedY) < 16;

    return {
      moveAsSection,
      keepInNormalFlow: true,
      avoidMovingRoot: true,
      placeAfter: nearestBefore?.editId || '',
      placeAfterLabel: nearestBefore?.label || '',
      placeBefore: nearestAfter?.editId || '',
      placeBeforeLabel: nearestAfter?.label || '',
      alignWith: alignWith?.editId || alignWith?.selector || '',
      alignWithLabel: alignWith?.label || '',
      sameParent: Boolean(initial?.parent?.id && initial.parent.id === entry.parent?.id),
      parent: entry.parent || null,
      nearestBefore: toReferenceInfo(nearestBefore),
      nearestAfter: toReferenceInfo(nearestAfter),
      verticalMove,
      horizontalMove,
      nearContainerLeft: alignWith ? Math.abs(entry.x - alignWith.x) <= 24 : false,
      nearContainerRight: alignWith ? Math.abs(entry.x + entry.width - (alignWith.x + alignWith.width)) <= 24 : false,
      nearContainerWidth: alignWith ? Math.abs(entry.width - alignWith.width) <= 32 : false,
      avoidAbsolutePosition: true,
      keepResponsive: true,
      likelyMicroAdjustment,
      likelyLayoutAction: buildLikelyLayoutAction(entry, nearestBefore, nearestAfter),
    };
  }

  function findNearestBefore(entry, references) {
    const top = entry.y;
    return references
      .filter((candidate) => candidate.y + candidate.height <= top + 24)
      .sort((a, b) => b.y + b.height - (a.y + a.height))[0];
  }

  function findNearestAfter(entry, references) {
    const bottom = entry.y + entry.height;
    return references
      .filter((candidate) => candidate.y >= bottom - 24)
      .sort((a, b) => a.y - b.y)[0];
  }

  function findAlignedReference(entry, references) {
    return references
      .filter((candidate) => Math.abs(candidate.x - entry.x) <= 32 || Math.abs(candidate.width - entry.width) <= 48)
      .sort((a, b) => Math.abs(a.x - entry.x) + Math.abs(a.width - entry.width) - (Math.abs(b.x - entry.x) + Math.abs(b.width - entry.width)))[0];
  }

  function isLayoutReference(entry) {
    const role = entry.role || '';
    const id = entry.editId || '';
    return (
      ['section', 'card-grid', 'panel', 'main', 'form', 'container', 'cards', 'toolbar'].includes(role) ||
      ['section', 'main', 'form', 'article', 'header', 'footer'].includes(entry.tagName) ||
      /\.(section|cards|panel|grid|main|feedback|contact)/.test(id)
    );
  }

  function shouldMoveAsSection(entry) {
    return (
      ['section', 'card-grid', 'panel', 'main', 'form', 'container'].includes(entry.role || '') ||
      ['section', 'main', 'form', 'article'].includes(entry.tagName) ||
      /\.(section|cards|panel|grid)/.test(entry.editId || '')
    );
  }

  function buildLikelyLayoutAction(entry, before, after) {
    if (before && after) return `Move ${entry.editId} after ${before.editId} and before ${after.editId} in the normal document flow.`;
    if (before) return `Move ${entry.editId} after ${before.editId} in the normal document flow.`;
    if (after) return `Move ${entry.editId} before ${after.editId} in the normal document flow.`;
    return `Move ${entry.editId} in the normal document flow and use coordinates only as visual reference.`;
  }

  function toReferenceInfo(entry) {
    if (!entry) return null;
    return {
      id: entry.editId,
      label: entry.label || entry.editId,
      role: entry.role || '',
      group: entry.group || '',
    };
  }

  function getParentInfo(element) {
    const parent = element.parentElement?.closest?.('[data-edit-id]');
    if (parent && parent !== element) {
      const rect = parent.getBoundingClientRect();
      return {
        id: getEditId(parent),
        label: getEditLabel(parent),
        selector: buildElementSelector(parent),
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }

    const root = config.root && config.root !== document ? config.root : null;
    if (root?.getBoundingClientRect) {
      const rect = root.getBoundingClientRect();
      return {
        id: root.id || '',
        label: root.getAttribute?.('data-edit-label') || root.id || 'root',
        selector: buildElementSelector(root),
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }

    return null;
  }

  function buildCoordinateReference(entry) {
    const context = buildCoordinateContext();
    const referenceRect =
      config.coordinateMode === 'parent-container' && entry.parent
        ? entry.parent
        : context.rootRect || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };

    return {
      mode: context.coordinateMode,
      positioningRoot: context.positioningRoot,
      leftVw: roundOne(entry.xPercent),
      topVh: roundOne(entry.yPercent),
      widthVw: roundOne((Number(entry.width) / Math.max(window.innerWidth, 1)) * 100),
      leftPxInRoot: Math.round(Number(entry.x) - Number(referenceRect.x || 0)),
      topPxInRoot: Math.round(Number(entry.y) - Number(referenceRect.y || 0)),
      leftPercentInRoot: roundOne(((Number(entry.x) - Number(referenceRect.x || 0)) / Math.max(Number(referenceRect.width), 1)) * 100),
      topPercentInRoot: roundOne(((Number(entry.y) - Number(referenceRect.y || 0)) / Math.max(Number(referenceRect.height), 1)) * 100),
    };
  }

  function buildCoordinateContext() {
    const positioningRoot = getPositioningRoot();
    const rect = positioningRoot?.getBoundingClientRect?.();
    const style = positioningRoot ? window.getComputedStyle?.(positioningRoot) : null;

    return {
      coordinateMode: config.coordinateMode || 'root-container',
      positioningRoot: getPositioningRootSelector(positioningRoot),
      rootRect: rect
        ? {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        : null,
      rootPadding: style
        ? {
            top: parseCssPixels(style.paddingTop),
            right: parseCssPixels(style.paddingRight),
            bottom: parseCssPixels(style.paddingBottom),
            left: parseCssPixels(style.paddingLeft),
          }
        : null,
    };
  }

  function getPositioningRoot() {
    if (config.coordinateMode === 'viewport') return null;

    if (config.positioningRootSelector) {
      const configuredRoot = document.querySelector(config.positioningRootSelector);
      if (configuredRoot) return configuredRoot;
    }

    if (config.root && config.root !== document) return config.root;
    return document.body;
  }

  function getPositioningRootSelector(element) {
    if (!element) return 'viewport';
    if (config.positioningRootSelector) return config.positioningRootSelector;
    return buildElementSelector(element);
  }

  function countChildEditables(element) {
    return element?.querySelectorAll?.('[data-edit-id]')?.length || 0;
  }

  function isMoveLocked(elementOrEntry) {
    if (!elementOrEntry) return false;
    if (typeof elementOrEntry.getAttribute === 'function') {
      return elementOrEntry.getAttribute('data-edit-lock-move') === 'true' || getEditRole(elementOrEntry) === 'root';
    }

    return elementOrEntry.lockMove === true || elementOrEntry.role === 'root';
  }
}

export function createCleanDirty() {
  return {
    moved: false,
    textChanged: false,
    visibilityChanged: false,
  };
}

export function normalizeDirty(dirty) {
  return {
    moved: Boolean(dirty?.moved),
    textChanged: Boolean(dirty?.textChanged),
    visibilityChanged: Boolean(dirty?.visibilityChanged),
  };
}

export function getEditId(element) {
  return element?.getAttribute('data-edit-id') || '';
}

export function getEditLabel(element) {
  return element?.getAttribute('data-edit-label') || getEditId(element);
}

export function getEditRole(element) {
  return element?.getAttribute('data-edit-role') || '';
}

export function getEditGroup(element) {
  return element?.getAttribute('data-edit-group') || '';
}

export function getEditSection(element) {
  return element?.getAttribute('data-edit-section') || '';
}

export function getEditLockMove(element) {
  return element?.getAttribute('data-edit-lock-move') === 'true' || getEditRole(element) === 'root';
}

export function getEditableText(element) {
  if (!isTextEditable(element)) return '';
  return element.innerText.replace(/\s+/g, ' ').trim();
}

export function setEditableText(element, text) {
  element.textContent = text;
}

export function isTextEditable(element) {
  if (!element || !TEXT_TAGS.has(element.tagName)) return false;
  return !element.querySelector('[data-edit-id], img, video, svg, input, textarea, select');
}

export function toPercent(value, base) {
  if (!base) return 0;
  return roundOne((Number(value) / base) * 100);
}

export function fromPercent(value, base) {
  return (Number(value) / 100) * base;
}

export function roundOne(value) {
  return Math.round(Number(value) * 10) / 10;
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseCssPixels(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? roundOne(number) : 0;
}

function buildElementSelector(element) {
  if (!element) return '';
  const tag = element.tagName?.toLowerCase() || 'element';
  if (element.id) return `${tag}#${cssSafe(element.id)}`;

  const className = typeof element.className === 'string' ? element.className.trim() : '';
  const classes = className
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => `.${cssSafe(name)}`)
    .join('');

  return `${tag}${classes}`;
}

function cssSafe(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}
