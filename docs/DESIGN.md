# DESIGN — 대시보드 확장 프로그램

> 작성: 2026-05-22 / Phase 1 / Status: APPROVED
>
> 와이어프레임 ASCII는 제거함. *실제 동작하는 사이드바 + 가운데 webview*가 가장 정확한 디자인 미리보기.

## 디자인 철학 (V0.9.4 리디자인 — 안 A)
**아이폰 설정앱처럼 조용하고 정돈되게.** 플랫 iOS Settings 풍.
- VS Code 토큰 *사용 안 함* — 항상 같은 룩 (다크/라이트 테마 무관). 본인용 dogfooding 우선.
- **글래스·blob·이모지·monospace 노이즈 제거.** `#f2f2f7` 그룹 배경 위 흰 카드 + 1px 헤어라인.
- 색은 *데이터에만* (state, trigger, hex swatch). 장식 색 0.
- 폰트는 **Pretendard 번들** — Windows에서도 SF Pro급 또렷함 (CDN 의존 없이 `out/fonts/`에 동봉).

> 옛 글래스 룩(backdrop-filter blur + 5색 blob + ::before sheen)은 폐기. CSS 말미 "안 A 플랫 스킨" 블록이 덮어씀.

## 5대 가시성 원칙
1. **한 번에 한 가지만 강조** — 현재 phase 이름이 압도적으로 큼 (28~56px)
2. **scannable** — 스크롤 없이 핵심 5초 안에 흡수
3. **여백 시원** — 카드 padding 14~32px (사이드바/webview), 카드 간 gap 14~24px
4. **데이터 = 시각, 장식 = 0** — 아이콘/이모지/장식 색 없음. 데이터에만 색 (state, trigger, hex swatch).
5. **폰트 두껍게** — 본문 500, 헤딩 700~800. 글래스 위에서 가독성.

## 색 (V0.9.4 — iOS Settings 팔레트)

| 용도 | 값 | 비고 |
|---|---|---|
| 페이지 배경 (시작) | `#f2f2f7` | iOS systemGroupedBackground |
| 페이지 배경 (끝) | `#e9e9ee` | 살짝 더 어둡게 (위→아래) |
| 카드 배경 | `#ffffff` | 불투명 흰색 (blur 없음) |
| 카드 보더 (헤어라인) | `rgba(60, 60, 67, 0.1)` | iOS separator |
| 카드 그림자 | `0 1px 2px rgba(0,0,0,0.04)` | 아주 약하게 (플랫) |
| 텍스트 (메인) | `#1d1d1f` | Apple 다크 |
| 텍스트 (흐림, 라벨) | `#8e8e93` | iOS secondaryLabel |
| Accent (link, in_progress, label) | `#007aff` | iOS systemBlue |
| Trigger 빨강 | `#ff3b30` | iOS systemRed |
| Done 초록 | `#34c759` | iOS systemGreen |
| Progress 그라데이션 | `#34c759 → #aacc00 → #ffcc00 → #ff9500 → #ff3b30` | 진행도 차오를수록 빨강 도달 |

배경은 단색 그라데이션 1개. **컬러 blob·backdrop-filter 없음.**

## 입체감 룰 (플랫)
- **카드 radius**: 12~16px (iOS 풍)
- **카드 = 흰 배경 + 1px 헤어라인 + 약한 그림자.** blur·sheen·hover translate 없음.
- **그룹화**: 데이터 묶음을 흰 카드로, 카드 안은 헤어라인으로 행 구분 (설정앱 그룹 리스트).
- 강조는 *형태/크기/색 대비*로 — 그림자 깊이로 띄우지 않음.

## 타이포그래피

| 용도 | 크기 | weight | family |
|---|---|---|---|
| Page hero title (가운데 webview) | 52px | 800 | Pretendard, tracking -0.035em |
| Sidebar hero phase title | 28px | 800 | Pretendard, tracking -0.03em |
| Spec section h1 | 36px | 800 | Pretendard |
| Card heading (uppercase 라벨) | 11~13px | 700~800 | Pretendard, letter-spacing 0.12~0.16em |
| 본문 | 14~17px | 500 | Pretendard |
| Counter / progress 숫자 | 11~22px | 600~700 | Pretendard + `font-variant-numeric: tabular-nums` |
| 폴더 경로, 파일 경로 | 11~14px | 500~600 | **Pretendard** (monospace 폐지) |

**monospace 전면 폐지** — hex·경로·카운터까지 전부 Pretendard로 통일 (선명함·일관성). 숫자는 `tabular-nums`로 정렬.

폰트 = `"Pretendard Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
- `out/fonts/PretendardVariable.woff2` 로 **번들** (CDN 의존 없음, 오프라인 OK).
- `@font-face` + `font-src ${cspSource}` CSP + `out/fonts` localResourceRoot 로 webview에 로드.

## 레이아웃
- **사이드바**: padding 16px 12px, gap 14px (좁은 폭 대응)
- **가운데 webview**: max-width 1000px 중앙 정렬, padding 32px 48px
- **Spec section**: 카드 박스 없이 풀-너비 마크다운 + 섹션 간 회색 divider만
- **Tab nav**: 상단 sticky, 글래스 카드 (사용자가 스크롤해도 따라옴)

## UI Composition Decisions — 화면별 컴포넌트 → JBT 매핑

> 데이터 구조(state.md 섹션 등) → UI 1:1 매핑 금지. 모든 컴포넌트는 JBT 또는 명시적 통증과 매핑. 매핑 안 되는 컴포넌트는 제거.

### 화면 1: Sidebar (좁은 패널, 항상 보임)

| 컴포넌트 | 어느 JBT? | 결정 |
|---|---|---|
| Hero (폴더 경로 + 현재 phase + progress) | JBT #1 (세션 간 망각) | 필수 |
| Phases 7개 리스트 | JBT #1 (전체 흐름에서 위치) | 필수 |
| Current focus (state.md next action) | JBT #2 (세션 내 분산) | 필수 |
| Triggers | JBT #3 (트리거 알림) | 필수 |
| Active file (활성 에디터 경로) | (PRODUCT.md 통증 #2 "코딩 어디") | 필수 |
| Recent changes (최근 .md/code 변경) | (활동 가시화) | 보조 |
| ~~프로젝트명 큰 타이틀~~ | (폴더 경로와 중복) | **제거** |
| ~~Counters 4개~~ | (JBT 매핑 없음) | **제거 (노이즈)** |
| ~~Decisions log~~ | (Recent changes로 흡수) | **제거 (중복)** |

### 화면 2: Center Webview (큰 캔버스, 의도해서 봄)

탭 (사용자 클릭으로 전환, 현재 8개):

| # | 페이지 | 어느 JBT? | 데이터 소스 |
|---|---|---|---|
| 1 | **Plan** (첫 탭) | 큰 그림 + 현재 위치 | `plans/roadmap.md` + `.blueprint/state.md` |
| 2 | **Spec** | JBT #4 (산출물 시각화) | `docs/PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md` |
| 3 | **UX Flow** | 사용자 여정 가시화 | `docs/UX-FLOW.md` (여정 그래프, ADR-020) |
| 4 | **Preview** | JBT #5 (디자인 시안) | **자유 실험**(`docs/design/` 갤러리 + push) ↔ **기능 명세**(`docs/UX-FLOW.md` 단계별) 토글 |
| 5 | **QA** | (출시 전 검증) | `docs/qa.report.md` |
| 6 | **Errors** | (인지과부하 ↓) | `docs/error.history.md` (없으면 생성 버튼) |
| 7 | **Guide** | (도구 사용법) | 확장 내장 문서 (ADR-017) |

상호작용:
- 사이드바 Phase 클릭 → 자동으로 Spec 탭 + 해당 .md 섹션으로 이동
- 채팅 "프리뷰에 띄와봐 X.html" → Preview 탭 자동 이동 + 콘텐츠 교체
- Spec 페이지 스크롤 → 상단 anchor nav (PRODUCT/DESIGN/ARCH)가 현재 보이는 섹션 자동 active

### 자동 시각화 (V0+ 적용)
- **색 swatch**: `<code>#hex</code>` 또는 `<code>rgba(...)</code>` 패턴 감지 → 옆에 16px 색깔 박스 자동 삽입 (Spec 페이지 어디든)
- **체크박스**: `- [ ]` / `- [x]` → 시각적 둥근 박스 (Plan 페이지)

V1 이후: 폰트 family 자동 샘플 렌더, mermaid 다이어그램, `docs/design/*.html` 갤러리.

## 디자인 시안

**시안 미리보기는 가운데 webview의 Preview 탭**에서 카테고리별로 자동 분류되어 표시됩니다.

- 위치: `docs/design/screenshots/` (자동 listing)
- 분류 (파일명 prefix 기준):
  - `sidebar*.html` → 사이드바
  - `webview-plan*.html` → Plan
  - `webview-spec-*.html` → Spec
  - `webview-preview*.html` → Preview
  - `webview-errors*.html` → Errors
  - `*-mockup-*.html` → 검증 단계 mockup
- 클릭 → 풀-너비 미리보기. `← 그리드로` 로 복귀.

새 시안 추가 = `screenshots/` 폴더에 `.html` 파일 떨구기. 자동 표시.

## User flow (핵심)

```
세션 시작
  → Antigravity 열림
  → extension activate (workspaceContains:.blueprint/state.md)
  → 사이드바에 phase progress 자동 표시
  → 사용자 코드 편집
  → 필요할 때 사이드바 phase 클릭 → 가운데 webview 열림 (Spec 탭)
  → state.md / docs/*.md 변경 감지 → 사이드바·webview 자동 reload
  → trigger 발동 시 사이드바 trigger 카드 빨간 글래스 강조
```
