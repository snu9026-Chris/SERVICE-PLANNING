/**
 * Spec 페이지 — 폴더 탐색기 풍 (V0.4+ 채택안).
 *
 * 좌측: 트리 (PRODUCT/DESIGN/ARCHITECTURE 폴더 → 각 ## 섹션을 file로)
 * 우측: 선택한 섹션을 풀-너비 마크다운 렌더 (## 카드 변환 X — 이미 섹션 단위)
 *
 * 클릭 → postMessage('spec-select') → panel이 specActiveSection 갱신 → refresh.
 */

import { extractSections, renderMarkdownSection, escapeHtml, MarkdownSection } from '../shared';
import { extractDesignTokens } from '../design-tokens';

export interface SpecExtraFile {
  /** 워크스페이스 상대 경로 — 예: 'docs/adr/ADR-001-foo.md' */
  relativePath: string;
  /** 파일명 */
  name: string;
  /** ADR/MD인 경우 마크다운 내용 (null이면 lazy) */
  content?: string;
}

export interface SpecArtifacts {
  inquiry: string | null;
  product: string | null;
  feasibility: string | null;
  design: string | null;
  architecture: string | null;
  uxQuality: string | null;
  /** docs/adr/*.md 파일들 */
  adrFiles?: SpecExtraFile[];
  /** docs/design/screenshots/*.html 파일들 */
  designHtmlFiles?: SpecExtraFile[];
}

const FOLDER_LABELS: Record<string, string> = {
  inquiry: 'INQUIRY.md',
  product: 'PRODUCT.md',
  feasibility: 'FEASIBILITY.md',
  design: 'DESIGN.md',
  architecture: 'ARCHITECTURE.md',
  'ux-quality': 'UX-QUALITY.md',
  adr: 'adr/',
  'design-gallery': 'design/screenshots/',
};

export type SpecFolderKey = 'inquiry' | 'product' | 'feasibility' | 'design' | 'architecture' | 'ux-quality' | 'adr' | 'design-gallery';

/** DESIGN.md 폴더 아래 디자인 토큰 전용 노드의 가상 섹션 id (실제 ## 섹션이 아님) */
const TOKENS_SECTION_ID = '__tokens__';

/**
 * `${folder}:${sectionId}` 형식. 예: "product:non-goals"
 */
export type SpecActiveSelection = string;

export function renderSpecPage(
  artifacts: SpecArtifacts,
  active?: SpecActiveSelection,
  focusedFolder?: SpecFolderKey,
): string {
  // 각 폴더의 섹션 추출 (PRODUCT/DESIGN/ARCH는 ## 헤딩, adr/와 design-gallery는 파일)
  const adrSections: MarkdownSection[] = (artifacts.adrFiles ?? []).map(f => ({
    id: f.name.replace(/\.md$/, '').toLowerCase(),
    heading: f.name.replace(/\.md$/, ''),
    content: f.content ?? `# ${f.name}\n\n_(로드 중...)_`,
  }));
  const galleryFiles = artifacts.designHtmlFiles ?? [];

  const folders: Array<[SpecFolderKey, MarkdownSection[]]> = [
    ['inquiry', artifacts.inquiry ? extractSections(artifacts.inquiry) : []],
    ['product', artifacts.product ? extractSections(artifacts.product) : []],
    ['feasibility', artifacts.feasibility ? extractSections(artifacts.feasibility) : []],
    ['design', artifacts.design ? extractSections(artifacts.design) : []],
    ['architecture', artifacts.architecture ? extractSections(artifacts.architecture) : []],
    ['ux-quality', artifacts.uxQuality ? extractSections(artifacts.uxQuality) : []],
    ['adr', adrSections],
    // design-gallery는 별도 — 섹션이 아닌 파일들. 트리에 표시는 빈 배열로 (특수 처리)
    ['design-gallery', []],
  ];

  // 활성 선택 결정
  let activeFolder: SpecFolderKey;
  let activeSectionId: string;
  if (active) {
    const [f, sid] = active.split(':');
    activeFolder = (f as SpecFolderKey);
    activeSectionId = sid;
  } else if (focusedFolder) {
    activeFolder = focusedFolder;
    activeSectionId = folders.find(([k]) => k === focusedFolder)?.[1]?.[0]?.id ?? '';
  } else {
    // 첫 사용 가능한 폴더의 첫 섹션
    const firstAvail = folders.find(([, secs]) => secs.length > 0);
    activeFolder = firstAvail?.[0] ?? 'product';
    activeSectionId = firstAvail?.[1]?.[0]?.id ?? '';
  }

  const hasAny = folders.some(([, secs]) => secs.length > 0) || galleryFiles.length > 0;
  if (!hasAny) {
    return `
      <div class="page-hero">
        <div class="page-eyebrow">SPEC</div>
        <h1 class="page-title">No artifacts yet</h1>
        <p class="page-subtitle">docs/ 에 PRODUCT.md / DESIGN.md / ARCHITECTURE.md 가 없습니다.</p>
      </div>`;
  }

  // 트리 렌더
  const treeHtml = folders.map(([folder, sections]) => {
    // design-gallery는 특수 처리 — children에 .html 파일들
    if (folder === 'design-gallery') {
      if (galleryFiles.length === 0) return '';
      const open = folder === activeFolder ? 'open' : '';
      const rows = galleryFiles.map(f => {
        const sid = f.name.toLowerCase().replace(/\.html$/, '');
        const isActive = folder === activeFolder && sid === activeSectionId ? 'active' : '';
        return `<li><button type="button" class="spec-row ${isActive}" data-spec-select="${folder}:${sid}">
          <span class="spec-icon">🖼️</span>
          <span class="spec-label">${escapeHtml(f.name)}</span>
        </button></li>`;
      }).join('');
      return `<li class="spec-folder ${open}">
        <button type="button" class="spec-row spec-folder-row" data-spec-folder-toggle="${folder}" data-spec-select="${folder}:__overview__">
          <span class="spec-chevron">▶</span>
          <span class="spec-icon">📁</span>
          <span class="spec-label">${FOLDER_LABELS[folder]}</span>
          <span class="spec-meta">${galleryFiles.length}</span>
        </button>
        <ul class="spec-children">${rows}</ul>
      </li>`;
    }
    // design 폴더는 ## 섹션이 없어도(=DESIGN.md가 제목 없이 토큰만 있어도) TOKENS 노드는 보여야 한다.
    if (sections.length === 0 && !(folder === 'design' && artifacts.design)) return '';
    const open = folder === activeFolder ? 'open' : '';
    let rows = sections.map(s => {
      const isActive = folder === activeFolder && s.id === activeSectionId ? 'active' : '';
      const icon = sectionIcon(folder, s.heading);
      return `<li><button type="button" class="spec-row ${isActive}" data-spec-select="${folder}:${s.id}">
        <span class="spec-icon">${icon}</span>
        <span class="spec-label">${escapeHtml(s.heading)}</span>
      </button></li>`;
    }).join('');
    // DESIGN.md 폴더 맨 위에 디자인 토큰 전용 노드 — DESIGN.md에서 색·폰트를 자동 추출해 보여줌
    if (folder === 'design') {
      const isActive = activeFolder === 'design' && activeSectionId === TOKENS_SECTION_ID ? 'active' : '';
      rows = `<li><button type="button" class="spec-row ${isActive}" data-spec-select="design:${TOKENS_SECTION_ID}">
        <span class="spec-icon">🎨</span>
        <span class="spec-label">DESIGN TOKENS</span>
      </button></li>` + rows;
    }
    return `<li class="spec-folder ${open}">
      <button type="button" class="spec-row spec-folder-row" data-spec-folder-toggle="${folder}">
        <span class="spec-chevron">▶</span>
        <span class="spec-icon">📁</span>
        <span class="spec-label">${FOLDER_LABELS[folder]}</span>
        <span class="spec-meta">${sections.length}</span>
      </button>
      <ul class="spec-children">${rows}</ul>
    </li>`;
  }).join('');

  // 활성 콘텐츠
  let contentHtml: string;
  if (activeFolder === 'design-gallery') {
    // 큰 아이콘 그리드 또는 단일 파일 미리보기
    if (activeSectionId === '__overview__' || activeSectionId === '') {
      // 그리드
      const tilesHtml = galleryFiles.map(f => {
        const sid = f.name.toLowerCase().replace(/\.html$/, '');
        const hue = simpleHash(f.relativePath) % 360;
        const accent = `hsl(${hue}, 70%, 75%)`;
        const accent2 = `hsl(${(hue + 60) % 360}, 70%, 85%)`;
        const thumbInner = f.content
          ? `<iframe class="spec-gallery-frame-thumb" srcdoc="${escapeHtml(f.content)}" sandbox="allow-same-origin" scrolling="no" tabindex="-1"></iframe>
             <div class="spec-gallery-click-shield"></div>
             <div class="spec-gallery-html-label">HTML</div>`
          : `<div class="spec-gallery-placeholder" style="background: linear-gradient(135deg, ${accent} 0%, ${accent2} 100%);">
               <div class="spec-gallery-icon">🖼️</div>
               <div class="spec-gallery-html-label">HTML</div>
             </div>`;
        return `
          <button type="button" class="spec-gallery-tile" data-spec-select="design-gallery:${sid}">
            <div class="spec-gallery-thumb">
              ${thumbInner}
            </div>
            <div class="spec-gallery-body">
              <div class="spec-gallery-name">${escapeHtml(f.name)}</div>
              <div class="spec-gallery-path">${escapeHtml(f.relativePath.replace(/^docs\/design\/screenshots\//, ''))}</div>
            </div>
          </button>`;
      }).join('');
      contentHtml = `
        <div class="spec-breadcrumb">
          <span>docs/</span>
          <span class="spec-bc-sep">›</span>
          <span class="spec-bc-leaf">${escapeHtml(FOLDER_LABELS['design-gallery'])}</span>
        </div>
        <h2 class="spec-gallery-title">${galleryFiles.length}개 디자인 시안</h2>
        <p class="spec-gallery-subtitle">큰 카드 클릭으로 미리보기</p>
        <div class="spec-gallery-grid">${tilesHtml}</div>`;
    } else {
      // 특정 .html 미리보기
      const target = galleryFiles.find(f =>
        f.name.toLowerCase().replace(/\.html$/, '') === activeSectionId,
      );
      if (target && target.content) {
        contentHtml = `
          <div class="spec-breadcrumb">
            <span>docs/</span>
            <span class="spec-bc-sep">›</span>
            <span>${escapeHtml(FOLDER_LABELS['design-gallery'])}</span>
            <span class="spec-bc-sep">›</span>
            <span class="spec-bc-leaf">${escapeHtml(target.name)}</span>
          </div>
          <div class="spec-gallery-viewer-bar">
            <button type="button" class="spec-gallery-back" data-spec-select="design-gallery:__overview__">← 그리드로</button>
            <span class="spec-gallery-viewer-path">${escapeHtml(target.relativePath)}</span>
          </div>
          <iframe class="spec-gallery-frame" srcdoc="${escapeHtml(target.content)}" sandbox="allow-same-origin"></iframe>`;
      } else {
        contentHtml = `<div class="spec-empty-detail">파일을 찾을 수 없습니다</div>`;
      }
    }
  } else if (activeFolder === 'design' && activeSectionId === TOKENS_SECTION_ID) {
    // DESIGN TOKENS 전용 뷰 — DESIGN.md에서 자동 추출한 색·폰트 스와치 패널
    contentHtml = renderDesignTokensContent(artifacts.design);
  } else {
    // 일반 폴더 (PRODUCT/DESIGN/ARCH/adr) — 섹션 콘텐츠
    const activeSections = folders.find(([k]) => k === activeFolder)?.[1] ?? [];
    const activeSection = activeSections.find(s => s.id === activeSectionId) ?? activeSections[0];
    contentHtml = activeSection
      ? `<div class="spec-breadcrumb">
           <span>docs/</span>
           <span class="spec-bc-sep">›</span>
           <span>${escapeHtml(FOLDER_LABELS[activeFolder])}</span>
           <span class="spec-bc-sep">›</span>
           <span class="spec-bc-leaf">${escapeHtml(activeSection.heading)}</span>
         </div>
         <div class="markdown-body spec-content-body">
           ${renderMarkdownSection(activeSection.content)}
         </div>`
      : `<div class="spec-empty-detail">섹션을 선택하세요</div>`;
  }

  return `
    <div class="page-hero">
      <div class="page-eyebrow">SPEC · EXPLORER</div>
      <h1 class="page-title">기획 명세</h1>
      <p class="page-subtitle">좌측에서 폴더 펼치고 ## 섹션을 클릭. 우측에 풀-너비 렌더.</p>
    </div>

    <div class="spec-explorer">
      <aside class="spec-tree-pane">
        <div class="spec-tree-header">DOCS</div>
        <ul class="spec-tree">${treeHtml}</ul>
      </aside>
      <main class="spec-content-pane">
        ${contentHtml}
      </main>
    </div>`;
}

/**
 * DESIGN TOKENS 콘텐츠 — DESIGN.md에서 자동 추출한 색상 스와치 + 폰트 샘플 (JTBD5).
 * 우측 콘텐츠 패널 안에 breadcrumb + 스와치 그리드로 렌더한다.
 */
function renderDesignTokensContent(designMarkdown: string | null): string {
  const tokens = extractDesignTokens(designMarkdown);
  const breadcrumb = `<div class="spec-breadcrumb">
    <span>docs/</span>
    <span class="spec-bc-sep">›</span>
    <span>${escapeHtml(FOLDER_LABELS['design'])}</span>
    <span class="spec-bc-sep">›</span>
    <span class="spec-bc-leaf">DESIGN TOKENS</span>
  </div>`;

  if (tokens.colors.length === 0 && tokens.fonts.length === 0) {
    return `${breadcrumb}<div class="spec-empty-detail">DESIGN.md에서 추출할 색상·폰트가 없습니다.</div>`;
  }

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

  return `${breadcrumb}
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

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function sectionIcon(folder: SpecFolderKey, heading: string): string {
  if (folder === 'adr') return '📜';
  const h = heading.toLowerCase();
  if (h.includes('non-goals') || h.includes('non goals')) return '🚫';
  if (h.includes('색') || h.includes('color')) return '🎨';
  if (h.includes('타이포') || h.includes('typography')) return '🔤';
  if (h.includes('디자인 시안') || h.includes('screenshot')) return '🖼️';
  if (h.includes('stack')) return '⚙️';
  if (h.includes('domain map') || h.includes('도메인 맵')) return '🗺️';
  if (h.includes('performance')) return '⚡';
  if (h.includes('adr')) return '📋';
  return '📄';
}
