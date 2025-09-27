import { create } from 'zustand'
import { localStorageService } from '../services/localStorageService'
import type { Repository, SyncOperation, LogEntry } from '../services/localStorageService'

interface SyncState {
  repositories: Repository[]
  syncOperations: SyncOperation[]
  syncLogs: LogEntry[]
  logs: any[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchRepositories: () => Promise<void>
  fetchSyncOperations: () => Promise<void>
  fetchOperations: () => Promise<void>
  fetchSyncLogs: (operationId?: string) => Promise<void>
  createSyncOperation: (operation: {
    repository_id: string
    sync_type: 'pull' | 'push' | 'bidirectional'
    options?: any
  }) => Promise<void>
  updateRepository: (repoId: string, data: { local_path?: string; sync_enabled?: boolean }) => Promise<void>
  cancelSyncOperation: (operationId: string) => Promise<void>
  cancelOperation: (operationId: string) => Promise<void>
  clearError: () => void
  initializeRealTime: (userId: string) => void
  cleanupRealTime: () => void
  operations: SyncOperation[]
}

export const useSyncStore = create<SyncState>((set, get) => ({
  repositories: [],
  syncOperations: [],
  syncLogs: [],
  logs: [],
  isLoading: false,
  error: null,
  
  get operations() {
    return get().syncOperations
  },

  fetchRepositories: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const repositories = await localStorageService.getRepositories('system')
      set({ repositories, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar repositórios',
        isLoading: false
      })
    }
  },

  fetchSyncOperations: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const syncOperations = await localStorageService.getSyncOperations()
      set({ syncOperations, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar operações de sincronização',
        isLoading: false
      })
    }
  },

  fetchOperations: async () => {
    return get().fetchSyncOperations()
  },

  fetchSyncLogs: async (operationId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const logs = await localStorageService.getLogs('system')
      let syncLogs: LogEntry[] = []
      if (operationId) {
        syncLogs = logs.filter(log => log.metadata?.operationId === operationId)
      } else {
        syncLogs = logs.filter(log => log.metadata?.category === 'sync')
      }
      
      set({ syncLogs, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar logs de sincronização',
        isLoading: false
      })
    }
  },

  createSyncOperation: async (operation) => {
    set({ isLoading: true, error: null })
    
    try {
      const newOperation: SyncOperation = {
        id: Date.now().toString(),
        repository_id: operation.repository_id,
        operation_name: operation.sync_type,
        status: 'pending',
        options: operation.options || {},
        created_at: new Date().toISOString()
      }
      
      await localStorageService.createSyncOperation(newOperation)
      await localStorageService.log('sync', `Operação de sincronização criada: ${operation.sync_type}`, { operationId: newOperation.id })
      
      // Refresh sync operations to get the latest state
      await get().fetchSyncOperations()
      
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao criar operação de sincronização',
        isLoading: false
      })
      throw error
    }
  },

  updateRepository: async (repoId: string, data: { local_path?: string; sync_enabled?: boolean }) => {
    try {
      const repository = await localStorageService.getRepository(repoId)
      if (!repository) {
        throw new Error('Repositório não encontrado')
      }
      
      const updatedRepo = {
        ...repository,
        local_path: data.local_path || repository.local_path,
        sync_enabled: data.sync_enabled !== undefined ? data.sync_enabled : repository.sync_enabled,
        updatedAt: new Date().toISOString()
      }
      
      await localStorageService.updateRepository(repoId, updatedRepo)
      await localStorageService.log('repository', `Repositório atualizado: ${repository.name}`, { repositoryId: repoId })
      
      // Update local state
      const { repositories } = get()
      set({
        repositories: repositories.map(repo => 
          repo.id === repoId ? updatedRepo : repo
        )
      })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao atualizar repositório'
      })
      throw error
    }
  },

  cancelSyncOperation: async (operationId: string) => {
    try {
      const operation = await localStorageService.getSyncOperation(operationId)
      if (!operation) {
        throw new Error('Operação não encontrada')
      }
      
      const updatedOperation = {
        ...operation,
        status: 'cancelled' as const,
        updatedAt: new Date().toISOString()
      }
      
      await localStorageService.updateSyncOperation(operationId, updatedOperation)
      await localStorageService.log('sync', `Operação de sincronização cancelada`, { operationId })
      
      // Update local state
      const { syncOperations } = get()
      set({
        syncOperations: syncOperations.map(op => 
          op.id === operationId ? updatedOperation : op
        )
      })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao cancelar operação de sincronização'
      })
      throw error
    }
  },

  cancelOperation: async (operationId: string) => {
    return get().cancelSyncOperation(operationId)
  },

  clearError: () => set({ error: null }),

  initializeRealTime: (userId: string) => {
    // Real-time updates removed - using local storage only
  },

  cleanupRealTime: () => {
    // Real-time updates removed - using local storage only
  }
}))