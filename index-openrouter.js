/**
 * 🤖 Bot de WhatsApp para Gestão Financeira - VERSÃO OPENROUTER (GRÁTIS!)
 * Desenvolvido com @whiskeysockets/baileys
 * Integração com OpenRouter API - Modelos gratuitos com suporte a visão
 * 
 * @author Desenvolvedor Full Stack
 * @version 1.0.0
 * 
 * 🎁 VANTAGEM: OpenRouter oferece modelos gratuitos com visão!
 * - meta-llama/llama-3.2-11b-vision-instruct (recomendado)
 * - google/gemma-3-4b-it:free
 * - qwen/qwen2.5-vl-32b-instruct:free
 * 
 * Obtenha sua API Key gratuita em: https://openrouter.ai/keys
 */

const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  downloadMediaMessage 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
require('dotenv').config();

// ============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================

const logger = pino({ 
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

// Configurações do bot
const CONFIG = {
  AUTH_FOLDER: './auth_info',
  TEMP_FOLDER: './temp',
  // Modelos gratuitos no OpenRouter que suportam visão
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.2-11b-vision-instruct',
  OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
  CATEGORIAS: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'],
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 5000
};

let reconnectAttempts = 0;

// ============================================
// SYSTEM PROMPT PARA A IA
// ============================================

const SYSTEM_PROMPT = `Você é um extrator de dados financeiros especializado em processar comprovantes de pagamento, notas fiscais e recibos.

### REGRAS DE EXTRAÇÃO:

1. **IDENTIFICAÇÃO DO USUÁRIO**: 
   - Se o nome do consumidor/comprador estiver no documento, use-o.
   - Se não estiver presente, use o nome fornecido do remetente.

2. **CATEGORIZAÇÃO AUTOMÁTICA**:
   - Escolha APENAS UMA categoria da lista: [Alimentação, Transporte, Moradia, Lazer, Saúde, Outros]
   - Baseie-se no tipo de estabelecimento e descrição do gasto.

3. **EXTRAÇÃO DE VALORES**:
   - Ignore taxas, juros futuros, multas e valores parcelados.
   - Capture SEMPRE o valor TOTAL PAGO/FINAL.
   - Remova símbolos de moeda (R$, $, etc).
   - Use PONTO como separador decimal (ex: 150.50).

4. **DATA DO PAGAMENTO**:
   - Extraia a data da transação no formato DD/MM/AAAA.
   - Se houver apenas hora, use a data atual.

5. **ESTABELECIMENTO**:
   - Nome completo do estabelecimento/empresa.
   - Remova CNPJ e informações desnecessárias.

6. **DESCRIÇÃO CURTA**:
   - Resuma em até 5 palavras o que foi comprado/serviço.

### SAÍDA OBRIGATÓRIA (JSON PURO - SEM MARKDOWN):
{
  "data": "DD/MM/AAAA",
  "usuario": "String",
  "estabelecimento": "String",
  "valor": 00.00,
  "categoria": "String",
  "descricao_curta": "String"
}

IMPORTANTE: Retorne APENAS o JSON válido, sem explicações, sem markdown (\`\`\`), sem texto adicional.`;

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function criarPastasNecessarias() {
  const pastas = [CONFIG.AUTH_FOLDER, CONFIG.TEMP_FOLDER];
  pastas.forEach(pasta => {
    if (!fs.existsSync(pasta)) {
      fs.mkdirSync(pasta, { recursive: true });
      logger.info(`📁 Pasta criada: ${pasta}`);
    }
  });
}

function limparTemp() {
  try {
    const files = fs.readdirSync(CONFIG.TEMP_FOLDER);
    const agora = Date.now();
    const UMA_HORA = 60 * 60 * 1000;
    
    files.forEach(file => {
      const filePath = path.join(CONFIG.TEMP_FOLDER, file);
      const stats = fs.statSync(filePath);
      if (agora - stats.mtime.getTime() > UMA_HORA) {
        fs.unlinkSync(filePath);
        logger.debug(`🗑️ Arquivo temporário removido: ${file}`);
      }
    });
  } catch (error) {
    logger.error('Erro ao limpar pasta temp:', error.message);
  }
}

function arquivoParaBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

function detectarMimeType(extensao) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.webp': 'image/webp'
  };
  return mimeTypes[extensao.toLowerCase()] || 'image/jpeg';
}

function formatarResposta(dados) {
  const emojiCategoria = {
    'Alimentação': '🍽️',
    'Transporte': '🚗',
    'Moradia': '🏠',
    'Lazer': '🎮',
    'Saúde': '💊',
    'Outros': '📦'
  };
  const emoji = emojiCategoria[dados.categoria] || '💰';

  return `
✅ *Gasto Registrado com Sucesso!*

📅 *Data:* ${dados.data}
👤 *Usuário:* ${dados.usuario}
🏪 *Estabelecimento:* ${dados.estabelecimento}
💵 *Valor:* R$ ${dados.valor.toFixed(2).replace('.', ',')}
${emoji} *Categoria:* ${dados.categoria}
📝 *Descrição:* ${dados.descricao_curta}

💡 Dica: Envie outro comprovante para continuar registrando seus gastos!
  `.trim();
}

function validarDados(dados) {
  const camposObrigatorios = ['data', 'usuario', 'estabelecimento', 'valor', 'categoria', 'descricao_curta'];
  
  for (const campo of camposObrigatorios) {
    if (!(campo in dados)) {
      throw new Error(`Campo obrigatório ausente: ${campo}`);
    }
  }
  
  if (typeof dados.valor !== 'number' || dados.valor <= 0) {
    throw new Error('Valor deve ser um número positivo');
  }
  
  if (!CONFIG.CATEGORIAS.includes(dados.categoria)) {
    throw new Error(`Categoria inválida: ${dados.categoria}`);
  }
  
  return true;
}

// ============================================
// FUNÇÕES DE PROCESSAMENTO DE IA (OPENROUTER)
// ============================================

/**
 * Processa imagem/documento com OpenRouter API
 * @param {string} imagePath - Caminho da imagem
 * @param {string} nomeUsuario - Nome do usuário do WhatsApp
 * @returns {Promise<Object>} - Dados extraídos
 */
async function processarComOpenRouter(imagePath, nomeUsuario) {
  try {
    logger.info('🤖 Enviando imagem para análise via OpenRouter...');
    logger.info(`📝 Modelo: ${CONFIG.OPENROUTER_MODEL}`);
    
    const base64Image = arquivoParaBase64(imagePath);
    const extensao = path.extname(imagePath);
    const mimeType = detectarMimeType(extensao);
    
    // Prepara a requisição para OpenRouter
    const requestBody = {
      model: CONFIG.OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Nome do remetente do WhatsApp (use se necessário): "${nomeUsuario}"\n\nAnalise esta imagem de comprovante de pagamento/nota fiscal e extraia os dados financeiros conforme as instruções. Retorne APENAS o JSON solicitado.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    };
    
    // Faz a requisição para OpenRouter
    const response = await fetch(CONFIG.OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://localhost',
        'X-Title': 'WhatsApp Finance Bot'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Resposta inválida da OpenRouter API');
    }
    
    const respostaIA = data.choices[0].message.content;
    logger.debug('Resposta bruta do OpenRouter:', respostaIA);
    
    // Extrai JSON da resposta
    let jsonString = respostaIA;
    
    // Remove blocos de código markdown se existirem
    const match = respostaIA.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonString = match[1].trim();
    }
    
    // Tenta parsear o JSON
    let dados;
    try {
      dados = JSON.parse(jsonString);
    } catch (parseError) {
      logger.error('Erro ao parsear JSON:', parseError.message);
      logger.error('Conteúdo recebido:', jsonString);
      throw new Error('A IA retornou um formato inválido. Tente enviar uma imagem mais clara.');
    }
    
    // Valida os dados
    validarDados(dados);
    
    logger.info('✅ Dados extraídos com sucesso:', dados);
    return dados;
    
  } catch (error) {
    logger.error('❌ Erro ao processar com OpenRouter:', error.message);
    
    // Tratamento específico de erros
    if (error.message.includes('401')) {
      throw new Error('API Key do OpenRouter inválida. Verifique sua chave em https://openrouter.ai/keys');
    }
    if (error.message.includes('429')) {
      throw new Error('Limite de requisições atingido. Aguarde um momento ou verifique seu plano em https://openrouter.ai/settings/limits');
    }
    if (error.message.includes('402')) {
      throw new Error('Créditos insuficientes. O modelo gratuito pode ter atingido o limite diário. Tente outro modelo ou aguarde.');
    }
    if (error.message.includes('model')) {
      throw new Error(`Modelo não encontrado ou indisponível: ${CONFIG.OPENROUTER_MODEL}. Verifique se o modelo suporta visão.`);
    }
    
    throw error;
  }
}

// ============================================
// FUNÇÕES DO WHATSAPP
// ============================================

async function iniciarBot() {
  try {
    logger.info('🚀 Iniciando Bot de Gestão Financeira (OpenRouter - GRÁTIS!)...');
    logger.info('🎁 Usando OpenRouter com modelo gratuito de visão!');
    logger.info(`🤖 Modelo: ${CONFIG.OPENROUTER_MODEL}`);
    
    // Verifica se a API Key está configurada
    if (!process.env.OPENROUTER_API_KEY) {
      logger.error('❌ OPENROUTER_API_KEY não configurada!');
      logger.info('💡 Obtenha sua API Key gratuita em: https://openrouter.ai/keys');
      process.exit(1);
    }
    
    criarPastasNecessarias();
    
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_FOLDER);
    
    const sock = makeWASocket({
      logger: pino({ level: 'warn' }),
      printQRInTerminal: true,
      auth: state,
      browser: ['Bot Financeiro', 'Chrome', '1.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        logger.info('📱 QR Code gerado! Escaneie com seu WhatsApp.');
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;
        
        logger.warn('Conexão fechada. Motivo:', lastDisconnect?.error?.message || 'Desconhecido');
        
        if (shouldReconnect && reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          logger.info(`🔄 Tentando reconectar... (${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            iniciarBot();
          }, CONFIG.RECONNECT_DELAY);
        } else {
          logger.error('❌ Número máximo de tentativas atingido ou logout realizado.');
          process.exit(1);
        }
      } else if (connection === 'open') {
        reconnectAttempts = 0;
        logger.info('✅ Bot conectado com sucesso ao WhatsApp!');
        logger.info(`📱 Número conectado: ${sock.user.id.split(':')[0]}`);
        logger.info('🤖 Pronto para processar comprovantes!');
      }
    });
    
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      
      if (message.key.fromMe || message.message?.protocolMessage || message.message?.senderKeyDistributionMessage) {
        return;
      }
      
      await processarMensagem(sock, message);
    });
    
    setInterval(limparTemp, 30 * 60 * 1000);
    
  } catch (error) {
    logger.error('❌ Erro fatal ao iniciar bot:', error);
    process.exit(1);
  }
}

async function processarMensagem(sock, message) {
  try {
    const remetente = message.key.remoteJid;
    const pushName = message.pushName || 'Usuário';
    
    logger.info(`📩 Nova mensagem de: ${pushName} (${remetente})`);
    
    const isImage = !!message.message?.imageMessage;
    const isDocument = !!message.message?.documentMessage;
    const isDocumentWithImage = isDocument && 
      ['image/jpeg', 'image/png', 'application/pdf'].includes(message.message.documentMessage.mimetype);
    
    if (!isImage && !isDocumentWithImage) {
      await enviarMensagem(sock, remetente, `
👋 *Olá, ${pushName}!*

Bem-vindo ao *Bot de Gestão Financeira*! 💰

🎁 *Powered by OpenRouter* - Modelos gratuitos!

📸 *Como usar:*
Envie uma foto do seu comprovante de pagamento, nota fiscal ou recibo.

✅ Eu vou extrair automaticamente:
• Data da compra
• Nome do estabelecimento
• Valor total pago
• Categoria do gasto
• Descrição resumida

💡 *Dica:* Quanto mais nítida a imagem, melhor o reconhecimento!

⚙️ *Modelo atual:* ${CONFIG.OPENROUTER_MODEL}
      `.trim());
      return;
    }
    
    await enviarMensagem(sock, remetente, '⏳ Processando sua imagem via OpenRouter... Aguarde um momento!');
    
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger,
        reuploadRequest: sock.updateMediaMessage
      }
    );
    
    if (!buffer) {
      await enviarMensagem(sock, remetente, '❌ Não foi possível baixar a imagem. Tente enviar novamente.');
      return;
    }
    
    let extensao = '.jpg';
    let mimetype = 'image/jpeg';
    
    if (isImage) {
      mimetype = message.message.imageMessage.mimetype;
    } else if (isDocument) {
      mimetype = message.message.documentMessage.mimetype;
    }
    
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf'
    };
    extensao = mimeToExt[mimetype] || '.jpg';
    
    const timestamp = Date.now();
    const tempFileName = `comprovante_${timestamp}${extensao}`;
    const tempFilePath = path.join(CONFIG.TEMP_FOLDER, tempFileName);
    
    fs.writeFileSync(tempFilePath, buffer);
    logger.info(`💾 Arquivo salvo: ${tempFilePath}`);
    
    try {
      const dadosExtraidos = await processarComOpenRouter(tempFilePath, pushName);
      const respostaFormatada = formatarResposta(dadosExtraidos);
      await enviarMensagem(sock, remetente, respostaFormatada);
      salvarLogTransacao(dadosExtraidos, remetente);
      
    } catch (iaError) {
      logger.error('Erro no processamento da IA:', iaError.message);
      await enviarMensagem(sock, remetente, `
❌ *Não foi possível processar a imagem*

Motivo: ${iaError.message}

💡 *Dicas para melhorar o reconhecimento:*
• Envie a imagem com boa iluminação
• Certifique-se que o texto está legível
• Evite cortar informações importantes
• Tente enviar em outro ângulo

🔄 *Alternativas:*
• Tente outro modelo gratuito no .env
• Verifique seus créditos em: https://openrouter.ai/settings/limits

Envie a imagem novamente ou tente outra foto.
      `.trim());
    } finally {
      try {
        fs.unlinkSync(tempFilePath);
        logger.debug(`🗑️ Arquivo temporário removido: ${tempFilePath}`);
      } catch (e) {}
    }
    
  } catch (error) {
    logger.error('Erro ao processar mensagem:', error);
    await enviarMensagem(sock, message.key.remoteJid, '❌ Ocorreu um erro inesperado. Tente novamente mais tarde.');
  }
}

async function enviarMensagem(sock, to, text) {
  try {
    await sock.sendMessage(to, { text });
    logger.info(`📤 Mensagem enviada para: ${to}`);
  } catch (error) {
    logger.error('Erro ao enviar mensagem:', error.message);
  }
}

function salvarLogTransacao(dados, remetente) {
  try {
    const logFile = './transacoes.json';
    let transacoes = [];
    
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, 'utf8');
      transacoes = JSON.parse(content);
    }
    
    transacoes.push({
      ...dados,
      remetente,
      timestamp: new Date().toISOString()
    });
    
    fs.writeFileSync(logFile, JSON.stringify(transacoes, null, 2));
    logger.info('📝 Transação salva no log');
  } catch (error) {
    logger.error('Erro ao salvar log:', error.message);
  }
}

// ============================================
// TRATAMENTO DE ERROS E SHUTDOWN
// ============================================

process.on('uncaughtException', (error) => {
  logger.error('❌ Exceção não tratada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Rejeição não tratada em:', promise, 'razão:', reason);
});

process.on('SIGINT', () => {
  logger.info('\n👋 Bot encerrado pelo usuário (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n👋 Bot encerrado (SIGTERM)');
  process.exit(0);
});

// ============================================
// INICIALIZAÇÃO
// ============================================

iniciarBot();
