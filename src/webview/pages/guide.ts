/**
 * Guide 페이지 — blueprint 도구의 기능·단계별 설명·사용법·변경이력 (ADR-017).
 *
 * 워크스페이스 .md가 아니라 *확장 내장 콘텐츠*를 렌더한다 (도구 문서라 프로젝트 무관).
 * - 파이프라인 단계별: 좌측 세로 스테퍼(박스+화살표) + 우측 상세 (시안 1). 단계 클릭 시
 *   우측 상세가 바뀜 — 클릭 토글은 panel.ts의 webview 스크립트가 처리.
 * - 나머지(개요·탭안내·사용법·변경이력): 마크다운 카드.
 * 새 버전 릴리스마다 REST_MD "최신 업데이트" 섹션 + PHASES를 갱신한다.
 */

import { renderMarkdown, escapeHtml } from '../shared';

interface PhaseInfo {
  k: string;        // phase 번호 ("0", "1.5" 등)
  name: string;
  sub: string;      // 한 줄 부제
  soft: boolean;    // 소프트 게이트 여부
  purpose: string;
  lines: string[];  // 추가 설명 줄 (DESIGN의 3축 등)
  output: string;
  skill: string;    // 수행 스킬 (없으면 '')
}

const PHASES: PhaseInfo[] = [
  { k: '0', name: 'INQUIRY', sub: '리서치 기반 발견', soft: false,
    purpose: '막연한 아이디어를 "이 앱에 필요한 것" 초안으로',
    lines: ['흐름: 기본 3문(문제/타깃/형태) → 레퍼런스 → 웹 리서치 → 기능·플로우 초안 → 검수'],
    output: 'docs/INQUIRY.md', skill: 'Claude 직접 (WebSearch/WebFetch)' },
  { k: '1', name: 'PRODUCT', sub: '무엇을 만들지 확정', soft: false,
    purpose: 'INQUIRY 초안을 정식 제품 명세로',
    lines: ['담는 것: One-liner / 타깃 / Jobs-to-be-done / NON-GOALS / 성공지표'],
    output: 'docs/PRODUCT.md', skill: '/office-hours' },
  { k: '1.5', name: 'FEASIBILITY', sub: '실현 가능성 점검', soft: true,
    purpose: '정한 JTBD가 실제로 달성 가능한지 검증',
    lines: [], output: 'docs/FEASIBILITY.md', skill: '' },
  { k: '2', name: 'DESIGN', sub: '보이는 것 설계 (3축)', soft: false,
    purpose: '디자인 시스템 정한 뒤 기획을 3축으로 펼쳐 하위 항목 정의 → 집중 질의 → 시안',
    lines: [
      '축1 기능 상세 — 트리거/입력/출력/상태로 분해',
      '축2 UX 플로우 — 진입·전환·분기·빈/에러/완료 상태',
      '축3 화면 기획 — 화면별 컴포넌트 → JBT 매핑',
      '마무리: 확정 화면을 플로우 순서대로 시안 → Preview 탭에 흐름순 노출',
    ],
    output: 'docs/DESIGN.md + docs/design/screenshots/*.html', skill: '/design-consultation' },
  { k: '3', name: 'ARCHITECTURE', sub: '구조 잠금', soft: false,
    purpose: '코딩 전에 구조·경계 확정',
    lines: ['담는 것: 스택, 도메인 맵, inter-domain 규칙, 데이터 계약, 성능 예산'],
    output: 'docs/ARCHITECTURE.md + plans/*.md', skill: '/autoplan' },
  { k: '4', name: 'IMPLEMENT', sub: '구현', soft: false,
    purpose: 'ARCHITECTURE 체크리스트대로 코딩',
    lines: ['진입 차단: PRODUCT/ARCHITECTURE 비면 코딩 거부 (hard gate)', '필요 시 /investigate, /codex'],
    output: '소스 코드', skill: '' },
  { k: '5', name: 'REVIEW', sub: '검토', soft: false,
    purpose: '머지 전 품질·구조 점검 + ADR 정리',
    lines: [], output: 'docs/adr/, checkpoint 파일', skill: '/code-review + /retro' },
  { k: '5.5', name: 'UX-REVIEW', sub: '제품·UX 품질', soft: true,
    purpose: '사용자 관점 품질 채점',
    lines: [], output: 'docs/UX-QUALITY.md', skill: '' },
  { k: '5.7', name: 'QA', sub: '전수 점검', soft: true,
    purpose: 'SHIP 직전 최종 검증',
    lines: [], output: 'docs/qa.report.md', skill: '' },
  { k: '6', name: 'SHIP', sub: '출시', soft: false,
    purpose: '머지·배포 준비',
    lines: ['흐름: /qa → /review → /ship'], output: '머지된 PR + CHANGELOG', skill: '' },
  { k: '7', name: 'POST-SHIP', sub: '사후', soft: false,
    purpose: '배포 확인 · 문서 동기화 · 회고',
    lines: ['흐름: /land-and-deploy → /document-release → /retro'], output: '배포된 앱', skill: '' },
];

const DEFAULT_ACTIVE = '0';

// 파이프라인 위 개요 (마크다운 카드)
const INTRO_MD = `
## 무엇을 해주나
blueprint는 AI 코딩 워크플로를 **8단계 파이프라인**으로 안내하고, 진행 상황을 이 대시보드로 항상 눈에 보이게 합니다.

- **8단계**: INQUIRY → PRODUCT → DESIGN → ARCHITECTURE → IMPLEMENT → REVIEW → SHIP → POST-SHIP
- **소프트 게이트**: FEASIBILITY(1.5) · UX-REVIEW(5.5) · QA(5.7) — 필수는 아니지만 품질 점검 단계
- **진실 원본은 \`.blueprint/state.md\`** — 이 대시보드의 모든 표시는 그 파일을 읽어 그립니다 (단방향)
`;

// 파이프라인 아래 (마크다운 카드)
const REST_MD = `
## 탭별 안내
- **Plan** — \`plans/roadmap.md\` 풀뷰 + "지금 만드는 것"(프로젝트 한 줄 설명) + 현재 phase 강조
- **Spec** — INQUIRY / PRODUCT / DESIGN / ARCHITECTURE 문서를 폴더 탐색기처럼
- **Preview** — \`docs/design/\` 디자인 시안 갤러리 + DESIGN.md 색·폰트 토큰 자동 추출
- **QA** — \`docs/qa.report.md\` 점검 결과
- **Errors** — \`docs/error.history.md\` 에러 이력
- **Guide** — (이 화면) 기능 · 단계별 설명 · 변경이력

## 사용법
- **새 프로젝트 시작**: 채팅에 \`/blueprint\` → 자동 스캐폴딩 → Phase 0 INQUIRY부터
- **이어서 작업**: \`/blueprint\` (resume — 어디까지 했는지 자동 요약, INQUIRY 없으면 자동 추가)
- **중간 점검**: \`/blueprint check\` (code-review + ADR 정리 + 카운터 리셋)
- **디자인 시안 보기**: \`docs/design/screenshots/<이름>.html\` 로 저장하면 Preview 탭에 자동 노출 (브라우저 안 띄움)

## 최신 업데이트
- **v0.14.0** — 문서 동기화(README/ARCHITECTURE/roadmap) + 사이드바 접근성(키보드·focus·chevron) + 현재 phase 미결 배지
- **v0.13.0** — Guide 탭 신설(단계별 스테퍼) + DESIGN 3축 상세화 + Plan "지금 만드는 것" 칸 + 미결 항목 게이트(전환 전 알림)
- **v0.12.0** — Phase 0 INQUIRY 대시보드 연동 + \`docs/design/\` 어느 폴더든 저장 즉시 Preview 갱신
- **v0.11.0** — BUILD TARGET 2축 배지 (타입 + 실행/배포) + Phase 0 TARGET 인터뷰
- **v0.10.0** — 산출물 타입 자동감지 BUILD TARGET 배지 (ADR-016)
- **v0.9.9** — FEASIBILITY 패널 + 디자인 토큰 자동 추출
- **v0.9.6** — UX-REVIEW 품질 게이트 신설
- **v0.9.5** — FEASIBILITY 신설 + 동적 phase 리스트
- **v0.1.0** — 최초 출시 (사이드바 + webview 탭)
`;

/** 좌측 세로 스테퍼 — 박스 + 화살표. 소프트 게이트는 점선·들여쓰기. */
function renderFlow(): string {
  const out: string[] = [];
  let mainSeen = false;
  for (const p of PHASES) {
    if (!p.soft) {
      if (mainSeen) out.push('<div class="guide-arrow"></div>');
      mainSeen = true;
    }
    const active = p.k === DEFAULT_ACTIVE ? ' active' : '';
    const softCls = p.soft ? ' soft' : '';
    const tag = p.soft ? '<span class="guide-soft-tag">soft</span>' : '';
    out.push(
      `<button type="button" class="guide-step${softCls}${active}" data-guide-step="${p.k}">
        <span class="guide-num">${escapeHtml(p.k)}</span>
        <span class="guide-step-body"><span class="guide-step-nm">${escapeHtml(p.name)}</span>${p.soft ? '' : `<span class="guide-step-ds">${escapeHtml(p.sub)}</span>`}</span>
        ${tag}
      </button>`,
    );
  }
  return `<div class="guide-flow">${out.join('')}</div>`;
}

/** 우측 상세 패널들 — phase별 1개, active만 보임 (클릭 토글은 panel.ts 스크립트). */
function renderDetails(): string {
  const panels = PHASES.map(p => {
    const active = p.k === DEFAULT_ACTIVE ? ' active' : '';
    const lines = p.lines.map(l => `<li>${escapeHtml(l)}</li>`).join('');
    const skill = p.skill ? `<div class="guide-d-tag">수행: ${escapeHtml(p.skill)}</div>` : '';
    return `<div class="guide-detail-panel${active}" data-guide-detail="${p.k}">
        <span class="guide-d-num">${escapeHtml(p.k)}</span>
        <h3 class="guide-d-title">Phase ${escapeHtml(p.k)} · ${escapeHtml(p.name)} — ${escapeHtml(p.sub)}</h3>
        ${skill}
        <div class="guide-d-purpose">${escapeHtml(p.purpose)}</div>
        ${lines ? `<ul class="guide-d-lines">${lines}</ul>` : ''}
        <div class="guide-d-out">산출물 · <code>${escapeHtml(p.output)}</code></div>
      </div>`;
  }).join('');
  return `<div class="guide-detail-wrap">${panels}</div>`;
}

/**
 * Guide 페이지 렌더 — 헤더 + 개요 + 파이프라인 스테퍼 + 나머지 안내.
 * 입력 없음(내장 콘텐츠). 출력: HTML 문자열.
 */
export function renderGuidePage(): string {
  return `
    <div class="page-hero compact">
      <div class="page-eyebrow">GUIDE · blueprint 안내</div>
      <h1 class="page-title">기능 · 단계별 설명 · 업데이트</h1>
      <p class="page-subtitle">blueprint가 무엇을 해주는지, INQUIRY부터 POST-SHIP까지 각 단계가 뭘 하는지, 무엇이 새로 바뀌었는지.</p>
    </div>
    ${renderMarkdown(INTRO_MD)}

    <section class="ds-card">
      <div class="ds-eyebrow">파이프라인 단계별 (INQUIRY → POST-SHIP)</div>
      <p class="guide-pipeline-hint">좌측에서 단계를 누르면 우측에 상세가 뜹니다. 흐름: 발견 → 정의 → 설계 → 구조 → 구현 → 검토 → 출시 → 사후.</p>
      <div class="guide-pipeline">
        ${renderFlow()}
        ${renderDetails()}
      </div>
    </section>

    ${renderMarkdown(REST_MD)}`;
}
