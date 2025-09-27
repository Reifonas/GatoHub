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

function checkAndCreateRepo() {
  log('='.repeat(60), 'cyan');
  log('VERIFICAÇÃO E CRIAÇÃO DE REPOSITÓRIO NO GITHUB', 'cyan');
  log('='.repeat(60), 'cyan');

  // STEP 1: Ler configuração do repositório
  logStep(1, 'Lendo configuração do repositório');
  
  const repoDataPath = path.join(__dirname, 'data', 'repositories.json');
  const repositories = JSON.parse(fs.readFileSync(repoDataPath, 'utf8'));
  const repo = repositories[0];
  
  log(`Repositório: ${repo.name}`);
  log(`Usuário GitHub: Reifonas`);
  log(`URL esperada: https://github.com/Reifonas/${repo.name}`);

  // STEP 2: Verificar se o repositório existe no GitHub
  logStep(2, 'Verificando se o repositório existe no GitHub');
  
  const checkRepoResult = executeCommand(`curl -s -o /dev/null -w "%{http_code}" https://github.com/Reifonas/${repo.name}`, __dirname, true);
  
  if (checkRepoResult.success && checkRepoResult.output === '200') {
    logSuccess('Repositório existe no GitHub!');
    return true;
  } else {
    logWarning('Repositório não encontrado no GitHub');
  }

  // STEP 3: Instruções para criar o repositório
  logStep(3, 'Instruções para criar o repositório');
  
  log('\nPara resolver o problema, você precisa:', 'yellow');
  log('\n1. CRIAR O REPOSITÓRIO NO GITHUB:', 'cyan');
  log('   - Acesse: https://github.com/new');
  log(`   - Nome do repositório: ${repo.name}`);
  log('   - Deixe como público ou privado (sua escolha)');
  log('   - NÃO inicialize com README, .gitignore ou licença');
  log('   - Clique em "Create repository"');
  
  log('\n2. FAZER LOGIN NA APLICAÇÃO:', 'cyan');
  log('   - Acesse: http://localhost:5173');
  log('   - Clique em "Login with GitHub"');
  log('   - Autorize a aplicação');
  
  log('\n3. TESTAR O PUSH:', 'cyan');
  log('   - Volte para a aplicação');
  log('   - Vá para a seção de sincronização');
  log('   - Execute um push');
  
  log('\nALTERNATIVAMENTE, você pode criar via linha de comando:', 'yellow');
  log('\nUsando GitHub CLI (se instalado):');
  log(`gh repo create ${repo.name} --public --source=. --remote=origin --push`);
  
  log('\nOu usando curl (com token pessoal):');
  log(`curl -H "Authorization: token YOUR_GITHUB_TOKEN" \\`);
  log(`     -d '{"name":"${repo.name}","private":false}' \\`);
  log(`     https://api.github.com/user/repos`);

  // STEP 4: Verificar configuração atual do Git
  logStep(4, 'Verificando configuração atual do Git');
  
  const remoteResult = executeCommand('git remote -v', repo.local_path, true);
  if (remoteResult.success) {
    log('Remotes configurados:');
    log(remoteResult.output);
  }
  
  const statusResult = executeCommand('git status', repo.local_path, true);
  if (statusResult.success) {
    log('Status do Git:');
    log(statusResult.output.split('\n').slice(0, 5).join('\n'));
  }

  return false;
}

// Executar verificação
const repoExists = checkAndCreateRepo();

if (!repoExists) {
  log('\n' + '='.repeat(60), 'red');
  log('AÇÃO NECESSÁRIA: CRIAR REPOSITÓRIO NO GITHUB', 'red');
  log('='.repeat(60), 'red');
  log('\nO push não funcionará até que o repositório seja criado no GitHub.', 'yellow');
  log('Siga as instruções acima para resolver o problema.', 'yellow');
} else {
  log('\n' + '='.repeat(60), 'green');
  log('REPOSITÓRIO ENCONTRADO - PUSH DEVE FUNCIONAR', 'green');
  log('='.repeat(60), 'green');
}