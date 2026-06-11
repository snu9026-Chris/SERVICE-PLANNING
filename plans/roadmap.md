# Roadmap — 대시보드 확장 프로그램

> Phase별 sub-task 체크리스트. 가운데 webview의 **Plan 페이지**가 이 파일 풀-너비 렌더 + state.md 현재 phase와 연동해 현재 위치 강조.
>
> 체크박스는 .md 직접 수정으로만 변경 (단방향 .md → UI).

## Phase 0 — PRODUCT
- [x] One-liner
- [x] Target user (페르소나 1명)
- [x] Jobs-to-be-done (5개)
- [x] NON-GOALS (7개)
- [x] Success metric
- [x] Narrowest wedge (V0+)
- [x] APPROVED (2026-05-22)

## Phase 1 — DESIGN
- [x] Visual direction (Notion + Apple 글래스 풍)
- [x] Color / Typography / Spacing
- [x] V0+ webview visual spec
- [x] UI Composition Decisions (Sidebar 6섹션, Center 4페이지)
- [x] APPROVED (2026-05-22)

## Phase 2 — ARCHITECTURE
- [x] Stack: TypeScript + VS Code Extension API + markdown-it + esbuild
- [x] Domain map: parser / file-watcher / sidebar / webview / extension
- [x] Inter-domain rule: 이벤트 버스, 직접 import 금지
- [x] 단방향 .md → UI, AI 호출 없음
- [x] ADR-001~005 (TypeScript, AI 호출 X, 단방향, 이벤트 버스, generic mode V4)
- [x] Performance budget
- [x] APPROVED (2026-05-22)

## Phase 3 — IMPLEMENT
- [x] 단위 1: 빌드 셋업 (package.json, tsconfig, esbuild, .gitignore)
- [x] 단위 2: 코어 로직 (types, parser, watcher)
- [x] 단위 3: 사이드바 (TreeView → Webview 전환)
- [x] 단위 4: 웹뷰 V0 (panel, renderer, styles)
- [x] 단위 5: extension.ts orchestrator
- [x] 단위 6: 빌드 + .vsix 설치 검증
- [x] 단위 7: 사이드바 디자인 iteration (Notion + 글래스, 6섹션 재구조)
- [x] **단위 8: 가운데 webview 4페이지 멀티탭** (2026-05-24)
  - [x] 8a: roadmap.md + 블루프린트 스킬 템플릿 + DESIGN UI Composition
  - [x] 8b: panel.ts 멀티탭 재작성 (탭 라우팅)
  - [x] 8c: Plan 페이지 (roadmap.md + state.md 현재 위치)
  - [x] 8d: Spec 페이지 (PRODUCT/DESIGN/ARCH 풀-너비 + 색 swatch + ## 카드 가공)
  - [x] 8e: Preview 페이지 (Claude push HTML 명령)
  - [x] 8f: Errors 페이지 (error.history.md 렌더 / 없으면 생성)
  - [x] 8g: styles.css 4페이지 + 탭 시스템 + 글래스 카드
  - [x] 8h: extension.ts blueprint.preview 명령 + onCreateErrorHistory
  - [x] 8i: 빌드 + .vsix 재설치 + 사이드바/webview 동작 검증
- [x] 단위 9: 디자인 iteration — Notion + 글래스, 색 swatch, NON-GOALS grid, 디자인 시안 그리드, 이미지 placeholder (2026-05-24)

## Phase 4 — CHECKPOINT
- [x] /code-review 수동 실행 — unused 파일 2개 삭제 (tree-data-provider, renderer)
- [x] ADR-006~008 작성 (멀티탭 webview, 사이드바 webview 전환, 자동 가공)
- [x] checkpoint-2026-05-24.md 작성
- [x] ARCHITECTURE.md ADR log 갱신

## Phase 4.7 — QA (2026-06-09)
- [x] 빌드/컴파일 — tsc --noEmit 에러 0, esbuild 번들 OK
- [x] 파서 전수 — state.md → BlueprintState, 9 phase·status·counters·빈입력 회복성
- [x] Webview 5탭 렌더러 — Plan/Spec/Preview/QA/Errors 무결 (렌더 누출 0건)
- [x] QA 탭 자체 — PASS/WARN/FAIL 집계·verdict·노션식 접이식 토글
- [x] 패키징 — vsce package 성공, .qa-tmp 누출 발견·수정(.vscodeignore)
- [x] 재실행 하네스 — `npm run qa` (93/93 PASS, exit 0)
- [x] docs/qa.report.md 기록 → QA 탭 단방향 렌더
- [ ] (선택) Extension Host F5 dogfooding — webview 5탭 실측

## Phase 5 — SHIP (2026-05-24)
- [x] CHANGELOG.md 작성
- [x] package.json v0.0.1 → v0.1.0
- [x] /ship 수동 — 최종 .vsix 빌드 (blueprint-dashboard-0.1.0.vsix, 91KB)
- [x] git commit + push
- [x] git tag v0.1.0 + push tag
- [ ] (선택) GitHub Release 페이지 만들기 — https://github.com/snu9026-Chris/SERVICE-PLANNING/releases/new?tag=v0.1.0

## Phase 6 — POST-SHIP (2026-05-24 — 일부 Phase 5와 동시)
- [x] README.md v0.1.0 반영 (설치/사용/dev 흐름)
- [x] state.md 전체 Progress 체크
- [x] roadmap.md 전체 체크
- [ ] 1주 dogfooding (실제 작업에 사용)
- [ ] V1 우선순위 결정 (V1 후보는 checkpoint-2026-05-24.md "Next focus" 참조)
- [ ] /retro — 다음 정식 checkpoint 또는 V1 시작 시
