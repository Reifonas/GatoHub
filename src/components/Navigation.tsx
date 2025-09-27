import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, User, History, Menu, X, Github, LogOut, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import GitHubLoginModal from '../components/GitHubLoginModal'

const Navigation: React.FC = () => {
  const location = useLocation()
  const { user, logout, githubConnection, connectGitHub, disconnectGitHub } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Histórico', href: '/history', icon: History },
    { name: 'Perfil', href: '/profile', icon: User },
  ]

  const isActive = (href: string) => {
    return location.pathname === href
  }

  const handleLogout = async () => {
    await logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Github className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Gatohub Sync Pro
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* GitHub Status Indicator */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => {
                if (githubConnection.isConnected) {
                  disconnectGitHub()
                } else {
                  setIsGitHubModalOpen(true)
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title={githubConnection.isConnected ? 'Desconectar do GitHub' : 'Conectar ao GitHub'}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full border-2 border-white dark:border-gray-800 ${
                  githubConnection.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <Github className="w-4 h-4" />
                <span className="text-gray-900 dark:text-white">
                  {githubConnection.isConnected 
                    ? `@${githubConnection.username}` 
                    : 'Conectar GitHub'
                  }
                </span>
              </div>
            </button>
            
            {user && (
              <div className="flex items-center space-x-3 border-l border-gray-200 dark:border-gray-700 pl-4">
                <div className="text-sm">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user.github_username || user.email}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile GitHub Status & User Info */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              {/* GitHub Connection Status */}
              <button
                onClick={() => {
                  if (githubConnection.isConnected) {
                    disconnectGitHub()
                  } else {
                    setIsGitHubModalOpen(true)
                  }
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-base font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors mb-2"
              >
                <div className={`w-2 h-2 rounded-full ${
                  githubConnection.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <Github className="w-5 h-5" />
                <span>
                  {githubConnection.isConnected 
                    ? githubConnection.username 
                    : 'Conectar GitHub'
                  }
                </span>
              </button>
              
              {user && (
                <>
                  <div className="px-3 py-2">
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {user.github_username || user.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sair</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* GitHub Login Modal */}
      <GitHubLoginModal 
        isOpen={isGitHubModalOpen} 
        onClose={() => setIsGitHubModalOpen(false)} 
      />
    </nav>
  )
}

export { Navigation }
export default Navigation