/**
 * QA 하네스 — extension의 순수 로직(파서 + 5개 페이지 렌더러)을 실제 프로젝트
 * 파일로 구동해 검증한다. vscode API에 의존하지 않는 부분만 다룬다.
 * 일회성. .qa-tmp/ 는 패키징/커밋 대상 아님.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseState } from '../src/parser/state';
import { getProgress, computeTriggerBadge, BlueprintState } from '../src/types';
import { renderPlanPage } from '../src/webview/pages/plan';
import { renderSpecPage } from '../src/webview/pages/spec';
import { renderPreviewPage } from '../src/webview/pages/preview';
import { extractDesignTokens } from '../src/webview/design-tokens';
import { detectBuildTarget, explicitBuildTarget } from '../src/parser/build-target';
import { renderQaPage } from '../src/webview/pages/qa';
import { renderErrorsPage } from '../src/webview/pages/errors';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const readOpt = (p: string): string | null => { try { return read(p); } catch { return null; } };

interface Check { section: string; status: 'pass' | 'warn' | 'fail'; msg: string; }
const checks: Check[] = [];
const ok = (section: string, msg: string) => checks.push({ section, status: 'pass', msg });
const warn = (section: string, msg: string) => checks.push({ section, status: 'warn', msg });
const fail = (section: string, msg: string) => checks.push({ section, status: 'fail', msg });
const assert = (section: string, cond: boolean, msg: string) => cond ? ok(section, msg) : fail(section, msg);

// HTML 위생 검사 헬퍼 — 렌더 결과가 깨진 흔적이 없는지
function htmlSane(section: string, label: string, html: string, mustInclude: string[] = []) {
  assert(section, typeof html === 'string' && html.trim().length > 0, `${label}: 비어있지 않은 HTML 반환`);
  assert(section, !html.includes('undefined'), `${label}: 'undefined' 누출 없음`);
  assert(section, !html.includes('[object Object]'), `${label}: '[object Object]' 누출 없음`);
  assert(section, !html.includes('NaN'), `${label}: 'NaN' 누출 없음`);
  for (const m of mustInclude) {
    assert(section, html.includes(m), `${label}: '${m}' 포함`);
  }
}

// ── 1) 파서 — state.md → BlueprintState ──────────────────
try {
  const S = '파서 · state.md';
  const md = read('.blueprint/state.md');
  const state = parseState(md);

  assert(S, Array.isArray(state.phases) && state.phases.length >= 8, `phase 파싱됨 (${state.phases.length}개, 기대 ≥8)`);
  const names = state.phases.map(p => p.name);
  for (const need of ['PRODUCT', 'FEASIBILITY', 'DESIGN', 'ARCHITECTURE', 'IMPLEMENT', 'REVIEW', 'SHIP', 'POST-SHIP']) {
    assert(S, names.includes(need), `phase '${need}' 존재`);
  }
  const validStatus = state.phases.every(p => ['pending', 'in_progress', 'done'].includes(p.status as string));
  assert(S, validStatus, '모든 phase status가 유효값(pending/in_progress/done)');
  const feas = state.phases.find(p => p.name === 'FEASIBILITY');
  assert(S, feas?.status === 'done', `FEASIBILITY는 done — Phase 0.5 사후 검증 완료(2026-06-10) (실측: ${feas?.status})`);
  const everyHasKey = state.phases.every(p => typeof p.key === 'string' && p.key.length > 0);
  assert(S, everyHasKey, '모든 phase에 key 존재');

  const prog = getProgress(state);
  assert(S, prog.total === state.phases.length, `getProgress.total(${prog.total}) == phase 수(${state.phases.length})`);
  assert(S, prog.done >= 0 && prog.done <= prog.total, `getProgress.done(${prog.done}) 범위 정상`);

  assert(S, !!state.counters, 'counters 파싱됨');
  assert(S, typeof state.nextAction === 'string' && state.nextAction.length > 0, 'nextAction 파싱됨');
  assert(S, Array.isArray(state.triggers), 'triggers 배열 파싱됨');
  assert(S, !!state.settings, 'settings 파싱됨');

  // 빈/깨진 입력 회복성
  const empty = parseState('');
  assert(S, Array.isArray(empty.phases), '빈 문자열 입력에도 throw 없이 구조 반환');
  const garbage = parseState('# 헤딩만\n\n잡다한 텍스트');
  assert(S, Array.isArray(garbage.phases), '비정형 입력에도 throw 없음');
} catch (e) {
  fail('파서 · state.md', `예외 발생: ${String(e)}`);
}

// ── 2) Plan 페이지 ───────────────────────────────────────
try {
  const S = 'Webview · Plan 탭';
  const state = parseState(read('.blueprint/state.md'));
  const roadmap = readOpt('plans/roadmap.md');
  htmlSane(S, 'roadmap 있음', renderPlanPage(state, roadmap));
  htmlSane(S, 'roadmap 없음(null)', renderPlanPage(state, null));
  htmlSane(S, 'state null', renderPlanPage(null, roadmap));
} catch (e) {
  fail('Webview · Plan 탭', `예외: ${String(e)}`);
}

// ── 3) Spec 페이지 ───────────────────────────────────────
try {
  const S = 'Webview · Spec 탭';
  const artifacts = {
    product: readOpt('docs/PRODUCT.md'),
    feasibility: readOpt('docs/FEASIBILITY.md'),
    design: readOpt('docs/DESIGN.md'),
    architecture: readOpt('docs/ARCHITECTURE.md'),
    uxQuality: readOpt('docs/UX-QUALITY.md'),
  };
  htmlSane(S, '전체 산출물', renderSpecPage(artifacts, undefined, undefined), ['NON-GOALS']);
  htmlSane(S, 'product 포커스', renderSpecPage(artifacts, undefined, 'product'));
  htmlSane(S, '전부 null', renderSpecPage({ product: null, feasibility: null, design: null, architecture: null, uxQuality: null }, undefined, undefined));
} catch (e) {
  fail('Webview · Spec 탭', `예외: ${String(e)}`);
}

// ── 4) Preview 페이지 ────────────────────────────────────
try {
  const S = 'Webview · Preview 탭';
  htmlSane(S, '빈 그리드', renderPreviewPage({ html: null, sourcePath: null, pushedAt: null }, []));
  htmlSane(S, '시안 그리드', renderPreviewPage({ html: null, sourcePath: null, pushedAt: null }, [
    { relativePath: 'docs/design/sidebar.html', name: 'sidebar.html', content: '<h1>hi</h1>' },
    { relativePath: 'docs/design/webview-plan.html', name: 'webview-plan.html', content: '<h1>plan</h1>' },
  ]), ['시안']);
  htmlSane(S, '풀뷰어', renderPreviewPage({ html: '<h1>preview</h1>', sourcePath: 'docs/design/x.html', pushedAt: new Date(0) }, []));
  // DESIGN.md 토큰 패널이 그리드에 함께 렌더되는지 (실제 DESIGN.md 사용)
  const designMd = readOpt('docs/DESIGN.md');
  const withTokens = renderPreviewPage({ html: null, sourcePath: null, pushedAt: null }, [], designMd);
  htmlSane(S, '토큰 패널 포함 그리드', withTokens, ['DESIGN TOKENS', 'token-chip']);
} catch (e) {
  fail('Webview · Preview 탭', `예외: ${String(e)}`);
}

// ── 4.5) DESIGN TOKENS 추출 (JTBD5) ──────────────────────
try {
  const S = 'DESIGN TOKENS (JTBD5)';
  // null/빈 입력 안전
  assert(S, extractDesignTokens(null).colors.length === 0, 'null 입력 → 색상 0');
  assert(S, extractDesignTokens('').fonts.length === 0, '빈 문자열 → 폰트 0');

  // 표 행에서 hex + 라벨 추출
  const sample = [
    '## 색',
    '| 용도 | 값 | 비고 |',
    '|---|---|---|',
    '| 페이지 배경 | `#f2f2f7` | iOS |',
    '| Accent | `#007aff` | systemBlue |',
    '| 카드 보더 | `rgba(60, 60, 67, 0.1)` | separator |',
    '| 그라데이션 | `#34c759 → #ff3b30` | 진행도 |',
    '',
    '폰트 = "Pretendard Variable", -apple-system, sans-serif',
  ].join('\n');
  const tok = extractDesignTokens(sample);
  const vals = tok.colors.map(c => c.value.toLowerCase().replace(/\s+/g, ''));
  assert(S, vals.includes('#f2f2f7') && vals.includes('#007aff'), 'hex 색상 추출');
  assert(S, vals.includes('rgba(60,60,67,0.1)'), 'rgba 색상 추출');
  assert(S, vals.includes('#34c759') && vals.includes('#ff3b30'), '한 셀 내 다중 색상(그라데이션) 모두 추출');
  const accent = tok.colors.find(c => c.value === '#007aff');
  assert(S, accent?.label === 'Accent', `표 행 라벨 추출 (실측: ${accent?.label})`);
  // 중복 제거
  const dup = extractDesignTokens('`#007aff` 어쩌고 `#007AFF` 저쩌고 (font 문맥 아님)');
  assert(S, dup.colors.length === 1, 'hex 대소문자 무관 중복 제거 (1개)');
  // 본문 설명 텍스트 'rgba(...)' 오탐 방지 (괄호 안 숫자 필수)
  const noise = extractDesignTokens('패턴 `rgba(...)` 또는 `rgb(...)` 감지 → swatch');
  assert(S, noise.colors.length === 0, "설명용 'rgba(...)' 텍스트는 색으로 오탐하지 않음");
  // 폰트: generic fallback 제외, Variable 접미 제거
  assert(S, tok.fonts.length === 1 && tok.fonts[0] === 'Pretendard', `폰트=Pretendard (generic 제외, Variable 제거) (실측: ${JSON.stringify(tok.fonts)})`);

  // 실제 DESIGN.md — 색상·폰트 둘 다 1개 이상 뽑혀야 (명세-구현 일치 확인)
  const realMd = readOpt('docs/DESIGN.md');
  if (realMd) {
    const real = extractDesignTokens(realMd);
    assert(S, real.colors.length >= 5, `실제 DESIGN.md 색상 ≥5 추출 (실측: ${real.colors.length})`);
    assert(S, real.fonts.includes('Pretendard'), '실제 DESIGN.md에서 Pretendard 추출');
  } else {
    warn(S, 'docs/DESIGN.md 없음 — 실측 스킵');
  }
} catch (e) {
  fail('DESIGN TOKENS (JTBD5)', `예외: ${String(e)}`);
}

// ── 5) QA 페이지 (신규) ──────────────────────────────────
try {
  const S = 'Webview · QA 탭 (신규)';
  // 빈 상태
  htmlSane(S, '리포트 없음(빈 상태)', renderQaPage(null), ['QA']);
  // 카운트 정확성 — 샘플 리포트
  const sample = [
    '# QA Report',
    '> 메타 한 줄',
    '## 섹션 A',
    '- ✅ 통과1',
    '- ✅ 통과2',
    '- ⚠️ 경고1',
    '## 섹션 B',
    '- ❌ 실패1',
    '- ⬜ 건너뜀1',
  ].join('\n');
  const html = renderQaPage(sample);
  htmlSane(S, '샘플 리포트 렌더', html, ['품질 검사 리포트', '섹션 A', '섹션 B']);
  // 요약 카운트: pass=2 warn=1 fail=1 → verdict fail
  assert(S, /qa-stat-pass[^>]*>\s*<span class="qa-stat-num">2</.test(html), 'PASS 카운트 = 2');
  assert(S, /qa-stat-warn[^>]*>\s*<span class="qa-stat-num">1</.test(html), 'WARN 카운트 = 1');
  assert(S, /qa-stat-fail[^>]*>\s*<span class="qa-stat-num">1</.test(html), 'FAIL 카운트 = 1');
  assert(S, html.includes('qa-verdict-fail'), 'FAIL 존재 시 verdict=fail');
  // 이모지가 본문 텍스트로 새지 않았는지 (stripLeadingEmoji 동작)
  assert(S, !html.includes('✅ 통과1'), '상태 이모지가 텍스트에서 제거됨');
  // WARN만 있을 때 verdict=warn
  const warnOnly = renderQaPage('# R\n## S\n- ✅ a\n- ⚠️ b');
  assert(S, warnOnly.includes('qa-verdict-warn'), 'FAIL 없고 WARN 있으면 verdict=warn');
  // 전부 PASS면 verdict=pass
  const allPass = renderQaPage('# R\n## S\n- ✅ a\n- ✅ b');
  assert(S, allPass.includes('qa-verdict-pass'), '전 PASS면 verdict=pass');
  // 노션식 접이식 토글 마크업
  assert(S, html.includes('data-qa-toggle'), '섹션 헤더에 토글 핸들(data-qa-toggle) 존재');
  assert(S, html.includes('qa-chevron'), '셰브론(▸) 존재');
  assert(S, html.includes('data-qa-expand-all') && html.includes('data-qa-collapse-all'), '전체 펼치기/접기 컨트롤 존재');
  // FAIL/WARN 섹션은 기본 펼침(open), 전부 PASS 섹션은 접힘
  assert(S, /class="qa-section open"/.test(html), 'FAIL/WARN 섹션은 기본 open');
  assert(S, /class="qa-section"(?!\s+open)/.test(allPass), '전부 PASS 섹션은 기본 접힘(open 없음)');
  assert(S, allPass.includes('aria-expanded="false"'), '접힌 섹션 aria-expanded=false');
} catch (e) {
  fail('Webview · QA 탭 (신규)', `예외: ${String(e)}`);
}

// ── 5.5) 활동바 배지 (JTBD3) ─────────────────────────────
try {
  const S = '활동바 배지 (JTBD3)';
  const base = (over: Partial<BlueprintState>): BlueprintState => ({
    project: 'x', phases: [], nextAction: '', decisions: [],
    counters: { ships_since_checkpoint: 0, last_check: '', checkpoint_count: 0, plans_without_arch_read: 0 },
    triggers: [], settings: { strict_mode: false, quiet_until: '' }, ...over,
  });
  const NOW = new Date('2026-06-10T00:00:00Z');

  // state null → 배지 없음
  assert(S, computeTriggerBadge(null, NOW) === undefined, 'state null이면 배지 없음');
  // 트리거 0건 → 배지 없음 (해제)
  assert(S, computeTriggerBadge(base({ triggers: [] }), NOW) === undefined, '트리거 0건이면 배지 해제');
  // 트리거 N건 → value=N 배지
  const b2 = computeTriggerBadge(base({ triggers: ['ships≥3', 'arch 미독'] }), NOW);
  assert(S, b2?.value === 2, `트리거 2건이면 value=2 (실측 ${b2?.value})`);
  assert(S, typeof b2?.tooltip === 'string' && b2!.tooltip.includes('/blueprint check'), 'tooltip에 /blueprint check 안내 포함');
  // quiet_until 미래 → 트리거 있어도 억제
  const quiet = computeTriggerBadge(base({ triggers: ['t1'], settings: { strict_mode: false, quiet_until: '2026-06-20' } }), NOW);
  assert(S, quiet === undefined, 'quiet_until 미래면 트리거 있어도 배지 억제');
  // quiet_until 과거 → 정상 발화
  const past = computeTriggerBadge(base({ triggers: ['t1'], settings: { strict_mode: false, quiet_until: '2026-06-01' } }), NOW);
  assert(S, past?.value === 1, 'quiet_until 과거면 정상 발화(value=1)');
  // 실제 프로젝트 state.md — 트리거 (empty)라 배지 없어야 함 (오발화 방지)
  const real = parseState(read('.blueprint/state.md'));
  assert(S, computeTriggerBadge(real, NOW) === undefined, '현재 state.md는 트리거 없음 → 배지 미발화(오발화 방지)');
} catch (e) {
  fail('활동바 배지 (JTBD3)', `예외: ${String(e)}`);
}

// ── 5.7) BUILD TARGET 감지·명시 (ADR-016) ────────────────
try {
  const S = 'BUILD TARGET (ADR-016)';
  const sig = (over: any = {}) => ({ packageJson: null, hasTauriConf: false, hasIndexHtml: false, hasCargoToml: false, ...over });

  // 자동 감지 — 우선순위
  assert(S, detectBuildTarget(sig({ hasTauriConf: true }))?.type === 'tauri', 'tauri.conf.json → tauri');
  assert(S, detectBuildTarget(sig({ packageJson: { dependencies: { electron: '^30' } } }))?.type === 'electron', 'electron dep → electron');
  assert(S, detectBuildTarget(sig({ packageJson: { dependencies: { '@tauri-apps/api': '^2' } } }))?.type === 'tauri', '@tauri-apps dep → tauri');
  assert(S, detectBuildTarget(sig({ packageJson: { engines: { vscode: '^1.80.0' }, contributes: {} } }))?.type === 'vscode-extension', 'engines.vscode → vscode-extension');
  assert(S, detectBuildTarget(sig({ packageJson: { dependencies: { next: '^14' } } }))?.type === 'website', 'next dep → website');
  assert(S, detectBuildTarget(sig({ hasIndexHtml: true }))?.type === 'website', 'index.html → website');
  assert(S, detectBuildTarget(sig({ packageJson: { bin: { mycli: 'x.js' } } }))?.type === 'cli', 'bin → cli');
  assert(S, detectBuildTarget(sig({ packageJson: { main: 'index.js' } }))?.type === 'library', 'main(웹 아님) → library');
  // 우선순위: tauri가 vite(웹)보다 먼저
  assert(S, detectBuildTarget(sig({ hasTauriConf: true, packageJson: { dependencies: { vite: '^5' } } }))?.type === 'tauri', 'tauri가 vite보다 우선');
  // 아무 시그널 없음 → null
  assert(S, detectBuildTarget(sig()) === null, '시그널 없음 → null');
  // 감지 결과 source/label/icon
  const det = detectBuildTarget(sig({ hasIndexHtml: true }));
  assert(S, det?.source === 'detected' && det?.label === 'Website' && !!det?.icon, '감지 결과 source=detected·label·icon 채워짐');

  // 명시 — 별칭 정규화
  assert(S, explicitBuildTarget('vsix')?.type === 'vscode-extension', "별칭 'vsix' → vscode-extension");
  assert(S, explicitBuildTarget('homepage')?.type === 'website', "별칭 'homepage' → website");
  assert(S, explicitBuildTarget('native')?.type === 'tauri', "별칭 'native' → tauri");
  const ex = explicitBuildTarget('website', { stack: 'Astro + Tailwind' });
  assert(S, ex?.source === 'explicit' && ex?.stack === 'Astro + Tailwind', '명시 source=explicit + stack 보존');
  assert(S, explicitBuildTarget(undefined) === null && explicitBuildTarget('') === null, '명시 type 없음 → null');
  // 알 수 없는 타입 — 라벨 보존, 기본 아이콘
  const unk = explicitBuildTarget('quantum-thing');
  assert(S, unk?.label === 'quantum-thing' && unk?.icon === '🧩', '미지 타입은 라벨 보존 + 기본 아이콘');
  // 2축 필드 — run/dist/confidence 보존
  const axes = explicitBuildTarget('vsix', { run: 'F5 dev', dist: 'local .vsix', confidence: 'tentative' });
  assert(S, axes?.run === 'F5 dev' && axes?.dist === 'local .vsix', '명시 run/dist(2축) 보존');
  assert(S, axes?.confidence === 'tentative', '명시 confidence 보존');

  // 파서 — state.md `## Build target` 섹션 (type/stack/run/dist/confidence)
  const md = [
    '# Blueprint State — 테스트',
    '## Progress',
    '- [x] Phase 0: PRODUCT (2026-01-01)',
    '## Build target',
    '- type: website',
    '- stack: Astro + Tailwind',
    '- run: 정적 호스팅',
    '- dist: Vercel',
    '- confidence: locked',
  ].join('\n');
  const parsed = parseState(md);
  assert(S, parsed.buildTarget?.type === 'website', '파서: ## Build target type 추출');
  assert(S, parsed.buildTarget?.stack === 'Astro + Tailwind', '파서: stack 추출');
  assert(S, parsed.buildTarget?.run === '정적 호스팅' && parsed.buildTarget?.dist === 'Vercel', '파서: run/dist 추출');
  assert(S, parsed.buildTarget?.confidence === 'locked', '파서: confidence 추출');
  // 빈 템플릿 슬롯(값 없는 - type:) → null (자동감지 fallback)
  const emptySlot = parseState('# Blueprint State — t\n## Build target\n- type:\n- run:\n- dist:');
  assert(S, emptySlot.buildTarget === null, '빈 Build target 슬롯(값 없음) → null');
  // 이 프로젝트 state.md엔 명시 ## Build target 있음 → explicit vscode-extension (dogfood)
  const real = parseState(read('.blueprint/state.md'));
  assert(S, real.buildTarget?.type === 'vscode-extension' && real.buildTarget?.source === 'explicit', '실제 state.md: 명시 vscode-extension(explicit) 파싱');
  assert(S, !!real.buildTarget?.run && !!real.buildTarget?.dist, '실제 state.md: run/dist 2축 채워짐');
} catch (e) {
  fail('BUILD TARGET (ADR-016)', `예외: ${String(e)}`);
}

// ── 6) Errors 페이지 ─────────────────────────────────────
try {
  const S = 'Webview · Errors 탭';
  htmlSane(S, '히스토리 없음', renderErrorsPage(null), ['에러 히스토리']);
  htmlSane(S, '히스토리 있음', renderErrorsPage('# Error History\n\n## 2026-06-09 12:00 — 샘플\n- Status: RESOLVED'), ['에러 히스토리']);
} catch (e) {
  fail('Webview · Errors 탭', `예외: ${String(e)}`);
}

// ── 결과 출력 ────────────────────────────────────────────
const pass = checks.filter(c => c.status === 'pass').length;
const warnN = checks.filter(c => c.status === 'warn').length;
const failN = checks.filter(c => c.status === 'fail').length;
console.log(JSON.stringify({ pass, warn: warnN, fail: failN, total: checks.length, checks }, null, 2));
process.exit(failN > 0 ? 1 : 0);
