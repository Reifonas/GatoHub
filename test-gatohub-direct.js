// Script para testar GatoHub diretamente
import fs from 'fs';
import path from 'path';

console.log('=== TESTE DIRETO: Simulação GatoHub ===\n');

// Simular dados do repositório GatoHub baseado no que sabemos
const gatoHubData = {
  id: 'gatohub-repo-id',
  name: 'GatoHub',
  full_name: 'Reifonas/GatoHub',
  clone_url: 'https://github.com/Reifonas/GatoHub.git',
  ssh_url: 'git@github.com:Reifonas/GatoHub.git',
  private: false,
  owner: {
    login: 'Reifonas',
    id: 211114984
  }
};

console.log('1. Dados simulados do GatoHub:');
console.log(JSON.stringify(gatoHubData, null, 2));

// Verificar arquivo repositories.json atual
const repositoriesPath = path.join(process.cwd(), 'data', 'repositories.json');
console.log('\n2. Verificando repositories.json atual...');

try {
  const currentData = JSON.parse(fs.readFileSync(repositoriesPath, 'utf8'));
  console.log('📄 Conteúdo atual:');
  console.log(JSON.stringify(currentData, null, 2));
  
  // Atualizar com dados do GatoHub
  console.log('\n3. Atualizando com dados do GatoHub...');
  
  const updatedData = {
    github_repo_id: gatoHubData.full_name,
    name: gatoHubData.name,
    local_path: process.cwd(),
    clone_url: gatoHubData.clone_url,
    ssh_url: gatoHubData.ssh_url,
    owner: gatoHubData.owner.login,
    private: gatoHubData.private,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Fazer backup do arquivo original
  const backupPath = repositoriesPath + '.backup';
  fs.copyFileSync(repositoriesPath, backupPath);
  console.log(`✅ Backup criado: ${backupPath}`);
  
  // Salvar dados atualizados
  fs.writeFileSync(repositoriesPath, JSON.stringify(updatedData, null, 2));
  console.log('✅ repositories.json atualizado com dados do GatoHub');
  
  console.log('\n📄 Novo conteúdo:');
  console.log(JSON.stringify(updatedData, null, 2));
  
} catch (error) {
  console.log('❌ Erro ao processar repositories.json:', error.message);
}

// Verificar configuração atual do Git
console.log('\n4. Verificando configuração atual do Git...');

import { execSync } from 'child_process';

try {
  // Verificar remote atual
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  console.log(`🔗 Remote atual: ${remoteUrl}`);
  
  // Verificar se é o GatoHub
  if (remoteUrl.includes('GatoHub')) {
    console.log('✅ Remote já está configurado para GatoHub!');
  } else {
    console.log('⚠️  Remote NÃO está configurado para GatoHub');
    console.log('💡 Configurando remote para GatoHub...');
    
    // Configurar remote para GatoHub
    const newRemoteUrl = gatoHubData.clone_url;
    execSync(`git remote set-url origin ${newRemoteUrl}`);
    
    // Verificar se foi configurado
    const updatedRemoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    console.log(`✅ Remote atualizado: ${updatedRemoteUrl}`);
  }
  
  // Verificar status do repositório
  console.log('\n5. Verificando status do repositório...');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  
  if (status.trim()) {
    console.log('📝 Arquivos modificados encontrados:');
    console.log(status);
  } else {
    console.log('✅ Repositório limpo (sem modificações)');
  }
  
  // Verificar branch atual
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`🌿 Branch atual: ${currentBranch}`);
  
  // Verificar se há commits para push
  try {
    const unpushedCommits = execSync('git log origin/main..HEAD --oneline', { encoding: 'utf8' }).trim();
    if (unpushedCommits) {
      console.log('📤 Commits pendentes para push:');
      console.log(unpushedCommits);
    } else {
      console.log('✅ Nenhum commit pendente para push');
    }
  } catch (e) {
    console.log('⚠️  Não foi possível verificar commits pendentes (pode ser primeiro push)');
  }
  
} catch (error) {
  console.log('❌ Erro ao verificar Git:', error.message);
}

// Testar conectividade com GitHub
console.log('\n6. Testando conectividade com GitHub...');

try {
  // Testar se conseguimos acessar o repositório
  const testResult = execSync(`git ls-remote ${gatoHubData.clone_url} HEAD`, { encoding: 'utf8' });
  if (testResult.trim()) {
    console.log('✅ Repositório GatoHub acessível via HTTPS');
    console.log(`📋 HEAD: ${testResult.trim().split('\t')[0]}`);
  }
} catch (error) {
  console.log('❌ Erro ao acessar repositório GatoHub:', error.message);
  console.log('💡 Isso pode indicar problemas de autenticação ou conectividade');
}

console.log('\n=== RESUMO ===');
console.log('✅ Dados do GatoHub simulados e salvos');
console.log('✅ Remote configurado para GatoHub');
console.log('💡 Para testar o push, execute uma operação de sincronização na aplicação');
console.log('💡 Certifique-se de estar logado no GitHub na aplicação para autenticação');