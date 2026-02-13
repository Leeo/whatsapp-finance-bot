# 🚀 Guia de Instalação "Zero-to-Hero" - Bot WhatsApp Financeiro

> **Objetivo:** Configurar um servidor VPS Ubuntu do zero para rodar o Bot de WhatsApp Financeiro 24/7 com PM2.

---

## 📋 PRÉ-REQUISITOS

- [ ] Servidor VPS com Ubuntu 20.04+ (recomendado: 2GB RAM, 1 vCPU)
- [ ] Acesso SSH ao servidor
- [ ] Usuário com privilégios sudo
- [ ] API Key da OpenAI (obtenha em: https://platform.openai.com/api-keys)

---

## 🔧 PARTE 1: PREPARAÇÃO DO SERVIDOR

### 1.1 Acessar o Servidor via SSH

```bash
# No seu computador local, substitua pelo IP do seu servidor
ssh usuario@SEU_IP_DO_SERVIDOR

# Exemplo:
# ssh root@192.168.1.100
```

> 💡 **Dica:** No Windows, use o PuTTY ou o Terminal do Windows 10+. No Mac/Linux, use o terminal nativo.

---

### 1.2 Atualizar o Sistema

```bash
# Atualiza a lista de pacotes disponíveis
sudo apt update

# Atualiza todos os pacotes instalados para as versões mais recentes
sudo apt upgrade -y
```

**Para que serve:**
- `apt update` → Atualiza o índice de pacotes do sistema
- `apt upgrade` → Instala atualizações de segurança e melhorias
- `-y` → Responde "sim" automaticamente para todas as perguntas

---

### 1.3 Instalar Dependências de Sistema

```bash
# Instala pacotes essenciais para compilação e processamento de imagens
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  libvips-dev \
  libvips-tools \
  libjpeg-dev \
  libpng-dev \
  libwebp-dev \
  pkg-config \
  python3 \
  python3-pip \
  ffmpeg \
  ca-certificates \
  gnupg \
  lsb-release
```

**Para que serve cada pacote:**

| Pacote | Função |
|--------|--------|
| `curl` | Ferramenta para transferir dados via HTTP/HTTPS |
| `wget` | Download de arquivos da internet |
| `git` | Controle de versão (necessário para algumas dependências npm) |
| `build-essential` | Compiladores GCC/G++ para módulos nativos Node.js |
| `libvips-dev` | Biblioteca de processamento de imagens de alto desempenho |
| `libvips-tools` | Ferramentas de linha de comando do libvips |
| `libjpeg-dev` | Suporte a imagens JPEG |
| `libpng-dev` | Suporte a imagens PNG |
| `libwebp-dev` | Suporte a imagens WebP |
| `pkg-config` | Auxilia na compilação de pacotes |
| `python3` | Necessário para compilar módulos nativos |
| `ffmpeg` | Processamento de mídia (vídeos/áudios) |
| `ca-certificates` | Certificados SSL para conexões seguras |

---

## 🟢 PARTE 2: INSTALAÇÃO DO NODE.JS

### 2.1 Instalar o NVM (Node Version Manager)

```bash
# Baixa e instala o NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Carrega o NVM na sessão atual
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

**Para que serve:**
- O NVM permite instalar e gerenciar múltiplas versões do Node.js
- Facilita atualizações e alternância entre versões

---

### 2.2 Instalar Node.js LTS

```bash
# Lista as versões LTS disponíveis
nvm list-remote --lts

# Instala a versão LTS mais recente (recomendado)
nvm install --lts

# Define a versão LTS como padrão
nvm use --lts

# Alias para sempre usar LTS como padrão
nvm alias default lts/*
```

---

### 2.3 Verificar Instalação

```bash
# Verifica a versão do Node.js
node --version

# Deve mostrar algo como: v20.15.0

# Verifica a versão do npm
npm --version

# Deve mostrar algo como: 10.7.0
```

---

## 📁 PARTE 3: CONFIGURAÇÃO DO PROJETO

### 3.1 Criar Estrutura de Pastas

```bash
# Cria pasta do projeto na home do usuário
mkdir -p ~/whatsapp-finance-bot

# Entra na pasta do projeto
cd ~/whatsapp-finance-bot

# Cria pasta para arquivos temporários
mkdir -p temp

# Cria pasta para autenticação
mkdir -p auth_info
```

---

### 3.2 Inicializar o Projeto Node.js

```bash
# Inicializa o projeto com valores padrão
npm init -y
```

**Para que serve:**
- Cria o arquivo `package.json` com configurações padrão
- Este arquivo gerencia dependências e scripts do projeto

---

### 3.3 Instalar Dependências do Projeto

```bash
# Instala todas as dependências necessárias
npm install @whiskeysockets/baileys @hapi/boom openai dotenv pino pino-pretty qrcode-terminal
```

**O que cada biblioteca faz:**

| Biblioteca | Função |
|------------|--------|
| `@whiskeysockets/baileys` | Conexão com WhatsApp Web (sem API oficial) |
| `@hapi/boom` | Tratamento de erros HTTP |
| `openai` | Cliente oficial da API da OpenAI |
| `dotenv` | Carrega variáveis de ambiente do arquivo .env |
| `pino` | Logger rápido e estruturado |
| `pino-pretty` | Formatação bonita dos logs |
| `qrcode-terminal` | Exibe QR Code no terminal |

---

### 3.4 Instalar PM2 (Gerenciador de Processos)

```bash
# Instala o PM2 globalmente
npm install -g pm2

# Verifica a instalação
pm2 --version
```

**Para que serve:**
- Mantém o bot rodando 24/7 mesmo se o terminal fechar
- Reinicia automaticamente se o bot travar
- Gerencia logs e monitoramento
- Permite executar múltiplas instâncias

---

## ⚙️ PARTE 4: CONFIGURAÇÃO DO BOT

### 4.1 Criar Arquivo de Ambiente (.env)

```bash
# Cria o arquivo .env
nano .env
```

Cole o seguinte conteúdo (substitua pela sua API Key):

```env
# ============================================
# CONFIGURAÇÃO DO BOT DE WHATSAPP - FINANCEIRO
# ============================================

# OPENAI API - OBRIGATÓRIO
# Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-sua-chave-aqui

# Modelo da OpenAI para análise de imagens
OPENAI_MODEL=gpt-4o

# Nível de log: debug, info, warn, error
LOG_LEVEL=info
```

**Para salvar no nano:**
1. Pressione `Ctrl + O` (salvar)
2. Pressione `Enter` (confirmar)
3. Pressione `Ctrl + X` (sair)

---

### 4.2 Criar o Arquivo Principal (index.js)

```bash
# Cria o arquivo index.js
nano index.js
```

Cole o código completo do bot (disponível no repositório).

---

## 🚀 PARTE 5: EXECUÇÃO E DEPLOY

### 5.1 Executar em Modo Desenvolvimento (Primeira Vez)

```bash
# Executa o bot diretamente
node index.js
```

**O que acontece:**
1. O bot gera um QR Code no terminal
2. Você deve escanear com o WhatsApp do celular
3. Após escanear, o bot conecta e fica online

> ⚠️ **IMPORTANTE:** Mantenha o terminal aberto até ver a mensagem "Bot conectado com sucesso!"

---

### 5.2 Configurar PM2 para Produção

#### 5.2.1 Criar Arquivo de Configuração do PM2

```bash
# Cria o arquivo de configuração
nano ecosystem.config.js
```

Cole o seguinte conteúdo:

```javascript
module.exports = {
  apps: [{
    name: 'whatsapp-finance-bot',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    // Configurações de restart automático
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    // Configurações de log
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Configurações avançadas
    kill_timeout: 5000,
    listen_timeout: 10000,
    // Não reiniciar se estiver falhando muito
    exp_backoff_restart_delay: 100
  }]
};
```

---

#### 5.2.2 Criar Pasta de Logs

```bash
mkdir -p logs
```

---

#### 5.2.3 Iniciar com PM2

```bash
# Inicia o bot com PM2
pm2 start ecosystem.config.js

# Lista os processos rodando
pm2 list

# Visualiza logs em tempo real
pm2 logs whatsapp-finance-bot
```

---

#### 5.2.4 Configurar Inicialização Automática do PM2

```bash
# Gera o comando de inicialização automática
pm2 startup

# Execute o comando que o PM2 mostrar (exemplo abaixo)
sudo env PATH=$PATH:/home/seu-usuario/.nvm/versions/node/v20.15.0/bin pm2 startup systemd -u seu-usuario --hp /home/seu-usuario

# Salva a configuração atual do PM2
pm2 save
```

**Para que serve:**
- Garante que o PM2 inicie automaticamente após reinicialização do servidor
- Restaura os processos que estavam rodando

---

### 5.3 Comandos Úteis do PM2

```bash
# Ver status dos processos
pm2 status
pm2 list

# Ver logs em tempo real
pm2 logs whatsapp-finance-bot
pm2 logs whatsapp-finance-bot --lines 100

# Monitor interativo
pm2 monit

# Reiniciar o bot
pm2 restart whatsapp-finance-bot

# Parar o bot
pm2 stop whatsapp-finance-bot

# Remover o bot do PM2
pm2 delete whatsapp-finance-bot

# Recarregar configuração (zero-downtime)
pm2 reload whatsapp-finance-bot

# Informações detalhadas
pm2 describe whatsapp-finance-bot

# Limpar logs antigos
pm2 flush

# Atualizar lista de processos salvos
pm2 save
```

---

## 🔒 PARTE 6: SEGURANÇA

### 6.1 Configurar Firewall (UFW)

```bash
# Instala o UFW se não estiver instalado
sudo apt install ufw -y

# Define políticas padrão
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permite SSH (IMPORTANTE: não se bloqueie!)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Permite HTTP/HTTPS (se necessário)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ativa o firewall
sudo ufw enable

# Verifica status
sudo ufw status verbose
```

---

### 6.2 Proteger o Arquivo .env

```bash
# Define permissões restritas (apenas dono pode ler/escrever)
chmod 600 .env

# Verifica permissões
ls -la .env

# Deve mostrar: -rw------- 1 usuario grupo .env
```

---

### 6.3 Criar Usuário Não-Root (Recomendado)

```bash
# Cria novo usuário
sudo adduser botuser

# Adiciona ao grupo sudo
sudo usermod -aG sudo botuser

# Muda para o novo usuário
su - botuser

# Agora instale o bot neste usuário
```

---

## 📊 PARTE 7: MONITORAMENTO

### 7.1 Verificar Uso de Recursos

```bash
# Uso de CPU e memória
htop

# Ou versão simples
top

# Uso de disco
df -h

# Uso de memória
free -h
```

---

### 7.2 Verificar Logs

```bash
# Logs do PM2
pm2 logs

# Logs do sistema (erros)
sudo journalctl -u pm2-seu-usuario --lines 100 --no-pager

# Logs do bot (se configurado)
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🔄 PARTE 8: ATUALIZAÇÃO DO BOT

### 8.1 Atualizar Código

```bash
# Para o bot
pm2 stop whatsapp-finance-bot

# Faz backup (opcional)
cp index.js index.js.backup

# Atualiza o código (substitua index.js pelo novo)
# ... cole o novo código ...

# Reinstala dependências (se necessário)
npm install

# Reinicia o bot
pm2 restart whatsapp-finance-bot

# Verifica se está funcionando
pm2 logs
```

---

### 8.2 Atualizar Node.js

```bash
# Lista versões disponíveis
nvm list-remote

# Instala nova versão
nvm install 20.16.0

# Define como padrão
nvm use 20.16.0
nvm alias default 20.16.0

# Reinstala PM2 na nova versão
npm install -g pm2

# Reinicia o bot
pm2 restart all
```

---

## 🆘 PARTE 9: SOLUÇÃO DE PROBLEMAS

### 9.1 Bot Não Conecta

```bash
# Verifica se há processos antigos rodando
pm2 list

# Mata todos os processos do Node
pkill -f node

# Remove pasta de autenticação (força nova conexão)
rm -rf auth_info

# Reinicia
pm2 restart whatsapp-finance-bot
```

---

### 9.2 Erro de Memória

```bash
# Verifica uso de memória
free -h

# Adiciona swap (se necessário)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Torna permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### 9.3 Erro de Permissão

```bash
# Corrige permissões da pasta
cd ~/whatsapp-finance-bot
chmod -R 755 .
chmod -R 700 auth_info
chmod 600 .env
```

---

### 9.4 Reinstalar do Zero

```bash
# Para tudo
pm2 stop all
pm2 delete all

# Remove pasta do projeto
cd ~
rm -rf whatsapp-finance-bot

# Recria tudo seguindo o guia desde o passo 3.1
```

---

## ✅ CHECKLIST FINAL

Antes de considerar a instalação completa, verifique:

- [ ] Node.js instalado (`node --version`)
- [ ] PM2 instalado (`pm2 --version`)
- [ ] Dependências instaladas (`npm list`)
- [ ] Arquivo `.env` configurado com API Key
- [ ] QR Code escaneado e bot conectado
- [ ] PM2 rodando (`pm2 list` mostra "online")
- [ ] Inicialização automática configurada (`pm2 startup`)
- [ ] Processos salvos (`pm2 save`)
- [ ] Firewall configurado
- [ ] Logs funcionando

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs: `pm2 logs`
2. Consulte a documentação do Baileys: https://github.com/WhiskeySockets/Baileys
3. Verifique a documentação da OpenAI: https://platform.openai.com/docs

---

**🎉 Parabéns! Seu Bot de WhatsApp Financeiro está pronto para uso!**
