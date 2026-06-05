# Changelog

모든 주목할 만한 변경사항은 이 파일에 기록됩니다.

형식: [Keep a Changelog](https://keepachangelog.com/) + [Semantic Versioning](https://semver.org/).

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
