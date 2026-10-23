import { normalizeDirty, roundOne } from './state.js';

export const EXPORT_TYPES = ['codex', 'claude', 'cursor', 'developer', 'coordinate', 'json'];

const TOOL_NAME = 'Visual Draft Editor';
const EMPTY_MESSAGE = '当前没有可导出的修改内容。';

export function getExportContent(type, state, config = {}) {
  const context = normalizeExportContext(state, config);

  if (type === 'json') return exportAsJson(context);
  if (!context.changes.length) return '';
  if (type === 'claude') return exportAsClaudePrompt(context);
  if (type === 'cursor') return exportAsCursorPrompt(context);
  if (type === 'developer') return exportAsDeveloperNotes(context);
  if (type === 'coordinate') return exportAsCoordinatePrompt(context);
  return exportAsCodexPrompt(context);
}

export function exportAsCodexPrompt(state, config = {}) {
  const context = normalizeExportContext(state, config);
  if (!context.changes.length) return '';

  const moveLines = getChangesByType(context.changes, 'move').map(formatCodexLayoutIntent);
  const textLines = getChangesByType(context.changes, 'text').map(
    (change) => `- ${formatName(change)}：从“${change.before.text}”修改为“${change.after.text}”`
  );
  const visibilityLines = getChangesByType(context.changes, 'visibility').map((change) => {
    const action = change.after.visible ? '显示' : '隐藏';
    return `- ${formatName(change)}：${action}`;
  });

  return [
    '请根据以下 Visual Draft Editor 草稿修改当前页面。',
    '',
    `页面名称：${context.page}`,
    `当前编辑宽度：${context.viewport.width}px`,
    `当前编辑高度：${context.viewport.height}px`,
    '',
    formatStrategyBlock(context),
    formatRiskBlock(context),
    '',
    '被移动的组件：',
    moveLines.length ? moveLines.join('\n') : '- 无',
    '',
    '修改过的文字：',
    textLines.length ? textLines.join('\n') : '- 无',
    '',
    '被隐藏的组件：',
    visibilityLines.length ? visibilityLines.join('\n') : '- 无',
    '',
    '重要要求：',
    ...getSharedLayoutConstraints(context).map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

export function exportAsClaudePrompt(state, config = {}) {
  const context = normalizeExportContext(state, config);
  if (!context.changes.length) return '';

  return [
    '你正在修改一个前端项目。以下是 Visual Draft Editor 生成的视觉草稿变更。',
    '',
    '请完成：',
    '1. 找到对应组件或样式；',
    '2. 将视觉草稿固化到正式 CSS / 组件代码；',
    '3. 保持移动端响应式；',
    '4. 不要依赖 localStorage；',
    '5. 不要修改未列出的组件。',
    '',
    `页面：${context.page}`,
    `Viewport：${context.viewport.width} x ${context.viewport.height}`,
    '',
    'Current strategy:',
    `- previewStrategy: ${context.previewStrategy}`,
    `- implementationStrategy: ${context.implementationStrategy}`,
    `- coordinateMode: ${context.coordinateMode}`,
    `- positioningRoot: ${context.positioningRoot}`,
    `- preventRootMove: ${context.preventRootMove ? 'true' : 'false'}`,
    `- mobileBreakpoint: ${context.mobileBreakpoint}px`,
    formatRiskBlock(context),
    '',
    'Changes:',
    formatClaudeChanges(context.changes),
    '',
    'Constraints:',
    ...getSharedLayoutConstraints(context).map((item) => `- ${item}`),
  ].join('\n');
}

export function exportAsCursorPrompt(state, config = {}) {
  const context = normalizeExportContext(state, config);
  if (!context.changes.length) return '';

  return [
    '请在当前代码库中根据以下 Visual Draft Editor 草稿修改页面布局。',
    '',
    '修改范围：',
    '- 只修改和以下 data-edit-id 相关的组件 / CSS；',
    '- 不要重构无关代码；',
    '- 不要影响移动端响应式；',
    '- 不要依赖 localStorage；',
    '- 不要修改未列出的组件。',
    '- 优先使用正常文档流、section 顺序、margin、padding、gap、flex、grid 实现布局意图。',
    '- 不要直接把草稿坐标写成 absolute / fixed / transform。',
    '',
    `页面：${context.page}`,
    `Viewport：${context.viewport.width} x ${context.viewport.height}`,
    '',
    formatStrategyBlock(context),
    formatRiskBlock(context),
    '',
    '需要修改：',
    '',
    formatCursorSection('Move', getChangesByType(context.changes, 'move')),
    '',
    formatCursorSection('Text', getChangesByType(context.changes, 'text')),
    '',
    formatCursorSection('Visibility', getChangesByType(context.changes, 'visibility')),
    '',
    '请完成后说明：',
    '1. 修改了哪些文件；',
    '2. 如何保持移动端响应式；',
    '3. 是否有无法准确定位的组件。',
  ].join('\n');
}

export function exportAsDeveloperNotes(state, config = {}) {
  const context = normalizeExportContext(state, config);
  if (!context.changes.length) return '';

  const moveLines = getChangesByType(context.changes, 'move').map(formatDeveloperLayoutIntent);
  const textLines = getChangesByType(context.changes, 'text').map(
    (change) => `- ${formatName(change)}：从“${change.before.text}”改为“${change.after.text}”`
  );
  const visibilityLines = getChangesByType(context.changes, 'visibility').map((change) => {
    const action = change.after.visible ? '显示' : '隐藏';
    return `- ${formatName(change)}：${action}`;
  });

  return [
    '以下是 Visual Draft Editor 生成的前端视觉修改说明。',
    '',
    `页面：${context.page}`,
    `Viewport：${context.viewport.width} x ${context.viewport.height}`,
    '',
    formatStrategyBlock(context),
    formatRiskBlock(context),
    '',
    '布局修改：',
    moveLines.length ? moveLines.join('\n') : '- 无',
    '',
    '文本修改：',
    textLines.length ? textLines.join('\n') : '- 无',
    '',
    '显示状态：',
    visibilityLines.length ? visibilityLines.join('\n') : '- 无',
    '',
    '开发注意事项：',
    ...getSharedLayoutConstraints(context).map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

export function exportAsCoordinatePrompt(state, config = {}) {
  const context = normalizeExportContext(state, config);
  if (!context.changes.length) return '';

  const moveLines = getChangesByType(context.changes, 'move').map(
    (change) => `- ${formatName(change)}：${formatCoordinateReference(change)}`
  );

  return [
    '以下是 Visual Draft Editor 坐标参考导出。',
    '',
    '注意：这些坐标仅用于记录视觉草稿位置，不建议直接作为生产 CSS。',
    '',
    `页面：${context.page}`,
    `Viewport：${context.viewport.width} x ${context.viewport.height}`,
    `previewStrategy：${context.previewStrategy}`,
    `coordinateMode：${context.coordinateMode}`,
    `positioningRoot：${context.positioningRoot}`,
    '',
    '坐标参考：',
    moveLines.length ? moveLines.join('\n') : '- 无',
  ].join('\n');
}

export function exportAsJson(state, config = {}) {
  const context = normalizeExportContext(state, config);

  return JSON.stringify(
    {
      tool: TOOL_NAME,
      version: 2,
      page: context.page,
      viewport: context.viewport,
      mode: 'draft-only',
      exportMode: 'layout-intent',
      previewStrategy: context.previewStrategy,
      implementationStrategy: context.implementationStrategy,
      coordinateMode: context.coordinateMode,
      positioningRoot: context.positioningRoot,
      explicitPositioningRoot: context.explicitPositioningRoot,
      coordinateContext: context.coordinateContext,
      mobileBreakpoint: context.mobileBreakpoint,
      preventRootMove: context.preventRootMove,
      risks: context.risks,
      changes: context.changes.map((change) => ({
        id: change.id,
        label: change.label,
        role: change.role || '',
        group: change.group || '',
        type: change.type,
        before: change.before,
        after: change.after,
        coordinateReference: change.coordinateReference || null,
        layoutIntent: change.layoutIntent || null,
        previewStrategy: context.previewStrategy,
        implementationStrategy: context.implementationStrategy,
        coordinateMode: context.coordinateMode,
        positioningRoot: context.positioningRoot,
      })),
      constraints: {
        draftOnly: true,
        doNotUseLocalStorageForProduction: true,
        keepMobileResponsive: true,
        doNotApplyDesktopCoordinatesToMobile: true,
      },
    },
    null,
    2
  );
}

export function buildDirtyChanges({ draft, originals }) {
  const changes = [];

  Object.entries(draft?.items || {}).forEach(([editId, item]) => {
    const original = originals?.get(editId);
    const dirty = normalizeDirty(item.dirty);
    const label = item?.label || original?.initialLabel || editId;

    if (original && dirty.moved && !isLockedMoveItem(item)) {
      changes.push({
        id: editId,
        label,
        role: item.role || '',
        group: item.group || '',
        lockMove: Boolean(item.lockMove),
        childEditableCount: Number(item.childEditableCount) || 0,
        parent: item.parent || null,
        type: 'move',
        before: {
          x: original.initialX,
          y: original.initialY,
          xPercent: roundOne(original.xPercent),
          yPercent: roundOne(original.yPercent),
        },
        after: {
          x: Number(item.x) || 0,
          y: Number(item.y) || 0,
          width: Number(item.width) || 0,
          height: Number(item.height) || 0,
          xPercent: roundOne(item.xPercent),
          yPercent: roundOne(item.yPercent),
        },
        coordinateReference: item.coordinateReference || {
          leftVw: roundOne(item.xPercent),
          topVh: roundOne(item.yPercent),
          widthVw: roundOne((Number(item.width) / Math.max(Number(draft.viewportWidth), 1)) * 100),
        },
        layoutIntent: item.layoutIntent || null,
        dirty,
      });
    }

    if (original && dirty.textChanged) {
      changes.push({
        id: editId,
        label,
        role: item.role || '',
        group: item.group || '',
        type: 'text',
        before: {
          text: original.initialText || '',
        },
        after: {
          text: typeof item.text === 'string' ? item.text : '',
        },
        dirty,
      });
    }

    if (dirty.visibilityChanged) {
      changes.push({
        id: editId,
        label,
        role: item.role || '',
        group: item.group || '',
        type: 'visibility',
        before: {
          visible: original?.initialVisible !== false,
        },
        after: {
          visible: item.visible !== false,
        },
        dirty,
      });
    }
  });

  return changes;
}

export function getDirtyItems(draft) {
  if (!draft?.items) return {};

  return Object.fromEntries(
    Object.entries(draft.items).filter(([, item]) => {
      const dirty = normalizeDirty(item.dirty);
      return dirty.moved || dirty.textChanged || dirty.visibilityChanged;
    })
  );
}

export function getExportRisks(state, config = {}) {
  return normalizeExportContext(state, config).risks || [];
}

export function getEmptyExportMessage() {
  return EMPTY_MESSAGE;
}

function normalizeExportContext(state, config = {}) {
  if (state?.changes) {
    const context = {
      page: state.page || config.exportTitle || config.page || '当前页面',
      viewport: {
        width: numberOr(state.viewport?.width, state.draft?.viewportWidth || config.viewportWidth || 0),
        height: numberOr(state.viewport?.height, state.draft?.viewportHeight || config.viewportHeight || 0),
      },
      changes: state.changes,
      ...buildStrategyContext({ ...(state.draft || {}), ...state }, config),
    };
    context.risks = buildExportRisks(context);
    return context;
  }

  const draft = state?.draft || state || {};
  const originals = state?.originals || config.originals || new Map();

  const context = {
    page: config.exportTitle || draft.exportTitle || config.page || '当前页面',
    viewport: {
      width: numberOr(draft.viewportWidth, config.viewportWidth || 0),
      height: numberOr(draft.viewportHeight, config.viewportHeight || 0),
    },
    changes: buildDirtyChanges({ draft, originals }),
    draft,
    originals,
    ...buildStrategyContext(draft, config),
  };
  context.risks = buildExportRisks(context);
  return context;
}

function buildStrategyContext(draft = {}, config = {}) {
  const coordinateContext = draft.coordinateContext || config.coordinateContext || {};
  return {
    previewStrategy: config.previewStrategy || draft.previewStrategy || 'translate',
    implementationStrategy: config.implementationStrategy || draft.implementationStrategy || 'normal-flow-layout',
    coordinateMode: config.coordinateMode || draft.coordinateMode || coordinateContext.coordinateMode || 'root-container',
    positioningRoot: config.positioningRootSelector || draft.positioningRootSelector || coordinateContext.positioningRoot || '',
    explicitPositioningRoot: Boolean(config.positioningRootSelector || draft.positioningRootSelector),
    coordinateContext,
    mobileBreakpoint: numberOr(config.mobileBreakpoint, draft.mobileBreakpoint || 768),
    preventRootMove: config.preventRootMove ?? draft.preventRootMove ?? true,
  };
}

function formatClaudeChanges(changes) {
  return changes
    .map((change, index) => {
      if (change.type === 'move') {
        return [
          `${index + 1}. Move`,
          `   - id: ${change.id}`,
          `   - label: ${change.label}`,
          `   - role: ${change.role || 'unknown'}`,
          `   - layout intent: ${formatLayoutSentence(change)}`,
          `   - coordinate reference only: ${formatCoordinateReference(change)}`,
          '   - implementation: keep normal document flow; do not directly use absolute / fixed / transform from draft coordinates.',
        ].join('\n');
      }

      if (change.type === 'text') {
        return [
          `${index + 1}. Text`,
          `   - id: ${change.id}`,
          `   - label: ${change.label}`,
          `   - from: ${change.before.text}`,
          `   - to: ${change.after.text}`,
        ].join('\n');
      }

      const action = change.after.visible ? 'show' : 'hide';
      return [
        `${index + 1}. Visibility`,
        `   - id: ${change.id}`,
        `   - label: ${change.label}`,
        `   - action: ${action}`,
      ].join('\n');
    })
    .join('\n\n');
}

function formatStrategyBlock(context) {
  return [
    '当前策略：',
    `- 编辑器预览方式 previewStrategy：${context.previewStrategy}`,
    `- 正式落地策略 implementationStrategy：${context.implementationStrategy}`,
    `- 坐标模式 coordinateMode：${context.coordinateMode}`,
    `- 定位参考容器 positioningRoot：${context.positioningRoot || '未设置'}`,
    `- 禁止移动 root preventRootMove：${context.preventRootMove ? 'true' : 'false'}`,
    `- 移动端 reset 断点：${context.mobileBreakpoint}px`,
    `- 坐标说明：${getCoordinateMeaning(context)}`,
  ].join('\n');
}

function formatRiskBlock(context) {
  if (!context.risks?.length) return '导出前风险检查：未发现明显风险。';

  return [
    '导出前风险检查：',
    ...context.risks.map((risk, index) => `${index + 1}. ${risk.message}`),
    '以上风险不会阻止导出，但请在正式代码中逐项确认。',
  ].join('\n');
}

function buildExportRisks(context) {
  const risks = [];
  const changes = context.changes || [];
  const moved = changes.filter((change) => change.type === 'move');

  moved.forEach((change) => {
    if (change.role === 'root' || change.lockMove) {
      risks.push({
        code: 'root-moved',
        id: change.id,
        message: `检测到移动了页面根容器 ${change.id}，这可能导致所有子元素坐标叠加。建议只移动内部 section 或内容块。`,
      });
    }

    if (Number(change.childEditableCount) > 1) {
      risks.push({
        code: 'container-with-editable-children',
        id: change.id,
        message: `${change.id} 内包含多个可编辑子元素。请确认这是整体区块移动，而不是误移动父容器。`,
      });
    }
  });

  moved.forEach((parent) => {
    moved.forEach((child) => {
      if (parent.id !== child.id && child.parent?.id === parent.id) {
        risks.push({
          code: 'parent-and-child-moved',
          id: child.id,
          message: `同时移动了父元素 ${parent.id} 和子元素 ${child.id}，正式落地时可能出现偏移叠加。`,
        });
      }
    });
  });

  if (context.implementationStrategy === 'absolute-layout' && !context.explicitPositioningRoot) {
    risks.push({
      code: 'absolute-without-root',
      message: '当前选择 absolute-layout，但未设置 positioningRootSelector。建议设置定位参考容器，例如 .site-home。',
    });
  }

  if (context.coordinateMode === 'viewport' && context.coordinateContext?.rootRect?.width && context.coordinateContext.rootRect.width < context.viewport.width - 80) {
    risks.push({
      code: 'viewport-coordinates-with-contained-layout',
      message: '当前使用 viewport 坐标，但页面存在明显 max-width/root 容器。请确认 left/top 不应相对 root-container 计算。',
    });
  }

  moved.forEach((change) => {
    const right = Number(change.after?.x || 0) + Number(change.after?.width || 0);
    if (context.viewport.width && right > context.viewport.width) {
      risks.push({
        code: 'horizontal-overflow',
        id: change.id,
        message: `${change.id} 可能横向超出 viewport。请确认正式布局不会产生横向滚动条。`,
      });
    }
  });

  return risks;
}

function formatCursorSection(title, changes) {
  if (!changes.length) return `[${title}]\n- 无`;

  return [
    `[${title}]`,
    changes
      .map((change) => {
        if (change.type === 'move') {
          return [
            `- data-edit-id="${change.id}"`,
            `  label: ${change.label}`,
            `  role: ${change.role || 'unknown'}`,
            `  layout intent: ${formatLayoutSentence(change)}`,
            `  coordinate reference only: ${formatCoordinateReference(change)}`,
            '  implementation: use normal document flow, section order, margin/padding/gap/flex/grid; do not directly use absolute/fixed/transform.',
          ].join('\n');
        }

        if (change.type === 'text') {
          return [
            `- data-edit-id="${change.id}"`,
            `  label: ${change.label}`,
            `  from: "${change.before.text}"`,
            `  to: "${change.after.text}"`,
          ].join('\n');
        }

        const action = change.after.visible ? 'show' : 'hide';
        return [
          `- data-edit-id="${change.id}"`,
          `  label: ${change.label}`,
          `  action: ${action}`,
        ].join('\n');
      })
      .join('\n\n'),
  ].join('\n');
}

function getChangesByType(changes, type) {
  return changes.filter((change) => change.type === type);
}

function formatName(change) {
  return change.label === change.id ? change.id : `${change.label} ${change.id}`;
}

function formatCodexLayoutIntent(change) {
  return [
    `- ${formatName(change)}：`,
    '  布局意图：',
    `  ${formatLayoutSentence(change)}`,
    `  ${change.layoutIntent?.moveAsSection ? '将该元素作为完整区块移动，不要拆散内部标题、按钮或卡片。' : '按该组件自身的布局关系调整。'}`,
    '  保持正常文档流，不要使用 absolute / fixed / transform 直接套用坐标。',
    '  移动端仍然保持纵向响应式排列，不要套用桌面端坐标。',
    '  参考草稿位置：',
    `  ${formatCoordinateReference(change)}`,
    '  这些坐标仅作为视觉参考，不应被直接写成生产 CSS 的 absolute 定位。',
  ].join('\n');
}

function formatDeveloperLayoutIntent(change) {
  return `- ${formatName(change)}：${formatLayoutSentence(change)} 参考坐标 ${formatCoordinateReference(change)}；坐标仅供视觉参考。`;
}

function formatLayoutSentence(change) {
  const intent = change.layoutIntent || {};
  const parts = [];

  if (intent.placeAfter) {
    parts.push(`移动到${formatReference(intent.placeAfterLabel, intent.placeAfter)}之后`);
  }

  if (intent.placeBefore) {
    parts.push(`位于${formatReference(intent.placeBeforeLabel, intent.placeBefore)}之前`);
  }

  if (!parts.length) {
    parts.push('根据草稿视觉位置调整它在当前页面中的顺序和间距');
  }

  if (intent.alignWith) {
    parts.push(`宽度和对齐关系参考${formatReference(intent.alignWithLabel, intent.alignWith)}`);
  }

  if (intent.keepInNormalFlow) {
    parts.push('保持正常文档流');
  }

  return `${parts.join('，')}。`;
}

function formatReference(label, editId) {
  if (!editId) return `“${label || ''}”`;
  if (!label || label === editId) return `“${editId}”`;
  return `“${label}”（${editId}）`;
}

function formatCoordinateReference(change) {
  const ref = change.coordinateReference || {};
  const parts = [
    `viewport left ≈ ${roundOne(ref.leftVw ?? change.after?.xPercent)}vw`,
    `top ≈ ${roundOne(ref.topVh ?? change.after?.yPercent)}vh`,
  ];

  if (ref.widthVw !== undefined) parts.push(`width ≈ ${roundOne(ref.widthVw)}vw`);
  if (ref.leftPxInRoot !== undefined || ref.topPxInRoot !== undefined) {
    parts.push(`root left ≈ ${Math.round(ref.leftPxInRoot || 0)}px`);
    parts.push(`root top ≈ ${Math.round(ref.topPxInRoot || 0)}px`);
  }
  if (ref.leftPercentInRoot !== undefined || ref.topPercentInRoot !== undefined) {
    parts.push(`root left ≈ ${roundOne(ref.leftPercentInRoot || 0)}%`);
    parts.push(`root top ≈ ${roundOne(ref.topPercentInRoot || 0)}%`);
  }

  return parts.join(', ');
}

function getCoordinateMeaning(context) {
  if (context.implementationStrategy === 'absolute-layout') {
    return `坐标可作为 absolute-layout 的参考，但 left/top 必须相对 ${context.positioningRoot || '定位参考容器'} 重新计算。`;
  }

  return '坐标仅表达视觉草稿位置，正式布局仍建议由 CSS 文档流和响应式规则控制。';
}

function formatMobileResetSnippet(context) {
  const root = context.positioningRoot || '[positioning-root]';
  return [
    'absolute-layout 移动端 reset 建议：',
    `@media (max-width: ${context.mobileBreakpoint || 768}px) {`,
    `  ${root} [data-edit-id] {`,
    '    position: static;',
    '    left: auto;',
    '    top: auto;',
    '    right: auto;',
    '    bottom: auto;',
    '    width: auto;',
    '    height: auto;',
    '    transform: none;',
    '    translate: none;',
    '  }',
    '}',
  ].join('\n');
}

function isLockedMoveItem(item) {
  return item?.lockMove === true || item?.role === 'root';
}

function getSharedLayoutConstraints(context = {}) {
  const constraints = [
    'Visual Draft Editor 的草稿坐标只表达视觉目标，不等于最终 CSS 坐标。',
    '移动 section 时，应优先调整 DOM 顺序或 section 顺序，而不是让元素脱离文档流。',
    '对于 data-edit-role="section" 的元素，应作为整体处理，不要拆散内部标题、按钮、卡片。',
    '对于 data-edit-group 相同的元素，应优先保持组内结构关系。',
    '不要产生横向滚动条。',
    '不要影响未列出的组件。',
    '不要影响业务功能和交互逻辑。',
    '移动端必须保持响应式，不得套用桌面端坐标。',
  ];

  if (context.implementationStrategy === 'absolute-layout') {
    constraints.splice(
      1,
      0,
      `当前选择 absolute-layout。正式 CSS 可以使用 position:absolute + left/top，但定位参考容器必须是 ${context.positioningRoot || '明确的 positioningRoot'}，并且该容器必须设置 position: relative。`,
      'left/top 应相对定位参考容器计算，不要盲目套用 viewport 坐标。',
      '不要移动页面 root/main/home-page 等顶层容器，只移动具体 section 或内容块。',
      `移动端必须 reset absolute 定位。建议在 max-width: ${context.mobileBreakpoint || 768}px 内把 position/left/top/right/bottom/width/height/transform/translate 还原。`
    );
  } else if (context.implementationStrategy === 'coordinate-reference-only') {
    constraints.splice(1, 0, '当前选择 Coordinate Reference Only。坐标只能作为视觉参考，不建议直接生成生产 CSS。');
  } else {
    constraints.splice(
      1,
      0,
      '当前选择 normal-flow-layout。优先使用正常文档流、section 顺序、margin、padding、gap、max-width、flex、grid 来实现。',
      '不要直接把 left / top / vw / vh 写成 absolute / fixed 定位，除非该元素原本就是绝对定位元素。'
    );
  }

  if (context.coordinateContext?.rootPadding) {
    constraints.push(`请检查定位参考容器 padding：top ${context.coordinateContext.rootPadding.top}px, right ${context.coordinateContext.rootPadding.right}px, bottom ${context.coordinateContext.rootPadding.bottom}px, left ${context.coordinateContext.rootPadding.left}px。`);
  } else {
    constraints.push('请检查定位参考容器的 padding，left/top 不应直接套用 viewport 坐标。');
  }

  if (context.implementationStrategy === 'absolute-layout') {
    constraints.push(formatMobileResetSnippet(context));
  }

  return constraints;
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
