# FEASIBILITY — 대시보드 확장 프로그램

> 실행: **2026-06-10** / Phase 0.5 / 사후(retroactive) 검증.
> 이 제품은 이미 v0.9.7까지 출시됨 → 대부분 JTBD는 "이미 구현·동작"이 곧 실현가능 근거.
> 그러나 사후 검증의 가치는 **PRODUCT.md 명세 vs 실제 코드의 간극**을 드러내는 데 있다.
> 발견: JTBD3(활동바 배지)·JTBD5(자동 swatch)는 명세보다 구현이 덜 됨 — 아래 ⚠️ 참조.
> soft gate — ❌가 나와도 차단하지 않음. 최종 결정은 사용자.

## 판정 범례
- ✅ 가능 — 표준 도구로 구현됨 / 바로 구현 가능
- ⚠️ 조건부 — 가능하나 현재 미배선·부분구현·제약 있음 (비고 명시)
- ❌ 불가/위험 — 현재 기술·제약상 어려움

## Feasibility matrix

| # | Job-to-be-done | 가능여부 | 필요한 도구·API | 근거 (구현 위치 / 제약) |
|---|---|---|---|---|
| 1 | 세션 간 망각 방지 — 사이드바 state.md 영구 렌더 | ✅ | VS Code WebviewView API (≥1.72), 자체 파서 | 구현·동작. `src/parser/state.ts` → `src/sidebar/sidebar-view-provider.ts`. QA 하네스 파싱 단언 통과 |
| 2 | 세션 내 분산 방지 — 현재 phase/next action 사이드바 고정 | ✅ | 위와 동일 | 구현·동작. 사이드바 webview 상시 표시, `onStartupFinished` activation |
| 3 | 트리거 알림 — **활동바 아이콘 빨간 점 배지** | ✅ | `WebviewView.badge` (VS Code ≥1.72) | **배선 완료(2026-06-10).** `computeTriggerBadge()`(types.ts, 순수) → `SidebarViewProvider.updateBadge()`가 `view.badge` 설정. 트리거 ≥1 && not quiet → 숫자 배지, 0건/quiet → 해제. 하네스 6단언 커버. 사이드바 안 열어도 활동바 아이콘에 알림 |
| 4 | 산출물 시각화 — PRODUCT/DESIGN/ARCHITECTURE.md → HTML webview | ✅ | `markdown-it` ^14 (mature, MIT) | 구현·동작. Spec 탭. `src/webview/pages/spec.ts`, NON-GOALS 강조 블록 포함. QA 통과 |
| 5 | 디자인 시안 가시화 — DESIGN.md hex/폰트 자동 swatch + `docs/design/*.html` 갤러리 | ✅ | 파일 listing + `extractDesignTokens()` | **완전 구현(2026-06-10).** 갤러리(`preview.ts`) + DESIGN.md 자동 토큰 추출(`design-tokens.ts`, 순수)→Preview 탭 상단 DESIGN TOKENS 패널(색 스와치+폰트 샘플). 실제 DESIGN.md서 13색·Pretendard 추출 확인. 하네스 18단언 |

## 외부 의존성 요약

| 의존성 | 용도 | 종류 | 버전 | 비용 | 리스크 |
|---|---|---|---|---|---|
| markdown-it | .md → HTML 렌더 | npm (runtime) | ^14.0 | 무료 | 낮음 — 성숙·널리쓰임, MIT |
| @vscode/vsce | .vsix 패키징 | npm (dev) | ^2.22 | 무료 | 낮음 |
| esbuild | 번들링 | npm (dev) | ^0.19 | 무료 | 낮음 |
| typescript | 컴파일 | npm (dev) | ^5.3 | 무료 | 낮음 |
| VS Code Webview/WebviewView API | UI 호스팅 | 플랫폼 | ≥1.80 (engine) | 무료 | 낮음 — Antigravity 전용이라 분기 불필요(NON-GOAL) |

> AI API·SaaS·네이티브 빌드 의존성 **0건** (NON-GOAL: AI 직접호출 안 함). → 공급망·키관리·rate-limit 리스크 없음. 의존성 표면이 매우 작아 실현가능성 리스크 최저.

## 검증 메모 (불확실 항목만)
- JTBD3 `WebviewView.badge` API: VS Code 1.72(2022-09) 추가, engine `^1.80` 안에 포함 → API 가용성 ✅. 막는 건 기술이 아니라 *구현 결정*. (별도 웹서칭 불요 — 표준 API, 지식 범위)
- markdown-it ^14: 성숙 라이브러리, 추가 검증 불필요.

## ⚠️ 항목 — 대안 & 결정
- **JTBD3 (활동바 배지)**: ✅ **해결됨(2026-06-10)**. 결정 A 채택 → `view.badge` 배선 완료. PRODUCT.md 명세와 구현 일치. (당시 충돌: 명세는 빨간 배지 vs 실제는 사이드바 텍스트 섹션만. A로 명세대로 복원.)
- **JTBD5 (자동 swatch)**: ✅ **해결됨(2026-06-10)**. 결정 A 채택 → `extractDesignTokens()` + Preview 탭 DESIGN TOKENS 패널. DESIGN.md §자동시각화가 명세한 "색 swatch 자동 삽입 + 폰트 family 자동 샘플"의 구현. 명세-구현 일치.

## 종합 판정
- 핵심 JTBD 5개 중 — ✅: **5개**(1,2,3,4,5) · ⚠️: **0개** · ❌: **0개**
- 사후 검증이 잡은 명세-구현 간극 2건(JTBD3 배지·JTBD5 자동 swatch) 모두 2026-06-10 해소. PRODUCT.md 명세와 실제 구현 완전 일치.
- 진행 권고: **완료.** 전 JTBD 구현·검증됨.
- (권고일 뿐 차단 아님 — 최종 결정 사용자)
