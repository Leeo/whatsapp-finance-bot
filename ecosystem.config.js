/**
 * Configuração do PM2 para o Bot de WhatsApp Financeiro
 * 
 * Este arquivo configura como o PM2 deve gerenciar o processo do bot,
 * garantindo que ele fique rodando 24/7 com reinicialização automática.
 */

module.exports = {
  apps: [{
    // Nome do processo (aparece nos comandos pm2)
    name: 'whatsapp-finance-bot',
    
    // Script principal a ser executado
    script: './index.js',
    
    // Número de instâncias (1 = modo single)
    instances: 1,
    
    // Modo de execução
    exec_mode: 'fork',
    
    // Não reiniciar ao detectar mudanças nos arquivos
    // (evita reconexões desnecessárias ao editar código)
    watch: false,
    
    // Reinicia se uso de memória ultrapassar 1GB
    max_memory_restart: '1G',
    
    // Variáveis de ambiente
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    
    // ============================================
    // CONFIGURAÇÕES DE RESTART AUTOMÁTICO
    // ============================================
    
    // Reinicia automaticamente se o processo morrer
    autorestart: true,
    
    // Número máximo de restarts em curto período
    max_restarts: 10,
    
    // Tempo mínimo que o app deve ficar rodando para considerar "estável"
    min_uptime: '10s',
    
    // ============================================
    // CONFIGURAÇÕES DE LOG
    // ============================================
    
    // Arquivo de log combinado (stdout + stderr)
    log_file: './logs/combined.log',
    
    // Arquivo de saída padrão (stdout)
    out_file: './logs/out.log',
    
    // Arquivo de erros (stderr)
    error_file: './logs/error.log',
    
    // Formato da data nos logs
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Mesma logs de múltiplas instâncias em um único arquivo
    merge_logs: true,
    
    // ============================================
    // CONFIGURAÇÕES AVANÇADAS
    // ============================================
    
    // Tempo máximo para matar o processo (ms)
    kill_timeout: 5000,
    
    // Tempo máximo para o app iniciar (ms)
    listen_timeout: 10000,
    
    // Delay exponencial entre tentativas de restart
    // (evita loop infinito rápido)
    exp_backoff_restart_delay: 100,
    
    // ============================================
    // CONFIGURAÇÕES DE CLUSTER (se usar modo cluster)
    // ============================================
    
    // Não usa cluster para WhatsApp (sessão única)
    // instances: 1 mantém modo single
    
    // ============================================
    // OUTRAS OPÇÕES
    // ============================================
    
    // Não mostra timestamp no console (já temos no log)
    time: false,
    
    // Interpreta o arquivo como módulo Node.js
    interpreter: 'node',
    
    // Argumentos para o Node.js
    node_args: '--max-old-space-size=1024'
  }]
};
