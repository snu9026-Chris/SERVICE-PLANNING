# ADR-022 — 기능 명세를 UX Flow 탭으로 통합 (Preview는 갤러리 전용)

> 2026-06-23 / Status: ACCEPTED / Supersedes ADR-020 §2·§3

## Context
ADR-020은 같은 `docs/UX-FLOW.md`를 두 표면에 나눠 그렸다: **Flow 탭**(여정 지도만)과 **Preview → 기능 명세 모드**(단계별 시안+기능). 그런데 같은 "단계"를 두 탭에 쪼개 놓으니 사용자가 지도(Flow)와 상세(Preview)를 왔다 갔다 해야 했다. 또 Preview의 기능 명세 시안은 150×100px로 작고 클릭 확대도 안 돼서 "디자인 시안을 바로 못 본다"는 불만이 나왔다.

사용자 요청(2026-06-23): "차라리 이런 건 UX 플로우에 넣는 게 좋지 않나? 그리고 최대한 쉽게 설명해줬으면."

## Decision

### 1. UX Flow 탭 = 지도 + 단계 상세 통합
UX Flow 탭이 한 화면에 **여정 그래프(위) + 단계별 상세(아래)**를 모두 담는다.
- 위: 기존 꺾인 경로형 여정 그래프(지도) 유지.
- 아래: 각 단계 카드 = **큰 화면 시안(가로 꽉, 클릭하면 확대) + 기능 목록**.
- 시안 클릭 확대는 같은 webview 안 인라인 오버레이로(탭 이동 없음). 시안 내용은 이미 `designFiles[].content`로 임베드되어 있어 서버 round-trip 불필요.

### 2. Preview 탭 = 자유 실험 갤러리 전용
Preview의 세그먼트 토글(자유 실험 ↔ 기능 명세)과 `spec` 모드를 제거한다. Preview는 `docs/design/` 시안 갤러리 + 푸시 HTML 뷰어만 담는다. `PreviewMode`·`previewMode` 상태 삭제.

### 3. 단일 출처·파서 불변
`docs/UX-FLOW.md` 형식과 `parseUxFlow`는 그대로. 통합은 *렌더 위치*만 바꿀 뿐, 데이터 출처는 한 파일 유지 → 지도와 상세가 영원히 일치.

### 4. 설명 문구 평이화
`docs/UX-FLOW.md`의 단계·기능 설명을 개발 용어(`.blueprint/state.md` 등) 대신 비개발자가 읽을 수 있는 일상어로 작성한다.

## Consequences
- (+) 한 탭에서 "흐름 보고 → 그 단계 화면도 크게 본다." 탭 왕복 제거.
- (+) Preview 역할이 "막 띄워보는 갤러리"로 단순·명확해짐(상태 enum 제거 → 다시 stateless).
- (+) `.md→UI 단방향`·`AI 호출 0` 원칙 유지.
- (−) Flow 탭이 길어짐(스크롤 발생) — 지도는 위에 고정폭 카드로 두고 상세만 스크롤.
- (−) ADR-020 §2(지도만)·§3(2모드)를 대체. 탭 개수(7개)는 그대로.

## Scope
새 도메인 없음. `webview/pages/flow.ts`(상세 통합)·`webview/pages/preview.ts`(모드 제거)·`webview/panel.ts`(previewMode 제거 + 시안 확대 오버레이 스크립트)·`styles.css`만 변경. 파서·types(UxFlow)·blueprint 스킬 형식 불변.
