/**
 * QA 페이지 — docs/qa.report.md 를 전수 점검 체크리스트로 렌더.
 *
 * 파일 있으면: 상단 PASS/WARN/FAIL 요약 + 섹션별 상태 체크리스트
 * 파일 없으면: 안내 카드 (extension은 QA를 직접 돌리지 않음 — Claude에게 요청 안내)
 *
 * 데이터 흐름 (단방향 .md → UI, ADR-002/003):
 *   Claude(/qa)가 docs/qa.report.md 생성/갱신 → file-watcher → 이 페이지 렌더.
 *   extension은 QA를 *실행하지 않음*. 결과 시각화만.
 *
 * 리포트 양식 (qa.report.md):
 *   # QA Report ...
 *   > 메타 한 줄 (블록쿼트 = intro)
 *   ## 섹션 제목
 *   - ✅ 통과 항목
 *   - ⚠️ 경고 항목
 *   - ❌ 실패 항목
 *   - ⬜ 건너뜀/미검 항목
 */

import { escapeHtml, renderMarkdown } from '../shared';

export type QaStatus = 'pass' | 'warn' | 'fail' | 'skip';

interface QaItem {
  status: QaStatus;
  text: string; // 인라인 마크다운 원문 (렌더 시 변환)
}

interface QaSection {
  title: string;
  items: QaItem[];
}

interface QaReport {
  intro: string[]; // # 헤딩 이후 ~ 첫 ## 전까지의 블록쿼트/문단 (원문 라인)
  sections: QaSection[];
}

const STATUS_META: Record<QaStatus, { icon: string; label: string; cls: string }> = {
  pass: { icon: '✓', label: 'PASS', cls: 'pass' },
  warn: { icon: '!', label: 'WARN', cls: 'warn' },
  fail: { icon: '✕', label: 'FAIL', cls: 'fail' },
  skip: { icon: '–', label: 'SKIP', cls: 'skip' },
};

export function renderQaPage(
  qaMd: string | null,
  filePath: string = 'docs/qa.report.md',
): string {
  if (!qaMd || qaMd.trim() === '') {
    return renderEmpty(filePath);
  }

  const report = parseQaReport(qaMd);
  const counts = tally(report.sections);
  const total = counts.pass + counts.warn + counts.fail + counts.skip;

  const introHtml = report.intro.length
    ? `<div class="qa-intro markdown-body">${renderMarkdown(report.intro.join('\n'))}</div>`
    : '';

  const verdict = counts.fail > 0 ? 'fail' : counts.warn > 0 ? 'warn' : 'pass';
  const verdictText =
    verdict === 'fail'
      ? `${counts.fail}건 실패 — 수정 필요`
      : verdict === 'warn'
        ? `실패 0 · 경고 ${counts.warn}건 — 출시 가능, 백로그 권고`
        : '전 항목 통과 — 출시 가능';

  const sectionsHtml = report.sections.map(renderSection).join('\n');

  return `
    <div class="page-hero compact">
      <div class="page-eyebrow">QA · 전수 점검</div>
      <h1 class="page-title">품질 검사 리포트</h1>
      <p class="page-subtitle">
        <code>${escapeHtml(filePath)}</code> · 총 ${total}개 항목 · 단방향 렌더(Claude가 검사·기록)
      </p>
    </div>

    <div class="qa-summary qa-verdict-${verdict}">
      <div class="qa-stat qa-stat-pass">
        <span class="qa-stat-num">${counts.pass}</span>
        <span class="qa-stat-label">PASS</span>
      </div>
      <div class="qa-stat qa-stat-warn">
        <span class="qa-stat-num">${counts.warn}</span>
        <span class="qa-stat-label">WARN</span>
      </div>
      <div class="qa-stat qa-stat-fail">
        <span class="qa-stat-num">${counts.fail}</span>
        <span class="qa-stat-label">FAIL</span>
      </div>
      ${counts.skip > 0
        ? `<div class="qa-stat qa-stat-skip">
             <span class="qa-stat-num">${counts.skip}</span>
             <span class="qa-stat-label">SKIP</span>
           </div>`
        : ''}
      <div class="qa-verdict">
        <span class="qa-verdict-dot"></span>
        <span class="qa-verdict-text">${escapeHtml(verdictText)}</span>
      </div>
    </div>

    ${introHtml}

    <div class="qa-toolbar">
      <span class="qa-toolbar-hint">섹션을 눌러 펼치기 · 문제 있는 섹션은 자동 펼침</span>
      <div class="qa-toolbar-actions">
        <button type="button" class="qa-toolbar-btn" data-qa-expand-all>전체 펼치기</button>
        <button type="button" class="qa-toolbar-btn" data-qa-collapse-all>전체 접기</button>
      </div>
    </div>

    <div class="qa-sections">
      ${sectionsHtml}
    </div>`;
}

// ── 섹션 렌더 ─────────────────────────────────────────────

function renderSection(section: QaSection): string {
  const c = tally([section]);
  const badge = c.fail > 0 ? 'fail' : c.warn > 0 ? 'warn' : 'pass';
  const total = section.items.length;
  const passCount = c.pass;

  // 노션식 토글 — 문제 있는 섹션(FAIL/WARN)은 기본 펼침, 전부 PASS면 접힘.
  const open = badge === 'fail' || badge === 'warn';
  const openCls = open ? ' open' : '';

  // 경고/실패 개수 요약 칩 (있을 때만)
  const flagChip =
    c.fail > 0
      ? `<span class="qa-section-flag qa-flag-fail">${c.fail} FAIL</span>`
      : c.warn > 0
        ? `<span class="qa-section-flag qa-flag-warn">${c.warn} WARN</span>`
        : '';

  const rows = section.items.map(renderRow).join('\n');

  return `
    <section class="qa-section${openCls}">
      <button type="button" class="qa-section-head" data-qa-toggle aria-expanded="${open ? 'true' : 'false'}">
        <span class="qa-chevron" aria-hidden="true">▸</span>
        <span class="qa-section-badge qa-badge-${badge}"></span>
        <span class="qa-section-title">${escapeHtml(section.title)}</span>
        ${flagChip}
        <span class="qa-section-count">${passCount}/${total}</span>
      </button>
      <div class="qa-rows">${rows}</div>
    </section>`;
}

function renderRow(item: QaItem): string {
  const meta = STATUS_META[item.status];
  return `<div class="qa-row qa-row-${meta.cls}">
    <span class="qa-row-icon qa-icon-${meta.cls}">${meta.icon}</span>
    <span class="qa-row-text">${renderInline(item.text)}</span>
  </div>`;
}

// 인라인 마크다운만 (bold/code/link) — 블록 래핑 <p> 제거
function renderInline(text: string): string {
  const html = renderMarkdown(text).trim();
  return html.replace(/^<p>/, '').replace(/<\/p>$/, '');
}

// ── 파서 ──────────────────────────────────────────────────

function parseQaReport(md: string): QaReport {
  const lines = md.split(/\r?\n/);
  const intro: string[] = [];
  const sections: QaSection[] = [];
  let current: QaSection | null = null;
  let seenH1 = false;

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    // # H1 — 제목, 무시 (페이지 hero가 대신)
    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) {
      seenH1 = true;
      continue;
    }

    // ## 섹션 시작
    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      current = { title: h2[1].trim(), items: [] };
      sections.push(current);
      continue;
    }

    // 항목 라인
    const item = parseItem(trimmed);
    if (item && current) {
      current.items.push(item);
      continue;
    }

    // 섹션 진입 전 & H1 이후 → intro (블록쿼트·문단)
    if (!current && seenH1 && trimmed !== '') {
      intro.push(line);
    }
  }

  return { intro, sections };
}

/**
 * "- ✅ text" 류를 상태 + 텍스트로 분해.
 * 인식 이모지가 없는 일반 불릿은 skip(중립)으로 처리.
 * 불릿이 아닌 라인은 null (항목 아님).
 */
function parseItem(trimmed: string): QaItem | null {
  const m = trimmed.match(/^[-*]\s+(.*)$/);
  if (!m) return null;
  let body = m[1].trim();

  const status = detectStatus(body);
  if (status) {
    body = stripLeadingEmoji(body);
    return { status, text: body };
  }
  // 일반 불릿 — 중립 행 (카운트엔 SKIP)
  return { status: 'skip', text: body };
}

function detectStatus(body: string): QaStatus | null {
  if (body.startsWith('✅')) return 'pass';
  if (body.startsWith('⚠')) return 'warn'; // ⚠️ 변형 셀렉터 포함
  if (body.startsWith('❌')) return 'fail';
  if (body.startsWith('⬜') || body.startsWith('◻') || body.startsWith('◽') || body.startsWith('🔲')) return 'skip';
  return null;
}

function stripLeadingEmoji(body: string): string {
  // 선행 상태 이모지 + 변형셀렉터(️) + 공백 제거
  return body.replace(/^(✅|⚠️?|❌|⬜|◻️?|◽|🔲)\s*/u, '').trim();
}

function tally(sections: QaSection[]): { pass: number; warn: number; fail: number; skip: number } {
  const c = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const s of sections) {
    for (const it of s.items) c[it.status]++;
  }
  return c;
}

// ── 빈 상태 ───────────────────────────────────────────────

function renderEmpty(filePath: string): string {
  return `
    <div class="page-hero">
      <div class="page-eyebrow">QA · 전수 점검</div>
      <h1 class="page-title">QA 리포트</h1>
      <p class="page-subtitle">
        <code>${escapeHtml(filePath)}</code> 파일이 아직 없습니다.
      </p>
    </div>

    <div class="empty-card cta-card">
      <p>이 extension은 QA를 <strong>직접 실행하지 않습니다</strong> (ADR-002: AI 호출 금지).<br/>
         검사·기록은 Claude가 하고, 이 탭은 결과 <strong>시각화만</strong> 담당해요.</p>
      <p class="muted" style="margin-top: 12px;">
        채팅에서 <code>전수 QA 돌려줘</code> 또는 <code>/qa</code> 라고 하시면<br/>
        Claude가 빌드·파서·UI·watch 등 전 기능을 점검해서<br/>
        <code>${escapeHtml(filePath)}</code> 에 PASS/WARN/FAIL 체크리스트로 기록합니다.<br/>
        파일이 생기면 이 탭에 자동으로 나타나요.
      </p>
    </div>`;
}
