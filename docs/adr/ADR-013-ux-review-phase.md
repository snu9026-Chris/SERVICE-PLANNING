# ADR-013: Phase 4.5 — UX-REVIEW (제품·사용성 품질 게이트 신설)

- Date: 2026-06-07
- Status: accepted

## Context

/blueprint 파이프라인의 품질 평가는 **엔지니어링 축에 편중**돼 있다.
Phase 4 REVIEW(`/code-review` + `/retro`), Phase 5 SHIP(`/qa` + `/review`),
상시 `/cso`·`/benchmark`·`/codex challenge` — 코드 정확성·아키텍처·보안·성능은
촘촘하게 커버된다.

그러나 **제품·UX 품질**은 점(point)으로만 존재한다:
- `/office-hours` (착수 전 1회), `/plan-ceo-review`·`/plan-design-review` (계획 1회),
  `/design-review` (라이브 시각 QA).

빠진 것 — 출시 직전에 "이 제품이 **잘 쓰이게** 만들어졌는가"를 체계적으로 재는 게이트:
- 사용성 휴리스틱 (인지 부하, 일관성, 피드백/가시성, 오류 예방·복구)
- 사용자 여정 마찰 (task success, 목표까지 클릭 수)
- **다중사용자 상호작용** — 동시성·권한·알림 전파·충돌 해결·소셜 다이내믹.
  어떤 자동 코드 툴도 못 잡는, 시나리오 워크스루로만 드러나는 영역.
- 기능 간 연계(응집도)·정보구조(IA) 일관성, 접근성(a11y).

이 빈틈은 이 확장 하나가 아니라 **/blueprint로 찍어낼 모든 앱/웹**에 해당한다.
엔지니어링 게이트(gstack)와 대칭이 되도록 제품 게이트가 필요하다.

## Decision

IMPLEMENT(3) 이후, SHIP(5) 이전에 **Phase 4.5 — UX-REVIEW** 를 신설한다.
(REVIEW(4)가 코드 리뷰이므로, 그 직후 4.5에서 제품 리뷰 — 대칭 구조.)

- 산출물: `docs/UX-QUALITY.md` — 차원별 0~10 루브릭 + 조건부 다중사용자 섹션.
- 채점: **Claude 자가채점 + 기존 스킬 혼용.** 새 루브릭은 기존 스킬이 안 보는
  차원(다중사용자·기능 연계·접근성)을 담당. 시각 품질은 `/plan-design-review`(계획)·
  `/design-review`(라이브)에 위임, 중복 채점하지 않음.
- **다중사용자 섹션은 조건부.** PRODUCT.md NON-GOALS에 "팀 협업 없음/1인용"이 있거나
  단일 사용자 앱이면 섹션 전체를 "N/A (단일 사용자)"로 접는다. 다중사용자 앱이면
  동시성·권한·알림 전파·충돌 해결·소셜 다이내믹을 풀 체크리스트로 전개.
- soft gate (ADR-011 FEASIBILITY와 동일 철학): 점수가 낮아도 **차단하지 않는다.**
  SHIP 진입 시 UX-QUALITY.md 미작성이면 경고만. 최종 판단은 사용자.

## Consequences

- Positive: 모든 프로젝트가 개발 품질(gstack) + 제품 품질(UX 루브릭) 양축으로 평가됨.
  현재의 비대칭(엔지니어링만 촘촘)이 해소된다.
- Positive: 다중사용자 상호작용처럼 자동 툴이 못 잡는 영역을 강제 점검 — 시나리오
  워크스루가 파이프라인에 명시적으로 박힌다.
- Positive: 점수가 docs/UX-QUALITY.md에 누적 → 사이드바 점수 카드로 시각화 가능
  (이 확장의 정체성 "blueprint 진행 영구 시각화"와 합치).
- Negative: phase가 또 하나 늘어 파이프라인이 길어진다. (4.5로 표기해 4↔5 보조단계 명시)
- Neutral: soft gate라 무시 가능 — 의도된 유연성. 자가채점은 주관 편향 위험이 있어
  시각·코드 차원은 전용 스킬에 위임해 보완.

## Alternatives considered

- 기존 phase 안의 sub-step (DESIGN+REVIEW 분산): phase 안 늘지만 두 곳으로 쪼개져
  "제품 품질"이 한 산출물로 안 모임 → 탈락.
- 순수 자가채점 (단일 루브릭 전부 Claude): 기존 design-review 스킬과 중복·주관 편향
  → 혼용으로 결정.
- 다중사용자 상시 섹션 (1인용도 항상 표시): 엉성한 N/A 항목 양산 → 조건부로 결정.

## References

- 관련: ADR-011 (FEASIBILITY phase, soft gate 선례), ADR-012 (동적 phase — 4.5 수용 가능)
- 동적 phase 덕에 코드 변경 없이 state.md/템플릿만으로 4.5 수용됨 (ADR-012 효과 검증)
- 변경 파일: skills/blueprint/SKILL.md, templates/UX-QUALITY.md.tmpl,
  templates/state.md.tmpl, templates/roadmap.md.tmpl (+ 전역 동기화)
