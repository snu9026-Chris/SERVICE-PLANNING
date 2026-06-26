/**
 * UX Flow 페이지 — 사용자 여정 (ADR-020, ADR-022).
 *
 * docs/UX-FLOW.md(파싱된 UxFlow) 한 객체로 두 섹션을 그린다:
 *  - 미니 지도: 전체 순서 한 줄(1→2→…).
 *  - ① 전체 흐름: 세로 타임라인. 단계마다 진입/화면/다음/상태(예외)까지.
 *  - ② 단계별 화면: 단계마다 큰 시안(클릭하면 Preview에서 확대) + 간단 설명 + 주요 기능.
 * 파일이 없으면(=null) 빈 상태 안내.
 */

import { escapeHtml } from '../shared';
import { UxFlow, UxFlowStep } from '../../types';
import { PreviewDesignFile } from './preview';

export function renderFlowPage(flow: UxFlow | null, designFiles: PreviewDesignFile[] = []): string {
  if (!flow || flow.steps.length === 0) {
    return `
      <div class="page-hero compact">
        <div class="page-eyebrow">UX FLOW · 사용자 여정</div>
        <h1 class="page-title">여정이 아직 없어요</h1>
        <p class="page-subtitle">
          <code>docs/UX-FLOW.md</code> 가 없습니다.<br/>
          채팅에서 <code>/blueprint</code> → DESIGN 단계의 <b>UX Flow 인터뷰</b>로
          "처음 어디로 들어가서 → 순서대로 → 최종 산출물"을 정하면 여기에 뜹니다.
        </p>
      </div>`;
  }

  const introHtml = flow.intro
    ? `<p class="page-subtitle">${escapeHtml(flow.intro)}</p>`
    : `<p class="page-subtitle">처음 들어와서 → 순서대로 → 최종 산출물까지.</p>`;

  return `
    <div class="page-hero compact">
      <div class="page-eyebrow">UX FLOW · 사용자 여정</div>
      <h1 class="page-title">${escapeHtml(stripTitlePrefix(flow.title))}</h1>
      ${introHtml}
    </div>

    ${renderMinimap(flow.steps)}

    <section class="uxf-sec">
      <div class="uxf-sec-h"><span class="uxf-sec-t">① 전체 흐름</span><span class="uxf-sec-d">Claude가 뭘 묻고 / 같이 뭘 정하고 / 어디가 채워지고 / 뭐가 나오나</span></div>
      ${renderFlowTimeline(flow.steps)}
    </section>

    <section class="uxf-sec">
      <div class="uxf-sec-h"><span class="uxf-sec-t">② 단계별 화면</span><span class="uxf-sec-d">각 단계 실제 시안 · 누르면 화면 가득 확대</span></div>
      ${flow.steps.map(s => renderScreenStep(s, designFiles)).join('')}
    </section>`;
}

/** "UX Flow — 음악앱" 같은 제목에서 접두 "UX Flow —"를 떼 화면 제목을 깔끔하게. */
function stripTitlePrefix(title: string): string {
  return title.replace(/^UX\s*Flow\s*[—–-]\s*/i, '').trim() || title;
}

// ── 미니 지도 ────────────────────────────────────────────────
function renderMinimap(steps: UxFlowStep[]): string {
  const cells: string[] = [];
  steps.forEach((s, i) => {
    const end = i === steps.length - 1 ? ' end' : '';
    cells.push(
      `<span class="uxf-mstep${end}"><span class="uxf-mdot">${s.index}</span><span class="uxf-mname">${escapeHtml(s.label)}</span></span>`,
    );
    if (i < steps.length - 1) cells.push('<span class="uxf-marr">›</span>');
  });
  return `<div class="uxf-map">${cells.join('')}</div>`;
}

// ── ① 전체 흐름 (세로 타임라인) ───────────────────────────────
function renderFlowTimeline(steps: UxFlowStep[]): string {
  const nodes = steps.map((s, i) => {
    const end = i === steps.length - 1 ? ' end' : '';
    const start = i === 0 ? ' start' : '';
    const sum = s.summary ? `<div class="uxf-sum">${escapeHtml(s.summary)}</div>` : '';
    return `
      <div class="uxf-node${start}${end}">
        <div class="uxf-badge">${s.index}</div>
        <div class="uxf-card">
          <div class="uxf-nm">${escapeHtml(s.label)}</div>
          ${sum}
          ${renderFlowRows(s)}
        </div>
      </div>`;
  }).join('');
  return `<div class="uxf-tl">${nodes}</div>`;
}

/** 묻기/정하기/채워짐/산출물 — 있는 것만. 하나도 없으면 빈 문자열. */
function renderFlowRows(s: UxFlowStep): string {
  const rows: string[] = [];
  const row = (k: string, cls: string, v?: string) =>
    v ? rows.push(`<div class="uxf-r"><span class="uxf-rk ${cls}">${k}</span><span class="uxf-rv">${escapeHtml(v)}</span></div>`) : 0;
  row('묻기', 'k-ask', s.ask);
  row('정하기', 'k-dec', s.decide);
  row('채워짐', 'k-fill', s.fills);
  row('산출물', 'k-out', s.output);
  return rows.length ? `<div class="uxf-rows">${rows.join('')}</div>` : '';
}

// ── ② 단계별 화면 (큰 시안) ───────────────────────────────────
function renderScreenStep(s: UxFlowStep, designFiles: PreviewDesignFile[]): string {
  const sum = s.summary ? `<div class="uxf-step-desc">${escapeHtml(s.summary)}</div>` : '';
  const feats = s.features.length
    ? `<div class="uxf-feat-line"><b>주요 기능</b> · ${s.features.map(f => escapeHtml(f.name)).join(' · ')}</div>`
    : '';
  return `
    <div class="uxf-step">
      <div class="uxf-step-h"><span class="uxf-step-num">${s.index}</span><span class="uxf-step-nm">${escapeHtml(s.label)}</span></div>
      ${sum}
      ${renderBigShot(s, designFiles)}
      ${feats}
    </div>`;
}

/** 큰 시안 — designRef로 designFiles 매칭. 매칭되면 클릭=Preview 확대(data-preview-file). 없으면 placeholder. */
function renderBigShot(s: UxFlowStep, designFiles: PreviewDesignFile[]): string {
  const file = matchDesignFile(s.designRef, designFiles);
  if (file?.content) {
    return `
      <button type="button" class="uxf-screen" data-preview-file="${escapeHtml(file.relativePath)}" title="${escapeHtml(file.name)} — 눌러서 크게">
        <span class="uxf-zoom">🔍 눌러서 크게</span>
        <span class="uxf-tag">${escapeHtml(shotLabel(file.name))}</span>
        <iframe class="uxf-screen-frame" srcdoc="${escapeHtml(file.content)}" sandbox="allow-same-origin" scrolling="no" tabindex="-1"></iframe>
      </button>`;
  }
  return `
    <div class="uxf-screen uxf-screen-empty">
      <div class="uxf-screen-ic">🖼️</div>
      <div class="uxf-screen-hint">${s.designRef ? escapeHtml(s.designRef) : '시안 미지정'}</div>
    </div>`;
}

/** 파일명에서 .html 떼고 짧은 태그로. */
function shotLabel(name: string): string {
  return name.replace(/\.html?$/i, '');
}

function matchDesignFile(ref: string | undefined, designFiles: PreviewDesignFile[]): PreviewDesignFile | undefined {
  if (!ref) return undefined;
  const r = ref.trim();
  return designFiles.find(f =>
    f.relativePath === r || f.relativePath.endsWith('/' + r) || f.name === r,
  );
}
