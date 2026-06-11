/**
 * .blueprint/state.md 파서.
 *
 * 입력: state.md 텍스트
 * 출력: BlueprintState (immutable 객체)
 *
 * 스키마는 ~/.claude/skills/blueprint/templates/state.md.tmpl 기준.
 * 스키마 변경 시 이 파일과 src/types.ts 같이 업데이트.
 */

import {
  BlueprintState,
  Phase,
  PhaseStatus,
  Counters,
  Settings,
  DecisionEntry,
  BuildTarget,
} from '../types';
import { explicitBuildTarget } from './build-target';

/**
 * 섹션을 ## 헤딩 단위로 분할.
 * 반환: { 헤딩이름: 본문 } 맵 (헤딩 라인 자체는 제외)
 */
function splitSections(md: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = md.split(/\r?\n/);
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentHeading !== null) {
      sections.set(currentHeading.toLowerCase(), buffer.join('\n').trim());
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      buffer = [];
    } else if (currentHeading !== null) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

/**
 * 첫 # 헤딩에서 프로젝트명 추출.
 * 형식: "# Blueprint State — {project}"
 */
function parseProjectName(md: string): string {
  const m = md.match(/^#\s+Blueprint State\s*[—\-–]\s*(.+)$/m);
  return m ? m[1].trim() : 'Unknown';
}

/**
 * Progress 섹션 → Phase[]  (ADR-012: 동적 리스트)
 * 형식 예:
 *   - [x] Phase 0: PRODUCT (2026-05-22)
 *   - [ ] Phase 0.5: FEASIBILITY
 *   - [ ] Phase 1: DESIGN
 *   - [ ] Phase 5: SHIP (0 ships)
 *
 * `[x]` = done, `[ ]` = pending, `[◐]` = in_progress
 *
 * 개수·이름·순서를 코드가 고정하지 않는다. state.md에 적힌 phase를 있는 그대로 읽고
 * key(문자열)·order(숫자)로 보관. 정수 매핑/누락 보강 루프 없음 — 문서가 진실 원본.
 * 단 CHECKPOINT는 별도 KPI라 제외 (ADR-009).
 */
function parsePhases(text: string): Phase[] {
  const lines = text.split(/\r?\n/);
  const phases: Phase[] = [];
  // Phase 키는 정수 또는 소수("0", "0.5"). 이름은 영문 대문자/하이픈.
  const re = /^-\s*\[([ x◐])\]\s*Phase\s+(\d+(?:\.\d+)?):\s*([A-Z][A-Z\-]*)(?:\s*\((.*?)\))?(?:\s+←.*)?$/;

  for (const line of lines) {
    const m = line.trim().match(re);
    if (!m) continue;

    const checkChar = m[1];
    const key = m[2];
    const name = m[3];
    const parenContent = m[4];

    // CHECKPOINT는 phase 리스트에서 제외 (별도 KPI). state.md에 남아있을 수 있는
    // 옛 Phase 4: CHECKPOINT 줄은 건너뜀.
    if (name === 'CHECKPOINT') continue;

    let status: PhaseStatus;
    if (checkChar === 'x') status = 'done';
    else if (checkChar === '◐') status = 'in_progress';
    else status = 'pending';

    let completedAt: string | undefined;
    let meta: string | undefined;
    if (parenContent) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(parenContent)) {
        completedAt = parenContent;
      } else {
        meta = parenContent;
      }
    }

    phases.push({
      key,
      order: parseFloat(key),
      name,
      status,
      completedAt,
      meta,
    });
  }

  // 중복 key는 처음 것만 (방어적). order 기준 정렬.
  const seen = new Set<string>();
  const deduped = phases.filter(p => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
  deduped.sort((a, b) => a.order - b.order);
  return deduped;
}

/**
 * Counters 섹션 → Counters
 * 형식: "- key: value"
 */
function parseCounters(text: string): Counters {
  const map = parseKeyValueList(text);
  return {
    ships_since_checkpoint: toInt(map.get('ships_since_checkpoint'), 0),
    last_check: map.get('last_check') ?? '',
    checkpoint_count: toInt(map.get('checkpoint_count'), 0),
    plans_without_arch_read: toInt(map.get('plans_without_arch_read'), 0),
  };
}

/**
 * Settings 섹션 → Settings
 * 형식: "- key: value"
 * "(empty)" 또는 빈 값은 ''로 처리.
 */
function parseSettings(text: string): Settings {
  const map = parseKeyValueList(text);
  const quietRaw = map.get('quiet_until') ?? '';
  return {
    strict_mode: (map.get('strict_mode') ?? 'false').toLowerCase() === 'true',
    quiet_until: quietRaw === '(empty)' ? '' : quietRaw,
  };
}

/**
 * "- key: value" 형식 라인을 Map으로.
 * value 앞뒤 공백 제거.
 */
function parseKeyValueList(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.trim().match(/^-\s+([a-z_][a-z0-9_]*)\s*:\s*(.+?)\s*$/i);
    if (m) {
      map.set(m[1].toLowerCase(), m[2].trim());
    }
  }
  return map;
}

function toInt(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * Triggers fired 섹션 → string[]
 * "(empty)" 또는 빈 본문이면 빈 배열.
 * 각 "- ..." 라인이 한 트리거.
 */
function parseTriggers(text: string): string[] {
  if (!text || text.trim() === '(empty)') return [];
  const triggers: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.trim().match(/^-\s+(.+)$/);
    if (m) triggers.push(m[1].trim());
  }
  return triggers;
}

/**
 * Decisions log 섹션 → DecisionEntry[]
 * 형식: "- YYYY-MM-DD: 내용"
 * (상세는 docs/adr/) 같은 메타 라인은 무시.
 */
function parseDecisions(text: string): DecisionEntry[] {
  if (!text) return [];
  const decisions: DecisionEntry[] = [];
  const lines = text.split(/\r?\n/);
  const re = /^-\s+(\d{4}-\d{2}-\d{2}):\s*(.+)$/;
  for (const line of lines) {
    const m = line.trim().match(re);
    if (m) {
      decisions.push({ date: m[1], text: m[2].trim() });
    }
  }
  return decisions;
}

/**
 * Next action 섹션 — 본문 전체를 한 줄로 (개행 → 공백).
 */
function parseNextAction(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Build target 섹션 → BuildTarget | null (ADR-016, 명시 필드).
 * 형식:
 *   ## Build target
 *   - type: website
 *   - stack: Astro + Tailwind   (선택)
 * 없거나 type 미지정이면 null → extension이 자동감지로 fallback.
 */
function parseBuildTarget(text: string): BuildTarget | null {
  if (!text) return null;
  const map = parseKeyValueList(text);
  return explicitBuildTarget(map.get('type'), {
    stack: map.get('stack'),
    run: map.get('run'),
    dist: map.get('dist'),
    confidence: map.get('confidence'),
  });
}

/**
 * 메인 진입점.
 */
export function parseState(md: string): BlueprintState {
  const project = parseProjectName(md);
  const sections = splitSections(md);

  return {
    project,
    phases: parsePhases(sections.get('progress') ?? ''),
    nextAction: parseNextAction(sections.get('next action') ?? ''),
    counters: parseCounters(sections.get('counters') ?? ''),
    triggers: parseTriggers(sections.get('triggers fired') ?? ''),
    settings: parseSettings(sections.get('settings') ?? ''),
    decisions: parseDecisions(sections.get('decisions log') ?? ''),
    buildTarget: parseBuildTarget(sections.get('build target') ?? ''),
  };
}
