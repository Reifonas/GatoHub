import express from 'express'
import localStorageService from '../services/LocalStorageService.js'
import cron from 'node-cron'

const router = express.Router()

// In-memory store for active cron jobs
const activeCronJobs = new Map()

// Get all routines
router.get('/', async (req, res) => {
  try {
    const routines = await localStorageService.getRoutines()
    res.json({ routines })
  } catch (error) {
    console.error('Error fetching routines:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Create a new routine
router.post('/', async (req, res) => {
  try {
    const {
      name,
      repository_id,
      sync_type,
      schedule_cron,
      is_active = true,
      options = {}
    } = req.body

    // Validate required fields
    if (!name || !sync_type || !schedule_cron) {
      return res.status(400).json({
        error: 'Nome, tipo de sincronização e agendamento são obrigatórios'
      })
    }

    // Validate sync type
    if (!['pull', 'push', 'bidirectional'].includes(sync_type)) {
      return res.status(400).json({
        error: 'Tipo de sincronização deve ser pull, push ou bidirectional'
      })
    }

    // Validate cron expression
    if (!cron.validate(schedule_cron)) {
      return res.status(400).json({
        error: 'Expressão cron inválida'
      })
    }

    // Validate repository if provided
    let repositories = []
    if (repository_id) {
      const allRepositories = await localStorageService.getRepositories()
      const repository = allRepositories.find(r => r.id === repository_id)

      if (!repository) {
        return res.status(404).json({ error: 'Repositório não encontrado' })
      }
      repositories = [{ id: repository.id, name: repository.name, full_name: repository.name }]
    }

    // Create routine
    const routine = await localStorageService.createRoutine({
      name,
      repositories,
      sync_type,
      schedule_cron,
      interval_seconds: 3600, // Default 1 hour
      is_active,
      options
    })

    // Schedule the routine if active
    if (is_active) {
      scheduleRoutine(routine)
    }

    await localStorageService.logActivity(`Rotina criada: ${name}`)
    res.status(201).json({ routine })
  } catch (error) {
    console.error('Error creating routine:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Update a routine
router.put('/:routineId', async (req, res) => {
  try {
    const { routineId } = req.params
    const {
      name,
      sync_type,
      schedule_cron,
      is_active,
      options
    } = req.body

    // Validate sync type if provided
    if (sync_type && !['pull', 'push', 'bidirectional'].includes(sync_type)) {
      return res.status(400).json({
        error: 'Tipo de sincronização deve ser pull, push ou bidirectional'
      })
    }

    // Validate cron expression if provided
    if (schedule_cron && !cron.validate(schedule_cron)) {
      return res.status(400).json({
        error: 'Expressão cron inválida'
      })
    }

    // Get existing routine
    const existingRoutine = await localStorageService.getRoutine(routineId)
    if (!existingRoutine) {
      return res.status(404).json({ error: 'Rotina não encontrada' })
    }

    // Update routine
    const updateData = {
      ...existingRoutine,
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name
    if (sync_type !== undefined) updateData.sync_type = sync_type
    if (schedule_cron !== undefined) updateData.schedule_cron = schedule_cron
    if (is_active !== undefined) updateData.is_active = is_active
    if (options !== undefined) updateData.options = options

    const routine = await localStorageService.updateRoutine(routineId, updateData)

    // Update cron job
    unscheduleRoutine(routineId)
    if (routine.is_active) {
      scheduleRoutine(routine)
    }

    await localStorageService.logActivity(`Rotina atualizada: ${routine.name}`)
    res.json({ routine })
  } catch (error) {
    console.error('Error updating routine:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Delete a routine
router.delete('/:routineId', async (req, res) => {
  try {
    const { routineId } = req.params

    // Verify routine exists
    const routine = await localStorageService.getRoutine(routineId)
    if (!routine) {
      return res.status(404).json({ error: 'Rotina não encontrada' })
    }

    // Delete routine
    await localStorageService.deleteRoutine(routineId)

    // Remove cron job
    unscheduleRoutine(routineId)

    await localStorageService.logActivity(`Rotina excluída: ${routine.name}`)
    res.json({ message: 'Rotina excluída com sucesso' })
  } catch (error) {
    console.error('Error deleting routine:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Toggle routine active status
router.patch('/:routineId/toggle', async (req, res) => {
  try {
    const { routineId } = req.params

    // Get existing routine
    const existingRoutine = await localStorageService.getRoutine(routineId)
    if (!existingRoutine) {
      return res.status(404).json({ error: 'Rotina não encontrada' })
    }

    // Toggle active status
    const newActiveStatus = !existingRoutine.is_active

    const routine = await localStorageService.updateRoutine(routineId, {
      ...existingRoutine,
      is_active: newActiveStatus,
      updated_at: new Date().toISOString()
    })

    // Update cron job
    unscheduleRoutine(routineId)
    if (newActiveStatus) {
      scheduleRoutine(routine)
    }

    await localStorageService.logActivity(`Rotina ${newActiveStatus ? 'ativada' : 'desativada'}: ${routine.name}`)
    res.json({ routine })
  } catch (error) {
    console.error('Error toggling routine:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get routine executions
router.get('/:routineId/executions', async (req, res) => {
  try {
    const { routineId } = req.params
    const { page = 1, limit = 20 } = req.query

    // Verify routine exists
    const routine = await localStorageService.getRoutine(routineId)
    if (!routine) {
      return res.status(404).json({ error: 'Rotina não encontrada' })
    }

    // Get executions from sync operations
    const operations = await localStorageService.getSyncOperations()
    const routineExecutions = operations
      .filter(op => op.routine_id === routineId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice((page - 1) * limit, page * limit)

    res.json({ executions: routineExecutions })
  } catch (error) {
    console.error('Error fetching routine executions:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Helper functions for cron job management
function scheduleRoutine(routine) {
  try {
    const task = cron.schedule(routine.schedule_cron, async () => {
      await executeRoutine(routine)
    }, {
      scheduled: false
    })

    task.start()
    activeCronJobs.set(routine.id, task)
    console.log(`Routine ${routine.id} scheduled with cron: ${routine.schedule_cron}`)
  } catch (error) {
    console.error(`Error scheduling routine ${routine.id}:`, error)
  }
}

function unscheduleRoutine(routineId) {
  const task = activeCronJobs.get(routineId)
  if (task) {
    task.stop()
    task.destroy()
    activeCronJobs.delete(routineId)
    console.log(`Routine ${routineId} unscheduled`)
  }
}

async function executeRoutine(routine) {
  try {
    console.log(`Executing routine ${routine.id}: ${routine.name}`)

    try {
      // Get repository information
      const repository = await localStorageService.getRepository(routine.repository_id)
      if (!repository) {
        throw new Error('Repository not found')
      }

      // Create sync operation
      const syncOperation = await localStorageService.createSyncOperation({
        repository_id: routine.repository_id,
        sync_type: routine.sync_type,
        status: 'pending',
        options: routine.options,
        routine_id: routine.id,
        created_at: new Date().toISOString()
      })

      await localStorageService.logActivity(`Rotina executada: ${routine.name} - Operação ${syncOperation.id} criada`)
      console.log(`Routine ${routine.id} executed successfully, created sync operation ${syncOperation.id}`)
    } catch (error) {
      await localStorageService.logActivity(`Erro na execução da rotina ${routine.name}: ${error.message}`)
      console.error(`Routine ${routine.id} execution failed:`, error)
    }
  } catch (error) {
    console.error(`Error executing routine ${routine.id}:`, error)
  }
}

// Initialize active routines on server start
export async function initializeRoutines() {
  try {
    console.log('Initializing active routines...')
    
    const routines = await localStorageService.getRoutines()
    const activeRoutines = routines.filter(routine => routine.is_active)

    activeRoutines.forEach(routine => {
      scheduleRoutine(routine)
    })

    console.log(`Initialized ${activeRoutines.length} active routines`)
  } catch (error) {
    console.error('Error initializing routines:', error)
  }
}

export default router