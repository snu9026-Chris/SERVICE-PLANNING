# ADR-019 — 캐노니컬 phase ghost (옛 파이프라인 마이그레이션 가시화)

> 2026-06-12 / Status: ACCEPTED

## Context
대시보드 PHASES는 state.md를 동적으로 읽는다(ADR-012, "문서=진실원본", 하드코딩 phase 없음). 그래서 INQUIRY 신설 *이전*에 시작한 진행 중 프로젝트는 state.md에 옛 phase 목록만 있어 — 대시보드에 INQUIRY(P0)·기타 신규 phase가 **안 보인다.** `/blueprint` 백필은 실행해야만 돌고, 그 전까지는 누락 상태.

## Decision
**두 갈래로 보강:**

1. **스킬 (정식 데이터)** — `/blueprint` RESUME의 phase 동기화(Step 1.5)를 INQUIRY-only에서 **전체 캐노니컬 재조정**으로 확장: 이름 기준 대조 → 빠진 캐노니컬 phase를 미완 `[ ]`로 삽입(절대 done 아님) + 기존 상태 보존 + 재번호.

2. **대시보드 (즉시 가시화)** — `types.CANONICAL_PHASES` 상수 + `missingCanonicalPhases()`로, state.md에 (이름 기준) 빠진 캐노니컬 phase를 사이드바 PHASES 아래 **"미반영" ghost 그룹**으로 표시(점선·흐림·`미반영` 태그·클릭 불가). 진행도·현재 phase 계산은 **실제 state.md 기준 유지**(ghost는 표시 전용).

## Consequences
- (+) 옛 프로젝트도 `/blueprint` 실행 전부터 전체 파이프라인이 보임 + 실행하면 정식 반영.
- (+) ghost는 별도 그룹이라 옛 번호(PRODUCT@0)와 신규(INQUIRY@0) **번호 충돌 없음**.
- (−) `CANONICAL_PHASES`가 확장 코드에 들어가 ADR-012(동적 phase, 하드코딩 없음)의 **부분 예외**. 소프트 게이트는 제외(선택이라). 스킬 `state.md.tmpl` phase가 바뀌면 이 상수도 같이 갱신해야 함(drift 주의 — 주석 명시).

## Scope
ghost는 *표시 전용* — state.md를 고치지 않음(데이터 변경은 스킬 백필이 담당). 소프트 게이트는 ghost 대상 아님.
