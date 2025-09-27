// Script para testar a seleção do repositório GatoHub
import https from 'https';
import fs from 'fs';
import path from 'path';

console.log('=== TESTE: Seleção do Repositório GatoHub ===\n');

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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Função para buscar token de acesso
function findAccessToken() {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'auth', 'tokens.json'),
    path.join(process.cwd(), 'data', 'github_connections.json'),
    path.join(process.cwd(), '.env')
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (filePath.endsWith('.json')) {
          const data = JSON.parse(content);
          
          // Procurar token em diferentes estruturas
          if (data.accessToken) return data.accessToken;
          if (data.access_token) return data.access_token;
          if (Array.isArray(data) && data.length > 0 && data[0].accessToken) {
            return data[0].accessToken;
          }
          
          // Procurar em estrutura de tokens por usuário
          const userIds = Object.keys(data);
          for (const userId of userIds) {
            if (data[userId] && data[userId].access_token) {
              return data[userId].access_token;
            }
          }
        } else if (filePath.endsWith('.env')) {
          const match = content.match(/GITHUB_TOKEN=(.+)/);
          if (match) return match[1].trim();
        }
      }
    } catch (error) {
      console.log(`⚠️  Erro ao ler ${filePath}:`, error.message);
    }
  }
  
  return null;
}

async function testGatoHubSelection() {
  try {
    // 1. Buscar token de acesso
    console.log('1. Buscando token de acesso...');
    const accessToken = findAccessToken();
    
    if (!accessToken) {
      console.log('❌ Token de acesso não encontrado!');
      console.log('💡 Verifique se você está logado na aplicação.');
      return;
    }
    
    console.log('✅ Token encontrado:', accessToken.substring(0, 8) + '...');
    
    // 2. Buscar informações do usuário
    console.log('\n2. Verificando usuário autenticado...');
    const userResponse = await makeGitHubRequest('/user', accessToken);
    
    if (userResponse.status !== 200) {
      console.log('❌ Erro ao buscar usuário:', userResponse.data);
      return;
    }
    
    const user = userResponse.data;
    console.log(`✅ Usuário: ${user.login} (${user.name || 'Nome não definido'})`);
    
    // 3. Buscar repositórios do usuário (como a aplicação faz)
    console.log('\n3. Buscando repositórios do usuário...');
    const reposResponse = await makeGitHubRequest('/user/repos?per_page=100&sort=updated', accessToken);
    
    if (reposResponse.status !== 200) {
      console.log('❌ Erro ao buscar repositórios:', reposResponse.data);
      return;
    }
    
    const repositories = reposResponse.data;
    console.log(`✅ ${repositories.length} repositórios encontrados`);
    
    // 4. Verificar se GatoHub está na lista
    console.log('\n4. Procurando repositório GatoHub...');
    const gatoHubRepo = repositories.find(repo => repo.name === 'GatoHub');
    
    if (gatoHubRepo) {
      console.log('✅ Repositório GatoHub ENCONTRADO!');
      console.log('📊 Detalhes do GatoHub:');
      console.log(`   - Nome: ${gatoHubRepo.name}`);
      console.log(`   - Nome completo: ${gatoHubRepo.full_name}`);
      console.log(`   - ID: ${gatoHubRepo.id}`);
      console.log(`   - URL: ${gatoHubRepo.html_url}`);
      console.log(`   - Clone URL: ${gatoHubRepo.clone_url}`);
      console.log(`   - Privado: ${gatoHubRepo.private ? 'Sim' : 'Não'}`);
      console.log(`   - Última atualização: ${gatoHubRepo.updated_at}`);
      
      // 5. Simular seleção do GatoHub
      console.log('\n5. Simulando seleção do GatoHub...');
      
      // Verificar arquivo repositories.json atual
      const reposFilePath = path.join(process.cwd(), 'data', 'repositories.json');
      let currentRepos = [];
      
      if (fs.existsSync(reposFilePath)) {
        currentRepos = JSON.parse(fs.readFileSync(reposFilePath, 'utf8'));
        console.log(`📋 Repositórios salvos atualmente: ${currentRepos.length}`);
        currentRepos.forEach(repo => {
          console.log(`   - ${repo.name} (ID: ${repo.github_repo_id})`);
        });
      }
      
      // Verificar se GatoHub já está salvo
      const savedGatoHub = currentRepos.find(repo => 
        repo.name === 'GatoHub' || 
        repo.github_repo_id === gatoHubRepo.id.toString()
      );
      
      if (savedGatoHub) {
        console.log('✅ GatoHub já está salvo no repositories.json');
        console.log('📊 Dados salvos:');
        console.log(`   - ID local: ${savedGatoHub.id}`);
        console.log(`   - GitHub ID: ${savedGatoHub.github_repo_id}`);
        console.log(`   - Nome: ${savedGatoHub.name}`);
        console.log(`   - Caminho local: ${savedGatoHub.local_path}`);
      } else {
        console.log('⚠️  GatoHub NÃO está salvo no repositories.json');
        console.log('💡 Isso pode explicar por que o remote não está sendo configurado corretamente.');
        
        // Simular adição do GatoHub
        const newGatoHubEntry = {
          id: Date.now().toString(),
          github_repo_id: gatoHubRepo.id.toString(),
          name: gatoHubRepo.name,
          full_name: gatoHubRepo.full_name,
          local_path: process.cwd(),
          sync_enabled: true,
          created_at: new Date().toISOString()
        };
        
        console.log('\n6. Adicionando GatoHub ao repositories.json...');
        currentRepos.push(newGatoHubEntry);
        
        // Salvar arquivo atualizado
        fs.writeFileSync(reposFilePath, JSON.stringify(currentRepos, null, 2));
        console.log('✅ GatoHub adicionado com sucesso!');
      }
      
    } else {
      console.log('❌ Repositório GatoHub NÃO encontrado!');
      console.log('💡 Repositórios disponíveis:');
      repositories.slice(0, 10).forEach((repo, index) => {
        console.log(`   ${index + 1}. ${repo.name} (${repo.full_name})`);
      });
      
      if (repositories.length > 10) {
        console.log(`   ... e mais ${repositories.length - 10} repositórios`);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste
testGatoHubSelection();