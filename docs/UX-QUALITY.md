# UX-QUALITY — 대시보드 확장 프로그램

> Phase 4.5 (ADR-013). 채점일: 2026-06-07 / 대상: blueprint-dashboard v0.9.6
> 개발 품질(/code-review)이 아니라 **제품·UX 품질**. 시각 디테일은 /design-review 위임.
> soft gate — 점수 낮아도 차단 안 함. 최종 결정은 사용자.

## 점수 범례
- 0~3 ❌ 심각 — 출시 전 고쳐야 함
- 4~6 ⚠️ 보통 — 알면서 출시하거나 백로그
- 7~8 ✅ 양호
- 9~10 ⭐ 탁월

## 핵심 루브릭 (단일/다중 공통)

| # | 차원 | 점수 | 근거 / 마찰점 / 개선안 |
|---|---|---|---|
| 1 | 사용자 여정 명확성 | 9/10 ⭐ | IDE 열면 0클릭으로 현재 phase·진행도·current focus가 사이드바에 고정 표시. 산출물은 phase row 1클릭. 막다른 길 하나: 산출물 없는 phase(IMPLEMENT/REVIEW/SHIP/POST-SHIP) 클릭 → Spec 탭만 전환되고 포커스 없음 (#4 참조). |
| 2 | 인지 부하 | 9/10 ⭐ | 사이드바 4섹션(Hero·Phases·Current Focus·Recent Changes)으로 정제 — 과거 7섹션(TRIGGERS/ACTIVE FILE/CHECKPOINTS)에서 의도적 축소. 가운데 탭 4개(Plan/Spec/Preview/Errors) 명확. Recent Changes는 카테고리 dedup·임시파일 필터로 노이즈 제거. 인식 기반(아이콘+라벨), 기억 의존 최소. |
| 3 | 일관성 (IA) | 8/10 ✅ | phase 키(P0/P0.5/P4.5), 아이콘 카테고리화, 카드 레이아웃이 화면마다 일관. 단방향(.md→UI) 멘탈모델 예측 가능. 경미: Spec 탭 폴더 매핑이 phase 이름 기반(ADR-012)이라 phase 추가 시 자동 정렬되나, 산출물 없는 phase의 시각적 구분이 약함. |
| 4 | 피드백 & 가시성 | 6/10 ⚠️ | Preview push 시 탭에 파란 dot, Errors 탭에 카운트 배지 — 시스템 상태 가시화 양호. **마찰**: 산출물 없는 phase row 클릭 시 Spec 탭으로 전환되지만 왜 비었는지 설명 없음(무반응처럼 느껴짐). 모든 row가 `data-phase-key`로 클릭 가능해 보이는데 절반만 의미 있는 반응 → affordance 불일치. 개선: 산출물 없는 phase는 비활성 스타일 또는 "이 단계는 별도 명세 없음" 안내. |
| 5 | 오류 예방 & 복구 | 7/10 ✅ | 구조적 안전 — read-only 단방향이라 사용자가 망칠 파괴적 액션 자체가 없음(undo 불필요). 파일 읽기 실패 시 `showErrorMessage` 토스트로 복구 경로 안내. error.history 생성 실패도 토스트 처리. |
| 6 | 기능 간 연계 (응집도) | 8/10 ✅ | sidebar phase 클릭 → Spec 탭 해당 폴더 자동 펼침, 채팅 명령 → Preview 자동 전환, 디자인 시안 클릭 → Preview 콘텐츠 교체 — 맥락 전달 자연스러움. **갭**: JBT3(트리거 발동 시 활동바 배지)가 사이드바 정제 과정에서 현재 UI에 미표면. 코드(renderTriggers)는 있으나 renderBody에서 호출 안 됨. |
| 7 | 접근성 (a11y) | 4/10 ⚠️ | **최약점**. 탭은 `<button>`이라 키보드 OK이나, phase row·spec-select·preview-file은 `<div>` + click 핸들러 — tabindex/role/aria 없어 키보드·스크린리더 도달 불가. 키보드만 쓰는 사용자는 산출물 열람 불가. 개선: 클릭 div를 `role="button"` + `tabindex="0"` + Enter/Space 핸들러로, 또는 `<button>` 전환. (대비/폰트는 /design-review 위임.) |
| 8 | 첫 사용 경험 | 8/10 ✅ | empty state 명확: state.md 없으면 "No blueprint detected" + `/blueprint` 실행 안내. Errors 탭은 파일 없을 때 생성 버튼 제공. 빈 상태가 막다른 길이 아니라 다음 행동 제시. |

## 사용자 여정 워크스루 (JBT별)

| JBT | 시작 → 목표 경로 | 단계 수 | 마찰점 | 판정 |
|---|---|---|---|---|
| 1. 세션 간 망각 방지 | IDE 열기 → 사이드바 Hero(현재 phase)·Phases·Current Focus 자동 표시 | 0클릭 | 없음 | ✅ |
| 2. 세션 내 분산 방지 | 사이드바 항상 고정, Current Focus가 next action 표시 | 0클릭 | 없음 | ✅ |
| 3. 트리거 알림 | (의도) 트리거 발동 → 활동바 배지 | — | 현재 사이드바·활동바에 표면 안 됨 (정제 중 제거) | ⚠️ |
| 4. 산출물 시각화 | 사이드바 phase row 클릭 → Spec 탭 렌더 | 1클릭 | 산출물 없는 phase는 무반응처럼 느껴짐 | ✅(부분) |
| 5. 디자인 시안 가시화 | Preview 탭 클릭 → 갤러리 그리드 → 시안 클릭 | 1~2클릭 | 없음 | ✅ |

---

## 다중사용자 상호작용

### 상태: ☑ N/A (단일 사용자)

PRODUCT.md NON-GOALS "팀 협업 기능 없음. 1인용." + Target user "솔로 빌더" → 자동 N/A.
동시성·권한·알림전파·충돌해결·실시간성·소셜다이내믹 전 항목 해당 없음. (.md 파일이 단일 진실 원본이고 한 사람의 로컬 워크스페이스에서만 동작.)

---

## 종합

- 핵심 루브릭 평균: **7.4 / 10** ✅ 양호
- 다중사용자 평균: N/A (단일 사용자)
- ❌(0~3) 항목: 없음
- ⚠️(4~6) 항목:
  - **#7 접근성 (4)** — 클릭 div 키보드 미도달. 가장 큰 갭이나, 솔로 빌더+마우스 사용 맥락이라 출시 차단은 아님. 백로그 우선순위 1.
  - **#4 피드백 (6)** — 산출물 없는 phase 클릭 affordance 불일치. 백로그 우선순위 2.
  - **JBT3 갭** — 트리거 배지 미표면. 정제 중 의도적 제거인지 재확인 필요 (#6).
- **출시 권고: 그대로 SHIP** — ❌ 없음, 핵심 여정(JBT1·2·4·5) 모두 ✅. ⚠️ 3건은 백로그로 처리. soft gate 통과.
- (soft gate — 권고일 뿐, 최종 결정은 사용자)

## 백로그 (출시 후)
1. [a11y] phase row·spec-select·preview-file에 `role="button"` + `tabindex="0"` + Enter/Space 핸들러
2. [feedback] 산출물 없는 phase row 비활성 스타일 또는 안내 문구
3. [연계] JBT3 트리거 배지 — 활동바 배지 복원 여부 결정 (PRODUCT.md JBT와 현 UI 정합성)

## 위임 기록 (중복 채점 방지)
- 시각 디자인 품질(대비·여백·타이포·위계): /design-review 결과 참조 — 여기선 재채점 X
- 코드/성능 자동검사: /code-review·tsc 통과 (v0.9.6) 참조
- 비고: renderCheckpointKpi/renderTriggers/renderActiveFile/shortPath는 현재 미사용(dead code) — 코드 품질 항목, /code-review 영역
