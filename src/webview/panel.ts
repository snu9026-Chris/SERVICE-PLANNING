/**
 * 가운데 Webview 패널 — 4페이지 멀티탭.
 *
 * 탭:
 *  1. Plan    — plans/roadmap.md (state.md 현재 위치 강조)
 *  2. Spec    — PRODUCT/DESIGN/ARCHITECTURE.md 풀-너비
 *  3. Preview — Claude push한 HTML 1개
 *  4. QA      — docs/qa.report.md (전수 점검 체크리스트, 없으면 안내)
 *  5. Errors  — docs/error.history.md (없으면 생성 버튼)
 *
 * 데이터 흐름:
 *  extension.ts → setBlueprintState / setSpecArtifacts / setPreviewContent / setErrorHistory → refresh
 *  사용자 탭 클릭 → postMessage('tab-click') → activeTab 변경 → refresh
 *  사용자 "create-error-history" 클릭 → postMessage → onCreateErrorHistory 콜백
 *
 * 데이터 캐싱: 모든 페이지 데이터 메모리에 유지. 탭 전환 시 즉시 표시.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BlueprintState } from '../types';
import { renderPlanPage } from './pages/plan';
import { renderSpecPage, SpecArtifacts, SpecActiveSelection, SpecFolderKey } from './pages/spec';
import { renderPreviewPage, PreviewContent, PreviewDesignFile } from './pages/preview';
import { renderQaPage } from './pages/qa';
import { renderErrorsPage } from './pages/errors';
import { renderGuidePage } from './pages/guide';
import { makeNonce, escapeHtml } from './shared';

const VIEW_TYPE = 'blueprintDashboard';
const PANEL_TITLE = 'Blueprint Dashboard';

export type TabId = 'plan' | 'spec' | 'preview' | 'qa' | 'errors' | 'guide';

const TAB_LABELS: Record<TabId, string> = {
  plan: 'Plan',
  spec: 'Spec',
  preview: 'Preview',
  qa: 'QA',
  errors: 'Errors',
  guide: 'Guide',
};

const TAB_ORDER: TabId[] = ['plan', 'spec', 'preview', 'qa', 'errors', 'guide'];

export interface BlueprintWebviewPanelCallbacks {
  /** Errors 페이지에서 "에러 히스토리 시작" 버튼 클릭 시 호출 */
  onCreateErrorHistory: () => Promise<void> | void;
  /** Preview listing에서 파일 클릭 시 호출 (file path = 워크스페이스 상대 경로) */
  onPreviewFileClick: (relativePath: string) => Promise<void> | void;
}

export class BlueprintWebviewPanel {
  private panel: vscode.WebviewPanel | null = null;
  private activeTab: TabId = 'plan';

  // 페이지별 데이터 캐시
  private currentState: BlueprintState | null = null;
  private roadmapMd: string | null = null;
  private specArtifacts: SpecArtifacts = { inquiry: null, product: null, feasibility: null, design: null, architecture: null, uxQuality: null };
  private specFocus?: SpecFolderKey;
  private specActive?: SpecActiveSelection;
  private preview: PreviewContent = { html: null, sourcePath: null, pushedAt: null };
  private designFiles: PreviewDesignFile[] = [];
  private qaReportMd: string | null = null;
  private errorHistoryMd: string | null = null;

  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceFolder: vscode.WorkspaceFolder,
    private callbacks: BlueprintWebviewPanelCallbacks,
  ) {}

  // ── Public API ──────────────────────────────────────────

  show(initialTab?: TabId): void {
    if (initialTab) this.activeTab = initialTab;

    if (this.panel) {
      // 이미 떠있으면 사용자가 둔 위치 그대로 reveal (드래그로 옮긴 위치 유지)
      this.panel.reveal(undefined, true);
      this.refresh();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      PANEL_TITLE,
      // Antigravity 채팅이 첫 Editor Group을 차지하는 환경 대응 — Beside로 두면
      // 활성 에디터 옆에 split됨. 사용자가 드래그로 위치 자유롭게 조정 가능.
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview')),
          vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'fonts')),
          this.workspaceFolder.uri, // 워크스페이스 이미지 (DESIGN.md 시안 등) 렌더링 위해
        ],
      },
    );

    this.panel.webview.onDidReceiveMessage(
      msg => this.handleMessage(msg),
      null,
      this.disposables,
    );

    this.panel.onDidDispose(
      () => {
        this.panel = null;
      },
      null,
      this.disposables,
    );

    this.refresh();
  }

  setBlueprintState(state: BlueprintState | null): void {
    this.currentState = state;
    if (this.panel) this.refresh();
  }

  setRoadmap(md: string | null): void {
    this.roadmapMd = md;
    if (this.panel && this.activeTab === 'plan') this.refresh();
  }

  setSpecArtifacts(artifacts: Partial<SpecArtifacts>): void {
    this.specArtifacts = { ...this.specArtifacts, ...artifacts };
    // Spec 탭은 물론, Plan 탭도 PRODUCT/INQUIRY로 "지금 만드는 것" 칸을 그리므로 갱신
    if (this.panel && (this.activeTab === 'spec' || this.activeTab === 'plan')) this.refresh();
  }

  setDesignFiles(files: PreviewDesignFile[]): void {
    this.designFiles = files;
    if (this.panel && this.activeTab === 'preview') this.refresh();
  }

  setQaReport(md: string | null): void {
    this.qaReportMd = md;
    if (this.panel && this.activeTab === 'qa') this.refresh();
  }

  setErrorHistory(md: string | null): void {
    this.errorHistoryMd = md;
    if (this.panel && this.activeTab === 'errors') this.refresh();
  }

  /** Phase 클릭 시 — 해당 phase의 콘텐츠 탭으로 이동 */
  async showArtifact(phaseKey: string): Promise<void> {
    const phase = this.currentState?.phases.find(p => p.key === phaseKey);

    // QA phase는 Spec이 아니라 독립 QA 탭으로 (ADR-015: Spec 종속 제거)
    if (phase?.name === 'QA') {
      this.activeTab = 'qa';
      this.show();
      return;
    }
    // ERRORS phase가 있으면 Errors 탭으로
    if (phase?.name === 'ERRORS') {
      this.activeTab = 'errors';
      this.show();
      return;
    }

    const section = artifactFolderForPhaseName(phase?.name);
    this.specFocus = section;
    this.specActive = undefined; // 폴더의 첫 섹션으로 리셋
    this.activeTab = 'spec';
    this.show();
  }

  /** 채팅 명령으로 Preview push 또는 사이드 클릭으로 표시 */
  setPreviewContent(html: string, sourcePath: string, autoSwitch = true): void {
    this.preview = { html, sourcePath, pushedAt: new Date() };
    if (autoSwitch) {
      this.activeTab = 'preview';
      this.show();
    } else if (this.panel && this.activeTab === 'preview') {
      this.refresh();
    }
  }

  switchTab(tab: TabId): void {
    this.activeTab = tab;
    this.refresh();
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  // ── Internal ─────────────────────────────────────────────

  private async handleMessage(msg: any): Promise<void> {
    if (!msg) return;
    if (msg.type === 'tab-click' && typeof msg.tab === 'string') {
      if (TAB_ORDER.includes(msg.tab as TabId)) {
        this.switchTab(msg.tab as TabId);
      }
    } else if (msg.type === 'action' && msg.action === 'create-error-history') {
      await this.callbacks.onCreateErrorHistory();
    } else if (msg.type === 'action' && msg.action === 'preview-back') {
      // 그리드로 복귀 — preview 콘텐츠 비움
      this.preview = { html: null, sourcePath: null, pushedAt: null };
      this.refresh();
    } else if (msg.type === 'preview-file-click' && typeof msg.path === 'string') {
      await this.callbacks.onPreviewFileClick(msg.path);
    } else if (msg.type === 'spec-select' && typeof msg.selection === 'string') {
      this.specActive = msg.selection;
      this.refresh();
    } else if (msg.type === 'spec-folder-toggle' && typeof msg.folder === 'string') {
      // 폴더 토글은 클라이언트 JS에서 직접 처리 (DOM 토글). 서버 round-trip 불필요.
      // 메시지 받아도 무시.
    }
  }

  private refresh(): void {
    if (!this.panel) return;
    this.panel.webview.html = this.buildHtml();
  }

  private buildHtml(): string {
    if (!this.panel) return '';

    const cssOnDisk = vscode.Uri.file(
      path.join(this.context.extensionPath, 'out', 'webview', 'styles.css'),
    );
    const cssUri = this.panel.webview.asWebviewUri(cssOnDisk);
    const nonce = makeNonce();
    const csp = `default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; font-src ${this.panel.webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${this.panel.webview.cspSource} data:; frame-src data:; child-src data:;`;

    const tabsHtml = this.renderTabs();
    const pageHtml = this.rewriteImageUris(this.renderActivePage());

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <link rel="stylesheet" href="${cssUri}" />
</head>
<body>
  <div class="dashboard">
    <nav class="tab-nav">${tabsHtml}</nav>
    <main class="page-container">
      ${pageHtml}
    </main>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('[data-tab]').forEach(el => {
      el.addEventListener('click', () => {
        vscode.postMessage({ type: 'tab-click', tab: el.getAttribute('data-tab') });
      });
    });

    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        vscode.postMessage({ type: 'action', action: el.getAttribute('data-action') });
      });
    });

    document.querySelectorAll('[data-preview-file]').forEach(el => {
      el.addEventListener('click', () => {
        vscode.postMessage({ type: 'preview-file-click', path: el.getAttribute('data-preview-file') });
      });
    });

    // Guide 파이프라인 — 단계 클릭 시 우측 상세 전환 (클라이언트 측 토글, 서버 round-trip 불필요)
    document.querySelectorAll('[data-guide-step]').forEach(el => {
      el.addEventListener('click', () => {
        const k = el.getAttribute('data-guide-step');
        document.querySelectorAll('[data-guide-step]').forEach(s => s.classList.toggle('active', s === el));
        document.querySelectorAll('[data-guide-detail]').forEach(d =>
          d.classList.toggle('active', d.getAttribute('data-guide-detail') === k));
      });
    });

    // Spec explorer — 섹션 클릭
    document.querySelectorAll('[data-spec-select]').forEach(el => {
      el.addEventListener('click', () => {
        vscode.postMessage({ type: 'spec-select', selection: el.getAttribute('data-spec-select') });
      });
    });

    // Spec explorer — 폴더 토글 (클라이언트 측 DOM 토글)
    document.querySelectorAll('[data-spec-folder-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const li = el.closest('.spec-folder');
        if (li) li.classList.toggle('open');
      });
    });

    // QA 섹션 — 노션식 접이식 토글 (클라이언트 측 DOM 토글)
    document.querySelectorAll('[data-qa-toggle]').forEach(el => {
      el.addEventListener('click', () => {
        const sec = el.closest('.qa-section');
        if (!sec) return;
        sec.classList.toggle('open');
        el.setAttribute('aria-expanded', sec.classList.contains('open') ? 'true' : 'false');
      });
    });
    const setAllQa = (open) => {
      document.querySelectorAll('.qa-section').forEach(sec => {
        sec.classList.toggle('open', open);
        const head = sec.querySelector('[data-qa-toggle]');
        if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    };
    document.querySelectorAll('[data-qa-expand-all]').forEach(el =>
      el.addEventListener('click', () => setAllQa(true)));
    document.querySelectorAll('[data-qa-collapse-all]').forEach(el =>
      el.addEventListener('click', () => setAllQa(false)));

    // Design gallery — img 깨지면 placeholder만 보이게 (img 자체 hide)
    document.querySelectorAll('.gallery-image[data-fallback="show"]').forEach(img => {
      img.addEventListener('error', () => img.classList.add('hidden'));
      // 이미 로드 실패한 경우도 처리 (cache 등)
      if (img.complete && img.naturalWidth === 0) img.classList.add('hidden');
    });

    // Spec 페이지 — anchor nav 클릭 시 탭처럼 섹션 전환 (스크롤 X)
    const specSections = document.querySelectorAll('.spec-section-flat');
    const anchorLinks = document.querySelectorAll('.anchor-link[data-spec-target]');
    if (specSections.length > 0 && anchorLinks.length > 0) {
      const switchSection = (targetId) => {
        specSections.forEach(s => s.classList.toggle('active', s.id === targetId));
        anchorLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('data-spec-target') === targetId);
        });
        // 스크롤 맨 위로
        window.scrollTo({ top: 0, behavior: 'instant' });
      };

      anchorLinks.forEach(link => {
        link.addEventListener('click', () => {
          const target = link.getAttribute('data-spec-target');
          if (target) switchSection(target);
        });
      });
    }
  </script>
</body>
</html>`;
  }

  private renderTabs(): string {
    return TAB_ORDER.map(tab => {
      const active = tab === this.activeTab ? 'active' : '';
      const badge = this.tabBadge(tab);
      return `<button class="tab ${active}" data-tab="${tab}">
        <span class="tab-label">${TAB_LABELS[tab]}</span>
        ${badge}
      </button>`;
    }).join('');
  }

  private tabBadge(tab: TabId): string {
    if (tab === 'preview' && this.preview.html) return `<span class="tab-dot tab-dot-blue"></span>`;
    if (tab === 'qa' && this.qaReportMd) {
      // FAIL이 있으면 빨강 count, 없고 WARN이 있으면 주황 count, 둘 다 없으면 초록 점
      const fails = (this.qaReportMd.match(/^[-*]\s+❌/gm) ?? []).length;
      const warns = (this.qaReportMd.match(/^[-*]\s+⚠/gm) ?? []).length;
      if (fails > 0) return `<span class="tab-count tab-count-fail">${fails}</span>`;
      if (warns > 0) return `<span class="tab-count tab-count-warn">${warns}</span>`;
      return `<span class="tab-dot tab-dot-green"></span>`;
    }
    if (tab === 'errors' && this.errorHistoryMd) {
      const count = (this.errorHistoryMd.match(/^## \d{4}-\d{2}-\d{2}/gm) ?? []).length;
      if (count > 0) return `<span class="tab-count">${count}</span>`;
    }
    return '';
  }

  private renderActivePage(): string {
    switch (this.activeTab) {
      case 'plan':
        return renderPlanPage(this.currentState, this.roadmapMd, this.specArtifacts.product, this.specArtifacts.inquiry);
      case 'spec':
        return renderSpecPage(this.specArtifacts, this.specActive, this.specFocus);
      case 'preview':
        return renderPreviewPage(this.preview, this.designFiles, this.specArtifacts.design);
      case 'qa':
        return renderQaPage(this.qaReportMd);
      case 'errors':
        return renderErrorsPage(this.errorHistoryMd);
      case 'guide':
        return renderGuidePage();
    }
  }

  /**
   * 마크다운 이미지의 상대 경로(예: docs/design/screenshots/sidebar.png)를
   * webview에서 로드 가능한 vscode-webview-resource URI로 변환.
   * 절대 URL (http/data/vscode-) 은 그대로 둠.
   */
  private rewriteImageUris(html: string): string {
    if (!this.panel) return html;
    const webview = this.panel.webview;
    const folderFs = this.workspaceFolder.uri.fsPath;
    return html.replace(
      /<img\s+([^>]*?)src="([^"]+)"/g,
      (match, attrs, src) => {
        if (/^(https?:|data:|vscode-)/i.test(src)) return match;
        const absPath = path.isAbsolute(src) ? src : path.join(folderFs, src);
        const uri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return `<img ${attrs}src="${uri.toString()}"`;
      },
    );
  }
}

// ─────────────────────────────────────────────────────────────────

/**
 * phase 이름 → spec 탭 폴더 매핑 (ADR-012: id 숫자 대신 name 기반).
 * 산출물 .md가 있는 phase만 매핑. IMPLEMENT/REVIEW/SHIP/POST-SHIP은 상세 .md 없음 → undefined.
 */
function artifactFolderForPhaseName(name: string | undefined): SpecFolderKey | undefined {
  switch (name) {
    case 'INQUIRY': return 'inquiry';
    case 'PRODUCT': return 'product';
    case 'FEASIBILITY': return 'feasibility';
    case 'DESIGN': return 'design';
    case 'ARCHITECTURE': return 'architecture';
    case 'UX-REVIEW': return 'ux-quality';
    default: return undefined;
  }
}
