const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      // For single-user app, create a simple token that backend can recognize
      const authStore = (await import('../stores/authStore')).useAuthStore.getState()
      const user = authStore.user
      
      if (user) {
        // Create a simple token with user info
        const tokenData = {
          user_id: user.id,
          email: user.email,
          aud: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
          iat: Math.floor(Date.now() / 1000)
        }
        
        // For development, use a simple base64 encoded token
        const token = btoa(JSON.stringify(tokenData))
        
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
      
      return {
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('Error getting auth headers:', error)
      return {
        'Content-Type': 'application/json'
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = await this.getAuthHeaders()

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    })
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async githubCallback(code: string) {
    return this.request('/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
  }

  async addGithubAccount(token: string, username: string) {
    return this.request('/api/auth/github/add', {
      method: 'POST',
      body: JSON.stringify({ token, username })
    })
  }

  async getGithubAccounts() {
    return this.request('/api/auth/github')
  }

  async removeGithubAccount(accountId: string) {
    return this.request(`/api/auth/github/${accountId}`, {
      method: 'DELETE'
    })
  }

  async getProfile() {
    return this.request('/api/auth/profile')
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST'
    })
  }

  // Sync endpoints
  async getRepositories() {
    return this.request('/api/sync/repositories')
  }

  async updateRepository(repoId: string, data: { local_path?: string; sync_enabled?: boolean }) {
    return this.request('/api/sync/repositories', {
      method: 'POST',
      body: JSON.stringify({ repository_id: repoId, ...data })
    })
  }

  async createSyncOperation(data: {
    repository_id: string
    sync_type: 'pull' | 'push' | 'bidirectional'
    options?: any
  }) {
    return this.request('/api/sync/operations', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getSyncOperations(status?: string) {
    const params = status ? `?status=${status}` : ''
    return this.request(`/api/sync/operations${params}`)
  }

  async getSyncOperation(operationId: string) {
    return this.request(`/api/sync/operations/${operationId}`)
  }

  async cancelSyncOperation(operationId: string) {
    return this.request(`/api/sync/operations/${operationId}/cancel`, {
      method: 'POST'
    })
  }

  // Routine endpoints
  async getRoutines() {
    return this.request('/api/routines')
  }

  async createRoutine(data: {
    name: string
    repository_id: string
    sync_type: 'pull' | 'push' | 'bidirectional'
    schedule_cron: string
    is_active?: boolean
    options?: any
  }) {
    return this.request('/api/routines', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateRoutine(routineId: string, data: {
    name?: string
    sync_type?: 'pull' | 'push' | 'bidirectional'
    schedule_cron?: string
    is_active?: boolean
    options?: any
  }) {
    return this.request(`/api/routines/${routineId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteRoutine(routineId: string) {
    return this.request(`/api/routines/${routineId}`, {
      method: 'DELETE'
    })
  }

  async toggleRoutine(routineId: string) {
    return this.request(`/api/routines/${routineId}/toggle`, {
      method: 'PATCH'
    })
  }

  async getRoutineExecutions(routineId: string, page = 1, limit = 20) {
    return this.request(`/api/routines/${routineId}/executions?page=${page}&limit=${limit}`)
  }

  // GitHub account management
  async connectGitHubAccount(code: string) {
    return this.request('/api/auth/github/connect', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
  }

  async disconnectGitHubAccount() {
    return this.request('/api/auth/github/disconnect', {
      method: 'POST'
    })
  }

  // User account management
  async deleteUserAccount() {
    return this.request('/api/auth/account', {
      method: 'DELETE'
    })
  }
}

export const apiService = new ApiService()
export default apiService