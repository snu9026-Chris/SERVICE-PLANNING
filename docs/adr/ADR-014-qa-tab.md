# ADR-014: 가운데 Webview에 QA 탭 추가 (4→5 탭)

- Date: 2026-06-09
- Status: accepted
- Supersedes(부분): ADR-006 (4페이지 멀티탭 → 5페이지)

## Context
사용자가 "있는 기능을 Claude 차원에서 전수 테스트하는 QA"와 그 결과를 가운데 패널에서
**Preview와 Errors 사이**의 메인 섹션으로 보고 싶어함. 기존 탭은 Plan/Spec/Preview/Errors 4개.

QA 결과는 본질적으로 누적·구조화된 체크리스트(통과/경고/실패)라 Errors 일지와 성격이 다르고,
산출물 .md를 시각화하는 본 제품 정체성과 정확히 맞음.

## Decision
가운데 webview를 **5페이지**로 확장. 탭 순서: `Plan · Spec · Preview · QA · Errors`.

- 진실 원본: `docs/qa.report.md` (단방향 .md → UI, ADR-002/003 유지).
- extension은 QA를 **실행하지 않음**. Claude(/qa 또는 하네스)가 검사·기록하고, 탭은 시각화만.
- 리포트 양식: `## 섹션` + `- ✅/⚠️/❌/⬜ 항목`. 렌더러가 PASS/WARN/FAIL을 집계해
  상단 요약 바 + verdict(pass/warn/fail) + 섹션별 상태 체크리스트로 표시.
- 탭 배지: FAIL 수(빨강) > WARN 수(주황) > 클린(초록 점).
- 재실행 가능한 순수-로직 QA 하네스 `test/qa-harness.ts` (`npm run qa`, exit 0/1) 동반 —
  파서 + 5개 페이지 렌더러를 실제 파일로 구동. vscode API 의존 영역은 리포트에 별도 기록.

## Consequences
- Positive: QA 결과가 영구 가시화 → "무엇을 검사했고 무엇이 깨졌나" 한눈에. ADR-006이 이미 "renderer 5개"를 예견 → 구조적 무리 없음.
- Positive: `npm run qa`로 회귀 게이트 확보 (CI 연결 가능).
- Negative: 탭 1개·렌더러 1개·CSS 1블록 증가.
- Neutral: 단방향·AI-호출-금지 원칙 그대로. QA 실행 주체는 여전히 Claude(외부).

## Alternatives considered
- A: Errors 탭에 QA 섹션 합치기 — 성격(누적 일지 vs 구조화 체크리스트)이 달라 혼탁.
- B: 사이드바에 QA phase 신설 — 파이프라인 phase 모델 변경이라 과함. QA는 기존 REVIEW phase 산하 활동으로 두고, 결과만 탭으로 시각화.
- 채택: 독립 QA 탭 + qa.report.md 단방향 렌더 + 재사용 하네스.

## References
- `src/webview/pages/qa.ts` (렌더러), `src/webview/panel.ts` (탭 배선)
- `src/extension.ts` (qa.report.md 로드·watch), `src/webview/styles.css` (QA 블록)
- `test/qa-harness.ts` (`npm run qa`), `docs/qa.report.md` (진실 원본)
- ADR-006 (멀티탭), ADR-002/003 (AI 호출 금지·단방향)
