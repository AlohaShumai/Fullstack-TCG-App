import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Browser entry point — mounts the React app into the <div id="root"> in index.html.
// StrictMode renders components twice in development to detect side-effect bugs.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
