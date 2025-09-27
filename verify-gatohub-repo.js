// Script para verificar se o repositório GatoHub existe no GitHub
import https from 'https';
import { execSync } from 'child_process';

console.log('=== VERIFICAÇÃO: Repositório GatoHub no GitHub ===\n');

// Função para fazer requisições à API do GitHub
function makeGitHubRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': token ? `token ${token}` : '',
        'User-Agent': 'GitHub-Track-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Função para extrair o nome de usuário do remote atual
function extractUsernameFromRemote(remoteUrl) {
  const match = remoteUrl.match(/github\.com[:\/]([^\/]+)\//); 
  return match ? match[1] : null;
}

async function verifyGatoHubRepo() {
  try {
    console.log('1. Analisando configuração Git atual...');
    
    let currentRemote, currentBranch, username;
    
    try {
      currentRemote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      username = extractUsernameFromRemote(currentRemote);
      
      console.log(`🔗 Remote atual: ${currentRemote}`);
      console.log(`🌿 Branch atual: ${currentBranch}`);
      console.log(`👤 Usuário extraído: ${username || 'Não identificado'}`);
      
    } catch (error) {
      console.log('❌ Erro ao obter informações do Git:', error.message);
      return;
    }
    
    if (!username) {
      console.log('❌ Não foi possível extrair o nome de usuário do remote atual');
      console.log('💡 Verifique se o remote está configurado corretamente');
      return;
    }
    
    console.log('\n2. Verificando se o repositório GatoHub existe...');
    
    // Tentar acessar o repositório GatoHub sem token (público)
    try {
      const repoEndpoint = `/repos/${username}/GatoHub`;
      console.log(`🔍 Verificando: https://api.github.com${repoEndpoint}`);
      
      const response = await makeGitHubRequest(repoEndpoint);
      
      if (response.status === 200) {
        const repo = response.data;
        console.log('✅ Repositório GatoHub encontrado!');
        console.log(`   - Nome completo: ${repo.full_name}`);
        console.log(`   - Descrição: ${repo.description || 'Sem descrição'}`);
        console.log(`   - Privado: ${repo.private ? 'Sim' : 'Não'}`);
        console.log(`   - Branch padrão: ${repo.default_branch}`);
        console.log(`   - Clone URL (HTTPS): ${repo.clone_url}`);
        console.log(`   - Clone URL (SSH): ${repo.ssh_url}`);
        console.log(`   - Criado em: ${new Date(repo.created_at).toLocaleString()}`);
        console.log(`   - Última atualização: ${new Date(repo.updated_at).toLocaleString()}`);
        
        console.log('\n3. Comparando com configuração atual...');
        const expectedHttpsUrl = repo.clone_url;
        const expectedSshUrl = repo.ssh_url;
        
        if (currentRemote === expectedHttpsUrl || currentRemote === expectedSshUrl) {
          console.log('✅ Remote já está configurado corretamente para GatoHub!');
        } else {
          console.log('⚠️  Remote atual não corresponde ao repositório GatoHub:');
          console.log(`   Atual: ${currentRemote}`);
          console.log(`   Esperado (HTTPS): ${expectedHttpsUrl}`);
          console.log(`   Esperado (SSH): ${expectedSshUrl}`);
          
          console.log('\n🔧 Para corrigir, execute um dos comandos:');
          console.log(`   git remote set-url origin ${expectedHttpsUrl}`);
          console.log(`   # ou`);
          console.log(`   git remote set-url origin ${expectedSshUrl}`);
        }
        
        console.log('\n4. Verificando branches...');
        try {
          const branchesResponse = await makeGitHubRequest(`/repos/${username}/GatoHub/branches`);
          if (branchesResponse.status === 200) {
            const branches = branchesResponse.data;
            console.log(`📋 Branches disponíveis (${branches.length}):`);
            branches.forEach(branch => {
              const isDefault = branch.name === repo.default_branch ? ' (padrão)' : '';
              console.log(`   - ${branch.name}${isDefault}`);
            });
            
            if (currentBranch && !branches.find(b => b.name === currentBranch)) {
              console.log(`⚠️  Branch local '${currentBranch}' não existe no repositório remoto`);
              console.log(`💡 Considere usar a branch padrão: ${repo.default_branch}`);
            }
          }
        } catch (error) {
          console.log('⚠️  Não foi possível verificar branches (pode ser repositório privado)');
        }
        
        console.log('\n✅ DIAGNÓSTICO COMPLETO:');
        console.log('   - Repositório GatoHub existe no GitHub');
        console.log('   - Configuração Git local está funcional');
        console.log('   - URLs de clone estão disponíveis');
        
        if (repo.private) {
          console.log('\n🔐 ATENÇÃO: Repositório é PRIVADO');
          console.log('   - Você precisa estar autenticado para fazer push');
          console.log('   - Verifique se está logado na aplicação web');
          console.log('   - Confirme se tem permissões de escrita');
        }
        
      } else if (response.status === 404) {
        console.log('❌ Repositório GatoHub NÃO encontrado!');
        console.log(`   - Usuário: ${username}`);
        console.log(`   - Repositório: GatoHub`);
        console.log(`   - URL verificada: https://github.com/${username}/GatoHub`);
        
        console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
        console.log('   1. Criar o repositório GatoHub no GitHub');
        console.log('   2. Verificar se o nome está correto (case-sensitive)');
        console.log('   3. Confirmar se você é o dono do repositório');
        console.log('   4. Verificar se o repositório não foi renomeado ou deletado');
        
        // Tentar listar repositórios públicos do usuário
        console.log('\n🔍 Verificando outros repositórios do usuário...');
        try {
          const userReposResponse = await makeGitHubRequest(`/users/${username}/repos?per_page=10`);
          if (userReposResponse.status === 200 && userReposResponse.data.length > 0) {
            console.log('📦 Repositórios públicos encontrados:');
            userReposResponse.data.forEach((repo, index) => {
              console.log(`   ${index + 1}. ${repo.name}`);
            });
          } else {
            console.log('   Nenhum repositório público encontrado');
          }
        } catch (error) {
          console.log('   Erro ao buscar outros repositórios');
        }
        
      } else if (response.status === 403) {
        console.log('❌ Acesso negado ao repositório GatoHub');
        console.log('   - O repositório pode ser privado');
        console.log('   - Você pode não ter permissões de acesso');
        console.log('   - Token de autenticação pode estar ausente ou inválido');
        
      } else {
        console.log(`❌ Erro inesperado: HTTP ${response.status}`);
        console.log('Resposta:', response.data);
      }
      
    } catch (error) {
      console.log('❌ Erro ao verificar repositório:', error.message);
    }
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('   1. Se o repositório existe: configure o remote corretamente');
    console.log('   2. Se o repositório não existe: crie-o no GitHub primeiro');
    console.log('   3. Faça login na aplicação web para autenticação');
    console.log('   4. Teste o push pela interface da aplicação');
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
  }
}

// Executar a verificação
verifyGatoHubRepo().then(() => {
  console.log('\n=== Verificação Concluída ===');
}).catch(error => {
  console.error('Erro fatal:', error);
});