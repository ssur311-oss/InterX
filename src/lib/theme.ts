// 지금 테마 (index.html의 <html data-theme="...">). 없으면 기본 파랑 테마
export const THEME = document.documentElement.dataset.theme ?? 'classic'

/** 테마에 맞는 로고 아이콘 */
export const LOGO_SRC = THEME === 'interx' ? '/interx-mark.png' : '/icon.svg'

// 브라우저 탭 아이콘도 테마를 따른다 (index.html은 그대로 두고 여기서 바꿔서, 테마를 지우면 같이 돌아가게)
if (THEME === 'interx') {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (link) {
    link.href = '/interx-favicon.png'
    link.type = 'image/png'
  }
}
