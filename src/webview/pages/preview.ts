/**
 * Preview 페이지 — 큰 아이콘 그리드 (Windows 탐색기 풍).
 *
 * - 카드 클릭: 풀-너비 viewer
 * - "← 그리드로" 버튼으로 그리드로 복귀
 * - 채팅 명령 push도 그대로 (Spec 페이지의 디자인 시안 명령)
 */

import { escapeHtml } from '../shared';
import { extractDesignTokens, DesignTokens } from '../design-tokens';

export interface PreviewContent {
  html: string | null;
  sourcePath: string | null;
  pushedAt: Date | null;
}

export interface PreviewDesignFile {
  relativePath: string;
  name: string;
  /** 카드 썸네일 렌더용 (iframe srcdoc) */
  content?: string;
}

export function renderPreviewPage(
  preview: PreviewContent,
  designFiles: PreviewDesignFile[] = [],
  designMarkdown: string | null = null,
): string {
  // 1) 활성 콘텐츠 있으면 — 풀-너비 viewer + 상단 그리드로 돌아가기 버튼
  if (preview.html) {
    const escapedHtml = escapeHtml(preview.html);
    const sourceLabel = escapeHtml(preview.sourcePath ?? '(unknown)');
    const timeLabel = preview.pushedAt ? formatTime(preview.pushedAt) : '';

    return `
      <div class="preview-detail-bar">
        <button type="button" class="preview-back-btn" data-action="preview-back">← 그리드로</button>
        <div class="preview-detail-path">${sourceLabel}</div>
        <div class="preview-detail-time">${timeLabel}</div>
      </div>
      <div class="preview-detail-frame-wrap">
        <iframe class="preview-detail-frame" srcdoc="${escapedHtml}" sandbox="allow-same-origin"></iframe>
      </div>`;
  }

  // 2) 그리드 — 상단에 DESIGN TOKENS(DESIGN.md 자동 추출) + 아래 시안 갤러리
  const tokensHtml = renderDesignTokens(extractDesignTokens(designMarkdown));

  if (designFiles.length === 0) {
    return `
      ${tokensHtml}
      <div class="page-hero compact">
        <div class="page-eyebrow">PREVIEW · 디자인 시안</div>
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
    const tiles = group.files.map(f => renderTile(f)).join('');
    return `
    <section class="preview-category">
      <div class="preview-category-header">
        <span class="preview-category-icon">${group.icon}</span>
        <span class="preview-category-name">${escapeHtml(group.name)}</span>
        <span class="preview-category-count">${group.files.length}</span>
      </div>
      <div class="preview-grid">${tiles}</div>
    </section>`;
  }).join('');

  return `
    ${tokensHtml}
    <div class="page-hero compact">
      <div class="page-eyebrow">PREVIEW · 디자인 시안</div>
      <h1 class="page-title">${designFiles.length}개 시안</h1>
      <p class="page-subtitle">
        <code>docs/design/</code> 폴더 자동 listing · 카테고리별 분리 · 큰 카드 클릭으로 확대
      </p>
    </div>

    ${groupsHtml}`;
}

/**
 * DESIGN TOKENS 패널 — DESIGN.md에서 자동 추출한 색상 스와치 + 폰트 샘플 (JTBD5).
 * 토큰이 하나도 없으면 빈 문자열(섹션 자체를 그리지 않음).
 */
function renderDesignTokens(tokens: DesignTokens): string {
  if (tokens.colors.length === 0 && tokens.fonts.length === 0) return '';

  const swatches = tokens.colors.map(c => {
    const tip = c.label ? `${c.label} · ${c.value}` : c.value;
    return `
      <div class="token-swatch" title="${escapeHtml(tip)}">
        <span class="token-chip"><span class="token-chip-fill" style="background:${escapeHtml(c.value)}"></span></span>
        <span class="token-meta">
          <span class="token-value">${escapeHtml(c.value)}</span>
          ${c.label ? `<span class="token-label">${escapeHtml(c.label)}</span>` : ''}
        </span>
      </div>`;
  }).join('');

  const fonts = tokens.fonts.map(f => `
    <div class="token-font">
      <span class="token-font-sample" style="font-family:'${escapeHtml(f)}', 'Pretendard Variable', sans-serif">Aa 가나다 123</span>
      <span class="token-font-name">${escapeHtml(f)}</span>
    </div>`).join('');

  return `
    <section class="preview-tokens">
      <div class="preview-category-header">
        <span class="preview-category-icon">🎨</span>
        <span class="preview-category-name">DESIGN TOKENS</span>
        <span class="preview-category-count">${tokens.colors.length + tokens.fonts.length}</span>
      </div>
      <div class="token-subtitle">DESIGN.md에서 자동 추출 — 색상 ${tokens.colors.length} · 폰트 ${tokens.fonts.length}</div>
      ${tokens.colors.length ? `<div class="token-swatches">${swatches}</div>` : ''}
      ${tokens.fonts.length ? `<div class="token-fonts">${fonts}</div>` : ''}
    </section>`;
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
 * 파일명 prefix 기반 자동 카테고리 분류.
 *
 * - sidebar*.html              → 사이드바
 * - webview-plan*.html         → Plan 페이지
 * - webview-spec-*.html        → Spec 페이지
 * - webview-preview*.html      → Preview 페이지
 * - webview-errors*.html       → Errors 페이지
 * - *-mockup-*.html            → 검증 단계 mockup
 * - 그 외                       → 기타
 */
function groupByCategory(files: PreviewDesignFile[]): PreviewGroup[] {
  const groups = new Map<string, PreviewGroup>();

  for (const f of files) {
    const cat = categorizeFile(f.name);
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

function categorizeFile(name: string): { key: string; name: string; icon: string; order: number } {
  const n = name.toLowerCase();

  if (n.includes('mockup')) {
    return { key: 'mockup', name: 'Mockup · 검증 단계', icon: '🧪', order: 90 };
  }
  if (n.startsWith('sidebar')) {
    return { key: 'sidebar', name: '사이드바', icon: '📊', order: 10 };
  }
  if (n.startsWith('webview-plan')) {
    return { key: 'plan', name: 'Webview · Plan', icon: '🗺️', order: 20 };
  }
  if (n.startsWith('webview-spec')) {
    return { key: 'spec', name: 'Webview · Spec', icon: '📋', order: 30 };
  }
  if (n.startsWith('webview-preview')) {
    return { key: 'preview', name: 'Webview · Preview', icon: '🖼️', order: 40 };
  }
  if (n.startsWith('webview-errors')) {
    return { key: 'errors', name: 'Webview · Errors', icon: '⚠️', order: 50 };
  }
  if (n.startsWith('webview')) {
    return { key: 'webview', name: 'Webview · 기타', icon: '🪟', order: 60 };
  }
  return { key: 'other', name: '기타', icon: '📄', order: 100 };
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
