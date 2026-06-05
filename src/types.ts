/**
 * 공유 타입 정의 — 모든 도메인이 이 타입으로 통신한다.
 * 이벤트 버스의 payload 시그니처가 곧 도메인 간 계약.
 */

// Phase는 동적 리스트 (ADR-012): 개수·이름·순서를 코드가 고정하지 않고
// state.md에 적힌 그대로 읽는다. 정수 union(PhaseId)·PHASE_NAMES 상수는 폐기.
// CHECKPOINT는 그대로 phase 리스트에서 제외 (ADR-009) — 사이드바 KPI 카드.
export type PhaseStatus = 'pending' | 'in_progress' | 'done';

export interface Phase {
  /** state.md "Phase X"의 X를 문자열로. "0", "0.5", "1" ... 클릭 식별·data 속성용. */
  key: string;
  /** 정렬·진행도용 숫자. parseFloat(key). "0.5" → 0.5 */
  order: number;
  name: string;
  status: PhaseStatus;
  /** 완료된 경우 날짜 (YYYY-MM-DD) */
  completedAt?: string;
  /** "(0 runs)", "(0 ships)" 같은 부가 정보 */
  meta?: string;
}

export interface Counters {
  ships_since_checkpoint: number;
  last_check: string;
  checkpoint_count: number;
  plans_without_arch_read: number;
}

export interface Settings {
  strict_mode: boolean;
  /** YYYY-MM-DD 또는 빈 문자열 */
  quiet_until: string;
}

export interface DecisionEntry {
  date: string;
  text: string;
}

/**
 * .blueprint/state.md 파싱 결과 — 사이드바·webview 모두 이걸 받는다.
 */
export interface BlueprintState {
  project: string;
  phases: Phase[];
  nextAction: string;
  counters: Counters;
  /** Triggers fired 섹션의 각 항목. 비어있으면 빈 배열. */
  triggers: string[];
  settings: Settings;
  decisions: DecisionEntry[];
}

export interface ArtifactSection {
  /** ## 헤딩 텍스트 */
  heading: string;
  /** 헤딩 레벨 (2면 ##, 3이면 ### ...) */
  level: number;
  /** 섹션 본문 (헤딩 제외, 다음 헤딩 직전까지) */
  content: string;
}

export interface Artifact {
  /** 워크스페이스 기준 상대 경로. e.g. 'docs/PRODUCT.md' */
  path: string;
  /** 첫 # 헤딩 텍스트 */
  title: string;
  sections: ArtifactSection[];
  /** 원본 마크다운 — webview 렌더에 사용 */
  rawMarkdown: string;
}

/**
 * 파일 변경 이벤트 — file-watcher가 emit하는 payload
 */
export interface FileChangeEvent {
  /** 절대 경로 */
  path: string;
  kind: 'change' | 'create' | 'delete';
}

/**
 * 최근 변경된 파일 (사이드바 Recent changes 섹션용)
 */
export interface RecentChange {
  /** 워크스페이스 기준 상대 경로 */
  relativePath: string;
  changedAt: Date;
  kind: 'change' | 'create' | 'delete';
}

/**
 * 현재 활성 에디터의 파일 정보 (사이드바 Active file 섹션용)
 */
export interface ActiveFileInfo {
  /** 워크스페이스 기준 상대 경로. 활성 에디터 없으면 null */
  relativePath: string | null;
  /** VS Code language id (예: 'typescript', 'markdown') */
  language: string | null;
}

/**
 * Sidebar에 한 번에 전달하는 통합 payload.
 * extension.ts가 매 변경마다 새 payload 빌드해서 sidebar.update() 호출.
 */
export interface SidebarPayload {
  state: BlueprintState | null;
  recentChanges: RecentChange[];
  activeFile: ActiveFileInfo;
  workspaceFolderName: string;
  workspaceFolderPath: string;
}

/**
 * 현재 활성 phase 결정 규칙:
 * - in_progress가 있으면 그것
 * - 없으면 마지막 done의 다음 phase (pending 첫 번째)
 * - 다 done이면 마지막 phase
 */
export function getActivePhase(state: BlueprintState): Phase {
  const inProgress = state.phases.find(p => p.status === 'in_progress');
  if (inProgress) return inProgress;
  const firstPending = state.phases.find(p => p.status === 'pending');
  if (firstPending) return firstPending;
  return state.phases[state.phases.length - 1];
}

/**
 * 진행도 계산 — done 개수 / 전체.
 * CHECKPOINT는 트리거 기반이라 진행도 계산에서 제외 옵션 가능.
 */
export function getProgress(state: BlueprintState): { done: number; total: number } {
  const done = state.phases.filter(p => p.status === 'done').length;
  return { done, total: state.phases.length };
}

/**
 * Quiet mode 체크 — strict_mode와 quiet_until 둘 다 고려.
 * 트리거 알림 발화 여부 결정.
 */
export function isQuiet(state: BlueprintState, now: Date = new Date()): boolean {
  if (!state.settings.quiet_until) return false;
  const until = new Date(state.settings.quiet_until);
  if (isNaN(until.getTime())) return false;
  return now < until;
}
