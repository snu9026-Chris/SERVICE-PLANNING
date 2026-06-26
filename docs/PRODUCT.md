# PRODUCT — 대시보드 확장 프로그램

> 작성: 2026-05-22 / Phase 0 / Status: APPROVED (V0 진입)

## One-liner
`.blueprint/state.md`와 phase별 산출물 .md를 Antigravity 사이드바·에디터에 영구 렌더링해서, AI 코딩 워크플로의 인지 과부하를 줄이는 시각화 extension.

## Target user
Antigravity + gstack + /blueprint 메타스킬을 메인 워크플로로 쓰는 솔로 빌더 (사용자 본인 + 같은 부류).

## Jobs-to-be-done
1. **세션 간 망각 방지** — 사이드바를 보기만 해도 "어제 어디까지" 즉시 파악
2. **세션 내 분산 방지** — 현재 phase / next action / triggers 가 항상 사이드바에 고정
3. **트리거 알림** — checkpoint 트리거 발동 시 활동바 아이콘에 배지(빨간 점)
4. **산출물 시각화** — PRODUCT/DESIGN/ARCHITECTURE.md 를 getdesign.md 스타일 HTML로 가운데 webview에 렌더
5. **디자인 시안 가시화** — DESIGN.md 안의 hex/폰트를 자동 swatch·샘플로 변환, `docs/design/*.html` 갤러리 표시

## Narrowest wedge — V0
**state.md 한 파일만 사이드바 TreeView로 렌더링.** 그 외 기능 일절 없음. 1-2일 작업.

V0 검증 질문: "사이드바에 phase 진행도가 영구 떠 있는 것만으로 인지부하가 줄어드는가?"
- Yes → V1 진행 (가운데 webview 추가)
- No → V0에서 멈춤, 다른 접근 재검토

## Versions
| V | Scope | 작업량 |
|---|---|---|
| V0 | state.md → 사이드바 TreeView | 1-2일 |
| V1 | + 가운데 webview (phase별 .md HTML 렌더) + 활동바 trigger 배지 | 1주 |
| V2 | + DESIGN.md hex/폰트 자동 시각화 + `docs/design/*.html` 갤러리 | 1-2주 |
| V3 | + 코드 locator (활성 파일·영향 도메인) + git diff 미리보기 | 2주 |
| V4 | + Retrofit 모드 (기존 코드베이스 역분석) | 별도 결정 |

## NON-GOALS
- **AI 호출을 직접 하지 않는다.** Claude Agent SDK 호출 없음. 모든 AI 동작은 사용자가 채팅에서 `/blueprint`, `/blueprint check` 슬래시 명령으로 트리거. → biz-plan-extension 패턴 *채용하지 않음*.
- **/blueprint 자체를 대체하지 않는다.** 시각화·알림 레이어만. 모든 state 변경의 진실 원본은 `.blueprint/state.md` (단방향: 파일 → UI). *예외(ADR-021)*: 확장이 진단/Task 실패에서 파생된 텔레메트리를 `docs/error.auto.md` 한 파일에만 자동 기록 — 상태가 아닌 파생 로그이며 state·기획 산출물은 불변.
- **임의 마크다운 generic 프리뷰 안 함.** `.blueprint/state.md` 가 없는 워크스페이스에선 "감지 안 됨" 안내만. (V4 이후 별도 제품으로 분리 검토 — 본 product 정체성 분산 방지)
- **사용자 모드 선택 prompt 없음.** state.md 유무 + 코드 파일 유무로 자동 감지. 인지부하 ↓
- **Antigravity 외 IDE 미지원.** VS Code 본가, Cursor, JetBrains 안 함.
- **팀 협업 기능 없음.** 1인용.
- **분석/통계 대시보드 없음.** 시간 트래킹, 리포트 X.

## Success metric
**사용자 본인이 매일 켜놓고 작업하는가** (자기보고 + extension 활성화 시간 추적).
- 켜놓고 안 보면 = 실패. 마진 가치
- 켜놓고 매 세션 1회 이상 보면 = V0 성공, V1 진행 정당화

## Out of scope (지금은 X, 나중엔 고려)
- 다른 IDE 지원
- 팀 협업
- 스킬샵 판매용 패키징 (본인 안정화 후)
- 임의 마크다운 generic 모드 (V4 별도 제품 검토)
