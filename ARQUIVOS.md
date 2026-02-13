# 📁 Estrutura de Arquivos do Projeto

Este documento descreve todos os arquivos do projeto e suas funções.

---

## 🗂️ Estrutura do Projeto

```
whatsapp-finance-bot/
│
├── 📄 index.js                    # Código principal (OpenAI)
├── 📄 index-gemini.js             # Código principal (Google Gemini - GRÁTIS!)
│
├── 📄 package.json                # Dependências (OpenAI)
├── 📄 package-gemini.json         # Dependências (Google Gemini)
│
├── 📄 ecosystem.config.js         # Configuração do PM2
├── 📄 install.sh                  # Script de instalação automática
│
├── 📄 .env.example                # Exemplo de variáveis (OpenAI)
├── 📄 .env.gemini.example         # Exemplo de variáveis (Gemini)
├── 📄 .gitignore                  # Arquivos ignorados pelo Git
│
├── 📄 README.md                   # Documentação principal
├── 📄 INSTALL_GUIDE.md            # Guia de instalação detalhado
├── 📄 ARQUIVOS.md                 # Este arquivo
│
├── 📁 auth_info/                  # Credenciais do WhatsApp (criado automaticamente)
├── 📁 temp/                       # Arquivos temporários (criado automaticamente)
├── 📁 logs/                       # Logs do PM2 (criado automaticamente)
└── 📄 transacoes.json             # Log de transações (criado automaticamente)
```

---

## 📄 Descrição dos Arquivos

### Arquivos Principais

#### `index.js`
- **Função:** Código principal do bot usando OpenAI GPT-4o
- **Uso:** Execute com `node index.js` ou `npm start`
- **Requisito:** API Key da OpenAI (paga)

#### `index-gemini.js`
- **Função:** Código principal do bot usando Google Gemini
- **Uso:** Execute com `node index-gemini.js`
- **Requisito:** API Key do Google Gemini (GRATUITA!)
- **Vantagem:** Tier gratuito generoso (15 req/min, 1000 req/dia)
- **Obter key:** https://aistudio.google.com/app/apikey

#### `index-openrouter.js`
- **Função:** Código principal do bot usando OpenRouter
- **Uso:** Execute com `node index-openrouter.js`
- **Requisito:** API Key do OpenRouter (GRATUITA!)
- **Vantagem:** Vários modelos gratuitos com suporte a visão
- **Obter key:** https://openrouter.ai/keys
- **Modelos gratuitos:**
  - `meta-llama/llama-3.2-11b-vision-instruct` (recomendado)
  - `google/gemma-3-4b-it:free`
  - `qwen/qwen2.5-vl-32b-instruct:free`

---

### Configuração de Dependências

#### `package.json`
- **Função:** Define dependências para versão OpenAI
- **Conteúdo:** Lista de pacotes npm necessários
- **Comando:** `npm install`

#### `package-gemini.json`
- **Função:** Define dependências para versão Google Gemini
- **Conteúdo:** Inclui `@google/generative-ai` além das outras
- **Uso:** Renomeie para `package.json` se for usar Gemini

#### `package-openrouter.json`
- **Função:** Define dependências para versão OpenRouter
- **Conteúdo:** Inclui todas as dependências (usa fetch nativo)
- **Uso:** Renomeie para `package.json` se for usar OpenRouter

---

### Configuração do Sistema

#### `ecosystem.config.js`
- **Função:** Configuração do PM2 para produção
- **Conteúdo:** 
  - Nome do processo
  - Scripts de inicialização
  - Configurações de log
  - Políticas de restart
- **Uso:** `pm2 start ecosystem.config.js`

#### `install.sh`
- **Função:** Script de instalação automática
- **Conteúdo:** Comandos bash para instalar tudo automaticamente
- **Uso:** `chmod +x install.sh && ./install.sh`
- **Ações:**
  - Atualiza sistema
  - Instala dependências
  - Instala Node.js via NVM
  - Cria estrutura de pastas
  - Instala pacotes npm
  - Configura PM2

---

### Configuração de Ambiente

#### `.env.example`
- **Função:** Template de variáveis para OpenAI
- **Conteúdo:**
  - `OPENAI_API_KEY` - Sua chave da API
  - `OPENAI_MODEL` - Modelo a usar (gpt-4o)
  - `LOG_LEVEL` - Nível de log
- **Uso:** Copie para `.env` e preencha

#### `.env.gemini.example`
- **Função:** Template de variáveis para Google Gemini
- **Conteúdo:**
  - `GEMINI_API_KEY` - Sua chave gratuita
  - `GEMINI_MODEL` - Modelo a usar (gemini-1.5-flash)
  - `LOG_LEVEL` - Nível de log
- **Uso:** Copie para `.env` e preencha

#### `.env.openrouter.example`
- **Função:** Template de variáveis para OpenRouter
- **Conteúdo:**
  - `OPENROUTER_API_KEY` - Sua chave gratuita
  - `OPENROUTER_MODEL` - Modelo a usar (meta-llama/llama-3.2-11b-vision-instruct)
  - `OPENROUTER_SITE_URL` - URL do site (opcional)
  - `LOG_LEVEL` - Nível de log
- **Uso:** Copie para `.env` e preencha

#### `.gitignore`
- **Função:** Lista arquivos ignorados pelo Git
- **Conteúdo:**
  - `node_modules/` - Dependências
  - `.env` - Variáveis sensíveis
  - `auth_info/` - Credenciais WhatsApp
  - `temp/` - Arquivos temporários
  - `logs/` - Logs
  - `transacoes.json` - Dados de transações

---

### Documentação

#### `README.md`
- **Função:** Documentação principal do projeto
- **Conteúdo:**
  - Descrição do projeto
  - Funcionalidades
  - Instalação rápida
  - Como usar
  - Scripts disponíveis
  - Solução de problemas

#### `INSTALL_GUIDE.md`
- **Função:** Guia de instalação passo a passo
- **Conteúdo:**
  - 9 partes detalhadas
  - Comandos explicados
  - Configuração de segurança
  - Monitoramento
  - Solução de problemas
  - Checklist final

#### `ARQUIVOS.md`
- **Função:** Este arquivo - descrição da estrutura
- **Conteúdo:** Explicação de cada arquivo

---

### Pastas (Criadas Automaticamente)

#### `auth_info/`
- **Função:** Armazena credenciais de autenticação do WhatsApp
- **Conteúdo:** Arquivos JSON com tokens de sessão
- **Importante:** NUNCA compartilhe ou commite esta pasta!
- **Permissão:** `chmod 700 auth_info/`

#### `temp/`
- **Função:** Armazena imagens temporárias durante processamento
- **Conteúdo:** Arquivos de imagem/PDF baixados
- **Limpeza:** Automática a cada 30 minutos
- **Permissão:** `chmod 755 temp/`

#### `logs/`
- **Função:** Armazena logs do PM2
- **Conteúdo:**
  - `combined.log` - Todos os logs
  - `out.log` - Saída padrão
  - `error.log` - Erros
- **Rotação:** Gerenciada pelo PM2

---

### Arquivos Gerados (Não versionar)

#### `transacoes.json`
- **Função:** Log de todas as transações processadas
- **Conteúdo:** Array JSON com dados de cada gasto
- **Formato:**
  ```json
  [{
    "data": "15/01/2024",
    "usuario": "João",
    "estabelecimento": "Supermercado",
    "valor": 150.50,
    "categoria": "Alimentação",
    "descricao_curta": "Compras",
    "remetente": "5511...",
    "timestamp": "2024-01-15T..."
  }]
  ```

#### `package-lock.json`
- **Função:** Lock de versões das dependências
- **Gerado por:** `npm install`
- **Uso:** Garante versões consistentes

---

## 🚀 Fluxo de Uso

### Instalação

1. **Copie os arquivos** para o servidor
2. **Execute o install.sh** (opcional) ou siga o INSTALL_GUIDE.md
3. **Configure o .env** com sua API Key
4. **Adicione o código** (index.js ou index-gemini.js)

### Primeira Execução

```bash
# Modo desenvolvimento
node index.js

# Escaneie o QR Code
# Aguarde "Bot conectado com sucesso!"
```

### Produção

```bash
# Inicia com PM2
pm2 start ecosystem.config.js

# Configura inicialização automática
pm2 startup
pm2 save
```

---

## 🔄 Escolha sua Versão

### Versão OpenAI (index.js) 💳
- ✅ Mais precisa
- ✅ Melhor para imagens complexas
- ❌ Requer pagamento
- ❌ Limites de uso

### Versão Google Gemini (index-gemini.js) 🎁
- ✅ GRATUITA!
- ✅ 1000 requisições/dia
- ✅ Não precisa de cartão
- ⚠️ Pode ser menos precisa em alguns casos

### Versão OpenRouter (index-openrouter.js) 🎁 ⭐ RECOMENDADO
- ✅ GRATUITA!
- ✅ Múltiplos modelos disponíveis
- ✅ Troca fácil se um modelo atingir limite
- ✅ Não precisa de cartão
- ⚠️ Limites variam por modelo

---

## 📝 Notas Importantes

1. **Nunca commite** os arquivos `.env`, `auth_info/`, `temp/`, `logs/`
2. **Sempre use** `chmod 600 .env` para proteger a API Key
3. **Faça backup** da pasta `auth_info/` para não perder a sessão
4. **Monitore os logs** regularmente com `pm2 logs`
5. **Atualize** as dependências periodicamente: `npm update`

---

## 🆘 Problemas Comuns

| Problema | Arquivo a Verificar |
|----------|---------------------|
| Bot não inicia | `.env`, `package.json` |
| Erro de conexão | `auth_info/` (apagar para recriar) |
| API não responde | `.env` (verificar API Key) |
| Logs não aparecem | `logs/`, `ecosystem.config.js` |
| Permissão negada | `.env`, `auth_info/` (chmod) |
