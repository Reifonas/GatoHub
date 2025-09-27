import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const repoPath = process.cwd();
const dataPath = path.join(repoPath, 'data');
const reposPath = path.join(dataPath, 'repositories.json');

console.log('=== Configurando Remote do Git ===\n');

// Ler configuração do repositório
if (!fs.existsSync(reposPath)) {
  console.log('❌ Arquivo repositories.json não encontrado');
  process.exit(1);
}

let repos;
try {
  repos = JSON.parse(fs.readFileSync(reposPath, 'utf8'));
} catch (error) {
  console.log('❌ Erro ao ler repositories.json:', error.message);
  process.exit(1);
}

if (repos.length === 0) {
  console.log('❌ Nenhum repositório configurado');
  process.exit(1);
}

const repo = repos[0]; // Usar o primeiro repositório
console.log(`📁 Repositório: ${repo.name}`);
console.log(`📂 Caminho local: ${repo.local_path}`);

// Construir URL do GitHub
// O github_repo_id pode ser o nome do repo ou o ID numérico
// Vamos assumir que é o nome do repositório no formato "owner/repo"
let githubUrl;
if (repo.name.includes('/')) {
  // Formato: owner/repo
  githubUrl = `https://github.com/${repo.name}.git`;
} else {
  // Apenas o nome do repo, assumir que o owner é o usuário atual
  const gitUser = execSync('git config user.name', { cwd: repoPath, encoding: 'utf8' }).trim();
  githubUrl = `https://github.com/${gitUser}/${repo.name}.git`;
}

console.log(`🔗 URL do GitHub: ${githubUrl}`);

// Verificar se já existe um remote origin
try {
  const remotes = execSync('git remote -v', { cwd: repoPath, encoding: 'utf8' });
  if (remotes.includes('origin')) {
    console.log('🔄 Atualizando remote origin existente...');
    execSync(`git remote set-url origin "${githubUrl}"`, { cwd: repoPath });
  } else {
    console.log('➕ Adicionando novo remote origin...');
    execSync(`git remote add origin "${githubUrl}"`, { cwd: repoPath });
  }
} catch (error) {
  console.log('➕ Adicionando novo remote origin...');
  try {
    execSync(`git remote add origin "${githubUrl}"`, { cwd: repoPath });
  } catch (addError) {
    console.log('❌ Erro ao adicionar remote:', addError.message);
    process.exit(1);
  }
}

// Verificar se o remote foi configurado corretamente
try {
  const remotes = execSync('git remote -v', { cwd: repoPath, encoding: 'utf8' });
  console.log('✅ Remote configurado com sucesso:');
  console.log(remotes);
} catch (error) {
  console.log('❌ Erro ao verificar remote:', error.message);
}

// Verificar se o repositório existe no GitHub
console.log('\n🔍 Verificando se o repositório existe no GitHub...');
try {
  // Tentar fazer um fetch para verificar se o repositório existe
  execSync('git ls-remote origin', { cwd: repoPath, stdio: 'pipe' });
  console.log('✅ Repositório encontrado no GitHub');
} catch (error) {
  console.log('❌ Repositório não encontrado no GitHub ou sem acesso');
  console.log('💡 Certifique-se de que:');
  console.log('   1. O repositório existe no GitHub');
  console.log('   2. Você tem acesso ao repositório');
  console.log('   3. O token do GitHub está configurado corretamente');
}

console.log('\n=== Configuração Concluída ===');
console.log('Próximo passo: Configurar token do GitHub na aplicação');