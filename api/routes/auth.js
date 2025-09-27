import express from 'express'
import localStorageService from '../services/LocalStorageService.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const router = express.Router()

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      })
    }

    // Check if user already exists
    const users = await localStorageService.readJSON('users.json') || []
    const existingUser = users.find(u => u.email === email)
    
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe com este email' })
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      email,
      full_name: fullName || '',
      password: hashedPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    users.push(newUser)
    await localStorageService.writeJSON('users.json', users)
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )
    
    // Save token
    await localStorageService.saveToken(token, newUser.id)

    res.json({ 
      message: 'Usuário registrado com sucesso',
      user: { id: newUser.id, email: newUser.email, full_name: newUser.full_name },
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      })
    }

    // Find user
    const users = await localStorageService.readJSON('users.json') || []
    const user = users.find(u => u.email === email)
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    // Verify password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )
    
    // Save token
    await localStorageService.saveToken(token, user.id)

    res.json({ 
      message: 'Login realizado com sucesso',
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GitHub OAuth initiation
router.get('/github', (req, res) => {
  const clientId = process.env.VITE_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID
  const callbackUrl = process.env.CALLBACK_URL || 'http://localhost:5173/auth/callback'
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo,user:email`
  
  res.json({ authUrl: githubAuthUrl })
})

// GitHub OAuth callback
router.post('/github/callback', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Código de autorização é obrigatório' })
    }

    // Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description })
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'GitHub-Sync-Pro'
      }
    })

    const githubUser = await userResponse.json()

    res.json({
      access_token: tokenData.access_token,
      github_user: githubUser
    })
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    res.status(500).json({ error: 'Erro na autenticação com GitHub' })
  }
})

// Simple auth middleware
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret')
    const users = await localStorageService.readJSON('users.json') || []
    const user = users.find(u => u.id === decoded.userId)
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }
    
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Add GitHub account
router.post('/github/add-account', authenticateUser, async (req, res) => {
  try {
    const { accessToken, githubUser } = req.body
    const userId = req.user.id

    if (!accessToken || !githubUser) {
      return res.status(400).json({ 
        error: 'Token de acesso e dados do usuário GitHub são obrigatórios' 
      })
    }

    // Get existing GitHub accounts
    const githubAccounts = await localStorageService.readJSON('github-accounts.json') || []
    
    // Check if GitHub account already exists
    const existingAccount = githubAccounts.find(acc => 
      acc.user_id === userId && acc.github_user_id === githubUser.id
    )

    if (existingAccount) {
      return res.status(400).json({ 
        error: 'Esta conta GitHub já está vinculada' 
      })
    }

    // Encrypt the access token (in production, use proper encryption)
    const encryptedToken = Buffer.from(accessToken).toString('base64')

    // Create new GitHub account
    const newAccount = {
      id: Date.now().toString(),
      user_id: userId,
      github_user_id: githubUser.id,
      username: githubUser.login,
      email: githubUser.email,
      avatar_url: githubUser.avatar_url,
      access_token: encryptedToken,
      created_at: new Date().toISOString()
    }
    
    githubAccounts.push(newAccount)
    await localStorageService.writeJSON('github-accounts.json', githubAccounts)

    res.json({ 
      message: 'Conta GitHub adicionada com sucesso',
      account: {
        ...newAccount,
        access_token: undefined // Don't return the token
      }
    })
  } catch (error) {
    console.error('Add GitHub account error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get user's GitHub accounts
router.get('/github/accounts', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id

    const githubAccounts = await localStorageService.readJSON('github-accounts.json') || []
    const userAccounts = githubAccounts
      .filter(acc => acc.user_id === userId)
      .map(acc => ({
        id: acc.id,
        github_user_id: acc.github_user_id,
        username: acc.username,
        email: acc.email,
        avatar_url: acc.avatar_url,
        created_at: acc.created_at
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    res.json({ accounts: userAccounts })
  } catch (error) {
    console.error('Get GitHub accounts error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Remove GitHub account
router.delete('/github/accounts/:accountId', authenticateUser, async (req, res) => {
  try {
    const { accountId } = req.params
    const userId = req.user.id

    const githubAccounts = await localStorageService.readJSON('github-accounts.json') || []
    
    // Verify account belongs to user
    const accountIndex = githubAccounts.findIndex(acc => 
      acc.id === accountId && acc.user_id === userId
    )

    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Conta GitHub não encontrada' })
    }

    // Remove the account
    githubAccounts.splice(accountIndex, 1)
    await localStorageService.writeJSON('github-accounts.json', githubAccounts)

    res.json({ message: 'Conta GitHub removida com sucesso' })
  } catch (error) {
    console.error('Remove GitHub account error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = req.user
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
        preferences: user.preferences || {}
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const { fullName, preferences } = req.body

    const users = await localStorageService.readJSON('users.json') || []
    const userIndex = users.findIndex(u => u.id === userId)
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (fullName !== undefined) {
      updateData.full_name = fullName
    }

    if (preferences !== undefined) {
      updateData.preferences = preferences
    }
    
    users[userIndex] = { ...users[userIndex], ...updateData }
    await localStorageService.writeJSON('users.json', users)

    res.json({ 
      message: 'Perfil atualizado com sucesso',
      user: {
        id: users[userIndex].id,
        email: users[userIndex].email,
        full_name: users[userIndex].full_name,
        created_at: users[userIndex].created_at,
        updated_at: users[userIndex].updated_at,
        preferences: users[userIndex].preferences || {}
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Logout (invalidate session)
router.post('/logout', authenticateUser, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (token) {
      await localStorageService.removeToken(token)
    }

    res.json({ message: 'Logout realizado com sucesso' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router