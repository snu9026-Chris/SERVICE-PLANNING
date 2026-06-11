/**
 * Sidebar WebviewView Provider — V0+ 최종 6섹션 구조.
 *
 * 섹션 (위→아래):
 *  1. Hero    — 프로젝트명 + 폴더 경로 + 현재 phase + progress bar
 *  2. Phases  — 7개 phase 리스트 (현재 강조)
 *  3. Current focus — state.md의 next action 텍스트 (지금 다루는 것)
 *  4. Triggers — fired 알림
 *  5. Active file — 지금 편집 중인 파일 경로
 *  6. Recent changes — 최근 변경된 파일들 (최대 6개, 시간순)
 *
 * 데이터: extension.ts가 SidebarPayload 빌드해서 update() 호출.
 * 클릭: Phase row 클릭 → 가운데 webview에 산출물 띄움.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  SidebarPayload,
  Phase,
  RecentChange,
  BuildTarget,
  getProgress,
  computeTriggerBadge,
} from '../types';

export const SIDEBAR_VIEW_ID = 'blueprintState';

export class SidebarViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private payload: SidebarPayload | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onPhaseClick: (phaseKey: string) => void,
  ) {}

  resolveWebviewView(
    view: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void | Thenable<void> {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.extensionUri.fsPath, 'out', 'sidebar')),
        vscode.Uri.file(path.join(this.extensionUri.fsPath, 'out', 'fonts')),
      ],
    };

    view.webview.onDidReceiveMessage(msg => {
      if (msg?.type === 'phase-click' && typeof msg.phaseKey === 'string') {
        this.onPhaseClick(msg.phaseKey);
      }
    });

    view.onDidDispose(() => {
      this.view = undefined;
    });

    this.refresh();
  }

  update(payload: SidebarPayload): void {
    this.payload = payload;
    this.refresh();
  }

  clear(): void {
    this.payload = null;
    this.refresh();
  }

  private refresh(): void {
    if (!this.view) return;
    this.view.webview.html = this.buildHtml();
    this.updateBadge();
  }

  /**
   * JTBD3 — 활동바 아이콘 빨간 배지.
   * checkpoint 트리거 발동 시 활동바 Blueprint 아이콘에 숫자 배지를 띄운다.
   * 사이드바를 열지 않아도 알림이 보이는 게 본질 (사이드바 텍스트 섹션과 별개).
   * quiet 모드(quiet_until 미래)면 배지 억제. 트리거 0건이면 해제.
   */
  private updateBadge(): void {
    if (!this.view) return;
    // 순수 결정은 types.computeTriggerBadge에 위임 (하네스로 검증 가능).
    this.view.badge = computeTriggerBadge(this.payload?.state ?? null);
  }

  private buildHtml(): string {
    if (!this.view) return '';

    const cssOnDisk = vscode.Uri.file(
      path.join(this.extensionUri.fsPath, 'out', 'sidebar', 'sidebar-styles.css'),
    );
    const cssUri = this.view.webview.asWebviewUri(cssOnDisk);
    const nonce = makeNonce();
    // 'unsafe-inline' 필수 — progress-fill 의 inline width style 적용을 위해.
    // 빠뜨리면 fill 안 차오름 (track만 보이고 빈 회색).
    const csp = `default-src 'none'; style-src ${this.view.webview.cspSource} 'unsafe-inline'; font-src ${this.view.webview.cspSource}; script-src 'nonce-${nonce}'; img-src ${this.view.webview.cspSource} data:;`;

    const body = this.payload?.state
      ? this.renderBody(this.payload)
      : this.renderEmpty();

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <link rel="stylesheet" href="${cssUri}" />
</head>
<body>
  <div class="sidebar">${body}</div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('[data-phase-key]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-phase-key');
        if (key) vscode.postMessage({ type: 'phase-click', phaseKey: key });
      });
    });
  </script>
</body>
</html>`;
  }

  private renderEmpty(): string {
    return `<div class="empty">
      <div class="empty-title">No blueprint detected</div>
      <div class="empty-sub">.blueprint/state.md not found in this folder.<br/>Run <code>/blueprint</code> to initialize.</div>
    </div>`;
  }

  private renderBody(payload: SidebarPayload): string {
    const { state, recentChanges, workspaceFolderName, workspaceFolderPath, buildTarget } = payload;
    if (!state) return this.renderEmpty();

    return [
      renderHero(state, workspaceFolderName, workspaceFolderPath, buildTarget),
      renderPhases(state.phases),
      renderCurrentFocus(state.nextAction, state.phases),
      renderRecentChanges(recentChanges),
    ].join('\n');
  }
}

// ─────────────────────────────────────────────────────────────────
// Section renderers
// ─────────────────────────────────────────────────────────────────

function renderHero(
  state: NonNullable<SidebarPayload['state']>,
  folderName: string,
  folderPath: string,
  buildTarget: BuildTarget | null,
): string {
  const { done, total } = getProgress(state);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const active =
    state.phases.find(p => p.status === 'in_progress') ??
    state.phases.find(p => p.status === 'pending') ??
    state.phases[state.phases.length - 1];

  return `
    <div class="hero">
      <div class="hero-folder" title="${escapeHtml(folderPath)}">
        <span class="hero-folder-icon">📁</span>
        <span class="hero-folder-path">${escapeHtml(folderPath)}</span>
      </div>
      ${renderBuildTarget(buildTarget)}
      <div class="hero-divider"></div>
      <div class="hero-phase-id">PHASE ${escapeHtml(active.key)}</div>
      <h1 class="hero-title">${escapeHtml(active.name)}</h1>
      <div class="progress-bar">
        <div class="progress-fill" style="${progressFillStyle(percent)}"></div>
      </div>
      <div class="progress-meta">
        <span>${done} / ${total}</span>
        <span>${percent}%</span>
      </div>
    </div>`;
}

/**
 * BUILD TARGET 배지 (ADR-016) — Hero에서 phase 위에 상시 표시.
 * 산출물 타입이 없으면(감지·명시 둘 다 실패) 빈 문자열.
 */
function renderBuildTarget(bt: BuildTarget | null): string {
  if (!bt) return '';
  // tooltip: 라벨 + run/dist(2축) + 스택 + 소스, 줄바꿈으로.
  const sourceTip = bt.source === 'explicit' ? 'state.md 명시' : '자동 감지';
  const tipParts = [bt.label];
  if (bt.run) tipParts.push(`실행: ${bt.run}`);
  if (bt.dist) tipParts.push(`배포: ${bt.dist}`);
  if (bt.stack) tipParts.push(`스택: ${bt.stack}`);
  if (bt.confidence === 'tentative') tipParts.push('탐색 중 (FEASIBILITY에서 재검토)');
  tipParts.push(`(${sourceTip})`);
  const tip = tipParts.join('\n');

  const tentative = bt.confidence === 'tentative';
  return `
    <div class="hero-buildtarget${tentative ? ' tentative' : ''}" title="${escapeHtml(tip)}">
      <span class="bt-icon">${escapeHtml(bt.icon)}</span>
      <span class="bt-label">${escapeHtml(bt.label)}${tentative ? '<span class="bt-tentative" aria-label="탐색 중">?</span>' : ''}</span>
      ${bt.stack ? `<span class="bt-stack">${escapeHtml(bt.stack)}</span>` : ''}
    </div>`;
}

function renderPhases(phases: Phase[]): string {
  return `
    <div class="card">
      <div class="card-heading">PHASES</div>
      ${phases.map(renderPhaseRow).join('')}
    </div>`;
}

function renderPhaseRow(phase: Phase): string {
  const meta = phase.completedAt ?? phase.meta ?? '';
  return `
    <div class="phase-row ${phase.status}" data-phase-key="${escapeHtml(phase.key)}">
      <div class="phase-circle ${phase.status}"></div>
      <span class="phase-id">P${escapeHtml(phase.key)}</span>
      <span class="phase-name">${escapeHtml(phase.name)}</span>
      <span class="phase-meta">${escapeHtml(meta)}</span>
    </div>`;
}

function renderCurrentFocus(nextAction: string, phases: Phase[]): string {
  const active =
    phases.find(p => p.status === 'in_progress') ??
    phases.find(p => p.status === 'pending');
  const label = active ? `Phase ${active.key} · ${active.name}` : 'No active phase';

  return `
    <div class="card">
      <div class="card-heading">CURRENT FOCUS</div>
      <div class="focus-label">${escapeHtml(label)}</div>
      <div class="focus-text">${escapeHtml(nextAction || '—')}</div>
    </div>`;
}

function renderRecentChanges(changes: RecentChange[]): string {
  // 임시 파일 + 무의미한 변경 필터
  const filtered = changes.filter(c => !isIgnoredPath(c.relativePath));

  if (filtered.length === 0) {
    return `
      <div class="card">
        <div class="card-heading">RECENT CHANGES</div>
        <div class="recent-empty">no changes yet</div>
      </div>`;
  }

  // 같은 *카테고리*는 가장 최근만 (예: webview 스타일이 3번 변경되면 1번만)
  const seenCategories = new Set<string>();
  const deduped = filtered.filter(c => {
    const cat = categorize(c.relativePath).label;
    if (seenCategories.has(cat)) return false;
    seenCategories.add(cat);
    return true;
  });

  const rows = deduped
    .slice(0, 6)
    .map(c => {
      const { icon, label } = categorize(c.relativePath);
      return `
      <div class="recent-row">
        <span class="recent-time">${escapeHtml(formatRelativeTime(c.changedAt))}</span>
        <span class="recent-icon">${icon}</span>
        <span class="recent-label">${escapeHtml(label)}</span>
      </div>`;
    })
    .join('');

  return `
    <div class="card">
      <div class="card-heading">RECENT CHANGES</div>
      <div class="recent-list">${rows}</div>
    </div>`;
}

/** 임시 파일·메타 변경 무시 — VS Code 저장 중 .tmp.XX 파일, .git 메타 등 */
function isIgnoredPath(rel: string): boolean {
  const r = rel.toLowerCase();
  if (r.includes('.tmp.')) return true;
  if (r.endsWith('.swp') || r.endsWith('~')) return true;
  if (r.endsWith('.map')) return true;
  if (r.includes('/node_modules/')) return true;
  if (r.includes('/out/')) return true;
  if (r.includes('/.git/')) return true;
  if (r.endsWith('.vsix')) return true;
  if (r.endsWith('package-lock.json')) return true;
  return false;
}

/** 파일 경로 → 의미 있는 카테고리 라벨 */
function categorize(rel: string): { icon: string; label: string } {
  const r = rel.replace(/\\/g, '/');

  // 산출물 .md
  if (r === 'docs/PRODUCT.md') return { icon: '📋', label: 'PRODUCT 명세' };
  if (r === 'docs/DESIGN.md') return { icon: '🎨', label: 'DESIGN 명세' };
  if (r === 'docs/ARCHITECTURE.md') return { icon: '🏗️', label: 'ARCHITECTURE' };
  if (r === '.blueprint/state.md') return { icon: '📍', label: 'Blueprint state' };
  if (r === 'plans/roadmap.md') return { icon: '🗺️', label: 'Roadmap' };
  if (r === 'docs/error.history.md') return { icon: '⚠️', label: '에러 히스토리' };

  // 폴더별 카테고리
  if (r.startsWith('docs/adr/')) return { icon: '📜', label: 'ADR 갱신' };
  if (r.startsWith('docs/design/screenshots/')) return { icon: '🖼️', label: '디자인 시안' };
  if (r.startsWith('docs/design/')) return { icon: '🎨', label: 'design 자산' };
  if (r.startsWith('docs/checkpoint')) return { icon: '✅', label: 'Checkpoint 기록' };
  if (r.startsWith('docs/reviews/')) return { icon: '🔍', label: 'Code review 결과' };
  if (r.startsWith('docs/')) return { icon: '📄', label: 'docs 변경' };

  // 코드
  if (r.startsWith('src/webview/pages/')) return { icon: '🪟', label: 'webview 페이지' };
  if (r.startsWith('src/webview/') && r.endsWith('.css')) return { icon: '💅', label: 'webview 스타일' };
  if (r.startsWith('src/webview/')) return { icon: '🪟', label: 'webview 로직' };
  if (r.startsWith('src/sidebar/') && r.endsWith('.css')) return { icon: '💅', label: '사이드바 스타일' };
  if (r.startsWith('src/sidebar/')) return { icon: '📊', label: '사이드바 로직' };
  if (r.startsWith('src/parser/')) return { icon: '🔣', label: 'state 파서' };
  if (r.startsWith('src/file-watcher/')) return { icon: '👁️', label: 'file watcher' };
  if (r === 'src/extension.ts') return { icon: '⚡', label: 'extension orchestrator' };
  if (r === 'src/types.ts') return { icon: '📐', label: '공유 타입' };
  if (r.startsWith('src/')) return { icon: '⚙️', label: '소스 코드' };

  // 빌드/메타
  if (r === 'package.json') return { icon: '📦', label: '프로젝트 메타' };
  if (r === 'tsconfig.json') return { icon: '🔧', label: 'TS 설정' };
  if (r === 'esbuild.config.js') return { icon: '🔧', label: '빌드 설정' };
  if (r === 'README.md') return { icon: '📖', label: 'README' };
  if (r === 'CHANGELOG.md') return { icon: '📋', label: 'CHANGELOG' };

  // 기타
  return { icon: '📄', label: r };
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function progressFillStyle(percent: number): string {
  if (percent <= 0) return 'width: 0';
  // 100% 이상은 명시적으로 단순화 — 그라데이션 전체가 fill에 가득 (녹→빨강)
  if (percent >= 100) return 'width: 100%; background-size: 100% 100%';
  // 일반 케이스: percent에 따라 그라데이션의 좌측 일부만 fill에 보임
  const bgSize = Math.min((100 / percent) * 100, 5000);
  return `width: ${percent}%; background-size: ${bgSize.toFixed(2)}% 100%`;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return '방금';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function makeNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
