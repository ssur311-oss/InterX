import { weekdayOf } from './date'

// 대시보드 맨 위 인사. 관리자 1명이 쓰는 도구라 이름을 여기 둔다 (바꾸려면 이 값만 고치면 된다)
export const ADMIN_NAME = '성욱'

// 요일마다 바뀌는 한마디 (0 = 일요일)
const BY_WEEKDAY = [
  '일요일, 화이팅입니다',
  '월요일 아침 힘내봐요',
  '화요일, 한 주의 리듬을 타 봐요',
  '수요일, 벌써 한 주의 절반이에요',
  '목요일, 조금만 더 힘내요',
  '금요일, 깔끔하게 마무리해 봐요',
  '토요일, 무리하지 마세요',
]

/** "안녕하세요 성욱님, 월요일 아침 힘내봐요" (today = 서울 기준 YYYY-MM-DD) */
export function greeting(today: string): string {
  return `안녕하세요 ${ADMIN_NAME}님, ${BY_WEEKDAY[weekdayOf(today)]}`
}
