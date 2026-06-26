/**
 * diagnostics 도메인 (ADR-021) — 자동 에러 수집기.
 *
 * VS Code의 두 신호를 구독해 구조화된 에러 스냅샷을 만들어 onUpdate로 넘긴다:
 *   1) onDidChangeDiagnostics — 에디터 빨간줄(TS/ESLint 등) 중 severity=Error
 *   2) tasks.onDidEndTaskProcess — exitCode≠0 인 빌드/테스트 태스크 실패
 *
 * 이 도메인은 파일을 쓰지 않는다 — 파일 직렬화(error.auto.md)는 extension(orchestrator) 담당.
 * 순수 포맷터는 format.ts(vscode 비의존)에 분리해 하네스로 단위 검증 가능.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { AutoErrorEntry } from '../types';

// 재export — extension은 collector에서 한 번에 가져온다(포맷터는 vscode 비의존 모듈)
export { formatAutoErrorsMarkdown } from './format';

/** 빨간줄 깜빡임을 1회로 묶는 디바운스 (성능 가드, ADR-021) */
const DEBOUNCE_MS = 1000;
/** error.auto.md 비대 방지 상한 (최신 우선) */
const MAX_ENTRIES = 200;
/** 누적할 태스크 실패 개수 상한 */
const MAX_TASK_FAILURES = 30;

export class DiagnosticsCollector {
  private disposables: vscode.Disposable[] = [];
  private debounceTimer?: NodeJS.Timeout;
  /** 태스크 실패는 진단처럼 현재상태로 재계산 불가 → 별도 버퍼에 누적 */
  private taskFailures: AutoErrorEntry[] = [];

  constructor(
    private workspaceFolder: vscode.WorkspaceFolder,
    private onUpdate: (entries: AutoErrorEntry[]) => void,
  ) {}

  start(): void {
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => this.scheduleRebuild()),
      vscode.tasks.onDidEndTaskProcess(e => this.handleTaskEnd(e)),
    );
    // 초기 스냅샷 (이미 떠 있는 진단 반영)
    this.scheduleRebuild();
  }

  dispose(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  private scheduleRebuild(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.onUpdate(this.buildSnapshot());
    }, DEBOUNCE_MS);
  }

  private handleTaskEnd(e: vscode.TaskProcessEndEvent): void {
    if (typeof e.exitCode !== 'number' || e.exitCode === 0) return;
    const name = e.execution.task.name || '(task)';
    this.taskFailures.unshift({
      kind: 'task',
      file: null,
      line: null,
      message: `${name} (exit ${e.exitCode})`,
      source: name,
    });
    if (this.taskFailures.length > MAX_TASK_FAILURES) {
      this.taskFailures.length = MAX_TASK_FAILURES;
    }
    this.scheduleRebuild();
  }

  /** 현재 진단(Error만, 워크스페이스 내부) + 누적 태스크 실패 → 합쳐 상한 적용 */
  private buildSnapshot(): AutoErrorEntry[] {
    const folderFs = this.workspaceFolder.uri.fsPath;
    const diags: AutoErrorEntry[] = [];

    for (const [uri, list] of vscode.languages.getDiagnostics()) {
      // 워크스페이스 밖 무시 — 단순 접두사 비교는 형제 폴더(proj vs proj-tests)가
      // 새어드므로 path.relative로 진짜 포함 여부를 본다('..'·절대경로면 밖).
      const rel = path.relative(folderFs, uri.fsPath);
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
      for (const d of list) {
        if (d.severity !== vscode.DiagnosticSeverity.Error) continue;
        diags.push({
          kind: 'diagnostic',
          file: rel.replace(/\\/g, '/'),
          line: d.range.start.line + 1, // 1-based
          message: d.message,
          source: typeof d.source === 'string' && d.source ? d.source : null,
        });
      }
    }

    return [...this.taskFailures, ...diags].slice(0, MAX_ENTRIES);
  }
}
