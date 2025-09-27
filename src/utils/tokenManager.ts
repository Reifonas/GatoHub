interface TokenData {
  access_token: string
  refresh_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
}

interface StoredTokenData extends TokenData {
  encrypted: boolean
  timestamp: number
}

class TokenManager {
  private readonly STORAGE_KEY = 'github_tokens'
  private readonly ENCRYPTION_KEY = 'gatohub_sync_pro_key'

  // Simple encryption/decryption (for demo purposes)
  private encrypt(text: string): string {
    try {
      // In a real app, use proper encryption like crypto-js
      return btoa(text)
    } catch {
      return text
    }
  }

  private decrypt(encryptedText: string): string {
    try {
      return atob(encryptedText)
    } catch {
      return encryptedText
    }
  }

  // Store tokens securely
  storeTokens(tokenData: TokenData): void {
    try {
      const dataToStore: StoredTokenData = {
        ...tokenData,
        encrypted: true,
        timestamp: Date.now()
      }

      const encryptedData = this.encrypt(JSON.stringify(dataToStore))
      localStorage.setItem(this.STORAGE_KEY, encryptedData)
    } catch (error) {
      console.error('Erro ao armazenar tokens:', error)
      throw new Error('Falha ao armazenar tokens de forma segura')
    }
  }

  // Retrieve tokens
  getTokens(): TokenData | null {
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEY)
      if (!encryptedData) return null

      const decryptedData = this.decrypt(encryptedData)
      const tokenData: StoredTokenData = JSON.parse(decryptedData)

      // Check if tokens are expired (if expires_at is provided)
      if (tokenData.expires_at && Date.now() > tokenData.expires_at) {
        this.clearTokens()
        return null
      }

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      }
    } catch (error) {
      console.error('Erro ao recuperar tokens:', error)
      this.clearTokens() // Clear corrupted data
      return null
    }
  }

  // Get access token only
  getAccessToken(): string | null {
    const tokens = this.getTokens()
    return tokens?.access_token || null
  }

  // Check if tokens are valid and not expired
  isTokenValid(): boolean {
    const tokens = this.getTokens()
    if (!tokens) return false

    // If no expiration time, assume valid
    if (!tokens.expires_at) return true

    // Check if not expired (with 5 minute buffer)
    return Date.now() < (tokens.expires_at - 5 * 60 * 1000)
  }

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<TokenData | null> {
    try {
      const currentTokens = this.getTokens()
      if (!currentTokens?.refresh_token) {
        throw new Error('Refresh token não disponível')
      }

      const response = await fetch('/api/auth/github/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: currentTokens.refresh_token
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Falha ao renovar token')
      }

      const newTokenData: TokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || currentTokens.refresh_token,
        expires_at: data.expires_at,
        token_type: data.token_type || 'Bearer',
        scope: data.scope
      }

      this.storeTokens(newTokenData)
      return newTokenData
    } catch (error) {
      console.error('Erro ao renovar token:', error)
      this.clearTokens()
      throw error
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    try {
      // Check if current token is valid
      if (this.isTokenValid()) {
        return this.getAccessToken()
      }

      // Try to refresh token
      const refreshedTokens = await this.refreshAccessToken()
      return refreshedTokens?.access_token || null
    } catch (error) {
      console.error('Erro ao obter token válido:', error)
      return null
    }
  }

  // Clear all stored tokens
  clearTokens(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  // Check if user has stored tokens
  hasTokens(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null
  }

  // Get token expiration info
  getTokenExpiration(): { isExpired: boolean; expiresAt?: Date; timeLeft?: number } {
    const tokens = this.getTokens()
    
    if (!tokens?.expires_at) {
      return { isExpired: false }
    }

    const expiresAt = new Date(tokens.expires_at)
    const now = Date.now()
    const isExpired = now > tokens.expires_at
    const timeLeft = isExpired ? 0 : tokens.expires_at - now

    return {
      isExpired,
      expiresAt,
      timeLeft
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager()
export default tokenManager

// Export types
export type { TokenData, StoredTokenData }