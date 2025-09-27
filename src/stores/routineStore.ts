import { create } from 'zustand'
import { localStorageService } from '../services/localStorageService'
import type { Routine } from '../services/localStorageService'

interface RoutineExecution {
  id: string
  routineId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  errorMessage?: string
  result?: any
}

interface RoutineState {
  routines: Routine[]
  executions: RoutineExecution[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchRoutines: () => Promise<void>
  fetchExecutions: (routineId?: string) => Promise<void>
  fetchRoutineExecutions: (routineId?: string) => Promise<void>
  createRoutine: (routine: {
    name: string
    description?: string
    schedule_cron: string
    is_active?: boolean
  }) => Promise<void>
  updateRoutine: (id: string, updates: {
    name?: string
    description?: string
    schedule?: string
    enabled?: boolean
  }) => Promise<void>
  deleteRoutine: (id: string) => Promise<void>
  toggleRoutine: (id: string) => Promise<void>
  clearError: () => void
  initializeRealTime: (userId: string) => void
  cleanupRealTime: () => void
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routines: [],
  executions: [],
  isLoading: false,
  error: null,

  fetchRoutines: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const routines = await localStorageService.getRoutines('system')
      set({ routines, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar rotinas',
        isLoading: false
      })
    }
  },

  fetchExecutions: async (routineId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      // For now, we'll simulate routine executions from logs
      const logs = await localStorageService.getLogs('system')
      const executions: RoutineExecution[] = logs
        .filter(log => log.metadata?.category === 'routine' && (!routineId || log.metadata?.routineId === routineId))
        .map(log => ({
          id: log.id,
          routineId: log.metadata?.routineId || '',
          status: 'completed' as const,
          startedAt: log.created_at,
          completedAt: log.created_at,
          result: log.metadata
        }))
      
      set({ executions, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar execuções de rotinas',
        isLoading: false
      })
    }
  },

  fetchRoutineExecutions: async (routineId?: string) => {
    return get().fetchExecutions(routineId)
  },

  createRoutine: async (routine) => {
    set({ isLoading: true, error: null })
    
    try {
      const newRoutine: Routine = {
        id: Date.now().toString(),
        name: routine.name,
        description: routine.description || '',
        schedule: routine.schedule_cron,
        enabled: routine.is_active ?? true,
        user_id: 'system',
        created_at: new Date().toISOString()
      }
      
      await localStorageService.createRoutine(newRoutine)
      await localStorageService.log('routine', `Rotina criada: ${routine.name}`, { routineId: newRoutine.id })
      
      // Refresh routines to get the latest state
      await get().fetchRoutines()
      
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao criar rotina',
        isLoading: false
      })
      throw error
    }
  },

  updateRoutine: async (id, updates) => {
    set({ isLoading: true, error: null })
    
    try {
      const routine = await localStorageService.getRoutine(id)
      if (!routine) {
        throw new Error('Rotina não encontrada')
      }
      
      const updatedRoutine = {
        ...routine,
        name: updates.name || routine.name,
        description: updates.description || routine.description,
        schedule: updates.schedule || routine.schedule,
        enabled: updates.enabled !== undefined ? updates.enabled : routine.enabled
      }
      
      await localStorageService.updateRoutine(id, updatedRoutine)
      await localStorageService.log('routine', `Rotina atualizada: ${routine.name}`, { routineId: id })
      
      // Update local state
      const { routines } = get()
      set({
        routines: routines.map(routine => 
          routine.id === id ? updatedRoutine : routine
        ),
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao atualizar rotina',
        isLoading: false
      })
      throw error
    }
  },

  deleteRoutine: async (id) => {
    set({ isLoading: true, error: null })
    
    try {
      const routine = await localStorageService.getRoutine(id)
      if (routine) {
        await localStorageService.log('routine', `Rotina deletada: ${routine.name}`, { routineId: id })
      }
      
      await localStorageService.deleteRoutine(id)
      
      // Update local state
      const { routines } = get()
      set({
        routines: routines.filter(routine => routine.id !== id),
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao deletar rotina',
        isLoading: false
      })
      throw error
    }
  },

  toggleRoutine: async (id) => {
    try {
      const routine = await localStorageService.getRoutine(id)
      if (!routine) {
        throw new Error('Rotina não encontrada')
      }
      
      const updatedRoutine = {
        ...routine,
        enabled: !routine.enabled
      }
      
      await localStorageService.updateRoutine(id, updatedRoutine)
      await localStorageService.log('routine', `Rotina ${updatedRoutine.enabled ? 'ativada' : 'desativada'}: ${routine.name}`, { routineId: id })
      
      // Update local state
      const { routines } = get()
      set({
        routines: routines.map(r => 
          r.id === id ? updatedRoutine : r
        )
      })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao alternar rotina'
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),

  initializeRealTime: (userId: string) => {
    // Real-time updates removed - using local storage only
  },

  cleanupRealTime: () => {
    // Real-time updates removed - using local storage only
  }
}))