/**
 * BUILD TARGET 감지·매핑 (ADR-016). 순수 함수, vscode/fs 비의존 → 하네스 검증 가능.
 *
 * - detectBuildTarget(signals): 프로젝트 파일 시그널 → 산출물 타입 자동 추론
 * - explicitBuildTarget(type, stack?): state.md 명시 필드 → 정규화된 BuildTarget
 * 둘 다 같은 메타 레지스트리(라벨·아이콘)를 쓴다.
 */

import { BuildTarget, ProjectSignals, PackageJsonShape } from '../types';

interface TargetMeta { type: string; label: string; icon: string; }

/** 타입 → 표시 메타. 순서는 무관(조회용). */
const REGISTRY: Record<string, TargetMeta> = {
  website: { type: 'website', label: 'Website', icon: '🌐' },
  'vscode-extension': { type: 'vscode-extension', label: 'VS Code Extension', icon: '📦' },
  tauri: { type: 'tauri', label: 'Tauri App', icon: '🖥️' },
  electron: { type: 'electron', label: 'Electron App', icon: '⚛️' },
  mobile: { type: 'mobile', label: 'Mobile App', icon: '📱' },
  cli: { type: 'cli', label: 'CLI', icon: '🔧' },
  library: { type: 'library', label: 'Library', icon: '📚' },
};

/** 명시 필드의 자유 표기를 정식 type 키로 정규화. */
const TYPE_ALIASES: Record<string, string> = {
  vsix: 'vscode-extension',
  extension: 'vscode-extension',
  'vscode-ext': 'vscode-extension',
  vscode: 'vscode-extension',
  web: 'website',
  site: 'website',
  homepage: 'website',
  webapp: 'website',
  native: 'tauri',
  desktop: 'electron',
  lib: 'library',
  package: 'library',
  app: 'mobile',
};

function normalizeType(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/\s+/g, '-');
  if (REGISTRY[t]) return t;
  return TYPE_ALIASES[t] ?? t;
}

/** 명시 필드 묶음 — state.md `## Build target`의 선택 값들 (ADR-016 2축). */
export interface ExplicitFields {
  stack?: string;
  run?: string;
  dist?: string;
  confidence?: string;
}

/**
 * state.md `## Build target`의 명시 type + 선택 필드 → BuildTarget.
 * 알 수 없는 type이면 라벨을 입력값 그대로 쓰고 아이콘은 기본(🧩).
 */
export function explicitBuildTarget(rawType: string | undefined, fields: ExplicitFields = {}): BuildTarget | null {
  if (!rawType || !rawType.trim()) return null;
  const type = normalizeType(rawType);
  const meta = REGISTRY[type];
  const label = meta?.label ?? rawType.trim();
  const icon = meta?.icon ?? '🧩';
  const out: BuildTarget = { type, label, icon, source: 'explicit' };
  const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  if (clean(fields.stack)) out.stack = clean(fields.stack);
  if (clean(fields.run)) out.run = clean(fields.run);
  if (clean(fields.dist)) out.dist = clean(fields.dist);
  if (clean(fields.confidence)) out.confidence = clean(fields.confidence);
  return out;
}

function allDeps(pkg: PackageJsonShape | null): Record<string, string> {
  if (!pkg) return {};
  return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

function has(deps: Record<string, string>, names: string[]): boolean {
  return names.some(n => Object.prototype.hasOwnProperty.call(deps, n));
}

const WEB_FRAMEWORKS = [
  'next', 'nuxt', 'astro', 'gatsby', 'remix', '@remix-run/react',
  '@sveltejs/kit', 'svelte', 'vite', '@angular/core', 'react-scripts', 'vue',
];

/**
 * 시그널 → 산출물 타입 자동 감지. 우선순위 순서가 중요
 * (Tauri/Electron은 프론트엔드 프레임워크도 함께 쓰므로 먼저 가른다).
 */
export function detectBuildTarget(s: ProjectSignals): BuildTarget | null {
  const pkg = s.packageJson;
  const deps = allDeps(pkg);
  const mk = (type: string): BuildTarget => ({ ...REGISTRY[type], source: 'detected' });

  // 1) Tauri
  if (s.hasTauriConf || has(deps, ['@tauri-apps/api', '@tauri-apps/cli'])) return mk('tauri');
  // 2) Electron
  if (has(deps, ['electron', 'electron-builder'])) return mk('electron');
  // 3) Mobile (RN/Expo)
  if (has(deps, ['react-native', 'expo'])) return mk('mobile');
  // 4) VS Code Extension
  if (pkg?.engines?.vscode || pkg?.contributes !== undefined || has(deps, ['@types/vscode', 'vscode'])) {
    return mk('vscode-extension');
  }
  // 5) Website (웹 프레임워크 또는 index.html)
  if (has(deps, WEB_FRAMEWORKS) || s.hasIndexHtml) return mk('website');
  // 6) CLI
  if (pkg?.bin !== undefined) return mk('cli');
  // 7) Library (엔트리 있고 웹 아님)
  if (pkg && (pkg.main !== undefined || pkg.module !== undefined || pkg.exports !== undefined)) {
    return mk('library');
  }
  return null;
}
