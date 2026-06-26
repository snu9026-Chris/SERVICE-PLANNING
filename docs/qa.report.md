# QA Report — Blueprint Dashboard

> 실행: **2026-06-11** · v0.11.0 · Claude 전수 QA (exhaustive) · Phase 4.7
> 방식: 타입체크 + esbuild 번들 + `npm run qa` 자동 하네스(파서·5개 페이지 렌더러·활동바 배지·디자인 토큰·BUILD TARGET 2축 **142개 단언**) + 패키징 + 코드 배선 정적 검증
> 범위: 빌드 / 파서 / Webview 5탭(Plan·Spec·Preview·QA·Errors) / 활동바 배지(JTBD3) / 디자인 토큰(JTBD5) / BUILD TARGET(ADR-016) / 파일 watch / 패키징
> 단방향 원칙: 이 파일이 진실 원본 → QA 탭이 시각화만 (extension은 QA를 실행하지 않음, ADR-002)
> 보기: 섹션을 눌러 펼치기(노션식 토글). 문제 있는 섹션은 자동 펼침.
>
> **재검증 메모 (2026-06-23, v0.17.0)**: 아래 "알려진 백로그" ⚠️ 3건은 이후 버전에서 해결됨 — 키보드 내비·affordance는 v0.14.0(Enter/Space+`role`/`tabindex`, `.phase-chevron`+cursor), 트리거 배지는 computeTriggerBadge로 구현. 헤드리스 검증 한계(아래 ℹ️)는 테스트 방식상 본질적 caveat(결함 아님). 현재 자동 하네스 **221/221 PASS**. 전체 리포트 재생성은 다음 `/qa` 때.

## 빌드 · 컴파일
- ✅ TypeScript 타입체크 통과 — `tsc --noEmit` 에러 0
- ✅ esbuild 번들 성공 — `out/extension.js` 310.7kb 생성
- ✅ 정적 리소스 복사 — styles.css / sidebar-styles.css / PretendardVariable.woff2

## 파서 · state.md → BlueprintState
- ✅ 9개 phase 모두 파싱 (PRODUCT·FEASIBILITY·DESIGN·ARCHITECTURE·IMPLEMENT·REVIEW·UX-REVIEW·SHIP·POST-SHIP)
- ✅ 모든 phase `status` 가 유효값(pending/in_progress/done)
- ✅ FEASIBILITY = `done` 정확히 반영 (Phase 0.5 사후 검증 완료, 2026-06-10)
- ✅ 모든 phase에 `key` 존재 — 사이드바 클릭→Spec 라우팅 보장
- ✅ `getProgress()` total == phase 수, done 범위 정상
- ✅ `nextAction` · `counters` · `triggers` · `settings` 파싱
- ✅ 빈 문자열 / 비정형 입력에도 throw 없이 안전 회복

## Webview · Plan 탭
- ✅ roadmap 있음 / 없음(null) / state null 3개 분기 모두 정상 HTML
- ✅ `undefined` · `[object Object]` · `NaN` 누출 없음

## Webview · Spec 탭
- ✅ 전체 산출물 렌더 — `NON-GOALS` 강조 블록 포함
- ✅ product 폴더 포커스 분기 정상
- ✅ 산출물 전부 null인 빈 상태에서도 throw 없음

## Webview · Preview 탭
- ✅ 빈 그리드 / 시안 그리드 / 풀뷰어 3개 모드 정상
- ✅ 카테고리 자동 분류(sidebar·webview-*) 동작
- ✅ DESIGN TOKENS 패널이 그리드 상단에 함께 렌더 (`token-chip` 포함)

## 디자인 토큰 · JTBD5 (신규)
- ✅ `extractDesignTokens()` 순수 함수 — null/빈 입력 안전(색·폰트 0)
- ✅ 표 행에서 hex + 용도 라벨 추출 (`#007aff` → 'Accent')
- ✅ rgba 색상 추출 + 한 셀 내 다중 색상(그라데이션) 모두 추출
- ✅ hex 대소문자 무관 중복 제거
- ✅ 본문 설명용 `rgba(...)` 텍스트 오탐 방지 (괄호 안 숫자 필수)
- ✅ 폰트 — generic fallback 제외 + `Variable` 접미 제거 → 'Pretendard'
- ✅ 실제 DESIGN.md 13색·Pretendard 추출 (명세 §자동시각화와 일치)

## Webview · QA 탭 (신규)
- ✅ 리포트 없음 → 안내(빈) 상태 정상 렌더
- ✅ 샘플 리포트 PASS/WARN/FAIL 카운트 정확 (2/1/1)
- ✅ verdict 판정 로직 — FAIL 있으면 fail · WARN만이면 warn · 전부면 pass
- ✅ 상태 이모지(✅⚠️❌)가 본문 텍스트로 새지 않음 (stripLeadingEmoji)
- ✅ 인라인 마크다운(`code`·**bold**) 정상 변환
- ✅ 탭 배지 — FAIL 수 빨강 / WARN 수 주황 / 클린 시 초록 점
- ✅ 노션식 접이식 토글 — `data-qa-toggle`·셰브론·전체 펼치기/접기
- ✅ 기본 펼침 규칙 — FAIL/WARN 섹션 open, 전부 PASS 섹션 접힘 + `aria-expanded`

## 활동바 배지 · JTBD3 (신규)
- ✅ `computeTriggerBadge()` 순수 함수 — state null → 배지 없음
- ✅ 트리거 0건 → 배지 해제 (오발화 방지)
- ✅ 트리거 N건 → `value=N` 숫자 배지 + `/blueprint check` 안내 tooltip
- ✅ quiet_until 미래 → 트리거 있어도 배지 억제 (조용 모드 존중)
- ✅ quiet_until 과거 → 정상 발화
- ✅ 현재 실제 state.md(트리거 empty) → 배지 미발화 확인
- ✅ `SidebarViewProvider.updateBadge()` 가 `view.badge` 에 배선 — 사이드바 안 열어도 활동바 아이콘에 알림 (명세 JTBD3 충족)

## Webview · Errors 탭
- ✅ 히스토리 없음(생성 CTA) / 있음(렌더) 양쪽 정상

## BUILD TARGET · ADR-016 (신규)
- ✅ `detectBuildTarget()` 우선순위 — tauri.conf→tauri, electron dep→electron, engines.vscode→vscode-extension, next/index.html→website, bin→cli, main→library
- ✅ 우선순위 충돌 정렬 — Tauri가 vite(웹 프레임워크)보다 먼저 (프론트엔드 동반 케이스)
- ✅ 시그널 없음 → null (미표시), 감지 결과 source=detected·label·icon 채워짐
- ✅ `explicitBuildTarget()` 별칭 정규화 — vsix→vscode-extension, homepage→website, native→tauri
- ✅ 명시 source=explicit + stack 보존, 미지 타입은 라벨 보존+기본 아이콘(🧩)
- ✅ 파서 `## Build target` 섹션 type/stack/**run/dist/confidence**(2축) 추출, 빈 슬롯·섹션 없으면 null(자동감지 fallback)
- ✅ 명시 2축 필드 보존 (run/dist/confidence), 미지 타입은 라벨 보존+기본 아이콘
- ✅ 실제 이 프로젝트 → state.md `## Build target` 명시로 📦 VS Code Extension **explicit** 표시(run/dist tooltip)

## 파일 watch · 데이터 흐름 (정적 배선 검증)
- ✅ `docs/**/*.md` watch 글롭이 `docs/qa.report.md` 커버 (watcher.ts)
- ✅ `handleFileChange` 에 qaReport 케이스 + `loadAll` 초기 로드 배선
- ✅ 단방향 유지 — QA 탭은 read-only, .md 역기록 없음 (ADR-003)
- ℹ️ Extension Host 런타임 검증은 헤드리스 불가 — activation·watch 실발화는 정적(코드+타입) 확인까지. 실측은 F5 디버그 세션에서 dogfooding 권고 (테스트 방식상 본질적 caveat, 결함 아님)

## 패키징
- ✅ `vsce package` 성공 — blueprint-dashboard-0.9.6.vsix (11 files, 2.06MB)
- ✅ **결함 발견·수정 ①**: 초기 패키지에 임시 `.qa-tmp/` 누출(14 files) → `.vscodeignore` 에 `test/**`·`.qa-tmp/**` 추가로 차단
- ✅ **결함 발견·수정 ②**: 개발 메타파일 `DIGEST.md`·`CLAUDE.md`·`HISTORY.md` 가 .vsix에 포함 → `.vscodeignore` 추가로 제외 (최종 **10 files**, 2.06MB)
- ✅ 재실행 가능 QA 하네스 정착 — `npm run qa` (exit 0/1로 CI 게이트 가능)

## 알려진 백로그 (이후 버전에서 해결됨)
- ✅ 사이드바 phase 키보드 내비게이션 — v0.14.0 해결 (Enter/Space + `role="button"`/`tabindex="0"`)
- ✅ phase 클릭 affordance — v0.14.0 해결 (`.phase-chevron` `›` + cursor:pointer + hover)
- ✅ JBT3 트리거 배지 — computeTriggerBadge로 활동바 배지 구현 (quiet 모드 연동)

## 종합
- ✅ 자동 하네스 **142/142 PASS**, 타입체크·빌드·패키징 전부 통과, FAIL 0
- ✅ 신규 QA 탭(노션식 토글) 포함 5탭 전부 무결 — **SHIP 가능**
- ✅ QA가 Phase 4.7로 파이프라인·사이드바에 정식 노출 (ADR-015)
- ✅ JTBD3 활동바 배지 + JTBD5 디자인 토큰 패널 구현 완료 — FEASIBILITY 사후검증 간극 2건 해소. 전 JTBD ✅
- ✅ BUILD TARGET 상시 표시(ADR-016) — Hero phase 위 산출물 타입 배지, 하이브리드(명시+자동감지)
