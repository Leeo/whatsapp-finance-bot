#!/bin/bash

# =============================================================================
# SCRIPT DE INSTALAÇÃO AUTOMÁTICA - BOT WHATSAPP FINANCEIRO
# =============================================================================
# Este script automatiza a instalação completa do bot em um servidor Ubuntu
# 
# Uso: 
#   chmod +x install.sh
#   ./install.sh
#
# Ou diretamente:
#   curl -fsSL https://seu-site.com/install.sh | bash
# =============================================================================

set -e  # Para execução se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis
PROJECT_DIR="$HOME/whatsapp-finance-bot"
NODE_VERSION="20"

# =============================================================================
# FUNÇÕES DE UTILIDADE
# =============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║      🤖 BOT WHATSAPP FINANCEIRO - INSTALADOR AUTOMÁTICO       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${YELLOW}[PASSO $1/10]${NC} $2"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# VERIFICAÇÕES INICIAIS
# =============================================================================

check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "Não execute este script como root!"
        print_info "Use: ./install.sh (como usuário normal com sudo)"
        exit 1
    fi
}

check_os() {
    if ! grep -q "Ubuntu\|Debian" /etc/os-release 2>/dev/null; then
        print_error "Este script foi testado apenas no Ubuntu/Debian!"
        print_info "Sistema detectado: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
        read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
}

# =============================================================================
# INSTALAÇÃO
# =============================================================================

step1_update_system() {
    print_step "1" "Atualizando sistema..."
    
    sudo apt update -qq
    sudo apt upgrade -y -qq
    
    print_success "Sistema atualizado!"
}

step2_install_dependencies() {
    print_step "2" "Instalando dependências do sistema..."
    
    sudo apt install -y -qq \
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
        lsb-release \
        software-properties-common
    
    print_success "Dependências instaladas!"
}

step3_install_nvm_node() {
    print_step "3" "Instalando NVM e Node.js ${NODE_VERSION}..."
    
    # Remove instalação anterior do NVM se existir
    rm -rf "$HOME/.nvm"
    
    # Instala NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    # Carrega NVM
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Instala Node.js LTS
    nvm install --lts
    nvm use --lts
    nvm alias default lts/*
    
    # Adiciona ao .bashrc se não estiver
    if ! grep -q "NVM_DIR" "$HOME/.bashrc"; then
        echo 'export NVM_DIR="$HOME/.nvm"' >> "$HOME/.bashrc"
        echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> "$HOME/.bashrc"
    fi
    
    print_success "Node.js $(node --version) instalado!"
}

step4_create_project() {
    print_step "4" "Criando estrutura do projeto..."
    
    # Remove instalação anterior se existir
    if [ -d "$PROJECT_DIR" ]; then
        print_info "Diretório existente encontrado. Fazendo backup..."
        mv "$PROJECT_DIR" "${PROJECT_DIR}.backup.$(date +%Y%m%d%H%M%S)"
    fi
    
    # Cria estrutura
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    mkdir -p temp auth_info logs
    
    print_success "Estrutura criada em: $PROJECT_DIR"
}

step5_init_npm() {
    print_step "5" "Inicializando projeto Node.js..."
    
    cd "$PROJECT_DIR"
    
    # Cria package.json
    cat > package.json << 'EOF'
{
  "name": "whatsapp-finance-bot",
  "version": "1.0.0",
  "description": "Bot de WhatsApp para Gestão Financeira",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "logs": "pm2 logs whatsapp-finance-bot",
    "monitor": "pm2 monit",
    "stop": "pm2 stop whatsapp-finance-bot",
    "restart": "pm2 restart whatsapp-finance-bot"
  },
  "keywords": ["whatsapp", "bot", "finance"],
  "author": "Desenvolvedor",
  "license": "MIT",
  "dependencies": {
    "@hapi/boom": "^10.0.1",
    "@whiskeysockets/baileys": "^6.6.0",
    "dotenv": "^16.4.5",
    "openai": "^4.52.0",
    "pino": "^9.2.0",
    "pino-pretty": "^11.2.1",
    "qrcode-terminal": "^0.12.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
    
    print_success "package.json criado!"
}

step6_install_packages() {
    print_step "6" "Instalando pacotes npm..."
    
    cd "$PROJECT_DIR"
    
    npm install --silent
    
    print_success "Pacotes instalados!"
}

step7_install_pm2() {
    print_step "7" "Instalando PM2..."
    
    npm install -g pm2 --silent
    
    # Cria ecosystem.config.js
    cat > "$PROJECT_DIR/ecosystem.config.js" << 'EOF'
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
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 10000,
    exp_backoff_restart_delay: 100,
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
    
    print_success "PM2 instalado e configurado!"
}

step8_create_env() {
    print_step "8" "Criando arquivo de configuração (.env)..."
    
    cd "$PROJECT_DIR"
    
    cat > .env.example << 'EOF'
# ============================================
# CONFIGURAÇÃO DO BOT - FINANCEIRO
# ============================================

# OPENAI API - OBRIGATÓRIO
# Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-sua-chave-aqui

# Modelo da OpenAI
OPENAI_MODEL=gpt-4o

# Nível de log
LOG_LEVEL=info
EOF
    
    print_success "Arquivo .env.example criado!"
    print_info "⚠️  IMPORTANTE: Edite o arquivo .env com sua API Key da OpenAI"
}

step9_create_gitignore() {
    print_step "9" "Criando .gitignore..."
    
    cd "$PROJECT_DIR"
    
    cat > .gitignore << 'EOF'
# Dependências
node_modules/
package-lock.json

# Ambiente
.env
.env.local

# Credenciais
auth_info/
auth/
session/

# Temporários
temp/
tmp/
*.tmp

# Logs
logs/
*.log

# Dados
transacoes.json
data/

# Sistema
.DS_Store
Thumbs.db
*.swp
*~

# IDEs
.vscode/
.idea/
EOF
    
    print_success ".gitignore criado!"
}

step10_final_instructions() {
    print_step "10" "Instalação concluída!"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📁 Projeto instalado em:${NC} $PROJECT_DIR"
    echo ""
    echo -e "${YELLOW}📝 PRÓXIMOS PASSOS:${NC}"
    echo ""
    echo -e "1️⃣  ${BLUE}Configure sua API Key da OpenAI:${NC}"
    echo -e "    cd $PROJECT_DIR"
    echo -e "    cp .env.example .env"
    echo -e "    nano .env"
    echo ""
    echo -e "2️⃣  ${BLUE}Adicione o código do bot:${NC}"
    echo -e "    # Cole o conteúdo do index.js no arquivo"
    echo -e "    nano index.js"
    echo ""
    echo -e "3️⃣  ${BLUE}Execute pela primeira vez (modo desenvolvimento):${NC}"
    echo -e "    node index.js"
    echo ""
    echo -e "4️⃣  ${BLUE}Escaneie o QR Code com seu WhatsApp${NC}"
    echo ""
    echo -e "5️⃣  ${BLUE}Configure para rodar 24/7 com PM2:${NC}"
    echo -e "    pm2 start ecosystem.config.js"
    echo -e "    pm2 startup"
    echo -e "    pm2 save"
    echo ""
    echo -e "${YELLOW}📚 COMANDOS ÚTEIS:${NC}"
    echo -e "    pm2 status          # Ver status"
    echo -e "    pm2 logs            # Ver logs"
    echo -e "    pm2 monit           # Monitor interativo"
    echo -e "    pm2 restart all     # Reiniciar"
    echo -e "    pm2 stop all        # Parar"
    echo ""
    echo -e "${GREEN}🎉 Bom uso do seu Bot de Gestão Financeira!${NC}"
    echo ""
}

# =============================================================================
# EXECUÇÃO PRINCIPAL
# =============================================================================

main() {
    print_header
    
    check_root
    check_os
    
    print_info "Iniciando instalação automática..."
    print_info "Isso pode levar alguns minutos."
    echo ""
    
    step1_update_system
    step2_install_dependencies
    step3_install_nvm_node
    step4_create_project
    step5_init_npm
    step6_install_packages
    step7_install_pm2
    step8_create_env
    step9_create_gitignore
    step10_final_instructions
}

# Executa o script
main "$@"
