import * as THREE from 'three'
import { EYES_BASE_Y, HEAD_BASE_Y, PEDESTAL_HALF, PEDESTAL_TOP, TRIM_TOP, type Moni } from './buildMoni'

export type MoniState =
  | 'idle' | 'listening' | 'thinking' | 'reading' | 'ready' | 'speaking' | 'success' | 'error' | 'greeting' | 'dizzy' | 'petted'

/** 모니가 스스로 하는 반응 (쓰다듬기·여러 번 클릭·잠에서 깨기). prop이 아니라 캐릭터 안에서 정한다 */
export type Reaction = 'dizzy' | 'petted' | 'wake'

const DEG = Math.PI / 180
const YAW_LIMIT = 25 * DEG
const PITCH_LIMIT = 13 * DEG
const BASE_YAW = 0.23 // 카메라가 오른쪽 위에서 보므로 살짝 정면을 향하게
const IDLE_AFTER_MS = 8000
const SLEEP_AFTER_MS = 20000
const IDLE_CYCLE = 16
const LOGO_FROM = 12.5 // 대기 사이클 중 interX 로고를 띄우는 구간 (2.5초)
const LOGO_TO = 15
const NOD_CYCLE = 4.5 // 꾸벅꾸벅 한 번
const READ_LINE = 1.1 // 서류 한 줄 읽는 시간
// 한 번 하고 끝나는 동작의 길이. 끝나면 prop이 그대로여도 자동 반응으로 돌아간다
const ONE_SHOT: Partial<Record<MoniState, number>> = { speaking: 0.7, success: 2.6, greeting: 2.4, dizzy: 2.2, petted: 1.4 }
const REACTION_SEC: Record<Reaction, number> = { dizzy: 2.2, petted: 1, wake: 0.8 }

/** 프레임 사이에 이어지는 움직임 상태 (React state가 아니라 ref에 둔다) */
export type Motion = {
  time: number
  state: MoniState
  replay: number
  stateStart: number
  idleStart: number
  wasIdle: boolean
  lastInputMs: number
  pointer: { x: number; y: number }
  pointerActive: boolean
  eyeX: number
  eyeY: number
  blinkCountdown: number
  blinkAge: number
  logo: number
  label: string
  reaction: Reaction | null
  reactionStart: number
  reactionEnd: number
  sleeping: boolean
  sleepStart: number
  spin: number
}

export function createMotion(now: number): Motion {
  return {
    time: 0, state: 'idle', replay: 0, stateStart: 0, idleStart: 0, wasIdle: false, lastInputMs: now,
    pointer: { x: 0, y: 0 }, pointerActive: false, eyeX: 0, eyeY: 0,
    blinkCountdown: 2.5, blinkAge: 1, logo: 0, label: '',
    reaction: null, reactionStart: 0, reactionEnd: 0, sleeping: false, sleepStart: 0, spin: 0,
  }
}

/** 반응 시작. 쓰다듬는 중에는 끝나는 시간만 늘린다 (처음부터 다시 하면 동작이 계속 끊긴다) */
export function trigger(m: Motion, kind: Reaction) {
  if (m.reaction !== kind || kind !== 'petted') m.reactionStart = m.time
  m.reaction = kind
  m.reactionEnd = m.time + REACTION_SEC[kind]
}

// delta time 기반 보간: 프레임 수와 관계없이 같은 속도
const follow = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const lerp = THREE.MathUtils.lerp

const euler = new THREE.Euler(0, 0, 0, 'YXZ')
const targetQ = new THREE.Quaternion()
const corner = new THREE.Vector3()
// 모니터 아래쪽 모서리 (headPivot 기준). 고개를 숙여도 본체를 뚫지 않는지 이 점들로 검사한다
const BOTTOM_CORNERS = [-1.065, 1.065].flatMap((x) => [-0.625, 0, 0.625].map((z) => new THREE.Vector3(x, 0.01, z)))

/** 이 자세로 돌렸을 때 모니터 바닥이 본체 윗면보다 얼마나 떠 있는지 (음수면 뚫고 들어감) */
export function clearance(q: THREE.Quaternion, headY: number): number {
  let min = Infinity
  for (const c of BOTTOM_CORNERS) {
    corner.copy(c).applyQuaternion(q)
    const z = corner.z - 0.08
    const onPedestal = Math.abs(corner.x) < PEDESTAL_HALF.x && z > PEDESTAL_HALF.zMin && z < PEDESTAL_HALF.zMax
    min = Math.min(min, headY + corner.y - (onPedestal ? PEDESTAL_TOP : TRIM_TOP))
  }
  return min
}

type Input = { state: MoniState; replay: number; pointerTracking: boolean; forceIdle: boolean; nowMs: number }

/** 한 프레임 진행. 우선순위: (정지는 부르는 쪽에서) > 대화 상태 > 커서 추적 > 혼자 놀기 */
export function step(m: Motion, moni: Moni, dt: number, input: Input) {
  m.time += dt
  // 상태가 바뀌거나 같은 동작을 다시 요청하면 처음부터. 동작은 항상 하나만 진행된다
  if (input.state !== m.state || input.replay !== m.replay) {
    m.state = input.state
    m.replay = input.replay
    m.stateStart = m.time
  }
  const elapsed = m.time - m.stateStart
  const oneShot = ONE_SHOT[m.state]
  const conversation = m.state !== 'idle' && (oneShot === undefined || elapsed < oneShot) ? m.state : null

  // 일하는 중(생각·읽기)에는 장난 반응이 끼어들지 않는다
  const busy = conversation === 'thinking' || conversation === 'reading'
  if (m.reaction && (busy || m.time >= m.reactionEnd)) m.reaction = null
  const act = m.reaction ?? conversation

  const sinceInput = input.nowMs - m.lastInputMs
  // 모니 위에 커서를 올려 둔 채(듣는 중) 가만히 있어도 존다
  const sleepy = (!act || act === 'listening') && input.pointerTracking && !input.forceIdle && sinceInput > SLEEP_AFTER_MS
  if (sleepy && !m.sleeping) m.sleepStart = m.time
  // 자다가 입력이 들어오면 화들짝 깬다
  if (m.sleeping && !sleepy && sinceInput <= SLEEP_AFTER_MS && !busy) trigger(m, 'wake')
  m.sleeping = sleepy
  const pose = m.reaction ?? (sleepy ? null : conversation)
  const t = m.reaction ? m.time - m.reactionStart : elapsed

  const tracking = input.pointerTracking && m.pointerActive && sinceInput <= IDLE_AFTER_MS
  const idle = !pose && !sleepy && (input.forceIdle || (input.pointerTracking && sinceInput > IDLE_AFTER_MS))
  if (idle && !m.wasIdle) m.idleStart = m.time
  m.wasIdle = idle

  const breath = (m.time * Math.PI * 2) / 6 // 6초 호흡 주기
  let yaw = BASE_YAW
  let pitch = -0.02
  let roll = 0.02 * Math.sin(breath / 2) // 1~2도 이내의 느린 좌우 흔들림
  let bob = 0.012 * Math.sin(breath)
  let gx = 0
  let gy = 0
  let squint = 1
  let happy = false
  let showLogo = false
  let spinning = false

  if (pose === 'listening') {
    yaw += m.pointer.x * YAW_LIMIT * 0.4
    pitch += m.pointer.y * PITCH_LIMIT * 0.4
    roll *= 0.4
    m.label = '듣고 있어요'
  } else if (pose === 'thinking') {
    pitch = -0.11
    roll = 0.09
    gx = 0.035 * Math.sin(m.time * 1.2)
    gy = 0.04
    m.label = '생각 중 · 잠시만요'
  } else if (pose === 'reading') {
    // 서류를 한 줄씩 읽듯: 눈이 왼쪽→오른쪽으로 훑고, 빠르게 돌아와 한 줄 아래로. 세 줄마다 처음으로
    const line = Math.floor(t / READ_LINE) % 3
    const p = (t % READ_LINE) / READ_LINE
    const sweep = p < 0.8 ? p / 0.8 : 1 - (p - 0.8) / 0.2
    gx = -0.05 + 0.1 * sweep
    gy = 0.012 - line * 0.022
    yaw += 0.06 * (sweep - 0.5)
    pitch = 0.07 + line * 0.02
    roll *= 0.3
    squint = 0.85
    m.label = '서류 읽는 중'
  } else if (pose === 'ready') {
    // 파일을 끌고 오면 눈을 크게 뜨고 몸을 내밀어 받을 준비
    yaw += m.pointer.x * YAW_LIMIT * 0.6
    pitch += m.pointer.y * PITCH_LIMIT * 0.6 - 0.05
    bob += 0.03 + 0.008 * Math.sin(m.time * 8)
    gx = m.pointer.x * 0.05
    gy = -m.pointer.y * 0.03
    squint = 1.3
    m.label = '받을 준비'
  } else if (pose === 'speaking') {
    pitch += 0.1 * Math.sin((Math.PI * t) / 0.6)
    m.label = '말하는 중'
  } else if (pose === 'greeting') {
    yaw += 0.12 * Math.sin(t * 3)
    pitch += 0.09 * Math.sin(t * 5)
    roll = 0.04 * Math.sin(t * 3)
    m.label = '반가워요!'
  } else if (pose === 'success') {
    happy = true
    // 두 번 이내로 가볍게 끄덕이고 멈춘다
    pitch += t < 2.5 ? 0.12 * Math.sin(t * 5) * Math.exp(-t * 0.55) : 0
    bob += t < 2.5 ? 0.02 * Math.sin(t * 5) * Math.exp(-t) : 0
    m.label = '완료했어요'
  } else if (pose === 'dizzy') {
    // 눈이 빙글빙글 돌고 머리가 휘청이다 점점 가라앉는다
    const fade = Math.max(0, 1 - t / 2.2)
    yaw += 0.12 * Math.sin(t * 3.3) * fade
    pitch += 0.05 * Math.sin(t * 6.6) * fade
    roll = 0.1 * Math.sin(t * 5) * fade
    gx = 0.03 * Math.cos(t * 7) * fade
    gy = 0.03 * Math.sin(t * 7) * fade
    m.spin = t * 12
    spinning = true
    squint = 0.8
    m.label = '어지러워요'
  } else if (pose === 'petted') {
    // 손에 기대듯 좌우로 천천히 비비며 웃는다
    happy = true
    yaw += 0.05 * Math.sin(m.time * 4)
    roll = 0.07 * Math.sin(m.time * 4)
    pitch = 0.06
    bob += 0.01 * Math.sin(m.time * 8)
    m.label = '기분 좋아요'
  } else if (pose === 'wake') {
    // 화들짝: 눈을 크게 뜨고 몸이 튀어 오른 뒤 커서를 쳐다본다
    const settle = Math.min(1, t / REACTION_SEC.wake)
    yaw += m.pointer.x * YAW_LIMIT * settle
    pitch = -0.08 * (1 - settle) + m.pointer.y * PITCH_LIMIT * settle
    bob += 0.045 * Math.sin(Math.min(1, t / 0.35) * Math.PI)
    gx = m.pointer.x * 0.06
    gy = -m.pointer.y * 0.04
    squint = 1.35 - 0.35 * settle
    m.label = '깼어요'
  } else if (sleepy) {
    // 꾸벅꾸벅: 고개가 천천히 떨어지다 퍼뜩 들고, 다시 떨어진다
    const p = ((m.time - m.sleepStart) % NOD_CYCLE) / NOD_CYCLE
    const droop = p < 0.85 ? (p / 0.85) ** 2 : 1 - (p - 0.85) / 0.15
    pitch = 0.02 + 0.2 * droop
    roll = 0.05 * droop
    bob = 0.006 * Math.sin(breath) - 0.02 * droop
    gy = -0.02
    squint = 0.12
    m.label = '조는 중'
  } else if (pose === 'error') {
    pitch = 0.06
    roll = -0.08
    squint = 0.65
    m.label = '확인이 필요해요'
  } else if (tracking) {
    yaw += m.pointer.x * YAW_LIMIT
    pitch += m.pointer.y * PITCH_LIMIT
    roll = -m.pointer.x * 0.025
    gx = m.pointer.x * 0.06
    gy = -m.pointer.y * 0.04
    m.label = '커서를 따라보는 중'
  } else if (idle) {
    const p = (m.time - m.idleStart) % IDLE_CYCLE
    const look = Math.sin((p / IDLE_CYCLE) * Math.PI * 2)
    yaw += 0.19 * look
    pitch += 0.045 * Math.sin((p / 8) * Math.PI * 2)
    gx = 0.03 * look
    gy = 0.012 * Math.sin(breath)
    // 잠깐 책상 위 마우스를 쳐다보기
    if (p > 8 && p < 11.5) {
      const b = Math.sin(((p - 8) / 3.5) * Math.PI)
      yaw += 0.17 * b
      pitch += 0.13 * b
      gy -= 0.035 * b
    }
    showLogo = p > LOGO_FROM && p < LOGO_TO
    m.label = showLogo ? '대기 중 · interX' : '대기 중 · 혼자 놀기'
  } else {
    m.label = '기다리는 중'
  }

  // 머리: 각도 제한 → 본체를 뚫지 않게 숙임을 줄임 → quaternion slerp
  euler.set(
    THREE.MathUtils.clamp(pitch, -PITCH_LIMIT - 0.1, PITCH_LIMIT + 0.02),
    THREE.MathUtils.clamp(yaw, BASE_YAW - YAW_LIMIT, BASE_YAW + YAW_LIMIT + 0.2),
    THREE.MathUtils.clamp(roll, -0.1, 0.1),
  )
  targetQ.setFromEuler(euler)
  const headY = lerp(moni.headPivot.position.y, HEAD_BASE_Y + bob, follow(5, dt))
  for (let i = 0; i < 6 && clearance(targetQ, headY) < 0.02; i++) {
    euler.x *= 0.7
    targetQ.setFromEuler(euler)
  }
  moni.headPivot.quaternion.slerp(targetQ, follow(4.6, dt))
  moni.headPivot.position.y = headY

  // 눈이 먼저 움직이고 머리가 뒤따른다
  m.eyeX = lerp(m.eyeX, gx, follow(9, dt))
  m.eyeY = lerp(m.eyeY, gy, follow(9, dt))
  moni.eyesGroup.position.x = m.eyeX
  moni.eyesGroup.position.y = EYES_BASE_Y + m.eyeY

  // 3.2~6초 간격의 비주기 깜빡임, 0.16초
  m.blinkCountdown -= dt
  m.blinkAge += dt
  if (m.blinkCountdown <= 0) {
    m.blinkAge = 0
    m.blinkCountdown = 3.2 + Math.random() * 2.8
  }
  const blink = m.blinkAge < 0.16 ? 1 - 0.93 * Math.sin((Math.PI * m.blinkAge) / 0.16) : 1

  m.logo = lerp(m.logo, showLogo ? 1 : 0, follow(6, dt))
  moni.logo.material.opacity = m.logo
  const eyeVisible = m.logo < 0.5
  // 빙글빙글이 끝나면 가장 가까운 반 바퀴로 돌아온다 (캡슐 눈은 반 바퀴 돌려도 같은 모양)
  if (!spinning) m.spin = lerp(m.spin, Math.round(m.spin / Math.PI) * Math.PI, follow(8, dt))
  for (const e of moni.eyes) {
    e.scale.y = blink * squint * (1 - m.logo)
    e.rotation.z = m.spin
    e.visible = !happy && eyeVisible
  }
  for (const s of moni.smiles) s.visible = happy && eyeVisible
}
