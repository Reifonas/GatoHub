import React, { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GITHUB_OAUTH_ERROR',
          error: errorDescription || error
        }, window.location.origin)
        window.close()
      } else {
        // If not in popup, redirect to dashboard with error
        navigate('/dashboard?error=' + encodeURIComponent(errorDescription || error))
      }
      return
    }

    if (code && state) {
      // Send success to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GITHUB_OAUTH_SUCCESS',
          code,
          state
        }, window.location.origin)
        window.close()
      } else {
        // If not in popup, redirect to dashboard
        navigate('/dashboard')
      }
    } else {
      // Missing required parameters
      if (window.opener) {
        window.opener.postMessage({
          type: 'GITHUB_OAUTH_ERROR',
          error: 'Parâmetros OAuth ausentes'
        }, window.location.origin)
        window.close()
      } else {
        navigate('/dashboard?error=' + encodeURIComponent('Parâmetros OAuth ausentes'))
      }
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4">
        <div className="mb-6">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Processando autenticação...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Aguarde enquanto processamos sua autenticação com o GitHub.
          </p>
        </div>
        
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <p>• Validando credenciais</p>
          <p>• Obtendo informações do usuário</p>
          <p>• Configurando conexão</p>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback