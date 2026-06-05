/**
 * Spec 페이지 — 폴더 탐색기 풍 (V0.4+ 채택안).
 *
 * 좌측: 트리 (PRODUCT/DESIGN/ARCHITECTURE 폴더 → 각 ## 섹션을 file로)
 * 우측: 선택한 섹션을 풀-너비 마크다운 렌더 (## 카드 변환 X — 이미 섹션 단위)
 *
 * 클릭 → postMessage('spec-select') → panel이 specActiveSection 갱신 → refresh.
 */

import { extractSections, renderMarkdownSection, escapeHtml, MarkdownSection } from '../shared';

export interface SpecExtraFile {
  /** 워크스페이스 상대 경로 — 예: 'docs/adr/ADR-001-foo.md' */
  relativePath: string;
  /** 파일명 */
  name: string;
  /** ADR/MD인 경우 마크다운 내용 (null이면 lazy) */
  content?: string;
}

export interface SpecArtifacts {
  product: string | null;
  feasibility: string | null;
  design: string | null;
  architecture: string | null;
  /** docs/adr/*.md 파일들 */
  adrFiles?: SpecExtraFile[];
  /** docs/design/screenshots/*.html 파일들 */
  designHtmlFiles?: SpecExtraFile[];
}

const FOLDER_LABELS: Record<string, string> = {
  product: 'PRODUCT.md',
  feasibility: 'FEASIBILITY.md',
  design: 'DESIGN.md',
  architecture: 'ARCHITECTURE.md',
  adr: 'adr/',
  'design-gallery': 'design/screenshots/',
};

export type SpecFolderKey = 'product' | 'feasibility' | 'design' | 'architecture' | 'adr' | 'design-gallery';

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
    ['product', artifacts.product ? extractSections(artifacts.product) : []],
    ['feasibility', artifacts.feasibility ? extractSections(artifacts.feasibility) : []],
    ['design', artifacts.design ? extractSections(artifacts.design) : []],
    ['architecture', artifacts.architecture ? extractSections(artifacts.architecture) : []],
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
    if (sections.length === 0) return '';
    const open = folder === activeFolder ? 'open' : '';
    const rows = sections.map(s => {
      const isActive = folder === activeFolder && s.id === activeSectionId ? 'active' : '';
      const icon = sectionIcon(folder, s.heading);
      return `<li><button type="button" class="spec-row ${isActive}" data-spec-select="${folder}:${s.id}">
        <span class="spec-icon">${icon}</span>
        <span class="spec-label">${escapeHtml(s.heading)}</span>
      </button></li>`;
    }).join('');
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
