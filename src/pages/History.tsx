import React, { useState, useEffect } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  GitBranch,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ExternalLink,
  Github
} from 'lucide-react'
import { toast } from 'sonner'

interface OperationDetails {
  id: string
  operation_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  error_message?: string
  repository: {
    id: string
    name: string
    html_url: string
    private: boolean
  }
  logs: Array<{
    id: string
    level: 'info' | 'success' | 'warning' | 'error'
    message: string
    created_at: string
  }>
}

export const History: React.FC = () => {
  const { user } = useAuthStore()
  const { operations, fetchOperations, cancelOperation } = useSyncStore()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOperation, setSelectedOperation] = useState<OperationDetails | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    if (user) {
      loadOperations()
    }
  }, [user])

  const loadOperations = async () => {
    try {
      setIsLoading(true)
      await fetchOperations()
    } catch (error) {
      console.error('Error loading operations:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOperation = async (operationId: string) => {
    try {
      await cancelOperation(operationId)
      toast.success('Operação cancelada com sucesso')
      await loadOperations()
    } catch (error) {
      console.error('Error canceling operation:', error)
      toast.error('Erro ao cancelar operação')
    }
  }

  const getFilteredOperations = () => {
    let filtered = operations

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(op => op.status === filter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(op => 
        (op as any).repository?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (op as any).sync_type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(op => {
        const opDate = new Date((op as any).created_at || (op as any).started_at)
        
        switch (dateFilter) {
          case 'today':
            return opDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return opDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return opDate >= monthAgo
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => new Date((b as any).created_at || (b as any).started_at).getTime() - new Date((a as any).created_at || (a as any).started_at).getTime())
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Falhou</Badge>
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Executando</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSyncTypeIcon = (syncType: string) => {
    switch (syncType) {
      case 'pull':
        return <Download className="w-4 h-4" />
      case 'push':
        return <Upload className="w-4 h-4" />
      case 'bidirectional':
        return <RefreshCw className="w-4 h-4" />
      default:
        return <GitBranch className="w-4 h-4" />
    }
  }

  const getSyncTypeLabel = (syncType: string) => {
    switch (syncType) {
      case 'pull':
        return 'Pull (Baixar)'
      case 'push':
        return 'Push (Enviar)'
      case 'bidirectional':
        return 'Bidirecional'
      default:
        return syncType
    }
  }

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) {
      return `${duration}s`
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`
    } else {
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  const filteredOperations = getFilteredOperations()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                ))}
              </div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <HistoryIcon className="w-6 h-6" />
            <span>Histórico de Sincronizações</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize e gerencie todas as suas operações de sincronização
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar repositórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filter} onValueChange={(value: 'all' | 'pending' | 'running' | 'completed' | 'failed') => setFilter(value)}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="running">Executando</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={(value: 'all' | 'today' | 'week' | 'month') => setDateFilter(value)}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={loadOperations} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operations List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Operações ({filteredOperations.length})
            </h2>
            
            {filteredOperations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <HistoryIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Nenhuma operação encontrada
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {searchTerm || filter !== 'all' || dateFilter !== 'all'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Suas operações de sincronização aparecerão aqui'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOperations.map((operation) => (
                  <Card 
                    key={operation.id} 
                    className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedOperation?.id === operation.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedOperation(operation as any)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(operation.status)}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {(operation as any).repository?.name || 'Repositório desconhecido'}
                          </span>
                        </div>
                        {getStatusBadge(operation.status)}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            {getSyncTypeIcon(operation.operation_name)}
                            <span>{getSyncTypeLabel(operation.operation_name)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(operation.created_at, null)}</span>
                          </div>
                        </div>
                        <span>{new Date(operation.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      
                      {operation.status === 'running' && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelOperation(operation.id)
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Operation Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Detalhes da Operação
            </h2>
            
            {selectedOperation ? (
              <div className="space-y-4">
                {/* Operation Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Github className="w-5 h-5" />
                        <span>{selectedOperation.repository.name}</span>
                      </div>
                      {getStatusBadge(selectedOperation.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                        <div className="flex items-center space-x-1 mt-1">
                          {getSyncTypeIcon(selectedOperation.operation_name)}
                          <span className="font-medium">{getSyncTypeLabel(selectedOperation.operation_name)}</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Duração:</span>
                        <p className="font-medium mt-1">
                          {formatDuration(selectedOperation.created_at, null)}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Iniciado:</span>
                        <p className="font-medium mt-1">
                          {new Date(selectedOperation.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      

                    </div>
                    
                    {selectedOperation.error_message && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-red-800 dark:text-red-200">Erro:</p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              {selectedOperation.error_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedOperation.repository.html_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no GitHub
                      </Button>
                      
                      {selectedOperation.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancelOperation(selectedOperation.id)}
                        >
                          Cancelar Operação
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Operation Logs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="w-5 h-5" />
                      <span>Logs da Operação</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
                      {selectedOperation.logs && selectedOperation.logs.length > 0 ? (
                        <div className="space-y-1">
                          {selectedOperation.logs.map((log) => (
                            <div key={log.id} className="flex items-start space-x-2">
                              <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                                {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                              </span>
                              <span className={`text-xs ${
                                log.level === 'error' ? 'text-red-400' :
                                log.level === 'warning' ? 'text-yellow-400' :
                                log.level === 'success' ? 'text-green-400' :
                                'text-blue-400'
                              }`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-gray-300 flex-1">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          <p>Nenhum log disponível para esta operação</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    Selecione uma operação
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Clique em uma operação na lista para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default History