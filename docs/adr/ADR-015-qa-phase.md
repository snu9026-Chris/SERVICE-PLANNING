# ADR-015: QA를 파이프라인 phase로 추가 (4.7)

- Date: 2026-06-09
- Status: accepted
- 관련: ADR-012(동적 phase 리스트), ADR-013(UX-REVIEW phase), ADR-014(QA 탭)

## Context
ADR-014로 webview에 QA 탭을 추가했지만, 사이드바 **PHASES 리스트**에는 QA가 단계로
드러나지 않았다. 사용자가 "QA도 phase에 놓아 달라"고 요청 — 기능 전수 점검이 SHIP 전
명시적 게이트로 보이길 원함.

ADR-012에서 phase 리스트는 **동적**(state.md가 진실 원본, 코드가 개수·이름 고정 안 함)이라,
이 프로젝트 state.md에 phase 한 줄을 추가하는 것으로 사이드바에 즉시 반영된다.

## Decision
QA를 **Phase 4.7**로 추가 — UX-REVIEW(4.5)와 SHIP(5) 사이, **SHIP 직전 최종 검증 게이트**.

순서 의미: REVIEW(4, 코드 정확성) → UX-REVIEW(4.5, 제품·사용성) → **QA(4.7, 기능 전수 점검)** → SHIP(5).

- soft gate. FAIL 0이면 SHIP 가능, WARN은 백로그로.
- 검사·기록 주체는 Claude(외부). extension은 실행하지 않고 결과만 렌더 (ADR-002/003 유지).
- 산출물: `docs/qa.report.md` (QA 탭 단방향 렌더) + 재실행 하네스 `npm run qa`.
- 소수 키 4.7 → parser가 그대로 파싱·정렬(ADR-012). UX-REVIEW(4.5, 06-07) 다음 06-09로 날짜 단조.

## Consequences
- Positive: SHIP 전 "기능 다 돌려봤나"가 파이프라인에 명시 → 누락 방지.
- Positive: ADR-014 QA 탭과 1:1 대응 (phase ↔ 탭 ↔ qa.report.md).
- Neutral: 이 프로젝트 state.md/roadmap.md에만 반영. /blueprint 메타스킬의 표준 파이프라인
  편입 여부는 별도 결정(보류) — 동적 리스트라 프로젝트별 phase 차이 허용.
- Negative: 없음 (문서 한 줄 + ADR).

## Alternatives considered
- A: QA를 REVIEW(4) 하위 활동으로만 두고 phase 미노출 — 사용자 요청과 어긋남.
- B: QA를 REVIEW 앞 4.3에 배치 — 날짜가 UX-REVIEW(4.5)보다 늦어 리스트 날짜 역전. 4.7이 단조·자연스러움.
- 채택: 4.7 최종 게이트.

## References
- `.blueprint/state.md` (## Progress / Phase 4.7), `plans/roadmap.md` (## Phase 4.7 — QA)
- ADR-014 (QA 탭), ADR-012 (동적 phase 리스트)
