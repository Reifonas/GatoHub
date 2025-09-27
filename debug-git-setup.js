import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const repoPath = process.cwd();

console.log('=== DEBUG: Configuração do Git e GitHub ===\n');

// 1. Verificar se é um repositório Git
try {
  const gitStatus = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' });
  console.log('✅ Repositório Git válido');
  console.log(`📁 Caminho: ${repoPath}`);
  
  if (gitStatus.trim()) {
    console.log(`📝 Arquivos modificados encontrados: ${gitStatus.trim().split('\n').length}`);
  } else {
    console.log('📝 Nenhum arquivo modificado');
  }
} catch (error) {
  console.log('❌ Erro no repositório Git:', error.message);
}

// 2. Verificar remote origin
try {
  const remotes = execSync('git remote -v', { cwd: repoPath, encoding: 'utf8' });
  if (remotes.trim()) {
    console.log('✅ Remote configurado:');
    console.log(remotes);
  } else {
    console.log('❌ Nenhum remote configurado');
  }
} catch (error) {
  console.log('❌ Erro ao verificar remotes:', error.message);
}

// 3. Verificar configuração do usuário Git
try {
  const userName = execSync('git config user.name', { cwd: repoPath, encoding: 'utf8' }).trim();
  const userEmail = execSync('git config user.email', { cwd: repoPath, encoding: 'utf8' }).trim();
  console.log(`👤 Usuário Git: ${userName} <${userEmail}>`);
} catch (error) {
  console.log('❌ Configuração de usuário Git não encontrada');
}

// 4. Verificar arquivos de dados
const dataPath = path.join(repoPath, 'data');
const authPath = path.join(dataPath, 'auth');
const tokensPath = path.join(authPath, 'tokens.json');
const reposPath = path.join(dataPath, 'repositories.json');

console.log('\n=== Verificação de Dados ===');
console.log(`📂 Diretório data existe: ${fs.existsSync(dataPath)}`);
console.log(`📂 Diretório auth existe: ${fs.existsSync(authPath)}`);
console.log(`📄 Arquivo tokens.json existe: ${fs.existsSync(tokensPath)}`);
console.log(`📄 Arquivo repositories.json existe: ${fs.existsSync(reposPath)}`);

if (fs.existsSync(reposPath)) {
  try {
    const repos = JSON.parse(fs.readFileSync(reposPath, 'utf8'));
    console.log(`📊 Repositórios configurados: ${repos.length}`);
    repos.forEach((repo, index) => {
      console.log(`  ${index + 1}. ${repo.name} (${repo.local_path})`);
    });
  } catch (error) {
    console.log('❌ Erro ao ler repositories.json:', error.message);
  }
}

if (fs.existsSync(tokensPath)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const tokenCount = Object.keys(tokens).length;
    console.log(`🔑 Tokens salvos: ${tokenCount}`);
    
    Object.entries(tokens).forEach(([userId, tokenData]) => {
      const hasGithubToken = !!tokenData.github_token;
      const isExpired = tokenData.expiresAt ? new Date(tokenData.expiresAt) < new Date() : false;
      console.log(`  User ${userId}: GitHub token = ${hasGithubToken}, Expirado = ${isExpired}`);
    });
  } catch (error) {
    console.log('❌ Erro ao ler tokens.json:', error.message);
  }
} else {
  console.log('❌ Nenhum token encontrado - usuário precisa fazer login');
}

console.log('\n=== Próximos Passos ===');
console.log('1. Fazer login na aplicação web');
console.log('2. Conectar conta do GitHub');
console.log('3. Configurar repositório remoto');
console.log('4. Testar operação de push');