/**
 * ==============================================================================
 * MOTOR DE AUDITORIA E BENCHMARK DE RESPOSTA DO MAGIC LINK
 * Métrica Auditada: Tempo de Resposta e Indicador de Atrito de Assinatura
 * Arquivo: src/utils/magicLinkResponseAuditor.ts
 * ==============================================================================
 * 
 * OBJETIVO METROLÓGICO:
 * Auditar com precisão de alta resolução (performance.now):
 * 1. O momento exato em que o serviço de mensageria despacha o token do Magic Link (t_dispatch).
 * 2. A simulação da interação humana do signatário acadêmico (leitura, conferência
 *    do hash e submissão da aprovação/rejeição) introduzindo atrasos randomizados (t_approval).
 * 3. O cálculo do intervalo individual Delta_t = t_approval - t_dispatch.
 * 4. A agregação estatística com cálculo de Média (mu), Mediana (Q2), Desvio Padrão (sigma),
 *    Percentis (P90, P95) e o Índice de Atrito Operacional.
 * 5. Emissão de alertas explícitos de SLA institucional quando a média ultrapassar
 *    o Limite Superior de Controle (USL - Upper Specification Limit).
 * ==============================================================================
 */

import { gerarTokenCriptografico, JANELA_EXPIRACAO_MS } from './magicLinkAuth';

// ------------------------------------------------------------------------------
// TIPOS E MODELOS DE DADOS
// ------------------------------------------------------------------------------

export type DecisaoSignatario = 'APROVADA' | 'REJEITADA';

export interface AcademicSignerProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  baseDelayMs: number;
  jitterMs: number;
  rejectProbability?: number;
  rejectReason?: string;
}

export interface MagicLinkDispatchEvent {
  dispatchId: string;
  proposalId: string;
  participantId: string;
  signerName: string;
  signerRole: string;
  signerEmail: string;
  token: string;
  magicLinkUrl: string;
  tDispatch: number; // performance.now()
  timestampIso: string;
  smtpServer: {
    messageId: string;
    smtpLatencyMs: number;
    status: 'ENTREGUE' | 'EM_FILA';
  };
}

export interface SignerInteractionEvent {
  interactionId: string;
  dispatchId: string;
  participantId: string;
  tClick: number;
  tApproval: number; // performance.now()
  action: DecisaoSignatario;
  justificativa?: string;
  readingDwellMs: number;
  networkJitterMs: number;
  userAgentSimulado: string;
}

export interface SignerResponseMetric {
  participantId: string;
  signerName: string;
  signerRole: string;
  signerEmail: string;
  tDispatch: number;
  tApproval: number;
  responseTimeMs: number; // t_approval - t_dispatch
  action: DecisaoSignatario;
  justificativa?: string;
  withinSla: boolean;
  slaLimitMs: number;
}

export type NivelAtrito = 'BAIXO_FLUIDO' | 'MODERADO_NOMINAL' | 'ALTO_ATRITO' | 'CRITICO_GARGALO';

export interface BatchResponseSummary {
  batchId: string;
  batchName: string;
  description: string;
  timestamp: string;
  totalSigners: number;
  approvedCount: number;
  rejectedCount: number;
  meanMs: number;       // Média (mu)
  medianMs: number;     // Mediana (Q2)
  stdDevMs: number;     // Desvio Padrão (sigma)
  varianceMs: number;   // Variância
  minMs: number;        // Menor tempo
  maxMs: number;        // Maior tempo
  p90Ms: number;        // 90º percentil
  p95Ms: number;        // 95º percentil
  frictionIndex: number; // Pontuação normalizada 0 a 100
  frictionLevel: NivelAtrito;
  slaThresholdMs: number; // Limite de controle institucional
  slaCompliant: boolean;  // true se meanMs <= slaThresholdMs
  slaStatus: 'CONFORME_SLA' | 'ALERTA_SLA_EXCEDIDO';
  deltaSlaMs: number;     // meanMs - slaThresholdMs (positivo se excedido)
  signers: SignerResponseMetric[];
}

export interface CohortBatchConfig {
  batchId: string;
  batchName: string;
  description?: string;
  slaLimitMs?: number;
  signers: AcademicSignerProfile[];
  proposalId?: string;
  documentHash?: string;
}

// ------------------------------------------------------------------------------
// PERFIS ACADÊMICOS PADRÃO PARA SIMULAÇÃO DE COMPORTAMENTO HUMANO
// ------------------------------------------------------------------------------

export const PERFIS_ACADEMICOS_EXEMPLO: AcademicSignerProfile[] = [
  {
    id: 'prof_coord',
    name: 'Dra. Maria Helena Ramos',
    role: 'Coordenadora de Colegiado',
    email: 'm.ramos@universidade.edu.br',
    baseDelayMs: 350,
    jitterMs: 120,
    rejectProbability: 0
  },
  {
    id: 'prof_titular',
    name: 'Dr. Roberto Santos Guimarães',
    role: 'Professor Titular / Decano',
    email: 'r.guimaraes@universidade.edu.br',
    baseDelayMs: 1100,
    jitterMs: 350,
    rejectProbability: 0
  },
  {
    id: 'sec_academico',
    name: 'Fernanda Albuquerque Lima',
    role: 'Secretária de Reuniões',
    email: 'f.lima@universidade.edu.br',
    baseDelayMs: 250,
    jitterMs: 80,
    rejectProbability: 0
  },
  {
    id: 'rep_discente',
    name: 'Lucas Pereira Duarte',
    role: 'Representante Discente Pós-Graduação',
    email: 'l.duarte@aluno.universidade.edu.br',
    baseDelayMs: 650,
    jitterMs: 200,
    rejectProbability: 0
  },
  {
    id: 'prof_avaliador_ext',
    name: 'Dra. Beatriz Fontana',
    role: 'Avaliadora Externa de Banca',
    email: 'b.fontana@externo.edu.br',
    baseDelayMs: 1600,
    jitterMs: 450,
    rejectProbability: 0
  }
];

export const PERFIS_COM_ALTO_ATRITO: AcademicSignerProfile[] = [
  {
    id: 'prof_sobrecarregado_1',
    name: 'Dr. Afonso Henriques',
    role: 'Diretor de Centro de Pesquisa',
    email: 'a.henriques@universidade.edu.br',
    baseDelayMs: 3800,
    jitterMs: 600,
    rejectProbability: 0.1
  },
  {
    id: 'prof_sobrecarregado_2',
    name: 'Dra. Solange Menezes',
    role: 'Membro de Comitê de Ética',
    email: 's.menezes@universidade.edu.br',
    baseDelayMs: 4400,
    jitterMs: 800,
    rejectProbability: 0.2,
    rejectReason: 'Divergência de quorum no anexo orçamentário da pauta.'
  },
  {
    id: 'rep_externo_atrasado',
    name: 'Carlos Eduardo Brandão',
    role: 'Representante da Indústria Conveniada',
    email: 'c.brandao@instituto.edu.br',
    baseDelayMs: 4900,
    jitterMs: 950,
    rejectProbability: 0
  }
];

// Limites operacionais de SLA institucionais (em ms para o ambiente simulado)
export const SLA_INSTITUCIONAL_PADRAO_MS = 2500; // 2.5s no ambiente de teste automatizado

// ------------------------------------------------------------------------------
// RESPONSABILIDADE 1: MOCK DO SERVIÇO DE MENSAGERIA INSTITUCIONAL
// ------------------------------------------------------------------------------

export class MockMessagingService {
  private dispatchLog: MagicLinkDispatchEvent[] = [];

  /**
   * Despacha o e-mail contendo o Magic Link e captura o timestamp exato de saída (t_dispatch)
   */
  public async dispatchMagicLink(params: {
    proposalId: string;
    signer: AcademicSignerProfile;
    documentHash?: string;
  }): Promise<MagicLinkDispatchEvent> {
    const token = gerarTokenCriptografico(32);
    const proposalId = params.proposalId || `prop_sim_${Date.now()}`;
    const docHash = params.documentHash || '0x4f83b4c9e8912e5a7b6c310248a31e892c90fae14523bb89c470123ef890abcd';

    // Simula a latência de handshake SMTP institucional (5 a 25ms)
    const smtpLatency = 5 + Math.floor(Math.random() * 20);
    await new Promise(resolve => setTimeout(resolve, smtpLatency));

    // Captura o timestamp exato do envio do e-mail no servidor de despacho
    const tDispatch = performance.now();
    const timestampIso = new Date().toISOString();

    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
      : 'https://academic-ledger.edu.br';
    const magicLinkUrl = `${baseUrl}/?route=multisig/attest&proposal=${proposalId}&partId=${params.signer.id}&token=${token}&hash=${docHash}`;

    const dispatchEvent: MagicLinkDispatchEvent = {
      dispatchId: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      proposalId,
      participantId: params.signer.id,
      signerName: params.signer.name,
      signerRole: params.signer.role,
      signerEmail: params.signer.email,
      token,
      magicLinkUrl,
      tDispatch,
      timestampIso,
      smtpServer: {
        messageId: `<ml_${token.substring(0, 8)}@mail.universidade.edu.br>`,
        smtpLatencyMs: smtpLatency,
        status: 'ENTREGUE'
      }
    };

    this.dispatchLog.push(dispatchEvent);
    return dispatchEvent;
  }

  public getDispatchHistory(): MagicLinkDispatchEvent[] {
    return [...this.dispatchLog];
  }

  public clearHistory(): void {
    this.dispatchLog = [];
  }
}

// ------------------------------------------------------------------------------
// RESPONSABILIDADE 2: MOCK DA INTERFACE DE APROVAÇÃO ASSÍNCRONA
// ------------------------------------------------------------------------------

export class MockApprovalInterface {
  /**
   * Simula a interação do signatário acadêmico:
   * 1. Abertura da notificação / clique no link.
   * 2. Leitura atenta e auditoria do hash da ata (human think/dwell time).
   * 3. Atrasos randomizados com distribuição realista (Box-Muller ou variação controlada).
   * 4. Clique na decisão final e retorno com registro exato de t_approval.
   */
  public async simulateSignerInteraction(params: {
    signer: AcademicSignerProfile;
    dispatchEvent: MagicLinkDispatchEvent;
    forceDelayMs?: number;
    forceAction?: DecisaoSignatario;
  }): Promise<SignerInteractionEvent> {
    const { signer, dispatchEvent } = params;

    // Cálculo do atraso simulado (comportamento humano + jitter de rede)
    let delayMs: number;
    if (params.forceDelayMs !== undefined) {
      delayMs = Math.max(1, params.forceDelayMs);
    } else {
      // Variação pseudo-normal centrada em baseDelayMs +/- jitterMs
      const randomFactor = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // ~ Normal(-1, 1)
      const simulatedJitter = signer.jitterMs * randomFactor;
      delayMs = Math.max(10, Math.round(signer.baseDelayMs + simulatedJitter));
    }

    // Marca momento do clique inicial no link
    const tClick = performance.now();

    // Espera assíncrona que emula o tempo de cognição e ação do signatário
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Captura o timestamp exato no momento da submissão da aprovação/rejeição
    const tApproval = performance.now();

    // Determina a decisão (aprovação ou rejeição)
    let action: DecisaoSignatario = 'APROVADA';
    let justificativa: string | undefined = undefined;

    if (params.forceAction) {
      action = params.forceAction;
      if (action === 'REJEITADA') {
        justificativa = signer.rejectReason || 'Atestação recusada pelo participante para revisão de texto.';
      }
    } else if (signer.rejectProbability && Math.random() < signer.rejectProbability) {
      action = 'REJEITADA';
      justificativa = signer.rejectReason || 'Necessidade de correção da ata antes da chancela digital.';
    }

    return {
      interactionId: `inter_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      dispatchId: dispatchEvent.dispatchId,
      participantId: signer.id,
      tClick,
      tApproval,
      action,
      justificativa,
      readingDwellMs: delayMs,
      networkJitterMs: Math.round(Math.abs(delayMs - signer.baseDelayMs)),
      userAgentSimulado: 'Mozilla/5.0 (Academic Portal Mobile/Web Client)'
    };
  }
}

// ------------------------------------------------------------------------------
// RESPONSABILIDADE 3: MOTOR DE CÁLCULO ESTRUTURADO DE ESTATÍSTICAS
// ------------------------------------------------------------------------------

/**
 * Calcula a mediana de uma série numérica
 */
export function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) {
    return ordenados[meio];
  }
  return (ordenados[meio - 1] + ordenados[meio]) / 2;
}

/**
 * Calcula um percentil arbitrário (ex: 90, 95)
 */
export function calcularPercentil(valores: number[], percentil: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const index = (percentil / 100) * (ordenados.length - 1);
  const baixo = Math.floor(index);
  const alto = Math.ceil(index);
  if (baixo === alto) return ordenados[baixo];
  return ordenados[baixo] + (ordenados[alto] - ordenados[baixo]) * (index - baixo);
}

/**
 * Calcula o indicador de atrito operacional normalizado de 0 a 100
 */
export function calcularIndiceAtrito(meanMs: number, stdDevMs: number, slaLimitMs: number): {
  score: number;
  level: NivelAtrito;
} {
  // A métrica de atrito pondera a proximidade do SLA (70%) e a variabilidade/imprevisibilidade da resposta (30%)
  const ratioSla = meanMs / Math.max(1, slaLimitMs);
  const coefVariacao = meanMs > 0 ? (stdDevMs / meanMs) : 0;
  
  const scoreRaw = (ratioSla * 70) + (Math.min(1, coefVariacao) * 30);
  const score = Math.round(Math.max(0, Math.min(100, scoreRaw)));

  let level: NivelAtrito;
  if (score < 35) {
    level = 'BAIXO_FLUIDO';
  } else if (score < 65) {
    level = 'MODERADO_NOMINAL';
  } else if (score < 85) {
    level = 'ALTO_ATRITO';
  } else {
    level = 'CRITICO_GARGALO';
  }

  return { score, level };
}

/**
 * Agrega as métricas individuais e gera o sumário estatístico completo do lote
 */
export function calcularMetricasAtrito(
  signersMetrics: SignerResponseMetric[],
  slaLimitMs: number,
  batchMetadata: { batchId: string; batchName: string; description?: string }
): BatchResponseSummary {
  const n = signersMetrics.length;
  if (n === 0) {
    throw new Error('Não é possível calcular métricas estatísticas para um lote sem signatários.');
  }

  const responseTimes = signersMetrics.map(s => s.responseTimeMs);
  const soma = responseTimes.reduce((acc, val) => acc + val, 0);
  const meanMs = Number((soma / n).toFixed(2));

  // Variância e Desvio Padrão
  const somaDiferencasQuadradas = responseTimes.reduce((acc, val) => acc + Math.pow(val - meanMs, 2), 0);
  const varianceMs = n > 1 ? Number((somaDiferencasQuadradas / (n - 1)).toFixed(2)) : 0;
  const stdDevMs = Number(Math.sqrt(n > 1 ? (somaDiferencasQuadradas / (n - 1)) : 0).toFixed(2));

  const medianMs = Number(calcularMediana(responseTimes).toFixed(2));
  const minMs = Number(Math.min(...responseTimes).toFixed(2));
  const maxMs = Number(Math.max(...responseTimes).toFixed(2));
  const p90Ms = Number(calcularPercentil(responseTimes, 90).toFixed(2));
  const p95Ms = Number(calcularPercentil(responseTimes, 95).toFixed(2));

  const approvedCount = signersMetrics.filter(s => s.action === 'APROVADA').length;
  const rejectedCount = signersMetrics.filter(s => s.action === 'REJEITADA').length;

  const { score: frictionIndex, level: frictionLevel } = calcularIndiceAtrito(meanMs, stdDevMs, slaLimitMs);

  const slaCompliant = meanMs <= slaLimitMs;
  const slaStatus: 'CONFORME_SLA' | 'ALERTA_SLA_EXCEDIDO' = slaCompliant ? 'CONFORME_SLA' : 'ALERTA_SLA_EXCEDIDO';
  const deltaSlaMs = Number((meanMs - slaLimitMs).toFixed(2));

  return {
    batchId: batchMetadata.batchId,
    batchName: batchMetadata.batchName,
    description: batchMetadata.description || 'Simulação de Resposta de Magic Links',
    timestamp: new Date().toISOString(),
    totalSigners: n,
    approvedCount,
    rejectedCount,
    meanMs,
    medianMs,
    stdDevMs,
    varianceMs,
    minMs,
    maxMs,
    p90Ms,
    p95Ms,
    frictionIndex,
    frictionLevel,
    slaThresholdMs: slaLimitMs,
    slaCompliant,
    slaStatus,
    deltaSlaMs,
    signers: signersMetrics
  };
}

// ------------------------------------------------------------------------------
// RESPONSABILIDADE 4: SIMULAÇÃO ORQUESTRADA DE LOTES (COORTES)
// ------------------------------------------------------------------------------

/**
 * Executa a simulação completa de disparo e retorno de Magic Links para um lote
 */
export async function simularLoteMagicLinks(config: CohortBatchConfig): Promise<BatchResponseSummary> {
  const messagingService = new MockMessagingService();
  const approvalInterface = new MockApprovalInterface();
  const slaLimitMs = config.slaLimitMs || SLA_INSTITUCIONAL_PADRAO_MS;
  const proposalId = config.proposalId || `prop_audit_${Date.now()}`;
  const docHash = config.documentHash || '0x4f83b4c9e8912e5a7b6c310248a31e892c90fae14523bb89c470123ef890abcd';

  const signersMetrics: SignerResponseMetric[] = [];

  // Disparo e simulação assíncrona para cada signatário do lote
  for (const signer of config.signers) {
    // 1. Registro de t_dispatch no servidor
    const dispatchEvent = await messagingService.dispatchMagicLink({
      proposalId,
      signer,
      documentHash: docHash
    });

    // 2. Interação simulada e registro de t_approval
    const interactionEvent = await approvalInterface.simulateSignerInteraction({
      signer,
      dispatchEvent
    });

    // 3. Intervalo individual exato
    const responseTimeMs = Number((interactionEvent.tApproval - dispatchEvent.tDispatch).toFixed(2));

    signersMetrics.push({
      participantId: signer.id,
      signerName: signer.name,
      signerRole: signer.role,
      signerEmail: signer.email,
      tDispatch: dispatchEvent.tDispatch,
      tApproval: interactionEvent.tApproval,
      responseTimeMs,
      action: interactionEvent.action,
      justificativa: interactionEvent.justificativa,
      withinSla: responseTimeMs <= slaLimitMs,
      slaLimitMs
    });
  }

  return calcularMetricasAtrito(signersMetrics, slaLimitMs, {
    batchId: config.batchId,
    batchName: config.batchName,
    description: config.description
  });
}

// ------------------------------------------------------------------------------
// RESPONSABILIDADE 5: GERADOR DE RELATÓRIO FORMATADO EM CONSOLE
// ------------------------------------------------------------------------------

/**
 * Formata um relatório visual completo com cores ANSI para exibição em console
 */
export function gerarRelatorioAtritoMagicLink(summary: BatchResponseSummary): string {
  const ANSI_RESET = '\x1b[0m';
  const ANSI_BOLD = '\x1b[1m';
  const ANSI_GREEN = '\x1b[32m';
  const ANSI_YELLOW = '\x1b[33m';
  const ANSI_RED = '\x1b[31m';
  const ANSI_BLUE = '\x1b[34m';
  const ANSI_CYAN = '\x1b[36m';
  const ANSI_BG_RED = '\x1b[41m\x1b[37m';
  const ANSI_BG_GREEN = '\x1b[42m\x1b[30m';

  const border = '═'.repeat(78);
  const divider = '─'.repeat(78);

  // Barra gráfica para o Indicador de Atrito
  const totalBlocks = 20;
  const filledBlocks = Math.round((summary.frictionIndex / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  let frictionColor = ANSI_GREEN;
  if (summary.frictionLevel === 'MODERADO_NOMINAL') frictionColor = ANSI_CYAN;
  if (summary.frictionLevel === 'ALTO_ATRITO') frictionColor = ANSI_YELLOW;
  if (summary.frictionLevel === 'CRITICO_GARGALO') frictionColor = ANSI_RED;

  const linhas: string[] = [];

  linhas.push(`\n${ANSI_BLUE}╔${border}╗${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} AUDITORIA DE RESPOSTA MAGIC LINK - DAPP REGISTRO DE ATA ACADÊMICA ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${border}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Lote: ${ANSI_BOLD}${summary.batchName}${ANSI_RESET} (${summary.batchId})`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Data/Hora: ${summary.timestamp}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Signatários: ${summary.totalSigners} | Aprovadas: ${ANSI_GREEN}${summary.approvedCount}${ANSI_RESET} | Rejeitadas: ${summary.rejectedCount > 0 ? ANSI_RED + summary.rejectedCount + ANSI_RESET : '0'}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Limite Superior de Controle (SLA): ${ANSI_BOLD}${summary.slaThresholdMs.toFixed(0)} ms${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${border}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} DISCRIMINAÇÃO INDIVIDUAL DE SIGNATÁRIOS (t_dispatch -> t_approval)          ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);

  // Cabeçalho da tabela
  linhas.push(`  ${ANSI_BOLD}Signatário / Papel${ANSI_RESET.padEnd(30)} ${ANSI_BOLD}Decisão${ANSI_RESET.padEnd(12)} ${ANSI_BOLD}Delta_t (ms)${ANSI_RESET.padEnd(14)} ${ANSI_BOLD}SLA Individual${ANSI_RESET}`);

  // Linhas individuais
  for (const s of summary.signers) {
    const nomeTrunc = (s.signerName.length > 26 ? s.signerName.substring(0, 23) + '...' : s.signerName).padEnd(28);
    const decisaoTag = s.action === 'APROVADA' 
      ? `${ANSI_GREEN}APROVADA${ANSI_RESET} ` 
      : `${ANSI_RED}REJEITADA${ANSI_RESET}`;
    const tempoFormatado = `${s.responseTimeMs.toFixed(1)} ms`.padEnd(14);
    const slaTag = s.withinSla 
      ? `${ANSI_GREEN}✔ Conforme${ANSI_RESET}` 
      : `${ANSI_RED}✖ Excedido (+${(s.responseTimeMs - summary.slaThresholdMs).toFixed(0)}ms)${ANSI_RESET}`;

    linhas.push(`  ${nomeTrunc} ${decisaoTag}   ${tempoFormatado} ${slaTag}`);
    if (s.justificativa) {
      linhas.push(`    ↳ ${ANSI_YELLOW}Justificativa:${ANSI_RESET} ${s.justificativa}`);
    }
  }

  linhas.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} AGREGAÇÃO ESTATÍSTICA DO LOTE                                              ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  linhas.push(`  • Média (μ):           ${ANSI_BOLD}${summary.meanMs.toFixed(2)} ms${ANSI_RESET}`);
  linhas.push(`  • Mediana (Q2):        ${ANSI_BOLD}${summary.medianMs.toFixed(2)} ms${ANSI_RESET}`);
  linhas.push(`  • Desvio Padrão (σ):   ${ANSI_BOLD}${summary.stdDevMs.toFixed(2)} ms${ANSI_RESET} (Variância: ${summary.varianceMs.toFixed(2)} ms²)`);
  linhas.push(`  • Intervalo de Dispersão: [Min: ${summary.minMs.toFixed(1)} ms, Max: ${summary.maxMs.toFixed(1)} ms]`);
  linhas.push(`  • Percentis:           P90: ${summary.p90Ms.toFixed(1)} ms | P95: ${summary.p95Ms.toFixed(1)} ms`);

  linhas.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} INDICADOR DE ATRITO OPERACIONAL                                             ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  linhas.push(`  Índice de Atrito: [${frictionColor}${bar}${ANSI_RESET}] ${ANSI_BOLD}${summary.frictionIndex}/100${ANSI_RESET} (${summary.frictionLevel.replace('_', ' ')})`);

  linhas.push(`${ANSI_BLUE}╠${border}╣${ANSI_RESET}`);

  // BANNER DE SLA (ALERTA OU CONFORMIDADE)
  if (summary.slaCompliant) {
    linhas.push(`${ANSI_BG_GREEN}${ANSI_BOLD} ✔ CONFORMIDADE CONFIRMADA: TEMPO MÉDIO ATENDE AO SLA INSTITUCIONAL            ${ANSI_RESET}`);
    linhas.push(`  O tempo médio (${summary.meanMs.toFixed(1)} ms) está ${Math.abs(summary.deltaSlaMs).toFixed(1)} ms abaixo do limite operacional (${summary.slaThresholdMs.toFixed(0)} ms).`);
    linhas.push(`  A resposta dos signatários garante fluidez no fechamento da ata sem gargalos.`);
  } else {
    linhas.push(`${ANSI_BG_RED}${ANSI_BOLD} ⚠ ALERTA CRÍTICO DE ATRITO: TEMPO MÉDIO ULTRAPASSOU O LIMITE DE SLA         ${ANSI_RESET}`);
    linhas.push(`  ${ANSI_RED}${ANSI_BOLD}Tempo médio registrado (${summary.meanMs.toFixed(1)} ms) excedeu o SLA em +${summary.deltaSlaMs.toFixed(1)} ms!${ANSI_RESET}`);
    linhas.push(`  ${ANSI_YELLOW}Ação Recomendada:${ANSI_RESET} Disparar lembrete automático aos signatários pendentes ou`);
    linhas.push(`  revisar o canal de mensageria para mitigar atrasos de atestação colegiada.`);
  }

  linhas.push(`${ANSI_BLUE}╚${border}╝${ANSI_RESET}\n`);

  return linhas.join('\n');
}
