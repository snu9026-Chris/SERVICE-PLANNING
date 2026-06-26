/**
 * 파일 감시자.
 *
 * - `.blueprint/state.md` 변경 감시
 * - `docs/**\/*.md` 변경 감시 (PRODUCT, DESIGN, ARCHITECTURE, ADR 등)
 * - `docs/design/**\/*.html` 변경 감시 (V2 디자인 시안)
 *
 * 모든 이벤트는 debounce 200ms를 거쳐 emit. 빠른 연속 저장 시 reload 1회.
 * IDE focus 잃은 동안엔 일시정지.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { EventEmitter } from 'events';
import { FileChangeEvent, RecentChange } from '../types';

const DEBOUNCE_MS = 200;
const RECENT_BUFFER_SIZE = 10;

const PATTERNS = [
  '.blueprint/state.md',
  'docs/**/*.md',
  'docs/design/**/*.html',
  'docs/design/screenshots/**/*.{png,jpg,jpeg,gif,webp,svg}',
  'plans/**/*.md',
  // Recent changes 트래킹용 — 모든 소스 파일
  'src/**/*',
  'package.json',
  'tsconfig.json',
  'esbuild.config.js',
];

export interface FileWatcherEvents {
  'file-changed': (event: FileChangeEvent) => void;
}

export class FileWatcher extends EventEmitter {
  private watchers: vscode.FileSystemWatcher[] = [];
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private paused = false;
  private focusDisposable?: vscode.Disposable;
  private recentChanges: RecentChange[] = [];

  constructor(private workspaceFolder: vscode.WorkspaceFolder) {
    super();
  }

  /**
   * 최근 변경된 파일 목록 (최신순, 최대 10개)
   */
  getRecentChanges(): RecentChange[] {
    return [...this.recentChanges];
  }

  start(): void {
    for (const pattern of PATTERNS) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this.workspaceFolder, pattern),
      );
      watcher.onDidChange(uri => this.handle(uri, 'change'));
      watcher.onDidCreate(uri => this.handle(uri, 'create'));
      watcher.onDidDelete(uri => this.handle(uri, 'delete'));
      this.watchers.push(watcher);
    }

    // IDE focus를 잃으면 일시정지, 다시 얻으면 재개 + 전체 reload 트리거
    this.focusDisposable = vscode.window.onDidChangeWindowState(state => {
      const wasPaused = this.paused;
      this.paused = !state.focused;
      if (wasPaused && state.focused) {
        // 다시 켜졌을 때 한 번 동기화하라고 알림 (state.md 변경 가짜 이벤트)
        const statePath = vscode.Uri.joinPath(
          this.workspaceFolder.uri,
          '.blueprint',
          'state.md',
        ).fsPath;
        this.emit('file-changed', { path: statePath, kind: 'change' });
      }
    });
  }

  private handle(uri: vscode.Uri, kind: FileChangeEvent['kind']): void {
    if (this.paused) return;

    const fsPath = uri.fsPath;

    // 이미 예약된 debounce가 있으면 취소
    const existing = this.debounceTimers.get(fsPath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(fsPath);
      this.pushRecent(fsPath, kind);
      this.emit('file-changed', { path: fsPath, kind });
    }, DEBOUNCE_MS);

    this.debounceTimers.set(fsPath, timer);
  }

  private pushRecent(fsPath: string, kind: FileChangeEvent['kind']): void {
    const relPath = path
      .relative(this.workspaceFolder.uri.fsPath, fsPath)
      .replace(/\\/g, '/');
    // 임시 파일·빌드 산출물 등 무의미한 변경 무시
    if (this.shouldIgnoreForRecent(relPath)) return;
    // 같은 파일 이전 항목 제거 (가장 최근만 유지)
    this.recentChanges = this.recentChanges.filter(r => r.relativePath !== relPath);
    this.recentChanges.unshift({ relativePath: relPath, changedAt: new Date(), kind });
    if (this.recentChanges.length > RECENT_BUFFER_SIZE) {
      this.recentChanges.length = RECENT_BUFFER_SIZE;
    }
  }

  private shouldIgnoreForRecent(rel: string): boolean {
    const r = rel.toLowerCase();
    if (r.includes('.tmp.')) return true;       // VS Code 저장 중 임시 파일
    if (r.endsWith('.swp') || r.endsWith('~')) return true;
    if (r.endsWith('.map')) return true;        // source map
    if (r.includes('/node_modules/')) return true;
    if (r.includes('/out/')) return true;       // 빌드 산출물
    if (r.includes('/.git/')) return true;
    if (r.endsWith('.vsix')) return true;
    if (r === 'package-lock.json') return true;
    if (r === 'docs/error.auto.md') return true; // 자동 수집 산출물 — 사용자 작업 아님 (ADR-021)
    return false;
  }

  dispose(): void {
    for (const w of this.watchers) w.dispose();
    this.watchers = [];

    for (const t of this.debounceTimers.values()) clearTimeout(t);
    this.debounceTimers.clear();

    this.focusDisposable?.dispose();
    this.focusDisposable = undefined;
  }
}
