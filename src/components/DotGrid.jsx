import { useEffect, useRef } from 'react'

export default function DotGrid({ style, className, globalMouse = false, spacing = 28, baseRadius = 1.2, maxRadius = 3.5, influence = 120, baseAlpha = 0.12 }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    const SPACING = spacing
    const BASE_R = baseRadius
    const MAX_R = maxRadius
    const INFLUENCE = influence

    let w, h, cols, rows

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / SPACING) + 1
      rows = Math.ceil(h / SPACING) + 1
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const { x: mx, y: my } = mouseRef.current
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00D4FF'

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * SPACING
          const y = r * SPACING
          const dx = x - mx
          const dy = y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          const t = Math.max(0, 1 - dist / INFLUENCE)
          const radius = BASE_R + (MAX_R - BASE_R) * t * t
          const alpha = baseAlpha + 0.5 * t * t

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          if (t > 0.01) {
            ctx.fillStyle = accent
            ctx.globalAlpha = alpha
          } else {
            ctx.fillStyle = accent
            ctx.globalAlpha = baseAlpha
          }
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(draw)
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    resize()
    draw()

    const target = globalMouse ? window : canvas
    target.addEventListener('mousemove', handleMouseMove)
    if (!globalMouse) canvas.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('resize', resize)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      target.removeEventListener('mousemove', handleMouseMove)
      if (!globalMouse) canvas.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('resize', resize)
    }
  }, [globalMouse, spacing, baseRadius, maxRadius, influence, baseAlpha])

  return <canvas ref={canvasRef} className={className} style={{ display: 'block', width: '100%', height: '100%', ...style }} />
}
