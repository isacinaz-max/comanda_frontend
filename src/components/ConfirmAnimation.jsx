import { useState, useEffect, useRef } from 'react'

const CONFETTE_COLORS = ['#E85D4A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']

function ConfettiCanvas({ running }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!running) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const cx = rect.width / 2
    const cy = rect.height / 2
    const particles = []
    const count = 60

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const speed = 3 + Math.random() * 5
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        w: 4 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        color: CONFETTE_COLORS[Math.floor(Math.random() * CONFETTE_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        gravity: 0.12 + Math.random() * 0.08,
        life: 1,
        decay: 0.008 + Math.random() * 0.008,
        isCircle: Math.random() > 0.6,
      })
    }

    let lastTime = performance.now()
    const animate = (now) => {
      const dt = Math.min((now - lastTime) / 16, 3)
      lastTime = now
      ctx.clearRect(0, 0, rect.width, rect.height)

      let alive = false
      for (const p of particles) {
        if (p.life <= 0) continue
        alive = true
        p.x += p.vx * dt
        p.vy += p.gravity * dt
        p.y += p.vy * dt
        p.rotation += p.rotSpeed * dt
        p.life -= p.decay * dt

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.color
        if (p.isCircle) {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }

      if (alive) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [running])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
    />
  )
}

export default function ConfirmAnimation() {
  const [phase, setPhase] = useState(0)
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReduced) {
      setPhase(3)
      return
    }
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 500)
    const t3 = setTimeout(() => setPhase(3), 800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [prefersReduced])

  const showConfetti = phase >= 2
  const showTexts = phase >= 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 16px', position: 'relative' }}>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          80% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .confirm-seal { animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .confirm-check { stroke-dasharray: 30; stroke-dashoffset: 30; animation: drawCheck 0.4s 0.3s ease forwards; }
        .confirm-ring { position: absolute; border-radius: 50%; border: 2.5px solid #10B981; animation: ringPulse 0.8s ease-out forwards; pointer-events: none; }
        .confirm-text-title { animation: fadeUp 0.4s ease forwards; }
        .confirm-text-sub { animation: fadeUp 0.4s 0.15s ease forwards; }
      `}</style>

      <div style={{ position: 'relative', width: '80px', height: '80px', marginBottom: '20px' }}>
        {showConfetti && <ConfettiCanvas running={showConfetti} />}

        {/* Anéis pulsantes */}
        <div className="confirm-ring" style={{ width: '80px', height: '80px', top: 0, left: 0, animationDelay: '0.1s' }} />
        <div className="confirm-ring" style={{ width: '80px', height: '80px', top: 0, left: 0, animationDelay: '0.3s' }} />

        {/* Selo circular */}
        <div className="confirm-seal" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 5, boxShadow: '0 4px 20px rgba(16,185,129,0.35)', opacity: phase >= 1 ? 1 : 0 }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path className="confirm-check" d="M9 18.5L15 24.5L27 11.5" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Textos */}
      {showTexts && (
        <div style={{ textAlign: 'center' }}>
          <p className="confirm-text-title" style={{ fontSize: '18px', fontWeight: 700, color: '#2D3436', marginBottom: '6px' }}>Seu pedido foi confirmado</p>
          <p className="confirm-text-sub" style={{ fontSize: '14px', color: '#8B95A1' }}>Seu pedido foi enviado com sucesso.</p>
        </div>
      )}
    </div>
  )
}
