import { execSync } from 'child_process';
import https from 'https';
import fs from 'fs';
import path from 'path';

const repoPath = process.cwd();
const dataPath = path.join(repoPath, 'data');
const reposPath = path.join(dataPath, 'repositories.json');

console.log('=== Criando Repositório no GitHub ===\n');

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

const repo = repos[0];
console.log(`📁 Repositório: ${repo.name}`);

// Para criar o repositório, precisamos de um token do GitHub
// Como não temos token configurado, vamos mostrar as instruções
console.log('\n🔑 Token do GitHub necessário para criar o repositório');
console.log('\n📋 Instruções para configurar:');
console.log('1. Acesse a aplicação web em http://localhost:5173');
console.log('2. Clique em "Login with GitHub"');
console.log('3. Autorize a aplicação no GitHub');
console.log('4. Volte para a aplicação e configure o repositório');

console.log('\n🛠️ Alternativa manual:');
console.log('1. Acesse https://github.com/new');
console.log(`2. Crie um repositório chamado "${repo.name}"`);
console.log('3. Deixe como público ou privado conforme preferir');
console.log('4. NÃO inicialize com README, .gitignore ou licença');
console.log('5. Clique em "Create repository"');

console.log('\n🔄 Após criar o repositório:');
console.log('1. Configure o token na aplicação web');
console.log('2. Execute o push através da aplicação');

// Verificar se temos arquivos para fazer commit
try {
  const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' });
  if (status.trim()) {
    const fileCount = status.trim().split('\n').length;
    console.log(`\n📝 ${fileCount} arquivos prontos para commit`);
    console.log('\n🚀 Comandos para push manual (após configurar token):');
    console.log('git add .');
    console.log('git commit -m "Initial commit"');
    console.log('git push -u origin main');
  }
} catch (error) {
  console.log('❌ Erro ao verificar status:', error.message);
}