import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

import App from './App'
import { ConfirmDialogProvider } from './context/confirm-dialog-provider'
import { ThemeProvider } from './context/theme-provider'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: 1 } },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
        </ConfirmDialogProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
