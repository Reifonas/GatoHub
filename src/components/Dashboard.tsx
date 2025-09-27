import React, { useState, useEffect } from 'react'
import { Github, Settings, History, Play, Pause, RefreshCw, FolderOpen, GitBranch, Clock, User, LogOut } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSyncStore } from '../stores/syncStore'
import AuthSection from './AuthSection'
import SyncSection from './SyncSection'
import RoutineSection from './RoutineSection'
import LogsSection from './LogsSection'

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { syncOperations, isLoading } = useSyncStore()
  const [activeTab, setActiveTab] = useState('sync')

  useEffect(() => {
    // Real-time updates removed - using local storage only
  }, [isAuthenticated, user])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <Github className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Gatohub Sync Pro
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Sincronização automatizada entre repositórios GitHub e sistema local
              </p>
            </div>
            <AuthSection />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Github className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Gatohub Sync Pro
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              
              <button
                onClick={() => setActiveTab('settings')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Configurações"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Histórico"
              >
                <History className="w-5 h-5" />
              </button>
              
              <button
                onClick={logout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('sync')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sync'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4" />
                <span>Sincronização</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('routines')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'routines'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Rotinas</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4" />
                <span>Logs</span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'sync' && <SyncSection />}
        {activeTab === 'routines' && <RoutineSection />}
        {activeTab === 'logs' && <LogsSection />}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Configurações
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configurações do perfil e preferências em desenvolvimento...
            </p>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Histórico de Sincronizações
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Histórico detalhado em desenvolvimento...
            </p>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                }`} />
                <span className="text-gray-600 dark:text-gray-400">
                  {isLoading ? 'Sincronizando...' : 'Pronto'}
                </span>
              </div>
              
              <div className="text-gray-600 dark:text-gray-400">
                {syncOperations.length} operações ativas
              </div>
            </div>
            
            <div className="text-gray-500 dark:text-gray-500">
              Gatohub Sync Pro v1.0.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Dashboard