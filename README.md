# Blueprint Dashboard

> Antigravity 확장 프로그램. `/blueprint` 메타스킬의 진행도·트리거·산출물을 사이드바·webview에 영구 시각화. AI 코딩 워크플로의 인지 과부하를 줄임.

**Current version**: v0.19.1

## 무엇을 하나
- **왼쪽 사이드바**: BUILD TARGET 배지 + 현재 phase + progress bar + current focus(next action) + recent changes 항상 표시. 체크포인트 트리거는 활동바 아이콘 배지로.
- **가운데 webview** (7페이지 멀티탭):
  - **Plan** — `plans/roadmap.md` 풀-너비 + "지금 만드는 것"(프로젝트 한 줄 설명) + 현재 phase 강조 + 미결 항목 경고 배너
  - **Spec** — INQUIRY/PRODUCT/DESIGN/ARCHITECTURE 산출물을 폴더 탐색기처럼 (좌 트리 / 우 풀-너비 렌더) + DESIGN.md 색·폰트 토큰 자동 추출(DESIGN TOKENS)
  - **UX Flow** — `docs/UX-FLOW.md` 사용자 여정을 ① 흐름 타임라인 + ② 단계별 큰 시안으로 (제품이 만들어지는 과정)
  - **Preview** — `docs/design/` 디자인 시안 갤러리(인라인 iframe, 컴포넌트 디자인 / 자유 실험 2그룹)
  - **QA** — `docs/qa.report.md` 점검 결과 (PASS/WARN/FAIL 집계)
  - **Errors** — `docs/error.history.md` 에러 일지
  - **Guide** — blueprint 기능·단계별(INQUIRY→POST-SHIP) 설명·변경이력 (도구 내장 문서)

## 자동 가공
- `<code>#ff385c</code>` 같은 hex 패턴 → 옆에 색깔 swatch 자동 삽입
- `## NON-GOALS` 다음 ul → 빨간 ✗ grid (Anti-게으른 디자인)
- `## 헤딩` → 글래스 카드 + 작은 eyebrow 라벨
- `## 디자인 시안` 다음 h3+img → 카드 그리드 (이미지 없으면 placeholder)
- `docs/design/**/*.html` → Preview 갤러리에 자동 등록 (저장 즉시 갱신)

## 설치
1. https://github.com/snu9026-Chris/SERVICE-PLANNING/raw/main/blueprint-dashboard-0.19.1.vsix 다운로드
2. Antigravity → `Ctrl+Shift+P` → "Install from VSIX..." → 다운받은 파일 → Reload Window

## 전체 워크플로 설치 (다른 컴퓨터)
확장만이 아니라 `/blueprint` 워크플로까지 새 머신에서 쓰려면:
- **확장**: 이 repo clone → `blueprint-dashboard-0.19.1.vsix` 설치
- **스킬**: `~/.claude/skills/blueprint/` 위치에 [blueprint-skill](https://github.com/snu9026-Chris/blueprint-skill) repo clone
- gstack(서브스킬 번들)도 설치되어 있어야 각 phase 위임이 동작

## 사용
1. 워크스페이스에 `.blueprint/state.md` 가 있어야 활성화 (없으면 `/blueprint` 스킬로 init)
2. 좌측 활동바의 [체크리스트] 아이콘 클릭 → 사이드바 펼침 (안 보이면 명령 팔레트 → "View: Reset View Locations")
3. 사이드바 Phase 항목 클릭 → 가운데 webview 열림
4. webview 상단 탭으로 Plan / Spec / UX Flow / Preview / QA / Errors / Guide 전환

## 데이터 흐름
**단방향**: `.md → UI`. extension은 .md를 *읽기만*. AI 호출 0.
- `.blueprint/state.md`, `docs/*.md`, `docs/design/**/*.html`, `plans/*.md` 변경 → 자동 reload (debounce 200ms)
- 사용자가 .md를 진실 원본으로 신뢰 가능

## 개발 (다른 컴퓨터에서 이어 작업)
```bash
git clone https://github.com/snu9026-Chris/SERVICE-PLANNING.git
cd SERVICE-PLANNING
npm install
npm run build          # esbuild → out/extension.js
npm run qa             # 자동 하네스 (231 단언, exit 0/1)
npx vsce package       # → blueprint-dashboard-<ver>.vsix
# 생성된 .vsix를 Antigravity에 설치
```

## 디렉터리
```
.blueprint/state.md    ← 현재 phase / counters / triggers (진실 원본)
docs/
  INQUIRY.md           ← Phase 0 발견 (리서치·기능/플로우 초안)
  PRODUCT.md           ← 무엇/왜 (one-liner, JBT, NON-GOALS)
  DESIGN.md            ← 색/폰트/UI Composition Decisions
  ARCHITECTURE.md      ← 스택/도메인/ADR
  adr/ADR-*.md         ← 결정 기록
  design/screenshots/  ← 디자인 시안 .html (Preview 갤러리)
  qa.report.md         ← QA 점검 결과
  error.history.md     ← 에러 일지
plans/
  roadmap.md           ← phase별 sub-task 체크리스트
src/
  parser/              ← state.md·UX-FLOW.md 파싱 + BUILD TARGET 감지 (순수)
  diagnostics/         ← 에러 자동수집(빨간줄·태스크 실패 → error.auto.md, ADR-021)
  file-watcher/        ← .md/소스 watch + debounce
  sidebar/             ← Webview view (좁은 사이드바)
  webview/             ← 가운데 멀티탭 (panel + pages/* + design-tokens + shared)
  extension.ts         ← orchestrator
```

## 다음 (V1)
- 인지성 도식화 (mermaid 도메인 맵, Phase timeline)
- a11y 키보드 내비 + phase-click affordance
- Generic mode (임의 마크다운 design preview 분리 배포 검토)

## License
Private (V0+ dogfooding 단계). V1 정식 배포 시 결정.
