# ADR-012: 동적 phase 리스트 — PhaseId union 폐기, key+order 기반

- Date: 2026-06-05
- Status: accepted

## Context

ADR-011로 Phase 0.5 (FEASIBILITY)를 파이프라인에 추가했다. 그러나 확장 코드는
phase 개수를 7개(0~6)로 하드코딩하고 있었다:

- `src/types.ts`: `type PhaseId = 0 | 1 | 2 | 3 | 4 | 5 | 6` (정수 union)
- `src/parser/state.ts`: 정규식 `Phase\s+(\d+)` — **정수만** 매칭. `0.5`는 무시됨.
  추가로 `for (i=0; i<=6; i++)` 누락 보강, rawId 0~6 매핑 분기.
- `src/webview/panel.ts`: `artifactSectionForPhase`가 `case 0/1/2`로 분기.

그 결과 state.md에 `Phase 0.5: FEASIBILITY`를 적어도 사이드바·webview에 안 뜬다.
근본 원인은 "phase 집합이 코드에 고정"이라는 점. 앞으로도 phase가 늘 수 있는데
(0.5가 그 증거) 매번 union 타입·매핑·보강 루프를 고치는 것은 취약하다.

다행히 렌더링부(sidebar `phases.map`, `getProgress`는 `phases.length` 기반)는
이미 배열을 순회하므로 거의 동적이다. 병목은 **타입(PhaseId union)** 과 **parser** 둘뿐.

## Decision

phase 식별자를 **정수 union에서 문자열 key + 명시적 order로 분리**한다.

- `PhaseId` (정수 union) 폐기.
- `Phase` 객체: `{ key: string; name: string; order: number; status; completedAt?; meta? }`
  - `key`: state.md의 "Phase X" 의 X를 문자열로 ("0", "0.5", "1", ...). 클릭 식별·data 속성용.
  - `order`: 정렬·진행도용 숫자 (parseFloat(key), "0.5" → 0.5).
  - `name`: "FEASIBILITY" 등.
- parser 정규식: `Phase\s+(\d+(?:\.\d+)?)` — 소수 허용. 0~6 매핑/보강 루프 **삭제**.
  state.md에 적힌 phase를 **있는 그대로** 읽는다. (단 CHECKPOINT는 기존대로 skip)
- `PHASE_NAMES` 상수(정수→이름 맵) 폐기 — 이름은 state.md에서 직접 옴.
- 산출물 매핑(`artifactSectionForPhase`)은 phase **name 기반**으로 전환:
  PRODUCT/FEASIBILITY/DESIGN/ARCHITECTURE → 각 .md. FEASIBILITY → `docs/FEASIBILITY.md`.
- 클릭 식별자: 숫자 phaseId → 문자열 phaseKey 로 변경 (postMessage, 콜백 시그니처).

## Consequences

- Positive: 앞으로 phase 추가·삭제·재배열이 **.md 수정만으로** UI에 반영된다.
  (2.5, 7, phase 이름 변경 등 — 코드 안 건드림)
- Positive: "진실 원본은 state.md" 원칙(ADR 정신)에 부합 — 코드가 phase 집합을
  강제하지 않고 문서를 따른다.
- Negative: PhaseId 타입 안전성(컴파일 타임 0~6 보장)을 잃는다. 대신 parser가
  방어적으로 처리. phase 집합이 자유로워진 만큼 오타("Phase 1: DESIGNN")는
  그대로 렌더됨 — state.md 스키마 신뢰에 의존.
- Neutral: 산출물 매핑이 name 기반이라, name 오타 시 클릭해도 webview 안 바뀜
  (조용히 무시). 기존 정수 매핑과 동작상 동일 수준.

## Alternatives considered

- B (0.5만 union에 추가): `0 | 0.5 | 1 | ...`. 최소 변경이나 다음 소수 phase 때
  또 손봄. 하드코딩 문제 미해결 → 탈락.
- C (완전 name 기반, key 없음): id를 버리고 name만. 그러나 같은 이름 phase가
  생기면 충돌, 정렬 순서를 name에서 못 얻음. key("0.5")+order 조합이 더 견고 → 탈락.

## References

- 관련: ADR-011 (FEASIBILITY phase 신설) — 이 변경의 직접 동기
- 변경 파일: src/types.ts, src/parser/state.ts, src/sidebar/sidebar-view-provider.ts,
  src/webview/panel.ts, src/extension.ts (+ 빌드·vsix 재패키징)
