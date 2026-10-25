// 창 크기에 맞춰 화면 전체(글씨·버튼·카드·그래프)를 같은 비율로 줄인다.
// 화면은 1440×880 기준으로 만들었으므로, 창이 그보다 작으면 그만큼 줄여서 구성이 그대로 보이게 한다.
const BASE_W = 1440
const BASE_H = 880
const MIN_ZOOM = 0.68
const MOBILE = 768 // 휴대폰 폭에서는 줄이지 않고 원래 반응형 화면을 쓴다

function applyZoom() {
  const w = window.innerWidth
  const z = w < MOBILE ? 1 : Math.min(1, Math.max(MIN_ZOOM, Math.min(w / BASE_W, window.innerHeight / BASE_H)))
  document.documentElement.style.setProperty('--ui-zoom', z.toFixed(3))
}

/** 설치한 앱으로 처음 열 때만 설정 창 정도 크기로 가운데 띄운다. 이후엔 사용자가 바꾼 크기를 브라우저가 기억한다 */
function firstWindowSize() {
  const installed = matchMedia('(display-mode: standalone), (display-mode: window-controls-overlay)').matches
  if (!installed) return
  try {
    if (localStorage.getItem('window-sized-v1')) return
    localStorage.setItem('window-sized-v1', '1')
    const w = Math.min(1100, screen.availWidth)
    const h = Math.min(720, screen.availHeight)
    window.resizeTo(w, h)
    window.moveTo(Math.round((screen.availWidth - w) / 2), Math.round((screen.availHeight - h) / 2))
  } catch {
    // 브라우저가 창 크기 조절을 막으면 그냥 둔다
  }
}

export function setupUiScale() {
  firstWindowSize()
  applyZoom()
  window.addEventListener('resize', applyZoom)
}
