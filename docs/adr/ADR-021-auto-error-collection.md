# ADR-021 — 자동 에러 수집 (Diagnostics + Task) + 확장의 파생 쓰기 예외

> 2026-06-23 / Status: ACCEPTED

## Context
Errors 탭은 지금까지 **수동 일지**다 — 사용자가 Claude에게 "에러히스토리에 추가해"라고 해야 `docs/error.history.md`에 한 줄이 남는다. 자동 감지가 없어 실제로는 잘 안 쌓인다.

자동화하려면 수집 주체가 **프로젝트가 아니라 확장(extension) 자신**이어야 한다. CLAUDE.md·error.history.md는 프로젝트마다 따로라, 폴더가 바뀌면 "Claude가 기록하게" 하는 방식은 결국 수동이다. 확장은 `onStartupFinished`로 **어떤 폴더를 열든 활성화**되므로, 확장이 직접 수집하면 두 사용 맥락 모두 폴더 무관하게 커버된다:
- ① 블루프린트 확장 자체를 개발할 때 뜨는 에러
- ② 블루프린트로 만든 다른 프로젝트에서 뜨는 에러

**핵심 제약(충돌)**: 이 확장은 ADR-002/003 + PRODUCT NON-GOALS에서 **"단방향: .md → UI, 확장은 .md에 직접 write 안 함"**을 명시했다. 자동 수집은 확장이 파일에 *반복적으로 써넣는* 동작이라 이 원칙과 정면 충돌한다. (기존 `createErrorHistory()`는 사용자 버튼 1회 생성이라 성격이 다름.)

## Decision

### 1. 좁게 한정한 "파생 쓰기 예외"
확장의 자동 .md 쓰기를 **딱 하나의 파일에만** 허용한다: `docs/error.auto.md`.
- **허용**: 진단(diagnostics)·태스크 실패에서 파생된 *읽기 전용 텔레메트리*를 `error.auto.md`에 자동 기록.
- **불변 유지**: `.blueprint/state.md`와 기획 산출물(PRODUCT/DESIGN/ARCHITECTURE/UX-FLOW 등)은 **여전히 확장이 절대 안 건드림**. 블루프린트 "상태"의 단방향(.md→UI)·AI 호출 0 원칙은 그대로다.
- `error.auto.md`는 *상태가 아니라 파생 로그*다. 언제든 지워도 재생성되며, 진실 원본이 아니다.

### 2. 수집 범위 (정적 + Task)
- **Diagnostics** — `vscode.languages.onDidChangeDiagnostics` 구독. `severity === Error`만. 컴파일(TS)·린트(ESLint) 등 에디터 빨간줄 전부. (런타임 크래시는 범위 밖 — VSCode가 못 봄.)
- **Task 실패** — `vscode.tasks.onDidEndTaskProcess`에서 `exitCode !== 0`인 빌드/테스트 태스크.

### 3. 새 도메인: `diagnostics` (collector)
file-watcher의 형제. VS Code 리스너를 소유하고 구조화된 에러 스냅샷을 **emit만** 한다. **fs IO·렌더링은 안 함**(parser·file-watcher와 동일 규율).
- `src/diagnostics/collector.ts` — 리스너 등록 + 디바운스 + 중복제거 → `onUpdate(entries: AutoErrorEntry[])` 콜백.
- `formatAutoErrorsMarkdown(entries) → string` — 순수 함수(테스트 가능), 스냅샷 → `error.auto.md` 본문.
- 파일 쓰기·패널 갱신은 **extension(orchestrator)**가 수행 (도메인은 emit, IO는 오케스트레이터 — ADR-018 일관).

### 4. Errors 탭 = 자동/수동 2섹션
`renderErrorsPage(manualMd, autoMd)` — 위에 **자동 수집**(`error.auto.md`), 아래에 **수동 일지**(`error.history.md`). 둘은 별도 파일이라 서로 안 섞임.

### 5. 성능 가드
- onDidChangeDiagnostics 디바운스 **1000ms**(연속 타이핑 중 빨간줄 깜빡임을 1회로).
- 항목 상한 **200개**(파일 비대 방지), 최신 우선.
- 키 입력 지연 0 — 수집은 idle 콜백, 쓰기는 디바운스 후 1회.

## Consequences
- (+) 두 맥락(① 확장 개발 / ② 생성된 프로젝트) 모두 **폴더 무관 자동 수집**. CLAUDE.md 의존 없음.
- (+) 핵심 정체성(상태는 state.md 단방향, AI 0) 불변 — 예외는 파생 로그 1파일로 봉인.
- (−) "확장은 .md에 write 안 함"이 절대 규칙에서 **"상태/기획 산출물엔 안 씀, 파생 텔레메트리 1파일은 씀"**으로 완화. ARCHITECTURE/PRODUCT 문구 갱신 필요(본 ADR과 함께).
- (−) 도메인 6개로 증가(diagnostics 추가).
- (−) 런타임 에러(실행 중 앱 크래시)는 미커버 — 별도 ADR로 분리(앱 템플릿 계측 필요).

## Scope
- 신규: `src/diagnostics/collector.ts`, `docs/error.auto.md`(런타임 생성), `AutoErrorEntry` 타입.
- 확장: extension.ts(wire-up + 쓰기), panel.ts(autoMd 캐시/setter), errors.ts(2섹션), qa-harness(포맷·렌더 단언).
- 불변: parser·sidebar·flow·preview·state.md·기획 산출물.
- 범위 밖: 런타임 에러 수집, 터미널 stderr 스크랩(ADR-021은 Task exitCode까지만).
