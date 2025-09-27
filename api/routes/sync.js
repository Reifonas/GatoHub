import express from 'express'
import { Octokit } from '@octokit/rest'
import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'
import localStorageService from '../services/LocalStorageService.js'
import { authenticateUser, requireGitHubAccount } from '../middleware/auth.js'

const router = express.Router()

// Store active SSE connections for real-time log streaming
const sseConnections = new Map()

// Get user's repositories
router.get('/repositories', async (req, res) => {
  try {
    // Get repositories from local storage
    const repositories = await localStorageService.getRepositories()
    
    res.json({ repositories })
  } catch (error) {
    console.error('Error fetching repositories:', error)
    res.status(500).json({ error: 'Erro ao buscar repositórios' })
  }
})

// Add/Update repository configuration
router.post('/repositories', async (req, res) => {
  try {
    const { githubRepoId, name, localPath, syncEnabled } = req.body

    if (!githubRepoId || !name || !localPath) {
      return res.status(400).json({ 
        error: 'ID do repositório, nome e caminho local são obrigatórios' 
      })
    }

    // Validate local path
    try {
      await fs.access(path.dirname(localPath))
    } catch {
      return res.status(400).json({ 
        error: 'Caminho local inválido ou inacessível' 
      })
    }

    // Get existing repositories
    const repositories = await localStorageService.getRepositories()
    const existingRepoIndex = repositories.findIndex(repo => repo.github_repo_id === githubRepoId)

    let result
    if (existingRepoIndex !== -1) {
      // Update existing repository
      repositories[existingRepoIndex] = {
        ...repositories[existingRepoIndex],
        name,
        local_path: localPath,
        sync_enabled: syncEnabled,
        updated_at: new Date().toISOString()
      }
      result = repositories[existingRepoIndex]
    } else {
      // Create new repository
      result = {
        id: Date.now().toString(),
        github_repo_id: githubRepoId,
        name,
        local_path: localPath,
        sync_enabled: syncEnabled,
        created_at: new Date().toISOString()
      }
      repositories.push(result)
    }

    // Save updated repositories
    await localStorageService.saveRepositories(repositories)
    await localStorageService.logActivity(`Repositório configurado: ${name}`)

    res.json({ 
      message: 'Repositório configurado com sucesso',
      repository: result 
    })
  } catch (error) {
    console.error('Error configuring repository:', error)
    res.status(500).json({ error: 'Erro ao configurar repositório' })
  }
})

// Create sync operation
router.post('/operations', authenticateUser, requireGitHubAccount, async (req, res) => {
  try {
    const { 
      repositoryId, 
      operationName, 
      syncType, 
      sourcePath, 
      destinationPath,
      options = {} 
    } = req.body

    if (!repositoryId || !operationName || !syncType) {
      return res.status(400).json({ 
        error: 'ID do repositório, nome da operação e tipo de sincronização são obrigatórios' 
      })
    }

    // Validate sync type
    if (!['push', 'pull', 'bidirectional'].includes(syncType)) {
      return res.status(400).json({ 
        error: 'Tipo de sincronização inválido' 
      })
    }

    // Get repository info
    const repositories = await localStorageService.getRepositories()
    const repository = repositories.find(repo => repo.id === repositoryId)

    if (!repository) {
      return res.status(404).json({ error: 'Repositório não encontrado' })
    }

    // Create sync operation
    const operation = {
      id: Date.now().toString(),
      repository_id: repositoryId,
      operation_name: operationName,
      sync_type: syncType,
      source_path: sourcePath || repository.local_path,
      destination_path: destinationPath,
      status: 'pending',
      options,
      created_at: new Date().toISOString()
    }

    // Save operation
    const operations = await localStorageService.getSyncOperations()
    operations.push(operation)
    await localStorageService.saveSyncOperations(operations)
    await localStorageService.logActivity(`Operação de sincronização criada: ${operationName} (${syncType})`)

    // Start sync operation asynchronously
    processSyncOperation(operation.id)
      .catch(error => console.error('Sync operation error:', error))

    res.json({ 
      message: 'Operação de sincronização iniciada',
      operation 
    })
  } catch (error) {
    console.error('Error creating sync operation:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get sync operations
router.get('/operations', authenticateUser, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query

    // Get operations from local storage
    let operations = await localStorageService.getSyncOperations()
    const repositories = await localStorageService.getRepositories()

    // Filter by status if provided
    if (status) {
      operations = operations.filter(op => op.status === status)
    }

    // Sort by created_at descending
    operations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Apply pagination
    const paginatedOperations = operations.slice(offset, offset + parseInt(limit))

    // Enrich with repository data
    const enrichedOperations = paginatedOperations.map(op => {
      const repo = repositories.find(r => r.id === op.repository_id)
      return {
        ...op,
        repositories: repo ? {
          name: repo.name,
          github_repo_id: repo.github_repo_id
        } : null
      }
    })

    res.json({ operations: enrichedOperations })
  } catch (error) {
    console.error('Error fetching sync operations:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// SSE endpoint for real-time log streaming
router.get('/operations/:operationId/logs', (req, res) => {
  const { operationId } = req.params
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })
  
  // Store connection for this operation
  if (!sseConnections.has(operationId)) {
    sseConnections.set(operationId, new Set())
  }
  sseConnections.get(operationId).add(res)
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Conectado ao stream de logs',
    timestamp: new Date().toISOString()
  })}\n\n`)
  
  // Handle client disconnect
  req.on('close', () => {
    if (sseConnections.has(operationId)) {
      sseConnections.get(operationId).delete(res)
      if (sseConnections.get(operationId).size === 0) {
        sseConnections.delete(operationId)
      }
    }
  })
})

// Get sync operation details
router.get('/operations/:operationId', async (req, res) => {
  try {
    const { operationId } = req.params

    // Get operation from local storage
    const operations = await localStorageService.getSyncOperations()
    const operation = operations.find(op => op.id === operationId)

    if (!operation) {
      return res.status(404).json({ error: 'Operação não encontrada' })
    }

    // Get repository data
    const repositories = await localStorageService.getRepositories()
    const repository = repositories.find(r => r.id === operation.repository_id)

    // Enrich operation with repository data
    const enrichedOperation = {
      ...operation,
      repositories: repository ? {
        name: repository.name,
        github_repo_id: repository.github_repo_id,
        local_path: repository.local_path
      } : null,
      sync_logs: [] // Logs will be implemented separately
    }

    res.json({ operation: enrichedOperation })
  } catch (error) {
    console.error('Error fetching sync operation:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Cancel sync operation
router.post('/operations/:operationId/cancel', authenticateUser, async (req, res) => {
  try {
    const { operationId } = req.params

    // Get operations from local storage
    const operations = await localStorageService.getSyncOperations()
    const operationIndex = operations.findIndex(op => op.id === operationId && op.status === 'running')

    if (operationIndex === -1) {
      return res.status(404).json({ 
        error: 'Operação não encontrada ou não pode ser cancelada' 
      })
    }

    // Update operation status
    operations[operationIndex] = {
      ...operations[operationIndex],
      status: 'failed',
      error_message: 'Operação cancelada pelo usuário',
      completed_at: new Date().toISOString()
    }

    // Save updated operations
    await localStorageService.saveSyncOperations(operations)
    await localStorageService.logActivity(`Operação cancelada: ${operations[operationIndex].operation_name}`)

    res.json({ 
      message: 'Operação cancelada com sucesso',
      operation: operations[operationIndex] 
    })
  } catch (error) {
    console.error('Error canceling sync operation:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Process sync operation (background function)
async function processSyncOperation(operationId) {
  try {
    // Get operation details from local storage
    const operations = await localStorageService.getSyncOperations()
    const operationIndex = operations.findIndex(op => op.id === operationId)
    
    if (operationIndex === -1) {
      throw new Error('Operação não encontrada')
    }

    const operation = operations[operationIndex]
    
    // Get repository details
    const repositories = await localStorageService.getRepositories()
    const repository = repositories.find(r => r.id === operation.repository_id)
    
    if (!repository) {
      throw new Error('Repositório não encontrado')
    }

    // Get GitHub token from authenticated user
    const tokens = await localStorageService.getTokens()
    let githubToken = null
    
    // Find a valid GitHub token from any authenticated user
    for (const [userId, tokenData] of Object.entries(tokens)) {
      if (tokenData.github_token && new Date(tokenData.expiresAt) > new Date()) {
        githubToken = tokenData.github_token
        break
      }
    }
    
    if (!githubToken) {
      throw new Error('Token do GitHub não encontrado. Faça login e conecte sua conta GitHub.')
    }

    const octokit = new Octokit({ 
      auth: githubToken
    })

    // Update status to running
    operations[operationIndex] = {
      ...operations[operationIndex],
      status: 'running',
      started_at: new Date().toISOString()
    }
    await localStorageService.saveSyncOperations(operations)

    // Log start
    await logSyncMessage(operationId, 'info', 'Iniciando operação de sincronização')

    const repoPath = operation.source_path || repository.local_path

    // Execute sync based on type
    switch (operation.sync_type) {
      case 'pull':
        await performPull(operation.id, octokit, operation, repository, repoPath)
        break
      case 'push':
        await performPush(operation.id, octokit, operation, repository, repoPath)
        break
      case 'bidirectional':
        await performBidirectionalSync(operation.id, octokit, operation, repository, repoPath)
        break
      default:
        throw new Error(`Tipo de operação não suportado: ${operation.sync_type}`)
    }

    // Update status to completed
    const updatedOperations = await localStorageService.getSyncOperations()
    const finalIndex = updatedOperations.findIndex(op => op.id === operationId)
    if (finalIndex !== -1) {
      updatedOperations[finalIndex] = {
        ...updatedOperations[finalIndex],
        status: 'completed',
        completed_at: new Date().toISOString()
      }
      await localStorageService.saveSyncOperations(updatedOperations)
    }

    await logSyncMessage(operationId, 'info', 'Operação concluída com sucesso')
  } catch (error) {
    console.error('Sync operation failed:', error)
    
    // Update status to failed
    const failedOperations = await localStorageService.getSyncOperations()
    const failedIndex = failedOperations.findIndex(op => op.id === operationId)
    if (failedIndex !== -1) {
      failedOperations[failedIndex] = {
        ...failedOperations[failedIndex],
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      }
      await localStorageService.saveSyncOperations(failedOperations)
    }

    await logSyncMessage(operationId, 'error', `Erro na operação: ${error.message}`)
  }
}

// Helper functions for sync operations
async function performPull(operationId, octokit, operation, repository, repoPath) {
  await logSyncMessage(operationId, 'info', 'Executando pull do repositório')
  
  try {
    // Check if directory exists
    try {
      await fs.access(repoPath)
      // Directory exists, pull changes
      execSync('git pull origin main', { cwd: repoPath, stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', 'Pull executado com sucesso')
    } catch {
      // Directory doesn't exist, clone repository
      const [owner, repo] = repository.name.split('/')
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
      
      execSync(`git clone ${repoData.clone_url} "${repoPath}"`, { stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', 'Repositório clonado com sucesso')
    }
  } catch (error) {
    throw new Error(`Erro no pull: ${error.message}`)
  }
}

async function performPush(operationId, octokit, operation, repository, repoPath) {
  await logSyncMessage(operationId, 'info', 'Executando push para o repositório')
  
  try {
    // Get GitHub token from authenticated user
    const tokens = await localStorageService.getTokens()
    let githubToken = null
    let githubUsername = null
    
    // Find a valid GitHub token from any authenticated user
    for (const [userId, tokenData] of Object.entries(tokens)) {
      if (tokenData.github_token && new Date(tokenData.expiresAt) > new Date()) {
        githubToken = tokenData.github_token
        githubUsername = tokenData.user_metadata?.github_username || 'github-user'
        break
      }
    }
    
    if (!githubToken) {
      throw new Error('Token do GitHub não encontrado para push')
    }

    await logSyncMessage(operationId, 'info', `Configurando credenciais para usuário: ${githubUsername}`)

    // Configure git credentials with GitHub token
    const [owner, repoName] = repository.name.split('/')
    const remoteUrl = `https://${githubToken}@github.com/${owner}/${repoName}.git`
    
    // Verify repository path exists and is a git repository
    try {
      await fs.access(path.join(repoPath, '.git'))
    } catch {
      await logSyncMessage(operationId, 'info', 'Inicializando repositório Git...')
      execSync('git init', { cwd: repoPath, stdio: 'pipe' })
    }
    
    // Set git config for this operation
    try {
      execSync(`git config user.name "${githubUsername}"`, { cwd: repoPath, stdio: 'pipe' })
      execSync(`git config user.email "${githubUsername}@users.noreply.github.com"`, { cwd: repoPath, stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', `Configuração Git definida para: ${githubUsername}`)
    } catch (error) {
      throw new Error(`Erro ao configurar Git: ${error.message}`)
    }
    
    // Update remote URL with token
    try {
      execSync(`git remote set-url origin "${remoteUrl}"`, { cwd: repoPath, stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', 'URL remota atualizada com token de autenticação')
    } catch {
      // If remote doesn't exist, add it
      execSync(`git remote add origin "${remoteUrl}"`, { cwd: repoPath, stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', 'URL remota adicionada com token de autenticação')
    }
    
    // Check for modified files before adding
    await logSyncMessage(operationId, 'info', 'Verificando arquivos modificados...')
    let statusOutput
    try {
      statusOutput = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' })
    } catch (error) {
      throw new Error(`Erro ao verificar status do git: ${error.message}`)
    }
    
    if (!statusOutput.trim()) {
      await logSyncMessage(operationId, 'info', 'Nenhuma alteração detectada para fazer push')
      return
    }
    
    // Log each modified file
    const modifiedFiles = statusOutput.trim().split('\n')
    await logSyncMessage(operationId, 'info', `Encontrados ${modifiedFiles.length} arquivo(s) modificado(s):`)
    
    for (const file of modifiedFiles) {
      const status = file.substring(0, 2)
      const fileName = file.substring(3)
      let statusText = ''
      
      if (status.includes('M')) statusText = 'Modificado'
      else if (status.includes('A')) statusText = 'Adicionado'
      else if (status.includes('D')) statusText = 'Deletado'
      else if (status.includes('R')) statusText = 'Renomeado'
      else if (status.includes('??')) statusText = 'Não rastreado'
      else statusText = 'Alterado'
      
      await logSyncMessage(operationId, 'info', `  ${statusText}: ${fileName}`)
    }
    
    // Add all changes
    await logSyncMessage(operationId, 'info', 'Adicionando arquivos ao stage...')
    execSync('git add .', { cwd: repoPath, stdio: 'pipe' })
    
    // Verify staged files
    let stagedOutput
    try {
      stagedOutput = execSync('git diff --cached --name-status', { cwd: repoPath, encoding: 'utf8' })
    } catch (error) {
      throw new Error(`Erro ao verificar arquivos staged: ${error.message}`)
    }
    
    if (!stagedOutput.trim()) {
      await logSyncMessage(operationId, 'info', 'Nenhum arquivo foi adicionado ao stage')
      return
    }
    
    // Log staged files
    const stagedFiles = stagedOutput.trim().split('\n')
    await logSyncMessage(operationId, 'info', `${stagedFiles.length} arquivo(s) adicionado(s) ao stage:`)
    
    for (const file of stagedFiles) {
      const [status, fileName] = file.split('\t')
      let statusText = ''
      
      if (status === 'M') statusText = 'Modificado'
      else if (status === 'A') statusText = 'Adicionado'
      else if (status === 'D') statusText = 'Deletado'
      else if (status === 'R') statusText = 'Renomeado'
      else statusText = 'Alterado'
      
      await logSyncMessage(operationId, 'info', `  ${statusText}: ${fileName}`)
    }
    
    // Commit changes
    const commitMessage = operation.options?.commitMessage || `Sync: ${new Date().toISOString()}`
    await logSyncMessage(operationId, 'info', `Criando commit com mensagem: "${commitMessage}"`)
    
    try {
      execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath, stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', 'Commit criado com sucesso')
    } catch (error) {
      throw new Error(`Erro ao criar commit: ${error.message}`)
    }
    
    // Push changes
    await logSyncMessage(operationId, 'info', 'Enviando alterações para o GitHub...')
    
    try {
      const pushOutput = execSync('git push origin main', { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' })
      await logSyncMessage(operationId, 'info', 'Push executado com sucesso!')
      
      // Log push details if available
      if (pushOutput && pushOutput.trim()) {
        await logSyncMessage(operationId, 'info', `Detalhes do push: ${pushOutput.trim()}`)
      }
      
      await logSyncMessage(operationId, 'info', `Repositório ${repository.name} atualizado no GitHub`)
    } catch (error) {
      const errorMessage = error.message || error.toString()
      
      // Handle specific error types
      if (errorMessage.includes('rejected')) {
        if (errorMessage.includes('non-fast-forward')) {
          await logSyncMessage(operationId, 'error', 'Push rejeitado: há commits remotos mais recentes')
          await logSyncMessage(operationId, 'info', 'Tentando fazer pull antes do push...')
          
          try {
            execSync('git pull origin main --rebase', { cwd: repoPath, stdio: 'pipe' })
            await logSyncMessage(operationId, 'info', 'Pull com rebase executado, tentando push novamente...')
            
            const retryPushOutput = execSync('git push origin main', { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' })
            await logSyncMessage(operationId, 'info', 'Push executado com sucesso após rebase!')
            
            if (retryPushOutput && retryPushOutput.trim()) {
              await logSyncMessage(operationId, 'info', `Detalhes do push: ${retryPushOutput.trim()}`)
            }
            
            await logSyncMessage(operationId, 'info', `Repositório ${repository.name} atualizado no GitHub`)
          } catch (retryError) {
            throw new Error(`Erro após tentativa de rebase: ${retryError.message}`)
          }
        } else {
          throw new Error(`Push rejeitado pelo servidor: ${errorMessage}`)
        }
      } else if (errorMessage.includes('Permission denied') || errorMessage.includes('403')) {
        throw new Error('Erro de permissão: verifique se o token tem acesso de escrita ao repositório')
      } else if (errorMessage.includes('Could not resolve host') || errorMessage.includes('network')) {
        throw new Error('Erro de conectividade: verifique sua conexão com a internet')
      } else if (errorMessage.includes('Authentication failed')) {
        throw new Error('Falha na autenticação: token do GitHub pode estar inválido ou expirado')
      } else {
        throw new Error(`Erro ao fazer push: ${errorMessage}`)
      }
    }
  } catch (error) {
    await logSyncMessage(operationId, 'error', `Erro no push: ${error.message}`)
    throw new Error(`Erro no push: ${error.message}`)
  }
}

async function performBidirectionalSync(operationId, octokit, operation, repository, repoPath) {
  await logSyncMessage(operationId, 'info', 'Executando sincronização bidirecional')
  
  try {
    // First pull to get latest changes
    await performPull(operationId, octokit, operation, repository, repoPath)
    
    // Then push local changes
    await performPush(operationId, octokit, operation, repository, repoPath)
    
    await logSyncMessage(operationId, 'info', 'Sincronização bidirecional concluída')
  } catch (error) {
    throw new Error(`Erro na sincronização bidirecional: ${error.message}`)
  }
}

// Helper function to log sync messages
async function logSyncMessage(operationId, level, message) {
  try {
    const timestamp = new Date().toISOString()
    const logEntry = `[${level.toUpperCase()}] ${message} (Operation: ${operationId})`
    
    // Save to local storage
    await localStorageService.logActivity(logEntry)
    
    // Send real-time log via SSE to connected clients
    if (sseConnections.has(operationId)) {
      const logData = {
        type: 'log',
        level: level,
        message: message,
        operationId: operationId,
        timestamp: timestamp
      }
      
      const sseMessage = `data: ${JSON.stringify(logData)}\n\n`
      
      // Send to all connected clients for this operation
      const connections = sseConnections.get(operationId)
      const deadConnections = new Set()
      
      for (const connection of connections) {
        try {
          connection.write(sseMessage)
        } catch (error) {
          // Connection is dead, mark for removal
          deadConnections.add(connection)
        }
      }
      
      // Remove dead connections
      for (const deadConnection of deadConnections) {
        connections.delete(deadConnection)
      }
      
      // Clean up empty connection sets
      if (connections.size === 0) {
        sseConnections.delete(operationId)
      }
    }
  } catch (error) {
    console.error('Error logging sync message:', error)
  }
}

export default router