# ADR-020 — UX Flow 탭 신설 + Preview 2모드 분리 (사용자 여정 시각화)

> 2026-06-23 / Status: ACCEPTED

## Context
사용자가 "이 제품을 쓰는 사람이 처음 어디로 들어가서 → 순서대로 무엇을 하고 → 최종 산출물이 나오는지"의 **사용자 여정(UX flow)**을 한눈에 보고 싶어함. 또한 그 여정의 각 단계에 **어떤 기능이 붙는지(기능 명세)**가 여정과 1:1로 매칭되길 원함.

기존 7탭(Plan/Spec/Preview/QA/Errors/Guide)에는 여정·기능명세 표면이 없었고, Preview는 디자인 시안 갤러리 한 종류만 담았다. 핵심 제약: 이 확장은 **`.md` → UI 단방향, AI 호출 0**(ADR-002·003). 따라서 여정도 "출처 `.md` 하나"에서 그려져야 화면-스킬이 안 따로 논다.

## Decision

### 1. 단일 출처 `docs/UX-FLOW.md`
새 파일 `docs/UX-FLOW.md`를 진실 원본으로 둔다. 형식(파서 계약):
- `## N. 단계명` = 여정 단계(노드). 앞의 `N.`은 순번(없으면 등장순).
- 단계 본문의 첫 `> ...` = 단계 한 줄 요약.
- `- 시안: <파일명|상대경로>` = 그 단계 화면 시안(`docs/design/screenshots/*.html`) 매칭.
- 그 외 `- 이름 — 설명 [상태]` 불릿 = 기능. 상태 ∈ {핵심, 예정, 완료}(선택).

순수 파서 `src/parser/ux-flow.ts`의 `parseUxFlow(md) → UxFlow | null`이 파싱. 같은 객체를 Flow 탭과 Preview 기능명세가 공유 → **구조적으로 절대 안 어긋남**.

### 2. UX Flow 탭 (Spec과 Preview 사이, 8번째 탭)
- `docs/UX-FLOW.md`의 단계를 **한눈에 보는 여정 그래프**(꺾인 경로형, 스크롤 없이)로 렌더.
- 노드 = `번호 + 단계명 + 기능 개수`. 시안 썸네일은 넣지 않음(지도 역할만). 시작/끝 강조.
- 파일 없으면 빈 상태 안내(`/blueprint`의 UX Flow 인터뷰 유도).

### 3. Preview 2모드 분리 (세그먼트 토글)
Preview 진입 시 두 섹션을 한 페이지에 쌓지 않고 **토글로 하나만** 본다:
- **자유 실험**(기본) — 기존 디자인 시안 갤러리 + 푸시 HTML. 그대로 유지.
- **기능 명세** — UX Flow 단계 순서대로, 각 단계에 **화면 시안 썸네일 + 기능 목록**. 같은 `UX-FLOW.md`에서 그림.

`previewMode` 상태는 webview 패널 메모리에 둠(`postMessage('preview-mode')`로 전환, 서버 round-trip).

### 4. blueprint 스킬 동기화
DESIGN 단계(시안이 거기서 생성됨)에 **UX Flow 인터뷰 sub-step**을 신설 — "온보딩→…→산출물" 여정을 질의해 `docs/UX-FLOW.md`를 위 형식으로 생성. 화면(탭)과 스킬(인터뷰)이 같은 파일 형식을 공유.

## Consequences
- (+) 여정·기능명세가 단일 출처에서 그려져 영원히 일치. 제품마다 다른 여정도 `UX-FLOW.md`만 바꾸면 됨.
- (+) `.md→UI 단방향`·`AI 호출 0` 원칙 유지(파일 읽어 렌더만).
- (−) 탭 8개로 증가(가로 폭 압박). → 라벨 짧게(`UX Flow`).
- (−) Preview에 sub-mode 상태가 생겨 Preview가 stateless가 아니게 됨(메모리 1개 enum). 단방향 데이터엔 영향 없음.
- (−) `CANONICAL_PHASES`/스킬 phase 번호 drift는 본 ADR 범위 밖(이름 기준으로 인터뷰 삽입해 회피).

## Scope
페이지 8개(ADR-017 6개 → 본 ADR 8개... QA 탭 포함 7개였고 +1 = 8개). 탭은 고정 UI라 state.md phase와 무관. 새 도메인 없음 — parser(ux-flow)·webview(flow page, preview mode)만 확장.
