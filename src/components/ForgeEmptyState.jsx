import { createElement } from 'react'
import { FileQuestion } from 'lucide-react'

/**
 * Shared empty / zero-state panel for tools.
 * @param {object} props
 * @param {import('react').ComponentType<{ size?: number, className?: string, style?: object }>} [props.icon]
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {{ label: string, onClick: () => void }} [props.primaryAction]
 * @param {{ label: string, onClick: () => void }} [props.secondaryAction]
 */
export default function ForgeEmptyState({
  icon: IconComponent = FileQuestion,
  title,
  description,
  primaryAction,
  secondaryAction,
}) {
  return (
    <div
      className="forge-card flex flex-col items-center justify-center text-center"
      style={{ padding: '40px 24px', minHeight: 200 }}
    >
      {createElement(IconComponent, {
        size: 40,
        style: { color: 'var(--text-muted)', opacity: 0.35, marginBottom: 16 },
      })}
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>{title}</h3>
      {description && (
        <p className="text-sm max-w-md mb-6" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {primaryAction && (
            <button type="button" className="forge-btn" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              className="forge-btn"
              style={{ background: 'transparent', border: '1px solid var(--border)' }}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
