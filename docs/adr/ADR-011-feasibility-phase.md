# ADR-011: Phase 0.5 — FEASIBILITY (의존성·실현가능성 검증 단계 신설)

- Date: 2026-06-05
- Status: accepted

## Context

/blueprint 파이프라인은 `PRODUCT → DESIGN → ARCHITECTURE → IMPLEMENT → ...` 로 흐른다.
PRODUCT는 *무엇을/왜* 만드는지(JBT·NON-GOALS), ARCHITECTURE는 *어떻게* 만드는지(Stack·Domain)를 다룬다.

그러나 그 사이에 **"이게 기술적으로 되는가? 어떤 외부 도구·API·라이브러리가 필요한가?"** 를
검증하는 단계가 없다. ARCHITECTURE에서 Stack을 *고르긴* 하지만, 그건 "선택"이지
"실현가능성 검증"이 아니다. /office-hours(Phase 0)도 *시장/수요* 관점이지 *기술 실현가능성*이 아니다.

결과적으로 사용자가 기능을 기획할 때 "이건 구현 가능한가 / 무엇이 필요한가 / 근거는"이
문서로 남지 않고, IMPLEMENT 단계에서야 막히는 일이 생긴다. 정식 용어로
**tech feasibility spike / dependency analysis** 단계가 통째로 빠져 있었다.

## Decision

PRODUCT(Phase 0)와 DESIGN(Phase 1) 사이에 **Phase 0.5 — FEASIBILITY** 를 신설한다.

- 산출물: `docs/FEASIBILITY.md` (각 JBT별 가능여부 ✅/⚠️/❌ + 필요한 도구·API + 근거)
- 검증 방식: **불확실한 것만 웹서칭.** Claude가 이미 아는 흔한 스택(React, FastAPI 등)은
  지식으로 판정하고, 애매·최신·니치 API만 실제 WebSearch/WebFetch로 실존·버전·제약 확인.
- ❌(구현 불가) 판정이 나와도 **파이프라인을 차단하지 않는다.** 문서에 기록만 하고
  최종 판단은 사용자에게 맡긴다. (Phase 3 hard gate와 달리 soft gate)
- Hard gate: DESIGN(Phase 1) 진입 시 `docs/FEASIBILITY.md` 가 비어있으면(템플릿 그대로면)
  **경고만** 띄우고 진행 허용. (PRODUCT/ARCHITECTURE의 차단형 gate와 구분)

## Consequences

- Positive: 기획 단계에서 "된다/안 된다 + 뭐가 필요하다 + 근거 링크"가 독립 문서로 남는다.
  IMPLEMENT에서 뒤늦게 막히는 일이 줄고, 의존성·비용·제약이 ARCHITECTURE 전에 드러난다.
- Positive: 웹서칭을 "불확실한 것만"으로 제한해 단계가 무겁지 않다.
- Negative: phase가 하나 늘어 파이프라인이 살짝 길어진다. (0.5로 표기해 0↔1 사이 보조단계임을 명시)
- Neutral: 차단하지 않으므로 사용자가 무시하고 진행할 수 있다 — 의도된 유연성(기록 우선).

## Alternatives considered

- B (PRODUCT.md에 섹션만 추가): 가볍지만 산출물이 PRODUCT에 묻혀 가시성↓, 웹서칭 근거를
  체계적으로 남기기 어려움. → 독립 문서가 빈틈을 더 정확히 메운다고 판단.
- C (ARCHITECTURE 앞 체크만): Stack 고를 때 검증 의무화. 산출물이 없어 "왜 가능/불가인지"가
  휘발됨. → 탈락.
- Hard 차단형 gate: ❌면 막기. 그러나 실현가능성은 정도(degree) 문제라 이분법 차단은
  과함. soft gate로 결정.

## References

- 관련: ADR-010 (REVIEW as Phase) — phase 추가/gate 패턴 선례
- 변경 파일: skills/blueprint/SKILL.md, templates/FEASIBILITY.md.tmpl,
  templates/state.md.tmpl, templates/roadmap.md.tmpl (+ 전역 ~/.claude/skills/ 동기화)
