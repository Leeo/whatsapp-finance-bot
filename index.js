/**
 * 🤖 Bot de WhatsApp para Gestão Financeira
 * Desenvolvido com @whiskeysockets/baileys
 * Integração com OpenAI GPT-4o Vision para processamento de imagens
 * 
 * @author Desenvolvedor Full Stack
 * @version 1.0.0
 */

const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  downloadMediaMessage 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
require('dotenv').config();

// ============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// ============================================

// Logger configurado com pino para logs estruturados
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

// Inicialização do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configurações do bot
const CONFIG = {
  // Pasta para armazenar credenciais de autenticação
  AUTH_FOLDER: './auth_info',
  // Pasta para armazenar mídias temporárias
  TEMP_FOLDER: './temp',
  // Modelo da OpenAI para análise de imagens
  AI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  // Categorias permitidas para classificação
  CATEGORIAS: ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Outros'],
  // Número máximo de tentativas de reconexão
  MAX_RECONNECT_ATTEMPTS: 5,
  // Delay entre reconexões (ms)
  RECONNECT_DELAY: 5000
};

// Contador de tentativas de reconexão
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

/**
 * Cria as pastas necessárias se não existirem
 */
function criarPastasNecessarias() {
  const pastas = [CONFIG.AUTH_FOLDER, CONFIG.TEMP_FOLDER];
  
  pastas.forEach(pasta => {
    if (!fs.existsSync(pasta)) {
      fs.mkdirSync(pasta, { recursive: true });
      logger.info(`📁 Pasta criada: ${pasta}`);
    }
  });
}

/**
 * Limpa arquivos temporários antigos
 */
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

/**
 * Converte arquivo para base64
 * @param {string} filePath - Caminho do arquivo
 * @returns {string} - String base64
 */
function arquivoParaBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
}

/**
 * Detecta o tipo MIME baseado na extensão do arquivo
 * @param {string} extensao - Extensão do arquivo
 * @returns {string} - Tipo MIME
 */
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

/**
 * Formata a resposta para o usuário
 * @param {Object} dados - Dados extraídos pela IA
 * @returns {string} - Mensagem formatada
 */
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

/**
 * Valida o JSON retornado pela IA
 * @param {Object} dados - Dados parseados
 * @returns {boolean} - Se é válido
 */
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
// FUNÇÕES DE PROCESSAMENTO DE IA
// ============================================

/**
 * Processa imagem/documento com a API da OpenAI
 * @param {string} imagePath - Caminho da imagem
 * @param {string} nomeUsuario - Nome do usuário do WhatsApp
 * @returns {Promise<Object>} - Dados extraídos
 */
async function processarComIA(imagePath, nomeUsuario) {
  try {
    logger.info('🤖 Enviando imagem para análise da OpenAI...');
    
    const base64Image = arquivoParaBase64(imagePath);
    const extensao = path.extname(imagePath);
    const mimeType = detectarMimeType(extensao);
    
    const response = await openai.chat.completions.create({
      model: CONFIG.AI_MODEL,
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
              text: `Nome do remetente do WhatsApp (use se necessário): "${nomeUsuario}"\n\nAnalise esta imagem de comprovante de pagamento/nota fiscal e extraia os dados financeiros conforme as instruções.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1 // Baixa temperatura para respostas mais consistentes
    });

    const respostaIA = response.choices[0].message.content;
    logger.debug('Resposta bruta da IA:', respostaIA);
    
    // Extrai JSON da resposta (remove markdown se presente)
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
    logger.error('❌ Erro ao processar com IA:', error.message);
    throw error;
  }
}

// ============================================
// FUNÇÕES DO WHATSAPP
// ============================================

/**
 * Inicializa a conexão com WhatsApp
 */
async function iniciarBot() {
  try {
    logger.info('🚀 Iniciando Bot de Gestão Financeira...');
    
    // Cria pastas necessárias
    criarPastasNecessarias();
    
    // Configura estado de autenticação
    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_FOLDER);
    
    // Cria socket do WhatsApp
    const sock = makeWASocket({
      logger: pino({ level: 'warn' }), // Reduz logs do baileys
      printQRInTerminal: true,
      auth: state,
      browser: ['Bot Financeiro', 'Chrome', '1.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });
    
    // Evento de atualização de credenciais
    sock.ev.on('creds.update', saveCreds);
    
    // Evento de atualização de conexão
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
      }
    });
    
    // Evento de recebimento de mensagens
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      
      // Ignora mensagens de status e do próprio bot
      if (message.key.fromMe || message.message?.protocolMessage || message.message?.senderKeyDistributionMessage) {
        return;
      }
      
      await processarMensagem(sock, message);
    });
    
    // Limpa arquivos temporários periodicamente
    setInterval(limparTemp, 30 * 60 * 1000); // A cada 30 minutos
    
  } catch (error) {
    logger.error('❌ Erro fatal ao iniciar bot:', error);
    process.exit(1);
  }
}

/**
 * Processa mensagens recebidas
 * @param {Object} sock - Socket do WhatsApp
 * @param {Object} message - Objeto da mensagem
 */
async function processarMensagem(sock, message) {
  try {
    const remetente = message.key.remoteJid;
    const pushName = message.pushName || 'Usuário';
    
    logger.info(`📩 Nova mensagem de: ${pushName} (${remetente})`);
    
    // Verifica se é uma mensagem de imagem
    const isImage = !!message.message?.imageMessage;
    const isDocument = !!message.message?.documentMessage;
    const isDocumentWithImage = isDocument && 
      ['image/jpeg', 'image/png', 'application/pdf'].includes(message.message.documentMessage.mimetype);
    
    // Mensagem de boas-vindas para texto simples
    if (!isImage && !isDocumentWithImage) {
      await enviarMensagem(sock, remetente, `
👋 *Olá, ${pushName}!*

Bem-vindo ao *Bot de Gestão Financeira*! 💰

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
    
    // Processa imagem/documento
    await enviarMensagem(sock, remetente, '⏳ Processando sua imagem... Aguarde um momento!');
    
    // Faz download da mídia
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
    
    // Determina extensão do arquivo
    let extensao = '.jpg';
    let mimetype = 'image/jpeg';
    
    if (isImage) {
      mimetype = message.message.imageMessage.mimetype;
    } else if (isDocument) {
      mimetype = message.message.documentMessage.mimetype;
    }
    
    // Mapeia MIME type para extensão
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'application/pdf': '.pdf'
    };
    extensao = mimeToExt[mimetype] || '.jpg';
    
    // Salva arquivo temporariamente
    const timestamp = Date.now();
    const tempFileName = `comprovante_${timestamp}${extensao}`;
    const tempFilePath = path.join(CONFIG.TEMP_FOLDER, tempFileName);
    
    fs.writeFileSync(tempFilePath, buffer);
    logger.info(`💾 Arquivo salvo: ${tempFilePath}`);
    
    try {
      // Processa com a IA
      const dadosExtraidos = await processarComIA(tempFilePath, pushName);
      
      // Formata e envia resposta
      const respostaFormatada = formatarResposta(dadosExtraidos);
      await enviarMensagem(sock, remetente, respostaFormatada);
      
      // Salva log da transação (opcional - para histórico)
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
      // Remove arquivo temporário
      try {
        fs.unlinkSync(tempFilePath);
        logger.debug(`🗑️ Arquivo temporário removido: ${tempFilePath}`);
      } catch (e) {
        // Ignora erro na remoção
      }
    }
    
  } catch (error) {
    logger.error('Erro ao processar mensagem:', error);
    await enviarMensagem(sock, message.key.remoteJid, '❌ Ocorreu um erro inesperado. Tente novamente mais tarde.');
  }
}

/**
 * Envia mensagem de texto
 * @param {Object} sock - Socket do WhatsApp
 * @param {string} to - ID do destinatário
 * @param {string} text - Texto da mensagem
 */
async function enviarMensagem(sock, to, text) {
  try {
    await sock.sendMessage(to, { text });
    logger.info(`📤 Mensagem enviada para: ${to}`);
  } catch (error) {
    logger.error('Erro ao enviar mensagem:', error.message);
  }
}

/**
 * Salva log da transação em arquivo JSON
 * @param {Object} dados - Dados da transação
 * @param {string} remetente - ID do remetente
 */
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

// Captura erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('❌ Exceção não tratada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Rejeição não tratada em:', promise, 'razão:', reason);
});

// Graceful shutdown
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
