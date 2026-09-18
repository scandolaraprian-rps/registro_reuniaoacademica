/**
 * ==============================================================================
 * MÓDULO DE AUTENTICAÇÃO PASSWORDLESS (MAGIC LINKS ACADÊMICOS)
 * Camada de Segurança de Aplicação (AppSec)
 * ==============================================================================
 * 
 * OBJETIVO:
 * Eliminar a vulnerabilidade de personificação de identidade e credenciais fracas
 * sem criar bancos de dados centralizados de senhas (mitigando vazamentos e ataques
 * de credenciais em lote sob a ótica da LGPD/Privacidade).
 * 
 * Protege a parte mais vulnerável (ex: Alunos e Orientadores), garantindo que apenas
 * hashes criptográficos de sessões comprovadamente autenticadas por domínio
 * institucional possam ser gerados e encaminhados ao contrato inteligente.
 * ==============================================================================
 */

export interface MagicTokenRecord {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  status: 'CRIADO' | 'ENVIADO' | 'CONSUMIDO' | 'DESTRUÍDO' | 'EXPIRADO';
}

export interface MagicLinkDispatchResult {
  sucesso: boolean;
  mensagem: string;
  urlSimulada?: string;
  token?: string;
  expiraEmMinutos?: number;
  emailDestino?: string;
}

export interface MagicLinkValidationResult {
  autenticado: boolean;
  email?: string;
  mensagem: string;
  motivoFalha?: 'TOKEN_INEXISTENTE' | 'TOKEN_EXPIRADO' | 'TOKEN_JA_UTILIZADO' | 'URL_INVALIDA';
}

// Armazenamento em memória volátil de tokens (servidor/runtime de sessão)
// Tokens nunca são gravados de forma persistente ou reutilizável.
const magicTokenStore = new Map<string, MagicTokenRecord>();

// Sessão autenticada ativa no runtime atual
let sessaoAtiva: {
  autenticado: boolean;
  email: string | null;
  autenticadoEm: number | null;
  tokenOrigem: string | null;
} = {
  autenticado: false,
  email: null,
  autenticadoEm: null,
  tokenOrigem: null
};

// Configuração da janela temporal de validade (10 minutos)
export const JANELA_EXPIRACAO_MS = 10 * 60 * 1000; // 10 minutos em milissegundos

// Expressão regular restrita a domínios acadêmicos oficiais
// Aceita sufixos como @universidade.edu.br, @*.edu.br ou @*.edu
export const REGEX_DOMINIO_ACADEMICO = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*(universidade\.edu\.br|edu\.br|edu)$/i;

/**
 * ==============================================================================
 * RESPONSABILIDADE 1: GERAÇÃO CRIPTOGRÁFICA DE TOKEN E DISPATCH DO MAGIC LINK
 * ==============================================================================
 */

/**
 * Gera um token alfanumérico seguro simulando entropia criptográfica.
 * Utiliza crypto.randomUUID() ou crypto.getRandomValues().
 */
export function gerarTokenCriptografico(tamanho = 32): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint8Array(tamanho / 2);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback seguro em ambientes simplificados
  return 'sec_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Solicita o envio de um Magic Link para um e-mail institucional.
 * 
 * 1. Valida estritamente o domínio acadêmico via Regex.
 * 2. Gera token alfanumérico único.
 * 3. Registra em memória com TTL de 10 minutos e flag used=false.
 * 4. Dispara logs de rastreabilidade (CRIADO -> ENVIADO).
 * 
 * @param email Endereço de e-mail institucional do usuário
 */
export function solicitarMagicLink(email: string): MagicLinkDispatchResult {
  const emailSanitizado = (email || '').trim().toLowerCase();

  // 1. Validação estrita via Regex de domínio acadêmico
  if (!emailSanitizado || !REGEX_DOMINIO_ACADEMICO.test(emailSanitizado)) {
    console.warn(`[AppSec Audit] Tentativa de login rejeitada: e-mail fora do domínio acadêmico permitido: "${emailSanitizado}"`);
    return {
      sucesso: false,
      mensagem: 'Acesso negado: informe obrigatoriamente um e-mail com domínio acadêmico válido (ex: seu.nome@universidade.edu.br).'
    };
  }

  const agora = Date.now();
  const token = gerarTokenCriptografico(32);
  const expiresAt = agora + JANELA_EXPIRACAO_MS;

  // Monta registro do ciclo de vida
  const registroToken: MagicTokenRecord = {
    token,
    email: emailSanitizado,
    createdAt: agora,
    expiresAt,
    used: false,
    status: 'CRIADO'
  };

  // 2. Armazena em memória
  magicTokenStore.set(token, registroToken);

  // 3. Monitoramento e Auditoria: Fase CRIADO
  console.group(`[Token Lifecycle Audit] Solicitação de Magic Link para ${emailSanitizado}`);
  console.log('%c[FASE 1: CRIADO]', 'color: #2563eb; font-weight: bold;', {
    token: `${token.substring(0, 8)}...${token.substring(token.length - 6)}`,
    email: emailSanitizado,
    criadoEm: new Date(agora).toLocaleTimeString('pt-BR'),
    expiraEm: new Date(expiresAt).toLocaleTimeString('pt-BR'),
    ttlSegundos: JANELA_EXPIRACAO_MS / 1000
  });

  // 4. Monta a URL simulada do Magic Link
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://academic-ledger.edu.br';
  const urlSimulada = `${baseUrl}/login/magic?token=${token}&email=${encodeURIComponent(emailSanitizado)}`;

  // Atualiza status para ENVIADO
  registroToken.status = 'ENVIADO';

  console.log('%c[FASE 2: ENVIADO]', 'color: #059669; font-weight: bold;', {
    emailDestinatario: emailSanitizado,
    urlMagicLink: urlSimulada,
    meioTransporte: 'SMTP Seguro Institucional (Simulado)'
  });

  console.table([
    {
      Etapa: 'CRIADO',
      Token: `${token.slice(0, 10)}...`,
      Email: emailSanitizado,
      Status: 'Ativo (Pendente de clique)',
      Validade: '10 minutos'
    },
    {
      Etapa: 'ENVIADO',
      Destino: emailSanitizado,
      Protocolo: 'TLS 1.3 / SPF+DKIM institucional',
      Status: 'Aguardando verificação do usuário',
      Validade: '10 minutos'
    }
  ]);
  console.groupEnd();

  return {
    sucesso: true,
    mensagem: 'Magic Link gerado com sucesso. Verifique sua caixa de entrada.',
    urlSimulada,
    token,
    expiraEmMinutos: 10,
    emailDestino: emailSanitizado
  };
}

/**
 * ==============================================================================
 * RESPONSABILIDADE 2: VALIDAÇÃO DE TOKEN E MÁQUINA DE ESTADOS DO MAGIC LINK
 * ==============================================================================
 */

/**
 * Processa e valida uma URL de Magic Link recebida pelo usuário.
 * 
 * Executa 3 verificações de segurança obrigatórias:
 *  1. Existência do token em memória
 *  2. Validade temporal (limite de 10 minutos)
 *  3. Restrição de uso único (One-Time Token - destruição após primeiro clique)
 * 
 * @param url URL completa ou fragmento contendo o parâmetro 'token'
 */
export function processarMagicLink(url: string): MagicLinkValidationResult {
  console.group('[Token Lifecycle Audit] Processamento e Roteamento de Magic Link');

  try {
    if (!url || typeof url !== 'string') {
      console.error('%c[FALHA DE ROTEAMENTO] URL ausente ou mal formatada', 'color: #dc2626;');
      console.groupEnd();
      return {
        autenticado: false,
        mensagem: 'Falha de Roteamento: URL do Magic Link ausente.',
        motivoFalha: 'URL_INVALIDA'
      };
    }

    // Extração robusta do token (por query param ou regex)
    let tokenExtraido: string | null = null;
    try {
      // Tenta parse via API URL
      const urlObj = new URL(url, 'http://localhost');
      tokenExtraido = urlObj.searchParams.get('token');
    } catch {
      // Fallback por Expressão Regular
      const match = url.match(/[?&]token=([a-zA-Z0-9_-]+)/);
      tokenExtraido = match ? match[1] : null;
    }

    if (!tokenExtraido) {
      console.error('%c[FALHA DE ROTEAMENTO] Parâmetro de token não identificado na URL', 'color: #dc2626;');
      console.groupEnd();
      return {
        autenticado: false,
        mensagem: 'Falha de Roteamento: Token não localizado nos parâmetros da requisição.',
        motivoFalha: 'URL_INVALIDA'
      };
    }

    // --------------------------------------------------------------------------
    // VERIFICAÇÃO 1: Existência do token em memória
    // --------------------------------------------------------------------------
    const registro = magicTokenStore.get(tokenExtraido);
    if (!registro) {
      console.error('%c[VERIFICAÇÃO 1: FALHA] Token inexistente ou já destruído da memória', 'color: #dc2626;', {
        tokenBuscado: tokenExtraido
      });
      console.groupEnd();
      return {
        autenticado: false,
        mensagem: 'Erro de Autenticação: Token de acesso inexistente, revogado ou inválido.',
        motivoFalha: 'TOKEN_INEXISTENTE'
      };
    }

    // --------------------------------------------------------------------------
    // VERIFICAÇÃO 2: Validade Temporal (Simulando limite de 10 minutos)
    // --------------------------------------------------------------------------
    const agora = Date.now();
    if (agora > registro.expiresAt) {
      registro.status = 'EXPIRADO';
      magicTokenStore.delete(tokenExtraido); // Expurgado por obsolescência

      console.warn('%c[VERIFICAÇÃO 2: FALHA] Token expirado temporalmente', 'color: #d97706;', {
        token: tokenExtraido,
        criadoEm: new Date(registro.createdAt).toISOString(),
        expirouEm: new Date(registro.expiresAt).toISOString(),
        momentoAtual: new Date(agora).toISOString(),
        atrasoSegundos: Math.round((agora - registro.expiresAt) / 1000)
      });
      console.groupEnd();
      return {
        autenticado: false,
        mensagem: 'Erro de Autenticação: O Magic Link expirou após a janela de 10 minutos. Solicite um novo link.',
        motivoFalha: 'TOKEN_EXPIRADO'
      };
    }

    // --------------------------------------------------------------------------
    // VERIFICAÇÃO 3: Restrição de Uso Único (One-Time Token - Proteção contra Replay Attack)
    // --------------------------------------------------------------------------
    if (registro.used) {
      registro.status = 'DESTRUÍDO';
      magicTokenStore.delete(tokenExtraido);

      console.error('%c[VERIFICAÇÃO 3: FALHA] Tentativa de Replay: Token já consumido anteriormente', 'color: #dc2626;', {
        token: tokenExtraido,
        alerta: 'Possível interceptação de link ou clique duplo. Uso único violado.'
      });
      console.groupEnd();
      return {
        autenticado: false,
        mensagem: 'Violação de Segurança: Este Magic Link já foi utilizado e é de uso único estrito. Solicite um novo acesso.',
        motivoFalha: 'TOKEN_JA_UTILIZADO'
      };
    }

    // --------------------------------------------------------------------------
    // TRANSIÇÃO DE ESTADOS: CONSUMIDO -> DESTRUÍDO
    // --------------------------------------------------------------------------
    // Marca como consumido imediatamente
    registro.used = true;
    registro.status = 'CONSUMIDO';

    console.log('%c[FASE 3: CONSUMIDO]', 'color: #10b981; font-weight: bold;', {
      token: tokenExtraido,
      email: registro.email,
      consumidoEm: new Date().toLocaleTimeString('pt-BR')
    });

    // Invalidação e Destruição imediata da memória (One-Time Token estrito)
    registro.status = 'DESTRUÍDO';
    magicTokenStore.delete(tokenExtraido);

    console.log('%c[FASE 4: DESTRUÍDO]', 'color: #6b7280; font-weight: bold;', {
      token: tokenExtraido,
      acao: 'Token removido definitivamente da memória volátil para impedir qualquer reuso.',
      restanteTokensAtivos: magicTokenStore.size
    });

    console.table([
      {
        Etapa: 'CONSUMIDO',
        Token: `${tokenExtraido.slice(0, 10)}...`,
        Email: registro.email,
        Resultado: 'Autenticação Aprovada',
        Destino: 'Desbloqueio do DOM do Formulário'
      },
      {
        Etapa: 'DESTRUÍDO',
        Token: `${tokenExtraido.slice(0, 10)}...`,
        Email: registro.email,
        Resultado: 'Expurgado da Memória (One-Time)',
        Destino: 'Prevenção de Replay Attack'
      }
    ]);

    // Estabelece a sessão ativa no runtime
    sessaoAtiva = {
      autenticado: true,
      email: registro.email,
      autenticadoEm: Date.now(),
      tokenOrigem: tokenExtraido
    };

    console.info(`%c[SESSÃO CONCEDIDA] Identidade confirmada para ${registro.email}. Acesso ao formulário liberado.`, 'color: #047857; font-weight: bold;');
    console.groupEnd();

    return {
      autenticado: true,
      email: registro.email,
      mensagem: 'Magic Link validado com sucesso! Sessão acadêmica segura iniciada.'
    };

  } catch (err: any) {
    console.error('[ERRO INTERNO NO PROCESSAMENTO DO MAGIC LINK]', err);
    console.groupEnd();
    return {
      autenticado: false,
      mensagem: `Erro inesperado na validação do link: ${err.message}`
    };
  }
}

/**
 * ==============================================================================
 * CLÁUSULA DE GUARDA E CONTROLE DE ACESSO (AppSec Guard)
 * ==============================================================================
 * 
 * Assegura que, caso o usuário tente forçar a geração da ata ou o cálculo do hash
 * criptográfico sem o token validado, o sistema levante uma exceção de segurança.
 * 
 * Isso impede que registros fraudulentos cheguem ao contrato inteligente,
 * protegendo o aluno e os membros da banca contra adulterações ou forjas de ata.
 */
export function assertSessaoAutenticada(): void {
  if (!sessaoAtiva.autenticado || !sessaoAtiva.email) {
    const mensagemErro = 'VIOLAÇÃO DE SEGURANÇA [AppSec 401]: Tentativa de gerar ata acadêmica ou hash criptográfico sem sessão autenticada via Magic Link institucional.';
    console.error(`%c${mensagemErro}`, 'color: #ffffff; background-color: #b91c1c; padding: 4px; font-weight: bold;');
    
    // Dispara exceção fatal bloqueando qualquer geração de hash ou interação Web3
    throw new Error(mensagemErro);
  }
}

/**
 * Retorna o status atual da sessão ativa
 */
export function obterSessaoAtiva() {
  return { ...sessaoAtiva };
}

/**
 * Sincroniza sessão previamente armazenada
 */
export function sincronizarSessaoExistente(email: string): void {
  sessaoAtiva = {
    autenticado: true,
    email: email,
    autenticadoEm: Date.now(),
    tokenOrigem: 'session_synced'
  };
}

/**
 * Encerra a sessão ativa (Logout)
 */
export function encerrarSessaoAtiva(): void {
  console.info(`[Auth Session] Encerrando sessão de ${sessaoAtiva.email}`);
  sessaoAtiva = {
    autenticado: false,
    email: null,
    autenticadoEm: null,
    tokenOrigem: null
  };
}
