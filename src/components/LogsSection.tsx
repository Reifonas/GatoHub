import React, { useState, useEffect, useRef } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Terminal, Download, Trash2, Filter, Search, CheckCircle, XCircle, AlertCircle, Info, RefreshCw, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { localStorageService } from '../services/localStorageService'

interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  operation?: string
  repository?: string
}

export const LogsSection: React.FC = () => {
  const { user } = useAuthStore()
  const { operations, logs } = useSyncStore()
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [localLogs, setLogs] = useState<any[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Use local logs state for display
  const displayLogs = localLogs.length > 0 ? localLogs : logs

  useEffect(() => {
    if (user) {
      fetchLogs()
      setupRealtimeSubscription()
    }
  }, [user])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const fetchLogs = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const logs = await localStorageService.getLogs('system')
      const formattedLogs = logs.map(log => ({
        ...log,
        operation_name: log.metadata?.category || 'sync',
        repository_name: log.metadata?.repository || 'N/A'
      }))
      
      setLogs(formattedLogs)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    // Real-time updates removed - using local storage only
    // Logs are automatically updated when new entries are added
    const interval = setInterval(() => {
      fetchLogs()
    }, 5000) // Refresh logs every 5 seconds

    return () => {
      clearInterval(interval)
    }
  }

  const filteredLogs = displayLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.operation_name && log.operation_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.repository_name && log.repository_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesFilter && matchesSearch
  })

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const exportLogs = () => {
    const logText = filteredLogs
      .map(log => `[${formatTimestamp(log.created_at)}] [${log.level.toUpperCase()}] ${log.operation_name || 'N/A'} - ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setAutoScroll(isAtBottom)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <Terminal className="w-6 h-6" />
          <span>Logs de Sincronização</span>
        </h2>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Atualizar logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={exportLogs}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Exportar logs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar nos logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os níveis</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          {/* Auto-scroll toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoScroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoScroll" className="text-sm text-gray-700 dark:text-gray-300">
              Auto-scroll
            </label>
          </div>
        </div>
      </div>

      {/* Logs Terminal */}
      <div className="bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300 text-sm ml-2">Terminal de Logs</span>
          </div>
          
          <div className="text-gray-400 text-xs">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entrada' : 'entradas'}
          </div>
        </div>
        
        <div 
          ref={logsContainerRef}
          onScroll={handleScroll}
          className="h-96 overflow-y-auto p-4 font-mono text-sm bg-gray-900"
        >
          {isLoading && logs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Carregando logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              <Terminal className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhum log encontrado</p>
              {searchTerm && (
                <p className="text-xs mt-1">Tente ajustar os filtros de busca</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => (
                <div key={log.id || index} className="flex items-start space-x-3 hover:bg-gray-800/50 px-2 py-1 rounded">
                  <span className="text-gray-500 text-xs mt-0.5 flex-shrink-0">
                    {formatTimestamp(log.created_at)}
                  </span>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {getLogIcon(log.level)}
                    <span className={`text-xs font-medium uppercase ${getLogColor(log.level)}`}>
                      {log.level}
                    </span>
                  </div>
                  
                  {log.operation_name && (
                    <span className="text-purple-400 text-xs flex-shrink-0">
                      [{log.operation_name}]
                    </span>
                  )}
                  
                  {log.repository_name && (
                    <span className="text-cyan-400 text-xs flex-shrink-0">
                      {log.repository_name}
                    </span>
                  )}
                  
                  <span className="text-gray-300 text-xs flex-1 break-words">
                    {log.message}
                  </span>
                </div>
              ))}
              
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Status: {isLoading ? 'Carregando...' : 'Conectado'}</span>
            <span>•</span>
            <span>Última atualização: {logs.length > 0 ? formatTimestamp(logs[logs.length - 1].created_at) : 'N/A'}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{filteredLogs.filter(l => l.level === 'error').length} erros</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{filteredLogs.filter(l => l.level === 'warning').length} avisos</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{filteredLogs.filter(l => l.level === 'info').length} info</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogsSection