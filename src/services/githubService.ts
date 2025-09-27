import axios from 'axios'
import TokenCacheService from './tokenCacheService'

interface GitHubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
  bio: string
  public_repos: number
  followers: number
  following: number
}

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  language: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  created_at: string
  default_branch: string
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
  }
  author: {
    login: string
    avatar_url: string
  }
  html_url: string
}

class GitHubService {
  private baseURL = 'https://api.github.com'
  private accessToken: string | null = null

  setAccessToken(token: string) {
    this.accessToken = token
  }

  private getHeaders() {
    if (!this.accessToken) {
      throw new Error('Token de acesso GitHub não configurado')
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  }

  async getUser(): Promise<GitHubUser> {
    try {
      const response = await axios.get(`${this.baseURL}/user`, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar usuário GitHub:', error)
      throw new Error('Falha ao buscar informações do usuário')
    }
  }

  async getRepositories(page = 1, perPage = 30): Promise<GitHubRepository[]> {
    try {
      const response = await axios.get(`${this.baseURL}/user/repos`, {
        headers: this.getHeaders(),
        params: {
          sort: 'updated',
          direction: 'desc',
          page,
          per_page: perPage
        }
      })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar repositórios:', error)
      throw new Error('Falha ao buscar repositórios')
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}`, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar repositório:', error)
      throw new Error('Falha ao buscar repositório')
    }
  }

  async getCommits(owner: string, repo: string, page = 1, perPage = 30): Promise<GitHubCommit[]> {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/commits`, {
        headers: this.getHeaders(),
        params: {
          page,
          per_page: perPage
        }
      })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar commits:', error)
      throw new Error('Falha ao buscar commits')
    }
  }

  async getBranches(owner: string, repo: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/branches`, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar branches:', error)
      throw new Error('Falha ao buscar branches')
    }
  }

  // Sobrecarga para aceitar objeto como parâmetro
  async createRepository(repoData: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
    default_branch?: string;
  }): Promise<GitHubRepository>;
  
  // Sobrecarga para aceitar parâmetros individuais
  async createRepository(
    name: string, 
    description?: string, 
    isPrivate?: boolean,
    defaultBranch?: string,
    autoInit?: boolean,
    gitignoreTemplate?: string,
    licenseTemplate?: string
  ): Promise<GitHubRepository>;
  
  // Implementação do método
  async createRepository(
    nameOrData: string | {
      name: string;
      description?: string;
      private?: boolean;
      auto_init?: boolean;
      gitignore_template?: string;
      license_template?: string;
      default_branch?: string;
    },
    description?: string, 
    isPrivate = false,
    defaultBranch = 'main',
    autoInit = true,
    gitignoreTemplate?: string,
    licenseTemplate?: string
  ): Promise<GitHubRepository> {
    try {
      // Determinar se o primeiro parâmetro é um objeto ou string
      let payload: any;
      if (typeof nameOrData === 'object') {
        // Usar dados do objeto
        payload = {
          name: nameOrData.name,
          description: nameOrData.description,
          private: nameOrData.private || false,
          auto_init: nameOrData.auto_init !== undefined ? nameOrData.auto_init : true,
          gitignore_template: nameOrData.gitignore_template,
          license_template: nameOrData.license_template
        }
      } else {
         // Usar parâmetros individuais
         payload = {
           name: nameOrData,
           description,
           private: isPrivate,
           auto_init: autoInit,
           gitignore_template: gitignoreTemplate,
           license_template: licenseTemplate
         }
       }

      // Adiciona branch padrão se especificado
      if (defaultBranch && defaultBranch !== 'master') {
        payload.default_branch = defaultBranch
      }

      // Adiciona template .gitignore se especificado
      if (gitignoreTemplate) {
        payload.gitignore_template = gitignoreTemplate
      }

      // Adiciona template de licença se especificado
      if (licenseTemplate) {
        payload.license_template = licenseTemplate
      }

      const response = await axios.post(`${this.baseURL}/user/repos`, payload, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error: any) {
      console.error('Erro ao criar repositório:', error)
      
      // Tratamento de erros específicos
      if (error.response?.status === 422) {
        const errorMessage = error.response.data?.message || 'Nome do repositório já existe ou é inválido'
        throw new Error(errorMessage)
      } else if (error.response?.status === 401) {
        throw new Error('Token de acesso inválido ou sem permissões')
      } else if (error.response?.status === 403) {
        throw new Error('Limite de repositórios atingido ou acesso negado')
      }
      
      throw new Error('Falha ao criar repositório')
    }
  }

  async renameRepository(owner: string, oldName: string, newName: string): Promise<GitHubRepository> {
    try {
      const response = await axios.patch(`${this.baseURL}/repos/${owner}/${oldName}`, {
        name: newName
      }, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error: any) {
      console.error('Erro ao renomear repositório:', error)
      
      if (error.response?.status === 422) {
        const errorMessage = error.response.data?.message || 'Nome do repositório já existe ou é inválido'
        throw new Error(errorMessage)
      } else if (error.response?.status === 401) {
        throw new Error('Token de acesso inválido ou sem permissões')
      } else if (error.response?.status === 403) {
        throw new Error('Acesso negado - verifique as permissões do token')
      }
      
      throw new Error('Falha ao renomear repositório')
    }
  }

  async searchRepositories(query: string, page = 1, perPage = 30): Promise<{ items: GitHubRepository[], total_count: number }> {
    try {
      const response = await axios.get(`${this.baseURL}/search/repositories`, {
        headers: this.getHeaders(),
        params: {
          q: query,
          sort: 'updated',
          order: 'desc',
          page,
          per_page: perPage
        }
      })
      return response.data
    } catch (error) {
      console.error('Erro ao pesquisar repositórios:', error)
      throw new Error('Falha ao pesquisar repositórios')
    }
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/repos/${owner}/${repo}/contents/${path}`, {
        headers: this.getHeaders(),
        params: ref ? { ref } : {}
      })
      return response.data
    } catch (error) {
      console.error('Erro ao buscar conteúdo do arquivo:', error)
      throw new Error('Falha ao buscar conteúdo do arquivo')
    }
  }

  async updateFile(owner: string, repo: string, path: string, content: string, message: string, sha?: string): Promise<any> {
    try {
      const response = await axios.put(`${this.baseURL}/repos/${owner}/${repo}/contents/${path}`, {
        message,
        content: btoa(content), // Base64 encode
        sha
      }, {
        headers: this.getHeaders()
      })
      return response.data
    } catch (error) {
      console.error('Erro ao atualizar arquivo:', error)
      throw new Error('Falha ao atualizar arquivo')
    }
  }

  async testConnection(): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      if (!this.accessToken) {
        return {
          success: false,
          error: 'Token de acesso não configurado'
        }
      }

      const user = await this.getUser()
      return {
        success: true,
        user
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão GitHub:', error)
      
      let errorMessage = 'Falha ao conectar com GitHub'
      if (error.response?.status === 401) {
        errorMessage = 'Token de acesso inválido ou expirado'
      } else if (error.response?.status === 403) {
        errorMessage = 'Acesso negado - verifique as permissões do token'
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Erro de conexão - verifique sua internet'
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Valida o token atual e atualiza o cache se válido
   */
  async validateToken(): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    const result = await this.testConnection()
    
    if (result.success && this.accessToken) {
      // Atualiza o timestamp de validação no cache
      TokenCacheService.updateValidation()
    } else if (result.error?.includes('inválido') || result.error?.includes('expirado')) {
      // Remove token inválido do cache
      TokenCacheService.clearToken()
    }
    
    return result
  }

  /**
   * Inicializa o serviço com token do cache se disponível
   */
  async initializeFromCache(): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    const cachedToken = TokenCacheService.getToken()
    
    if (!cachedToken) {
      return {
        success: false,
        error: 'Nenhum token encontrado no cache'
      }
    }
    
    this.setAccessToken(cachedToken)
    
    // Verifica se precisa validar o token
    if (TokenCacheService.needsValidation()) {
      console.log('Validando token do cache...')
      return await this.validateToken()
    }
    
    // Token foi validado recentemente, assume que está válido
    try {
      const user = await this.getUser()
      return {
        success: true,
        user
      }
    } catch (error) {
      // Se falhar, força validação
      return await this.validateToken()
    }
  }

  /**
   * Salva o token no cache após autenticação bem-sucedida
   */
  async saveTokenToCache(token: string): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    this.setAccessToken(token)
    
    const result = await this.testConnection()
    
    if (result.success) {
      TokenCacheService.saveToken(token)
      console.log('Token salvo no cache com sucesso')
    }
    
    return result
  }

  /**
   * Remove token do cache e limpa a instância
   */
  clearTokenCache(): void {
    TokenCacheService.clearToken()
    this.accessToken = null
  }

  /**
   * Verifica se há token no cache
   */
  hasTokenInCache(): boolean {
    return TokenCacheService.hasToken()
  }
}

// Singleton instance
export const githubService = new GitHubService()
export default githubService

// Export types
export type { GitHubUser, GitHubRepository, GitHubCommit }