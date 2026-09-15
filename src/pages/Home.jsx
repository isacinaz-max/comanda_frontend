import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed,
  Hash,
  LogIn,
  ArrowRight,
  AlertCircle,
  Loader2,
  Wine,
  Coffee,
  Utensils,
} from 'lucide-react'
import useStore from '../store/useStore'
import { getMesaById, updateMesaSituacao, getComandaById } from '../services/api'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          <UtensilsCrossed className="absolute inset-0 m-auto h-6 w-6 text-primary" />
        </div>
        <p className="text-slate-500 font-medium">Carregando...</p>
      </div>
    </div>
  )
}

function ErrorDisplay({ message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 px-4">
      <div className="bg-white rounded-2xl shadow-soft p-8 max-w-sm w-full text-center animate-slide-up">
        <div className="mx-auto h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7 text-danger" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Algo deu errado</h2>
        <p className="text-slate-500 text-sm mb-6">{message || 'Não foi possível carregar as informações da mesa.'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary px-6 py-3 rounded-xl font-semibold text-sm"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setMesa, setComanda, mesa, comanda, loading: storeLoading } = useStore()

  const [mesaNumero, setMesaNumero] = useState(searchParams.get('mesa') || '')
  const [mesaData, setMesaData] = useState(null)
  const [comandaData, setComandaData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openingMesa, setOpeningMesa] = useState(false)
  const [manualInput, setManualInput] = useState(false)

  const fetchMesa = useCallback(async (numero) => {
    if (!numero) return
    setLoading(true)
    setError(null)
    try {
      const data = await getMesaById(numero)
      setMesaData(data)

      if (data.comanda_id || data.comandaAberta) {
        const comandaId = data.comanda_id || data.comandaAberta
        try {
          const comandaInfo = await getComandaById(comandaId)
          setComandaData(comandaInfo)
        } catch {
          setComandaData(null)
        }
      }
    } catch (err) {
      setMesaData(null)
      setError(err.response?.data?.message || 'Mesa não encontrada. Verifique o número e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const mesaParam = searchParams.get('mesa')
    if (mesaParam) {
      setMesaNumero(mesaParam)
      fetchMesa(mesaParam)
    } else {
      setManualInput(true)
    }
  }, [searchParams, fetchMesa])

  const handleAbrirMesa = async () => {
    if (!mesaData) return
    setOpeningMesa(true)
    try {
      await updateMesaSituacao(mesaData.id || mesaData.numero, 'O')
      setMesa(mesaData)
      setComanda(null)
      navigate('/cardapio')
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao abrir mesa. Tente novamente.')
    } finally {
      setOpeningMesa(false)
    }
  }

  const handleVerCardapio = () => {
    setMesa(mesaData)
    if (comandaData) {
      setComanda(comandaData)
    }
    navigate('/cardapio')
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const num = parseInt(mesaNumero, 10)
    if (num > 0) {
      setManualInput(false)
      fetchMesa(num)
    }
  }

  if (loading && !manualInput) return <LoadingScreen />
  if (error && !manualInput && !mesaData) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={() => {
          setError(null)
          setMesaNumero('')
          setManualInput(true)
        }}
      />
    )
  }

  if (manualInput && !mesaData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center mb-4 shadow-primary">
              <UtensilsCrossed className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              <span className="text-gradient">Comanda</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm">Restaurante Digital</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Coffee className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Bem-vindo!</h2>
                <p className="text-xs text-slate-500">Informe o número da sua mesa</p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="relative mb-4">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  value={mesaNumero}
                  onChange={(e) => setMesaNumero(e.target.value)}
                  placeholder="Número da mesa"
                  className="input-field w-full pl-10 text-center text-lg font-semibold"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!mesaNumero || parseInt(mesaNumero, 10) <= 0}
                className="btn-primary w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Acessar Mesa
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          <div className="mt-8 flex justify-center gap-4 text-slate-400">
            <div className="flex items-center gap-1.5 text-xs">
              <Utensils className="h-3.5 w-3.5" />
              <span>Pedido Fácil</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Wine className="h-3.5 w-3.5" />
              <span>Cardápio Digital</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mesaData) {
    const isLivre = mesaData.situacao === 'L' || mesaData.situacao === 'Livre' || mesaData.situacao === 'D' || mesaData.situacao === 'Disponivel'
    const isOcupada = mesaData.situacao === 'O' || mesaData.situacao === 'Ocupada'

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center mb-4 shadow-primary">
              <UtensilsCrossed className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              <span className="text-gradient">Comanda</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm">Restaurante Digital</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Hash className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Mesa</p>
                    <p className="text-white font-bold text-xl">
                      {mesaData.numero || mesaData.id}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isLivre
                      ? 'bg-green-500/20 text-green-100 border border-green-400/30'
                      : 'bg-yellow-500/20 text-yellow-100 border border-yellow-400/30'
                  }`}
                >
                  {isLivre ? 'Disponível' : 'Ocupada'}
                </span>
              </div>
            </div>

            <div className="p-6">
              {mesaData.descricao && (
                <p className="text-slate-600 text-sm mb-4 text-center">
                  {mesaData.descricao}
                </p>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {isLivre ? (
                <button
                  onClick={handleAbrirMesa}
                  disabled={openingMesa}
                  className="btn-primary w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                >
                  {openingMesa ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Abrindo mesa...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Abrir Mesa
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-3">
                  {comandaData && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Comanda #</span>
                        <span className="font-semibold text-slate-700">
                          {comandaData.id || comandaData.numero}
                        </span>
                      </div>
                      {comandaData.data_abertura && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-slate-500">Aberta em</span>
                          <span className="text-slate-600">
                            {new Date(comandaData.data_abertura).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleVerCardapio}
                    className="btn-primary w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    Ver Cardápio
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setMesaData(null)
                  setComandaData(null)
                  setError(null)
                  setManualInput(true)
                }}
                className="w-full mt-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors font-medium"
              >
                Trocar mesa
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <LoadingScreen />
}
