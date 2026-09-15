import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, Minus, Plus, ShoppingCart } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

const PRODUCT_EMOJIS = {
  BEBIDAS: '🥤',
  CERVEJAS: '🍺',
  DOCES: '🍰',
  GOURMET: '👨‍🍳',
  LANCHES: '🍔',
  PASTEIS: '🥟',
  PIZZAS: '🍕',
  PORÇÕES: '🍟',
  SALGADOS: '🧆',
  SORVETES: '🍦',
  AÇAI: '🫐',
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatPrice(value) {
  const v = (value || 0).toFixed(2)
  const [int, dec] = v.split('.')
  return { int, dec }
}

export default function ProductDetail({ produto, isOpen, onClose, onAddToCart }) {
  console.log('[PRODUCT-DETAIL] Renderizado. isOpen:', isOpen, 'produto:', produto?.nome)
  const [quantidade, setQuantidade] = useState(1)
  const [observacao, setObservacao] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const overlayRef = useRef(null)
  const closingFromPop = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setQuantidade(1)
      setObservacao('')
      setIsClosing(false)
      setIsOpening(true)
      closingFromPop.current = false
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsOpening(false))
      })
      window.history.pushState({ productDetail: true }, '')
    } else if (window.history.state?.productDetail && !closingFromPop.current) {
      window.history.back()
    }
  }, [isOpen, produto])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 250)
  }, [onClose])

  const handleCloseFromUI = useCallback(() => {
    if (window.history.state?.productDetail) {
      window.history.back()
    } else {
      handleClose()
    }
  }, [handleClose])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleCloseFromUI()
    }
    const handlePopState = () => {
      closingFromPop.current = true
      handleClose()
    }
    document.addEventListener('keydown', handleEsc)
    window.addEventListener('popstate', handlePopState)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      window.removeEventListener('popstate', handlePopState)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleClose, handleCloseFromUI])

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) handleCloseFromUI()
    },
    [handleCloseFromUI]
  )

  const handleDecrease = useCallback(() => {
    setQuantidade((prev) => Math.max(1, prev - 1))
  }, [])

  const handleIncrease = useCallback(() => {
    setQuantidade((prev) => Math.min(99, prev + 1))
  }, [])

  const handleAdd = useCallback(() => {
    if (produto && onAddToCart) {
      onAddToCart(produto, quantidade, observacao.trim() || null)
    }
  }, [produto, quantidade, observacao, onAddToCart])

  const ingredientes = useMemo(() => {
    const raw = produto?.descricao_receita
    if (!raw || typeof raw !== 'string') return []
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }, [produto?.descricao_receita])

  if (!isOpen || !produto) return null

  const preco = produto.valor_venda || produto.preco || 0
  const total = preco * quantidade
  const catName = produto.nome_categoria || ''
  const emoji = produto.emoji || PRODUCT_EMOJIS[catName.toUpperCase().trim()] || '🍽️'
  const { int, dec } = formatPrice(preco)
  const { int: totalInt, dec: totalDec } = formatPrice(total)

  return (
    <>
      <style>{`
        .pd-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transition: background 0.25s;
        }
        @media (min-width: 640px) {
          .pd-overlay { align-items: center; }
        }
        .pd-panel {
          width: 100%;
          max-width: 32rem;
          max-height: 90vh;
          background: white;
          border-radius: 24px 24px 0 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (min-width: 640px) {
          .pd-panel { border-radius: 24px; }
        }
        .pd-panel.closing { transform: translateY(100%); opacity: 0; }
        .pd-panel.opening { transform: translateY(100%); opacity: 0; }
        .pd-panel.open { transform: translateY(0); opacity: 1; }
        .pd-hero {
          width: 100%;
          height: 200px;
          background: linear-gradient(135deg, #EEF0F2, #F8F9FA);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .pd-hero .pd-emoji {
          font-size: 80px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.06));
        }
        .pd-hero .pd-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6C7A8A;
          font-size: 16px;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .pd-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .pd-name {
          font-size: 20px;
          font-weight: 700;
          color: #2D3436;
          line-height: 1.3;
        }
        .pd-desc {
          font-size: 14px;
          color: #8B95A1;
          margin-top: 8px;
          line-height: 1.6;
        }
        .pd-price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 16px;
        }
        .pd-price {
          font-size: 24px;
          font-weight: 700;
          color: #E85D4A;
        }
        .pd-price .pd-cents {
          font-size: 14px;
          font-weight: 600;
        }
        .pd-unit {
          font-size: 13px;
          color: #8B95A1;
        }
        .pd-divider {
          height: 1px;
          background: #EEF0F2;
          margin: 20px 0;
        }
        .pd-qty-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .pd-qty-label {
          font-size: 14px;
          font-weight: 600;
          color: #2D3436;
        }
        .pd-qty-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .pd-qty-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #EEF0F2;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6C7A8A;
          font-size: 16px;
          transition: all 0.2s;
        }
        .pd-qty-btn:active { transform: scale(0.9); }
        .pd-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .pd-qty-btn.plus {
          background: #E85D4A;
          border-color: #E85D4A;
          color: white;
          box-shadow: 0 4px 12px rgba(232, 93, 74, 0.3);
        }
        .pd-qty-btn.plus:hover { background: #C94F3E; }
        .pd-qty-value {
          font-size: 18px;
          font-weight: 700;
          color: #2D3436;
          min-width: 24px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .pd-obs-label {
          font-size: 14px;
          font-weight: 600;
          color: #2D3436;
          display: block;
          margin-bottom: 8px;
        }
        .pd-obs-label span {
          font-weight: 400;
          color: #8B95A1;
        }
        .pd-obs-textarea {
          width: 100%;
          padding: 12px 16px;
          background: #F8F9FA;
          border: 2px solid #EEF0F2;
          border-radius: 12px;
          font-size: 14px;
          color: #2D3436;
          outline: none;
          resize: none;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .pd-obs-textarea:focus {
          border-color: #E85D4A;
        }
        .pd-obs-textarea::placeholder {
          color: #ADB5BD;
        }
        .pd-obs-count {
          text-align: right;
          font-size: 11px;
          color: #ADB5BD;
          margin-top: 4px;
        }
        .pd-ingredients {
          margin-top: 16px;
        }
        .pd-ingredients-title {
          font-size: 14px;
          font-weight: 600;
          color: #2D3436;
          margin-bottom: 8px;
        }
        .pd-ingredients-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pd-ingredient-tag {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          color: #166534;
          font-size: 12px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .pd-footer {
          padding: 16px 20px;
          border-top: 1px solid #EEF0F2;
          background: white;
          flex-shrink: 0;
        }
        .pd-add-btn {
          width: 100%;
          background: #E85D4A;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .pd-add-btn:hover { background: #C94F3E; }
        .pd-add-btn:active { transform: scale(0.98); }
        .pd-add-btn .pd-total-badge {
          background: rgba(255,255,255,0.2);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
        }
        .pd-drag-handle {
          display: flex;
          justify-content: center;
          padding: 12px 0 4px;
        }
        .pd-drag-handle span {
          width: 40px;
          height: 4px;
          background: #DDE1E6;
          border-radius: 2px;
        }
      `}</style>

      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={`pd-overlay ${isClosing ? '' : 'bg-black/40'}`}
        style={{ background: isClosing ? 'transparent' : 'rgba(0,0,0,0.4)' }}
      >
        <div className={`pd-panel ${isClosing ? 'closing' : isOpening ? 'opening' : 'open'}`}>
          {/* Drag Handle (mobile) */}
          <div className="pd-drag-handle sm:hidden">
            <span />
          </div>

          {/* Hero Image */}
          <div className="pd-hero">
            {produto.id && (
              <img
                src={`${API_BASE_URL}/produtos/${produto.id}/foto`}
                alt={produto.nome}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <span className="pd-emoji">{emoji}</span>
            <button className="pd-close" onClick={handleCloseFromUI}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="pd-body">
            <h2 className="pd-name">{produto.nome}</h2>
            {produto.descricao && (
              <p className="pd-desc">{produto.descricao}</p>
            )}

            {/* Price */}
            <div className="pd-price-row">
              <span className="pd-price">
                R$ {int}<span className="pd-cents">,{dec}</span>
              </span>
              {produto.unidade && (
                <span className="pd-unit">/ {produto.unidade}</span>
              )}
            </div>

            <div className="pd-divider" />

            {/* Ingredients */}
            {ingredientes.length > 0 && (
              <div className="pd-ingredients">
                <p className="pd-ingredients-title">Ingredientes</p>
                <div className="pd-ingredients-list">
                  {ingredientes.map((ing, idx) => (
                    <span key={idx} className="pd-ingredient-tag">
                      {ing}
                    </span>
                  ))}
                </div>
                <div className="pd-divider" />
              </div>
            )}

            {/* Quantity */}
            <div className="pd-qty-row">
              <span className="pd-qty-label">Quantidade</span>
              <div className="pd-qty-controls">
                <button
                  className="pd-qty-btn"
                  onClick={handleDecrease}
                  disabled={quantidade <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="pd-qty-value">{quantidade}</span>
                <button
                  className="pd-qty-btn plus"
                  onClick={handleIncrease}
                  disabled={quantidade >= 99}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="pd-divider" />

            {/* Observation */}
            <div>
              <label className="pd-obs-label">
                Observação <span>(opcional)</span>
              </label>
              <textarea
                className="pd-obs-textarea"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Sem cebola, ponto da carne..."
                rows={3}
                maxLength={200}
              />
              <p className="pd-obs-count">{observacao.length}/200</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pd-footer">
            <button className="pd-add-btn" onClick={handleAdd}>
              <ShoppingCart className="h-5 w-5" />
              <span>Adicionar ao Pedido</span>
              <span className="pd-total-badge">{formatCurrency(total)}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
