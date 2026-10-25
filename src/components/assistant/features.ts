import { Camera, Lightbulb, MessageSquareText, Send, type LucideIcon } from 'lucide-react'

export type FeatureKey = 'receipt' | 'slack' | 'consult' | 'notice'

// 모니가 말풍선으로 소개하는 기능들. AI는 제안만 하고 저장·발송은 관리자 버튼으로 (RULE.md 0장)
export const FEATURES: { key: FeatureKey; Icon: LucideIcon; label: string; say: string; go: string }[] = [
  {
    key: 'receipt', Icon: Camera, label: '영수증 사진 등록',
    say: '영수증이나 세금계산서 사진을 올려 주시면 날짜·금액·거래처를 읽어서 집행 건으로 정리해 드릴게요!',
    go: '사진 첨부하러 가기',
  },
  {
    key: 'slack', Icon: MessageSquareText, label: '슬랙 대화 정리',
    say: '직원이랑 나눈 슬랙 대화를 붙여넣어 주세요. 언제까지 무슨 서류를 낼지 뽑아서 일정에 넣어 드릴게요!',
    go: '대화 붙여넣으러 가기',
  },
  {
    key: 'consult', Icon: Lightbulb, label: '사업비 상담',
    say: '영수증 분실, 출장 연장처럼 애매한 상황이 있나요? 말해 주시면 확인할 것과 필요한 서류를 정리해 드릴게요.',
    go: '상담하러 가기',
  },
  {
    key: 'notice', Icon: Send, label: '통보 문장 다듬기',
    say: '직원에게 보낼 메시지를 상황에 맞게, 부드럽게 다듬어 드릴게요.',
    go: '문장 다듬으러 가기',
  },
]
