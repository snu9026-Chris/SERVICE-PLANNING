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
 * 산출물 타입(BUILD TARGET) — 이 프로젝트가 최종적으로 뽑는 결과물 형태 (ADR-016).
 * 사이드바 Hero에 phase 위 배지로 상시 표시.
 */
export interface BuildTarget {
  /** 'website' | 'vscode-extension' | 'tauri' | 'electron' | 'cli' | 'library' | 'mobile' */
  type: string;
  /** 표시 라벨. 예: 'VS Code Extension' */
  label: string;
  /** 이모지 아이콘 */
  icon: string;
  /** 선택: 스택 한 줄(명시 필드에서). 예: 'Astro + Tailwind' */
  stack?: string;
  /** 선택: 실행 방식(명시). 예: 'F5 dev', 'npm', '정적 호스팅' (ADR-016 2축 중 runtime) */
  run?: string;
  /** 선택: 배포 방식(명시). 예: 'local .vsix', 'Marketplace', 'GitHub Releases' (ADR-016 2축 중 dist) */
  dist?: string;
  /** 선택: 'locked' | 'tentative' — tentative면 FEASIBILITY가 재검토 (명시 전용) */
  confidence?: string;
  /** 'explicit'(state.md 명시) | 'detected'(자동 감지) */
  source: 'explicit' | 'detected';
}

/**
 * 자동 감지 입력 시그널 — extension이 fs로 모아서 detectBuildTarget에 넘긴다.
 * (순수 감지 함수가 vscode/fs에 의존하지 않도록 분리)
 */
export interface ProjectSignals {
  /** 파싱된 package.json (없거나 깨졌으면 null) */
  packageJson: PackageJsonShape | null;
  hasTauriConf: boolean;
  hasIndexHtml: boolean;
  hasCargoToml: boolean;
}

export interface PackageJsonShape {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  contributes?: unknown;
  bin?: unknown;
  main?: unknown;
  module?: unknown;
  exports?: unknown;
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
  /** state.md `## Build target` 명시 필드(있으면). 자동감지는 extension에서 fallback. */
  buildTarget?: BuildTarget | null;
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
  /** 해소된 산출물 타입 — 명시(state.buildTarget) 우선, 없으면 자동감지 (ADR-016). */
  buildTarget: BuildTarget | null;
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

/** 활동바 아이콘 배지 — vscode.ViewBadge 와 구조적으로 호환되는 순수 타입. */
export interface ViewBadge {
  value: number;
  tooltip: string;
}

/**
 * JTBD3 — 활동바 Blueprint 아이콘 배지 결정 (순수 함수, vscode 비의존).
 * checkpoint 트리거가 발동(≥1건)했고 quiet 모드가 아니면 배지를 띄운다.
 * 사이드바를 열지 않아도 알림이 보이는 게 본질.
 * - 트리거 0건 → undefined (배지 해제)
 * - quiet_until 미래 → undefined (조용 모드, 알림 억제)
 */
export function computeTriggerBadge(
  state: BlueprintState | null,
  now: Date = new Date(),
): ViewBadge | undefined {
  if (!state) return undefined;
  const n = state.triggers.length;
  if (n === 0) return undefined;
  if (isQuiet(state, now)) return undefined;
  return {
    value: n,
    tooltip: `체크포인트 트리거 ${n}건 발동 — /blueprint check 권장`,
  };
}
