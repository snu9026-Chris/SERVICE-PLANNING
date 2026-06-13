/**
 * Plan 페이지 — plans/roadmap.md 풀-너비 렌더 + state.md 현재 위치 강조.
 *
 * 데이터: roadmap.md (체크리스트) + state.phases (현재 phase 강조용)
 * 시각: 큰 헤더 + Phase 카드들 (현재 phase는 파란 테두리 + 배경)
 */

import { renderChecklistMarkdown, escapeHtml } from '../shared';
import { BlueprintState, getProgress } from '../../types';

export function renderPlanPage(
  state: BlueprintState | null,
  roadmapMd: string | null,
  productMd: string | null = null,
  inquiryMd: string | null = null,
): string {
  if (!roadmapMd) {
    return `
      <div class="page-hero">
        <div class="page-eyebrow">PLAN</div>
        <h1 class="page-title">Roadmap not found</h1>
        <p class="page-subtitle">
          <code>plans/roadmap.md</code> 파일이 없어요.
        </p>
      </div>
      <div class="empty-card">
        <p>이 파일이 있어야 Plan 페이지가 동작합니다.</p>
        <p class="muted">/blueprint 스킬이 다음 init부터 자동으로 만들어주지만, 이 프로젝트는 수동 생성 필요.</p>
      </div>`;
  }

  const heroBlock = state ? renderHero(state) : '';
  const incompleteBlock = renderIncompleteBanner(state, roadmapMd);
  const summaryBlock = renderProjectSummary(extractProjectSummary(productMd, inquiryMd));
  const checklistHtml = renderChecklistMarkdown(roadmapMd);

  return `
    ${heroBlock}
    ${incompleteBlock}
    ${summaryBlock}
    <div class="roadmap-container">
      ${checklistHtml}
    </div>`;
}

/**
 * 현재 phase 미결 항목 경고 배너.
 * 진행 중(또는 다음 대기) phase의 roadmap 체크리스트에서 `- [ ]` 미완 항목을 세어,
 * 1개 이상이면 "정하고 넘어가라" 알림. 전부 done이거나 미결 0이면 안 그림.
 */
function renderIncompleteBanner(state: BlueprintState | null, roadmapMd: string | null): string {
  if (!state || !roadmapMd) return '';
  const active =
    state.phases.find(p => p.status === 'in_progress') ??
    state.phases.find(p => p.status === 'pending');
  if (!active) return ''; // 전부 done

  const items = incompletePhaseItems(roadmapMd, active.name);
  if (items.length === 0) return '';

  const preview =
    items.slice(0, 3).map(escapeHtml).join(', ') +
    (items.length > 3 ? ` 외 ${items.length - 3}개` : '');
  return `
    <div class="plan-incomplete">
      ⚠ 현재 <b>${escapeHtml(active.name)}</b> 미결 ${items.length}항목 — ${preview}
      <span class="plan-incomplete-sub">· 다음 단계 가기 전 정해주세요</span>
    </div>`;
}

/**
 * roadmap.md에서 `## Phase {n} — {NAME}` 섹션의 미완(`- [ ]`) 항목 라벨 목록을 반환.
 * 헤더의 phase 이름이 정확히 일치할 때만 (REVIEW가 UX-REVIEW에 오인 매칭되지 않도록).
 */
function incompletePhaseItems(roadmapMd: string, phaseName: string): string[] {
  const lines = roadmapMd.split(/\r?\n/);
  const headerRe = /^##\s+Phase\s+[\d.]+\s*[—–-]\s*([A-Z][A-Z-]*)/;
  const items: string[] = [];
  let inSection = false;
  for (const line of lines) {
    const h = line.match(headerRe);
    if (h) {
      inSection = h[1] === phaseName;
      continue;
    }
    if (line.startsWith('## ')) inSection = false; // 다른 ## 섹션 시작
    if (!inSection) continue;
    const m = line.match(/^\s*-\s*\[ \]\s*(.+)$/);
    if (m) items.push(m[1].trim());
  }
  return items;
}

/**
 * "지금 만드는 것" 칸 — blueprint로 빌딩 중인 프로젝트의 한 줄 설명.
 * 도구(이 확장) 설명이 아니라, 사용자가 만드는 프로젝트가 무엇인지 보여준다.
 * 비어있으면(아직 정의 전) 안내 문구.
 */
function renderProjectSummary(summary: string | null): string {
  const body = summary
    ? `<div class="plan-building-text">${escapeHtml(summary)}</div>`
    : `<div class="plan-building-text muted">아직 정의 전 — Phase 0 INQUIRY / Phase 1 PRODUCT에서 "무엇을 만드는지" 정해지면 여기 표시됩니다.</div>`;
  return `
    <div class="plan-building-card">
      <div class="plan-building-label">🔨 지금 만드는 것</div>
      ${body}
    </div>`;
}

/**
 * 프로젝트 한 줄 설명 추출 — PRODUCT.md의 One-liner 우선, 없으면 INQUIRY.md의 문제.
 * 템플릿 placeholder(`{...}`)나 가이드(`>`)는 미정으로 간주해 건너뜀.
 */
function extractProjectSummary(productMd: string | null, inquiryMd: string | null): string | null {
  const clean = (s: string | undefined): string | null => {
    if (!s) return null;
    const t = s.trim();
    if (!t || t.startsWith('>') || t.startsWith('{')) return null;
    return t;
  };

  // 1) PRODUCT.md ## One-liner 섹션의 첫 본문 줄
  const one = productMd?.match(/##\s*One-liner\s*\n+([^\n]+)/i);
  const fromProduct = clean(one?.[1]);
  if (fromProduct) return fromProduct;

  // 2) INQUIRY.md 의 "- **문제**: ..." 줄
  const prob = inquiryMd?.match(/-\s*\*\*문제\*\*\s*:\s*([^\n]+)/);
  const fromInquiry = clean(prob?.[1]);
  if (fromInquiry) return fromInquiry;

  return null;
}

function renderHero(state: BlueprintState): string {
  const { done, total } = getProgress(state);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const active =
    state.phases.find(p => p.status === 'in_progress') ??
    state.phases.find(p => p.status === 'pending') ??
    state.phases[state.phases.length - 1];

  return `
    <div class="page-hero">
      <div class="page-eyebrow">PLAN · ROADMAP</div>
      <h1 class="page-title">${escapeHtml(state.project)}</h1>
      <p class="page-subtitle">
        지금 <strong>Phase ${active.key} · ${escapeHtml(active.name)}</strong> 진행 중
        · ${done}/${total} phases (${percent}%)
      </p>
      <div class="hero-progress">
        <div class="hero-progress-fill" style="${progressFillStyle(percent)}"></div>
      </div>
    </div>`;
}

function progressFillStyle(percent: number): string {
  if (percent <= 0) return 'width: 0';
  if (percent >= 100) return 'width: 100%; background-size: 100% 100%';
  const bgSize = Math.min((100 / percent) * 100, 5000);
  return `width: ${percent}%; background-size: ${bgSize.toFixed(2)}% 100%`;
}
