import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  getCategorias,
  getProdutos,
  getProdutosByCategoria,
  getMesaById,
  updateMesaSituacao,
  getComandaById,
  getComandaByMesaId,
  createComanda,
  updateComanda,
  getItensComanda,
  addItemComanda,
  cancelarItem,
  getEmpresa,
  getComandaCountByMesa,
  getNextIndexPreparo,
} from '../services/api'

let _initMesaLock = false
let _cartItemIdCounter = 0
const nextCartItemId = () => `ci_${Date.now()}_${++_cartItemIdCounter}`

const useStore = create(
  persist(
    (set, get) => ({
  mesa: null,
  empresa: null,
  categorias: [],
  produtos: [],
  carrinho: [],
  comanda: null,
  itensComanda: [],
  itensCount: 0,
  loading: false,
  error: null,
  initialized: false,

  initMesa: async (mesaId) => {
    if (_initMesaLock) return
    _initMesaLock = true
    const numId = parseInt(mesaId, 10)
    if (isNaN(numId)) {
      set({ error: 'Mesa inválida', initialized: true })
      _initMesaLock = false
      return
    }
    set({ loading: true, error: null })
    try {
      const mesaData = await getMesaById(numId)

      let comanda = null
      try {
        comanda = await getComandaByMesaId(mesaData.id)
      } catch {
        // nenhuma comanda aberta - será criada ao salvar pedido
      }

      set({ mesa: mesaData, comanda, loading: false, initialized: true })
    } catch (error) {
      set({
        loading: false,
        initialized: true,
        error: error.response?.data?.erro || 'Mesa não encontrada',
      })
    } finally {
      _initMesaLock = false
    }
  },

  loadEmpresa: async () => {
    try {
      const data = await getEmpresa()
      set({ empresa: data })
    } catch {
      // ignore
    }
  },

  setMesa: async (mesa) => {
    set({ loading: true, error: null })
    try {
      const mesaData = await getMesaById(mesa.referencia || mesa.id)
      set({ mesa: mesaData, loading: false })
    } catch (error) {
      set({
        mesa: { referencia: mesa.referencia || mesa.id, situacao: 'Livre' },
        loading: false,
        error: null,
      })
    }
  },

  loadCategorias: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getCategorias()
      set({ categorias: data, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao carregar categorias',
      })
    }
  },

  loadProdutos: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getProdutos()
      set({ produtos: data, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao carregar produtos',
      })
    }
  },

  loadProdutosByCategoria: async (categoriaId) => {
    set({ loading: true, error: null })
    try {
      const data = await getProdutosByCategoria(categoriaId)
      set({ produtos: data, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao carregar produtos da categoria',
      })
    }
  },

  addItem: (produto) => {
    const { carrinho } = get()
    const sabores = produto.sabores || null
    const complementos = produto.complementos || null

    console.log('[STORE addItem] produto:', produto.nome, 'observacao:', produto.observacao, 'complementos:', complementos?.length || 0)

    if (sabores && sabores.length > 0) {
      const comboId = `${produto.id}_${sabores.map((s) => s.id).sort().join('_')}`
      const fracao = 1 / sabores.length
      const observacaoCombo = produto.observacao || null
      const maiorValor = Math.max(...sabores.map((s) => Number(s.valor) || Number(produto.valor_venda) || Number(produto.preco) || 0))
      const newItems = sabores.map((sabor, idx) => ({
        cartItemId: nextCartItemId(),
        produto: {
          id: sabor.id,
          nome: sabor.nome,
          nomeOriginal: produto.nome,
          preco: maiorValor,
          valor_venda: maiorValor,
          unidade: produto.unidade,
          gtin: sabor.gtin || null,
          id_grupo: produto.id_grupo,
          nome_categoria: produto.nome_categoria,
          foto: produto.foto,
          observacao: idx === 0 ? observacaoCombo : null,
        },
        quantidade: fracao,
        comboId,
        comboProdutoNome: produto.nome,
        complementos: idx === 0 ? (complementos || []) : [],
      }))
      set({ carrinho: [...carrinho, ...newItems] })
    } else {
      const existingIndex = carrinho.findIndex(
        (c) => c.produto.id === produto.id && !c.comboId
      )
      if (existingIndex >= 0) {
        const updated = [...carrinho]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantidade: updated[existingIndex].quantidade + 1,
        }
        set({ carrinho: updated })
      } else {
        set({
          carrinho: [...carrinho, { cartItemId: nextCartItemId(), produto, quantidade: 1, complementos: complementos || [] }],
        })
      }
    }
  },

  removeItem: (cartItemId) => {
    const { carrinho } = get()
    set({
      carrinho: carrinho.filter((i) => i.cartItemId !== cartItemId),
    })
  },

  updateItemQuantity: (cartItemId, quantidade) => {
    const { carrinho } = get()
    if (quantidade <= 0) {
      set({
        carrinho: carrinho.filter((i) => i.cartItemId !== cartItemId),
      })
    } else {
      set({
        carrinho: carrinho.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantidade } : i
        ),
      })
    }
  },

  clearCarrinho: () => {
    set({ carrinho: [] })
  },

  updateItemObservacao: (cartItemId, observacao) => {
    const { carrinho } = get()
    console.log('[STORE] updateItemObservacao cartItemId:', cartItemId, 'nova observacao:', observacao)
    const item = carrinho.find(i => i.cartItemId === cartItemId)
    console.log('[STORE] Item encontrado:', item?.produto?.nome, 'obs anterior:', item?.produto?.observacao)
    set({
      carrinho: carrinho.map((i) =>
        i.cartItemId === cartItemId
          ? { ...i, produto: { ...i.produto, observacao: observacao || null } }
          : i
      ),
    })
    const updated = get().carrinho.find(i => i.cartItemId === cartItemId)
    console.log('[STORE] Após update, obs do item:', updated?.produto?.observacao)
  },

  removeComplemento: (cartItemId, complementoIndex) => {
    const { carrinho } = get()
    set({
      carrinho: carrinho.map((item) => {
        if (item.cartItemId === cartItemId && item.complementos) {
          const newComplementos = item.complementos.filter((_, idx) => idx !== complementoIndex)
          return { ...item, complementos: newComplementos }
        }
        return item
      }),
    })
  },

  getCartTotal: () => {
    const { carrinho } = get()
    return carrinho.reduce(
      (total, item) => {
        const preco = item.produto.valor_venda || item.produto.preco || 0
        const complementosTotal = (item.complementos || []).reduce((sum, c) => {
          const valor = Number(c.valor_complemento) || 0
          return sum + valor
        }, 0)
        return total + preco * item.quantidade + complementosTotal
      },
      0
    )
  },

  getCartItemCount: () => {
    const { carrinho } = get()
    return carrinho.length
  },

  setComanda: (comanda) => {
    set({ comanda })
  },

  createNewComanda: async (mesaId) => {
    set({ loading: true, error: null })
    try {
      const comanda = await createComanda({
        id_mesa: mesaId,
        situacao: 'P',
        tipo: 'M',
        qtde_pessoas: 1,
        valor: 0,
        subtotal: 0,
        valor_pago: 0,
        expedido: 'N',
        status_preparo: 'P',
      })
      set({ comanda, loading: false })
      return comanda
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao criar comanda',
      })
      throw error
    }
  },

  loadComanda: async (comandaId) => {
    set({ loading: true, error: null })
    try {
      const [comanda, itens] = await Promise.all([
        getComandaById(comandaId),
        getItensComanda(comandaId),
      ])
      set({ comanda, itensComanda: itens, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao carregar comanda',
      })
    }
  },

  submitOrder: async (comandaId) => {
    const { carrinho } = get()
    set({ loading: true, error: null })
    try {
      const indexPreparo = await getNextIndexPreparo(comandaId)
      let itemCounter = 1
      for (let i = 0; i < carrinho.length; i++) {
        const cartItem = carrinho[i]
        const sabores = cartItem.produto.sabores
        const observacao = cartItem.produto.observacao || null

        if (sabores && sabores.length > 0) {
          const fracao = 1 / sabores.length
          let idCombinado = null

          for (let s = 0; s < sabores.length; s++) {
            const sabor = sabores[s]
            const quantidadeSabor = cartItem.quantidade * fracao
            const valorUnitario = sabor.valor || cartItem.produto.valor_venda || cartItem.produto.preco || 0
            const valorTotal = valorUnitario * quantidadeSabor

            const response = await addItemComanda(comandaId, {
              id_produto: sabor.id,
              id_grupo: cartItem.produto.id_grupo,
              nome_produto: sabor.nome,
              unidade_produto: cartItem.produto.unidade,
              gtin_produto: sabor.gtin || cartItem.produto.gtin,
              quantidade: quantidadeSabor,
              valor_unitario: valorUnitario,
              valor_total: valorTotal,
              item: itemCounter,
              tipo_venda: 'M',
              id_combinado: idCombinado,
              observacao: s === 0 ? observacao : null,
              index_preparo: indexPreparo,
            })

            if (s === 0) {
              idCombinado = response.id
            }
            itemCounter++
          }
        } else {
          await addItemComanda(comandaId, {
            id_produto: cartItem.produto.id,
            id_grupo: cartItem.produto.id_grupo,
            nome_produto: cartItem.produto.nome,
            unidade_produto: cartItem.produto.unidade,
            gtin_produto: cartItem.produto.gtin,
            quantidade: cartItem.quantidade,
            valor_unitario: cartItem.produto.valor_venda || cartItem.produto.preco || 0,
            valor_total: (cartItem.produto.valor_venda || cartItem.produto.preco || 0) * cartItem.quantidade,
            item: itemCounter,
            tipo_venda: 'M',
            observacao: cartItem.produto.observacao || null,
            index_preparo: indexPreparo,
          })
          itemCounter++
        }
      }
      set({ carrinho: [], loading: false })
      return true
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao enviar pedido',
      })
      throw error
    }
  },

  cancelarItemComanda: async (itemId) => {
    set({ loading: true, error: null })
    try {
      await cancelarItem(itemId)
      const { comanda } = get()
      if (comanda) {
        const itens = await getItensComanda(comanda.id)
        set({ itensComanda: itens, loading: false })
      }
    } catch (error) {
      set({
        loading: false,
        error: error.message || 'Erro ao cancelar item',
      })
      throw error
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  loadItensCount: async (mesaId) => {
    try {
      const data = await getComandaCountByMesa(mesaId)
      set({ itensCount: data.itens || 0 })
      return data
    } catch {
      set({ itensCount: 0 })
      return { itens: 0 }
    }
  },
}), {
  name: 'comanda-storage',
  partialize: (state) => ({
    carrinho: state.carrinho,
    mesa: state.mesa,
    comanda: state.comanda,
  }),
},
))

export default useStore
