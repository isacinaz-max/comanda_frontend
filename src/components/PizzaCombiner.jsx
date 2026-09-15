import { useState, useMemo, useCallback } from 'react'
import { X, Plus, Check } from 'lucide-react'

const SLOT_COLORS = ['#E85D4A', '#10B981']

const MAX_PARTS = 2

function PizzaSVG({ parts, maxParts }) {
  const numSlices = Math.max(parts.length, 1)

  const slots = useMemo(() => {
    const arr = []
    for (let i = 0; i < numSlices; i++) {
      arr.push({
        filled: i < parts.length,
        color: parts[i]?.color || '#E5E7EB',
        name: parts[i]?.nome || null,
      })
    }
    return arr
  }, [parts, numSlices])

  const angleStep = (2 * Math.PI) / numSlices
  const startAngle = -Math.PI / 2

  return (
    <svg viewBox="0 0 200 200" width="180" height="180" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}>
      <circle cx="100" cy="100" r="90" fill="#F8F9FA" stroke="#E5E7EB" strokeWidth="2" />
      {slots.map((slot, i) => {
        const a1 = startAngle + i * angleStep
        const a2 = startAngle + (i + 1) * angleStep

        let path
        if (numSlices === 1) {
          path = null
        } else {
          const largeArc = angleStep > Math.PI ? 1 : 0
          const x1 = 100 + 90 * Math.cos(a1)
          const y1 = 100 + 90 * Math.sin(a1)
          const x2 = 100 + 90 * Math.cos(a2)
          const y2 = 100 + 90 * Math.sin(a2)
          path = `M100,100 L${x1},${y1} A90,90 0 ${largeArc},1 ${x2},${y2} Z`
        }

        return (
          <g key={i}>
            {path ? (
              <path
                d={path}
                fill={slot.filled ? slot.color : '#F3F4F6'}
                stroke="white"
                strokeWidth="2"
                style={{ transition: 'fill 0.3s' }}
              />
            ) : (
              <circle
                cx="100" cy="100" r="88"
                fill={slot.filled ? slot.color : '#F3F4F6'}
                stroke="white"
                strokeWidth="2"
                style={{ transition: 'fill 0.3s' }}
              />
            )}
            {slot.filled && slot.name && (() => {
              let tx, ty, rotation
              if (numSlices === 1) {
                tx = 100
                ty = 100
                rotation = 0
              } else {
                const midAngle = a1 + angleStep / 2
                const textR = 55
                tx = 100 + textR * Math.cos(midAngle)
                ty = 100 + textR * Math.sin(midAngle)
                rotation = (midAngle * 180) / Math.PI
              }
              const adjustedRotation = rotation > 90 && rotation < 270 ? rotation + 180 : rotation
              return (
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={numSlices === 1 ? '12' : '10'}
                  fontWeight="700"
                  transform={`rotate(${adjustedRotation}, ${tx}, ${ty})`}
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                >
                  {slot.name.length > 10 ? slot.name.substring(0, 10) + '...' : slot.name}
                </text>
              )
            })()}
            {!slot.filled && numSlices > 1 && (() => {
              const midAngle = a1 + angleStep / 2
              const tx = 100 + 55 * Math.cos(midAngle)
              const ty = 100 + 55 * Math.sin(midAngle)
              return (
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#D1D5DB" fontSize="20" fontWeight="300">
                  +
                </text>
              )
            })()}
          </g>
        )
      })}
      <circle cx="100" cy="100" r="20" fill="white" stroke="#E5E7EB" strokeWidth="1" />
      <text x="100" y="104" textAnchor="middle" fontSize="11" fontWeight="700" fill="#6B7280">
        {parts.length > 0 ? `${parts.length}/${maxParts}` : '0'}
      </text>
    </svg>
  )
}

export default function PizzaCombiner({ produto, sabores, onConfirm, onCancel, initialProduto }) {
  const [parts, setParts] = useState(() => {
    if (initialProduto) {
      return [{ id: initialProduto.id, nome: initialProduto.nome, valor: initialProduto.valor_venda || 0, gtin: initialProduto.gtin, color: SLOT_COLORS[0] }]
    }
    return []
  })
  const [observacao, setObservacao] = useState('')

  const togglePart = useCallback((sabor) => {
    const exists = parts.find((p) => p.id === sabor.id)
    if (exists) {
      setParts((prev) => {
        const next = prev.filter((p) => p.id !== sabor.id)
        return next.map((p, i) => ({ ...p, color: SLOT_COLORS[i] }))
      })
    } else {
      if (parts.length >= MAX_PARTS) return
      setParts((prev) => [...prev, { id: sabor.id, nome: sabor.nome, valor: sabor.valor_venda || 0, gtin: sabor.gtin, color: SLOT_COLORS[prev.length] }])
    }
  }, [parts])

  const precoTotal = useMemo(() => {
    if (parts.length === 0) return produto?.valor_venda || 0
    return Math.max(...parts.map((p) => Number(p.valor) || 0))
  }, [parts, produto])

  const fractionLabel = useMemo(() => {
    if (parts.length === 0) return 'Selecione um sabor'
    if (parts.length === 1) return '1 inteira'
    if (parts.length === 2) return '2 sabores (meia cada)'
    return `${parts.length} sabores (${(100 / parts.length).toFixed(0)}% cada)`
  }, [parts])

  const handleConfirm = () => {
    if (parts.length === 0) return
    onConfirm({
      produto,
      sabores: parts.map((p) => ({ id: p.id, nome: p.nome, valor: precoTotal, gtin: p.gtin, fracao: 1 / parts.length })),
      preco: precoTotal,
      observacao: observacao.trim() || null,
    })
  }

  return (
    <>
      <style>{`
        .pc-overlay {
          position: fixed; inset: 0; z-index: 60;
          display: flex; align-items: flex-end; justify-content: center;
          background: rgba(0,0,0,0.4);
        }
        @media (min-width: 640px) { .pc-overlay { align-items: center; } }
        .pc-panel {
          background: white; border-radius: 24px 24px 0 0; width: 100%; max-width: 480px;
          max-height: 90vh; overflow-y: auto; animation: pcSlideUp 0.3s ease;
        }
        @media (min-width: 640px) { .pc-panel { border-radius: 24px; } }
        @keyframes pcSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .pc-header {
          padding: 20px 20px 0; display: flex; align-items: center; justify-content: space-between;
        }
        .pc-header h2 { font-size: 18px; font-weight: 700; color: #2D3436; }
        .pc-close {
          width: 32px; height: 32px; border-radius: 50%; border: none;
          background: #F3F4F6; color: #6B7280; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .pc-pizza-area {
          display: flex; flex-direction: column; align-items: center;
          padding: 20px;
        }
        .pc-slots {
          display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
          margin-top: 12px;
        }
        .pc-slot {
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; border: 2px solid transparent;
          display: flex; align-items: center; gap: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .pc-slot.filled {
          color: white; cursor: pointer;
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .pc-slot.empty {
          background: #F3F4F6; color: #9CA3AF; cursor: default;
          box-shadow: none; transform: none;
        }
        .pc-fraction {
          font-size: 14px; font-weight: 600; color: #6B7280; margin-top: 8px;
        }
        .pc-fraction.empty {
          color: #ADB5BD; font-style: italic;
        }
        .pc-obs {
          padding: 0 20px 12px;
        }
        .pc-obs textarea {
          width: 100%; padding: 10px 14px; border: 2px solid #EEF0F2; border-radius: 12px;
          font-size: 13px; resize: none; outline: none; font-family: inherit;
        }
        .pc-obs textarea:focus { border-color: #E85D4A; }
        .pc-sabores-title {
          padding: 0 20px; font-size: 13px; font-weight: 600; color: #8B95A1;
          text-transform: uppercase; letter-spacing: 1px;
        }
        .pc-sabores-list {
          padding: 12px 20px; display: flex; flex-direction: column; gap: 8px;
          max-height: 200px; overflow-y: auto;
        }
        .pc-sabor-btn {
          display: flex; flex-direction: column; gap: 4px; padding: 12px 16px;
          background: white; border: 2px solid #EEF0F2; border-radius: 14px;
          cursor: pointer; transition: all 0.2s; text-align: left;
        }
        .pc-sabor-btn:hover { border-color: #E85D4A; background: #FFF8F6; transform: scale(1.01); }
        .pc-sabor-btn.selected { 
          border-color: #10B981; background: #D1FAE5;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }
        .pc-sabor-btn .sb-top { display: flex; align-items: center; gap: 12px; }
        .pc-sabor-btn .sb-name { flex: 1; font-size: 14px; font-weight: 600; color: #2D3436; }
        .pc-sabor-btn .sb-price { font-size: 13px; color: #8B95A1; }
        .pc-sabor-btn .sb-check { color: #10B981; }
        .pc-sabor-btn .sb-receita { font-size: 11px; color: #9CA3AF; line-height: 1.3; }
        .pc-footer {
          padding: 16px 20px 20px; border-top: 1px solid #EEF0F2;
          position: sticky; bottom: 0; background: white;
        }
        .pc-total {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 12px;
        }
        .pc-total-label { font-size: 14px; color: #6B7A8A; }
        .pc-total-value { font-size: 20px; font-weight: 700; color: #E85D4A; }
        .pc-confirm-btn {
          width: 100%; padding: 16px; background: #E85D4A; color: white; border: none;
          border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 4px 16px rgba(232, 93, 74, 0.3);
          transition: all 0.2s;
        }
        .pc-confirm-btn:disabled { background: #D1D5DB; box-shadow: none; cursor: not-allowed; }
        .pc-confirm-btn:not(:disabled):active { transform: scale(0.97); }
      `}</style>

      <div className="pc-overlay" onClick={onCancel}>
        <div className="pc-panel" onClick={(e) => e.stopPropagation()}>
          <div className="pc-header">
            <h2>{produto?.nome || 'Montar Pizza'}</h2>
            <button className="pc-close" onClick={onCancel}><X size={16} /></button>
          </div>

          <div className="pc-pizza-area">
            <PizzaSVG parts={parts} maxParts={MAX_PARTS} />
            <p className={`pc-fraction ${parts.length === 0 ? 'empty' : ''}`}>{fractionLabel}</p>

            {parts.length > 0 && (
              <div className="pc-slots">
                {parts.map((p, i) => (
                  <span
                    key={i}
                    className="pc-slot filled"
                    style={{ backgroundColor: p.color }}
                    onClick={() => {
                      const next = parts.filter((_, j) => j !== i)
                      setParts(next.map((item, j) => ({ ...item, color: SLOT_COLORS[j] })))
                    }}
                  >
                    {p.nome} ✕
                  </span>
                ))}
                {parts.length < MAX_PARTS && Array.from({ length: MAX_PARTS - parts.length }).map((_, i) => (
                  <span key={`empty-${i}`} className="pc-slot empty">+ Parte</span>
                ))}
              </div>
            )}
          </div>

          <div className="pc-obs">
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação (opcional)"
              rows={2}
              maxLength={200}
            />
          </div>

          {parts.length < MAX_PARTS && (
            <>
              <p className="pc-sabores-title">Escolha o sabor</p>
              <div className="pc-sabores-list">
                {sabores.map((sabor) => {
                  const selected = parts.some((p) => p.id === sabor.id)
                  return (
                    <button
                      key={sabor.id}
                      className={`pc-sabor-btn ${selected ? 'selected' : ''}`}
                      onClick={() => togglePart(sabor)}
                    >
                      <div className="sb-top">
                        <span className="sb-name">{sabor.nome}</span>
                        <span className="sb-price">R$ {(sabor.valor_venda || 0).toFixed(2).replace('.', ',')}</span>
                        {selected && <Check size={16} className="sb-check" />}
                        {!selected && <Plus size={16} style={{ color: '#D1D5DB' }} />}
                      </div>
                      {sabor.descricao_receita && (
                        <span className="sb-receita">{sabor.descricao_receita}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="pc-footer">
            <div className="pc-total">
              <span className="pc-total-label">Total</span>
              <span className="pc-total-value">R$ {precoTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            <button className="pc-confirm-btn" disabled={parts.length === 0} onClick={handleConfirm}>
              Adicionar ao carrinho
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
