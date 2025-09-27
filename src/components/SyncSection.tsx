import React, { useState, useEffect, useRef } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { GitBranch, FolderOpen, Play, Square, Clock, CheckCircle, XCircle, AlertCircle, Settings, Github, Pause, RotateCcw, Trash2, ChevronDown, ChevronRight, RefreshCw, Download, Upload, Calendar, User, Hash, Edit3, Terminal, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { githubService } from '../services/githubService'
import ConnectionLogService from '../services/connectionLogService'
import CreateRepositoryModal from './CreateRepositoryModal'
import { RenameRepositoryModal } from './RenameRepositoryModal'
import RealTimeLogs from './RealTimeLogs'

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  language: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  created_at: string
  default_branch: string
}

const SyncSection: React.FC = () => {
  const { user, githubConnection } = useAuthStore()
  const {
    repositories,
    syncOperations,
    isLoading,
    error,
    createSyncOperation,
    updateRepository,
    cancelSyncOperation,
    clearError
  } = useSyncStore()
  

  const [selectedGithubRepo, setSelectedGithubRepo] = useState('')
  const [localPath, setLocalPath] = useState('')
  const [syncType, setSyncType] = useState<'pull' | 'push' | 'bidirectional'>('pull')
  const [isCreating, setIsCreating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([])
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false)
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [repositoryToRename, setRepositoryToRename] = useState<GitHubRepository | null>(null)
  const [showLogsFor, setShowLogsFor] = useState<string | null>(null)
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set())
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Função para buscar repositórios do GitHub
  const fetchGithubRepositories = async () => {
    if (!githubConnection.accessToken) {
      toast.error('Token do GitHub não encontrado. Faça login primeiro.')
      return
    }

    setLoadingGithubRepos(true)
    try {
      githubService.setAccessToken(githubConnection.accessToken)
      const repos = await githubService.getRepositories(1, 100)
      setGithubRepos(repos)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar repositórios do GitHub')
    } finally {
      setLoadingGithubRepos(false)
    }
  }

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  useEffect(() => {
    if (githubConnection.accessToken) {
      fetchGithubRepositories()
    }
  }, [githubConnection.accessToken])

  // Função para abrir o seletor de pasta
  const handleSelectFolder = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click()
    }
  }

  // Função para processar a pasta selecionada
  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      // Pega o caminho da primeira pasta selecionada
      const firstFile = files[0]
      const folderPath = firstFile.webkitRelativePath.split('/')[0]
      
      // Para obter o caminho completo, usamos uma aproximação baseada no nome da pasta
      // Em um ambiente real, seria necessário usar File System Access API para caminhos completos
      setLocalPath(folderPath)
      toast.success(`Pasta selecionada: ${folderPath}`)
    }
  }

  const handleCreateSync = async () => {
    // Validação dos campos obrigatórios
    if (!selectedGithubRepo) {
      toast.error('Selecione um repositório do GitHub')
      return
    }

    if (!localPath.trim()) {
      toast.error('Especifique o caminho do repositório local')
      return
    }

    if (!user) {
      toast.error('Faça login para continuar')
      return
    }

    // Validação básica do caminho local
    if (!localPath || localPath.trim().length === 0) {
      toast.error('Selecione uma pasta para o repositório local')
      return
    }

    const selectedGithubRepoData = githubRepos.find(r => r.full_name === selectedGithubRepo)
    if (!selectedGithubRepoData) {
      toast.error('Repositório do GitHub não encontrado')
      return
    }

    setIsCreating(true)
    try {
      // Criar sincronização com os novos dados
      await createSyncOperation({
        repository_id: selectedGithubRepoData.id.toString(),
        sync_type: syncType,
        options: {
          local_path: localPath,
          github_repo: selectedGithubRepo
        }
      })
      
      toast.success('Operação de sincronização iniciada!')
      
      // Limpar campos após sucesso
      setSelectedGithubRepo('')
      setLocalPath('')
      setSyncType('pull')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar operação de sincronização')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateRepository = async (repoId: string, data: { local_path?: string; sync_enabled?: boolean }) => {
    try {
      await updateRepository(repoId, data)
      toast.success('Repositório atualizado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar repositório')
    }
  }

  const handleCancelSync = async (operationId: string) => {
    try {
      await cancelSyncOperation(operationId)
      toast.success('Operação cancelada com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar operação')
    }
  }

  const handleRepositoryCreated = async (newRepo: any) => {
    try {
      // Atualizar a lista de repositórios
      await fetchGithubRepositories()
      
      // Selecionar automaticamente o repositório recém-criado
      setSelectedGithubRepo(newRepo.full_name)
      
      // Log da criação
      const owner = newRepo.full_name ? newRepo.full_name.split('/')[0] : 'unknown'
      await ConnectionLogService.logConnection({
          timestamp: new Date().toISOString(),
          username: owner,
          status: 'success',
          apiStatus: 'valid'
        })
      
      toast.success(`Repositório '${newRepo.name}' criado e selecionado!`)
    } catch (error: any) {
      console.error('Erro ao atualizar lista após criação:', error)
      toast.error('Repositório criado, mas houve erro ao atualizar a lista')
    }
  }

  const handleRenameRepository = (repo: GitHubRepository) => {
    setRepositoryToRename(repo)
    setShowRenameModal(true)
  }

  const handleRepositoryRenamed = async (updatedRepo: GitHubRepository) => {
    try {
      // Atualizar a lista de repositórios
      await fetchGithubRepositories()
      
      // Se o repositório renomeado estava selecionado, atualizar a seleção
      if (selectedGithubRepo === repositoryToRename?.full_name) {
        setSelectedGithubRepo(updatedRepo.full_name)
      }
      
      // Log da renomeação
      const owner = updatedRepo.full_name ? updatedRepo.full_name.split('/')[0] : 'unknown'
      await ConnectionLogService.logConnection({
          timestamp: new Date().toISOString(),
          username: owner,
          status: 'success',
          apiStatus: 'valid'
        })
      
      toast.success(`Repositório renomeado para '${updatedRepo.name}' com sucesso!`)
    } catch (error: any) {
      console.error('Erro ao atualizar lista após renomeação:', error)
      toast.error('Repositório renomeado, mas houve erro ao atualizar a lista')
    }
  }

  const toggleOperationExpansion = (operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(operationId)) {
        newSet.delete(operationId)
      } else {
        newSet.add(operationId)
      }
      return newSet
    })
  }

  const toggleLogsView = (operationId: string) => {
    setShowLogsFor(prev => prev === operationId ? null : operationId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }



  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Configuração de Sincronização
        </CardTitle>
        <CardDescription>
          Configure e execute operações de sincronização entre repositórios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GitHub Repository Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Repositório do GitHub</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateRepoModal(true)}
              disabled={!githubConnection.accessToken}
              className="text-xs"
            >
              <Github className="h-3 w-3 mr-1" />
              Criar Novo
            </Button>
          </div>
          <Select value={selectedGithubRepo} onValueChange={setSelectedGithubRepo}>
            <SelectTrigger>
              <SelectValue placeholder={loadingGithubRepos ? "Carregando repositórios..." : "Selecione um repositório do GitHub"} />
            </SelectTrigger>
            <SelectContent>
              {loadingGithubRepos ? (
                <SelectItem value="loading">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                </SelectItem>
              ) : (
                githubRepos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="font-medium">{repo.name}</span>
                          <span className="text-xs text-gray-500">{repo.full_name}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleRenameRepository(repo)
                        }}
                        className="h-6 w-6 p-0 hover:bg-gray-100"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {!githubConnection.accessToken && (
            <p className="text-xs text-red-500">
              Faça login no GitHub para ver seus repositórios
            </p>
          )}
        </div>

        {/* Local Repository Path */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Repositório Local</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Selecione uma pasta..."
                value={localPath}
                readOnly
                className="pl-10 cursor-pointer"
                onClick={handleSelectFolder}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectFolder}
              className="px-3"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Clique para selecionar a pasta onde o repositório está localizado
          </p>
          <input
            ref={folderInputRef}
            type="file"
            {...({ webkitdirectory: "" } as any)}
            {...({ directory: "" } as any)}
            multiple
            style={{ display: 'none' }}
            onChange={handleFolderSelect}
          />
        </div>

        {/* Sync Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Sincronização</label>
          <Select value={syncType} onValueChange={(value: 'pull' | 'push' | 'bidirectional') => setSyncType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pull">Pull (Baixar do repositório)</SelectItem>
              <SelectItem value="push">Push (Enviar para o repositório)</SelectItem>
              <SelectItem value="bidirectional">Bidirecional (Sincronização completa)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Options */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-0 h-auto font-normal text-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Opções Avançadas
          </Button>
          {showAdvanced && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Caminho Local Personalizado</label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Deixe vazio para usar o padrão"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Se não especificado, será usado o caminho configurado no repositório
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleCreateSync}
          disabled={isCreating || isLoading || !selectedGithubRepo || !localPath}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Iniciar Sincronização
            </>
          )}
        </Button>

        <Separator />

        {/* Active Operations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Operações Ativas</h3>
          {syncOperations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma operação de sincronização ativa
            </p>
          ) : (
            <div className="space-y-3">
              {syncOperations.slice(0, 10).map((operation) => {
                // Buscar repositório nos repositórios GitHub usando o repository_id
                const repo = githubRepos.find(r => r.id.toString() === operation.repository_id)
                const isExpanded = expandedOperations.has(operation.id)
                const showingLogs = showLogsFor === operation.id
                
                return (
                  <div key={operation.id} className="border rounded-lg overflow-hidden">
                    {/* Operation Header */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleOperationExpansion(operation.id)}
                          className="p-0 h-auto"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {getStatusIcon(operation.status)}
                        <div>
                          <p className="text-sm font-medium">
                            {repo?.name || 'Repositório desconhecido'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {operation.operation_name} • {new Date(operation.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(operation.status)}>
                          {operation.status}
                        </Badge>
                        {(operation.status === 'running' || operation.status === 'completed') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleLogsView(operation.id)}
                            className="p-1 h-7 w-7"
                          >
                            {showingLogs ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Terminal className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        {operation.status === 'running' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelSync(operation.id)}
                            className="p-1 h-7 w-7"
                          >
                            <Square className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-3 border-t bg-white">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Tipo:</span>
                            <span className="ml-2">{operation.sync_type}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">ID:</span>
                            <span className="ml-2 font-mono text-xs">{operation.id}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Iniciado:</span>
                            <span className="ml-2">{new Date(operation.started_at || operation.created_at).toLocaleString()}</span>
                          </div>
                          {operation.completed_at && (
                            <div>
                              <span className="font-medium text-gray-600">Concluído:</span>
                              <span className="ml-2">{new Date(operation.completed_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        {operation.error_message && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                            <span className="font-medium text-red-600">Erro:</span>
                            <p className="text-sm text-red-700 mt-1">{operation.error_message}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Real-time Logs */}
                    {showingLogs && (
                      <div className="border-t">
                        <RealTimeLogs 
                          operationId={operation.id}
                          onClose={() => setShowLogsFor(null)}
                          className="border-0 shadow-none"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              
              {syncOperations.length > 10 && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500">
                    Mostrando 10 de {syncOperations.length} operações
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Create Repository Modal */}
    <CreateRepositoryModal
      isOpen={showCreateRepoModal}
      onClose={() => setShowCreateRepoModal(false)}
      onRepositoryCreated={handleRepositoryCreated}
    />

    {/* Rename Repository Modal */}
    <RenameRepositoryModal
      isOpen={showRenameModal}
      onClose={() => {
        setShowRenameModal(false)
        setRepositoryToRename(null)
      }}
      repository={repositoryToRename}
      onRepositoryRenamed={handleRepositoryRenamed}
    />
    </>
  )
}

export { SyncSection }
export default SyncSection