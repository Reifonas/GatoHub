interface TokenCache {
  token: string;
  expiresAt?: number;
  createdAt: number;
  lastValidated?: number;
}

class TokenCacheService {
  private static readonly CACHE_KEY = 'github_token_cache';
  private static readonly VALIDATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Salva o token no cache local
   */
  static saveToken(token: string): void {
    const cache: TokenCache = {
      token,
      createdAt: Date.now(),
      lastValidated: Date.now()
    };
    
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  /**
   * Recupera o token do cache local
   */
  static getToken(): string | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const cache: TokenCache = JSON.parse(cached);
      return cache.token;
    } catch (error) {
      console.error('Erro ao recuperar token do cache:', error);
      return null;
    }
  }

  /**
   * Verifica se o token precisa ser validado novamente
   */
  static needsValidation(): boolean {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return true;
      
      const cache: TokenCache = JSON.parse(cached);
      const now = Date.now();
      
      // Se nunca foi validado ou passou do intervalo de validação
      if (!cache.lastValidated || (now - cache.lastValidated) > this.VALIDATION_INTERVAL) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar necessidade de validação:', error);
      return true;
    }
  }

  /**
   * Atualiza o timestamp da última validação
   */
  static updateValidation(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return;
      
      const cache: TokenCache = JSON.parse(cached);
      cache.lastValidated = Date.now();
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Erro ao atualizar validação:', error);
    }
  }

  /**
   * Remove o token do cache
   */
  static clearToken(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * Verifica se existe um token no cache
   */
  static hasToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Obtém informações completas do cache
   */
  static getCacheInfo(): TokenCache | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('Erro ao obter informações do cache:', error);
      return null;
    }
  }
}

export default TokenCacheService;
export type { TokenCache };