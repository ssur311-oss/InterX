import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupUiScale } from './lib/uiScale'
import './lib/theme' // 테마에 맞는 탭 아이콘

setupUiScale()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
