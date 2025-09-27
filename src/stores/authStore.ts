import { create } from 'zustand'
import { tokenManager } from '../utils/tokenManager'
import { githubService } from '../services/githubService'
import { localStorageService, type User } from '../services/localStorageService'
import TokenCacheService from '../services/tokenCacheService'
import ConnectionLogService from '../services/connectionLogService'

interface GitHubConnection {
  isConnected: boolean
  username: string | null
  avatarUrl: string | null
  accessToken: string | null
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  githubConnection: GitHubConnection
  
  // Computed properties
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  loginWithGitHub: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  initialize: () => Promise<void>
  connectGitHub: (token: string) => Promise<void>
  disconnectGitHub: () => void
  loadGitHubConnection: () => void
  refreshGitHubToken: () => Promise<string>
  initializeGitHubFromCache: () => Promise<void>
  hasGitHubTokenInCache: () => boolean
}

// Single user ID for local application
const SINGLE_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  githubConnection: {
    isConnected: false,
    username: null,
    avatarUrl: null,
    accessToken: null
  },
  
  // Computed properties
  get isAuthenticated() {
    return get().user !== null
  },
  get isLoading() {
    return get().loading
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })
      
      // For single-user app, just validate basic credentials
      if (email === 'admin@gatohub.app' && password === 'admin') {
        let user = await localStorageService.getUser(SINGLE_USER_ID)
        
        if (!user) {
          // Create user if doesn't exist
          user = await localStorageService.createUser({
            github_username: '',
            github_token: '',
            email: 'admin@gatohub.app',
            avatar_url: '',
            created_at: new Date().toISOString()
          })
        }
        
        set({ user, loading: false })
        
        // Log successful login
        await localStorageService.createLog({
          level: 'info',
          message: 'User logged in successfully',
          user_id: user.id
        })
      } else {
        throw new Error('Credenciais inválidas')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no login', 
        loading: false 
      })
      throw error
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      set({ loading: true, error: null })
      
      // For single-user app, create or update the user
      let user = await localStorageService.getUser(SINGLE_USER_ID)
      
      if (!user) {
        user = await localStorageService.createUser({
          github_username: '',
          github_token: '',
          email: email,
          avatar_url: '',
          created_at: new Date().toISOString()
        })
      } else {
        user = await localStorageService.updateUser(SINGLE_USER_ID, {
          email: email
        })
      }
      
      if (!user) throw new Error('Falha ao criar usuário')
      
      set({ user, loading: false })
      
      // Log successful registration
      await localStorageService.createLog({
        level: 'info',
        message: 'User registered successfully',
        user_id: user.id
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no registro', 
        loading: false 
      })
      throw error
    }
  },

  loginWithGitHub: async () => {
    try {
      set({ loading: true, error: null })
      
      // Get token from cache or throw error if not available
      const cachedToken = TokenCacheService.getToken()
      if (!cachedToken) {
        throw new Error('Token do GitHub não encontrado. Faça login primeiro.')
      }
      
      // Use the connectGitHub method for OAuth flow
      await get().connectGitHub(cachedToken)
      
      // After successful GitHub connection, log in the user
      let user = await localStorageService.getUser(SINGLE_USER_ID)
      
      if (!user) {
        user = await localStorageService.createUser({
          github_username: get().githubConnection.username || '',
          github_token: get().githubConnection.accessToken || '',
          email: 'admin@gatohub.app',
          avatar_url: get().githubConnection.avatarUrl || '',
          created_at: new Date().toISOString()
        })
      }
      
      set({ user, loading: false })
      
      // Log successful GitHub login
      await localStorageService.createLog({
        level: 'info',
        message: 'User logged in with GitHub successfully',
        user_id: user.id
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no login com GitHub', 
        loading: false 
      })
      throw error
    }
  },

  logout: async () => {
    try {
      set({ loading: true })
      
      const currentUser = get().user
      
      // Log logout
      if (currentUser) {
        await localStorageService.createLog({
          level: 'info',
          message: 'User logged out',
          user_id: currentUser.id
        })
      }
      
      set({ user: null, loading: false, error: null })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no logout', 
        loading: false 
      })
    }
  },

  clearError: () => set({ error: null }),

  initialize: async () => {
    try {
      set({ loading: true, error: null })
      
      // Check for existing user in local storage
      let user = await localStorageService.getUser(SINGLE_USER_ID)
      
      if (!user) {
        // Create default user for single-user app
        user = await localStorageService.createUser({
          github_username: '',
          github_token: '',
          email: 'admin@gatohub.app',
          avatar_url: '',
          created_at: new Date().toISOString()
        })
      }
      
      set({ 
        user, 
        loading: false,
        error: null
      })
      
      // Try to initialize GitHub connection from cache
      await get().initializeGitHubFromCache()
      
      // Log initialization
      await localStorageService.createLog({
        level: 'info',
        message: 'Application initialized',
        user_id: user.id
      })
      
    } catch (error) {
      console.error('Initialization error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Erro na inicialização', 
        loading: false 
      })
    }
  },

  connectGitHub: async (token: string) => {
    try {
      set({ loading: true, error: null });
      
      // Validate token format
      if (!token || (!token.startsWith('ghp_') && !token.startsWith('github_pat_'))) {
        throw new Error('Token inválido. Use um Personal Access Token válido do GitHub.');
      }
      
      // Test connection and log automatically
      const connectionResult = await ConnectionLogService.testGitHubConnection(token);
      
      if (!connectionResult.success) {
        throw new Error(connectionResult.error || 'Falha ao testar conexão');
      }
      
      const githubUser = connectionResult.userInfo!;
      
      // Save token to cache
      TokenCacheService.saveToken(token);
      
      // Store GitHub connection
      const connection = {
        isConnected: true,
        accessToken: token,
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        connectedAt: new Date().toISOString()
      };
      
      // Update user with GitHub info
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          github_username: githubUser.login,
          avatar_url: githubUser.avatar_url
        };
        
        await localStorageService.updateUser(currentUser.id, {
        github_username: githubUser.login,
        github_token: token,
        avatar_url: githubUser.avatar_url
      });
        set({ user: updatedUser });
      }
      
      // Save connection to localStorage (mantém compatibilidade)
      localStorage.setItem('github_connection', JSON.stringify(connection));
      
      set({ 
        githubConnection: connection,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Erro ao conectar GitHub:', error);
      let errorMessage = 'Erro ao conectar com GitHub';
      
      if (error.message.includes('Bad credentials')) {
        errorMessage = 'Token inválido. Verifique se o token está correto e possui as permissões necessárias.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      set({ 
        loading: false, 
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }
  },

  disconnectGitHub: async () => {
    const { githubConnection } = get()
    const username = githubConnection.username || 'Usuário desconhecido'
    
    const disconnectedState = {
      isConnected: false,
      username: null,
      avatarUrl: null,
      accessToken: null
    }
    
    const currentUser = get().user
    
    // Clear GitHub connection from localStorage and cache
    localStorage.removeItem('github_connection')
    TokenCacheService.clearToken()
    
    // Update user to remove GitHub data
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        github_username: '',
        github_token: '',
        avatar_url: ''
      }
      
      await localStorageService.updateUser(currentUser.id, {
        github_username: '',
        github_token: '',
        avatar_url: ''
      })
      set({ user: updatedUser })
    }
    
    set({ githubConnection: disconnectedState })
    
    // Log disconnection
    await ConnectionLogService.logConnection({
      timestamp: new Date().toISOString(),
      username,
      status: 'success', // Successful disconnection
      apiStatus: 'valid'
    })
    
    console.log(`${username} desconectado do GitHub`)
  },

  loadGitHubConnection: () => {
    try {
      const saved = localStorage.getItem('github_connection')
      if (saved) {
        const connection = JSON.parse(saved)
        if (connection.isConnected && connection.accessToken) {
          // Set up GitHub service with saved token
          githubService.setAccessToken(connection.accessToken)
          set({ githubConnection: connection })
          console.log('Conexão GitHub carregada:', connection.username)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conexão GitHub:', error)
      // Clear invalid connection
      localStorage.removeItem('github_connection')
      get().disconnectGitHub()
    }
  },
  
  refreshGitHubToken: async () => {
    const { githubConnection } = get()
    
    if (!githubConnection.isConnected || !githubConnection.accessToken) {
      return 'Token não encontrado'
    }
    
    try {
      // Test if the current token is still valid
      githubService.setAccessToken(githubConnection.accessToken)
      const connectionTest = await githubService.testConnection()
      
      if (!connectionTest.success) {
        console.error('Token GitHub inválido:', connectionTest.error)
        get().disconnectGitHub()
        return 'Token inválido'
      }
      
      console.log('Token GitHub ainda válido')
      return 'Token válido'
    } catch (error) {
      console.error('Erro ao validar token GitHub:', error)
      // If validation fails, disconnect
      get().disconnectGitHub()
      return 'Erro na validação'
    }
  },

  /**
   * Inicializa conexão GitHub a partir do cache de tokens
   */
  initializeGitHubFromCache: async () => {
    try {
      const cachedToken = TokenCacheService.getToken()
      
      if (!cachedToken) {
        console.log('Nenhum token encontrado no cache')
        return
      }
      
      // Test cached token and log automatically
      const connectionResult = await ConnectionLogService.testGitHubConnection(cachedToken)
      
      if (connectionResult.success && connectionResult.userInfo) {
        const githubUser = connectionResult.userInfo
        
        // Store GitHub connection
        const connection = {
          isConnected: true,
          accessToken: cachedToken,
          username: githubUser.login,
          avatarUrl: githubUser.avatar_url,
          connectedAt: new Date().toISOString()
        }
        
        // Update user with GitHub info
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            github_username: githubUser.login,
            avatar_url: githubUser.avatar_url
          }
          
          await localStorageService.updateUser(currentUser.id, {
            github_username: githubUser.login,
            avatar_url: githubUser.avatar_url
          })
          set({ user: updatedUser })
        }
        
        // Save connection to localStorage (mantém compatibilidade)
        localStorage.setItem('github_connection', JSON.stringify(connection))
        
        set({ githubConnection: connection })
        
        // Log automatic reconnection
        await ConnectionLogService.logAutoReconnection(githubUser.login, true)
      } else {
        // Token is invalid or expired
        await ConnectionLogService.logAutoReconnection('Token inválido', false, connectionResult.error)
        
        // Clear invalid token
        TokenCacheService.clearToken()
        localStorage.removeItem('github_connection')
      }
    } catch (error) {
      console.error('Erro ao inicializar GitHub do cache:', error)
      
      // Log error in reconnection
      await ConnectionLogService.logAutoReconnection('Erro na inicialização', false, error instanceof Error ? error.message : 'Erro desconhecido')
      
      // Clear potentially corrupted data
      TokenCacheService.clearToken()
      localStorage.removeItem('github_connection')
    }
  },

  /**
   * Verifica se há token GitHub no cache
   */
  hasGitHubTokenInCache: () => {
    return githubService.hasTokenInCache()
  }
}))