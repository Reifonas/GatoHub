import localStorageService from '../services/LocalStorageService.js'

/**
 * Middleware to authenticate users using Supabase JWT tokens
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido' 
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Check if token exists in local storage
    const tokens = await localStorageService.getTokens()
    
    // Find user by token
    let userData = null
    let userId = null
    
    for (const [id, tokenData] of Object.entries(tokens)) {
      if (tokenData.token === token) {
        // Check if token is expired
        if (new Date(tokenData.expiresAt) < new Date()) {
          return res.status(401).json({ 
            error: 'Token expirado',
            code: 'TOKEN_EXPIRED'
          })
        }
        
        userId = id
        userData = tokenData
        break
      }
    }
    
    if (!userData) {
      // Try to decode as base64 token for backward compatibility
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8')
        const decodedData = JSON.parse(decoded)
        
        if (!decodedData.id || !decodedData.github_username) {
          throw new Error('Invalid token format')
        }
        
        // Create user object
        req.user = {
          id: decodedData.id,
          user_metadata: {
            github_username: decodedData.github_username,
            avatar_url: decodedData.avatar_url,
            name: decodedData.name
          },
          email: decodedData.email || `${decodedData.github_username}@github.local`,
          created_at: decodedData.createdAt || new Date().toISOString(),
          role: 'authenticated'
        }
        
        return next()
      } catch (decodeError) {
        return res.status(401).json({ 
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        })
      }
    }
    
    // Create user object from stored token data
    req.user = {
      id: userId,
      user_metadata: userData.user_metadata || {},
      email: userData.email || `user-${userId}@github.local`,
      created_at: userData.createdAt,
      role: 'authenticated'
    }
    
    return next()
    
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return res.status(500).json({ 
      error: 'Erro interno de autenticação' 
    })
  }
}

/**
 * Middleware to optionally authenticate users (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      const tokens = await localStorageService.getTokens()
      
      for (const [id, tokenData] of Object.entries(tokens)) {
        if (tokenData.token === token && new Date(tokenData.expiresAt) > new Date()) {
          req.user = {
            id: id,
            user_metadata: tokenData.user_metadata || {},
            email: tokenData.email || `user-${id}@github.local`
          }
          req.token = token
          break
        }
      }
    }
    
    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    // Continue without authentication
    next()
  }
}

export const requireGitHubToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso necessário' })
    }

    const token = authHeader.substring(7)
    
    // Get tokens from local storage
    const tokens = await localStorageService.getTokens()
    
    // Find user by token
    let userData = null
    let userId = null
    
    for (const [id, tokenData] of Object.entries(tokens)) {
      if (tokenData.token === token) {
        if (new Date(tokenData.expiresAt) < new Date()) {
          return res.status(401).json({ 
            error: 'Token expirado',
            code: 'TOKEN_EXPIRED'
          })
        }
        
        userId = id
        userData = tokenData
        break
      }
    }
    
    if (!userData) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    req.user = {
      id: userId,
      user_metadata: userData.user_metadata || {},
      email: userData.email || `user-${userId}@github.local`
    }

    // Check if user has GitHub token
    if (!userData.github_token) {
      return res.status(400).json({ 
        error: 'Conta do GitHub não conectada',
        code: 'GITHUB_NOT_CONNECTED'
      })
    }

    // Verify GitHub token is still valid
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${userData.github_token}`,
          'User-Agent': 'Gatohub-Sync-Pro'
        }
      })

      if (!response.ok) {
        return res.status(400).json({ 
          error: 'Token do GitHub inválido ou expirado',
          code: 'GITHUB_TOKEN_INVALID'
        })
      }

      req.githubAccount = {
        access_token: userData.github_token,
        user_id: userId
      }
      
      next()
    } catch (error) {
      console.error('Error verifying GitHub token:', error)
      return res.status(500).json({ error: 'Erro ao verificar token do GitHub' })
    }
  } catch (error) {
    console.error('GitHub token middleware error:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

/**
 * Middleware to check if user has a GitHub account linked
 */
export const requireGitHubAccount = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      })
    }

    const tokens = await localStorageService.getTokens()
    const userData = tokens[req.user.id]
    
    if (!userData || !userData.github_token) {
      return res.status(400).json({ 
        error: 'Nenhuma conta GitHub vinculada. Vincule uma conta GitHub primeiro.' 
      })
    }
    
    req.githubAccount = {
      access_token: userData.github_token,
      user_id: req.user.id
    }
    
    next()
  } catch (error) {
    console.error('GitHub account middleware error:', error)
    return res.status(500).json({ 
      error: 'Erro ao verificar conta GitHub' 
    })
  }
}

/**
 * Rate limiting middleware
 */
const rateLimitStore = new Map()

export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Clean old entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore.get(key).filter(time => time > windowStart)
      rateLimitStore.set(key, requests)
    } else {
      rateLimitStore.set(key, [])
    }
    
    const requests = rateLimitStore.get(key)
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Muitas requisições. Tente novamente mais tarde.' 
      })
    }
    
    requests.push(now)
    rateLimitStore.set(key, requests)
    
    next()
  }
}

/**
 * Validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.details.map(detail => detail.message)
      })
    }
    
    next()
  }
}

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err)
  
  // Supabase errors
  if (err.code) {
    return res.status(400).json({ 
      error: err.message || 'Erro na operação do banco de dados' 
    })
  }
  
  // GitHub API errors
  if (err.status) {
    return res.status(err.status).json({ 
      error: err.message || 'Erro na API do GitHub' 
    })
  }
  
  // Default error
  res.status(500).json({ 
    error: 'Erro interno do servidor' 
  })
}