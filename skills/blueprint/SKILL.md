---
name: blueprint
description: |
  신규 프로젝트 워크플로 오케스트레이터. 0)PRODUCT → 0.5)FEASIBILITY → 1)DESIGN →
  2)ARCHITECTURE → 3)IMPLEMENT → 4)CHECKPOINT → 5)SHIP → 6)POST-SHIP 의 파이프라인을 관리한다.
  각 phase는 기존 gstack 스킬(/office-hours, /design-consultation, /autoplan, /qa,
  /ship 등)에 위임한다. 직접 일하지 않고 라우터 역할만 한다.

  사용 시점:
  - 새 프로젝트 시작: `/blueprint` (init mode 자동 감지)
  - 진행 중 재개: `/blueprint` (resume mode)
  - 중간 점검: `/blueprint check`

  Auto-scaffolds: docs/PRODUCT.md, docs/FEASIBILITY.md, docs/DESIGN.md,
  docs/ARCHITECTURE.md, docs/adr/, plans/, .blueprint/state.md, CLAUDE.md.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - TodoWrite
  - Skill
  - WebSearch
  - WebFetch
---

# /blueprint — Development workflow orchestrator

## 절대 원칙 — anti-cognitive-overload

이 스킬의 존재 이유는 *사용자 인지 과부하 감소*. 다음 위반 시 스킬 가치 사라짐:

1. **한 턴에 질문 하나만.** 5개 묶지 않는다.
2. **항상 RECOMMENDATION 먼저.** AskUserQuestion 첫 옵션에 추천안과 이유.
3. **Phase 전환 시 TodoWrite 자동 갱신.** 사용자가 손으로 안 함.
4. **state.md는 50줄 미만 유지.** 길어지면 세부는 docs/로 위임.
5. **재개 시 첫 줄은 "Last session: ..." 한 줄 요약.** 사용자가 기억 복원할 필요 없음.
6. **Phase 3(코딩) 진입 전 PRODUCT.md / ARCHITECTURE.md 검사. 비어있으면 하드 차단.**

## 시각화 우선순위 — 중요

**진실 원본은 `.blueprint/state.md`.** Antigravity에서 Ctrl+Shift+V로 마크다운 프리뷰 띄우고 탭 고정. 영구적으로 보임.

보조로 TodoWrite를 호출하지만 일부 IDE 버전에서 렌더 안 될 수 있음. **TodoWrite에 의존하지 말 것 — state.md가 primary.**

스캐폴딩 직후 사용자에게 *반드시* 안내:
> `.blueprint/state.md` 를 열고 Ctrl+Shift+V → 탭 고정해두세요. 진행 상황은 그 파일이 진실 원본입니다.

## 모드 감지 (호출 시 첫 동작)

```bash
if [ "$BLUEPRINT_ARG" = "check" ]; then
  echo "MODE: check"
elif [ -f .blueprint/state.md ]; then
  echo "MODE: resume"
else
  echo "MODE: init"
fi
```

사용자가 `/blueprint check` 라고 입력 → CHECK. 없고 state.md 없으면 INIT, 있으면 RESUME.

---

## INIT MODE

### Step 1: 단일 확인

AskUserQuestion (한 질문만):
- 질문: "현재 폴더 `{현재경로}` 에 새 블루프린트를 만들까요? `docs/`, `.blueprint/`, `plans/`, `CLAUDE.md` 가 생성됩니다."
- A) (Recommended) 만들기 — Completeness: 9/10
- B) 취소

B면 종료.

### Step 2: 스캐폴딩

```bash
mkdir -p .blueprint docs/adr plans
PROJECT_NAME=$(basename "$PWD")
TODAY=$(date +%Y-%m-%d)
SKILL_DIR=~/.claude/skills/blueprint/templates
```

각 템플릿 복사 + 치환:
- `$SKILL_DIR/state.md.tmpl` → `.blueprint/state.md`
- `$SKILL_DIR/PRODUCT.md.tmpl` → `docs/PRODUCT.md`
- `$SKILL_DIR/FEASIBILITY.md.tmpl` → `docs/FEASIBILITY.md`
- `$SKILL_DIR/DESIGN.md.tmpl` → `docs/DESIGN.md`
- `$SKILL_DIR/ARCHITECTURE.md.tmpl` → `docs/ARCHITECTURE.md`
- `$SKILL_DIR/roadmap.md.tmpl` → `plans/roadmap.md`
- `$SKILL_DIR/adr/ADR-template.md` → `docs/adr/ADR-template.md`
- `$SKILL_DIR/plans/feature.md.tmpl` → `plans/_template.md`

각 파일에서 `{{PROJECT_NAME}}` → 실제 폴더명, `{{DATE}}` → 오늘 날짜로 치환.

**CLAUDE.md 처리 — 기존 파일 보호:**
- 루트에 `CLAUDE.md` 없으면 → `$SKILL_DIR/CLAUDE.md.tmpl` → `CLAUDE.md` 복사 + 치환
- 있으면 → 끝에 `## Blueprint integration` 섹션만 append (덮어쓰지 않음)

### Step 3: TodoWrite 초기화 (보조)

7개 항목:
- Phase 0: PRODUCT — `status: in_progress`
- Phase 1: DESIGN — pending
- Phase 2: ARCHITECTURE — pending
- Phase 3: IMPLEMENT — pending
- Phase 4: CHECKPOINT (0 runs) — pending
- Phase 5: SHIP — pending
- Phase 6: POST-SHIP — pending

TodoWrite 안 보일 수 있으니 state.md 프리뷰 핀 안내 반드시 같이.

### Step 4: 다음 액션 안내 출력

```
✅ 스캐폴딩 완료.

다음 단계:
1. Antigravity에서 `.blueprint/state.md` 열고 Ctrl+Shift+V → 탭 고정 (필수)
2. /office-hours 호출해 docs/PRODUCT.md 채우기
3. 끝나면 /blueprint 다시 호출 → Phase 0.5 FEASIBILITY (실현가능성·의존성 검증)
4. 그 다음 Phase 1 DESIGN으로 진행
```

---

## RESUME MODE

### Step 1: state.md 읽고 첫 줄 요약 — 절대 원칙 #5

state.md 파싱 후 응답의 *맨 첫 줄*:
```
Last session: Phase {N} ({phase_name}) 완료. Next: {next_action_one_liner}.
```

### Step 2: 트리거 배너 (조건부)

state.md의 `## Triggers fired` 가 비어있지 않고 `quiet_until` 이 비어있거나 과거인 경우:

```
─────────────────────────────────
CHECKPOINT TRIGGER
조건: {fired conditions, comma-separated}
추천: /blueprint check
─────────────────────────────────
```

`strict_mode: true`인 경우 위 배너 대신 AskUserQuestion 사용 (블로킹):
- Q: "체크포인트 시점입니다 (strict 모드). 지금 점검?"
- A: 지금 점검 / B: 다음 phase 계속

### Step 3: 진입 질문 — 한 질문

AskUserQuestion:
- Q: "지금 무엇을 하실래요?"
- A) (Recommended) Phase {current} 계속
- B) 다른 Phase 점프
- C) /blueprint check 점검 모드

A → Phase delegation
B → AskUserQuestion follow-up (phase 0-6 중 선택)
C → CHECK MODE 진입

### Step 4: TodoWrite 동기화 (보조)

state.md의 진행도 읽어 TodoWrite 재구성. state.md ↔ TodoWrite 매핑:
- `[x]` → completed
- 현재 phase → in_progress
- 이후 → pending

---

## CHECK MODE — `/blueprint check`

`/blueprint check` 직접 호출 또는 RESUME → C 선택 시 진입.

### Step 1: 컨텍스트 스냅샷

```bash
git log --oneline -20 2>/dev/null || echo "no git history"
git diff --stat HEAD~5..HEAD 2>/dev/null || true
ls docs/adr/ 2>/dev/null
```

### Step 2: /code-review 위임

Skill 도구로 `/code-review` 호출. 결과 사용자에게 표시.

### Step 3: ADR 작성 여부 — 한 질문

AskUserQuestion:
- Q: "이번 점검에서 ADR로 기록할 결정이 있나요?"
- A) (Recommended) 있다 — 같이 작성
- B) 없다 — 건너뛰기

A면: ADR-{NNN}.md 생성. **한 번에 한 필드만 묻기** (Title → Context → Decision → Consequences 순). 절대 원칙 #1.

### Step 4: state.md 카운터 리셋

state.md 직접 편집:
- `ships_since_checkpoint` → 0
- `last_check` → 오늘 날짜
- `checkpoint_count` → +1
- `plans_without_arch_read` → 0
- `## Triggers fired` → (empty)

### Step 5: 체크포인트 기록 파일

`docs/checkpoint-{DATE}.md` 작성 (`$SKILL_DIR/checkpoint.md.tmpl` 사용).

---

## Phase delegation table — 진실 원본

| Phase | Sub-skill | Output | Hard gate |
|---|---|---|---|
| 0 | `/office-hours` | `docs/PRODUCT.md` | — |
| 0.5 | (직접 — 아래 FEASIBILITY 절차) | `docs/FEASIBILITY.md` | PRODUCT.md non-empty |
| 1 | `/design-consultation` + **UI Composition 인터뷰** | `docs/DESIGN.md` (UI Composition Decisions 섹션 채워짐) | PRODUCT.md non-empty, **FEASIBILITY.md soft-gate (비어있으면 경고만)** |
| 2 | `/autoplan` (CEO+Design+Eng 묶음) | `docs/ARCHITECTURE.md` + `plans/*.md` | PRODUCT.md non-empty, **DESIGN.md UI Composition 비어있지 않음** |
| 3 | (코딩) — 필요시 `/investigate`, `/codex` | source code | **PRODUCT + ARCHITECTURE non-empty + UI Composition non-empty** |
| 4 | `/code-review` + `/retro` | `docs/adr/`, checkpoint 파일 | — |
| 5 | `/qa` → `/review` → `/ship` | merged PR | tests pass |
| 6 | `/land-and-deploy` → `/document-release` → `/retro` | deployed app | shipped |

### FEASIBILITY 절차 — Phase 0.5 (의존성·실현가능성 검증, ADR-011)

PRODUCT 다음, DESIGN 전. sub-skill 없이 /blueprint가 직접 수행. 목적: 각 JBT가
*구현 가능한가 / 무엇이 필요한가 / 근거는?* 를 `docs/FEASIBILITY.md`에 박는다.

핵심 규칙 (ADR-011):
- **차단하지 않는다 (soft gate).** ❌가 나와도 기록만 하고 진행. 최종 판단은 사용자.
- **불확실한 것만 웹서칭.** Claude가 이미 아는 흔한 스택(React/FastAPI/VS Code API 등)은
  지식으로 ✅ 판정. 애매·최신·니치·가격 변동 가능한 API만 WebSearch/WebFetch로 실제 확인.

절차:
1. `docs/PRODUCT.md`의 Jobs-to-be-done 목록을 읽는다.
2. 각 JBT마다 판정: ✅ 가능 / ⚠️ 조건부 / ❌ 불가. 필요한 도구·API·라이브러리 적시.
3. 판정이 **불확실한 항목만** 골라 WebSearch로 실존·버전·제약·비용 확인 → 근거 링크 확보.
   (확실한 건 검색 생략 — 단계가 무거워지지 않게.)
4. `docs/FEASIBILITY.md` 작성:
   - Feasibility matrix (JBT별 가능여부 + 필요 도구 + 근거)
   - 외부 의존성 요약 (버전·비용·리스크)
   - 검증 메모 (웹서칭한 것만)
   - ⚠️/❌ 항목의 대안/scope-out 검토
   - 종합 판정 (권고일 뿐 — 차단 안 함)
   - 상단 `placeholder-anchor` 주석 줄 **삭제** (작성 완료 표시)
5. ⚠️/❌ 항목이 있으면 사용자에게 단일 안내 (질문 아님, 정보 제공):
   > FEASIBILITY 결과: ✅ N개 / ⚠️ M개 / ❌ K개. ❌·⚠️ 항목은 docs/FEASIBILITY.md 참고.
   > 진행 막지 않습니다 — 그대로 갈지, scope 조정할지는 판단해 주세요.
6. state.md / roadmap.md의 Phase 0.5 체크 갱신 → 다음은 Phase 1.

### UI Composition 인터뷰 — Phase 1 안의 필수 sub-step (Anti-게으른 디자인)

Phase 1에서 디자인 시스템(색/폰트/스페이싱) 정한 후, 각 메인 화면마다:
1. PRODUCT.md JBT 목록 다시 읽기
2. 사용자에게 *그 화면을 어떤 상황에 어떻게 볼지* 직접 질문 (한 번에 하나)
3. 후보 컴포넌트 3-4개 추천 + 각각 어느 JBT 해결하는지 명시
4. 사용자가 빠진 거 추가 / 안 필요한 거 제거
5. DESIGN.md의 `## UI Composition Decisions` 표에 결정 박음

**금지**: 데이터 구조(state.md 섹션 등)를 그대로 UI 컴포넌트로 1:1 매핑. JBT 매핑 없는 컴포넌트는 박지 않는다.

각 Phase 실행 절차:
1. Hard gate 검사 (실패 시 정지)
2. Skill 도구로 sub-skill 호출
3. Sub-skill 결과 받으면 사용자에게 단일 질문: "이대로 `docs/{file}.md`에 저장할까요?"
4. 승인 → 저장 → state.md 갱신 → TodoWrite 갱신
5. 다음 phase 한 줄 안내

## Hard gate: Phase 3 진입 차단

Phase 3로 들어가기 직전 검사:

```bash
PRODUCT_OK=$([ -s docs/PRODUCT.md ] && grep -q -v "^>" docs/PRODUCT.md && echo yes || echo no)
ARCH_OK=$([ -s docs/ARCHITECTURE.md ] && grep -q -v "^>" docs/ARCHITECTURE.md && echo yes || echo no)
```

(주의: 위 grep은 코멘트 라인만 있는 비활성 템플릿 상태를 잡기 위함. 더 엄밀히 보려면 `## NON-GOALS` 섹션에 실제 항목이 있는지도 검사.)

`PRODUCT_OK=no` 또는 `ARCH_OK=no`면:
```
⚠️ Phase 3 차단됨.
이유: docs/PRODUCT.md ({PRODUCT_OK}) 또는 docs/ARCHITECTURE.md ({ARCH_OK}) 가 비어있음 (또는 템플릿 그대로).
조치: /blueprint 다시 호출 → 미완 Phase 먼저 채워주세요.
```

코드 작업 거부.

## Soft gate: Phase 1(DESIGN) 진입 시 FEASIBILITY 검사 (ADR-011)

Phase 1로 들어가기 직전, **차단하지 않는 경고**:

```bash
FEAS_OK=$([ -s docs/FEASIBILITY.md ] && ! grep -q "placeholder-anchor" docs/FEASIBILITY.md && echo yes || echo no)
```

`FEAS_OK=no`면 (파일 없거나 템플릿 그대로):
```
⚠️ FEASIBILITY 미작성.
docs/FEASIBILITY.md 가 비어있습니다 (Phase 0.5 건너뜀).
구현가능성·의존성 검증 없이 DESIGN으로 진행해도 되지만, 권장하지 않습니다.
지금 Phase 0.5를 채울까요, 그냥 진행할까요?
```

→ AskUserQuestion 단일 질문 (A: Phase 0.5 지금 / B: 그냥 DESIGN 진행).
**B를 골라도 막지 않는다.** PRODUCT/ARCHITECTURE의 hard gate와 다른 점 = 차단 없음.

---

## Alarm 트리거 평가 — Phase 4 능동 알림

호출 시작 시 state.md 읽어 다음 평가:

| 조건 | 발동 시 동작 |
|---|---|
| `ships_since_checkpoint >= 5` | `## Triggers fired`에 한 줄 추가 |
| 오늘 - `last_check` >= 14일 | 같음 |
| `plans_without_arch_read >= 3` | 같음 |
| (선택) 단일 도메인 폴더 새 파일 ≥ 10 (`ls docs/../{domain}/* | wc -l` 비교) | 같음 |

발동된 조건 있으면 RESUME Step 2에서 배너 출력.

### Counter 갱신 규칙

수동 (CLAUDE.md.tmpl에 적혀 있음) — Claude가 다음 시점에 state.md 편집:
- `/ship` 성공 → `ships_since_checkpoint += 1`
- 새 plan 생성 시 ARCHITECTURE.md 읽지 않은 세션 → `plans_without_arch_read += 1`
- `/blueprint check` 완료 → 위 둘 리셋, `last_check` 갱신

(향후 hook으로 자동화 가능. 현재는 사용자가 /blueprint 재호출할 때마다 카운터 재평가.)

---

## state.md 스키마 — 정식

state.md 작성은 항상 이 형식:

```markdown
# Blueprint State — {project_name}

## Progress
- [x] Phase 0: PRODUCT (2026-05-21)
- [ ] Phase 1: DESIGN
- [ ] Phase 2: ARCHITECTURE
- [ ] Phase 3: IMPLEMENT
- [ ] Phase 4: CHECKPOINT (0 runs)
- [ ] Phase 5: SHIP (0 ships)
- [ ] Phase 6: POST-SHIP

## Next action
Phase 1 시작 — /design-consultation 또는 /design-shotgun.

## Counters
- ships_since_checkpoint: 0
- last_check: 2026-05-21
- checkpoint_count: 0
- plans_without_arch_read: 0

## Triggers fired
(empty)

## Settings
- strict_mode: false
- quiet_until: (empty)

## Decisions log
(상세는 docs/adr/)
- 2026-05-21: stack confirmed — Next.js + Python
```

50줄 넘으면 Decisions log를 docs/adr/로 잘라낸다.

---

## Idempotency — 같은 phase 재호출

같은 phase 두 번째 호출 시 AskUserQuestion 단일 질문:
- Q: "Phase {N}이 이미 완료되어 있어요. 어떻게 할까요?"
- A) 덮어쓰기 (이전 산출물 백업 후)
- B) Merge — 기존 + 새 내용 병합
- C) 취소

기본은 C. 백업은 `.blueprint/backup/{file}-{timestamp}.md` 로.

---

## 의도 불명 시

호출 의도가 명확하지 않으면 (예: 빈 폴더지만 부모에 다른 .blueprint 있음) 추측하지 말고 AskUserQuestion 단일 질문으로 확인.

---

## 종료 출력

각 phase/모드 완료 시 정확히 한 줄:
```
/blueprint {mode} 완료. state.md 갱신됨. 다음: {next}.
```
