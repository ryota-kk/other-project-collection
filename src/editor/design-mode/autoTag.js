const CANDIDATE_SELECTOR = [
  'h1',
  'h2',
  'h3',
  'p',
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'form',
  'section',
  'main',
  'header',
  'footer',
  'article',
  'aside',
  'div',
].join(',');

const SEMANTIC_PATTERNS = [
  ['hero', 'hero'],
  ['upload', 'upload'],
  ['preview', 'preview'],
  ['original', 'preview.original'],
  ['svg', 'preview.svg'],
  ['setting', 'settings'],
  ['settings', 'settings'],
  ['action', 'actions'],
  ['actions', 'actions'],
  ['generate', 'actions.generate'],
  ['download', 'actions.download'],
  ['card', 'card'],
  ['result', 'result'],
  ['toolbar', 'toolbar'],
  ['nav', 'nav'],
];

export function createAutoTagController({ config, getRoot, copyToClipboard, showToast }) {
  let suggestions = [];

  function scan() {
    clear();

    const root = getRoot();
    if (!root || typeof root.querySelectorAll !== 'function') {
      showToast('Auto Tag root 不存在');
      return [];
    }

    const counters = new Map();
    const namespace = normalizeNamespace(config.autoTagNamespace || config.namespace || '');
    const group = normalizeNamespace(config.autoTagGroup || 'home');
    const rootCandidate = shouldIncludeRootCandidate(root) ? [root] : [];
    const candidates = [...rootCandidate, ...root.querySelectorAll(CANDIDATE_SELECTOR)].filter(shouldSuggestElement);

    suggestions = candidates.map((element, index) => {
      const suggestion = createSuggestion(element, { index, counters, namespace, group, root });
      element.setAttribute('data-vde-auto-id', `auto.${index + 1}`);
      element.setAttribute('data-vde-auto-suggested-id', suggestion.suggestedEditId);
      return suggestion;
    });

    showToast(suggestions.length ? `已生成 ${suggestions.length} 个 data-edit-id 建议` : '没有发现需要自动标记的元素');
    return suggestions;
  }

  function clear() {
    const root = getRoot();
    if (!root || typeof root.querySelectorAll !== 'function') return;

    if (root.hasAttribute?.('data-vde-auto-id')) {
      root.removeAttribute('data-vde-auto-id');
      root.removeAttribute('data-vde-auto-suggested-id');
    }

    root.querySelectorAll('[data-vde-auto-id]').forEach((element) => {
      element.removeAttribute('data-vde-auto-id');
      element.removeAttribute('data-vde-auto-suggested-id');
    });
    suggestions = [];
  }

  async function exportSuggestions() {
    if (!suggestions.length) scan();

    const text = buildSuggestionPrompt({
      suggestions,
      pageName: config.exportTitle || '当前页面',
    });

    if (!text.trim()) {
      showToast('当前没有可导出的自动标记建议');
      return false;
    }

    return copyToClipboard(text);
  }

  function getSuggestions() {
    return [...suggestions];
  }

  function destroy() {
    clear();
  }

  return {
    scan,
    clear,
    exportSuggestions,
    getSuggestions,
    destroy,
  };
}

export function buildSuggestionPrompt({ suggestions, pageName }) {
  if (!suggestions?.length) return '';

  return [
    '请给当前页面中的主要 UI 元素添加 data-edit-id / data-edit-label。',
    '',
    `页面名称：${pageName}`,
    '',
    '建议添加：',
    '',
    suggestions.map(formatSuggestion).join('\n\n'),
    '',
    '要求：',
    '- 请把这些属性写入对应 React / Vue / HTML 源码中。',
    '- 不要只在运行时 DOM 中添加。',
    '- 不要影响现有功能。',
    '- 不要修改业务逻辑。',
    '- 不要影响上传、生成 SVG、下载、预览等功能。',
  ].join('\n');
}

function formatSuggestion(suggestion, index) {
  const lines = [
    `${index + 1}. ${suggestion.suggestedLabel}`,
    `   selector: ${suggestion.selector}`,
    `   tagName: ${suggestion.tagName}`,
  ];

  if (suggestion.textContent) lines.push(`   当前文字：${suggestion.textContent}`);
  if (suggestion.className) lines.push(`   className: ${suggestion.className}`);
  if (suggestion.role) lines.push(`   role: ${suggestion.role}`);

  lines.push('   建议：');
  lines.push(`   data-edit-id="${suggestion.suggestedEditId}"`);
  lines.push(`   data-edit-label="${suggestion.suggestedLabel}"`);
  if (suggestion.suggestedRole) lines.push(`   data-edit-role="${suggestion.suggestedRole}"`);
  if (suggestion.suggestedGroup) lines.push(`   data-edit-group="${suggestion.suggestedGroup}"`);
  if (suggestion.suggestedLockMove) lines.push('   data-edit-lock-move="true"');

  return lines.join('\n');
}

function shouldIncludeRootCandidate(root) {
  if (!root || root === document || root === document.body || typeof root.matches !== 'function') return false;
  return root.matches(CANDIDATE_SELECTOR);
}

function shouldSuggestElement(element) {
  if (!element || element.hasAttribute('data-edit-id')) return false;
  if (element.closest('.vde-toolbar, .vde-toggle, .vde-copy-panel, .vde-export-panel')) return false;
  if (element.closest('[data-edit-id]')) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 16 || rect.height < 12) return false;

  const tag = element.tagName.toLowerCase();
  if (['h1', 'h2', 'h3', 'button', 'a', 'input', 'textarea', 'select', 'form', 'main', 'header', 'footer', 'section'].includes(tag)) {
    return true;
  }

  if (tag === 'p') return getText(element).length >= 8;
  if (tag === 'article' || tag === 'aside') return true;

  return hasSemanticHint(element);
}

function createSuggestion(element, { counters, namespace, group, root }) {
  const tag = element.tagName.toLowerCase();
  const semantic = inferSemanticKey(element);
  const fallbackType = getFallbackType(tag);
  const key = semantic || fallbackType;
  const count = incrementCounter(counters, key);
  const suffix = semantic ? semantic : `${fallbackType}.${count}`;
  const suggestedEditId = namespace ? `${namespace}.${suffix}` : `auto.${suffix}`;

  return {
    suggestedEditId,
    suggestedLabel: inferLabel(element, semantic || fallbackType, count),
    suggestedRole: inferSuggestedRole(element, semantic || fallbackType, root),
    suggestedGroup: group,
    suggestedLockMove: shouldSuggestLockMove(element, root),
    selector: buildSelector(element, root),
    tagName: tag,
    textContent: truncate(getText(element), 80),
    className: typeof element.className === 'string' ? element.className.trim() : '',
    role: element.getAttribute('role') || inferRole(element),
  };
}

function inferSuggestedRole(element, key, root) {
  const tag = element.tagName.toLowerCase();
  if (shouldSuggestLockMove(element, root)) return 'root';
  if (key.includes('card') || key.includes('cards')) return 'card-grid';
  if (key.includes('panel') || key.includes('settings') || key.includes('preview')) return 'panel';
  if (key.includes('actions')) return 'actions';
  if (['section', 'main', 'header', 'footer', 'form', 'article', 'aside'].includes(tag)) return 'section';
  if (['h1', 'h2', 'h3'].includes(tag)) return 'heading';
  if (['button', 'a'].includes(tag)) return 'button';
  if (['input', 'textarea', 'select'].includes(tag)) return 'field';
  return 'element';
}

function shouldSuggestLockMove(element, root) {
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  const hint = getElementHint(element);
  if (element === root && ['main', 'section', 'div'].includes(tag)) return true;
  if (tag === 'main' && (hint.includes('root') || hint.includes('page') || hint.includes('home') || hint.includes('app'))) return true;
  if (hint.includes('page-root') || hint.includes('root-container') || hint.includes('home-page')) return true;
  return false;
}

function inferSemanticKey(element) {
  const tag = element.tagName.toLowerCase();
  const text = getText(element).toLowerCase();
  const hint = getElementHint(element);

  if (tag === 'h1') return 'hero.title';
  if (tag === 'h2') return 'section.title';
  if (tag === 'h3') return 'card.title';
  if (tag === 'form') return 'form';
  if (tag === 'header') return 'header';
  if (tag === 'footer') return 'footer';
  if (tag === 'main') return 'main';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return inferFieldKey(element);

  if (tag === 'button' || tag === 'a') {
    if (containsAny(`${text} ${hint}`, ['上传', 'upload'])) return 'upload.button';
    if (containsAny(`${text} ${hint}`, ['生成', 'generate', '转换', 'convert'])) return 'actions.generate';
    if (containsAny(`${text} ${hint}`, ['下载', 'download', '保存', 'save'])) return 'actions.download';
    if (containsAny(`${text} ${hint}`, ['复制', 'copy'])) return 'actions.copy';
    return 'actions.button';
  }

  if (['section', 'div', 'article', 'aside'].includes(tag)) {
    if (hint.includes('upload') || text.includes('upload') || text.includes('上传')) return 'upload.section';
    if (hint.includes('preview') || text.includes('preview') || text.includes('预览')) return 'preview';
    if (hint.includes('actions') || hint.includes('action')) return 'actions';
    if (hint.includes('settings') || hint.includes('setting') || text.includes('设置')) return 'settings.panel';
    if (hint.includes('card')) return 'card';
  }

  for (const [pattern, key] of SEMANTIC_PATTERNS) {
    if (hint.includes(pattern) || text.includes(pattern)) return key;
  }

  return '';
}

function inferFieldKey(element) {
  const type = element.getAttribute('type') || element.tagName.toLowerCase();
  const hint = getElementHint(element);

  if (hint.includes('upload') || type === 'file') return 'upload.input';
  if (hint.includes('color')) return 'settings.color';
  if (hint.includes('size')) return 'settings.size';
  return `field.${type}`;
}

function inferLabel(element, key, count) {
  const tag = element.tagName.toLowerCase();
  const text = truncate(getText(element), 28);

  if (text && ['button', 'a'].includes(tag)) return `${text}按钮`;
  if (text && ['h1', 'h2', 'h3'].includes(tag)) return text;

  const labels = {
    'hero.title': '页面主标题',
    'section.title': '区块标题',
    'card.title': '卡片标题',
    'upload.section': '上传区域',
    'upload.button': '上传按钮',
    'upload.input': '上传输入',
    'settings': '设置区域',
    'settings.panel': '设置面板',
    'settings.color': '颜色设置',
    'settings.size': '尺寸设置',
    'actions': '操作区域',
    'actions.button': '操作按钮',
    'actions.generate': '生成按钮',
    'actions.download': '下载按钮',
    'actions.copy': '复制按钮',
    'preview': '预览区域',
    'preview.original': '原图预览',
    'preview.svg': 'SVG 预览',
    card: '卡片容器',
    form: '表单区域',
    header: '页头区域',
    footer: '页脚区域',
    main: '页面主体',
  };

  return labels[key] || `${tag} 元素 ${count}`;
}

function inferRole(element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'field';
  if (tag === 'form') return 'form';
  if (['main', 'header', 'footer'].includes(tag)) return tag;
  return '';
}

function hasSemanticHint(element) {
  const hint = getElementHint(element);
  return SEMANTIC_PATTERNS.some(([pattern]) => hint.includes(pattern));
}

function getElementHint(element) {
  return [
    element.id,
    element.className,
    element.getAttribute('aria-label'),
    element.getAttribute('name'),
    element.getAttribute('type'),
    element.getAttribute('placeholder'),
    element.getAttribute('data-testid'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function buildSelector(element, root) {
  const tag = element.tagName.toLowerCase();
  if (element.id) return `${tag}#${cssSafe(element.id)}`;

  const className = typeof element.className === 'string' ? element.className.trim() : '';
  const classes = className
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => `.${cssSafe(name)}`)
    .join('');

  if (classes) return `${tag}${classes}`;

  const index = [...(root || document).querySelectorAll(tag)].indexOf(element) + 1;
  return `${tag}:nth-of-type(${Math.max(index, 1)})`;
}

function cssSafe(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function getFallbackType(tag) {
  if (['button', 'a'].includes(tag)) return 'button';
  if (['section', 'main', 'header', 'footer', 'form', 'article', 'aside'].includes(tag)) return tag;
  if (['input', 'textarea', 'select'].includes(tag)) return 'field';
  return 'element';
}

function incrementCounter(counters, key) {
  const next = (counters.get(key) || 0) + 1;
  counters.set(key, next);
  return next;
}

function normalizeNamespace(namespace) {
  return String(namespace || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.-]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function getText(element) {
  if (element.matches('input, textarea, select')) {
    return element.getAttribute('placeholder') || element.getAttribute('aria-label') || element.getAttribute('name') || '';
  }

  return element.innerText?.replace(/\s+/g, ' ').trim() || '';
}

function truncate(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}
