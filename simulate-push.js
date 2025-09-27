import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cores para logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[STEP ${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function executeCommand(command, cwd = process.cwd(), ignoreError = false) {
  try {
    log(`Executando: ${command}`, 'blue');
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    logSuccess(`Comando executado com sucesso`);
    if (result.trim()) {
      log(`Saída: ${result.trim()}`, 'magenta');
    }
    return { success: true, output: result.trim() };
  } catch (error) {
    if (ignoreError) {
      logWarning(`Comando falhou (ignorado): ${error.message}`);
      return { success: false, error: error.message, output: error.stdout || '' };
    } else {
      logError(`Comando falhou: ${error.message}`);
      return { success: false, error: error.message, output: error.stdout || '' };
    }
  }
}

function checkFileExists(filePath) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    logSuccess(`Arquivo encontrado: ${filePath}`);
  } else {
    logError(`Arquivo não encontrado: ${filePath}`);
  }
  return exists;
}

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    logSuccess(`Arquivo JSON lido com sucesso: ${filePath}`);
    return data;
  } catch (error) {
    logError(`Erro ao ler arquivo JSON ${filePath}: ${error.message}`);
    return null;
  }
}

function simulatePushProcess() {
  log('='.repeat(60), 'cyan');
  log('SIMULAÇÃO COMPLETA DO PROCESSO DE PUSH', 'cyan');
  log('='.repeat(60), 'cyan');

  const report = {
    steps: [],
    errors: [],
    warnings: [],
    success: false
  };

  // STEP 1: Verificar dados de configuração
  logStep(1, 'Verificando dados de configuração');
  
  const repoDataPath = path.join(__dirname, 'data', 'repositories.json');
  const syncDataPath = path.join(__dirname, 'data', 'sync-operations.json');
  
  if (!checkFileExists(repoDataPath) || !checkFileExists(syncDataPath)) {
    report.errors.push('Arquivos de configuração não encontrados');
    return report;
  }

  const repositories = readJsonFile(repoDataPath);
  const syncOperations = readJsonFile(syncDataPath);
  
  if (!repositories || !syncOperations) {
    report.errors.push('Erro ao ler arquivos de configuração');
    return report;
  }

  const repo = repositories[0]; // Usar o primeiro repositório
  const lastSync = syncOperations[syncOperations.length - 1]; // Última operação
  
  log(`Repositório: ${repo.name}`);
  log(`Caminho local: ${repo.local_path}`);
  log(`Última operação: ${lastSync.operation_name}`);
  log(`Status da última operação: ${lastSync.status}`);
  
  report.steps.push({
    step: 1,
    name: 'Verificação de configuração',
    status: 'success',
    data: { repo, lastSync }
  });

  // STEP 2: Verificar se é um repositório Git
  logStep(2, 'Verificando repositório Git');
  
  const gitDir = path.join(repo.local_path, '.git');
  const isGitRepo = fs.existsSync(gitDir);
  
  if (!isGitRepo) {
    logWarning('Não é um repositório Git. Inicializando...');
    const initResult = executeCommand('git init', repo.local_path);
    if (!initResult.success) {
      report.errors.push('Falha ao inicializar repositório Git');
      return report;
    }
  } else {
    logSuccess('Repositório Git encontrado');
  }
  
  report.steps.push({
    step: 2,
    name: 'Verificação Git',
    status: 'success',
    wasGitRepo: isGitRepo
  });

  // STEP 3: Verificar configuração do Git
  logStep(3, 'Verificando configuração do Git');
  
  const userNameResult = executeCommand('git config user.name', repo.local_path, true);
  const userEmailResult = executeCommand('git config user.email', repo.local_path, true);
  
  if (!userNameResult.success || !userNameResult.output) {
    logWarning('Configurando user.name do Git');
    executeCommand('git config user.name "GitHub Sync App"', repo.local_path);
  } else {
    logSuccess(`Git user.name: ${userNameResult.output}`);
  }
  
  if (!userEmailResult.success || !userEmailResult.output) {
    logWarning('Configurando user.email do Git');
    executeCommand('git config user.email "sync@github-app.local"', repo.local_path);
  } else {
    logSuccess(`Git user.email: ${userEmailResult.output}`);
  }
  
  report.steps.push({
    step: 3,
    name: 'Configuração Git',
    status: 'success',
    userName: userNameResult.output || 'GitHub Sync App',
    userEmail: userEmailResult.output || 'sync@github-app.local'
  });

  // STEP 4: Verificar remote origin
  logStep(4, 'Verificando remote origin');
  
  const remoteResult = executeCommand('git remote -v', repo.local_path, true);
  
  if (!remoteResult.success || !remoteResult.output.includes('origin')) {
    logWarning('Remote origin não configurado. Configurando...');
    const repoUrl = `https://github.com/Relfone/${repo.name}.git`;
    const addRemoteResult = executeCommand(`git remote add origin ${repoUrl}`, repo.local_path, true);
    
    if (!addRemoteResult.success) {
      logWarning('Tentando remover e adicionar remote novamente...');
      executeCommand('git remote remove origin', repo.local_path, true);
      executeCommand(`git remote add origin ${repoUrl}`, repo.local_path);
    }
    
    logSuccess(`Remote origin configurado: ${repoUrl}`);
  } else {
    logSuccess('Remote origin já configurado');
    log(`Remotes: ${remoteResult.output}`);
  }
  
  report.steps.push({
    step: 4,
    name: 'Configuração Remote',
    status: 'success',
    remotes: remoteResult.output || 'Configurado automaticamente'
  });

  // STEP 5: Verificar arquivos na pasta de origem
  logStep(5, 'Analisando arquivos na pasta de origem');
  
  const files = [];
  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item.startsWith('.') && item !== '.gitignore') continue;
      if (item === 'node_modules') continue;
      
      const fullPath = path.join(dir, item);
      const relPath = path.join(relativePath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, relPath);
      } else {
        files.push({
          path: relPath,
          size: stat.size,
          modified: stat.mtime
        });
      }
    }
  }
  
  scanDirectory(repo.local_path);
  
  log(`Encontrados ${files.length} arquivos para sincronização`);
  files.slice(0, 10).forEach(file => {
    log(`  - ${file.path} (${file.size} bytes)`);
  });
  
  if (files.length > 10) {
    log(`  ... e mais ${files.length - 10} arquivos`);
  }
  
  report.steps.push({
    step: 5,
    name: 'Análise de arquivos',
    status: 'success',
    fileCount: files.length,
    sampleFiles: files.slice(0, 5)
  });

  // STEP 6: Verificar status do Git
  logStep(6, 'Verificando status do Git');
  
  const statusResult = executeCommand('git status --porcelain', repo.local_path);
  
  if (statusResult.success) {
    const changes = statusResult.output.split('\n').filter(line => line.trim());
    log(`Mudanças detectadas: ${changes.length}`);
    changes.slice(0, 10).forEach(change => {
      log(`  ${change}`);
    });
  }
  
  report.steps.push({
    step: 6,
    name: 'Status Git',
    status: 'success',
    changes: statusResult.output ? statusResult.output.split('\n').length : 0
  });

  // STEP 7: Simular add e commit
  logStep(7, 'Simulando git add e commit');
  
  const addResult = executeCommand('git add .', repo.local_path);
  if (!addResult.success) {
    report.errors.push(`Erro no git add: ${addResult.error}`);
    return report;
  }
  
  const commitMessage = lastSync.options?.commitMessage || 'Simulação de push';
  const commitResult = executeCommand(`git commit -m "${commitMessage}"`, repo.local_path, true);
  
  if (commitResult.success) {
    logSuccess('Commit realizado com sucesso');
  } else if (commitResult.error.includes('nothing to commit')) {
    logWarning('Nenhuma mudança para commit');
  } else {
    logError(`Erro no commit: ${commitResult.error}`);
  }
  
  report.steps.push({
    step: 7,
    name: 'Git Add e Commit',
    status: commitResult.success ? 'success' : 'warning',
    message: commitMessage
  });

  // STEP 8: Verificar autenticação (simulada)
  logStep(8, 'Verificando autenticação GitHub');
  
  // Como não temos token real, vamos simular a verificação
  logWarning('Token do GitHub não encontrado nos dados locais');
  logWarning('Para o push funcionar, é necessário:');
  log('  1. Fazer login na aplicação web (http://localhost:5173)');
  log('  2. Autorizar a aplicação no GitHub');
  log('  3. Criar o repositório "test-repo" no GitHub');
  
  report.steps.push({
    step: 8,
    name: 'Verificação de autenticação',
    status: 'warning',
    issue: 'Token não encontrado'
  });

  // STEP 9: Simular push (sem token real)
  logStep(9, 'Simulando push para GitHub');
  
  logWarning('Simulando push sem token real...');
  const pushResult = executeCommand('git push origin main', repo.local_path, true);
  
  if (!pushResult.success) {
    logError(`Push falhou: ${pushResult.error}`);
    report.errors.push(`Push falhou: ${pushResult.error}`);
    
    // Analisar o tipo de erro
    if (pushResult.error.includes('does not appear to be a git repository')) {
      report.errors.push('DIAGNÓSTICO: Repositório remoto não existe no GitHub');
    } else if (pushResult.error.includes('Authentication failed')) {
      report.errors.push('DIAGNÓSTICO: Falha de autenticação - token inválido ou ausente');
    } else if (pushResult.error.includes('Permission denied')) {
      report.errors.push('DIAGNÓSTICO: Sem permissão para push - verificar token e permissões');
    }
  } else {
    logSuccess('Push realizado com sucesso!');
    report.success = true;
  }
  
  report.steps.push({
    step: 9,
    name: 'Push para GitHub',
    status: pushResult.success ? 'success' : 'error',
    error: pushResult.error
  });

  return report;
}

// Executar simulação
const report = simulatePushProcess();

// Gerar relatório final
log('\n' + '='.repeat(60), 'cyan');
log('RELATÓRIO FINAL DA SIMULAÇÃO', 'cyan');
log('='.repeat(60), 'cyan');

log(`\nSteps executados: ${report.steps.length}`);
log(`Erros encontrados: ${report.errors.length}`);
log(`Warnings: ${report.warnings.length}`);
log(`Sucesso geral: ${report.success ? 'SIM' : 'NÃO'}`, report.success ? 'green' : 'red');

if (report.errors.length > 0) {
  log('\nERROS IDENTIFICADOS:', 'red');
  report.errors.forEach((error, index) => {
    log(`${index + 1}. ${error}`, 'red');
  });
}

log('\nRECOMENDAÇÕES:', 'yellow');
log('1. Fazer login na aplicação web primeiro');
log('2. Criar o repositório "test-repo" no GitHub');
log('3. Verificar se o token do GitHub tem permissões adequadas');
log('4. Testar conectividade com GitHub');

// Salvar relatório
const reportPath = path.join(__dirname, 'simulation-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
log(`\nRelatório salvo em: ${reportPath}`, 'cyan');