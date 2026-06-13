# Changelog

모든 주목할 만한 변경사항은 이 파일에 기록됩니다.

형식: [Keep a Changelog](https://keepachangelog.com/) + [Semantic Versioning](https://semver.org/).

## [0.14.0] — 2026-06-12

### Changed (완결성 — 문서 동기화 + 품질/접근성)
- **문서 드리프트 정리** — README(6탭·v0.13+·Preview=갤러리), CHANGELOG(0.12/0.13), ARCHITECTURE(폴더 레이아웃 실제화·`Phase` 동적 계약·통신방식)·**ADR-018**(이벤트버스→orchestrator 직접호출 정합), roadmap 재번호(INQUIRY P0 + state.md 일치).
- **활성 phase 헬퍼 통일** — `getActivePhase`/`getActivePhaseOrNull` + 공유 `incompletePhaseItems`를 `types.ts`로 모아 plan/sidebar/extension가 재사용(중복 제거).

### Added (접근성 · 사이드바)
- **사이드바 phase 행 키보드 접근** — `role=button`+`tabindex`+Enter/Space 활성화, `:focus-visible` 아웃라인, hover/focus 시 클릭 chevron(affordance).
- **사이드바 CURRENT FOCUS 미결 배지** — 현재 phase의 roadmap 미완 항목 수를 "미결 N" 배지로(Plan 탭 배너와 동일 신호).
- 하네스 +4단언 → **175/175 PASS**.

## [0.13.0] — 2026-06-12

### Added (Guide 탭 · Plan 요약/미결 게이트 · DESIGN 3축)
- **Guide 탭 신설** (ADR-017, Errors 오른쪽) — blueprint 기능·사용법·**INQUIRY→POST-SHIP 단계별 설명·변경이력**을 도구 내장 문서로. 파이프라인은 좌측 세로 박스 스테퍼(+소프트 게이트) / 우측 상세, 단계 클릭 시 상세 전환(webview JS). "단방향 .md→UI" 원칙의 명시적 예외(프로젝트 데이터가 아닌 도구 문서).
- **Plan 탭 "지금 만드는 것" 칸** — PRODUCT.md One-liner(없으면 INQUIRY 문제)에서 추출해 *빌딩 중인 프로젝트*를 한 줄 표시. 기존 도구 설명용 메타 블록은 제거.
- **미결 항목 게이트** — 현재 phase의 `roadmap.md` 체크리스트 `- [ ]` 미완 항목을 Plan 탭에 경고 배너로 집계. blueprint 스킬은 phase 전환 직전 미결 항목을 모아 "정하기/건너뛰기" 질의.
- **DESIGN 단계 3축 상세화** (blueprint 스킬) — 기능·UX플로우·화면 3축으로 하위 항목 정의 → 집중 질의 → 플로우순 시안.
- 하네스 153→**171 단언, 171/171 PASS**.

## [0.12.0] — 2026-06-12

### Added (Phase 0 INQUIRY 연동)
- **Phase 0 INQUIRY 대시보드 연동** — Spec 탭에 `docs/INQUIRY.md` 폴더(PRODUCT 앞) 표시. phase 이름 `INQUIRY` 매핑 + 파일워처 배선(`spec.ts`/`panel.ts`/`extension.ts`). 사이드바 PHASES는 state.md 동적 파싱이라 추가 없이 P0 INQUIRY 렌더.
- **Preview 라이브갱신 빈틈 수정** — `docs/design/` 하위 어느 폴더든(`screenshots/` 외 `redesign/` 등) `.html` 저장 시 갤러리 즉시 갱신.
- blueprint 스킬 v2(별도 repo): Phase 0 INQUIRY 신설(리서치 기반 발견) + 전체 phase +1 재번호 + RESUME 자동 백필.

## [0.11.0] — 2026-06-11

### Added (BUILD TARGET 2축 — runtime/dist + Phase 0 인터뷰)
- **BUILD TARGET 2축 확장** — type(무엇을)에 더해 `run`(실행: F5 dev/npm/정적 호스팅 …)·`dist`(배포: Marketplace/GitHub Releases …)·`confidence`(locked/tentative) 명시 필드 지원. 배지 pill은 type, 상세는 tooltip. `tentative`면 점선 테두리 + `?` 마커(FEASIBILITY 재검토 신호).
- **`/blueprint` Phase 0 TARGET 서브-인터뷰 신설** (ADR-016, blueprint 메타스킬) — PRODUCT 직후 "무엇을 만드나(artifact) + 어떻게 실행·배포(runtime/dist)"를 4~6문 분기로 캐물어 `## Build target` 슬롯을 채움. 대시보드 어휘(`build-target.ts` 레지스트리)와 동일 키 사용 → 인터뷰 답 == 자동감지 키. state.md/PRODUCT 템플릿에 슬롯 추가.
- 하네스 +5단언(run/dist/confidence 파싱·보존, 빈 슬롯 fallback) → 137→**142개 단언, 142/142 PASS**.
- 이 repo state.md에 `## Build target` 명시(dogfood) → 배지가 explicit 소스로 표시.

## [0.10.0] — 2026-06-10

### Added (BUILD TARGET 상시 표시 — ADR-016)
- **사이드바 Hero에 BUILD TARGET 배지** — 폴더 경로 아래·phase 위에 "이 프로젝트가 무슨 형태를 만드는지"를 클릭 0으로 상시 표시. 아이콘+라벨: 🌐 Website · 📦 VS Code Extension · 🖥️ Tauri · ⚛️ Electron · 📱 Mobile · 🔧 CLI · 📚 Library.
- **하이브리드 데이터 소스** — ① `.blueprint/state.md`에 `## Build target`(`- type:`, `- stack:`) 명시하면 우선, ② 없으면 `package.json`(engines.vscode/contributes/deps)·`tauri.conf.json`·`index.html` 등으로 **자동 감지**(설정 0), ③ 둘 다 없으면 미표시. 명시 type은 별칭 정규화(`vsix`→VS Code Extension, `homepage`→Website, `native`→Tauri 등).
- **`detectBuildTarget()` / `explicitBuildTarget()`** — vscode/fs 비의존 순수 함수(`src/parser/build-target.ts`), 시그널 수집만 extension이 담당. 하네스 20단언. 117→**137개 단언, 137/137 PASS**.

## [0.9.9] — 2026-06-10

### Added (JTBD5 — DESIGN TOKENS 패널)
- **Preview 탭 상단에 DESIGN TOKENS 패널** — DESIGN.md의 hex/rgba 색상과 폰트 family를 자동 추출해 색 스와치(용도 라벨 포함) + 폰트 샘플로 렌더. DESIGN.md §자동시각화가 명세했던 "색 swatch 자동 삽입 + 폰트 family 자동 샘플"의 구현. 실제 DESIGN.md에서 13색·Pretendard 추출.
  - 반투명/투명 색은 체커 배경 위에 표시(가시성), 표 행의 '용도' 컬럼을 라벨로.
  - 본문 설명용 `rgba(...)` 텍스트 오탐 방지(괄호 안 숫자 필수).
- **`extractDesignTokens()`** — vscode 비의존 순수 함수(`src/webview/design-tokens.ts`)로 분리, 하네스 18단언 커버. 100→**117개 단언, 117/117 PASS**.

### Fixed
- FEASIBILITY 사후검증의 마지막 ⚠️(JTBD5 자동 swatch 미구현) 해소 → **전 JTBD ✅(5/5)**.

## [0.9.8] — 2026-06-10

### Added (Phase 0.5 FEASIBILITY + JTBD3 활동바 배지)
- **Phase 0.5 FEASIBILITY 사후 검증** — `docs/FEASIBILITY.md` 작성(템플릿→실측). PRODUCT.md의 JTBD 5개를 구현 대조해 ✅/⚠️/❌ 판정. 명세-구현 간극 2건 발견(JTBD3 배지 미배선, JTBD5 자동 swatch 미구현).
- **JTBD3 활동바 배지 배선** — checkpoint 트리거 발동 시 활동바 Blueprint 아이콘에 숫자 배지. `computeTriggerBadge()`(types.ts, vscode 비의존 순수 함수) → `SidebarViewProvider.updateBadge()`가 `view.badge` 설정. 트리거 ≥1 && quiet 아님 → 배지, 0건/quiet → 해제. 사이드바를 열지 않아도 알림이 보이는 게 본질(명세 충족).
- **QA 하네스 +7단언** — 활동바 배지 6단언 + FEASIBILITY done 검증. 93→**100개 단언, 100/100 PASS**.

## [0.9.7] — 2026-06-10

### Added (QA 탭 + QA phase)
- **가운데 webview에 QA 탭 신설** (Preview↔Errors 사이, ADR-014). `docs/qa.report.md`를 단방향 렌더 — 상단 PASS/WARN/FAIL 요약 바 + verdict + 섹션별 체크리스트. extension은 QA를 실행하지 않고 결과만 시각화 (ADR-002 유지).
- **노션식 접이식 토글** — 각 섹션을 클릭해 펼침/접힘(셰브론 ▸→▾). FAIL/WARN 섹션은 자동 펼침, 전부 PASS면 접힘. 상단 전체 펼치기/접기, 섹션별 `N FAIL`·`M WARN` 칩, `aria-expanded`.
- **QA를 Phase 4.7로 파이프라인·사이드바 PHASES에 추가** (ADR-015). UX-REVIEW(4.5)↔SHIP(5) 사이 최종 검증 게이트. ADR-012 동적 리스트라 state.md 한 줄로 반영.
- **재실행 가능 QA 하네스** `test/qa-harness.ts` (`npm run qa`) — 파서 + 5개 페이지 렌더러를 실제 파일로 구동, 93개 단언, exit 0/1로 CI 게이트화.

### Fixed
- **사이드바 QA phase 클릭 시 Spec이 아니라 QA 탭으로 이동** — phase 클릭이 무조건 Spec으로 가던 라우팅을 name별 분기로 수정 (QA→QA탭).
- **패키지 위생** — `.qa-tmp/`·`test/`·`DIGEST.md`·`CLAUDE.md`·`HISTORY.md`가 .vsix에 섞이던 누출을 `.vscodeignore`로 차단 (10 files).

## [0.9.6] — 2026-06-07

### Added (Phase 4.5 UX-REVIEW — 제품·UX 품질 게이트)
- **Phase 4.5 — UX-REVIEW 단계 신설** (ADR-013). REVIEW(코드)↔SHIP 사이에 **제품·사용성 품질** 게이트 추가. 엔지니어링 품질(gstack `/code-review`·`/qa`)과 대칭으로, "이 제품이 잘 쓰이게 만들어졌나"를 차원별 0~10 채점 → `docs/UX-QUALITY.md`.
  - 핵심 루브릭 8차원: 사용자 여정·인지부하·일관성(IA)·피드백/가시성·오류복구·기능 연계·접근성·첫 사용 경험.
  - **다중사용자 섹션 (조건부)**: 다중사용자 앱이면 동시성·권한·알림 전파·충돌 해결·소셜 다이내믹을 시나리오 워크스루로 점검. 단일 사용자 앱이면 N/A로 접음.
  - 채점은 Claude 자가채점 + 시각 품질은 `/design-review` 위임(중복 채점 방지). soft gate — 점수 낮아도 차단 안 함.
- **Spec 탭에 UX-QUALITY.md 폴더 추가** — 사이드바 Phase 4.5 클릭 시 가운데 webview에 렌더. ADR-012 동적 phase 덕에 parser는 코드 변경 없이 `Phase 4.5`를 4와 5 사이로 자동 수용 (설계 효과 검증됨).

## [0.9.5] — 2026-06-05

### Added (Phase 0.5 FEASIBILITY + 동적 phase)
- **Phase 0.5 — FEASIBILITY 단계 신설** (ADR-011). PRODUCT↔DESIGN 사이에 실현가능성·의존성 검증 단계 추가. 각 JBT가 "구현 가능한가 / 무엇이 필요한가 / 근거는?"을 `docs/FEASIBILITY.md`에 ✅/⚠️/❌로 기록. **불확실한 것만 웹서칭**, ❌여도 차단 안 함(soft gate). `/blueprint` 스킬 + 템플릿에 반영.
- **Spec 탭에 FEASIBILITY.md 폴더 추가** — 사이드바 Phase 0.5 클릭 시 가운데 webview에 FEASIBILITY 섹션 렌더.

### Changed (동적 phase 리스트 — ADR-012)
- **phase 식별자를 정수 union → key(문자열) + order(숫자)로 분리.** `PhaseId`(0~6)·`PHASE_NAMES` 상수 폐기. parser가 `Phase 0.5: FEASIBILITY` 같은 **소수 phase**를 인식 (정규식 `\d+(?:\.\d+)?`), 0~6 하드코딩 매핑/누락보강 루프 삭제. 앞으로 phase 추가·재배열이 **state.md 수정만으로** 사이드바·webview에 자동 반영.
- 산출물 매핑을 phase **name 기반**으로 전환 (PRODUCT/FEASIBILITY/DESIGN/ARCHITECTURE → 각 .md).

## [0.9.4] — 2026-05-30

### Changed (디자인 리디자인 — 안 A "iOS Settings")
- **글래스 → 플랫 iOS Settings 룩 전면 교체**. 5색 blob 배경·backdrop-filter blur·`::before` sheen·핑크 NON-GOALS 그라데 제거 → `#f2f2f7` 그룹 배경 + 흰 카드 + 1px 헤어라인 + 약한 그림자. 사이드바·webview 양쪽 CSS 말미에 "안 A 플랫 스킨" override 블록.
- **Pretendard 폰트 번들** — `out/fonts/PretendardVariable.woff2` (2MB) 동봉. `@font-face` + `font-src` CSP + `out/fonts` localResourceRoot. Windows에서도 SF Pro급 또렷함, CDN 의존 없음.
- **monospace 전면 폐지** — hex·파일경로·카운터까지 전부 Pretendard로 통일 (`var(--vscode-editor-font-family)` → `var(--font)`). 숫자는 `tabular-nums`.
- **accent 팔레트 iOS화** — `#0066cc → #007aff` (systemBlue), `#d70015 → #ff3b30` (systemRed), rgba 변형 포함.
- DESIGN.md 디자인 철학·색·타이포·입체감 섹션 갱신.

## [0.9.3] — 2026-05-30

### Fixed (진짜 root cause)
- **사이드바 progress bar 안 차오름** — CSP의 `style-src`에 `'unsafe-inline'` 누락. `<div style="width: X%">` 인라인 스타일이 CSP로 BLOCK되어 fill width가 0이었음. *10번 말해도 안 고쳐진 진짜 이유*. webview panel은 이미 `'unsafe-inline'` 있어서 정상 작동했지만 사이드바만 누락. 추가 후 즉시 해결.

### Changed
- **디자인 시안을 Preview 탭으로 통합 + 카테고리별 자동 분류**:
  - 사이드바 / Plan / Spec / Preview / Errors / Mockups (검증 단계) / 기타 — 7개 카테고리
  - 파일명 prefix 기반 자동 분류 (예: `webview-spec-*.html` → Spec 카테고리)
  - 각 카테고리는 글래스 헤더 + 카운트 배지 + 그 아래 카드 그리드
- **DESIGN.md `## 디자인 시안` 섹션 축약** — 시안 link list 제거, Preview 탭 안내로 대체. Spec/DESIGN 페이지에서 빈 placeholder 카드 더 이상 안 보임.

## [0.9.2] — 2026-05-30

### Fixed
- **Progress bar 100% 안 차오름** — `progressFillStyle()`에서 `percent >= 100` 명시적 분기 추가. width: 100% + background-size: 100% 100% 단순 박음. sidebar + Plan hero 둘 다 적용.

### Changed
- **DESIGN.md `## 디자인 시안` 섹션이 Preview 처럼 큰 카드 그리드로 표시**. `transformDesignGallery()` 확장 — 이전엔 `h3 + p>img` 패턴만 매칭. 이제 `ul > li > a[href$=.html]` 패턴도 매칭해서 큰 카드로 변환:
  - 큰 컬러 그라데이션 placeholder + 🎨 아이콘 + HTML 배지
  - 라벨 = 시안 이름, 그 아래 모노스페이스 파일명
  - 카드 클릭 → .html 파일 직접 열기
- 결과: Spec/DESIGN 페이지의 디자인 시안 섹션이 노이즈 list 대신 시각 갤러리.

## [0.9.1] — 2026-05-30

### Changed (`/blueprint` 스킬)
- **디자인 시안 승인 루프** Phase 1 안의 *필수 sub-step* 으로 박음:
  1. Claude가 시안 2~3개 HTML 생성 → `docs/design/screenshots/{화면-id}-mockup-{N}-{스타일}.html`
  2. 사용자에게 "Spec → design/screenshots/ 큰 카드 / Preview에서 확인 후 채택안 알려주세요" 안내
  3. 채택안 파일명에 `-ADOPTED` 추가 또는 DESIGN.md `## 디자인 시안` 섹션에 ✓ 표시
  4. **Hard gate**: 채택 시안 없이 Phase 3 IMPLEMENT의 해당 UI 작업 진입 금지
- Phase 3 IMPLEMENT 진입 hard gate에 *"해당 화면 채택 시안 존재"* 추가.

### Notes
- 이 룰로 *추측 구현* 차단. 시안 → 사용자 결정 → 구현으로 책임 명확.
- 사용자 의도가 자연어로만 흘러서 추측되는 게 아니라 *시안 단계에서 확정*.

## [0.9.0] — 2026-05-30

### Added
- **6개 디자인 시안 HTML 완성** (총 7개 — sidebar 포함):
  - `webview-plan.html` — Plan 페이지 (roadmap + progress bar)
  - `webview-spec-product.html` — Spec/PRODUCT (NON-GOALS 빨간 ✗ grid)
  - `webview-spec-design.html` — Spec/DESIGN (색 swatch 표)
  - `webview-spec-architecture.html` — Spec/ARCHITECTURE (도메인 맵 카드)
  - `webview-preview.html` — Preview (큰 카드 그리드)
  - `webview-errors.html` — Errors (에러 히스토리)
- DESIGN.md `## 디자인 시안` 섹션: img placeholder → .html 링크 list로 교체. 진짜 미리보기는 Spec → `design/screenshots/` 폴더 큰 카드에서.

### Changed (`/blueprint` 스킬)
- Phase 4 REVIEW **자동 호출 룰** 박음:
  - SHIP 진입 시도 시 자동 차단 + REVIEW 먼저
  - git diff 100줄+ 변경 감지 시 알림
  - 결과 `docs/reviews/{YYYY-MM-DD}-code-review.md` 저장
  - 영향있는 결정은 ADR-{NNN} 새로 작성
- **Hard gate**: SHIP 진입 시 `docs/reviews/` 최근 30일 내 review 없으면 차단.

## [0.8.0] — 2026-05-30

### Removed (사이드바 정보 위계 정리)
- **TRIGGERS 카드** — REVIEW phase가 trigger 역할 흡수.
- **ACTIVE FILE 카드** — 코드 편집 아닌 webview 위주 워크플로엔 노이즈.
- **CHECKPOINTS KPI 카드** — v0.5의 REVIEW phase가 같은 역할. ADR-009 흔적 제거.

### Changed
- **사이드바 4섹션**으로 정리: Hero / PHASES / CURRENT FOCUS / RECENT CHANGES
- **RECENT CHANGES 라벨 의미화** — `src/webview/styles.css` → 💅 webview 스타일, `docs/PRODUCT.md` → 📋 PRODUCT 명세 등. 25개 카테고리 매핑.
- **임시 파일 필터** — `.tmp.XX`, `.swp`, `.map`, `out/`, `node_modules/`, `.git/`, `*.vsix` 등 변경 무시.
- 같은 카테고리는 가장 최근만 표시 (dedup).
- state.md `## Next action` 추상화 권고 — 디테일한 sub-task가 아닌 *현재 작업 영역*으로.

## [0.7.0] — 2026-05-30

### Added
- **Preview/Spec 그리드 카드에 진짜 iframe 썸네일** — `srcdoc` + `transform: scale(0.3125)` + `pointer-events: none` + click-shield 오버레이. Windows 탐색기 풍 큰 아이콘이 *실제 콘텐츠 미리보기*로 동작.
- **`docs/design/screenshots/sidebar.html`** — 우리 사이드바의 실제 모습을 재현한 정적 HTML 시안 (Notion + Apple 글래스 풍, 컬러 blob 배경, Hero + Phases + Current focus).
- DESIGN.md의 `### Sidebar` placeholder를 `.html`로 교체 (Spec → DESIGN → 디자인 시안에서 클릭 미리보기).

### Changed
- `PreviewDesignFile` 타입에 `content` 필드 추가. `reloadDesignFiles` 가 .html content 같이 읽음 (`collectHtmlFilesDeep`).
- 기존 placeholder 그라데이션 카드는 `content == null` 폴백으로 유지.

### Notes
- 나머지 6개 시안 HTML (webview-plan, spec-product/design/architecture, preview, errors)은 v0.8+.
- 사이드바 3섹션 (CHECKPOINTS/TRIGGERS/ACTIVE FILE) 조건부 표시는 사용자 결정 후 별도 ship.

## [0.6.0] — 2026-05-30

### Added (Spec 트리 확장)
- **adr/ 폴더** 트리에 자동 표시 — `docs/adr/*.md` 파일들 listing. 각 파일을 클릭하면 우측에 풀-너비 마크다운 렌더 (📜 아이콘).
- **design/screenshots/ 폴더** 트리에 자동 표시 — 폴더 자체 클릭 시 우측에 *큰 아이콘 그리드* (Windows 탐색기 풍, 색깔 그라데이션 placeholder + 파일명).
- 그리드 카드 클릭 → 그 자리(Spec 페이지 내부)에서 iframe srcdoc 미리보기. "← 그리드로" 버튼으로 복귀.
- file-watcher: `docs/adr/*.md` 변경 시 Spec extras 자동 reload.

### Changed
- `SpecArtifacts` 타입에 `adrFiles`, `designHtmlFiles` (각 파일에 content 포함) 필드 추가.
- `SpecFolderKey` 에 `adr`, `design-gallery` 추가 (Phase 7개와 무관 — Spec UI 내부 enum).
- `extension.ts`: `reloadSpecExtras` — adr/ + design/screenshots/ 파일 listing 수집 (content 포함, lazy 아님).

## [0.5.0] — 2026-05-30

### Changed (Breaking schema)
- **Phase 7개로 복귀** — `PRODUCT / DESIGN / ARCHITECTURE / IMPLEMENT / **REVIEW** / SHIP / POST-SHIP`. REVIEW가 IMPLEMENT와 SHIP 사이 정식 phase. ADR-010.
- `parser/state.ts` 호환 매핑 — v0.1 / v0.2~v0.4 / v0.5 schema 다 인식.

### Added
- **Preview 페이지 큰 아이콘 그리드** — Windows 탐색기 풍. 색깔 그라데이션 placeholder + 파일명 + 경로. 클릭하면 풀-너비 viewer. "← 그리드로" 버튼으로 복귀.

### Notes
- /blueprint 스킬의 Phase 4 REVIEW 자동 호출 룰은 별도 작업 (다음 버전).
- 진짜 썸네일 (iframe srcdoc scaled)은 V0.6에서.

## [0.4.0] — 2026-05-30

### Changed (Major UX)
- **Spec 페이지 완전 재구조** — 단순 탭 전환 → **폴더 탐색기 풍** (시안 1 채택).
  - 좌측: 트리 (PRODUCT/DESIGN/ARCHITECTURE 폴더 → 각 ## 섹션을 file로)
  - 우측: 선택한 섹션 풀-너비 마크다운 렌더 (## 카드 변환 안 함 — 이미 섹션 단위)
  - 클릭 → postMessage('spec-select') → panel이 active 갱신 → refresh
  - 폴더 토글은 클라이언트 측 DOM (서버 round-trip 없음)
- 섹션 아이콘 자동 매핑: NON-GOALS=🚫, 색=🎨, 타이포=🔤, 디자인 시안=🖼️, Stack=⚙️, Domain map=🗺️, Performance=⚡, ADR=📋

### Added
- `shared.ts` — `extractSections`, `renderMarkdownSection` (## 카드 변환 제외 버전), `MarkdownSection` 타입

### Files updated
- `src/webview/pages/spec.ts` (완전 재작성)
- `src/webview/panel.ts` (specActive 상태, spec-select 메시지 처리)
- `src/webview/styles.css` (`.spec-explorer`, `.spec-tree-pane`, `.spec-row` 등)

## [0.3.0] — 2026-05-24

### Added
- **Preview 페이지 자동 listing**: 좌측에 `docs/design/**/*.html` 파일들 자동 표시. 클릭으로 미리보기. 채팅 명령 (`프리뷰에 X 띄와봐`)도 그대로 동작.
- **시안 3개** 추가: `docs/design/screenshots/spec-mockup-{1-explorer,2-notion,3-columns}.html` — Spec 페이지 폴더 탐색기 UX 시안.

### Changed
- `setPreviewContent(html, sourcePath, autoSwitch)` — 사이드 클릭 시 탭 전환 없이 콘텐츠만 교체. 채팅 명령 시엔 자동 탭 전환.
- file-watcher: `docs/design/**/*.html` 변경 시 design files listing도 자동 reload.

## [0.2.0] — 2026-05-24

### Changed (Breaking)
- **CHECKPOINT를 phase 리스트에서 제외** — phase 7개 → 6개 (PRODUCT/DESIGN/ARCHITECTURE/IMPLEMENT/SHIP/POST-SHIP). ADR-009.
- 사이드바에 **별도 CHECKPOINTS KPI 카드** — runs / ships since / last check. `ships_since_checkpoint >= 5`면 빨간 카드로 점검 알림.
- 진행도 계산 = 6개 phase 기준 (이전 7개).

### Added
- ADR-009 (CHECKPOINT as KPI)
- `parser/state.ts`에 옛 7-phase state.md 호환 매핑 (Phase 5/6 → 4/5 자동 변환)

### Files updated
- `src/types.ts`, `src/parser/state.ts`, `src/sidebar/*`, `src/webview/panel.ts`
- `.blueprint/state.md`, `~/.claude/skills/blueprint/templates/state.md.tmpl`

## [0.1.0] — 2026-05-24

V0+ 첫 정식 출시. Antigravity에서 사용자 본인 dogfooding 완료.

### Added
- **사이드바 (WebviewView 기반)** — 6섹션: Hero(폴더 경로 + 현재 phase + progress), Phases 7-row, Current focus, Triggers, Active file, Recent changes
- **가운데 webview — 4페이지 멀티탭**:
  - Plan — `plans/roadmap.md` 풀-너비 + state.md 현재 위치 강조
  - Spec — PRODUCT/DESIGN/ARCHITECTURE.md (탭 전환 형태, 스크롤 X)
  - Preview — Claude `blueprint.preview` 명령으로 push한 HTML (1개만)
  - Errors — `docs/error.history.md` 풀-너비 (없으면 생성 버튼)
- **마크다운 자동 가공**: hex/rgba 색 자동 swatch, NON-GOALS 빨간 ✗ grid, ## 헤딩 글래스 카드, 디자인 시안 자동 그리드 (placeholder 포함)
- **File watcher** — `.blueprint/state.md`, `docs/**/*.md`, `docs/design/screenshots/**/*.{png,jpg,...}`, `plans/**/*.md`, `src/**/*` 자동 감지 + debounce 200ms
- **명령 3개**: `blueprint.showDashboard`, `blueprint.refresh`, `blueprint.preview`
- **디자인 시스템**: Notion + Apple 글래스 풍 (컬러 blob 배경 + backdrop-filter blur + Apple 색 + iOS progress 그라데이션)

### Architecture
- TypeScript + esbuild + markdown-it + VS Code Extension API
- 도메인 5개: parser / file-watcher / sidebar / webview / extension
- 단방향 데이터 흐름 (.md → UI), AI 호출 0
- ADR-001~008 박음

### Known limitations
- Antigravity 채팅이 첫 Editor Group을 차지 → webview는 사용자 시점 오른쪽 default. 드래그로 위치 자유 조정.
- 자동 가공이 HTML 정규식 후처리 — 마크다운 구조가 예상과 다르면 미동작. V1에서 markdown-it 토큰 처리 검토.
- 디자인 시안 (`docs/design/screenshots/`) 폴더 빈 상태. 사용자가 직접 캡처 저장 필요.

[0.1.0]: https://github.com/snu9026-Chris/SERVICE-PLANNING/releases/tag/v0.1.0
