import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== TESTE: Verificação do Repositório GatoHub ===\n');

// Função para fazer requisições à API do GitHub
function makeGitHubRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
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
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Erro ao parsear JSON: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testGatoHubRepository() {
  try {
    // 1. Verificar se há token de acesso
    console.log('1. Verificando token de acesso...');
    let accessToken = null;
    
    // Verificar se há token em arquivos de dados
    const dataPath = path.join(process.cwd(), 'data');
    const authPath = path.join(dataPath, 'auth');
    const tokensPath = path.join(authPath, 'tokens.json');
    
    if (fs.existsSync(tokensPath)) {
      const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
      console.log('📄 Dados de tokens encontrados:', Object.keys(tokensData));
      
      // Tentar usar o primeiro token disponível
      const firstUser = Object.keys(tokensData)[0];
      if (firstUser && tokensData[firstUser].access_token) {
        console.log('🔑 Usando token do usuário:', firstUser);
        accessToken = tokensData[firstUser].access_token;
      } else {
        throw new Error('Nenhum token válido encontrado');
      }
    } else {
      throw new Error('Arquivo de tokens não encontrado');
    }
    
    if (!accessToken) {
      throw new Error('Nenhum token de acesso disponível');
    }
    
    // 2. Buscar todos os repositórios do usuário
    console.log('\n2. Buscando repositórios do usuário...');
    const repositories = await makeGitHubRequest('/user/repos?per_page=100', accessToken);
    
    if (Array.isArray(repositories)) {
      console.log(`📦 Total de repositórios encontrados: ${repositories.length}`);
      console.log('📋 Lista de repositórios:');
      repositories.forEach((repo, index) => {
        console.log(`   ${index + 1}. ${repo.name} (${repo.full_name})`);
      });
      
      // 3. Verificar especificamente o repositório GatoHub
      console.log('\n3. Verificando repositório GatoHub...');
      const gatoHubRepo = repositories.find(repo => repo.name === 'GatoHub');
      
      if (gatoHubRepo) {
        console.log('✅ Repositório GatoHub encontrado!');
        console.log('📊 Detalhes do repositório:');
        console.log(`   - Nome: ${gatoHubRepo.name}`);
        console.log(`   - Nome completo: ${gatoHubRepo.full_name}`);
        console.log(`   - URL: ${gatoHubRepo.html_url}`);
        console.log(`   - Clone URL: ${gatoHubRepo.clone_url}`);
        console.log(`   - SSH URL: ${gatoHubRepo.ssh_url}`);
        console.log(`   - Privado: ${gatoHubRepo.private ? 'Sim' : 'Não'}`);
        console.log(`   - Branch padrão: ${gatoHubRepo.default_branch}`);
        
        // 4. Testar acesso direto ao repositório
        console.log('\n4. Testando acesso direto ao repositório...');
        try {
          const repoDetails = await makeGitHubRequest(`/repos/${gatoHubRepo.full_name}`, accessToken);
          console.log('✅ Acesso direto ao repositório bem-sucedido');
          
          // 5. Verificar branches
          console.log('\n5. Verificando branches...');
          const branches = await makeGitHubRequest(`/repos/${gatoHubRepo.full_name}/branches`, accessToken);
          if (Array.isArray(branches)) {
            console.log(`🌿 Branches encontrados: ${branches.length}`);
            branches.forEach(branch => {
              console.log(`   - ${branch.name}`);
            });
          }
          
        } catch (error) {
          console.log('❌ Erro ao acessar repositório diretamente:', error.message);
        }
        
      } else {
        console.log('❌ Repositório GatoHub NÃO encontrado!');
        console.log('💡 Repositórios disponíveis:');
        repositories.slice(0, 10).forEach(repo => {
          console.log(`   - ${repo.name}`);
        });
      }
    } else {
      console.log('❌ Erro: Resposta da API não é um array:', repositories);
    }
    
    // 6. Verificar configuração atual do repositório local
    console.log('\n6. Verificando configuração do repositório local...');
    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      console.log(`🔗 Remote origin atual: ${remoteUrl}`);
      
      // Extrair nome do repositório da URL
      const match = remoteUrl.match(/github\.com[:\/]([^\/]+)\/([^\/\.]+)/);
      if (match) {
        const [, owner, repoName] = match;
        console.log(`📋 Repositório configurado: ${owner}/${repoName}`);
        
        if (repoName.toLowerCase() === 'gatohub') {
          console.log('✅ Remote configurado para GatoHub');
        } else {
          console.log(`⚠️  Remote configurado para ${repoName}, não GatoHub`);
        }
      }
    } catch (error) {
      console.log('❌ Erro ao verificar remote:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Executar o teste
testGatoHubRepository().then(() => {
  console.log('\n=== Teste Concluído ===');
}).catch(error => {
  console.error('❌ Erro fatal:', error.message);
});