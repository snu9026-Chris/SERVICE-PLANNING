/**
 * Extension entry point — VS Code가 호출하는 activate / deactivate.
 *
 * 책임 (orchestrator):
 *   - 워크스페이스 폴더 식별
 *   - file-watcher, parser, sidebar, webview 도메인 wire-up
 *   - 모든 .md 초기 로드 (state, roadmap, PRODUCT/DESIGN/ARCH, error.history)
 *   - 명령 등록 (blueprint.showDashboard / refresh / showArtifact / preview)
 *
 * 데이터 흐름:
 *   .md 변경 → watcher → 해당 파일 다시 읽음 → panel/sidebar setter 호출
 *   active editor 변경 → SidebarPayload 새로 빌드 → sidebar.update
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileWatcher } from './file-watcher/watcher';
import { parseState } from './parser/state';
import { detectBuildTarget } from './parser/build-target';
import { SidebarViewProvider, SIDEBAR_VIEW_ID } from './sidebar/sidebar-view-provider';
import { BlueprintWebviewPanel, TabId } from './webview/panel';
import { ERROR_HISTORY_TEMPLATE } from './webview/pages/errors';
import {
  FileChangeEvent,
  BlueprintState,
  SidebarPayload,
  ActiveFileInfo,
  BuildTarget,
  PackageJsonShape,
} from './types';

let watcher: FileWatcher | undefined;
let sidebarProvider: SidebarViewProvider | undefined;
let webviewPanel: BlueprintWebviewPanel | undefined;
let currentState: BlueprintState | null = null;
let currentFolder: vscode.WorkspaceFolder | undefined;
/** 자동감지된 산출물 타입 (state.md 명시 필드 없을 때 fallback, ADR-016) */
let detectedBuildTarget: BuildTarget | null = null;

const RELATIVE_PATHS = {
  state: '.blueprint/state.md',
  roadmap: 'plans/roadmap.md',
  product: 'docs/PRODUCT.md',
  feasibility: 'docs/FEASIBILITY.md',
  design: 'docs/DESIGN.md',
  architecture: 'docs/ARCHITECTURE.md',
  uxQuality: 'docs/UX-QUALITY.md',
  qaReport: 'docs/qa.report.md',
  errorHistory: 'docs/error.history.md',
};

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return;
  currentFolder = folders[0];

  // ── Webview 패널 ──
  webviewPanel = new BlueprintWebviewPanel(context, currentFolder, {
    onCreateErrorHistory: () => createErrorHistory(),
    onPreviewFileClick: (rel) => pushPreviewNoSwitch(rel),
  });

  // ── Sidebar Webview Provider ──
  sidebarProvider = new SidebarViewProvider(
    vscode.Uri.file(context.extensionPath),
    (phaseKey: string) => {
      void webviewPanel?.showArtifact(phaseKey);
    },
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // ── File watcher ──
  watcher = new FileWatcher(currentFolder);
  watcher.start();
  watcher.on('file-changed', (event: FileChangeEvent) => {
    void handleFileChange(event);
  });

  // ── 활성 에디터 변경 ──
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => refreshSidebar()),
  );

  // ── 초기 로드 (모든 .md 읽어서 panel/sidebar에 전달) ──
  await loadAll();

  // ── 명령 등록 ──
  context.subscriptions.push(
    vscode.commands.registerCommand('blueprint.showDashboard', (tab?: TabId) => {
      webviewPanel?.show(tab);
    }),
    vscode.commands.registerCommand('blueprint.refresh', async () => {
      await loadAll();
    }),
    vscode.commands.registerCommand(
      'blueprint.showArtifact',
      async (phaseKey: string) => {
        await webviewPanel?.showArtifact(phaseKey);
      },
    ),
    vscode.commands.registerCommand(
      'blueprint.preview',
      async (filePath: string) => {
        await pushPreview(filePath);
      },
    ),
  );

  // ── 정리 ──
  context.subscriptions.push({
    dispose: () => {
      watcher?.dispose();
      webviewPanel?.dispose();
      watcher = undefined;
      webviewPanel = undefined;
      sidebarProvider = undefined;
      currentState = null;
      currentFolder = undefined;
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// File change → 분기
// ─────────────────────────────────────────────────────────────────

async function handleFileChange(event: FileChangeEvent): Promise<void> {
  if (!currentFolder) return;
  const rel = path
    .relative(currentFolder.uri.fsPath, event.path)
    .replace(/\\/g, '/');

  switch (rel) {
    case RELATIVE_PATHS.state:
      await reloadState();
      break;
    case RELATIVE_PATHS.roadmap:
      await reloadRoadmap();
      break;
    case RELATIVE_PATHS.product:
      await reloadArtifact('product');
      break;
    case RELATIVE_PATHS.feasibility:
      await reloadArtifact('feasibility');
      break;
    case RELATIVE_PATHS.design:
      await reloadArtifact('design');
      break;
    case RELATIVE_PATHS.architecture:
      await reloadArtifact('architecture');
      break;
    case RELATIVE_PATHS.uxQuality:
      await reloadArtifact('uxQuality');
      break;
    case RELATIVE_PATHS.qaReport:
      await reloadQaReport();
      break;
    case RELATIVE_PATHS.errorHistory:
      await reloadErrorHistory();
      break;
    default:
      if (rel.startsWith('docs/design/screenshots/') && rel.endsWith('.html')) {
        await reloadDesignFiles();
        await reloadSpecExtras();
      } else if (rel.startsWith('docs/design/')) {
        await reloadArtifact('design');
      } else if (rel.startsWith('docs/adr/') && rel.endsWith('.md')) {
        await reloadSpecExtras();
      }
      break;
  }

  // 사이드바는 모든 변경마다 refresh (recent changes 갱신)
  refreshSidebar();
}

// ─────────────────────────────────────────────────────────────────
// Loaders
// ─────────────────────────────────────────────────────────────────

async function loadAll(): Promise<void> {
  await Promise.all([
    reloadState(),
    reloadRoadmap(),
    reloadArtifact('product'),
    reloadArtifact('feasibility'),
    reloadArtifact('design'),
    reloadArtifact('architecture'),
    reloadArtifact('uxQuality'),
    reloadQaReport(),
    reloadErrorHistory(),
    reloadDesignFiles(),
    reloadSpecExtras(),
    reloadBuildTarget(),
  ]);
  refreshSidebar();
}

/**
 * 산출물 타입 자동 감지 (ADR-016) — package.json/tauri.conf.json/index.html 등 시그널 수집 후
 * 순수 detectBuildTarget에 위임. state.md 명시 필드가 있으면 그게 우선이라 이건 fallback.
 */
async function reloadBuildTarget(): Promise<void> {
  if (!currentFolder) { detectedBuildTarget = null; return; }
  const root = currentFolder.uri.fsPath;

  const pkgRaw = await readFileSafe(currentFolder, 'package.json');
  let packageJson: PackageJsonShape | null = null;
  if (pkgRaw) {
    try { packageJson = JSON.parse(pkgRaw) as PackageJsonShape; } catch { packageJson = null; }
  }

  const [hasTauriConf, hasIndexHtml, hasCargoToml] = await Promise.all([
    fileExists(path.join(root, 'src-tauri', 'tauri.conf.json')).then(v => v || fileExists(path.join(root, 'tauri.conf.json'))),
    fileExists(path.join(root, 'index.html'))
      .then(v => v || fileExists(path.join(root, 'public', 'index.html')))
      .then(v => v || fileExists(path.join(root, 'src', 'index.html'))),
    fileExists(path.join(root, 'Cargo.toml')),
  ]);

  detectedBuildTarget = detectBuildTarget({ packageJson, hasTauriConf, hasIndexHtml, hasCargoToml });
}

async function fileExists(fullPath: string): Promise<boolean> {
  try { await fs.promises.access(fullPath); return true; } catch { return false; }
}

async function reloadSpecExtras(): Promise<void> {
  if (!currentFolder) return;
  const root = currentFolder.uri.fsPath;
  const [adrFiles, designHtmlFiles] = await Promise.all([
    collectMdFiles(path.join(root, 'docs', 'adr'), root),
    collectHtmlFilesWithContent(path.join(root, 'docs', 'design', 'screenshots'), root),
  ]);
  webviewPanel?.setSpecArtifacts({ adrFiles, designHtmlFiles });
}

async function collectMdFiles(dir: string, rootFs: string): Promise<Array<{ relativePath: string; name: string; content?: string }>> {
  const result: Array<{ relativePath: string; name: string; content?: string }> = [];
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(rootFs, full).replace(/\\/g, '/');
        let content: string | undefined;
        try { content = await fs.promises.readFile(full, 'utf-8'); } catch { /* skip */ }
        result.push({ relativePath: rel, name: entry.name, content });
      }
    }
  } catch { /* 폴더 없음 */ }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

async function collectHtmlFilesWithContent(dir: string, rootFs: string): Promise<Array<{ relativePath: string; name: string; content?: string }>> {
  const result: Array<{ relativePath: string; name: string; content?: string }> = [];
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        const full = path.join(dir, entry.name);
        const rel = path.relative(rootFs, full).replace(/\\/g, '/');
        let content: string | undefined;
        try { content = await fs.promises.readFile(full, 'utf-8'); } catch { /* skip */ }
        result.push({ relativePath: rel, name: entry.name, content });
      }
    }
  } catch { /* 폴더 없음 */ }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

async function reloadDesignFiles(): Promise<void> {
  if (!currentFolder) return;
  const designDir = path.join(currentFolder.uri.fsPath, 'docs', 'design');
  try {
    const files = await collectHtmlFilesDeep(designDir, currentFolder.uri.fsPath);
    webviewPanel?.setDesignFiles(files);
  } catch {
    webviewPanel?.setDesignFiles([]);
  }
}

async function collectHtmlFilesDeep(dir: string, rootFs: string): Promise<{ relativePath: string; name: string; content?: string }[]> {
  const result: { relativePath: string; name: string; content?: string }[] = [];
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = await collectHtmlFilesDeep(full, rootFs);
        result.push(...sub);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        const rel = path.relative(rootFs, full).replace(/\\/g, '/');
        let content: string | undefined;
        try { content = await fs.promises.readFile(full, 'utf-8'); } catch { /* skip */ }
        result.push({ relativePath: rel, name: entry.name, content });
      }
    }
  } catch {
    // 폴더 없거나 접근 불가
  }
  return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function reloadState(): Promise<void> {
  if (!currentFolder) return;
  const md = await readFileSafe(currentFolder, RELATIVE_PATHS.state);
  currentState = md ? parseState(md) : null;
  webviewPanel?.setBlueprintState(currentState);
}

async function reloadRoadmap(): Promise<void> {
  if (!currentFolder) return;
  const md = await readFileSafe(currentFolder, RELATIVE_PATHS.roadmap);
  webviewPanel?.setRoadmap(md);
}

async function reloadArtifact(kind: 'product' | 'feasibility' | 'design' | 'architecture' | 'uxQuality'): Promise<void> {
  if (!currentFolder) return;
  const relPath = RELATIVE_PATHS[kind];
  const md = await readFileSafe(currentFolder, relPath);
  webviewPanel?.setSpecArtifacts({ [kind]: md });
}

async function reloadQaReport(): Promise<void> {
  if (!currentFolder) return;
  const md = await readFileSafe(currentFolder, RELATIVE_PATHS.qaReport);
  webviewPanel?.setQaReport(md);
}

async function reloadErrorHistory(): Promise<void> {
  if (!currentFolder) return;
  const md = await readFileSafe(currentFolder, RELATIVE_PATHS.errorHistory);
  webviewPanel?.setErrorHistory(md);
}

// ─────────────────────────────────────────────────────────────────
// Preview push
// ─────────────────────────────────────────────────────────────────

async function pushPreview(filePathInput: string): Promise<void> {
  await pushPreviewInternal(filePathInput, true);
}

/** 사이드 listing 클릭 시: 탭 전환 없이 콘텐츠만 교체 (이미 Preview 탭 안) */
async function pushPreviewNoSwitch(filePathInput: string): Promise<void> {
  await pushPreviewInternal(filePathInput, false);
}

async function pushPreviewInternal(filePathInput: string, autoSwitch: boolean): Promise<void> {
  if (!currentFolder) return;
  let fullPath = filePathInput;
  if (!path.isAbsolute(filePathInput)) {
    fullPath = path.join(currentFolder.uri.fsPath, filePathInput);
  }
  try {
    const html = await fs.promises.readFile(fullPath, 'utf-8');
    const rel = path.relative(currentFolder.uri.fsPath, fullPath).replace(/\\/g, '/');
    webviewPanel?.setPreviewContent(html, rel, autoSwitch);
  } catch (err) {
    vscode.window.showErrorMessage(`Blueprint: 파일을 읽을 수 없음 — ${filePathInput}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Errors page — 파일 생성
// ─────────────────────────────────────────────────────────────────

async function createErrorHistory(): Promise<void> {
  if (!currentFolder) return;
  const fullPath = path.join(currentFolder.uri.fsPath, RELATIVE_PATHS.errorHistory);
  try {
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, ERROR_HISTORY_TEMPLATE, 'utf-8');
    await reloadErrorHistory();
    vscode.window.showInformationMessage('Blueprint: error.history.md 생성됨.');
  } catch (err) {
    vscode.window.showErrorMessage(`Blueprint: 파일 생성 실패 — ${String(err)}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Sidebar payload
// ─────────────────────────────────────────────────────────────────

function refreshSidebar(): void {
  if (!sidebarProvider || !currentFolder) return;
  sidebarProvider.update(buildSidebarPayload(currentFolder));
}

function buildSidebarPayload(folder: vscode.WorkspaceFolder): SidebarPayload {
  return {
    state: currentState,
    recentChanges: watcher?.getRecentChanges() ?? [],
    activeFile: getActiveFile(folder),
    workspaceFolderName: path.basename(folder.uri.fsPath),
    workspaceFolderPath: folder.uri.fsPath,
    // 명시(state.md) 우선, 없으면 자동감지 (ADR-016)
    buildTarget: currentState?.buildTarget ?? detectedBuildTarget,
  };
}

function getActiveFile(folder: vscode.WorkspaceFolder): ActiveFileInfo {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return { relativePath: null, language: null };
  const fileFsPath = editor.document.uri.fsPath;
  const folderFs = folder.uri.fsPath;
  if (!fileFsPath.toLowerCase().startsWith(folderFs.toLowerCase())) {
    return { relativePath: path.basename(fileFsPath), language: editor.document.languageId };
  }
  const rel = path.relative(folderFs, fileFsPath).replace(/\\/g, '/');
  return { relativePath: rel, language: editor.document.languageId };
}

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────

async function readFileSafe(folder: vscode.WorkspaceFolder, relPath: string): Promise<string | null> {
  const full = path.join(folder.uri.fsPath, relPath);
  try {
    return await fs.promises.readFile(full, 'utf-8');
  } catch {
    return null;
  }
}

export function deactivate(): void {
  watcher?.dispose();
  webviewPanel?.dispose();
  watcher = undefined;
  webviewPanel = undefined;
  sidebarProvider = undefined;
  currentState = null;
  currentFolder = undefined;
}
