# AGENTS.md — 사업비 증빙 마감 도우미 (가칭)

> Codex가 이 프로젝트를 이해하기 위한 **프로젝트 설명서**.
> 업무 규칙은 `RULE.md`, AI 기능의 동작 방식은 `SKILL.md`를 따른다. 작업 전에 세 파일을 모두 읽는다.

---

## 1. 한 줄 요약

정부 지원사업비 담당자가 **매달 증빙을 취합·검토·독촉·마감**하는 일을 돕는 **관리자 1인용 도구**.
집행 내역 엑셀을 올리면 필요한 증빙 목록과 감사 위험 건이 자동으로 정리되고,
캘린더로 마감을 관리하며, 슬랙 메시지를 AI가 정리해주고 독촉 메시지를 대신 써준다.

## 2. 만든 사람과 작업 방식

- 만든 사람은 **코딩 경험이 거의 없다.** 쉬운 한국어로 설명하고, 전문 용어는 처음 나올 때 한 줄로 풀어준다.
- **단계별로 만들고, 단계마다 실행해서 확인**한다. 한 번에 큰 변경을 하지 않는다.
- 단계가 끝나면 "무엇을 만들었고 어떻게 확인하는지"를 3줄 이내로 알려준다.
- 비밀 키(API 키, 슬랙 웹훅 주소)는 `.env`와 Supabase Secrets에만 둔다. git에 올리지 않는다.

## 3. 사용자

- **관리자 1명(사업비 담당자)만 사용한다.** 직원은 이 도구에 접속하지 않고 평소처럼 슬랙으로 소통한다.
- 로그인은 관리자 계정 하나.

## 4. 핵심 개념 (헷갈리지 않게)

```
과제 (예: 자율제조 AI 플랫폼 고도화)
 └─ 사업비(예산): 비목별로 나뉨 (연구재료비, 연구활동비, 연구시설장비비 …)
     └─ 집행 건: 실제로 쓴 한 건 (10/14 센서 부품 2,300,000원, 계좌이체, 거래처 ○○전자)
         └─ 증빙: 그 건을 입증하는 서류들
              ├─ 결제 증빙: 카드전표(카드 결제) 또는 세금계산서(계좌이체)
              └─ 내부 증빙: 회의록, 검수조서, 출장결과보고서 등 (비목마다 다름)
```

- 이 도구의 중심은 **증빙**이다. 관리 단위는 **집행 건 → 필요한 증빙 목록**.
- 사람은 **과제 → 연구책임자 → 참여연구원**으로 묶는다. 부서는 참고 정보.
- **거래처** = 사업비를 받은 상대방(판매처, 외주사, 식당 등). 세금계산서를 발행하는 쪽.

## 5. 기능

### 필수 (내일까지)
| # | 기능 | 처리 방식 |
|---|---|---|
| F1 | **집행 내역 엑셀 업로드 → 필요 증빙 목록 자동 생성** (비목 × 결제 방법 규칙표) | 규칙 |
| F2 | **감사 위험 건 자동 표시** (주말·심야, 분할 결제, 과제 기간 외 등) | 규칙 |
| F3 | **마감 역산 일정 자동 생성** (정산 기한 → 사내 마감일, 리마인드일) | 규칙 |
| F4 | **증빙 현황판**: 집행 건별 증빙 상태(✅ ⏳ 🔴 ❌), 과제·사람 필터, 🔴 약속일 경과 맨 위 | 규칙 |
| F5 | **캘린더**: 공통 마감일, 개별 제출 예정일, 마감일 넘는 예정일 ⚠️ | 규칙 |
| F6 | **슬랙 메시지 붙여넣기 → AI 분류·추출** → 관리자 확인 후 예정일 반영 + 처리 이력 저장 | AI |
| F7 | **통보·재통보**: AI가 문장 작성 → 미리보기 → 슬랙 웹훅으로 발송 | AI + 규칙 |
| F8 | **증빙 파일명 자동 정리**: 파일 업로드 → 집행 건에 연결 → 표준 이름으로 바꿔 ZIP 다운로드 | 규칙 |
| F9 | **처리 이력**: 누가 언제 무슨 사유로 늦는다고 했는지, 언제 통보했는지 기록 (감사 소명 근거) | 규칙 |

### 여유 시
| # | 기능 |
|---|---|
| F10 | 예산 현황 탭 (과제별·비목별 예산, 집행액, 잔액, 집행률) — **증빙 화면과 탭 분리** |
| F11 | 연구책임자에게 과제별 주간 미제출 요약 발송 (AI 문장) |
| F12 | 월 마감 보고서 자동 작성 (AI 문장) |
| F13 | 아침 브리핑: "약속일 경과 3건, 오늘 예정 5건" |

## 6. 화면

1. 로그인
2. **현황판 (홈)** — 오늘 처리할 것(약속일 경과, 오늘 예정, 위험 건) + 집행 건 목록
3. **캘린더**
4. **엑셀 업로드** — 업로드 → 미리보기 → 증빙 목록·위험 건 생성
5. **슬랙 붙여넣기** — 메시지 붙여넣기 → AI 결과 확인 → [반영]
6. **증빙 파일 정리** — 파일 끌어다 놓기 → 집행 건 선택 → 이름 변경 → ZIP
7. **설정** — 과제 정보, 증빙 규칙표, 위험 기준값, 사내 마감 여유일, 사람 목록(슬랙 ID)
8. (여유) 예산 현황

## 7. 기술 스택

| 영역 | 선택 |
|---|---|
| 화면 | React + Vite + TypeScript, Tailwind CSS |
| 캘린더 | FullCalendar (React) |
| 엑셀 읽기 / ZIP 만들기 | SheetJS(xlsx), JSZip |
| 로그인 / DB / 파일 저장 | Supabase (Auth, Postgres, Storage) |
| AI 호출, 슬랙 발송 | Supabase Edge Functions (`ai-assist`, `slack-notify`) — 키를 화면 코드에 노출하지 않음 |
| AI | Codex API |
| 슬랙 | Incoming Webhook (보내기만). 받기는 붙여넣기로 대체 |
| 데스크톱 앱 | 1차 PWA(크롬 "앱 설치") → 여유 시 Electron 포장 |

## 8. 데이터 구조

```
projects        id, name, short_name(파일명용 약칭), agency, start_date, end_date,
                settlement_deadline(정산 기한), internal_buffer_days(사내 마감 여유일, 기본 5)
people          id, name, department, project_id, role(연구책임자|참여연구원), slack_user_id
budget_items    id, project_id, category(비목), planned_amount, spent_amount        ← F10용
expenses        id, project_id, category(비목), sub_category(세목, 예: 회의비), pay_method(card|transfer),
                amount, paid_at(datetime), vendor(거래처), description, owner_id
doc_rules       id, category, sub_category, pay_method, doc_type, required(bool)    ← F1 규칙표
required_docs   id, expense_id, doc_type, status(submitted|scheduled|missing),
                planned_date, file_path, renamed_file_name
risk_flags      id, expense_id, rule_code, detail
activity_log    id, expense_id, doc_id, kind(delay_notice|submitted|notice_sent|re_notice_sent|memo),
                content, source(slack_paste|manual|system), created_at
settings        key, value   ← 위험 기준값 등
```

- 금액은 **원 단위 정수**. 날짜는 `YYYY-MM-DD`, 시간대 Asia/Seoul.

## 9. 엑셀 업로드 형식 (가정)

연구비 관리 시스템이나 카드사에서 내려받은 집행 내역을 아래 열로 맞춘다. 열 이름이 달라도 **업로드 시 열 매칭 화면**에서 고를 수 있게 한다.

`과제 | 비목 | 세목 | 결제방법 | 집행일시 | 금액 | 거래처 | 적요 | 사용자`

## 10. 개발 단계

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| 0 | 프로젝트 생성, Supabase 연결, 테이블 생성, 가짜 데이터 | 화면에 가짜 데이터가 보임 |
| 1 | 로그인 + 설정 화면(과제, 사람, 증빙 규칙표) | 규칙표를 보고 고칠 수 있음 |
| 2 | **F1 엑셀 업로드 → 필요 증빙 생성 + F2 위험 건** | 샘플 엑셀을 올리면 증빙 목록과 ⚠️ 표시가 생김 |
| 3 | **F4 현황판** | 상태별 아이콘, 약속일 경과가 맨 위 |
| 4 | **F3 마감 역산 + F5 캘린더** | 정산 기한 입력 → 사내 마감·리마인드가 캘린더에 표시 |
| 5 | **F6 슬랙 붙여넣기 + F9 처리 이력** | 메시지 붙여넣기 → 예정일 반영 → 이력 남음 |
| 6 | **F7 통보·재통보** | 버튼 → 문장 미리보기 → 슬랙 채널에 도착 |
| 7 | **F8 파일명 정리** | 파일 3개 업로드 → 이름 바뀐 ZIP 다운로드 |
| 8 | PWA → (여유) F10~F13, Electron | 바탕화면 아이콘으로 실행 |

시간이 부족하면 **0~4단계 + 6단계**를 우선한다.

## 11. 가짜 데이터

- 과제 3개, 사람 7명(연구책임자 3 + 참여연구원 4), 이번 달 집행 40건
- 일부러 섞어 넣기: 증빙 누락 6건, 제출 예정 5건(그중 2건은 약속일 경과), 주말 사용 1건, 분할 결제 의심 1건, 과제 기간 외 1건
- **실제 회사 데이터·실명 금지.**

## 12. 폴더 구조

```
/src
  /pages        Dashboard, Calendar, Upload, SlackPaste, FileRename, Settings, Budget
  /components   StatusBadge, ExpenseRow, RiskTag, MessagePreview ...
  /lib          supabase.ts, rules/ (docRules.ts, riskRules.ts, deadline.ts, fileName.ts), format.ts
/supabase
  /migrations   테이블 생성 SQL + 기본 증빙 규칙표
  /functions    ai-assist, slack-notify
/sample         sample_expenses.xlsx (가짜 집행 내역)
AGENTS.md  RULE.md  SKILL.md
```
