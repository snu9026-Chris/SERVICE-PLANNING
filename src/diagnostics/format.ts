/**
 * 자동 에러 수집 직렬화 (ADR-021) — 순수 함수, vscode 비의존 → 하네스로 검증 가능.
 *
 * 수집 스냅샷(AutoErrorEntry[]) → error.auto.md 본문.
 * collector.ts(vscode 의존)와 분리해, 포맷 로직만 단위 테스트 가능하게 둔다.
 */

import { AutoErrorEntry } from '../types';

/**
 * 자동 수집 스냅샷 → error.auto.md 본문.
 * 빈 입력이면 "현재 없음" 안내. diagnostic은 파일별 그룹, task 실패는 별도 묶음.
 */
export function formatAutoErrorsMarkdown(entries: AutoErrorEntry[]): string {
  const header = `# Error History (자동 수집)

> 확장이 진단(컴파일·린트)·태스크 실패에서 **자동 기록**한 파생 로그입니다 (ADR-021).
> 진실 원본 아님 — 지워도 다시 채워집니다. 수동 기록은 \`error.history.md\`를 보세요.
`;

  if (entries.length === 0) {
    return `${header}\n_현재 수집된 에러가 없습니다._\n`;
  }

  const tasks = entries.filter(e => e.kind === 'task');
  const diags = entries.filter(e => e.kind === 'diagnostic');

  let body = '';

  if (tasks.length > 0) {
    body += `\n## Task 실패 (${tasks.length})\n\n`;
    for (const t of tasks) body += `- ${t.message}\n`;
  }

  if (diags.length > 0) {
    body += `\n## 진단 에러 (${diags.length})\n`;
    // 파일별 그룹
    const byFile = new Map<string, AutoErrorEntry[]>();
    for (const d of diags) {
      const key = d.file ?? '(unknown)';
      if (!byFile.has(key)) byFile.set(key, []);
      byFile.get(key)!.push(d);
    }
    for (const [file, list] of byFile) {
      body += `\n### ${file}\n\n`;
      for (const d of list) {
        const loc = d.line != null ? `L${d.line}` : '';
        const src = d.source ? ` (${d.source})` : '';
        body += `- ${loc ? `[${loc}] ` : ''}${d.message}${src}\n`;
      }
    }
  }

  return `${header}${body}`;
}
