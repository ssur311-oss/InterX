import { seoulParts } from '../date'
import { formatDate, formatTime, formatWon } from '../format'
import type { Project, Setting } from '../types'
import { parseHolidays } from './deadline'
import { normalize } from './docRules'

// 감사 위험 건 판정 (RULE.md 2장). 결과는 "확인 필요"이지 위반 확정이 아니다.
export type RiskCode = 'WEEKEND' | 'LATE_NIGHT' | 'SPLIT' | 'OUT_OF_PERIOD' | 'MEETING_LIMIT'

export type RiskInput = { id: string; project_id: string; paid_at: string; amount: number; vendor: string | null }
export type RiskFlag = { expense_id: string; rule_code: RiskCode; detail: string }

export type RiskConfig = {
  lateNightStart: number // 0시부터 지난 분
  lateNightEnd: number
  splitThreshold: number
  holidays: Set<string>
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

const toHhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export function riskConfigFromSettings(settings: Pick<Setting, 'key' | 'value'>[]): RiskConfig {
  const get = (key: string, fallback: string) => settings.find((s) => s.key === key)?.value ?? fallback
  return {
    lateNightStart: toMinutes(get('late_night_start', '23:00')),
    lateNightEnd: toMinutes(get('late_night_end', '06:00')),
    splitThreshold: Number(get('split_threshold_amount', '2000000')),
    holidays: parseHolidays(settings),
  }
}

function isLateNight(minutes: number, cfg: RiskConfig): boolean {
  const { lateNightStart: s, lateNightEnd: e } = cfg
  // 23:00~06:00처럼 자정을 넘는 구간
  return s > e ? minutes >= s || minutes < e : minutes >= s && minutes < e
}

/**
 * 집행 건 목록 전체를 보고 위험 표시를 계산한다.
 * 분할 결제는 다른 건과 묶어 봐야 하므로, 새로 올린 건만이 아니라 기존 건까지 함께 넣는다.
 * MEETING_LIMIT(회의비 1인당)은 참석자 수 데이터가 생기면 추가한다.
 */
export function computeRiskFlags(
  expenses: RiskInput[],
  projects: Pick<Project, 'id' | 'start_date' | 'end_date'>[],
  cfg: RiskConfig,
): RiskFlag[] {
  const flags: RiskFlag[] = []
  const projectById = new Map(projects.map((p) => [p.id, p]))
  const groups = new Map<string, RiskInput[]>()

  for (const e of expenses) {
    const { date, hour, minute, weekday } = seoulParts(e.paid_at)

    if (weekday === 0 || weekday === 6) {
      flags.push({ expense_id: e.id, rule_code: 'WEEKEND', detail: `${formatDate(e.paid_at)} 주말 사용` })
    } else if (cfg.holidays.has(date)) {
      flags.push({ expense_id: e.id, rule_code: 'WEEKEND', detail: `${formatDate(e.paid_at)} 공휴일 사용` })
    }

    if (isLateNight(hour * 60 + minute, cfg)) {
      flags.push({
        expense_id: e.id,
        rule_code: 'LATE_NIGHT',
        detail: `${formatTime(e.paid_at)} 사용 (심야 기준 ${toHhmm(cfg.lateNightStart)}~${toHhmm(cfg.lateNightEnd)})`,
      })
    }

    const p = projectById.get(e.project_id)
    if (p && (date < p.start_date || date > p.end_date)) {
      flags.push({ expense_id: e.id, rule_code: 'OUT_OF_PERIOD', detail: `과제 기간(${p.start_date} ~ ${p.end_date}) 밖 사용` })
    }

    // 분할 결제는 같은 과제·같은 날·같은 거래처끼리 묶어서 본다
    if (normalize(e.vendor)) {
      const key = `${e.project_id}|${date}|${normalize(e.vendor)}`
      groups.set(key, [...(groups.get(key) ?? []), e])
    }
  }

  for (const group of groups.values()) {
    const total = group.reduce((sum, e) => sum + e.amount, 0)
    if (group.length < 2 || total <= cfg.splitThreshold) continue
    const detail = `같은 날 같은 거래처(${group[0].vendor}) ${group.length}건, 합계 ${formatWon(total)} (기준 ${formatWon(cfg.splitThreshold)} 초과)`
    for (const e of group) flags.push({ expense_id: e.id, rule_code: 'SPLIT', detail })
  }

  return flags
}
