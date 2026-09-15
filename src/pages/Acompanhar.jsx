import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store/useStore'
import { getComandaById, getItensComanda, getMesaById, updateMesaSituacao, getAdicionais, getItensComComplementos, API_BASE_URL } from '../services/api'

function formatCurrency(value) {
  const num = Number(value) || 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
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

  if (!produtoId || imgError) {
    return <span style={{ fontSize: '28px' }}>{emoji}</span>
  }

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

export default function Acompanhar() {
  const navigate = useNavigate()
  const { mesa, comanda, setComanda } = useStore()
  const [itensComanda, setItensComanda] = useState([])
  const [adicionais, setAdicionais] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [mesaLiberada, setMesaLiberada] = useState(false)

  const loadItens = useCallback(async () => {
    const currentMesa = useStore.getState().mesa
    const currentComanda = useStore.getState().comanda
    console.log('[ACOMPANHAR] loadItens - mesa:', currentMesa?.id, 'comanda:', currentComanda?.id)
    if (!currentMesa?.id || !currentComanda?.id) return
    setLoading(true)
    setError(null)
    try {
      const [comandaData, itens, adic] = await Promise.all([
        getComandaById(currentComanda.id),
        getItensComComplementos(currentComanda.id),
        getAdicionais(currentComanda.id).catch(() => []),
      ])
      console.log('[ACOMPANHAR] itens:', itens)
      setComanda(comandaData)
      setItensComanda(Array.isArray(itens) ? itens : itens?.data || [])
      setAdicionais(Array.isArray(adic) ? adic : adic?.data || [])
    } catch (e) {
      console.error('[ACOMPANHAR] erro:', e)
      setError('Erro ao carregar pedido')
    } finally {
      setLoading(false)
    }
  }, [setComanda])

  useEffect(() => {
    const checkMesa = async () => {
      const currentMesa = useStore.getState().mesa
      const currentComanda = useStore.getState().comanda
      console.log('[ACOMPANHAR] checkMesa - mesa:', currentMesa?.id, 'comanda:', currentComanda?.id)
      if (!currentMesa?.id) { setLoading(false); return }
      try {
        const data = await getMesaById(currentMesa.id)
        const livre = data.situacao === 'L' || data.situacao === 'Livre' || data.situacao === 'D'
        console.log('[ACOMPANHAR] situacao:', data.situacao, 'livre:', livre)
        if (livre) {
          useStore.getState().setComanda(null)
          setItensComanda([])
          setAdicionais([])
          setLoading(false)
          return
        }
      } catch (e) {
        console.error('[ACOMPANHAR] erro getMesa:', e)
      }
      const curComanda = useStore.getState().comanda
      console.log('[ACOMPANHAR] curComanda:', curComanda)
      if (curComanda?.id) {
        try {
          setLoading(true)
          const [comandaData, itens, adic] = await Promise.all([
            getComandaById(curComanda.id),
            getItensComComplementos(curComanda.id),
            getAdicionais(curComanda.id).catch(() => []),
          ])
          console.log('[ACOMPANHAR] itens:', itens)
          setComanda(comandaData)
          setItensComanda(Array.isArray(itens) ? itens : itens?.data || [])
          setAdicionais(Array.isArray(adic) ? adic : adic?.data || [])
        } catch (e) {
          console.error('[ACOMPANHAR] erro load:', e)
          setError('Erro ao carregar pedido')
        }
      }
      setLoading(false)
    }
    checkMesa()
  }, [])

  const permanencia = (() => {
    if (!comanda?.data || !comanda?.hora) return null
    try {
      const dataStr = typeof comanda.data === 'string' ? comanda.data : new Date(comanda.data).toISOString().split('T')[0]
      const abertura = new Date(`${dataStr}T${comanda.hora}`)
      const agora = new Date()
      const diffMs = agora - abertura
      if (diffMs < 0) return null
      const diffMin = Math.floor(diffMs / 60000)
      const h = Math.floor(diffMin / 60)
      const m = diffMin % 60
      if (h > 0) return `${h}h ${m}min`
      return `${m}min`
    } catch {
      return null
    }
  })()

  const totalPedido = itensComanda
    .filter((item) => item.cancelado !== 'S' && item.cancelado !== true)
    .reduce((acc, item) => {
      const preco = Number(item.valor_unitario) || 0
      const qtd = Number(item.quantidade) || 1
      const complementosTotal = (item.complementos || []).reduce((sum, c) => {
        const valor = Number(c.valor) || 0
        return sum + valor
      }, 0)
      return acc + preco * qtd + complementosTotal
    }, 0)

  const adicionaisCalculados = adicionais.map((adic) => {
    const valorOriginal = Number(adic.valor) || 0
    if (adic.tipo_taxa === '%') {
      return { ...adic, valorCalculado: (totalPedido * valorOriginal) / 100 }
    }
    return { ...adic, valorCalculado: valorOriginal }
  })

  const totalAdicionais = adicionaisCalculados.reduce((acc, item) => acc + item.valorCalculado, 0)
  const totalGeral = Number(totalPedido) + Number(totalAdicionais)

  return (
    <>
      <style>{`
        .acomp-item {
          background: white; border-radius: 16px; padding: 14px 16px;
          margin-bottom: 12px; display: flex; align-items: center; gap: 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .acomp-item.cancelado { opacity: 0.4; }
        .acomp-item .ai-image {
          width: 50px; height: 50px; border-radius: 12px;
          background: #F8F9FA; display: flex; align-items: center; justify-content: center;
          font-size: 28px; flex-shrink: 0; position: relative; overflow: hidden;
        }
        .acomp-item .ai-info { flex: 1; min-width: 0; }
        .acomp-item .ai-name { font-size: 15px; font-weight: 600; color: #2D3436; }
        .acomp-item .ai-name.cancelado { text-decoration: line-through; color: #8B95A1; }
        .acomp-item .ai-obs { font-size: 12px; color: #8B95A1; margin-top: 2px; }
        .acomp-item .ai-price { font-size: 14px; font-weight: 700; color: #E85D4A; }
        .acomp-item .ai-price.cancelado { text-decoration: line-through; color: #8B95A1; }
        .acomp-item .ai-qty-price { margin-top: 2px; }
        .acomp-item .ai-unit { font-size: 12px; color: #8B95A1; }
      `}</style>

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/' + mesa?.id)} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', background: '#EEF0F2', color: '#2D3436', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#2D3436' }}>Mesa {mesa.referencia || mesa.id} — Pedido Confirmado</h1>
              <p style={{ fontSize: '12px', color: '#8B95A1' }}>Acompanhe seu pedido</p>
            </div>
          </div>
          <button onClick={loadItens} disabled={loading} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', background: '#EEF0F2', color: '#6C7A8A', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
        </div>
      </div>

      {/* Info Card */}
      <div style={{ background: '#2D3436', borderRadius: '20px', padding: '20px', color: 'white', margin: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Mesa</p>
            <p style={{ fontSize: '28px', fontWeight: 700, lineHeight: 1.1 }}>#{mesa.referencia || mesa.id}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Abertura</p>
            <p style={{ fontSize: '16px', fontWeight: 600 }}>
              {comanda?.hora || '--:--'}
            </p>
            {permanencia && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                {permanencia}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Pessoas</p>
            <p style={{ fontSize: '16px', fontWeight: 600 }}>
              {comanda?.qtde_pessoas || 1}
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 20px 16px', padding: '16px', borderRadius: '12px', background: '#FEF2F2', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#DC2626' }}>Erro</p>
            <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>{error}</p>
          </div>
          <button onClick={() => setError(null)} style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Fechar</button>
        </div>
      )}

      {/* Items */}
      <div style={{ padding: '0 20px 100px' }}>
        <p style={{ fontSize: '12px', color: '#8B95A1', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500, marginBottom: '12px' }}>Itens do Pedido</p>

        {loading ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="acomp-item">
                <div className="ai-image" style={{ background: '#EEF0F2' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '14px', background: '#EEF0F2', borderRadius: '7px', width: '60%', marginBottom: '8px' }} />
                  <div style={{ height: '12px', background: '#EEF0F2', borderRadius: '6px', width: '40%' }} />
                </div>
                <div style={{ height: '14px', background: '#EEF0F2', borderRadius: '7px', width: '60px' }} />
              </div>
            ))}
          </div>
        ) : itensComanda.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8B95A1' }}>
            <div style={{ fontSize: '48px', color: '#DDE1E6', marginBottom: '12px' }}>🍽️</div>
            <p style={{ fontSize: '14px' }}>Nenhum item encontrado</p>
          </div>
        ) : (
          <div>
            {itensComanda.map((item, index) => {
              const preco = Number(item.valor_unitario) || Number(item.preco) || Number(item.produto?.preco) || Number(item.produto?.valor_venda) || 0
              const nome = item.nome_produto || item.nome || item.produto?.nome || 'Produto'
              const catName = item.produto?.nome_categoria || ''
              const qtd = Number(item.quantidade) || 1
              const qtdFormatada = qtd === Math.floor(qtd) ? qtd : qtd.toFixed(2)
              const itemTotal = Number(item.valor_total) || preco * qtd
              const cancelado = item.cancelado === 'S' || item.cancelado === true
              const complementos = item.complementos || []
              const isFirstOfCombinado = !item.id_combinado || itensComanda.findIndex((c) => c.id_combinado === item.id_combinado) === index
              return (
                <div key={item.id || index} style={{ marginBottom: '8px' }}>
                  <div className={`acomp-item ${cancelado ? 'cancelado' : ''}`} style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="ai-image"><ProdutoImage produtoId={item.id_produto} catName={catName} /></div>
                    <div className="ai-info">
                      <div className={`ai-name ${cancelado ? 'cancelado' : ''}`}>{nome}</div>
                      <div className="ai-qty-price">
                        <span className="ai-unit">{qtdFormatada}x {formatCurrency(preco)}</span>
                      </div>
                    </div>
                    <div className={`ai-price ${cancelado ? 'cancelado' : ''}`}>{formatCurrency(itemTotal)}</div>
                  </div>
                  {complementos.length > 0 && isFirstOfCombinado && (
                    <div style={{ paddingLeft: '60px', marginTop: '-4px', marginBottom: '4px' }}>
                      {complementos.map((comp, idx) => {
                        const isObs = (comp.descricao || '').toLowerCase().includes('observação') || (comp.descricao || '').toLowerCase().includes('observacao')
                        return (
                          <div key={comp.id || idx} style={{ padding: '2px 0', fontSize: '12px', color: '#8B95A1', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={isObs ? { fontWeight: 700, color: '#2D3436' } : undefined}>↳ {comp.descricao}</span>
                            {Number(comp.valor) > 0 && <span style={{ color: '#10B981', fontWeight: 600 }}>+ {formatCurrency(Number(comp.valor))}</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            <div style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed #EEF0F2', marginTop: '16px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#6C7A8A' }}>Subtotal</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#6C7A8A' }}>{formatCurrency(totalPedido)}</span>
            </div>

            {adicionaisCalculados.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                {adicionaisCalculados.map((adic, idx) => (
                  <div key={adic.id || idx} style={{ padding: '6px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#8B95A1' }}>
                      {adic.nome_taxa || 'Taxa'}
                      {adic.tipo_taxa === '%' && <span style={{ fontSize: '11px', color: '#ADB5BD' }}> ({Number(adic.valor)}%)</span>}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#E85D4A' }}>{formatCurrency(adic.valorCalculado)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #EEF0F2', marginTop: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#2D3436' }}>Total</span>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#E85D4A' }}>{formatCurrency(totalGeral)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Novo Pedido Fixed Bottom */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid #EEF0F2', padding: '16px 20px 20px' }}>
        <button onClick={() => { useStore.getState().clearCarrinho(); navigate('/' + mesa?.id) }} style={{ width: '100%', padding: '16px', background: '#E85D4A', color: 'white', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 16px rgba(232, 93, 74, 0.3)', transition: 'all 0.2s' }}>
          🍽️ Novo Pedido →
        </button>
      </div>
    </>
  )
}
