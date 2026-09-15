import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, Store, Minus, Plus } from 'lucide-react'
import useStore from '../store/useStore'
import { getProdutos, getProdutosByCategoria, getComplementosByCategoria, API_BASE_URL } from '../services/api'
import ProductDetail from './ProductDetail'
import PizzaCombiner from '../components/PizzaCombiner'
import ComplementPicker from '../components/ComplementPicker'

const CATEGORY_EMOJIS = {
  GERAL: '🍽️',
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

const CATEGORY_ICONS = {
  GERAL: 'fa-th-list',
  BEBIDAS: 'fa-wine-bottle',
  CERVEJAS: 'fa-beer',
  DOCES: 'fa-ice-cream',
  GOURMET: 'fa-utensils',
  LANCHES: 'fa-hamburger',
  PASTEIS: 'fa-bread-slice',
  PIZZAS: 'fa-pizza-slice',
  PORÇÕES: 'fa-drumstick-bite',
  SALGADOS: 'fa-cookie',
  SORVETES: 'fa-ice-cream',
  AÇAI: 'fa-blender',
}

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

function getCategoryEmoji(catName) {
  return CATEGORY_EMOJIS[(catName || '').toUpperCase().trim()] || '🍽️'
}

function getProductEmoji(catName) {
  return PRODUCT_EMOJIS[(catName || '').toUpperCase().trim()] || '🍽️'
}

function ProdutoCard({ produto, onProductClick, onQuickAdd, cartItem }) {
  const preco = produto.valor_venda || produto.preco || 0
  const catName = produto.nome_categoria || ''
  const emoji = produto.emoji || getProductEmoji(catName)
  const hasCart = !!cartItem
  const qty = cartItem?.quantidade || 0
  const { int, dec } = formatPrice(preco)
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const hasFoto = !!produto.id && !imgError

  return (
    <div className="menu-item" onClick={() => onProductClick(produto)}>
      <div className="item-image">
        {hasFoto && (
          <img
            src={`${API_BASE_URL}/produtos/${produto.id}/foto`}
            alt={produto.nome}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        )}
        {(!imgLoaded || !hasFoto) && (
          <span className="item-emoji text-[48px]">{emoji}</span>
        )}
      </div>
      <div className="item-body">
        <div className="item-name">{produto.nome}</div>
        <div className="item-desc">{produto.descricao || produto.descricao_receita || 'Sem descrição'}</div>
        <div className="item-footer">
          <span className="price">
            R$ {int}<span className="cents">,{dec}</span>
          </span>
          <button
            className={`add-btn ${hasCart ? 'added' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onQuickAdd(produto, 1)
            }}
          >
            {hasCart ? (
              <span className="text-[13px] font-bold">{qty}</span>
            ) : (
              <span className="text-[18px] font-bold leading-none">+</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Cardapio() {
  const navigate = useNavigate()
  const {
    mesa,
    empresa,
    categorias,
    carrinho,
    loading,
    error,
    itensCount,
    loadProdutos,
    loadProdutosByCategoria,
    loadEmpresa,
    addItem,
    removeItem,
    updateItemQuantity,
    getCartTotal,
    getCartItemCount,
    loadItensCount,
  } = useStore()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedProduto, setSelectedProduto] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPizzaOpen, setIsPizzaOpen] = useState(false)
  const [pizzaSabores, setPizzaSabores] = useState([])
  const [pizzaInitialProduto, setPizzaInitialProduto] = useState(null)
  const [isComplementOpen, setIsComplementOpen] = useState(false)
  const [complementProduto, setComplementProduto] = useState(null)
  const [complementQuantidade, setComplementQuantidade] = useState(1)
  const [complementObservacao, setComplementObservacao] = useState(null)
  const [localLoading, setLocalLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimeoutRef = useRef(null)

  const cartTotal = getCartTotal()
  const cartCount = getCartItemCount()

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setToastVisible(true)
    clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 2500)
  }, [])

  const fetchProdutos = useCallback(
    async (categoriaId = null) => {
      setLocalLoading(true)
      try {
        if (categoriaId) {
          await loadProdutosByCategoria(categoriaId)
        } else {
          await loadProdutos()
        }
      } finally {
        setLocalLoading(false)
      }
    },
    [loadProdutos, loadProdutosByCategoria]
  )

  useEffect(() => {
    fetchProdutos()
  }, [fetchProdutos])

  useEffect(() => {
    loadEmpresa()
  }, [loadEmpresa])

  useEffect(() => {
    if (mesa?.id) {
      loadItensCount(mesa.id)
    }
  }, [mesa?.id, loadItensCount])

  const handleCategoryClick = useCallback(
    (categoria) => {
      if (selectedCategory?.id === categoria.id) {
        setSelectedCategory(null)
        fetchProdutos()
      } else {
        setSelectedCategory(categoria)
        fetchProdutos(categoria.id)
      }
      setSearch('')
    },
    [selectedCategory, fetchProdutos]
  )

  const handleShowAll = useCallback(() => {
    setSelectedCategory(null)
    setSearch('')
    fetchProdutos()
  }, [fetchProdutos])

  const handleProductClick = useCallback(async (produto) => {
    console.log('[CLICK] Produto clicado:', produto.nome, 'id_grupo:', produto.id_grupo, 'possui_combinado:', produto.possui_combinado)
    if (produto.possui_combinado === 'S') {
      console.log('[CLICK] Abrindo PizzaCombiner')
      try {
        const allProdutos = useStore.getState().produtos
        const sabores = allProdutos.filter(
          (p) => p.id_grupo === produto.id_grupo && p.id !== produto.id
        )
        setSelectedProduto(produto)
        setPizzaSabores(sabores.length > 0 ? sabores : [produto])
        setPizzaInitialProduto(null)
        setIsPizzaOpen(true)
      } catch {
        setSelectedProduto(produto)
        setIsModalOpen(true)
      }
    } else {
      console.log('[CLICK] Abrindo ProductDetail')
      setSelectedProduto(produto)
      setIsModalOpen(true)
    }
  }, [])

  const handleAddToCart = useCallback(
    async (produto, quantidade, observacao) => {
      console.log('[COMPLEMENT] handleAddToCart produto:', produto.nome, 'observacao:', observacao)
      const categoriaId = produto.id_grupo || produto.id_categoria
      if (categoriaId) {
        try {
          const data = await getComplementosByCategoria(categoriaId)
          const temComplementos = (data.complementos && data.complementos.length > 0) || (data.adicionais && data.adicionais.length > 0)
          if (temComplementos) {
            console.log('[COMPLEMENT] Abrindo ComplementPicker... observacao sera armazenada:', observacao)
            setComplementProduto({ ...produto, id_categoria: categoriaId })
            setComplementQuantidade(quantidade)
            setComplementObservacao(observacao)
            setIsComplementOpen(true)
            setIsModalOpen(false)
            return
          }
        } catch (e) {
          console.error('[COMPLEMENT] Erro ao buscar complementos:', e)
        }
      }
      console.log('[COMPLEMENT] Sem complementos, adicionando direto com obs:', observacao)
      for (let i = 0; i < quantidade; i++) {
        addItem({ ...produto, observacao })
      }
      setIsModalOpen(false)
      setSelectedProduto(null)
      showToast(`${produto.nome} adicionado! 🍽️`)
    },
    [addItem, showToast]
  )

  const handleComplementConfirm = useCallback(
    (complementos) => {
      if (!complementProduto) return
      console.log('[COMPLEMENT-CONFIRM] produto:', complementProduto.nome, 'observacao:', complementObservacao, 'qtd:', complementQuantidade)
      console.log('[COMPLEMENT-CONFIRM] complementos selecionados:', complementos?.map(c => c.nome_complemento))
      for (let i = 0; i < complementQuantidade; i++) {
        console.log(`[COMPLEMENT-CONFIRM] addItem #${i+1} com observacao:`, complementObservacao)
        addItem({
          ...complementProduto,
          observacao: complementObservacao,
          complementos,
        })
      }
      setIsComplementOpen(false)
      setComplementProduto(null)
      setComplementQuantidade(1)
      setComplementObservacao(null)
      setSelectedProduto(null)
      showToast(`${complementProduto.nome} adicionado! 🍽️`)
    },
    [complementProduto, complementQuantidade, complementObservacao, addItem, showToast]
  )

  const handleComplementCancel = useCallback(() => {
    setIsComplementOpen(false)
    setComplementProduto(null)
    setComplementQuantidade(1)
    setComplementObservacao(null)
  }, [])

  const handlePizzaConfirm = useCallback(
    ({ produto, sabores, preco, observacao }) => {
      const nome = `${produto.nome} (${sabores.map((s) => s.nome).join(' / ')})`
      const categoriaId = produto.id_grupo || produto.id_categoria

      setIsPizzaOpen(false)

      if (categoriaId) {
        setComplementProduto({
          ...produto,
          nome,
          valor_venda: preco,
          observacao: observacao || null,
          sabores,
          id_categoria: categoriaId,
        })
        setComplementQuantidade(1)
        setComplementObservacao(observacao)
        setIsComplementOpen(true)
      } else {
        addItem({
          ...produto,
          nome,
          valor_venda: preco,
          observacao: observacao || null,
          sabores,
        })
        setSelectedProduto(null)
        showToast(`${nome} adicionado! 🍽️`)
      }
    },
    [addItem, showToast]
  )

  const handleClosePizza = useCallback(() => {
    setIsPizzaOpen(false)
    setSelectedProduto(null)
    setPizzaInitialProduto(null)
  }, [])

  const handleQuickAdd = useCallback(
    async (produto, delta) => {
      if (delta > 0 && produto.possui_combinado === 'S') {
        const allProdutos = useStore.getState().produtos
        const sabores = allProdutos.filter(
          (p) => p.id_grupo === produto.id_grupo
        )
        setSelectedProduto(produto)
        setPizzaSabores(sabores.length > 0 ? sabores : [produto])
        setPizzaInitialProduto(produto)
        setIsPizzaOpen(true)
        return
      }
      if (delta > 0) {
        const categoriaId = produto.id_grupo || produto.id_categoria
        if (categoriaId) {
          try {
            const data = await getComplementosByCategoria(categoriaId)
            const temComplementos = (data.complementos && data.complementos.length > 0) || (data.adicionais && data.adicionais.length > 0)
            if (temComplementos) {
              setComplementProduto({ ...produto, id_categoria: categoriaId })
              setComplementQuantidade(1)
              setComplementObservacao(null)
              setIsComplementOpen(true)
              return
            }
          } catch (e) {
            console.error('[QUICK-ADD] Erro ao buscar complementos:', e)
          }
        }
        addItem(produto)
        showToast(`${produto.nome} adicionado! 🍽️`)
      }
    },
    [addItem, carrinho, showToast]
  )

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedProduto(null)
  }, [])

  const handleViewCart = useCallback(() => {
    navigate('/pedido')
  }, [navigate])

  const handleViewOrders = useCallback(() => {
    navigate('/acompanhar')
  }, [navigate])

  const handleRefresh = useCallback(() => {
    fetchProdutos(selectedCategory?.id || null)
  }, [fetchProdutos, selectedCategory])

  const filteredProdutos = useMemo(() => {
    const stateProdutos = useStore.getState().produtos.filter(
      (p) => (p.valor_venda || p.preco || 0) > 0
    )
    if (!search.trim()) return stateProdutos
    const term = search.toLowerCase()
    return stateProdutos.filter(
      (p) =>
        p.nome?.toLowerCase().includes(term) ||
        p.descricao?.toLowerCase().includes(term)
    )
  }, [search, useStore.getState().produtos])

  const currentProdutos = search.trim() ? filteredProdutos : useStore.getState().produtos.filter(
    (p) => (p.valor_venda || p.preco || 0) > 0
  )

  const produtosGrouped = useMemo(() => {
    if (selectedCategory || search.trim()) return null
    const groups = {}
    currentProdutos.forEach((p) => {
      const catName = p.nome_categoria || 'Outros'
      if (!groups[catName]) groups[catName] = []
      groups[catName].push(p)
    })
    return groups
  }, [currentProdutos, selectedCategory, search])

  if (!mesa) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#F8F9FA' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🍽️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2D3436', marginBottom: '4px' }}>Nenhuma mesa selecionada</h2>
          <p style={{ fontSize: '13px', color: '#8B95A1', marginBottom: '16px' }}>Escaneie o QR Code da sua mesa</p>
          <button onClick={() => window.location.reload()} style={{ color: '#E85D04', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .menu-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (min-width: 600px) {
          .menu-grid { grid-template-columns: repeat(3, 1fr); gap: 18px; }
        }
        @media (min-width: 900px) {
          .menu-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .menu-item {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }
        .menu-item:active { transform: scale(0.97); }
        .menu-item .item-image {
          width: 100%;
          height: 130px;
          background: linear-gradient(135deg, #EEF0F2, #F8F9FA);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .menu-item .item-image .item-emoji {
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.06));
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .menu-item:hover .item-image .item-emoji {
          transform: scale(1.1) rotate(-5deg);
        }
        .menu-item .item-body {
          padding: 12px 14px 14px;
        }
        .menu-item .item-body .item-name {
          font-size: 14px;
          font-weight: 600;
          color: #2D3436;
          margin-bottom: 3px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .menu-item .item-body .item-desc {
          font-size: 12px;
          color: #8B95A1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
          margin-bottom: 8px;
          min-height: 32px;
        }
        .menu-item .item-body .item-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .menu-item .item-body .price {
          font-size: 16px;
          font-weight: 700;
          color: #E85D4A;
        }
        .menu-item .item-body .price .cents {
          font-size: 12px;
          font-weight: 600;
        }
        .menu-item .add-btn {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 50%;
          background: #E85D4A;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(232, 93, 74, 0.3);
          flex-shrink: 0;
        }
        .menu-item .add-btn:hover {
          transform: scale(1.1);
          background: #C94F3E;
        }
        .menu-item .add-btn:active { transform: scale(0.9); }
        .menu-item .add-btn.added {
          background: #10B981;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .skeleton-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .skeleton-img {
          height: 130px;
          background: linear-gradient(90deg, #EEF0F2 25%, #F8F9FA 50%, #EEF0F2 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-body { padding: 12px 14px 14px; }
        .skeleton-line {
          height: 12px;
          background: linear-gradient(90deg, #EEF0F2 25%, #F8F9FA 50%, #EEF0F2 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
          margin-bottom: 6px;
        }
        .skeleton-line.short { width: 60%; }
        .skeleton-line.medium { width: 80%; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .categories-scroll::-webkit-scrollbar { display: none; }
        .category-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 50px;
          background: white;
          color: #6C7A8A;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .category-pill.active {
          background: #E85D4A;
          color: white;
          box-shadow: 0 4px 16px rgba(232, 93, 74, 0.35);
          transform: scale(1.02);
        }
        .category-pill:not(.active):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .category-pill .cat-count {
          background: rgba(0,0,0,0.06);
          padding: 0 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
        }
        .category-pill.active .cat-count {
          background: rgba(255,255,255,0.2);
        }
        .cart-fab {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(45, 52, 54, 0.95);
          color: white;
          padding: 14px 28px;
          border-radius: 60px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 200;
          border: none;
          font-size: 14px;
          font-weight: 600;
          min-width: 200px;
          justify-content: center;
          backdrop-filter: blur(12px);
        }
        .cart-fab:hover {
          transform: translateX(-50%) scale(1.03);
          box-shadow: 0 24px 60px rgba(0,0,0,0.25);
        }
        .cart-fab:active {
          transform: translateX(-50%) scale(0.97);
        }
        .cart-fab .cart-icon { position: relative; }
        .cart-fab .cart-badge {
          position: absolute;
          top: -8px;
          right: -10px;
          background: #E85D4A;
          color: white;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(232, 93, 74, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cart-fab .cart-total {
          color: #FCD34D;
          font-weight: 700;
        }
        .cart-fab .cart-divider {
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.1);
        }
        .toast-bar {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%) translateY(-100px);
          background: rgba(45, 52, 54, 0.92);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          z-index: 300;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 10px;
          backdrop-filter: blur(12px);
          white-space: nowrap;
        }
        .toast-bar.show {
          transform: translateX(-50%) translateY(0);
        }
        .toast-bar .toast-icon {
          color: #10B981;
          font-size: 18px;
        }
      `}</style>

      {/* Toast */}
      <div className={`toast-bar ${toastVisible ? 'show' : ''}`}>
        <span className="toast-icon">✓</span>
        <span>{toastMsg}</span>
      </div>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: '#E85D4A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 4px 12px rgba(232, 93, 74, 0.3)' }}>
                🍽️
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.2, color: '#2D3436' }}>
                  {empresa?.nome_fantasia || 'Cardápio Digital'}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#8B95A1' }}>
                  <span style={{ color: '#F59E0B' }}>★</span>
                  <span>Cardápio Digital</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={handleViewOrders} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', background: '#EEF0F2', color: '#2D3436', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} title="Ver pedidos da mesa">
                📋
                {itensCount > 0 && <span style={{ position: 'absolute', top: '2px', right: '0px', minWidth: '18px', height: '18px', borderRadius: '50%', background: '#10B981', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>{itensCount}</span>}
              </button>
              <button onClick={handleViewCart} style={{ width: '40px', height: '40px', border: 'none', borderRadius: '50%', background: '#EEF0F2', color: '#2D3436', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && <span style={{ position: 'absolute', top: '2px', right: '0px', minWidth: '18px', height: '18px', borderRadius: '50%', background: '#E85D4A', color: 'white', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', border: '2px solid white' }}>{cartCount}</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mesa Info */}
      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', background: '#FFF0ED', borderRadius: '12px' }}>
          <span style={{ width: '6px', height: '6px', background: '#10B981', borderRadius: '50%', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#C94F3E' }}>Alberto para pedido</span>
        </div>
      </div>

      {/* Search + Categories */}
      {!isModalOpen && (
        <>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <Search className="h-5 w-5" style={{ color: '#ADB5BD', flexShrink: 0 }} />
              <input type="text" placeholder="Buscar pratos, ingredientes..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '15px', background: 'transparent', color: '#2D3436' }} />
            </div>
          </div>
          <div style={{ padding: '0 20px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }} className="categories-scroll">
            <div style={{ display: 'flex', gap: '10px', minWidth: 'max-content' }}>
              <button className={`category-pill ${!selectedCategory ? 'active' : ''}`} onClick={handleShowAll}>
                Todos<span className="cat-count">{currentProdutos.length}</span>
              </button>
              {categorias.map((cat) => (
                <button key={cat.id} className={`category-pill ${selectedCategory?.id === cat.id ? 'active' : ''}`} onClick={() => handleCategoryClick(cat)}>
                  {getCategoryEmoji(cat.nome_categoria)} {cat.nome_categoria || cat.nome || cat.descricao}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Menu Content */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#2D3436' }}>
            {selectedCategory ? (selectedCategory.nome_categoria || selectedCategory.nome) : 'Destaques'}
          </h2>
          <span style={{ fontSize: '13px', color: '#8B95A1', background: '#EEF0F2', padding: '2px 12px', borderRadius: '20px', fontWeight: 500 }}>
            {currentProdutos.length} itens
          </span>
        </div>

        {localLoading ? (
          <div className="menu-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                  <div className="skeleton-line medium" style={{ marginTop: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : currentProdutos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B95A1' }}>
            <div style={{ fontSize: '48px', color: '#DDE1E6', marginBottom: '16px' }}>🍽️</div>
            <h3 style={{ fontSize: '18px', color: '#2D3436', marginBottom: '4px' }}>
              {search ? 'Nenhum item encontrado' : 'Nenhum produto disponível'}
            </h3>
            <p style={{ fontSize: '14px' }}>
              {search ? 'Tente ajustar sua busca' : 'Tente novamente mais tarde'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} style={{ marginTop: '16px', color: '#E85D4A', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpar busca
              </button>
            )}
          </div>
        ) : produtosGrouped ? (
          <div>
            {Object.entries(produtosGrouped).map(([catName, produtos]) => (
              <div key={catName} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#2D3436' }}>
                    {getCategoryEmoji(catName)} {catName}
                  </h2>
                  <span style={{ fontSize: '13px', color: '#8B95A1', background: '#EEF0F2', padding: '2px 12px', borderRadius: '20px', fontWeight: 500 }}>
                    {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="menu-grid">
                  {produtos.map((produto) => (
                    <ProdutoCard key={produto.id} produto={produto} onProductClick={handleProductClick} onQuickAdd={handleQuickAdd} cartItem={carrinho.find((c) => c.produto.id === produto.id)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="menu-grid">
            {currentProdutos.map((produto) => (
              <ProdutoCard key={produto.id} produto={produto} onProductClick={handleProductClick} onQuickAdd={handleQuickAdd} cartItem={carrinho.find((c) => c.produto.id === produto.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart FAB */}
      {!isModalOpen && cartCount > 0 && (
        <button className="cart-fab" onClick={handleViewCart}>
          <span className="cart-icon">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </span>
          <span>Ver pedido</span>
          <span className="cart-divider" />
          <span className="cart-total">{formatCurrency(cartTotal)}</span>
        </button>
      )}

      {/* Product Detail Modal */}
      <ProductDetail
        produto={selectedProduto}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddToCart={handleAddToCart}
      />

      {/* Pizza Combiner Modal */}
      {isPizzaOpen && selectedProduto && (
        <PizzaCombiner
          produto={selectedProduto}
          sabores={pizzaSabores}
          onConfirm={handlePizzaConfirm}
          onCancel={handleClosePizza}
          initialProduto={pizzaInitialProduto}
        />
      )}

      {/* Complement Picker Modal */}
      {isComplementOpen && complementProduto && (
        <ComplementPicker
          produto={complementProduto}
          onConfirm={handleComplementConfirm}
          onCancel={handleComplementCancel}
        />
      )}
    </>
  )
}
