import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import HelpModal from './HelpModal'
import { HELP } from '../utils/helpData'

export default function ToolHeader({ toolId, title, description, children }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const helpData = HELP[toolId]

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1>{title}</h1>
                {helpData && (
                  <button onClick={() => setHelpOpen(true)} title="Help"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, opacity: 0.5, transition: 'opacity 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}>
                    <HelpCircle size={18} />
                  </button>
                )}
              </div>
              <p>{description}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
      {helpData && <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} {...helpData} />}
    </>
  )
}
