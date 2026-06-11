# DIGEST — 대시보드 확장 프로그램

## 2026-06-11 (gstack 0.14→1.57 업그레이드, 비파괴)
- gstack global-git 설치를 0.14.4.0 → **1.57.10.0** 업그레이드(git reset+setup). 로컬 변경 0, blueprint 백업(`~/.gstack/backups/blueprint-20260611-170821`).
- **우리 커스텀 전부 생존**: blueprint Phase 0 TARGET 인터뷰(분리 스킬), jargon/HISTORY hook(작동 확인), 위임 스킬 12종 존재. BREAKING 변경은 전부 우리 무관(gbrain/iOS/CI 미사용).
- 판단: 1.57 신규 **codex_reviews default-on은 enabled 유지** — 이 프로젝트가 리뷰 게이트를 늘리는 정체성이라 일관. 끄려면 `~/.gstack/config.yaml`에 `codex_reviews: disabled`.
- plan-tune cathedral hooks 미설치 유지(우리 hook 철학). 로컬 vendored 사본 없음. 이 repo 코드는 gstack 비의존 — 영향 0.

## 2026-06-11 (Phase 0 TARGET 인터뷰 + BUILD TARGET 2축 — v0.11.0)
- 사용자 의문 2개 점검: ①"초반에 뭘 만들지/vsix vs F5 물어보는 세션 필요하지 않나" ②"blueprint vs 상세명세 직접 부탁, 견고성 차이 진짜 있나". → /office-hours로 설계.
- 핵심 결론(솔직): 견고성은 blueprint 의식이 아니라 **하네스+tsc+순수함수**에서 나옴. blueprint가 더하는 건 영속성·provenance(ADR)·게이트·드리프트감지(이번 FEASIBILITY가 JTBD3/5 간극 잡은 게 증거). 갈리는 변수 = 시간지평×반복. 일회성→상세명세, 장수명→blueprint amortize.
- 구현(결정 A): **blueprint 스킬 Phase 0에 TARGET 서브-인터뷰 신설** — 2축(artifact type + runtime/dist) 4~6문 분기 → `## Build target` 슬롯(state.md/PRODUCT 템플릿). 대시보드 `build-target.ts` 어휘 재사용.
- 대시보드: BuildTarget에 run/dist/confidence 2축 확장, 배지 tooltip 노출, tentative 점선+? 마커. 이 repo state.md에 명시 dogfood → 배지 explicit. 하네스 143/143, tsc 0. 패키지 **0.11.0.vsix**. 설계문서 ~/.gstack/projects/.../snu90-main-design-20260611.md.
- 다음: 0.11.0 설치+리로드 → 배지 explicit + run/dist tooltip 실측. (gstack 1.57 업그레이드 보류 중)

## 2026-06-10 (BUILD TARGET 상시 표시 — v0.10.0, ADR-016)
- 사용자: "만드는 파일 형태(웹/vsix/Tauri/Electron)를 어디 큼지막하게 바로 알려줘야 하는 거 아닌가? phase 위 상시표시 좋아보임" → 맞는 지적(현재 어디에도 글랜서블 표시 없음). **구현**.
- 사이드바 Hero phase 위에 BUILD TARGET 배지(아이콘+라벨). **하이브리드**: state.md `## Build target` 명시 우선 → 없으면 package.json/tauri.conf/index.html 자동감지 → 둘 다 없으면 미표시. 이 프로젝트는 자동감지로 📦 VS Code Extension.
- 레이어: 타입(types.ts, 의존성0) / 순수 로직(parser/build-target.ts, detect+explicit+별칭정규화) / fs 시그널 수집(extension.ts) / Hero 렌더(sidebar). 새 도메인 아님(parser 귀속).
- ADR-016 작성. 하네스 20단언 → **137/137 PASS**, tsc 0. state.md 50줄 초과라 옛 Decisions 압축 + stale nextAction 갱신. ARCHITECTURE 데이터계약 보강. 패키지 **0.10.0.vsix**.
- 다음: 사용자 0.10.0 설치+리로드 → Hero에서 📦 배지 실측. (홈페이지 프로젝트는 🌐 Website 자동감지될 것)

## 2026-06-10 (JTBD5 DESIGN TOKENS 패널 — v0.9.9)
- 사용자가 "스와치 구현됐는지 알 수가 없다" → 실제 안 돼 있었음(Preview는 갤러리만). **결정 A로 구현**.
- `extractDesignTokens()`(design-tokens.ts, 순수, vscode 비의존) → Preview 탭 상단 **DESIGN TOKENS** 패널(색 스와치+용도 라벨+폰트 샘플). DESIGN.md §자동시각화가 원래 명세했던 기능. 실측 13색·Pretendard 추출.
- 오탐 1건 잡음: 본문 `rgba(...)` 설명 텍스트가 색으로 잡히던 것(정규식 점 허용) → 괄호 안 숫자 필수로 차단. 하네스 18단언 추가 → **117/117 PASS**, tsc 0.
- FEASIBILITY **5/5 ✅, 간극 0**. 사후검증이 잡은 JTBD3·JTBD5 두 간극 모두 해소. 패키지 **0.9.9.vsix**.
- 다음: 사용자 0.9.9 설치+리로드 → Preview 탭에서 DESIGN TOKENS 패널 실측.

## 2026-06-10 (JTBD3 활동바 배지 배선 — v0.9.8)
- FEASIBILITY가 잡은 JTBD3 간극(활동바 빨간점 배지 미배선)을 **결정 A로 구현**. `computeTriggerBadge()`(types.ts, 순수, vscode 비의존) + `SidebarViewProvider.updateBadge()`→`view.badge`. 트리거 ≥1 && not quiet → 숫자 배지, 0건/quiet → 해제. `WebviewView.badge` API는 ^1.80에 정식 존재(tsc 0 확인).
- 순수 함수로 뺀 덕에 하네스로 검증 가능 — 배지 6단언 추가. FEASIBILITY done 단언도 갱신(옛 pending 단언이 FAIL 뜬 것 수정). **100/100 PASS**, tsc 0, build OK.
- 문서 정합: FEASIBILITY JTBD3 ⚠️→✅(4/5✅), qa.report.md 100단언+배지 섹션, CHANGELOG 0.9.8, state.md decisions. 패키지 **0.9.8.vsix (10 files)**.
- 다음: 사용자가 0.9.8 설치+리로드 → 트리거 발동 상태에서 활동바 배지 실측. (현재 state.md 트리거 empty라 배지 안 뜨는 게 정상 — 트리거 fired시 확인)

## 2026-06-10 (QA 재실측 + Phase 0.5 FEASIBILITY)
- **QA 재실행**: `npm run qa` 93/93 PASS·WARN0·FAIL0·exit0, `tsc --noEmit` 에러0. 단 한계 = Extension Host 런타임(activation/watch 실발화)은 헤드리스 불가 → F5 dogfooding은 여전히 사용자 몫.
- **Phase 0.5 FEASIBILITY 사후 검증 완료** (template→작성, placeholder 제거). JTBD 5개: ✅3(1,2,4)/⚠️2/❌0. 발견 → JTBD3 활동바 빨간점 배지 *미배선*(`.badge=` 전무, 사이드바 텍스트 섹션만, 그마저 제거 검토 중), JTBD5 DESIGN.md 자동 swatch *미구현*(갤러리 listing만). 둘 다 기술 가능, 구현 결정만 남음.
- state.md Phase 0.5 [x] 처리, Decisions log·ADR 정합. 권고: JTBD3 배지 배선을 다음 작업 1순위로.
- 다음: 사용자가 JTBD3 배지(A: 배선 / B: 명세 하향) 결정 → 그 후 구현.

## 2026-06-10 (v0.9.7 패키징)
- 사용자가 우측 QA 탭이 안 보인다고 지적 → 원인은 **옛 빌드 실행 중**(사이드바 phase는 데이터라 즉시 반영, 탭은 컴파일 코드라 재설치 필요). 코드는 0.9.6에서 이미 완료됨을 산출물 grep으로 확인.
- **버전 0.9.6→0.9.7 범프** — 동일 버전 .vsix 재설치 거부 문제 회피. blueprint-dashboard-0.9.7.vsix (10 files).
- **수정**: 사이드바 QA phase 클릭이 Spec으로 가던 것 → QA 탭으로 라우팅 (showArtifact name 분기). 하네스 93/93.
- 다음: 사용자가 0.9.7 설치+리로드 후 5탭/QA 토글 실측.

## 2026-06-09 19:10
- QA를 **Phase 4.7**로 파이프라인·사이드바 PHASES에 정식 추가 (UX-REVIEW 4.5 ↔ SHIP 5, ADR-015). state.md/roadmap.md 반영, 파서 4.7 정상.
- QA 탭을 **노션식 접이식 토글**로 — 섹션 클릭 펼침, FAIL/WARN 자동 펼침, 셰브론·전체 펼치기/접기·aria. 하네스 **93/93 PASS**.
- 패키징 위생: DIGEST/CLAUDE/HISTORY.md .vsix 누출 → .vscodeignore 제외 (최종 10 files). .qa-tmp 누출은 지난 턴에 처리.
- 다음: F5 디버그로 5탭 dogfooding. 빌드는 blueprint-dashboard-0.9.6.vsix에 반영됨(리로드 필요).

## 2026-06-09 18:30
- webview에 **QA 탭** 신설 (Preview↔Errors 사이). `docs/qa.report.md` 단방향 렌더 — PASS/WARN/FAIL 요약 바 + verdict + 섹션별 체크리스트 + 탭 배지(fail빨강/warn주황/clean초록).
- 재실행 가능 QA 하네스 `test/qa-harness.ts` (`npm run qa`) — 파서+5탭 렌더러 실측. 전수 QA: tsc/esbuild/vsce 통과, `.qa-tmp` 패키지 누출 발견·수정(.vscodeignore).
- ADR-014로 기록 (ADR-006 4→5탭 확장). ARCHITECTURE/state.md 갱신.
- 다음: F5 디버그로 QA 탭 dogfooding → 사이드바 정보 위계 정리 이어가기.
