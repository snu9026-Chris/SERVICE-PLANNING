/**
 * DESIGN.md → 디자인 토큰 추출 (JTBD5). 순수 함수, vscode 비의존 → 하네스로 검증 가능.
 *
 * DESIGN.md 안의 hex/rgba 색상과 폰트 family를 정규식으로 뽑아
 * Preview 탭 상단 "DESIGN TOKENS" 스와치 패널로 렌더한다.
 * (DESIGN.md §자동 시각화가 명세한 "색 swatch 자동 삽입 + 폰트 family 자동 샘플"의 구현.)
 */

export interface ColorToken {
  /** CSS에 그대로 쓸 수 있는 색 문자열 (예: '#007aff', 'rgba(60, 60, 67, 0.1)') */
  value: string;
  /** 표 행의 '용도' 라벨 (있으면). 예: '페이지 배경 (시작)' */
  label?: string;
}

export interface DesignTokens {
  colors: ColorToken[];
  fonts: string[];
}

/**
 * #rgb ~ #rrggbbaa 또는 rgb()/rgba().
 * rgba 분기는 괄호 안에 숫자가 최소 1개 있어야 매치 — 본문의 `rgba(...)` 설명 텍스트 오탐 방지.
 */
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d[0-9.,\s%]*\)/g;

/** 폰트 fallback·generic 키워드 — 스와치로 띄울 가치 없음 */
const GENERIC_FONTS = new Set([
  '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'system-ui',
  'ui-sans-serif', 'sans-serif', 'serif', 'monospace',
]);

export function extractDesignTokens(md: string | null): DesignTokens {
  if (!md) return { colors: [], fonts: [] };

  // ── 색상: 등장 순서 유지 + 라벨은 나중에 표 행에서 발견되면 보강(upgrade) ──
  const colorMap = new Map<string, ColorToken>();
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim();
    const matches = line.match(COLOR_RE);
    if (!matches) continue;

    // 표 행이면 첫 셀(용도)을 라벨로
    let label: string | undefined;
    if (line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      const first = cells[0];
      if (first && first !== '---' && !/^(#|rgba?\()/.test(first)) {
        label = first.replace(/`/g, '').trim() || undefined;
      }
    }

    for (const m of matches) {
      const key = m.toLowerCase().replace(/\s+/g, '');
      const existing = colorMap.get(key);
      if (existing) {
        if (!existing.label && label) existing.label = label;
        continue;
      }
      colorMap.set(key, label ? { value: m, label } : { value: m });
    }
  }

  // ── 폰트: 폰트 문맥 라인의 따옴표 family. " Variable" 접미 제거 후 dedup ──
  const fonts: string[] = [];
  const fontSeen = new Set<string>();
  for (const rawLine of md.split('\n')) {
    if (!/폰트|font|family/i.test(rawLine)) continue;
    const quoted = rawLine.match(/"([^"]+)"/g);
    if (!quoted) continue;
    for (const q of quoted) {
      const base = q.replace(/"/g, '').replace(/\s+variable$/i, '').trim();
      const norm = base.toLowerCase();
      if (base.length < 2 || GENERIC_FONTS.has(norm) || fontSeen.has(norm)) continue;
      fontSeen.add(norm);
      fonts.push(base);
    }
  }

  return { colors: Array.from(colorMap.values()), fonts };
}
