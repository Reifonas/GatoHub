import React, { useState } from 'react'
import { X, Github, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import TokenCacheService from '../services/tokenCacheService'

interface GitHubLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const GitHubLoginModal: React.FC<GitHubLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { connectGitHub, loading, error } = useAuthStore()
  const [step, setStep] = useState<'login' | 'connecting' | 'testing' | 'success'>('login')
  const [connectionStatus, setConnectionStatus] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [tokenError, setTokenError] = useState<string>('')

  const handleConnect = async () => {
    // Validate token format
    if (!token.trim()) {
      setTokenError('Token é obrigatório');
      return;
    }
    
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      setTokenError('Token deve começar com "ghp_" ou "github_pat_"');
      return;
    }
    
    setTokenError('');
    
    try {
      await connectGitHub(token);
      // Token is automatically saved to cache in connectGitHub method
      setStep('success');
      // Call onSuccess callback after a short delay to show success state
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      console.error('Connection failed:', error);
    }
  };

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Conectar ao GitHub
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'login' && (
            <div className="text-center">
              <div className="mb-6">
                <Github className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Conecte sua conta GitHub
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Para sincronizar seus repositórios, você precisa fornecer um Personal Access Token (PAT) do GitHub.
                </p>
                
                {/* Instructions */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-left">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Como gerar seu PAT:</h4>
                  <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li>1. Acesse GitHub.com &gt; Settings &gt; Developer settings</li>
                    <li>2. Clique em "Personal access tokens" &gt; "Tokens (classic)"</li>
                    <li>3. Clique "Generate new token" &gt; "Generate new token (classic)"</li>
                    <li>4. Selecione os escopos: <strong>repo</strong>, <strong>user</strong></li>
                    <li>5. Clique "Generate token" e copie o token gerado</li>
                  </ol>
                </div>
              </div>
              
              {/* Token Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {tokenError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 text-left">{tokenError}</p>
                )}
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2" />
                    <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleConnect}
                disabled={loading || !token.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Github className="w-5 h-5" />
                <span>{loading ? 'Conectando...' : 'Conectar com GitHub'}</span>
              </button>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Seu token será usado apenas para acessar a API do GitHub e será armazenado localmente.
              </p>
            </div>
          )}

          {step === 'connecting' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Conectando...
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {connectionStatus || 'Estabelecendo conexão com sua conta GitHub.'}
                </p>
              </div>
            </div>
          )}

          {step === 'testing' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Testando Conexão
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {connectionStatus || 'Verificando se a conexão está funcionando...'}
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="mb-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Conectado com sucesso!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Sua conta GitHub foi conectada. Agora você pode sincronizar seus repositórios.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Gatohub Sync Pro</span>
            <span>Conexão segura</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GitHubLoginModal