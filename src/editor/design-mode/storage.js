export function createDraftStorage(storageKey, legacyStorageKey) {
  function getStorageKey() {
    return storageKey;
  }

  function saveDraft(draft) {
    const storage = getLocalStorage();
    if (!storage) {
      console.warn('Design Mode draft could not be saved because localStorage is unavailable.');
      return false;
    }

    storage.setItem(storageKey, JSON.stringify(draft, null, 2));
    if (legacyStorageKey) storage.removeItem(legacyStorageKey);
    return true;
  }

  function loadDraft() {
    try {
      const storage = getLocalStorage();
      if (!storage) return null;

      const raw = storage.getItem(storageKey);
      if (!raw) return null;
      return normalizeDraft(JSON.parse(raw));
    } catch (error) {
      console.warn('Design Mode draft could not be loaded.', error);
      return null;
    }
  }

  function clearDraft() {
    const storage = getLocalStorage();
    if (!storage) return false;

    storage.removeItem(storageKey);
    if (legacyStorageKey) storage.removeItem(legacyStorageKey);
    return true;
  }

  return {
    getStorageKey,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}

function getLocalStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch (error) {
    console.warn('Design Mode localStorage is unavailable.', error);
    return null;
  }
}

function normalizeDraft(draft) {
  if (!draft || typeof draft !== 'object' || !draft.items) return null;

  return {
    version: 1,
    mode: 'draft-only',
    exportTitle: draft.exportTitle || '',
    viewportWidth: Number(draft.viewportWidth) || getViewportWidth(),
    viewportHeight: Number(draft.viewportHeight) || getViewportHeight(),
    items: draft.items,
  };
}

function getViewportWidth() {
  return typeof window === 'undefined' ? 0 : window.innerWidth;
}

function getViewportHeight() {
  return typeof window === 'undefined' ? 0 : window.innerHeight;
}
