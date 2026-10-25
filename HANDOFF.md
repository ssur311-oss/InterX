# HANDOFF.md — 작업 인수인계 (2026-10-25)

> 다음 Claude 세션(새 계정)이 이어서 작업하기 위한 기록. **먼저 `CLAUDE.md` → `.claude/rules/RULE.md` → `.claude/skills/rnd-evidence-assistant/SKILL.md`를 읽고, 그다음 이 파일을 읽는다.**
> 프로젝트 설명·데이터 구조·업무 규칙은 그 세 파일에 있으므로 여기서는 반복하지 않는다. 여기에는 **지금까지 무엇을 만들었고, 어디까지 확인했고, 무엇이 남았는지**만 적는다.

---

## 1. 사용자와 일하는 방식 (중요)

- 코딩 경험이 거의 없다. **쉬운 한국어, 해요체**로 설명하고 전문 용어는 한 줄로 풀어 준다. 단계마다 "무엇을 했고 어떻게 확인하는지"를 짧게 알려 준다.
- 화면을 바꾸면 **직접 띄워 보고(스크린샷) 확인한 뒤** 보고한다. 확인 못 한 것은 못 했다고 말한다.
- 사용자는 **토큰을 아끼고 싶어 한다.** 큰 파일을 통째로 다시 읽지 말고 필요한 부분만 본다.
- 비밀 키(슬랙 토큰, Claude API 키)는 **채팅으로 받지 않는다.** Supabase **Edge Functions > Secrets**에만 넣게 안내한다. Secrets 이름은 **대문자 그대로** 써야 한다(소문자로 저장했다가 한 번 실패한 적 있음).
- Supabase 작업은 사용자가 **웹 대시보드에서 직접** 한다(CLI 없음). SQL은 SQL Editor에 붙여넣기, Edge Function은 "Deploy a new function → Via Editor"에 코드 붙여넣기.
- 커밋은 사용자가 요청할 때만 한다. 사용자가 직접 `mvp`로 커밋한 적이 있다.

### 디자인 선호 (사용자가 직접 정한 것)
- **밝은 배경 + 글래스(반투명 유리) 카드**, 글꼴 **Pretendard**. 주 색 `#2D5BFF`.
- 사용자 디자인 규칙 스킬(`my-design-rules`)을 따르되 **보라색은 허용**(사용자가 해제함). 이모지 아이콘 대신 lucide 선 아이콘.
- 캐릭터·화면에 **"기다리는 중", "커서 따라보는 중" 같은 설명 글자나 "움직임 멈추기" 버튼은 넣지 않는다**(사용자가 빼라고 함).
- 노트북: 삼성 16인치, 논리 해상도 **1440×900**(작업표시줄 빼면 높이 852). 설치한 앱 창은 **설정 창 크기(약 1100×720)** 로 쓰고 싶어 함.
- 대시보드 등은 **한 화면에 스크롤 없이** 들어오기를 원함(캘린더·엑셀 등록도 페이지 스크롤 잠금, 긴 표는 카드 안에서만 스크롤).

---

## 2. 커밋 상태

- 마지막 커밋: `20c65c9 mvp` (사용자가 직접). 그 뒤 **AI 도우미(모니 캐릭터·영수증 AI), 창 크기 자동 축소, 제목줄 투명** 작업이 **아직 커밋 안 됨** (`git status`로 확인).

---

## 3. 지금까지 만든 것 (화면 기준)

| 메뉴 | 파일 | 내용 |
|---|---|---|
| 공통 틀 | `src/components/Layout.tsx`, `src/index.css`, `src/components/ui.tsx` | 글래스 디자인 토큰, 떠 있는 사이드바, 위쪽 바(오늘 날짜 + 종 알림), 사용 안내(온보딩) |
| 대시보드 | `src/pages/Dashboard.tsx`, `src/components/charts/*`, `src/components/dashboard/*` | 요약 카드 3개(약속일 경과·오늘 제출 예정·**변동 사항**=마감 넘는 예정의 화면 이름) → 누르면 팝업에서 바로 체크. 오른쪽 2칸은 **증빙 현황 / 예산 집행 현황** 화면 전환 버튼. 도넛·과제별 진행·사람별 남은 서류(이름 클릭 → 슬랙 메시지 창) |
| 증빙 체크리스트 | `src/pages/Checklist.tsx`, `src/components/checklist/*` | 서류마다 체크 → 한 건이 다 모이면 **완료함**으로 이동(되돌리기 알림). 날짜 구간은 **엑셀 등록한 날(created_at)** 기준, 최신이 위, 무한 스크롤. 완료함은 과제별 묶음 + **엑셀로 내보내기** |
| 마감 캘린더 | `src/pages/Calendar.tsx`, `src/lib/calendarEvents.ts` | **월 / 분기 / 연도** 보기, 반복 일정(설정 > 반복 일정) 표시 |
| 엑셀 등록 | `src/pages/Upload.tsx` | 엑셀의 역할 설명, 열 자동 연결 시 접힘, 미리보기 표 내부 스크롤 |
| AI 도우미 | `src/pages/Assistant.tsx`, `src/components/assistant/*` | 3D 컴퓨터 캐릭터 **모니** + 기능 버튼 4개 + 말풍선 + 작업 화면. 영수증 사진 → AI 읽기 → 확인·수정 → 등록 |
| (데모) | `src/pages/AssistantDemo.tsx` (`/assistant/demo`, 메뉴에 없음) | 모니 동작 비교용 버튼 |
| 설정 | `src/pages/Settings.tsx` | 과제·사람(슬랙 ID)·증빙 규칙표·**반복 일정**·위험 기준값 |
| 종 알림 | `src/components/NotificationBell.tsx`, `src/lib/schedules.ts` | 다가오는 기한 개수를 빨간 테두리 숫자로, 누르면 준비 서류 안내. 오늘·내일 기한이면 하루 1번 자동으로 열림 |

### 사용자가 요청해서 뺀 것
- 위험 확인 필요(주말·심야·분할 결제 태그, 소명)는 **화면에서 숨김**. 코드(`RiskTag.tsx`, `ResolveRiskDialog.tsx`, `risk_flags`)는 남아 있고 엑셀 등록 때 계산은 계속 됨. "AI 붙일 때 다시 넣기"로 합의. 그래서 지금은 **서류만 다 체크하면 완료함**으로 간다(`src/lib/docCheck.ts`).

### 모니 캐릭터 (`src/components/assistant/`)
- `moni/buildMoni.ts`: three.js 기본 도형으로 만든 아이보리 CRT 컴퓨터(원본 시안 `design/assistant-demo/character.js`). 대기 중 약 12초 뒤 화면에 **interX 로고** 2초.
- `moni/moniMotion.ts`: 단일 상태 머신. 호흡·깜빡임·커서 추적(좌우 ±25°, 상하 ±13°, 눈 먼저 k=9 → 머리 k=4.6)·8초 무입력 시 혼자 놀기·listening/thinking/speaking/success/error/greeting. 모니터가 본체를 뚫지 않게 `clearance()`로 숙임을 줄임.
- `AiAssistantCharacter.tsx`: 캔버스·ResizeObserver·IntersectionObserver·정리(dispose). `prefers-reduced-motion`이면 정지. 개발 모드에서 `window.__moni()` 스냅샷.
- `AiAssistantPanel.tsx`: 무대. 영수증 AI 읽는 중 → thinking, 등록 성공 → success, 실패 → error.
- 원래 여우 캐릭터는 삭제했고, ChatGPT 시안의 **채팅창 구조 대신 기존 "버튼 → 말풍선 → 작업 화면" 흐름**을 유지함(사용자 합의). 채팅창은 "사업비 상담"에 AI를 붙일 때 만들기로 함.

### 화면 크기·앱
- `src/lib/uiScale.ts`: 창이 1440×880보다 작으면 `#root`에 CSS `zoom`으로 전체 축소(최소 0.68, 768px 미만은 축소 안 함). **주의:** `#root` 높이는 `100%` 그대로 둬야 함(퍼센트 높이는 zoom 영향을 안 받음). 캔버스 크기는 `clientWidth` 기준, 종 알림 포털은 `#root` 안에 띄움.
- 설치한 앱 첫 실행 때 `resizeTo(1100,720)` 시도 — **실제 설치 앱에서 확인 못 함.**
- `public/manifest.webmanifest`에 `display_override: ["window-controls-overlay"]` + `.titlebar`(index.css) → 설치한 앱에서 검은 제목줄 대신 앱 배경이 보이게. **사용자가 설치 방법을 막 안내받은 상태, 적용 확인 못 함.** `npm run app`(엣지 `--app`)으로 열면 적용 안 됨.
- 창 모서리 둥글기는 윈도우가 정하는 것이라 못 바꾼다고 안내함.

---

## 4. Supabase 상태

### SQL (사용자가 SQL Editor에서 실행)
- `0001`~`0004`: 적용됨(앱이 동작 중).
- `0005_demo_created_at.sql`: 가짜 데이터 등록일을 "매주 월요일"로 나눠 체크리스트 날짜 구간이 여러 개 보이게. **실행했는지 확인 필요.**
- `0006_schedules.sql`: 반복 일정 표 + 예시 5개. **실행했는지 확인 필요**(안 했으면 캘린더 반복 일정·종 알림의 반복 일정이 비어 있음).

### Edge Functions (대시보드 편집기로 배포)
- `slack-notify`: **배포·작동 확인됨.** Secrets `SLACK_BOT_TOKEN`(슬랙 앱 "interx(t)", 권한 `chat:write`, App Home 메시지 탭 켬). 사람별 1:1 DM. 사용자가 본인 슬랙 ID를 가짜 사람에 넣어 테스트 성공.
- `ai-assist`: 코드 작성 완료(영수증 사진 읽기, `claude-opus-5-5`, effort `low`, 구조화 출력, 서버 측 fallback `fallbacks: "default"`). Secrets `ANTHROPIC_API_KEY`는 **사용자가 저장했다고 함.** **함수 배포 여부는 확인 안 됨 → 다음 세션에서 먼저 확인.** 실제 영수증으로 테스트한 적 없음.
- 두 함수 모두: 새 방식 키 프로젝트라 `SUPABASE_ANON_KEY`가 없을 수 있어 요청의 `apikey` 헤더로 대신함. 로그인한 관리자만 호출 가능.
- 화면 쪽 호출은 `src/lib/invokeFunction.ts`(실패 시 함수가 돌려준 **실제 오류 문구**를 보여줌).

---

## 5. 다음에 할 일 (우선순위 순)

1. **`ai-assist` 배포 확인 → 실제 영수증 사진으로 테스트.** 오류가 나면 화면의 빨간 문구로 원인 파악.
2. 사용자 확인 대기 중인 것: 설치 앱의 제목줄 투명 / 첫 창 크기 / `0005`·`0006` 실행 여부.
3. 커밋(사용자가 원하면).
4. AI 기능 나머지: **슬랙 대화 정리(F6)** — SKILL.md 작업 1, 결과는 관리자 확인 후 예정일 반영 + 처리 이력. **통보 문장 AI 다듬기(F7)**, **사업비 상담**(대화창 + 모니 thinking/speaking 연동).
5. F8 파일명 정리·ZIP(완료함과 연결하면 자연스러움). 영수증 사진을 Storage에 저장해 증빙 파일로 연결하는 것도 아직 안 함.
6. 정리할 것: `RULE.md`에는 아직 "마감 넘는 예정"으로 적혀 있음(화면은 "변동 사항"). 캘린더 일정 제목에 이모지(`TONE_ICON`)가 남아 있음. 실제 interX 로고 파일·디자이너 그림이 오면 교체.

---

## 6. 실행·확인 방법

- 실행: `npm run dev` → `localhost:5173`. 앱처럼: 엣지 ⋯ → 앱 → 이 사이트를 앱으로 설치(설치 앱도 `npm run dev`가 켜져 있어야 함). `npm run app`은 엣지 `--app` 창(최대화).
- 검사: `npx tsc -b`, `npx oxlint src`(기존 경고 몇 개는 원래 있음), `npm run build`.
- 화면 확인은 Playwright로 했다: 별도 포트(5180)로 `npx vite --port 5180`을 띄우고, `localStorage`에 가짜 세션(`sb-ychtggvqwpdgdnkultuc-auth-token`, 만료 4102444800)을 넣고 `**/rest/v1/**`·`**/functions/v1/**`를 가짜 응답으로 가로채서 **실제 DB/AI를 건드리지 않고** 캡처했다. WebGL은 `--use-angle=swiftshader`. 끝나면 5180 포트 프로세스를 끈다.
- 실제 관리자 비밀번호는 모른다(물어보지 않는다).
