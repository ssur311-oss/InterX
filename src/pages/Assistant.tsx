import { Link } from 'react-router-dom'
import { Camera, MessageSquareText, Scale, type LucideIcon } from 'lucide-react'
import { BTN_PRIMARY, Card, PageHeader, Workspace } from '../components/ui'

// AI 기능 자리. AI는 제안만 하고, 저장·발송은 관리자 버튼으로만 (RULE.md 0장)
const FEATURES: { Icon: LucideIcon; title: string; desc: string; steps: string[] }[] = [
  {
    Icon: Camera,
    title: '영수증 사진으로 등록',
    desc: '영수증·카드전표·세금계산서 사진을 올리면 날짜, 금액, 거래처, 과제·비목을 읽어 집행 건으로 정리해요.',
    steps: ['사진 올리기 (여러 장 가능)', 'AI가 읽은 내용 확인·수정', '[등록]을 누르면 체크리스트에 바로 추가', '사진은 해당 증빙 파일로 연결'],
  },
  {
    Icon: MessageSquareText,
    title: '슬랙 대화 정리',
    desc: '직원과 나눈 슬랙 대화를 붙여넣으면 "언제까지, 무슨 서류를, 왜 늦는지"를 뽑아 제출 예정일로 반영해요.',
    steps: ['대화 붙여넣기', '예정일·사유·서류 종류 확인', '어느 집행 건인지 고르기', '[반영] → 처리 이력에 원문과 함께 저장'],
  },
  {
    Icon: Scale,
    title: '사업비 상황 상담',
    desc: '대화 내용과 규칙표를 바탕으로 애매한 상황에서 무엇을 확인하고 어떤 서류를 받아야 하는지 정리해 줘요.',
    steps: ['예: 영수증을 잃어버렸대요', '예: 카드 결제를 두 번 나눠서 했대요', '예: 출장이 하루 늘었는데 숙박비는?', '최종 판단은 협약·지침 확인 후 관리자가'],
  },
]

export default function Assistant() {
  return (
    <Workspace>
      <PageHeader
        title="AI 도우미"
        desc="사진과 대화를 정리해서 등록·체크를 덜어 주는 기능이에요. 지금 만드는 중이에요."
        action={<Link to="/upload" className={BTN_PRIMARY}>지금은 엑셀로 등록하기</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {FEATURES.map(({ Icon, title, desc, steps }) => (
          <Card key={title}>
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <Icon aria-hidden size={24} />
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-medium text-body">준비 중</span>
            </div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-body">{desc}</p>
            <ol className="mt-4 space-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-[15px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-bold text-brand">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-body">
        AI가 읽은 날짜·금액은 관리자가 확인 버튼을 누르기 전까지 저장하지 않아요. 개인정보(주민번호·연락처·급여 금액)는 보내지 않아요.
      </p>
    </Workspace>
  )
}
