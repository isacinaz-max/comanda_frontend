import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { updateComanda, addItemComanda, getComandaByMesaId, createComanda, updateMesaSituacao, getNextIndexPreparo, insertAdicionais, addComplementos, API_BASE_URL } from '../services/api'
import ConfirmAnimation from '../components/ConfirmAnimation'

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

const PRODUCT_EMOJIS = {
  BEBIDAS: '🥤', CERVEJAS: '🍺', DOCES: '🍰', GOURMET: '👨‍🍳',
  LANCHES: '🍔', PASTEIS: '🥟', PIZZAS: '🍕', PORÇÕES: '🍟',
  SALGADOS: '🧆', SORVETES: '🍦', AÇAI: '🫐',
}

function getProdutoEmoji(catName) {
  return PRODUCT_EMOJIS[(catName || '').toUpperCase().trim()] || '🍽️'
}

function ProdutoImage({ produtoId, catName }) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const emoji = getProdutoEmoji(catName)
  if (!produtoId || imgError) return <span style={{ fontSize: '28px' }}>{emoji}</span>
  return (
    <>
      {!imgLoaded && <span style={{ fontSize: '28px', position: 'absolute' }}>{emoji}</span>}
      <img
        src={`${API_BASE_URL}/produtos/${produtoId}/foto`}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
    </>
  )
}

export default function Pedido() {
  const navigate = useNavigate()
  const {
    mesa,
    comanda,
    carrinho,
    updateItemQuantity,
    removeItem,
    clearCarrinho,
    removeComplemento,
    updateItemObservacao,
    getCartTotal,
    getCartItemCount,
  } = useStore()

  const [editingObs, setEditingObs] = useState(null)
  const [obsText, setObsText] = useState('')

  const sendingRef = useRef(false)
  const [sending, setSending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [showPessoasModal, setShowPessoasModal] = useState(false)
  const [qtdePessoas, setQtdePessoas] = useState(comanda?.qtde_pessoas || 1)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [toastType, setToastType] = useState('success')
  const toastTimeoutRef = useRef(null)

  const cartTotal = getCartTotal()
  const cartCount = getCartItemCount()

  const showToast = useCallback((msg, type = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setToastVisible(true)
    clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 2800)
  }, [])

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => navigate('/acompanhar'), 2000)
      return () => clearTimeout(timer)
    }
  }, [showSuccess, navigate])

  const handleUpdateQty = useCallback((cartItemId, delta) => {
    const item = carrinho.find((c) => c.cartItemId === cartItemId)
    if (!item) return
    const newQty = item.quantidade + delta
    if (newQty < 1) {
      return
    }
    updateItemQuantity(cartItemId, newQty)
  }, [carrinho, updateItemQuantity])

  const handleRemoveItem = useCallback((cartItemId) => {
    const item = carrinho.find((c) => c.cartItemId === cartItemId)
    removeItem(cartItemId)
    showToast(`${item?.produto?.nome || 'Item'} removido 🗑️`, 'error')
  }, [carrinho, removeItem, showToast])

  const handleClearCart = useCallback(() => {
    if (carrinho.length === 0) return
    clearCarrinho()
    showToast('Carrinho limpo 🗑️', 'error')
  }, [carrinho, clearCarrinho, showToast])

  const handleStartEditObs = useCallback((cartItemId, currentObs) => {
    setEditingObs(cartItemId)
    setObsText(currentObs || '')
  }, [])

  const handleSaveObs = useCallback((cartItemId) => {
    updateItemObservacao(cartItemId, obsText.trim() || null)
    setEditingObs(null)
    setObsText('')
    showToast('Observação atualizada ✓', 'success')
  }, [obsText, updateItemObservacao, showToast])

  const handleCancelEditObs = useCallback(() => {
    setEditingObs(null)
    setObsText('')
  }, [])

  const handleSalvarPedido = useCallback(async () => {
    if (sendingRef.current) return
    if (!mesa || carrinho.length === 0) return
    sendingRef.current = true
    setSending(true)
    setSendError(null)
    try {
      let comandaAtual = null

      console.log('[PEDIDO] Buscando comanda aberta para mesa:', mesa.id)
      try {
        comandaAtual = await getComandaByMesaId(mesa.id)
        console.log('[PEDIDO] Comanda encontrada via mesa:', comandaAtual?.id)
      } catch {
        console.log('[PEDIDO] Nenhuma comanda aberta para mesa')
      }

      if (!comandaAtual?.id) {
        console.log('[PEDIDO] Criando nova comanda para mesa:', mesa.id)
        const result = await createComanda({
          id_mesa: mesa.id,
          situacao: 'P',
          tipo: 'M',
        })
        console.log('[PEDIDO] Comanda criada:', result.id)
        try {
          comandaAtual = await getComandaByMesaId(mesa.id)
        } catch {
          comandaAtual = { id: result.id }
        }
      }
      useStore.getState().setComanda(comandaAtual)
      if (comandaAtual.situacao !== 'P' && comandaAtual.situacao !== 'A') {
        useStore.getState().setComanda(null)
        setSendError('Mesa já possui comanda ativa em andamento.')
        return
      }
      await updateMesaSituacao(mesa.id, 'O')

      const total = carrinho.reduce((acc, item) => {
        const preco = item.produto.valor_venda || item.produto.preco || 0
        const complementosTotal = (item.complementos || []).reduce((sum, c) => {
          const valor = Number(c.valor_complemento) || 0
          return sum + valor
        }, 0)
        return acc + preco * item.quantidade + complementosTotal
      }, 0)

      const valorExistente = Number(comandaAtual.valor) || 0
      const subtotalExistente = Number(comandaAtual.subtotal) || 0

      await updateComanda(comandaAtual.id, {
        situacao: 'P',
        qtde_pessoas: qtdePessoas,
        valor: valorExistente + total,
        subtotal: subtotalExistente + total,
      })

      let itemCounter = 1
      const indexPreparo = await getNextIndexPreparo(comandaAtual.id)

      const comboGroups = {}
      const regularItems = []
      for (const item of carrinho) {
        if (item.comboId) {
          if (!comboGroups[item.comboId]) {
            comboGroups[item.comboId] = { items: [], nome: item.comboProdutoNome, observacao: item.produto.observacao }
          }
          comboGroups[item.comboId].items.push(item)
        } else {
          regularItems.push(item)
        }
      }

      console.log('[PEDIDO] ====== ITENS REGULARES ======')
      for (const item of regularItems) {
        console.log('[PEDIDO] Item:', item.produto.nome, '| cartItemId:', item.cartItemId, '| observacao:', item.produto.observacao, '| complementos:', item.complementos?.length || 0)
      }
      console.log('[PEDIDO] ================================')

      console.log('[PEDIDO] ====== COMBO GROUPS ======')
      for (const [comboId, group] of Object.entries(comboGroups)) {
        console.log('[PEDIDO] Combo:', group.nome, '| items:', group.items.length)
        for (const item of group.items) {
          console.log('[PEDIDO]   →', item.produto.nome, '| cartItemId:', item.cartItemId, '| observacao:', item.produto.observacao)
        }
      }
      console.log('[PEDIDO] ================================')

      for (const [comboId, group] of Object.entries(comboGroups)) {
        let idCombinado = null
        for (const item of group.items) {
          const preco = item.produto.valor_venda || item.produto.preco || 0
          const payload = {
            id_produto: item.produto.id,
            id_grupo: item.produto.id_grupo,
            nome_produto: item.produto.nome,
            unidade_produto: item.produto.unidade,
            gtin_produto: item.produto.gtin,
            quantidade: item.quantidade,
            valor_unitario: preco,
            valor_total: preco * item.quantidade,
            item: itemCounter++,
            tipo_venda: 'M',
            observacao: item.produto.observacao || null,
            id_combinado: idCombinado,
            index_preparo: indexPreparo,
          }
          console.log('[PEDIDO] COMBO ENVIANDO:', item.produto.nome, '| observacao do item:', item.produto.observacao, '| payload.observacao:', payload.observacao)
          const response = await addItemComanda(comandaAtual.id, payload)
          const isFirst = idCombinado === null
          if (isFirst) {
            idCombinado = response.id
          }

          if (isFirst && item.complementos && item.complementos.length > 0) {
            const complementosParaSalvar = item.complementos.map((c) => ({
              ...c,
              id_detalhe_origem: response.id,
            }))
            console.log('[PEDIDO] COMBO Enviando complementos:', JSON.stringify(complementosParaSalvar))
            await addComplementos(comandaAtual.id, complementosParaSalvar)
          }
        }
      }

      for (const item of regularItems) {
        const preco = item.produto.valor_venda || item.produto.preco || 0
        const payload = {
          id_produto: item.produto.id,
          id_grupo: item.produto.id_grupo,
          nome_produto: item.produto.nome,
          unidade_produto: item.produto.unidade,
          gtin_produto: item.produto.gtin,
          quantidade: item.quantidade,
          valor_unitario: preco,
          valor_total: preco * item.quantidade,
          item: itemCounter++,
          tipo_venda: 'M',
          observacao: item.produto.observacao || null,
          index_preparo: indexPreparo,
        }
        console.log('[PEDIDO] >>> ENVIANDO ITEM:', item.produto.nome, '| cartItemId:', item.cartItemId, '| observacao:', item.produto.observacao)
        console.log('[PEDIDO] Payload enviado:', JSON.stringify(payload))
        console.log('[PEDIDO] Item carrinho complementos:', item.complementos)
        const response = await addItemComanda(comandaAtual.id, payload)
        console.log('[PEDIDO] Response ID (idDetalhe):', response.id)

        if (item.complementos && item.complementos.length > 0) {
          const complementosParaSalvar = item.complementos.map((c) => ({
            ...c,
            id_detalhe_origem: response.id,
          }))
          console.log('[PEDIDO] Enviando complementos:', JSON.stringify(complementosParaSalvar))
          await addComplementos(comandaAtual.id, complementosParaSalvar)
        }
      }

      try {
        await insertAdicionais(comandaAtual.id, total)
      } catch {}

      clearCarrinho()
      setShowSuccess(true)
    } catch (err) {
      setSendError(err.response?.data?.message || 'Erro ao enviar pedido. Tente novamente.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [mesa, carrinho, qtdePessoas, clearCarrinho])

  const handleConfirmarPedido = useCallback(() => {
    if (carrinho.length === 0) return
    if (comanda?.id) {
      handleSalvarPedido()
    } else {
      setShowPessoasModal(true)
    }
  }, [carrinho, comanda, handleSalvarPedido])

  if (showSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FA' }}>
        <ConfirmAnimation />
      </div>
    )
  }

  if (!mesa) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FA', padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🍽️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2D3436', marginBottom: '4px' }}>Nenhuma mesa selecionada</h2>
          <p style={{ fontSize: '13px', color: '#8B95A1', marginBottom: '16px' }}>Volte para identificar sua mesa</p>
          <button onClick={() => window.history.back()} style={{ color: '#E85D4A', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Voltar</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .pedido-item {
          background: white; border-radius: 16px; padding: 14px 16px;
          margin-bottom: 12px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .pedido-item .pi-image {
          width: 50px; height: 50px; border-radius: 12px;
          background: #F8F9FA; display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0; position: relative; overflow: hidden;
        }
        .pedido-item .pi-info { flex: 1; min-width: 0; }
        .pedido-item .pi-name { font-size: 15px; font-weight: 600; color: #2D3436; margin-bottom: 2px; }
        .pedido-item .pi-desc { font-size: 12px; color: #8B95A1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pedido-item .pi-price { font-size: 14px; font-weight: 700; color: #E85D4A; margin-top: 4px; }
        .pedido-item .pi-actions { display: flex; align-items: center; gap: 8px; }
        .pedido-item .qty-ctrl {
          display: flex; align-items: center; gap: 8px;
          background: #F8F9FA; border-radius: 30px; padding: 4px;
        }
        .pedido-item .qty-ctrl button {
          width: 30px; height: 30px; border: none; border-radius: 50%;
          background: white; color: #2D3436; font-size: 14px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.2s;
        }
        .pedido-item .qty-ctrl button:active { transform: scale(0.9); }
        .pedido-item .qty-ctrl .qty-val { font-weight: 700; font-size: 15px; min-width: 24px; text-align: center; }
        .pedido-item .rm-btn {
          width: 30px; height: 30px; border: none; border-radius: 50%;
          background: transparent; color: #ADB5BD; cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 16px;
          transition: all 0.2s;
        }
        .pedido-item .rm-btn:active { transform: scale(0.85); }
        .pedido-summary {
          background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
          padding: 16px 20px 20px; border-top: 1px solid #EEF0F2;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.04);
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
        }
        .pedido-summary .ps-row {
          display: flex; justify-content: space-between; font-size: 14px; color: #6C7A8A; padding: 4px 0;
        }
        .pedido-summary .ps-total {
          font-size: 18px; font-weight: 700; color: #2D3436;
          border-top: 2px dashed #EEF0F2; padding-top: 12px; margin-top: 6px;
        }
        .pedido-summary .ps-total .ps-total-val { color: #E85D4A; }
        .pedido-summary .save-btn {
          width: 100%; padding: 16px; background: #E85D4A; color: white; border: none;
          border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-top: 12px; box-shadow: 0 4px 16px rgba(232, 93, 74, 0.3);
          transition: all 0.2s;
        }
        .pedido-summary .save-btn:active { transform: scale(0.97); }
        .pedido-summary .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pessoas-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200;
          display: flex; align-items: flex-end; justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        .pessoas-modal {
          background: white; border-radius: 24px 24px 0 0; padding: 24px 20px 32px;
          width: 100%; max-width: 500px; animation: slideUp 0.3s ease;
        }
        .pessoas-modal .pm-handle {
          width: 40px; height: 4px; background: #E5E7EB; border-radius: 2px;
          margin: 0 auto 20px;
        }
        .pessoas-modal .pm-title {
          font-size: 20px; font-weight: 700; color: #2D3436; text-align: center; margin-bottom: 6px;
        }
        .pessoas-modal .pm-sub {
          font-size: 13px; color: #8B95A1; text-align: center; margin-bottom: 24px;
        }
        .pessoas-modal .pm-counter {
          display: flex; align-items: center; justify-content: center; gap: 24px; margin-bottom: 28px;
        }
        .pessoas-modal .pm-counter button {
          width: 52px; height: 52px; border: 2px solid #EEF0F2; border-radius: 50%;
          background: white; font-size: 24px; color: #2D3436; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .pessoas-modal .pm-counter button:active { transform: scale(0.9); }
        .pessoas-modal .pm-counter .pm-value {
          font-size: 48px; font-weight: 700; color: #E85D4A; min-width: 60px; text-align: center;
        }
        .pessoas-modal .pm-confirm {
          width: 100%; padding: 16px; background: #E85D4A; color: white; border: none;
          border-radius: 16px; font-size: 16px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 4px 16px rgba(232, 93, 74, 0.3); transition: all 0.2s;
        }
        .pessoas-modal .pm-confirm:active { transform: scale(0.97); }
        .pessoas-modal .pm-cancel {
          width: 100%; padding: 14px; background: transparent; color: #8B95A1; border: none;
          border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px;
        }
        .pedido-toast {
          position: fixed; top: 20px; left: 50%;
          transform: translateX(-50%) translateY(-100px);
          padding: 12px 24px; border-radius: 12px;
          font-size: 14px; font-weight: 500; z-index: 300;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; align-items: center; gap: 10px;
          backdrop-filter: blur(12px); white-space: nowrap;
          background: rgba(45, 52, 54, 0.92); color: white;
        }
        .pedido-toast.show { transform: translateX(-50%) translateY(0); }
        .pedido-toast.success { background: rgba(16, 185, 129, 0.92); }
        .pedido-toast.error { background: rgba(239, 68, 68, 0.92); }
      `}</style>

      {/* Toast */}
      <div className={`pedido-toast ${toastVisible ? 'show' : ''} ${toastType}`}>
        <span>{toastType === 'success' ? '✓' : '✕'}</span>
        <span>{toastMsg}</span>
      </div>

      {/* Pessoas Modal */}
      {showPessoasModal && (
        <div className="pessoas-overlay" onClick={() => setShowPessoasModal(false)}>
          <div className="pessoas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pm-handle" />
            <div className="pm-title">Quantas pessoas?</div>
            <div className="pm-sub">Informe o número de pessoas na mesa</div>
            <div className="pm-counter">
              <button onClick={() => setQtdePessoas(Math.max(1, qtdePessoas - 1))}>−</button>
              <div className="pm-value">{qtdePessoas}</div>
              <button onClick={() => setQtdePessoas(qtdePessoas + 1)}>+</button>
            </div>
            <button className="pm-confirm" onClick={handleSalvarPedido} disabled={sending}>
              💾 Salvar Pedido · {formatCurrency(cartTotal)}
            </button>
            <button className="pm-cancel" onClick={() => setShowPessoasModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => navigate('/' + mesa?.token)} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', background: '#EEF0F2', color: '#2D3436', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
              <span style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#E85D4A' }}>🛒</span> Mesa {mesa?.descricao || mesa?.id} — Meu Carrinho
              </span>
            </div>
            <button onClick={handleClearCart} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', background: 'transparent', color: '#8B95A1', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Limpar carrinho">🗑️</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 14px', background: '#FFF0ED', borderRadius: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#C94F3E' }}>
              🪑 Mesa {mesa?.descricao || mesa?.id}
            </span>
            <span style={{ width: '1px', height: '20px', background: 'rgba(232, 93, 74, 0.2)' }} />
            <span style={{ fontSize: '12px', color: '#6C7A8A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', animation: 'pulse-dot 2s infinite' }} />
              Aberto para pedidos
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {sendError && (
        <div style={{ margin: '16px 20px', padding: '16px', borderRadius: '12px', background: '#FEF2F2', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626' }}>Erro ao enviar pedido</p>
            <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{sendError}</p>
          </div>
          <button onClick={() => setSendError(null)} style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Fechar</button>
        </div>
      )}

      {/* Cart Items */}
      <div style={{ padding: '20px 20px 16px', flex: 1 }}>
        {carrinho.length === 0 && !sending ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B95A1' }}>
            <div style={{ fontSize: '72px', color: '#DDE1E6', marginBottom: '16px' }}>🛒</div>
            <h3 style={{ fontSize: '20px', color: '#2D3436', marginBottom: '8px' }}>Seu carrinho está vazio</h3>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Que tal explorar nosso menu e adicionar alguns pratos deliciosos?</p>
            <button onClick={() => navigate('/' + mesa?.token)} style={{ background: '#E85D4A', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '50px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(232, 93, 74, 0.3)' }}>
              🍽️ Explorar Menu
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#6C7A8A' }}>{cartCount} {cartCount === 1 ? 'item' : 'itens'}</h2>
              <button onClick={handleClearCart} style={{ background: 'none', border: 'none', color: '#ADB5BD', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px' }}>
                🗑️ Limpar tudo
              </button>
            </div>
            {carrinho.map((item, index) => {
              const preco = Number(item.produto.preco) || Number(item.produto.valor_venda) || 0
              const complementos = item.complementos || []
              const isFirstOfCombo = !item.comboId || carrinho.findIndex((c) => c.comboId === item.comboId) === index
              return (
                <div key={item.cartItemId} style={{ marginBottom: '8px' }}>
                  <div className="pedido-item" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="pi-image"><ProdutoImage produtoId={item.produto.id} catName={item.produto.nome_categoria} /></div>
                    <div className="pi-info">
                      <div className="pi-name">{item.produto.nome}</div>
                      <div style={{ fontSize: '12px', color: '#8B95A1', marginTop: '2px' }}>
                        {formatCurrency(preco)} x {item.quantidade === Math.floor(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2)}
                      </div>
                      <div className="pi-price">{formatCurrency(preco * item.quantidade)}</div>
                      {item.produto.observacao && editingObs !== item.cartItemId && (
                        <div style={{ fontSize: '11px', color: '#6C7A8A', marginTop: '4px', fontStyle: 'italic' }}>
                          📝 {item.produto.observacao}
                        </div>
                      )}
                    </div>
                    <div className="pi-actions">
                      {item.comboId ? (
                        <span className="qty-val" style={{ fontSize: '12px', color: '#8B95A1' }}>Combo</span>
                      ) : (
                        <div className="qty-ctrl">
                          <button onClick={() => handleUpdateQty(item.cartItemId, -1)}>−</button>
                          <span className="qty-val">{item.quantidade === Math.floor(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2)}</span>
                          <button onClick={() => handleUpdateQty(item.cartItemId, 1)}>+</button>
                        </div>
                      )}
                      <button className="rm-btn" onClick={() => handleRemoveItem(item.cartItemId)}>✕</button>
                    </div>
                  </div>
                  {complementos.length > 0 && isFirstOfCombo && (
                    <div style={{ paddingLeft: '62px', marginTop: '-4px', marginBottom: '4px' }}>
                      {complementos.map((comp, idx) => (
                        <div key={idx} style={{ padding: '2px 0', fontSize: '12px', color: '#8B95A1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>↳ {comp.nome_complemento || comp.descricao}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {Number(comp.valor_complemento) > 0 && <span style={{ color: '#10B981', fontWeight: 600 }}>+ {formatCurrency(Number(comp.valor_complemento))}</span>}
                            <button
                              onClick={() => removeComplemento(item.cartItemId, idx)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '10px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {editingObs === item.cartItemId ? (
                    <div style={{ paddingLeft: '62px', marginTop: '4px', marginBottom: '4px' }}>
                      <textarea
                        value={obsText}
                        onChange={(e) => setObsText(e.target.value)}
                        placeholder="Ex: Sem cebola, ponto da carne..."
                        rows={2}
                        maxLength={200}
                        autoFocus
                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E85D4A', borderRadius: '10px', fontSize: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          onClick={() => handleSaveObs(item.cartItemId)}
                          style={{ flex: 1, padding: '6px', background: '#E85D4A', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >Salvar</button>
                        <button
                          onClick={handleCancelEditObs}
                          style={{ padding: '6px 12px', background: '#EEF0F2', color: '#6C7A8A', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ paddingLeft: '62px', marginTop: '2px', marginBottom: '4px' }}>
                      <button
                        onClick={() => handleStartEditObs(item.cartItemId, item.produto.observacao)}
                        style={{ background: '#EBF5FF', border: '1px solid #B3D9FF', color: '#2563EB', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >📝 {item.produto.observacao ? 'Editar observação' : 'Adicionar observação'}</button>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Summary Fixed Bottom */}
      {carrinho.length > 0 && (
        <div className="pedido-summary">
          <div className="ps-row"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
          <div className="ps-row ps-total"><span>Total</span><span className="ps-total-val">{formatCurrency(cartTotal)}</span></div>
          <button className="save-btn" onClick={handleConfirmarPedido} disabled={sending || carrinho.length === 0}>
            {sending ? '⏳ Salvando...' : '💾 Salvar Pedido'}
            {!sending && <span>{formatCurrency(cartTotal)}</span>}
          </button>
        </div>
      )}
    </>
  )
}
