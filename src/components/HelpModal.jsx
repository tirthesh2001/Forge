import { AnimatePresence } from 'framer-motion'
import { X, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react'

export default function HelpModal({ open, onClose, title, steps = [], dos = [], donts = [] }) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {steps.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>How to use</div>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-code)', fontSize: 12, flexShrink: 0, width: 20, textAlign: 'right' }}>{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {dos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Do's</div>
                {dos.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                    <CheckCircle2 size={14} style={{ color: '#22C55E', flexShrink: 0, marginTop: 2 }} />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}

            {donts.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Don'ts</div>
                {donts.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                    <AlertCircle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
