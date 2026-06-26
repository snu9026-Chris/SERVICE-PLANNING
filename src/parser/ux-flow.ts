/**
 * UX-FLOW.md 파서 (ADR-020).
 *
 * 이 파일은 docs/UX-FLOW.md 를 사용자 여정 객체(UxFlow)로 바꾼다.
 * 입력: 마크다운 문자열 / 출력: UxFlow (단계 0개면 null).
 * Flow 탭의 여정 그래프와 Preview의 기능 명세가 이 *한 객체*를 공유하므로,
 * 둘은 구조적으로 절대 어긋나지 않는다.
 *
 * 형식 계약:
 *   # UX Flow — 제품명
 *   > (선택) 한 줄 소개
 *   ## 1. 단계명
 *   > (선택) 단계 한 줄 요약
 *   - 시안: webview-foo.html         ← (선택) 이 단계 매칭 화면 시안 (② 큰 시안)
 *   - 묻기: …                        ← (선택) ① Claude가 무엇을 묻나
 *   - 정하기: …                      ← (선택) ① 같이 무엇을 정하나
 *   - 채워짐: …                      ← (선택) ① 대시보드 어디가 채워지나
 *   - 산출물: …                      ← (선택) ① 어떤 파일이 나오나
 *   ### 기능
 *   - 이름 — 설명 [핵심]              ← 기능 (상태 칩 선택)
 */

import { UxFlow, UxFlowStep, UxFlowFeature, UxFeatureStatus } from '../types';

/** 상태 라벨(한/영) → 칩 종류 매핑. 매칭 안 되면 undefined. */
function parseStatus(raw: string): UxFeatureStatus | undefined {
  const s = raw.trim().toLowerCase();
  if (s === '핵심' || s === 'core') return 'core';
  if (s === '예정' || s === 'todo' || s === 'planned') return 'todo';
  if (s === '완료' || s === 'done') return 'done';
  return undefined;
}

/**
 * 기능 한 줄(`이름 — 설명 [상태]`)을 파싱.
 * 구분자는 em대시(—) 우선, 없으면 ` - ` 또는 `:`.
 */
function parseFeature(line: string): UxFlowFeature {
  let text = line.trim();
  let status: UxFeatureStatus | undefined;

  // 끝의 [상태] 추출
  const statusMatch = text.match(/\[([^\]]+)\]\s*$/);
  if (statusMatch) {
    const st = parseStatus(statusMatch[1]);
    if (st) {
      status = st;
      text = text.slice(0, statusMatch.index).trim();
    }
  }

  // 이름/설명 분리 — em/en대시를 먼저 문자열 전체에서 찾고(이름 속 하이픈 보호),
  // 없을 때만 ` - `(하이픈), 그래도 없으면 `:` 로 폴백.
  const sepMatch =
    text.match(/\s+[—–]\s+/) ?? text.match(/\s+-\s+/) ?? text.match(/\s*:\s+/);
  if (sepMatch && sepMatch.index !== undefined) {
    const name = text.slice(0, sepMatch.index).trim();
    const desc = text.slice(sepMatch.index + sepMatch[0].length).trim();
    return { name, desc, status };
  }
  return { name: text, desc: '', status };
}

/**
 * docs/UX-FLOW.md 문자열 → UxFlow.
 * 단계(`## `)가 하나도 없으면 null (빈 상태 렌더용).
 */
export function parseUxFlow(md: string | null): UxFlow | null {
  if (!md || !md.trim()) return null;
  const lines = md.split(/\r?\n/);

  let title = 'UX Flow';
  let intro: string | undefined;
  let titleSeen = false;

  const steps: UxFlowStep[] = [];
  let current: UxFlowStep | null = null;
  // 현재 단계가 `### 기능` 섹션에 들어갔는지 — 이후 불릿은 메타 키와 이름이 같아도 기능으로 본다.
  let inFeatures = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // 제목 (#) — 첫 것만
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !titleSeen) {
      title = h1[1].trim();
      titleSeen = true;
      continue;
    }

    // 단계 (##)
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const headingText = h2[1].trim();
      // 뱃지 번호는 항상 문서 순서(1..N) — 작성자가 번호를 건너뛰거나 중복해도 깔끔.
      // 명시 번호는 라벨에서 떼어내는 용도로만 쓴다.
      const numMatch = headingText.match(/^(\d+)\s*[.)]\s*(.+)$/);
      const index = steps.length + 1;
      const label = numMatch ? numMatch[2].trim() : headingText;
      current = { index, label, features: [] };
      steps.push(current);
      inFeatures = false;
      continue;
    }

    // `### 기능` — 이후 불릿은 기능 섹션. (메타 키와 이름이 같은 기능이 삼켜지는 것 방지)
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      if (current) inFeatures = /기능|feature/i.test(h3[1].trim());
      continue;
    }

    if (!current) {
      // 제목과 첫 ## 사이의 첫 인용 = intro
      const q = line.match(/^>\s?(.+)$/);
      if (q && intro === undefined) intro = q[1].trim();
      continue;
    }

    // 단계 본문 ──────────────────────────────
    // 요약 (첫 >)
    const q = line.match(/^>\s?(.+)$/);
    if (q && current.summary === undefined) {
      current.summary = q[1].trim();
      continue;
    }

    // 불릿
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const body = bullet[1].trim();
      // 메타 불릿: `키: 값` (시안/묻기/정하기/채워짐/산출물). 단, `### 기능` 안에서는
      // 이름이 메타 키와 같아도 기능으로 취급한다. 그 밖의 불릿은 기능.
      const meta = inFeatures
        ? null
        : body.match(/^(시안|묻기|정하기|채워짐|산출물)\s*[:：]\s*(.+)$/);
      if (meta) {
        const value = meta[2].trim();
        switch (meta[1]) {
          case '시안': current.designRef = value; break;
          case '묻기': current.ask = value; break;
          case '정하기': current.decide = value; break;
          case '채워짐': current.fills = value; break;
          case '산출물': current.output = value; break;
        }
        continue;
      }
      current.features.push(parseFeature(body));
      continue;
    }
    // ### 기능 같은 헤더·빈 줄·일반 텍스트는 무시
  }

  if (steps.length === 0) return null;
  return { title, intro, steps };
}
