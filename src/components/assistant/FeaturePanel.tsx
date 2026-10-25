import { ArrowLeft } from 'lucide-react'
import { BTN } from '../ui'
import type { MoniState } from './AiAssistantCharacter'
import { ConsultPanel } from './ConsultPanel'
import { FEATURES, type FeatureKey } from './features'
import { NoticePanel } from './NoticePanel'
import { ReceiptPanel } from './ReceiptPanel'
import { SlackPanel } from './SlackPanel'

type Props = { feature: FeatureKey; onBack: () => void; onMood?: (s: MoniState, ms?: number) => void }

export function FeaturePanel({ feature, onBack, onMood }: Props) {
  const f = FEATURES.find((x) => x.key === feature)!
  // 대화창·문장 화면은 자체적으로 아래까지 채우므로 바깥 스크롤을 쓰지 않는다
  const fills = feature === 'consult' || feature === 'notice'
  return (
    <section className="glass-strong animate-pop flex h-full flex-col rounded-3xl p-6" aria-labelledby="feature-title">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="feature-title" className="flex items-center gap-2 text-2xl font-bold">
          <f.Icon aria-hidden size={24} className="text-accent" /> {f.label}
        </h2>
        <button onClick={onBack} className={BTN}><ArrowLeft aria-hidden size={18} /> 모니에게 돌아가기</button>
      </div>
      <div className={`min-h-0 flex-1 ${fills ? 'flex flex-col' : 'overflow-y-auto'}`}>
        {feature === 'receipt' && <ReceiptPanel onMood={onMood} />}
        {feature === 'slack' && <SlackPanel onMood={onMood} />}
        {feature === 'consult' && <ConsultPanel onMood={onMood} />}
        {feature === 'notice' && <NoticePanel onMood={onMood} />}
      </div>
    </section>
  )
}
