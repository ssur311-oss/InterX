// AI 도우미 (Claude API). 키는 Supabase Secrets의 ANTHROPIC_API_KEY에만 둔다 (RULE.md 9장)
// AI는 읽고 제안만 한다. 저장은 화면에서 관리자가 확인 버튼을 눌러야 된다 (RULE.md 0장)
// 지금 하는 일: task = 'receipt' → 영수증·세금계산서 사진에서 집행 정보 읽기
import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

type Img = { media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string }
type ReceiptReq = { task: 'receipt'; images: Img[]; projects: { id: string; name: string }[]; categories: string[] }

const MAX_IMAGES = 8
const nullable = (type: string, extra: Record<string, unknown> = {}) => ({ anyOf: [{ type, ...extra }, { type: 'null' }] })

// 사진 한 장 = 집행 한 건. 모르는 값은 null로 두고 notes에 확인할 점을 적게 한다
const RECEIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['receipts'],
  properties: {
    receipts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['image_index', 'readable', 'paid_date', 'paid_time', 'amount', 'vendor', 'description',
          'pay_method', 'doc_kind', 'category', 'sub_category', 'project_id', 'notes'],
        properties: {
          image_index: { type: 'integer' },
          readable: { type: 'boolean' },
          paid_date: nullable('string'),
          paid_time: nullable('string'),
          amount: nullable('integer'),
          vendor: nullable('string'),
          description: { type: 'string' },
          pay_method: { type: 'string', enum: ['card', 'transfer', 'unknown'] },
          doc_kind: { type: 'string', enum: ['카드전표', '세금계산서', '간이영수증', '거래명세서', '기타'] },
          category: nullable('string'),
          sub_category: nullable('string'),
          project_id: nullable('string'),
          notes: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

function receiptPrompt(req: ReceiptReq) {
  return [
    '정부 지원사업비 증빙 담당자를 돕고 있어요. 첨부한 사진은 각각 영수증·카드전표·세금계산서 중 하나예요.',
    '사진마다 하나씩, 사진 순서대로(image_index는 0부터) 아래를 읽어 주세요.',
    '- paid_date: 결제(작성)일 YYYY-MM-DD, paid_time: HH:MM (없으면 null)',
    '- amount: 부가세 포함 최종 결제 금액, 원 단위 정수 (쉼표·원 표시 빼고)',
    '- vendor: 가맹점·공급자 상호, description: 무엇을 샀는지 짧은 적요 (예: "센서 부품 구매", "회의 식대")',
    '- pay_method: 카드 결제면 card, 세금계산서·계좌이체면 transfer, 모르면 unknown',
    `- category: 다음 비목 중 가장 알맞은 것 하나, 판단이 어려우면 null: ${req.categories.join(', ')}`,
    '- sub_category: 회의비·출장비처럼 세목이 분명할 때만, 아니면 null',
    `- project_id: 아래 과제 중 사진에 근거가 있을 때만 id를 고르고, 근거가 없으면 null\n${req.projects.map((p) => `  ${p.id}: ${p.name}`).join('\n')}`,
    '- notes: 관리자가 확인해야 할 점을 짧게 (흐려서 안 보임, 금액 두 개 중 하나 고름, 주말 사용 등). 없으면 빈 배열',
    '숫자와 날짜는 사진에 보이는 대로만 쓰고 추측하지 마세요. 영수증이 아니거나 읽을 수 없으면 readable=false로 두세요.',
    '주민번호·카드번호 전체·연락처 같은 개인정보는 어떤 칸에도 옮겨 적지 마세요.',
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // 로그인한 관리자만 쓸 수 있다 (모르는 사람이 키로 AI를 쓰지 못하게)
  const apiKey = Deno.env.get('SUPABASE_ANON_KEY') || req.headers.get('apikey') || ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, apiKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return json({ ok: false, error: '로그인이 필요해요' }, 401)

  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ ok: false, error: 'AI 키(ANTHROPIC_API_KEY)가 Secrets에 없어요' }, 500)
  const body = (await req.json()) as ReceiptReq
  if (body.task !== 'receipt') return json({ ok: false, error: '아직 지원하지 않는 작업이에요' }, 400)
  if (!body.images?.length) return json({ ok: false, error: '사진이 없어요' }, 400)
  if (body.images.length > MAX_IMAGES) return json({ ok: false, error: `사진은 한 번에 ${MAX_IMAGES}장까지 읽을 수 있어요` }, 400)

  const client = new Anthropic()
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      // 영수증 읽기는 단순 추출이라 생각을 짧게 해서 빠르고 저렴하게
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
      // 안전 필터가 드물게 거절하면 같은 요청을 다른 모델로 이어서 처리
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: [
          ...body.images.map((img) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: img.media_type, data: img.data } })),
          { type: 'text' as const, text: receiptPrompt(body) },
        ],
      }],
    })

    if (response.stop_reason === 'refusal') return json({ ok: false, error: 'AI가 이 사진을 처리하지 않았어요. 다른 사진으로 해 주세요.' }, 422)
    if (response.stop_reason === 'max_tokens') return json({ ok: false, error: '사진이 너무 많아 다 읽지 못했어요. 장수를 줄여 주세요.' }, 422)
    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return json({ ok: false, error: 'AI 응답이 비어 있어요' }, 502)
    return json({ ok: true, ...JSON.parse(text.text) })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ ok: false, error: 'AI 키가 맞지 않아요. Secrets의 ANTHROPIC_API_KEY를 확인해 주세요.' }, 500)
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, error: 'AI 요청이 많아 잠시 막혔어요. 1분 뒤 다시 해 주세요.' }, 429)
    if (e instanceof Anthropic.BadRequestError) return json({ ok: false, error: `AI 요청 오류: ${e.message}` }, 400)
    if (e instanceof Anthropic.APIError) return json({ ok: false, error: `AI 서버 오류 (${e.status})` }, 502)
    return json({ ok: false, error: `처리 중 오류: ${(e as Error).message}` }, 500)
  }
})
