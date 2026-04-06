import { Toaster } from 'react-hot-toast'

export default function Toast() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
        },
        success: {
          iconTheme: { primary: 'var(--accent)', secondary: 'var(--surface)' },
        },
      }}
    />
  )
}
