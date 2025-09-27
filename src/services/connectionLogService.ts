interface ConnectionLog {
  timestamp?: string;
  username?: string;
  status: 'success' | 'error' | 'testing';
  apiStatus?: 'valid' | 'invalid' | 'expired';
  error?: string;
  type?: string;
  details?: any;
  userInfo?: {
    id: number;
    login: string;
    name: string;
    email: string;
    public_repos: number;
  };
}

class ConnectionLogService {
  private static readonly LOG_PREFIX = '[GATOHUB-GITHUB]';

  /**
   * Registra log de conexão no terminal e salva na aplicação
   */
  static async logConnection(log: ConnectionLog): Promise<void> {
    const timestamp = log.timestamp || new Date().toLocaleString('pt-BR');
    const logEntry = {
      ...log,
      timestamp,
      username: log.username || 'Sistema'
    };

    // Log no terminal com cores e formatação
    this.logToTerminal(logEntry);

    // Salvar no sistema de logs da aplicação
    await this.saveToAppLogs(logEntry);
  }

  /**
   * Registra log no terminal com formatação colorida
   */
  private static logToTerminal(log: ConnectionLog): void {
    const { timestamp, username, status, apiStatus, error, userInfo, type, details } = log;
    
    console.log(`\n${this.LOG_PREFIX} ==========================================`);
    console.log(`${this.LOG_PREFIX} ${type ? type.toUpperCase() : 'CONEXÃO GITHUB'} - ${timestamp}`);
    console.log(`${this.LOG_PREFIX} ==========================================`);
    
    if (status === 'success') {
      console.log(`${this.LOG_PREFIX} ✅ STATUS: ${type === 'repository_created' ? 'Repositório criado' : 'Conexão bem-sucedida'}`);
      console.log(`${this.LOG_PREFIX} 👤 USUÁRIO: ${username}`);
      
      if (details && type === 'repository_created') {
        console.log(`${this.LOG_PREFIX} 📁 REPOSITÓRIO: ${details.repository_name}`);
        console.log(`${this.LOG_PREFIX} 🔗 URL: ${details.repository_url}`);
        console.log(`${this.LOG_PREFIX} 🔒 PRIVADO: ${details.private ? 'Sim' : 'Não'}`);
      }
      
      if (userInfo) {
        console.log(`${this.LOG_PREFIX} 📊 ID: ${userInfo.id}`);
        console.log(`${this.LOG_PREFIX} 📧 EMAIL: ${userInfo.email || 'Não informado'}`);
        console.log(`${this.LOG_PREFIX} 📁 REPOSITÓRIOS PÚBLICOS: ${userInfo.public_repos}`);
      }
      
      if (apiStatus) {
        console.log(`${this.LOG_PREFIX} 🔑 API STATUS: ${apiStatus.toUpperCase()}`);
      }
    } else if (status === 'error') {
      console.log(`${this.LOG_PREFIX} ❌ STATUS: ${type === 'repository_created' ? 'Falha ao criar repositório' : 'Falha na conexão'}`);
      console.log(`${this.LOG_PREFIX} 👤 USUÁRIO: ${username || 'Desconhecido'}`);
      
      if (error) {
        console.log(`${this.LOG_PREFIX} 🚨 ERRO: ${error}`);
      }
      
      if (details && details.error) {
        console.log(`${this.LOG_PREFIX} 🚨 DETALHES: ${details.error}`);
      }
      
      if (apiStatus) {
        console.log(`${this.LOG_PREFIX} 🔑 API STATUS: ${apiStatus.toUpperCase()}`);
      }
    } else if (status === 'testing') {
      console.log(`${this.LOG_PREFIX} 🔄 STATUS: Testando conexão...`);
      console.log(`${this.LOG_PREFIX} 👤 USUÁRIO: ${username}`);
    }
    
    console.log(`${this.LOG_PREFIX} ==========================================\n`);
  }

  /**
   * Salva log no sistema de logs da aplicação
   */
  private static async saveToAppLogs(log: ConnectionLog): Promise<void> {
    try {
      // Importar dinamicamente para evitar dependência circular
      const { localStorageService } = await import('./localStorageService');
      
      const message = this.formatLogMessage(log);
      const level = log.status === 'success' ? 'info' : log.status === 'error' ? 'error' : 'info';
      
      await localStorageService.createLog({
        level,
        message,
        user_id: 'd2929b81-cb3f-47a1-b47b-6b0311964361' // Single user ID
      });
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erro ao salvar log na aplicação:`, error);
    }
  }

  /**
   * Formata mensagem do log para salvar na aplicação
   */
  private static formatLogMessage(log: ConnectionLog): string {
    const { username, status, apiStatus, error, userInfo } = log;
    
    let message = `GitHub Connection - User: ${username}, Status: ${status}`;
    
    if (apiStatus) {
      message += `, API: ${apiStatus}`;
    }
    
    if (userInfo) {
      message += `, Repos: ${userInfo.public_repos}`;
    }
    
    if (error) {
      message += `, Error: ${error}`;
    }
    
    return message;
  }

  /**
   * Testa conexão com a API do GitHub e registra resultado
   */
  static async testGitHubConnection(token: string): Promise<{
    success: boolean;
    userInfo?: any;
    error?: string;
  }> {
    try {
      // Log de início do teste
      await this.logConnection({
        timestamp: new Date().toISOString(),
        username: 'Testando...',
        status: 'testing'
      });

      // Importar serviço do GitHub (singleton)
      const { githubService } = await import('./githubService');
      githubService.setAccessToken(token);

      // Testar API
      const userInfo = await githubService.getUser();

      // Log de sucesso
      await this.logConnection({
        timestamp: new Date().toISOString(),
        username: userInfo.login,
        status: 'success',
        apiStatus: 'valid',
        userInfo: {
          id: userInfo.id,
          login: userInfo.login,
          name: userInfo.name,
          email: userInfo.email,
          public_repos: userInfo.public_repos
        }
      });

      return {
        success: true,
        userInfo
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Log de erro
      await this.logConnection({
        timestamp: new Date().toISOString(),
        username: 'Falha na autenticação',
        status: 'error',
        apiStatus: 'invalid',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Registra reconexão automática
   */
  static async logAutoReconnection(username: string, success: boolean, error?: string): Promise<void> {
    await this.logConnection({
      timestamp: new Date().toISOString(),
      username,
      status: success ? 'success' : 'error',
      apiStatus: success ? 'valid' : 'expired',
      error: error || (success ? undefined : 'Token expirado ou inválido')
    });
  }
}

export default ConnectionLogService;
export type { ConnectionLog };