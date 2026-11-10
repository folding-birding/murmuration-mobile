import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { applyUiVariables } from './ui/ui-variable'
import './ui/global.css'

applyUiVariables()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
