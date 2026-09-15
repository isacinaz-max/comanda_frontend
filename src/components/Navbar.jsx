import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useStore from '../store/useStore'
import { formatCurrency } from '../utils/formatters'
import { getItensComanda } from '../services/api'

const Navbar = () => {
  const { mesa, comanda, getCartItemCount, getCartTotal } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [itensCount, setItensCount] = useState(0)

  const cartItemCount = getCartItemCount()
  const cartTotal = getCartTotal()

  useEffect(() => {
    const loadCount = async () => {
      if (comanda?.id) {
        try {
          const itens = await getItensComanda(comanda.id)
          setItensCount(Array.isArray(itens) ? itens.length : 0)
        } catch {
          setItensCount(0)
        }
      } else {
        setItensCount(0)
      }
    }
    loadCount()
  }, [comanda?.id])

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h18v18H3zM3 9h18M9 3v18"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-gradient hidden sm:block">
              Comanda
            </span>
          </div>

          {mesa && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 hidden sm:block">Mesa</span>
              <span className="px-3 py-1 bg-primary-50 text-primary rounded-full text-sm font-semibold">
                {mesa?.numero || mesa?.id}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/cardapio')}
              className={`relative p-2 rounded-lg transition-colors ${
                isActive('/cardapio')
                  ? 'bg-primary-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </button>

            <button
              onClick={() => navigate('/pedido')}
              className={`relative p-2 rounded-lg transition-colors ${
                isActive('/pedido')
                  ? 'bg-primary-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </button>

            <button
              onClick={() => navigate('/acompanhar')}
              className={`relative p-2 rounded-lg transition-colors ${
                isActive('/acompanhar')
                  ? 'bg-primary-50 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              {itensCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-semibold animate-bounce-in">
                  {itensCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
