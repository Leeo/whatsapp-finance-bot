/**
 * 🤖 Bot de WhatsApp para Gestão Financeira - VERSÃO GOOGLE GEMINI
 * Desenvolvido com @whiskeysockets/baileys
 * Integração com Google Gemini API (GRATUITA) para processamento de imagens
 * 
 * @author Desenvolvedor Full Stack
 * @version 1.0.0
 * 
 * 🎁 VANTAGEM: Google Gemini oferece tier gratuito generoso!
 * - 15 requisições por minuto
 * - 1.000 requisições por dia
 * - Perfeito para uso pessoal/small business
 */

const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  downloadMediaMessage 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
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

// Inicialização do cliente Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configurações do bot
const CONFIG = {
  AUTH_FOLDER: './auth_info',
  TEMP_FOLDER: './temp',
  AI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash', // Modelo gratuito/recente
  CATEGORIAS: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'],
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 5000
};

let reconnectAttempts = 0;

// ============================================
// SYSTEM PROMPT PARA A IA (GEMINI)
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

IMPORTANTE: Retorne APENAS o JSON válido, sem explicações, sem markdown, sem texto adicional.`;

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
// FUNÇÕES DE PROCESSAMENTO DE IA (GEMINI)
// ============================================

/**
 * Processa imagem/documento com Google Gemini API
 * @param {string} imagePath - Caminho da imagem
 * @param {string} nomeUsuario - Nome do usuário do WhatsApp
 * @returns {Promise<Object>} - Dados extraídos
 */
async function processarComGemini(imagePath, nomeUsuario) {
  try {
    logger.info('🤖 Enviando imagem para análise do Google Gemini...');
    
    const base64Image = arquivoParaBase64(imagePath);
    const extensao = path.extname(imagePath);
    const mimeType = detectarMimeType(extensao);
    
    // Configura o modelo Gemini
    const model = genAI.getGenerativeModel({ 
      model: CONFIG.AI_MODEL,
      generationConfig: {
        temperature: 0.1, // Baixa temperatura para respostas consistentes
        maxOutputTokens: 1000,
      }
    });
    
    // Prepara o conteúdo para o Gemini
    const prompt = `${SYSTEM_PROMPT}\n\nNome do remetente do WhatsApp (use se necessário): "${nomeUsuario}"\n\nAnalise esta imagem de comprovante de pagamento/nota fiscal e extraia os dados financeiros conforme as instruções.`;
    
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      }
    };
    
    // Faz a requisição
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const respostaIA = response.text();
    
    logger.debug('Resposta bruta do Gemini:', respostaIA);
    
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
    logger.error('❌ Erro ao processar com Gemini:', error.message);
    
    // Tratamento específico de erros do Gemini
    if (error.message.includes('API key not valid')) {
      throw new Error('API Key do Gemini inválida. Verifique sua chave em https://aistudio.google.com/app/apikey');
    }
    if (error.message.includes('quota')) {
      throw new Error('Limite de requisições do Gemini atingido. Aguarde alguns minutos ou verifique seu plano.');
    }
    
    throw error;
  }
}

// ============================================
// FUNÇÕES DO WHATSAPP
// ============================================

async function iniciarBot() {
  try {
    logger.info('🚀 Iniciando Bot de Gestão Financeira (Google Gemini)...');
    logger.info('🎁 Usando Google Gemini - Tier gratuito disponível!');
    
    criarPastasNecessarias();
    
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_FOLDER);
    
    const sock = makeWASocket({
      logger: pino({ level: 'warn' }),
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
        logger.info('📱 QR Code gerado! Escaneie com seu WhatsApp:');
        qrcode.generate(qr, { small: true });
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

🎁 *Powered by Google Gemini* - Gratuito para uso pessoal!

📸 *Como usar:*
Envie uma foto do seu comprovante de pagamento, nota fiscal ou recibo.

✅ Eu vou extrair automaticamente:
• Data da compra
• Nome do estabelecimento
• Valor total pago
• Categoria do gasto
• Descrição resumida

💡 *Dica:* Quanto mais nítida a imagem, melhor o reconhecimento!
      `.trim());
      return;
    }
    
    await enviarMensagem(sock, remetente, '⏳ Processando sua imagem com Google Gemini... Aguarde um momento!');
    
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
      const dadosExtraidos = await processarComGemini(tempFilePath, pushName);
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
