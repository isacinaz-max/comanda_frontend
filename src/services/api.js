import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
})

api.interceptors.request.use(
  (config) => {
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response

      if (status === 404) {
        console.error('Recurso não encontrado:', data)
      } else if (status === 400) {
        console.error('Dados inválidos:', data)
      } else if (status >= 500) {
        console.error('Erro no servidor:', data)
      }
    } else if (error.request) {
      console.error('Erro de conexão: Verifique se o servidor está rodando')
    } else {
      console.error('Erro na configuração da requisição:', error.message)
    }

    return Promise.reject(error)
  }
)

export const getCategorias = async () => {
  const response = await api.get('/categorias')
  return response.data
}

export const getCategoriaById = async (id) => {
  const response = await api.get(`/categorias/${id}`)
  return response.data
}

export const getProdutos = async () => {
  const response = await api.get('/produtos')
  return response.data
}

export const getProdutoById = async (id) => {
  const response = await api.get(`/produtos/${id}`)
  return response.data
}

export const getProdutosByCategoria = async (categoriaId) => {
  const response = await api.get(`/produtos/categoria/${categoriaId}`)
  return response.data
}

export const getMesas = async () => {
  const response = await api.get('/mesas')
  return response.data
}

export const getMesaById = async (id) => {
  const response = await api.get(`/mesas/${id}`)
  return response.data
}

export const updateMesaSituacao = async (id, situacao) => {
  const response = await api.put(`/mesas/${id}`, { situacao })
  return response.data
}

export const getComandas = async () => {
  const response = await api.get('/comandas')
  return response.data
}

export const getComandaById = async (id) => {
  const response = await api.get(`/comandas/${id}`)
  return response.data
}

export const createComanda = async (comandaData) => {
  const response = await api.post('/comandas', comandaData)
  return response.data
}

export const updateComanda = async (id, comandaData) => {
  const response = await api.put(`/comandas/${id}`, comandaData)
  return response.data
}

export const getItensComanda = async (comandaId) => {
  const response = await api.get(`/comandas/${comandaId}/itens`)
  return response.data
}

export const addItemComanda = async (comandaId, itemData) => {
  const response = await api.post(`/comandas/${comandaId}/itens`, itemData)
  return response.data
}

export const getNextIndexPreparo = async (comandaId) => {
  const response = await api.get(`/comandas/${comandaId}/itens/index_preparo`)
  return response.data.index_preparo
}

export const cancelarItem = async (itemId) => {
  const response = await api.post(`/comandas/itens/${itemId}/cancelar`)
  return response.data
}

export const getComandaByMesaId = async (mesaId) => {
  const response = await api.get(`/comandas/mesa/${mesaId}`)
  return response.data
}

export const getComandaCountByMesa = async (mesaId) => {
  const response = await api.get(`/comandas/mesa/${mesaId}/count`)
  return response.data
}

export const getEmpresa = async () => {
  const response = await api.get('/empresa')
  return response.data
}

export const getReceita = async (receitaId) => {
  const response = await api.get(`/receitas/${receitaId}`)
  return response.data
}

export const insertAdicionais = async (comandaId, totalConsumido) => {
  const response = await api.post(`/comandas/${comandaId}/adicionais`, { total_consumido: totalConsumido })
  return response.data
}

export const getAdicionais = async (comandaId) => {
  const response = await api.get(`/comandas/${comandaId}/adicionais`)
  return response.data
}

export const getPagamentosParciais = async (comandaId) => {
  const response = await api.get(`/comandas/${comandaId}/pagamentos`)
  return response.data
}

export const getComplementosByCategoria = async (categoriaId) => {
  const response = await api.get(`/complementos/categoria/${categoriaId}`)
  return response.data
}

export const addComplementos = async (comandaId, complementos) => {
  const response = await api.post(`/comandas/${comandaId}/itens/complementos`, complementos)
  return response.data
}

export const getItensComComplementos = async (comandaId) => {
  const response = await api.get(`/comandas/${comandaId}/detalhes_complementos`)
  return response.data
}

export default api
