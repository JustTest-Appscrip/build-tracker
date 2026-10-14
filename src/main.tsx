import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('Build Tracker shell is ready for offline fallback.')
    },
    onNeedRefresh() {
      toast.message('Update available', {
        description: 'A new version of Build Tracker is ready.',
        action: {
          label: 'Reload',
          onClick: () => updateSW(true),
        },
        duration: Infinity,
      })
    },
  })
}
