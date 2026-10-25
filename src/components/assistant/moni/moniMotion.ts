import * as THREE from 'three'
import { EYES_BASE_Y, HEAD_BASE_Y, PEDESTAL_HALF, PEDESTAL_TOP, TRIM_TOP, type Moni } from './buildMoni'

export type MoniState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error' | 'greeting'

const DEG = Math.PI / 180
const YAW_LIMIT = 25 * DEG
const PITCH_LIMIT = 13 * DEG
const BASE_YAW = 0.23 // 카메라가 오른쪽 위에서 보므로 살짝 정면을 향하게
const IDLE_AFTER_MS = 8000
const IDLE_CYCLE = 16
const LOGO_FROM = 12.5 // 대기 사이클 중 interX 로고를 띄우는 구간 (2.5초)
const LOGO_TO = 15
// 한 번 하고 끝나는 동작의 길이. 끝나면 prop이 그대로여도 자동 반응으로 돌아간다
const ONE_SHOT: Partial<Record<MoniState, number>> = { speaking: 0.7, success: 2.6, greeting: 2.4 }

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
}

export function createMotion(now: number): Motion {
  return {
    time: 0, state: 'idle', replay: 0, stateStart: 0, idleStart: 0, wasIdle: false, lastInputMs: now,
    pointer: { x: 0, y: 0 }, pointerActive: false, eyeX: 0, eyeY: 0,
    blinkCountdown: 2.5, blinkAge: 1, logo: 0, label: '',
  }
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

  const tracking = input.pointerTracking && m.pointerActive && input.nowMs - m.lastInputMs <= IDLE_AFTER_MS
  const idle = !conversation && (input.forceIdle || (input.pointerTracking && input.nowMs - m.lastInputMs > IDLE_AFTER_MS))
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

  if (conversation === 'listening') {
    yaw += m.pointer.x * YAW_LIMIT * 0.4
    pitch += m.pointer.y * PITCH_LIMIT * 0.4
    roll *= 0.4
    m.label = '듣고 있어요'
  } else if (conversation === 'thinking') {
    pitch = -0.11
    roll = 0.09
    gx = 0.035 * Math.sin(m.time * 1.2)
    gy = 0.04
    m.label = '생각 중 · 잠시만요'
  } else if (conversation === 'speaking') {
    pitch += 0.1 * Math.sin((Math.PI * elapsed) / 0.6)
    m.label = '말하는 중'
  } else if (conversation === 'greeting') {
    yaw += 0.12 * Math.sin(elapsed * 3)
    pitch += 0.09 * Math.sin(elapsed * 5)
    roll = 0.04 * Math.sin(elapsed * 3)
    m.label = '반가워요!'
  } else if (conversation === 'success') {
    happy = true
    // 두 번 이내로 가볍게 끄덕이고 멈춘다
    pitch += elapsed < 2.5 ? 0.12 * Math.sin(elapsed * 5) * Math.exp(-elapsed * 0.55) : 0
    bob += elapsed < 2.5 ? 0.02 * Math.sin(elapsed * 5) * Math.exp(-elapsed) : 0
    m.label = '완료했어요'
  } else if (conversation === 'error') {
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
  for (const e of moni.eyes) {
    e.scale.y = blink * squint * (1 - m.logo)
    e.visible = !happy && eyeVisible
  }
  for (const s of moni.smiles) s.visible = happy && eyeVisible
}
