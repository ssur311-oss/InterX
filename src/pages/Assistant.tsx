import { AiAssistantPanel } from '../components/assistant/AiAssistantPanel'
import { PageHeader, Workspace } from '../components/ui'

// AI 기능 자리. AI는 제안만 하고, 저장·발송은 관리자 버튼으로만 (RULE.md 0장)
export default function Assistant() {
  return (
    <Workspace fit>
      <PageHeader title="체크메이트 모니" desc="모니를 눌러 보세요. 무엇을 도와줄 수 있는지 알려 줄 거예요." />
      <AiAssistantPanel />
    </Workspace>
  )
}
