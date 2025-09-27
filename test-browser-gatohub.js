// Script para testar GatoHub via localStorage do navegador
import puppeteer from 'puppeteer';

console.log('=== TESTE: GatoHub via Browser localStorage ===\n');

async function testGatoHubInBrowser() {
  let browser;
  
  try {
    console.log('1. Iniciando navegador...');
    browser = await puppeteer.launch({ 
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('2. Acessando aplicação...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Aguardar um pouco para a aplicação carregar
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('3. Extraindo dados do localStorage...');
    
    const localStorageData = await page.evaluate(() => {
      const data = {};
      
      // Buscar todas as chaves do localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('github')) {
          try {
            const value = localStorage.getItem(key);
            data[key] = JSON.parse(value);
          } catch (e) {
            data[key] = localStorage.getItem(key);
          }
        }
      }
      
      return data;
    });
    
    console.log('📊 Dados do localStorage relacionados ao GitHub:');
    Object.keys(localStorageData).forEach(key => {
      console.log(`   ${key}:`, JSON.stringify(localStorageData[key], null, 2));
    });
    
    // Buscar especificamente o token de acesso
    const accessToken = await page.evaluate(() => {
      // Tentar diferentes chaves possíveis
      const possibleKeys = [
        'github_track_githubConnection',
        'github_track_auth',
        'github_track_user',
        'githubConnection',
        'accessToken'
      ];
      
      for (const key of possibleKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            if (parsed.accessToken) return parsed.accessToken;
            if (parsed.access_token) return parsed.access_token;
          } catch (e) {
            // Se não for JSON, pode ser o token direto
            if (value.startsWith('ghp_') || value.startsWith('gho_')) {
              return value;
            }
          }
        }
      }
      
      return null;
    });
    
    if (!accessToken) {
      console.log('❌ Token de acesso não encontrado no localStorage!');
      console.log('💡 Verifique se você está logado na aplicação.');
      return;
    }
    
    console.log('✅ Token encontrado:', accessToken.substring(0, 8) + '...');
    
    // Testar API do GitHub com o token
    console.log('\n4. Testando API do GitHub...');
    
    const apiTest = await page.evaluate(async (token) => {
      try {
        // Buscar usuário
        const userResponse = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!userResponse.ok) {
          return { error: `Erro na API: ${userResponse.status}` };
        }
        
        const user = await userResponse.json();
        
        // Buscar repositórios
        const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!reposResponse.ok) {
          return { error: `Erro ao buscar repositórios: ${reposResponse.status}` };
        }
        
        const repos = await reposResponse.json();
        
        return {
          user: {
            login: user.login,
            name: user.name,
            public_repos: user.public_repos
          },
          repositories: repos.map(repo => ({
            name: repo.name,
            full_name: repo.full_name,
            id: repo.id,
            private: repo.private,
            clone_url: repo.clone_url
          }))
        };
        
      } catch (error) {
        return { error: error.message };
      }
    }, accessToken);
    
    if (apiTest.error) {
      console.log('❌ Erro na API:', apiTest.error);
      return;
    }
    
    console.log(`✅ Usuário: ${apiTest.user.login} (${apiTest.user.name || 'Nome não definido'})`);
    console.log(`📁 ${apiTest.repositories.length} repositórios encontrados`);
    
    // Procurar GatoHub
    console.log('\n5. Procurando repositório GatoHub...');
    const gatoHubRepo = apiTest.repositories.find(repo => repo.name === 'GatoHub');
    
    if (gatoHubRepo) {
      console.log('✅ Repositório GatoHub ENCONTRADO!');
      console.log('📊 Detalhes do GatoHub:');
      console.log(`   - Nome: ${gatoHubRepo.name}`);
      console.log(`   - Nome completo: ${gatoHubRepo.full_name}`);
      console.log(`   - ID: ${gatoHubRepo.id}`);
      console.log(`   - Clone URL: ${gatoHubRepo.clone_url}`);
      console.log(`   - Privado: ${gatoHubRepo.private ? 'Sim' : 'Não'}`);
      
      // Testar seleção na interface
      console.log('\n6. Testando seleção na interface...');
      
      try {
        // Procurar pelo dropdown de repositórios
        await page.waitForSelector('[data-testid="github-repo-select"], select, .select-trigger', { timeout: 5000 });
        
        // Tentar clicar no dropdown
        const dropdownClicked = await page.evaluate(() => {
          const selectors = [
            '[data-testid="github-repo-select"]',
            '.select-trigger',
            'button[role="combobox"]',
            '.github-repo-dropdown'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              element.click();
              return true;
            }
          }
          return false;
        });
        
        if (dropdownClicked) {
          console.log('✅ Dropdown aberto');
          
          // Aguardar opções aparecerem
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Procurar pela opção GatoHub
          const gatoHubFound = await page.evaluate(() => {
            const options = document.querySelectorAll('[role="option"], option, .select-item');
            for (const option of options) {
              if (option.textContent && option.textContent.includes('GatoHub')) {
                option.click();
                return true;
              }
            }
            return false;
          });
          
          if (gatoHubFound) {
            console.log('✅ GatoHub selecionado na interface!');
            
            // Aguardar um pouco para processar a seleção
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verificar se a seleção foi processada
            const selectionProcessed = await page.evaluate(() => {
              // Procurar por indicadores de que o repositório foi selecionado
              const indicators = [
                document.querySelector('[data-selected-repo="GatoHub"]'),
                document.querySelector('.selected-repo'),
                document.querySelector('input[value*="GatoHub"]')
              ];
              
              return indicators.some(indicator => indicator !== null);
            });
            
            if (selectionProcessed) {
              console.log('✅ Seleção processada com sucesso!');
            } else {
              console.log('⚠️  Seleção pode não ter sido processada corretamente');
            }
            
          } else {
            console.log('❌ GatoHub não encontrado nas opções do dropdown');
            
            // Listar opções disponíveis
            const availableOptions = await page.evaluate(() => {
              const options = document.querySelectorAll('[role="option"], option, .select-item');
              return Array.from(options).map(option => option.textContent?.trim()).filter(Boolean);
            });
            
            console.log('📋 Opções disponíveis no dropdown:');
            availableOptions.forEach((option, index) => {
              console.log(`   ${index + 1}. ${option}`);
            });
          }
          
        } else {
          console.log('❌ Não foi possível abrir o dropdown');
        }
        
      } catch (error) {
        console.log('❌ Erro ao testar interface:', error.message);
      }
      
    } else {
      console.log('❌ Repositório GatoHub NÃO encontrado!');
      console.log('💡 Repositórios disponíveis:');
      apiTest.repositories.slice(0, 10).forEach((repo, index) => {
        console.log(`   ${index + 1}. ${repo.name} (${repo.full_name})`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro durante o teste:', error.message);
  } finally {
    if (browser) {
      console.log('\n7. Fechando navegador...');
      await browser.close();
    }
  }
}

// Executar teste
testGatoHubInBrowser();