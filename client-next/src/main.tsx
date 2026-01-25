import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { BrandProvider } from './contexts/BrandContext'
import { NavigationGuardProvider } from './contexts/NavigationGuardContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NavigationGuardProvider>
        <BrandProvider>
          <AuthProvider>
            <App />
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </BrandProvider>
      </NavigationGuardProvider>
    </BrowserRouter>
  </React.StrictMode>
)
