# ADR-016: BUILD TARGET(산출물 타입) 상시 표시

- Date: 2026-06-10
- Status: accepted
- 관련: ADR-002(단방향 .md→UI), ADR-012(동적 phase), FEASIBILITY 사후검증

## Context
사용자가 여러 /blueprint 프로젝트를 돌리는데, 대시보드 어디에도 **"이 프로젝트가 무슨 형태를
만드는지"**(웹사이트 / vsix / 네이티브 / Tauri / Electron …)가 상시로 안 보인다. 지금은
PRODUCT.md One-liner나 package.json을 *읽어야* 안다 — 글랜서블하지 않음.

사용자 요청: "만드는 파일 형태를 어디 큼지막하게 바로 알려줘야 하는 거 아닌가? phase 위에
상시 표시가 좋아 보인다."

## Decision
사이드바 Hero에 **BUILD TARGET 배지**를 phase id 위에 상시 표시. 아이콘+라벨 (예: 🌐 Website,
📦 VS Code Extension, 🖥️ Tauri).

데이터 소스 = **하이브리드 (자동감지 + 명시 오버라이드)**:
1. `.blueprint/state.md`에 `## Build target` 섹션(`type`/`stack`/`run`/`dist`/`confidence`)이 있으면 **그걸 우선**.
2. 없으면 프로젝트 파일로 **자동 감지** — package.json(engines.vscode/contributes/deps),
   tauri.conf.json, electron dep, index.html 등.
3. 둘 다 없으면 미표시(null).

**2축 스키마**: (A) `type`(artifact: website/vscode-extension/tauri/electron/cli/library/mobile),
(B) `run`(실행: F5 dev/npm/정적 호스팅 …) + `dist`(배포: Marketplace/GitHub Releases …). 배지 pill은
type만, run/dist/confidence는 tooltip. `confidence: tentative`면 점선 테두리 + `?` 마커.

**명시 필드를 채우는 주체** = `/blueprint` 메타스킬 Phase 0의 **TARGET 서브-인터뷰**(동반 신설).
대시보드는 그 결과를 표시만 — 인터뷰는 안 함(이 repo NON-GOAL 유지).

레이어:
- 타입(`BuildTarget`, `ProjectSignals`) → `src/types.ts` (의존성 0).
- 순수 로직(`detectBuildTarget`, `explicitBuildTarget`, 메타 레지스트리) →
  `src/parser/build-target.ts` (vscode 비의존 → 하네스 검증).
- fs 시그널 수집·해석 → `src/extension.ts` (오케스트레이터, 이미 fs 접근).
- 표시 → `src/sidebar/sidebar-view-provider.ts` Hero.

## Consequences
- Positive: "무엇을 만드는 중"이 클릭 0으로 한눈에. 멀티 프로젝트 식별 쉬움.
- Positive: 자동감지라 설정 0 — 기존 프로젝트도 바로 표시. 단방향 원칙 유지(state.md 우선, 감지는 fallback).
- Neutral: 새 도메인 아님 — 메타 derive는 parser 도메인에 귀속(순수). 감지 IO만 extension.
- Negative: 감지는 휴리스틱이라 드물게 오판 가능 → 명시 필드로 교정 가능(하이브리드의 존재 이유).

## Alternatives considered
- A: state.md 명시 필드만(수동) — 누가 한 번 적어야 함, "바로 알려줌" 약함.
- B: 자동감지만 — 오판 시 교정 불가.
- 채택: 하이브리드(명시 우선 + 감지 fallback).

## References
- `src/parser/build-target.ts`, `src/types.ts`(BuildTarget/ProjectSignals)
- `src/sidebar/sidebar-view-provider.ts`(Hero 렌더), `src/extension.ts`(시그널 수집)
