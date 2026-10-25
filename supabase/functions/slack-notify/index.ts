// 슬랙 발송 (F7). 키는 Supabase Secrets에만 둔다. 화면 코드에는 키가 없다 (RULE.md 9장)
// - SLACK_BOT_TOKEN 이 있으면: 그 사람에게 1:1 메시지(DM)
// - 없고 SLACK_WEBHOOK_URL 만 있으면: 정해진 채널에 그 사람을 @멘션해서 보냄
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // 로그인한 관리자 권한으로 DB를 읽는다 (RLS 그대로 적용)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return json({ ok: false, error: '로그인이 필요해요' }, 401)

  const { person_id, text } = await req.json()
  if (!person_id || !text?.trim()) return json({ ok: false, error: '받는 사람과 내용이 필요해요' }, 400)

  const { data: person } = await supabase.from('people').select('name, slack_user_id').eq('id', person_id).single()
  if (!person?.slack_user_id) return json({ ok: false, error: '이 사람의 슬랙 ID가 없어요' }, 400)

  const botToken = Deno.env.get('SLACK_BOT_TOKEN')
  if (botToken) {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ channel: person.slack_user_id, text }),
    })
    const body = await res.json()
    return body.ok ? json({ ok: true, mode: 'dm' }) : json({ ok: false, error: `슬랙 오류: ${body.error}` }, 502)
  }

  const webhook = Deno.env.get('SLACK_WEBHOOK_URL')
  if (!webhook) return json({ ok: false, error: '슬랙 연결 정보(Secrets)가 없어요' }, 500)
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `<@${person.slack_user_id}>\n${text}` }),
  })
  return res.ok ? json({ ok: true, mode: 'channel' }) : json({ ok: false, error: '슬랙 웹훅이 메시지를 받지 않았어요' }, 502)
})
