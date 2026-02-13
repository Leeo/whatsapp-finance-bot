# 🤖 Bot de WhatsApp para Gestão Financeira

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-6.6.0-blue)](https://github.com/WhiskeySockets/Baileys)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-purple)](https://openai.com/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-FREE-orange)](https://openrouter.ai/)
[![Google Gemini](https://img.shields.io/badge/Gemini-FREE-green)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Bot inteligente para WhatsApp que extrai automaticamente dados financeiros de comprovantes de pagamento, notas fiscais e recibos usando IA.

---

## ✨ Funcionalidades

- 📸 **Processamento de Imagens** - Analisa fotos de comprovantes automaticamente
- 📄 **Suporte a PDF** - Processa documentos PDF de notas fiscais
- 🤖 **Múltiplas IAs** - OpenAI, Google Gemini ou **OpenRouter (GRÁTIS!)**
- 💰 **Categorização Automática** - Classifica gastos em categorias predefinidas
- 🔒 **Conexão Segura** - Usa Baileys (sem necessidade de API oficial paga)
- 📝 **Logs de Transações** - Mantém histórico de todos os gastos registrados
- 🔄 **Reconexão Automática** - Reconecta automaticamente se cair
- 🖥️ **Painel PM2** - Monitoramento e gerenciamento 24/7

---

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐
│   WhatsApp      │────▶│   Bot Node.js   │────▶│   OpenAI / Gemini /     │
│   (Usuário)     │◀────│   (Baileys)     │◀────│   OpenRouter (FREE)     │
└─────────────────┘     └─────────────────┘     └─────────────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Logs JSON     │
                        │  (transacoes)   │
                        └─────────────────┘
```

---

## 📋 Requisitos

- Node.js 18+ (recomendado: 20 LTS)
- NPM ou Yarn
- API Key (escolha uma opção):
  - **OpenAI** (pago) - Mais preciso
  - **Google Gemini** (gratuito) - 1000 req/dia
  - **OpenRouter** (gratuito) - Vários modelos free
- Servidor Linux/Ubuntu (para produção)
- PM2 (para gerenciamento de processos)

---

## 🚀 Instalação Rápida

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/whatsapp-finance-bot.git
cd whatsapp-finance-bot
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Escolha sua Versão

#### 🎁 Opção A: OpenRouter (GRÁTIS - Recomendado!)
```bash
cp .env.openrouter.example .env
# Edite .env com sua API Key: https://openrouter.ai/keys
```

#### 🎁 Opção B: Google Gemini (GRÁTIS)
```bash
cp .env.gemini.example .env
# Edite .env com sua API Key: https://aistudio.google.com/app/apikey
```

#### 💳 Opção C: OpenAI (Pago)
```bash
cp .env.example .env
# Edite .env com sua API Key: https://platform.openai.com/api-keys
```

### 4. Execute o Bot

```bash
# OpenRouter (gratuito)
node index-openrouter.js

# Google Gemini (gratuito)
node index-gemini.js

# OpenAI (pago)
node index.js
```

---

## 📖 Guia Completo de Instalação no Servidor

Para uma instalação detalhada passo a passo em um servidor Ubuntu/VPS, consulte:

📄 **[INSTALL_GUIDE.md](INSTALL_GUIDE.md)** - Guia "Zero-to-Hero" completo

---

## 🔧 Configuração

### Variáveis de Ambiente (.env)

#### OpenRouter (Gratuito) 🎁
```env
# Obrigatório
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui

# Opcional
OPENROUTER_MODEL=meta-llama/llama-3.2-11b-vision-instruct
LOG_LEVEL=info
```

**Modelos gratuitos recomendados:**
- `meta-llama/llama-3.2-11b-vision-instruct` - Melhor custo-benefício
- `google/gemma-3-4b-it:free` - Mais rápido
- `qwen/qwen2.5-vl-32b-instruct:free` - Mais preciso

#### Google Gemini (Gratuito) 🎁
```env
# Obrigatório
GEMINI_API_KEY=sua-chave-aqui

# Opcional
GEMINI_MODEL=gemini-1.5-flash
LOG_LEVEL=info
```

#### OpenAI (Pago)
```env
# Obrigatório
OPENAI_API_KEY=sk-proj-sua-chave-aqui

# Opcional
OPENAI_MODEL=gpt-4o
LOG_LEVEL=info
```

### Categorias de Gastos

O bot classifica automaticamente em:

| Categoria | Emoji | Descrição |
|-----------|-------|-----------|
| Alimentação | 🍽️ | Restaurantes, mercados, delivery |
| Transporte | 🚗 | Combustível, Uber, transporte público |
| Moradia | 🏠 | Aluguel, contas, manutenção |
| Lazer | 🎮 | Entretenimento, hobbies, viagens |
| Saúde | 💊 | Farmácia, consultas, plano de saúde |
| Outros | 📦 | Demais gastos |

---

## 📱 Como Usar

### 1. Primeiro Acesso

1. Execute o bot
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a mensagem "Bot conectado com sucesso!"

### 2. Registrar um Gasto

1. Envie uma foto do comprovante/nota fiscal
2. Aguarde o processamento (3-5 segundos)
3. Receba os dados extraídos formatados:

```
✅ Gasto Registrado com Sucesso!

📅 Data: 15/01/2024
👤 Usuário: João Silva
🏪 Estabelecimento: Supermercado Extra
💵 Valor: R$ 156,78
🍽️ Categoria: Alimentação
📝 Descrição: Compras do mês
```

### 3. Comandos Disponíveis

| Ação | Descrição |
|------|-----------|
| Enviar imagem | Processa comprovante de pagamento |
| Enviar PDF | Processa nota fiscal em PDF |
| Qualquer texto | Mostra mensagem de boas-vindas |

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento com auto-reload
npm run dev

# Produção
npm start

# PM2 - Logs
npm run logs

# PM2 - Monitor
npm run monitor

# PM2 - Parar
npm run stop

# PM2 - Reiniciar
npm run restart
```

---

## 📊 Estrutura de Dados

### Saída da IA (JSON)

```json
{
  "data": "15/01/2024",
  "usuario": "João Silva",
  "estabelecimento": "Supermercado Extra",
  "valor": 156.78,
  "categoria": "Alimentação",
  "descricao_curta": "Compras do mês"
}
```

### Log de Transações

As transações são salvas em `transacoes.json`:

```json
[
  {
    "data": "15/01/2024",
    "usuario": "João Silva",
    "estabelecimento": "Supermercado Extra",
    "valor": 156.78,
    "categoria": "Alimentação",
    "descricao_curta": "Compras do mês",
    "remetente": "5511999999999@s.whatsapp.net",
    "timestamp": "2024-01-15T14:30:00.000Z"
  }
]
```

---

## 🔐 Segurança

- ✅ Nunca compartilhe seu arquivo `.env`
- ✅ Use permissões restritas: `chmod 600 .env`
- ✅ Armazene credenciais em pasta segura (`auth_info/`)
- ✅ Configure firewall no servidor
- ✅ Use HTTPS para comunicações
- ✅ Rotacione suas API Keys periodicamente

---

## 🐛 Solução de Problemas

### Erro: "Não foi possível baixar a imagem"

**Causa:** Problema na conexão ou arquivo corrompido

**Solução:**
```bash
# Reinicie o bot
pm2 restart whatsapp-finance-bot
```

### Erro: "A IA retornou um formato inválido"

**Causa:** Imagem de baixa qualidade ou ilegível

**Solução:**
- Envie imagem com melhor resolução
- Certifique-se que o texto está legível
- Evite reflexos e sombras

### Erro: "API Key inválida"

**Causa:** API Key da OpenAI incorreta ou sem créditos

**Solução:**
```bash
# Verifique sua API Key
echo $OPENAI_API_KEY

# Verifique créditos em: https://platform.openai.com/settings/organization/billing/overview
```

### Bot desconecta frequentemente

**Causa:** Instabilidade na conexão ou sessão expirada

**Solução:**
```bash
# Remove sessão antiga
rm -rf auth_info

# Reinicia o bot
pm2 restart whatsapp-finance-bot

# Escaneia o novo QR Code
```

---

## 📈 Roadmap

- [ ] Dashboard web para visualização de gastos
- [ ] Exportação para Excel/CSV
- [ ] Gráficos de gastos por categoria
- [ ] Múltiplos usuários/grupos
- [ ] Alertas de orçamento
- [ ] Integração com Google Sheets
- [ ] Suporte a múltiplos idiomas
- [ ] Reconhecimento de voz

---

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🙏 Agradecimentos

- [Baileys](https://github.com/WhiskeySockets/Baileys) - Biblioteca WhatsApp Web
- [OpenAI](https://openai.com/) - API de IA
- [Google Gemini](https://ai.google.dev/) - API gratuita de IA
- [OpenRouter](https://openrouter.ai/) - Gateway para modelos gratuitos
- [Node.js](https://nodejs.org/) - Runtime JavaScript

---

## 📞 Contato

- 📧 Email: seu-email@exemplo.com
- 💼 LinkedIn: [Seu Perfil