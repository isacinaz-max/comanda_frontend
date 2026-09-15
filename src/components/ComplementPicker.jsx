import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check, ShoppingCart } from 'lucide-react'
import { getComplementosByCategoria } from '../services/api'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export default function ComplementPicker({ produto, onConfirm, onCancel }) {
  const [complementos, setComplementos] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const overlayRef = useRef(null)
  const closingFromPop = useRef(false)

  useEffect(() => {
    const fetchComplementos = async () => {
      if (!produto?.id_categoria) {
        setLoading(false)
        return
      }
      try {
        const data = await getComplementosByCategoria(produto.id_categoria)
        setComplementos(data.complementos || [])
        setAdicionais(data.adicionais || [])
      } catch (error) {
        console.error('Erro ao buscar complementos:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchComplementos()
  }, [produto?.id_categoria])

  useEffect(() => {
    if (!loading) {
      setIsClosing(false)
      setIsOpening(true)
      closingFromPop.current = false
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsOpening(false))
      })
      window.history.pushState({ complementPicker: true }, '')
    }
  }, [loading])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onCancel()
    }, 250)
  }, [onCancel])

  const handleCloseFromUI = useCallback(() => {
    if (window.history.state?.complementPicker) {
      window.history.back()
    } else {
      handleClose()
    }
  }, [handleClose])

  useEffect(() => {
    if (loading) return
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
  }, [loading, handleClose, handleCloseFromUI])

  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) handleCloseFromUI()
    },
    [handleCloseFromUI]
  )

  const toggleItem = (id) => {
    const newSelected = new Set(selected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelected(newSelected)
  }

  const handleConfirm = () => {
    const allItems = [...complementos, ...adicionais]
    const selectedItems = allItems.filter((item) => selected.has(item.id))
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onConfirm(selectedItems)
    }, 250)
  }

  const totalAdicionais = adicionais
    .filter((a) => selected.has(a.id))
    .reduce((sum, a) => sum + (a.valor_complemento || 0), 0)

  const selectedCount = selected.size

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #F59E0B', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Carregando complementos...</p>
        </div>
      </div>
    )
  }

  if (complementos.length === 0 && adicionais.length === 0) {
    return null
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cp-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transition: background 0.25s;
        }
        @media (min-width: 640px) {
          .cp-overlay { align-items: center; }
        }
        .cp-panel {
          width: 100%;
          max-width: 28rem;
          max-height: 90vh;
          background: white;
          border-radius: 24px 24px 0 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (min-width: 640px) {
          .cp-panel { border-radius: 24px; }
        }
        .cp-panel.closing { transform: translateY(100%); opacity: 0; }
        .cp-panel.opening { transform: translateY(100%); opacity: 0; }
        .cp-panel.open { transform: translateY(0); opacity: 1; }
        .cp-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid #EEF0F2;
          background: white;
          flex-shrink: 0;
        }
        .cp-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .cp-title {
          font-size: 18px;
          font-weight: 700;
          color: #2D3436;
          line-height: 1.3;
        }
        .cp-close {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #F8F9FA;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6C7A8A;
          transition: all 0.2s;
        }
        .cp-close:hover { background: #EEF0F2; color: #2D3436; }
        .cp-subtitle {
          font-size: 13px;
          color: #8B95A1;
        }
        .cp-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }
        .cp-section-title {
          font-size: 11px;
          font-weight: 700;
          color: #8B95A1;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .cp-section-title span {
          font-weight: 400;
          color: #10B981;
        }
        .cp-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: white;
          border: 2px solid #EEF0F2;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 8px;
          text-align: left;
        }
        .cp-item:hover { border-color: #D1D5DB; }
        .cp-item.selected { border-color: #F59E0B; background: #FFFBEB; }
        .cp-item-name {
          font-size: 14px;
          font-weight: 600;
          color: #2D3436;
        }
        .cp-item-price {
          font-size: 13px;
          font-weight: 600;
          color: #10B981;
          margin-left: 8px;
        }
        .cp-item-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #D1D5DB;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .cp-item.selected .cp-item-check {
          background: #F59E0B;
          border-color: #F59E0B;
        }
        .cp-footer {
          padding: 16px 20px;
          border-top: 1px solid #EEF0F2;
          background: white;
          flex-shrink: 0;
        }
        .cp-footer-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .cp-footer-selected {
          font-size: 13px;
          color: #6B7280;
        }
        .cp-footer-selected strong {
          color: #2D3436;
        }
        .cp-footer-total {
          font-size: 14px;
          font-weight: 600;
          color: #10B981;
        }
        .cp-confirm-btn {
          width: 100%;
          background: #F59E0B;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .cp-confirm-btn:hover { background: #D97706; }
        .cp-confirm-btn:active { transform: scale(0.98); }
        .cp-confirm-btn:disabled {
          background: #D1D5DB;
          cursor: not-allowed;
        }
        .cp-drag-handle {
          display: flex;
          justify-content: center;
          padding: 12px 0 4px;
        }
        .cp-drag-handle span {
          width: 40px;
          height: 4px;
          background: #DDE1E6;
          border-radius: 2px;
        }
        .cp-empty {
          text-align: center;
          padding: 40px 20px;
          color: #8B95A1;
          font-size: 14px;
        }
      `}</style>

      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="cp-overlay"
        style={{ background: isClosing ? 'transparent' : 'rgba(0,0,0,0.4)' }}
      >
        <div className={`cp-panel ${isClosing ? 'closing' : isOpening ? 'opening' : 'open'}`}>
          <div className="cp-drag-handle sm:hidden">
            <span />
          </div>

          <div className="cp-header">
            <div className="cp-header-top">
              <h3 className="cp-title">{produto.nome}</h3>
              <button className="cp-close" onClick={handleCloseFromUI}>
                <X size={18} />
              </button>
            </div>
            <p className="cp-subtitle">Selecione o que deseja adicionar</p>
          </div>

          <div className="cp-body">
            {complementos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p className="cp-section-title">Complementos <span>Grátis</span></p>
                {complementos.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`cp-item ${selected.has(item.id) ? 'selected' : ''}`}
                  >
                    <span className="cp-item-name">{item.nome_complemento}</span>
                    <div className="cp-item-check">
                      {selected.has(item.id) && <Check size={14} color="white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {adicionais.length > 0 && (
              <div>
                <p className="cp-section-title">Adicionais <span>Pago</span></p>
                {adicionais.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`cp-item ${selected.has(item.id) ? 'selected' : ''}`}
                  >
                    <div>
                      <span className="cp-item-name">{item.nome_complemento}</span>
                      <span className="cp-item-price">+ {formatCurrency(item.valor_complemento)}</span>
                    </div>
                    <div className="cp-item-check">
                      {selected.has(item.id) && <Check size={14} color="white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="cp-footer">
            <div className="cp-footer-info">
              <span className="cp-footer-selected">
                <strong>{selectedCount}</strong> {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
              {totalAdicionais > 0 && (
                <span className="cp-footer-total">+ {formatCurrency(totalAdicionais)}</span>
              )}
            </div>
            <button
              className="cp-confirm-btn"
              onClick={handleConfirm}
            >
              <ShoppingCart size={18} />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
