// Browser-compatible storage service using localStorage

export interface User {
  id: string;
  github_username: string;
  github_token: string;
  avatar_url?: string;
  email?: string;
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  github_repo_id: string;
  local_path: string;
  sync_enabled: boolean;
  user_id: string;
  created_at: string;
}

export interface SyncOperation {
  id: string;
  repository_id: string;
  operation_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  options?: any;
  error_message?: string;
  created_at: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  user_id: string;
  created_at: string;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
  user_id: string;
  created_at: string;
}

class LocalStorageService {
  private storagePrefix = 'github_track_'

  constructor() {
    // Initialize storage if needed
    this.initializeStorage()
  }

  private initializeStorage(): void {
    // Ensure basic storage structure exists
    if (!this.getFromStorage('users')) {
      this.saveToStorage('users', [])
    }
    if (!this.getFromStorage('repositories')) {
      this.saveToStorage('repositories', [])
    }
    if (!this.getFromStorage('sync_operations')) {
      this.saveToStorage('sync_operations', [])
    }
    if (!this.getFromStorage('routines')) {
      this.saveToStorage('routines', [])
    }
    if (!this.getFromStorage('config')) {
      this.saveToStorage('config', {})
    }
  }

  private getStorageKey(entity: string): string {
    return `${this.storagePrefix}${entity}`
  }

  private getLogStorageKey(date: string): string {
    return `${this.storagePrefix}logs_${date}`
  }

  private getFromStorage<T>(key: string): T[] | null {
    try {
      const data = localStorage.getItem(this.getStorageKey(key))
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error)
      return null
    }
  }

  private saveToStorage<T>(key: string, data: T[] | T): void {
    try {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(data))
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error)
    }
  }

  private async readFromFile<T>(entity: string): Promise<T[]> {
    const data = this.getFromStorage<T>(entity)
    return data || []
  }

  private async writeToFile<T>(entity: string, data: T[]): Promise<void> {
    this.saveToStorage(entity, data)
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return await this.readFromFile<User>('users');
  }

  async getUser(id: string): Promise<User | null> {
    const users = await this.readFromFile<User>('users');
    return users.find(user => user.id === id) || null;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const users = await this.getUsers();
    const newUser: User = {
      ...user,
      id: crypto.randomUUID()
    };
    users.push(newUser);
    await this.writeToFile('users', users);
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...updates };
    await this.writeToFile('users', users);
    return users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    users.splice(index, 1);
    await this.writeToFile('users', users);
    return true;
  }

  // Repository operations
  async getRepositories(userId: string): Promise<Repository[]> {
    const repositories = await this.readFromFile<Repository>('repositories');
    return repositories.filter(repo => repo.user_id === userId);
  }

  async getRepository(id: string): Promise<Repository | null> {
    const repositories = await this.readFromFile<Repository>('repositories');
    return repositories.find(repo => repo.id === id) || null;
  }

  async createRepository(repository: Omit<Repository, 'id' | 'created_at'>): Promise<Repository> {
    const repositories = await this.readFromFile<Repository>('repositories');
    const newRepository: Repository = {
      ...repository,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    repositories.push(newRepository);
    await this.writeToFile('repositories', repositories);
    return newRepository;
  }

  async updateRepository(id: string, updates: Partial<Repository>): Promise<Repository | null> {
    const repositories = await this.readFromFile<Repository>('repositories');
    const index = repositories.findIndex(repo => repo.id === id);
    if (index === -1) return null;
    
    repositories[index] = { ...repositories[index], ...updates };
    await this.writeToFile('repositories', repositories);
    return repositories[index];
  }

  async deleteRepository(id: string): Promise<boolean> {
    const repositories = await this.readFromFile<Repository>('repositories');
    const index = repositories.findIndex(repo => repo.id === id);
    if (index === -1) return false;
    
    repositories.splice(index, 1);
    await this.writeToFile('repositories', repositories);
    return true;
  }

  // Sync operations
  async getSyncOperations(repositoryId?: string): Promise<SyncOperation[]> {
    const operations = await this.readFromFile<SyncOperation>('sync_operations');
    return repositoryId 
      ? operations.filter(op => op.repository_id === repositoryId)
      : operations;
  }

  async getSyncOperation(id: string): Promise<SyncOperation | null> {
    const operations = await this.readFromFile<SyncOperation>('sync_operations');
    return operations.find(op => op.id === id) || null;
  }

  async createSyncOperation(operation: Omit<SyncOperation, 'id' | 'created_at'>): Promise<SyncOperation> {
    const operations = await this.readFromFile<SyncOperation>('sync_operations');
    const newOperation: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    operations.push(newOperation);
    await this.writeToFile('sync_operations', operations);
    return newOperation;
  }

  async updateSyncOperation(id: string, updates: Partial<SyncOperation>): Promise<SyncOperation | null> {
    const operations = await this.readFromFile<SyncOperation>('sync_operations');
    const index = operations.findIndex(op => op.id === id);
    if (index === -1) return null;
    
    operations[index] = { ...operations[index], ...updates };
    await this.writeToFile('sync_operations', operations);
    return operations[index];
  }

  // Routine operations
  async getRoutines(userId: string): Promise<Routine[]> {
    const routines = await this.readFromFile<Routine>('routines');
    return routines.filter(routine => routine.user_id === userId);
  }

  async getRoutine(id: string): Promise<Routine | null> {
    const routines = await this.readFromFile<Routine>('routines');
    return routines.find(routine => routine.id === id) || null;
  }

  async createRoutine(routine: Omit<Routine, 'id' | 'created_at'>): Promise<Routine> {
    const routines = await this.readFromFile<Routine>('routines');
    const newRoutine: Routine = {
      ...routine,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    routines.push(newRoutine);
    await this.writeToFile('routines', routines);
    return newRoutine;
  }

  async updateRoutine(id: string, updates: Partial<Routine>): Promise<Routine | null> {
    const routines = await this.readFromFile<Routine>('routines');
    const index = routines.findIndex(routine => routine.id === id);
    if (index === -1) return null;
    
    routines[index] = { ...routines[index], ...updates };
    await this.writeToFile('routines', routines);
    return routines[index];
  }

  async deleteRoutine(id: string): Promise<boolean> {
    const routines = await this.readFromFile<Routine>('routines');
    const index = routines.findIndex(routine => routine.id === id);
    if (index === -1) return false;
    
    routines.splice(index, 1);
    await this.writeToFile('routines', routines);
    return true;
  }

  // Log operations
  async createLog(log: Omit<LogEntry, 'id' | 'created_at'>): Promise<LogEntry> {
    const logEntry: LogEntry = {
      ...log,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };

    const today = new Date().toISOString().split('T')[0];
    const logKey = `logs_${today}`;
    const logs = this.getFromStorage<LogEntry>(logKey) || [];
    logs.push(logEntry);
    
    // Keep only last 1000 log entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    this.saveToStorage(logKey, logs);
    return logEntry;
  }

  async getLogs(userId: string, limit: number = 100): Promise<LogEntry[]> {
    const today = new Date().toISOString().split('T')[0];
    const logKey = `logs_${today}`;
    const logs = this.getFromStorage<LogEntry>(logKey) || [];
    return logs
      .filter(log => log.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // Configuration
  async getConfig(key: string): Promise<any> {
    try {
      const config = this.getFromStorage<Record<string, any>>('config') || [{}];
      return config[0]?.[key] || null;
    } catch (error) {
      console.error('Error reading config:', error);
      return null;
    }
  }

  async setConfig(key: string, value: any): Promise<void> {
    try {
      const configArray = this.getFromStorage<Record<string, any>>('config') || [{}];
      const config = configArray[0] || {};
      config[key] = value;
      this.saveToStorage('config', [config]);
    } catch (error) {
      console.error('Error writing config:', error);
    }
  }

  async log(category: string, message: string, metadata?: any): Promise<void> {
    await this.createLog({
      level: 'info',
      message,
      metadata: { category, ...metadata },
      user_id: 'system'
    });
  }
}

export const localStorageService = new LocalStorageService();
export default localStorageService;