import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')

class LocalStorageService {
  constructor() {
    this.ensureDataDirectories()
  }

  async ensureDataDirectories() {
    const dirs = [
      dataDir,
      path.join(dataDir, 'auth'),
      path.join(dataDir, 'logs')
    ]

    for (const dir of dirs) {
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
      }
    }
  }

  async readJSON(filePath) {
    try {
      const fullPath = path.join(dataDir, filePath)
      const data = await fs.readFile(fullPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  async writeJSON(filePath, data) {
    const fullPath = path.join(dataDir, filePath)
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf8')
  }

  async appendLog(filePath, message) {
    const fullPath = path.join(dataDir, filePath)
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`
    await fs.appendFile(fullPath, logEntry, 'utf8')
  }

  // Auth methods
  async getTokens() {
    return await this.readJSON('auth/tokens.json') || {}
  }

  async saveToken(userId, token) {
    const tokens = await this.getTokens()
    tokens[userId] = {
      token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }
    await this.writeJSON('auth/tokens.json', tokens)
  }

  async removeToken(userId) {
    const tokens = await this.getTokens()
    delete tokens[userId]
    await this.writeJSON('auth/tokens.json', tokens)
  }

  // Repositories methods
  async getRepositories() {
    return await this.readJSON('repositories.json') || []
  }

  async saveRepositories(repositories) {
    await this.writeJSON('repositories.json', repositories)
  }

  async getRepository(repositoryId) {
    const repositories = await this.getRepositories()
    return repositories.find(repo => repo.id === repositoryId)
  }

  async createRepository(repoData) {
    const repositories = await this.getRepositories()
    const newRepo = {
      id: Date.now().toString(),
      ...repoData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    repositories.push(newRepo)
    await this.saveRepositories(repositories)
    return newRepo
  }

  async updateRepository(repositoryId, updateData) {
    const repositories = await this.getRepositories()
    const index = repositories.findIndex(repo => repo.id === repositoryId)
    if (index === -1) {
      throw new Error('Repository not found')
    }
    repositories[index] = { ...repositories[index], ...updateData }
    await this.saveRepositories(repositories)
    return repositories[index]
  }

  // Routines methods
  async getRoutines() {
    return await this.readJSON('routines.json') || []
  }

  async saveRoutines(routines) {
    await this.writeJSON('routines.json', routines)
  }

  async getRoutine(routineId) {
    const routines = await this.getRoutines()
    return routines.find(routine => routine.id === routineId)
  }

  async createRoutine(routineData) {
    const routines = await this.getRoutines()
    const newRoutine = {
      id: Date.now().toString(),
      ...routineData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    routines.push(newRoutine)
    await this.saveRoutines(routines)
    return newRoutine
  }

  async updateRoutine(routineId, updateData) {
    const routines = await this.getRoutines()
    const index = routines.findIndex(routine => routine.id === routineId)
    if (index === -1) {
      throw new Error('Routine not found')
    }
    routines[index] = { ...routines[index], ...updateData }
    await this.saveRoutines(routines)
    return routines[index]
  }

  async deleteRoutine(routineId) {
    const routines = await this.getRoutines()
    const filteredRoutines = routines.filter(routine => routine.id !== routineId)
    await this.saveRoutines(filteredRoutines)
  }

  // Sync operations methods
  async getSyncOperations() {
    return await this.readJSON('sync-operations.json') || []
  }

  async saveSyncOperations(operations) {
    await this.writeJSON('sync-operations.json', operations)
  }

  async getSyncOperation(operationId) {
    const operations = await this.getSyncOperations()
    return operations.find(op => op.id === operationId)
  }

  async createSyncOperation(operationData) {
    const operations = await this.getSyncOperations()
    const newOperation = {
      id: Date.now().toString(),
      ...operationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    operations.push(newOperation)
    await this.saveSyncOperations(operations)
    return newOperation
  }

  async updateSyncOperation(operationId, updateData) {
    const operations = await this.getSyncOperations()
    const index = operations.findIndex(op => op.id === operationId)
    if (index === -1) {
      throw new Error('Sync operation not found')
    }
    operations[index] = { ...operations[index], ...updateData, updated_at: new Date().toISOString() }
    await this.saveSyncOperations(operations)
    return operations[index]
  }

  async logSyncMessage(operationId, message, level = 'info') {
    const logMessage = `[${level.toUpperCase()}] Operation ${operationId}: ${message}`
    await this.appendLog('logs/sync-operations.txt', logMessage)
  }

  // Activity logs
  async logActivity(message) {
    await this.appendLog('logs/activities.txt', message)
  }
}

export const localStorageService = new LocalStorageService()
export default localStorageService