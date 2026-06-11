# SETUP — 다른 컴퓨터에서 처음부터 쓰기

이 저장소 하나만 clone 하면 **Blueprint Dashboard 확장 + `/blueprint` 워크플로**를 새 머신에서 그대로 굴릴 수 있다.
gstack(공개 MIT repo)만 받는 사람이 직접 설치하고, 나머지(blueprint 스킬·확장 소스)는 이 repo에 동봉돼 있다.

## 구성 요소

| # | 무엇 | 어디서 | 비고 |
|---|---|---|---|
| 1 | **gstack** | 공개 GitHub repo | `/blueprint`가 위임하는 스킬(office-hours, autoplan, qa, ship, code-review …). 바이너리+크로미움 포함 → 직접 설치 |
| 2 | **blueprint 스킬** (커스텀) | 이 repo `skills/blueprint/` | `~/.claude/skills/`로 복사 → `/blueprint` 등록. **Phase 0 TARGET 인터뷰(2축 산출물 타입) 포함** |
| 3 | **확장(소스+.vsix)** | 이 repo 루트 / `src/` | 사이드바·webview 계기판. state.md·산출물 시각화 뷰어, **AI 호출 없음**(단방향 `.md`→UI) |

> ⚠️ **중요**: blueprint 스킬은 `~/.claude/skills/blueprint/`(전역)에 사는데, git에는 `skills/blueprint/`로 vendor돼 있다.
> 이 repo의 `skills/blueprint/`가 **진실 원본**이다. 전역 스킬을 직접 고쳤으면 반드시 repo로 동기화 후 커밋할 것 (아래 "유지보수" 참고).

---

## 사전 준비 (prereqs)

- **Node.js 18+** (확장 빌드 — esbuild/tsc/vsce)
- **VS Code 또는 Antigravity** (확장 호스트)
- **git**
- (gstack 빌드용) **bun** — 없으면 gstack `./setup`이 안내. macOS/Linux는 자동 설치, Windows는 `irm bun.sh/install.ps1 | iex`

---

## 4단계 설치

### 1) gstack 설치 (한 번만)

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack \
  && cd ~/.claude/skills/gstack && ./setup
```

> 이미 gstack을 쓰던 머신이면 건너뛴다. 최신화는 `/gstack-upgrade` (이 프로젝트는 **v1.57.x** 기준으로 검증됨).
> Windows는 파일 복사 방식이라 `git pull` 후 매번 `./setup` 재실행 필요.

### 2) blueprint 스킬 설치

이 repo의 `skills/blueprint/` 폴더를 `~/.claude/skills/`로 복사한다.

**PowerShell (Windows):**
```powershell
Copy-Item -Recurse -Force ".\skills\blueprint" "$env:USERPROFILE\.claude\skills\blueprint"
```

**bash (macOS/Linux):**
```bash
cp -r ./skills/blueprint ~/.claude/skills/blueprint
```

> blueprint는 INIT 시 `~/.claude/skills/blueprint/templates/` 를 참조하므로 반드시 이 위치로 복사.

### 3) 확장 빌드 & 설치

**권장 — 소스에서 빌드** (어느 버전이든 재현 가능):
```bash
npm install          # 의존성 (markdown-it 등)
npm run qa           # 자동 하네스 검증 — 143/143 PASS여야 정상
npm run build        # out/extension.js 번들
npx vsce package     # blueprint-dashboard-<version>.vsix 생성
code --install-extension blueprint-dashboard-0.11.0.vsix
```

**빠른 경로 — 동봉된 .vsix 바로 설치:**
```bash
code --install-extension blueprint-dashboard-0.11.0.vsix
```
> Antigravity는 명령 팔레트(Ctrl+Shift+P) → **Extensions: Install from VSIX...** → 파일 선택.

### 4) 재시작

VS Code/Antigravity 재시작(또는 **Developer: Reload Window**) → 활동바에 **Blueprint** 아이콘.

---

## 확인 (verify)

1. **확장 빌드 무결**: `npm run qa` → `143/143 PASS`, `npx tsc --noEmit` → 에러 0.
2. **사이드바 계기판**: 워크스페이스에 `.blueprint/state.md`가 있으면 → Hero에 **BUILD TARGET 배지**(예: 📦 VS Code Extension, phase 위) + phase 진행도. 없으면 "감지 안 됨" 안내(정상).
3. **워크플로**: Claude Code에서 `/blueprint` → INIT/RESUME 모드. 신규 프로젝트면 **Phase 0에서 "무엇을 만드나 + 어떻게 실행/배포"** 를 물어본다(TARGET 서브-인터뷰).
4. **webview 5탭**: Plan · Spec · Preview(DESIGN TOKENS 패널) · QA · Errors.

---

## 환경 의존성 (repo 밖 — 선택)

아래는 `~/.claude/`(전역)에 사는 개인 환경 설정이라 clone에 안 따라온다. 같은 경험을 원하면 수동 복제:

| 무엇 | 위치 | 역할 |
|---|---|---|
| 자연어→전문용어 번역 hook | `~/.claude/dev-term-hook.md` + settings.json `UserPromptSubmit` | 매 프롬프트 앞에 용어 번역 블록 출력 |
| HISTORY 자동 기록 hook | `~/.claude/hooks/save-history.ps1` + settings.json `Stop` | 응답마다 `HISTORY.md` append |
| 전역 작업 규칙 | `~/.claude/CLAUDE.md` | DIGEST/HISTORY 운영 규칙 |

`~/.claude/settings.json` hook 등록 예 (Windows):
```jsonc
"hooks": {
  "Stop": [{ "matcher": "", "hooks": [
    { "type": "command", "command": "powershell -NoProfile -ExecutionPolicy Bypass -File C:\\Users\\<you>\\.claude\\hooks\\save-history.ps1" }]}],
  "UserPromptSubmit": [{ "hooks": [
    { "type": "command", "command": "node -e \"const p=require('path').join(require('os').homedir(),'.claude','dev-term-hook.md');process.stdout.write(require('fs').readFileSync(p,'utf8'))\"" }]}]
}
```

**gstack 설정 권장값** (`~/.gstack/config.yaml`):
- `codex_reviews: enabled` — 이 프로젝트는 리뷰 게이트 중심이라 켜둠(끄려면 `disabled`). codex CLI 설치 시 `/ship`·`/review`에 자동 적용.

---

## 유지보수 (중요)

- **blueprint 스킬을 고쳤다면**: 전역(`~/.claude/skills/blueprint/`)만 고치면 git에 안 잡힌다. 반드시 repo로 동기화:
  ```bash
  cp -Rf ~/.claude/skills/blueprint/. ./skills/blueprint/   # 그리고 커밋
  ```
- **확장을 고쳤다면**: `npm run qa` 통과 → `npm run build` → 버전 범프 → `npx vsce package`.
- **업데이트 받기**: 이 repo `git pull` 후 2)·3) 재실행. gstack은 `/gstack-upgrade`.

---

## 의존성 메모 (왜 이렇게 나눴나)

- **확장은 gstack을 호출하지 않는다.** 순수 뷰어(단방향 `.blueprint/state.md` → UI). `/blueprint` 스킬만 gstack에 위임.
- **gstack 스킬은 `.md`만 떠올 수 없다.** SKILL.md가 `bin/*` 바이너리 + 크로미움에 묶여 있어 설치본이 있어야 동작 → 직접 설치 방식.
- **blueprint를 포크/추출하지 않은 이유**: gstack이 상류에서 유지·튜닝되므로 위임이 가장 안정적. blueprint(커스텀)만 vendor.
