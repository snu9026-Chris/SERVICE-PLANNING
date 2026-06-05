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
  const checklistHtml = renderChecklistMarkdown(roadmapMd);

  return `
    ${heroBlock}
    <div class="roadmap-container">
      ${checklistHtml}
    </div>`;
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
