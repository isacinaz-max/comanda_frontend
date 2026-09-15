import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import Cardapio from './pages/Cardapio'
import Pedido from './pages/Pedido'
import Acompanhar from './pages/Acompanhar'
import useStore from './store/useStore'

function MesaLoader() {
  const { mesaId } = useParams()
  const { initMesa, initialized, loading, error, mesa } = useStore()

  useEffect(() => {
    if (mesaId && !initialized) {
      initMesa(mesaId)
    }
  }, [mesaId, initialized, initMesa])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-primary-200 border-t-primary animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Carregando cardapio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 px-4">
        <div className="bg-white rounded-2xl shadow-soft p-8 max-w-sm w-full text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-2">Mesa nao encontrada</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <p className="text-xs text-slate-400">Escaneie o QR Code da sua mesa</p>
        </div>
      </div>
    )
  }

  return <Cardapio />
}

function PedidoRoute() {
  const mesa = useStore((s) => s.mesa)
  return mesa ? <Pedido /> : <Navigate to="/" replace />
}

function AcompanharRoute() {
  const mesa = useStore((s) => s.mesa)
  const comanda = useStore((s) => s.comanda)
  if (!mesa) return <Navigate to="/" replace />
  if (!comanda) return <Navigate to={'/' + mesa.id} replace />
  return <Acompanhar />
}

export default function App() {
  const { loadCategorias } = useStore()

  useEffect(() => {
    loadCategorias()
  }, [loadCategorias])

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Routes>
          <Route path="/:mesaId" element={<MesaLoader />} />
          <Route path="/pedido" element={<PedidoRoute />} />
          <Route path="/acompanhar" element={<AcompanharRoute />} />
          <Route path="/" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-background to-accent-50 px-4">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Comanda Digital</h1>
                <p className="text-slate-500 text-sm">Escaneie o QR Code da sua mesa</p>
              </div>
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
