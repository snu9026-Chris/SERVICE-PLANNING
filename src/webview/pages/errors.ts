/**
 * Errors 페이지 — 자동/수동 2섹션 (ADR-021).
 *
 * 위: 자동 수집(docs/error.auto.md) — 확장이 진단·Task 실패에서 자동 기록. 읽기 전용.
 * 아래: 수동 일지(docs/error.history.md) — Claude/사용자가 남기는 트러블슈팅 기록.
 *       파일 없으면 "에러 히스토리 시작" 버튼(extension이 템플릿 생성).
 */

import { renderMarkdown, escapeHtml } from '../shared';

const MANUAL_PATH = 'docs/error.history.md';
const AUTO_PATH = 'docs/error.auto.md';

export function renderErrorsPage(
  manualMd: string | null,
  autoMd: string | null = null,
): string {
  return `
    <div class="page-hero">
      <div class="page-eyebrow">ERRORS</div>
      <h1 class="page-title">에러</h1>
      <p class="page-subtitle">위: 확장이 자동 수집 · 아래: 직접 남기는 트러블슈팅 일지</p>
    </div>
    ${renderAutoSection(autoMd)}
    ${renderManualSection(manualMd)}`;
}

/** 자동 수집 섹션 — error.auto.md 렌더. 없으면 "확장이 자동으로 채웁니다" 안내. */
function renderAutoSection(autoMd: string | null): string {
  const body = autoMd
    ? `<div class="markdown-body errors-body">${renderMarkdown(autoMd)}</div>`
    : `<div class="empty-card">
         <p class="muted">아직 자동 수집된 에러가 없습니다. 컴파일·린트 에러나 빌드 실패가 생기면 확장이 <code>${escapeHtml(AUTO_PATH)}</code>에 자동으로 기록합니다.</p>
       </div>`;
  return `
    <section class="errors-block">
      <div class="preview-category-header">
        <span class="preview-category-icon">🤖</span>
        <span class="preview-category-name">자동 수집</span>
      </div>
      ${body}
    </section>`;
}

/** 수동 일지 섹션 — error.history.md 렌더. 없으면 생성 CTA. */
function renderManualSection(manualMd: string | null): string {
  const body = manualMd
    ? `<div class="markdown-body errors-body">${renderMarkdown(manualMd)}</div>`
    : `<div class="empty-card cta-card">
         <p>발생한 에러, 원인, 해결을 시간순으로 누적하는 일지입니다.</p>
         <button class="cta-button" data-action="create-error-history">✚ 에러 히스토리 시작</button>
         <p class="muted" style="margin-top: 12px;">
           템플릿이 박힌 빈 파일을 만들어요. 이후 에러 발생 시 Claude에게 "에러히스토리에 추가해" 라고 하시면 됩니다.
         </p>
       </div>`;
  return `
    <section class="errors-block">
      <div class="preview-category-header">
        <span class="preview-category-icon">📓</span>
        <span class="preview-category-name">수동 일지</span>
        <span class="preview-category-count" style="font-weight:400;opacity:.6;">${escapeHtml(MANUAL_PATH)}</span>
      </div>
      ${body}
    </section>`;
}

/**
 * 에러 히스토리 초기 템플릿 (생성 버튼 클릭 시 사용).
 */
export const ERROR_HISTORY_TEMPLATE = `# Error History

> 에러·트러블슈팅 일지. 발생한 시점·원인·해결을 시간순(역시간순)으로 기록.
> 새 에러는 *맨 위에* 추가.

## 템플릿 (복사해서 사용)

\`\`\`markdown
## YYYY-MM-DD HH:MM — {짧은 에러 제목}

- **Status**: RESOLVED | OPEN | IGNORED
- **Phase**: {발생한 Phase 또는 워크 단계}
- **상황**: {언제·무엇 하다가 발생}
- **에러 메시지**:
  \\\`\\\`\\\`
  {원문}
  \\\`\\\`\\\`
- **원인**: {왜 발생했나}
- **해결**: {어떻게 풀었나}
- **재발 방지**: {앞으로 피하려면}
\`\`\`

(에러는 아래에 시간순으로 누적)
`;
