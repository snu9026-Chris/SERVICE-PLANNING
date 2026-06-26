/**
 * Preview 페이지 — 디자인 시안 갤러리 (ADR-022: 갤러리 전용).
 *
 * - docs/design/ 의 .html 시안을 카테고리별 카드 그리드로.
 * - 카드 클릭: 풀-너비 viewer (iframe). "← 그리드로"로 복귀. 이전/다음 네비.
 * - 채팅 명령 push도 그대로 (Spec 페이지의 디자인 시안 명령).
 * (단계별 화면·기능 명세는 UX Flow 탭으로 이동 — ADR-022)
 */

import { escapeHtml } from '../shared';

export interface PreviewContent {
  html: string | null;
  sourcePath: string | null;
  pushedAt: Date | null;
}

export interface PreviewDesignFile {
  relativePath: string;
  name: string;
  /** 카드 썸네일/시안 렌더용 (iframe srcdoc) */
  content?: string;
}

export function renderPreviewPage(
  preview: PreviewContent,
  designFiles: PreviewDesignFile[] = [],
): string {
  // 1) 활성 콘텐츠 있으면 — 풀-너비 viewer (push 또는 카드/시안 클릭)
  if (preview.html) {
    const escapedHtml = escapeHtml(preview.html);
    const sourceLabel = escapeHtml(preview.sourcePath ?? '(unknown)');
    const timeLabel = preview.pushedAt ? formatTime(preview.pushedAt) : '';

    return `
      <div class="preview-detail-bar">
        <button type="button" class="preview-back-btn" data-action="preview-back">← 그리드로</button>
        ${renderDetailNav(designFiles, preview.sourcePath)}
        <div class="preview-detail-path">${sourceLabel}</div>
        <div class="preview-detail-time">${timeLabel}</div>
      </div>
      <div class="preview-detail-frame-wrap">
        <iframe class="preview-detail-frame" srcdoc="${escapedHtml}" sandbox="allow-same-origin"></iframe>
      </div>`;
  }

  // 2) 시안 갤러리
  if (designFiles.length === 0) {
    return `
      <div class="page-hero compact">
        <div class="page-eyebrow">PREVIEW · 시안 갤러리</div>
        <h1 class="page-title">시안이 없어요</h1>
        <p class="page-subtitle">
          <code>docs/design/</code> 폴더에 <code>.html</code> 파일이 없습니다.<br/>
          파일을 추가하거나 채팅에서 <code>프리뷰에 [파일명] 띄와봐</code> 라고 명령해보세요.
        </p>
      </div>`;
  }

  // 카테고리별로 그룹화 (파일명 prefix 기반 자동 분류)
  const grouped = groupByCategory(designFiles);
  const groupsHtml = grouped.map(group => {
    const inner = group.files.length
      ? `<div class="preview-grid">${group.files.map(f => renderTile(f)).join('')}</div>`
      : `<div class="preview-category-empty">${escapeHtml(emptyHint(group.key))}</div>`;
    return `
    <section class="preview-category">
      <div class="preview-category-header">
        <span class="preview-category-icon">${group.icon}</span>
        <span class="preview-category-name">${escapeHtml(group.name)}</span>
        <span class="preview-category-count">${group.files.length}</span>
      </div>
      ${inner}
    </section>`;
  }).join('');

  return `
    <div class="page-hero compact">
      <div class="page-eyebrow">PREVIEW · 시안 갤러리</div>
      <h1 class="page-title">${designFiles.length}개 시안</h1>
      <p class="page-subtitle">
        이것저것 띄워보는 곳 · <code>docs/design/</code> 자동 listing · 카드 클릭으로 확대
      </p>
    </div>

    ${groupsHtml}`;
}

/**
 * 상세 뷰어 prev/next 네비 — 갤러리(카테고리 그룹) 순서대로 이전/다음 시안.
 * 버튼은 기존 `data-preview-file` 클릭 핸들러를 재사용(서버 round-trip = 파일 로드).
 * 시안이 2개 미만이거나 현재 파일을 못 찾으면 안 그림.
 */
function renderDetailNav(designFiles: PreviewDesignFile[], currentPath: string | null): string {
  if (designFiles.length < 2 || !currentPath) return '';
  const ordered = orderedFiles(designFiles);
  const idx = ordered.findIndex(f => f.relativePath === currentPath);
  if (idx === -1) return '';

  const prev = ordered[idx - 1];
  const next = ordered[idx + 1];
  const btn = (f: PreviewDesignFile | undefined, arrow: string, aria: string) =>
    f
      ? `<button type="button" class="preview-nav-btn" data-preview-file="${escapeHtml(f.relativePath)}" title="${escapeHtml(f.name)}" aria-label="${aria}: ${escapeHtml(f.name)}">${arrow}</button>`
      : `<button type="button" class="preview-nav-btn" disabled aria-label="${aria} 없음">${arrow}</button>`;

  return `
    <div class="preview-nav">
      ${btn(prev, '←', '이전 시안')}
      <span class="preview-nav-count">${idx + 1} / ${ordered.length}</span>
      ${btn(next, '→', '다음 시안')}
    </div>`;
}

/** 갤러리에 보이는 순서(카테고리 그룹 정렬)대로 평탄화한 파일 목록. */
function orderedFiles(designFiles: PreviewDesignFile[]): PreviewDesignFile[] {
  return groupByCategory(designFiles).flatMap(g => g.files);
}

function renderTile(f: PreviewDesignFile): string {
  const hue = simpleHash(f.relativePath) % 360;
  const accent = `hsl(${hue}, 70%, 75%)`;
  const accent2 = `hsl(${(hue + 60) % 360}, 70%, 85%)`;
  const thumbInner = f.content
    ? `<iframe class="preview-tile-frame" srcdoc="${escapeHtml(f.content)}" sandbox="allow-same-origin" scrolling="no" tabindex="-1"></iframe>
       <div class="preview-tile-click-shield"></div>
       <div class="preview-tile-html-label">HTML</div>`
    : `<div class="preview-tile-placeholder" style="background: linear-gradient(135deg, ${accent} 0%, ${accent2} 100%);">
         <div class="preview-tile-icon">🖼️</div>
         <div class="preview-tile-html-label">HTML</div>
       </div>`;
  return `
    <button type="button" class="preview-tile" data-preview-file="${escapeHtml(f.relativePath)}">
      <div class="preview-tile-thumb">${thumbInner}</div>
      <div class="preview-tile-body">
        <div class="preview-tile-name">${escapeHtml(f.name)}</div>
        <div class="preview-tile-path">${escapeHtml(f.relativePath.replace(/^docs\/design\//, ''))}</div>
      </div>
    </button>`;
}

interface PreviewGroup {
  key: string;
  name: string;
  icon: string;
  order: number;
  files: PreviewDesignFile[];
}

/**
 * 폴더 경로 기반 자동 카테고리 분류 (두 그룹).
 *
 * - docs/design/screenshots/*  → 📐 디자인 시안 (구현 계약 = source of truth)
 * - 그 외 (sandbox/ 등)         → 🧪 자유 실험 (이것저것 띄워보는 곳)
 */
function groupByCategory(files: PreviewDesignFile[]): PreviewGroup[] {
  const groups = new Map<string, PreviewGroup>();
  // 두 그룹은 파일이 없어도 항상 보이게 미리 만들어 둠 (자유 실험 비어도 헤더 노출)
  for (const cat of [DESIGN_CAT, SANDBOX_CAT]) groups.set(cat.key, { ...cat, files: [] });

  for (const f of files) {
    const cat = categorizeFile(f.relativePath);
    if (!groups.has(cat.key)) {
      groups.set(cat.key, { ...cat, files: [] });
    }
    groups.get(cat.key)!.files.push(f);
  }

  // 정렬 — order 작은 순 → 같으면 파일명
  return Array.from(groups.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
}

/** 빈 그룹 안내 문구. */
function emptyHint(key: string): string {
  if (key === 'sandbox') return '아직 없어요 · 채팅에서 "한번 만들어봐" 하면 여기에 떠요 (docs/design/ 직속에 저장)';
  return '아직 없어요 · docs/design/screenshots/ 에 .html 시안을 두면 떠요';
}

// 두 고정 카테고리 (항상 표시). screenshots/ = 컴포넌트 디자인(구현 계약), 그 밖 = 자유 실험.
const DESIGN_CAT = { key: 'design', name: '각 컴포넌트 디자인', icon: '📐', order: 10 };
const SANDBOX_CAT = { key: 'sandbox', name: '자유 실험', icon: '🧪', order: 20 };

function categorizeFile(relativePath: string): { key: string; name: string; icon: string; order: number } {
  return relativePath.toLowerCase().includes('/screenshots/') ? DESIGN_CAT : SANDBOX_CAT;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function formatTime(date: Date): string {
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}
