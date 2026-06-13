# ARCHITECTURE — 대시보드 확장 프로그램

> 작성: 2026-05-22 / Phase 2 / Status: APPROVED

## Stack & Why

| Layer | Choice | Why |
|---|---|---|
| Runtime | VS Code Extension API (Antigravity 호환) | Antigravity가 VS Code 기반 → .vsix 그대로 동작 |
| Language | TypeScript | VS Code extension 표준, 타입 안전 |
| Markdown 파서 | `markdown-it` | 가장 안정적, 플러그인 풍부, mermaid·hex 패턴 확장 쉬움 |
| 빌드 | `esbuild` | 빠른 번들링, 의존성 최소 |
| 테스트 | `vitest` (단위) + VS Code Extension Test Runner | 표준 |
| 패키징 | `@vscode/vsce` | .vsix 표준 |

**의존성 철학**: 외부 의존성 최소. AI SDK 0개. webview 안 자바스크립트도 vanilla 우선, 필요 시에만 mermaid.js 추가.

## Domain map

DDD 정신 그대로. 작은 extension이라 도메인 5개로 충분.

### 1. parser
- **Owns**: `.md` 파싱, 데이터 객체화. state.md 스키마, PRODUCT/DESIGN/ARCHITECTURE.md 섹션 추출. 산출물 타입(BUILD TARGET) 명시 파싱 + 자동감지 순수 로직(`build-target.ts`, ADR-016).
- **NOT owns**: 파일 watch, 렌더링, UI 상태, fs IO(시그널 수집은 extension이 모아서 넘김)
- **Emits**: `state-updated`, `artifact-updated`
- **Subscribes**: `file-changed`

### 2. file-watcher
- **Owns**: `.blueprint/state.md`, `docs/*.md`, `docs/design/*.html` watch
- **NOT owns**: 파싱, 렌더링
- **Emits**: `file-changed`
- **Subscribes**: (none) — extension activate 시 VS Code FS watcher 등록

### 3. sidebar
- **Owns**: TreeView 데이터 제공자(`TreeDataProvider`), trigger 배지 상태
- **NOT owns**: 파싱, 파일 IO
- **Emits**: `sidebar-click` (어느 항목 클릭됐는지)
- **Subscribes**: `state-updated`

### 4. webview
- **Owns**: 가운데 webview panel 생명주기, HTML 렌더, 디자인 시각화(hex swatch, 폰트 샘플, mermaid)
- **NOT owns**: 파싱, 파일 IO
- **Emits**: `webview-message` (사용자가 webview 내 클릭 시)
- **Subscribes**: `artifact-updated`, `sidebar-click`

### 5. extension (orchestrator)
- **Owns**: activation, 이벤트 버스, 다른 도메인 wire-up, 모드 감지(init/resume/retrofit)
- **NOT owns**: 비즈니스 로직 (다른 도메인에 위임)
- **Emits**: (none)
- **Subscribes**: 모든 이벤트 (라우팅 책임)

## Folder layout

```
대시보드 확장 프로그램/
├── src/
│   ├── parser/
│   │   ├── state.ts          ← .blueprint/state.md 파서
│   │   ├── artifact.ts       ← PRODUCT/DESIGN/ARCH.md 파서
│   │   └── design.ts         ← DESIGN.md hex/폰트 추출
│   ├── file-watcher/
│   │   └── watcher.ts
│   ├── sidebar/
│   │   ├── tree-data-provider.ts
│   │   └── badge.ts
│   ├── webview/
│   │   ├── panel.ts          ← WebviewPanel 생명주기
│   │   ├── renderer.ts       ← md → HTML 변환
│   │   ├── styles.css        ← getdesign.md 차용
│   │   └── client.js         ← webview 안 vanilla JS
│   ├── extension.ts          ← activate / deactivate / event bus
│   └── types.ts              ← 공유 타입 (BlueprintState, Phase, Trigger 등)
├── test/
│   └── parser/state.test.ts
├── docs/                      ← 이 프로젝트 자체의 blueprint 산출물
│   ├── PRODUCT.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   └── adr/
├── plans/
├── .blueprint/state.md
├── package.json
├── tsconfig.json
└── esbuild.config.js
```

## Data contracts (핵심 entity)

| Entity | Owner | Shape 요약 |
|---|---|---|
| `BlueprintState` | parser | `{ project, phases: Phase[], next_action, counters, triggers: string[], settings }` |
| `Phase` | parser | `{ id: 0..6, name, status: 'pending' \| 'in_progress' \| 'done', date? }` |
| `Trigger` | parser | `{ condition: string, fired_at: Date }` |
| `Artifact` | parser | `{ path, title, sections: Section[], html: string }` |
| `DesignToken` | parser | `{ kind: 'color' \| 'font' \| 'spacing', value, description }` |
| `BuildTarget` | parser | `{ type, label, icon, stack?, source: 'explicit' \| 'detected' }` (ADR-016) |

모든 entity는 *immutable*. parser가 새 버전을 emit하면 sidebar/webview가 통째로 교체.

## Inter-domain communication rule

**선택: 이벤트 버스만.** 도메인 간 직접 import 금지.

이유: 5개 도메인이라 작지만, 향후 V4 retrofit 모드 추가 시 parser 교체 쉬움. 이벤트 시그니처가 계약.

이벤트 버스 = VS Code의 `EventEmitter` 활용. 별도 라이브러리 X.

```typescript
// types.ts
export type EventBus = {
  on(event: 'state-updated', handler: (s: BlueprintState) => void): void;
  on(event: 'artifact-updated', handler: (a: Artifact) => void): void;
  emit(event: string, payload: any): void;
};
```

## 단방향 데이터 흐름 (NON-GOALS 반영)

```
.md 파일 (진실 원본)
    ↓ file-watcher (debounce 200ms)
file-changed event
    ↓ parser
state-updated / artifact-updated event
    ↓
   ├─→ sidebar.refresh()
   └─→ webview.reload()

사용자 클릭 →
   ├─ sidebar 항목 클릭 → webview.show(artifact)
   └─ webview 내 버튼 클릭 → command (e.g., "/blueprint check" 슬래시 명령 호출만)

❌ extension 절대 안 함:
   - .md 파일에 직접 write
   - AI API 호출
   - 사용자 코드 수정
```

## Performance budget (사용자 우려 반영)

| 동작 | 예산 | 실측 목표 |
|---|---|---|
| File watch overhead | < 0.5% CPU idle | OS native FS watcher 사용 |
| state.md 변경 → sidebar refresh | < 50ms | 5-20ms |
| .md 변경 → webview reload | < 200ms | 50-100ms |
| Activation time | < 500ms | < 300ms |
| Memory footprint | < 80MB | 20-50MB |
| 사용자 키 입력 지연 | **0ms (영향 없음)** | webview는 별도 렌더러 프로세스 |

**안전장치**:
- File watch **debounce 200ms** — 연속 저장 시 reload 1회
- Webview **lazy load** — 사용자가 사이드바 항목 클릭할 때만 띄움
- IDE focus 잃으면 watch 일시정지 (`onDidChangeWindowState`)
- 큰 .md (>500줄)는 헤딩만 우선 렌더 후 lazy 확장 (V0~V1엔 불필요, V2 이후)

이걸로 일반 코딩 속도 영향 **사실상 0** 보장.

## Mode 자동 감지 (PRODUCT.md 결정 반영)

```typescript
// extension activate 시
const hasState = await fileExists('.blueprint/state.md');
const hasCode = await hasAnyCodeFile(); // .ts, .py, .js 등

if (hasState) return 'resume';
if (!hasState && !hasCode) return 'init-suggest';
if (!hasState && hasCode) return 'retrofit-suggest';  // V4 이후
```

V0~V3은 `resume` 모드만 실제 동작. 나머지 두 모드는 안내 메시지만.

## ADR log (요약)

| # | Date | Decision |
|---|---|---|
| 001 | 2026-05-22 | TypeScript + VS Code Extension API (별도 framework X) |
| 002 | 2026-05-22 | AI 호출 일절 금지 — 시각화·동기화만 |
| 003 | 2026-05-22 | 단방향 데이터 (.md → UI). UI에서 .md 수정 안 함 |
| 004 | 2026-05-22 | 이벤트 버스 기반 도메인 간 통신, 직접 import 금지 |
| 005 | 2026-05-22 | Generic mode 분리 = V4 이후 별도 결정. V0~V3은 blueprint 전용 |
| 006 | 2026-05-22 | 가운데 webview 4페이지 멀티탭 (Plan/Spec/Preview/Errors) → ADR-014에서 5페이지로 확장 |
| 007 | 2026-05-22 | 사이드바 TreeView → WebviewViewProvider 전환 (디자인 자유) |
| 008 | 2026-05-24 | 마크다운 자동 가공 파이프라인 (swatch/NON-GOALS/디자인 시안/카드) |
| 009 | 2026-05-24 | CHECKPOINT를 phase 리스트에서 제외 → 사이드바 KPI 카드. Phase 6개. |
| 010 | 2026-05-30 | REVIEW를 phase로 박음 — IMPLEMENT와 SHIP 사이. Phase 7개. SHIP 전 hard gate. |
| 014 | 2026-06-09 | 가운데 webview에 QA 탭 추가 (Preview↔Errors). qa.report.md 단방향 렌더 + `npm run qa` 하네스. 5페이지. |
| 015 | 2026-06-09 | QA를 파이프라인 phase로 추가 (4.7, UX-REVIEW↔SHIP). SHIP 직전 최종 검증 게이트. ADR-012 동적 리스트라 state.md 한 줄로 반영. |
| 016 | 2026-06-10 | BUILD TARGET 배지 (하이브리드: state.md 명시 + 자동감지). `build-target.ts` 순수 로직. |
| 017 | 2026-06-12 | Guide 탭 추가 (Errors 오른쪽). 도구 문서(기능·단계별·변경이력) 내장 렌더 — .md→UI 원칙의 명시적 예외. 6페이지. |

세부는 `docs/adr/ADR-{NNN}.md` 풀 파일 (006~008은 별도 파일 작성됨)

## V0 진입 체크리스트

V0 = state.md → 사이드바 TreeView. 다음만 만들면 됨:

- [ ] `package.json` — extension manifest, activation event
- [ ] `src/extension.ts` — activate / deactivate
- [ ] `src/file-watcher/watcher.ts` — state.md watch
- [ ] `src/parser/state.ts` — state.md → `BlueprintState`
- [ ] `src/sidebar/tree-data-provider.ts` — TreeView 데이터 제공
- [ ] `esbuild.config.js` — 번들 빌드
- [ ] `tsconfig.json`

V0엔 webview, design 시각화, trigger 배지 *없음*. Phase 1 와이어프레임의 사이드바 부분만.

V0 완성 후 본인 dogfooding → Yes면 V1 진행, No면 V0에서 stop.
