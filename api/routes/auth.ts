/**
 * This is a user authentication API route demo.
 * Handle user registration, login, token management, etc.
 */
import { Router, type Request, type Response } from 'express'
import axios from 'axios'

const router = Router()

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = process.env.VITE_GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET
const CALLBACK_URL = process.env.VITE_CALLBACK_URL || 'http://localhost:5173/auth/callback'

/**
 * User Login
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement register logic
})

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement login logic
})

/**
 * User Logout
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  // TODO: Implement logout logic
})

/**
 * GitHub OAuth - Initiate OAuth flow
 * GET /api/auth/github
 */
router.get('/github', async (req: Request, res: Response): Promise<void> => {
  try {
    const scope = 'repo user:email'
    const state = Math.random().toString(36).substring(2, 15)
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&scope=${encodeURIComponent(scope)}&state=${state}`
    
    res.json({ 
      success: true, 
      authUrl: githubAuthUrl,
      state 
    })
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to initiate GitHub OAuth' 
    })
  }
})

// GitHub OAuth callback - exchange code for token
router.post('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.body

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Código de autorização ausente'
      })
    }

    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        'Accept': 'application/json'
      }
    })

    const tokenData = tokenResponse.data

    if (tokenData.error) {
      return res.status(400).json({
        success: false,
        error: tokenData.error_description || tokenData.error
      })
    }

    // Get user information from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const userData = userResponse.data

    // Calculate token expiration (GitHub tokens don't expire, but we set a reasonable time)
    const expiresAt = Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year

    res.json({
      success: true,
      token: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // GitHub doesn't provide refresh tokens
        token_type: tokenData.token_type || 'Bearer',
        scope: tokenData.scope,
        expires_at: expiresAt
      },
      user: {
        id: userData.id,
        login: userData.login,
        name: userData.name,
        email: userData.email,
        avatar_url: userData.avatar_url,
        bio: userData.bio,
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following
      }
    })

  } catch (error) {
    console.error('GitHub OAuth callback error:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor durante callback OAuth'
    })
  }
})

// GitHub token refresh endpoint
router.post('/github/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body

    // Note: GitHub doesn't support refresh tokens in the traditional sense
    // GitHub tokens are long-lived and don't expire
    // This endpoint is here for compatibility with the token manager
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token ausente'
      })
    }

    // For GitHub, we would typically validate the existing token
    // and return the same token since GitHub tokens don't expire
    // In a real implementation, you might want to validate the token with GitHub API
    
    res.status(400).json({
      success: false,
      error: 'GitHub não suporta refresh tokens. Faça login novamente se necessário.'
    })

  } catch (error) {
    console.error('GitHub token refresh error:', error)
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor durante refresh do token'
    })
  }
})

export default router
