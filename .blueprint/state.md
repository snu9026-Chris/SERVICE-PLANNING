# Blueprint State — 대시보드 확장 프로그램

## Progress
- [x] Phase 0: INQUIRY (사후 정리, 2026-06-12)
- [x] Phase 1: PRODUCT (2026-05-22)
- [x] Phase 1.5: FEASIBILITY (사후 검증, 2026-06-10)
- [x] Phase 2: DESIGN (2026-05-22)
- [x] Phase 3: ARCHITECTURE (2026-05-22)
- [x] Phase 4: IMPLEMENT (2026-05-24)
- [x] Phase 5: REVIEW (checkpoint 1회 + ad-hoc, 2026-05-24)
- [x] Phase 5.5: UX-REVIEW (시범 채점 7.4/10, 2026-06-07)
- [x] Phase 5.7: QA (전수 QA 통과, 2026-06-09)
- [x] Phase 6: SHIP (v0.1.0, 2026-05-24)
- [x] Phase 7: POST-SHIP (2026-05-24)

> CHECKPOINT는 phase 제외 (ADR-009, cross-cutting). REVIEW=phase 5 (ADR-010).
> INQUIRY=0 (v0.12.0 신설, Claude 직접 리서치). FEASIBILITY=1.5, UX-REVIEW=5.5, QA=5.7 — 모두 soft gate.
> INQUIRY·FEASIBILITY·UX는 출시 후 신설/사후 정리 — 이력 정직성.

## Build target
- type: vscode-extension
- run: F5 dev / 로컬 .vsix
- dist: 로컬 설치 (marketplace 미정)
- stack: TypeScript + esbuild
- confidence: locked

## Next action
v0.19.1 설치+리로드 후 UX Flow ①도식·②큰시안 도그푸딩 + Preview 2그룹(컴포넌트/자유실험) 확인. code-review 7건 + UX-FLOW 매칭(A·B) 반영 완료. 백로그: mermaid 도식화, generic mode(V4), 1주 dogfooding.

## Decisions log
- 2026-05-22~24: 초기 결정 — Antigravity extension, 단방향 .md→UI, AI 호출 X, V0 사이드바→V0+ webview, init/retrofit 모드. ADR-001~008. Phase 4 checkpoint 1회(checkpoint-2026-05-24.md).
- 2026-06-07: Phase 4.5 UX-REVIEW 시범 1회 — 평균 7.4/10, ❌ 0건, SHIP 권고. 백로그 3건(a11y 키보드, phase-click affordance, JBT3 트리거 배지). docs/UX-QUALITY.md
- 2026-06-09: ADR-014 — webview QA 탭 추가(Preview↔Errors), qa.report.md 단방향 렌더 + npm run qa 하네스(87/87 PASS). 전수 QA: 빌드·파서·5탭·패키징 통과, .qa-tmp 패키지 누출 발견·수정.
- 2026-06-10: Phase 0.5 FEASIBILITY 사후검증(JTBD ✅3/⚠️2/❌0) → 명세-구현 간극 2건 발견, 결정 A로 둘 다 구현 — JTBD3 활동바 배지(`computeTriggerBadge`), JTBD5 디자인토큰 패널(`extractDesignTokens`). 둘 다 순수함수+하네스. FEASIBILITY 5/5 ✅. docs/FEASIBILITY.md. (v0.9.7→0.9.9)
- 2026-06-10: ADR-016 BUILD TARGET — Hero phase 위 산출물 타입 배지(하이브리드: state.md 명시 우선 + package.json/tauri/index.html 자동감지, `build-target.ts` 순수). + blueprint 스킬 Phase 0 TARGET 인터뷰 신설(2축 type+run/dist, state.md/PRODUCT 템플릿 슬롯). 하네스 142/142. (v0.10.0→0.11.0)
- 2026-06-12: Phase 0 INQUIRY 신설 — blueprint 스킬 v2(INQUIRY 절차+RESUME 자동백필, 전체 phase +1, 별도 public repo) + 대시보드 연동(spec/panel/extension)·docs/design 라이브갱신. ADR-017 Guide 탭(Errors 오른쪽, 기능·단계별·변경이력 내장, .md→UI 예외). + 완결성 정리(문서 동기화·ADR-018·헬퍼·a11y/미결 배지) + ADR-019 옛 파이프라인 ghost phase·스킬 전체 캐노니컬 백필. 하네스 178/178. (v0.12.0→0.15.0)
- 2026-06-23: ADR-020 UX Flow 탭(Spec↔Preview) + Preview 2모드(자유 실험↔기능 명세). 단일 출처 `docs/UX-FLOW.md`(parser ux-flow.ts) → 여정 그래프·기능명세 공유. blueprint DESIGN에 UX Flow 인터뷰. + 디자인 계약 게이트(REVIEW 시안 대조, CLAUDE.md). 페이지 8개. (→v0.17.0)
- 2026-06-26: ADR-021 에러 자동수집(diagnostics 도메인), ADR-022 UX Flow↔Preview 역할분리(타임라인+큰시안 통합/Preview 갤러리 전용). Guide 탭 최신화 + code-review 7건 수정 + UX-FLOW 매칭 A·B 정리. 하네스 231/231. (v0.18→0.19.1)

## Counters
- ships_since_checkpoint: 1
- last_check: 2026-05-24
- checkpoint_count: 1
- plans_without_arch_read: 0

## Triggers fired
(empty)

## Settings
- strict_mode: false
- quiet_until: (empty)

