# ADR-017 — Guide 탭 신설 (도구 문서 내장 탭)

> 2026-06-12 / Status: ACCEPTED

## Context
사용자가 blueprint 워크플로의 "현재 기능 / 사용법 / 단계별(INQUIRY~P7) 설명 / 최신 변경이력"을 한곳에서 보고 싶어함 — 특히 업데이트 작업 시 참고서로.

기존 5탭(Plan/Spec/Preview/QA/Errors, ADR-006·014)은 모두 **워크스페이스 .md를 단방향 렌더**한다. 하지만 이 안내는 *특정 프로젝트 데이터가 아니라 blueprint 도구 자체*에 대한 설명이라, 프로젝트와 무관하게 항상 동일해야 한다.

## Decision
가운데 webview에 **6번째 탭 "Guide"**를 Errors 오른쪽에 추가한다.

- 콘텐츠는 워크스페이스 .md가 아니라 **확장 내장 마크다운**(`src/webview/pages/guide.ts`의 `GUIDE_MD`)을 `renderMarkdown`으로 렌더.
- 담는 것: ① 기능 개요 ② INQUIRY~POST-SHIP 단계별 목적·산출물·플로우 ③ 탭별 안내 ④ 사용법 ⑤ 최신 변경이력.
- 새 버전마다 `GUIDE_MD`를 손으로 갱신.

## Consequences
- (+) 도구 사용법·변경이력을 IDE 안에서 바로 참조. 프로젝트마다 파일 없어도 항상 표시.
- (−) "단방향 .md→UI"(ADR-003) 원칙의 **예외**. Guide 탭만 워크스페이스가 아닌 내장 콘텐츠를 그림. → 이 예외는 *프로젝트 상태가 아닌 도구 문서*에 한정하며, AI 호출·파일 쓰기는 여전히 없음(NON-GOALS 유지).
- (−) 변경이력을 수동 유지해야 함(릴리스 시 GUIDE_MD 갱신).

## Scope
페이지 6개(ADR-006 4개 → ADR-014 5개 → 본 ADR 6개). state.md phase와 무관(탭은 고정 UI).
