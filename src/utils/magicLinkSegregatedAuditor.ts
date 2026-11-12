/**
 * ==============================================================================
 * MOTOR DE AUDITORIA SEGREGADA: MAGIC LINK (INFRAESTRUTURA vs FATOR HUMANO)
 * Arquivo: src/utils/magicLinkSegregatedAuditor.ts
 * Perfil: Engenheiro de Software Sênior, Especialista DApp & QA
 * ==============================================================================
 * 
 * PRINCÍPIO ARQUITETURAL DE SEGREGAÇÃO (DEFESA CONTRA FADIGA DE ALERTA):
 * 1. DIMENSÃO TÉCNICA (INFRAESTRUTURA / API DE MENSAGERIA):
 *    - Escala: Milissegundos estritos (ms) capturados via performance.now().
 *    - Limite Crítico de Controle (SLA de Infra): <= 3000 ms.
 *    - Classificação: Falhas de rede, timeouts, HTTP 5xx ou lentidão na API
 *      geram eventos SEV-1/SEV-2 destinados exclusivamente ao time de SRE/DevOps.
 * 
 * 2. DIMENSÃO COMPORTAMENTAL (WORKFLOW MULTISIG / DELIBERAÇÃO DOCENTE):
 *    - Escala: Horas (h) calculadas a partir de distribuição estocástica (Log-Normal).
 *    - Mediana esperada: 12h a 24h para deliberação colegiada acadêmica.
 *    - Indicador de Atrito de Resposta (IARS): Pontuação normalizada 0 a 100.
 *    - Classificação: Atrasos de leitura/conferência por professores são eventos
 *      assíncronos esperados de governança institucional. NÃO DISPARAM PagerDuty/SRE,
 *      eliminando 100% dos falsos positivos por fadiga de escala.
 * ==============================================================================
 */

import { gerarTokenCriptografico } from './magicLinkAuth';

// ------------------------------------------------------------------------------
// CONSTANTES NORMATIVAS E THRESHOLDS DE CONTROLE
// ------------------------------------------------------------------------------
export const SLA_INFRAESTRUTURA_DISPATCH_MS = 3000; // Threshold crítico estrito de 3000 ms
export const SLA_WORKFLOW_HUMANO_HORAS = 24.0;      // 24 horas para fechamento de ata de colegiado

// ------------------------------------------------------------------------------
// TIPOS E MODELOS DE DADOS ESTRUTURADOS
// ------------------------------------------------------------------------------

export type AlertChannel = 'SRE_OPS' | 'ACADEMIC_GOVERNANCE' | 'NONE';

export type InfraHealthStatus = 
  | 'INFRA_HEALTHY' 
  | 'INFRA_WARNING_LATENCY' 
  | 'INFRA_CRITICAL_BREACH' 
  | 'INFRA_ERROR_FAULT';

export type HumanWorkflowStatus = 
  | 'HUMAN_EXEMPLARY_FAST' 
  | 'HUMAN_NOMINAL_ON_TIME' 
  | 'HUMAN_DELAYED_NEEDS_REMINDER' 
  | 'HUMAN_OVERDUE_ESCALATION';

export interface AcademicSigner {
  id: string;
  name: string;
  role: string;
  email: string;
  expectedMeanHours: number; // Média de resposta típica deste cargo (em horas)
  varianceFactor?: number;   // Dispersão comportamental
}

export interface InfraDispatchResult {
  dispatchId: string;
  recipientEmail: string;
  token: string;
  magicLinkUrl: string;
  tRequestMs: number;
  tDispatchAckMs: number;
  latencyMs: number; // t_dispatch_ack - t_request
  httpStatus: number;
  provider: string;
  status: InfraHealthStatus;
  breachOfSla: boolean; // latencyMs > 3000 ms
  errorMessage?: string;
  sreAlertRequired: boolean;
}

export interface HumanAttestationResult {
  attestationId: string;
  signerId: string;
  signerName: string;
  signerRole: string;
  deliberationHours: number;
  deliberationHoursFormatted: string;
  status: HumanWorkflowStatus;
  workflowSlaBreached: boolean; // deliberationHours > 24h
  decision: 'APROVADA' | 'REJEITADA';
  justificativa?: string;
  requiresAcademicReminder: boolean;
  governanceNoticeRequired: boolean;
}

export interface SegregatedAuditSample {
  sampleId: string;
  documentHash: string;
  signer: AcademicSigner;
  infra: InfraDispatchResult;
  human: HumanAttestationResult;
  overallIarsContribution: number;
}

export interface SegregatedAuditSummary {
  batchId: string;
  batchName: string;
  timestamp: string;
  totalSigners: number;
  
  // Métricas de Infraestrutura (Escala de Milissegundos)
  infraMetrics: {
    meanDispatchMs: number;
    medianDispatchMs: number;
    p95DispatchMs: number;
    maxDispatchMs: number;
    minDispatchMs: number;
    thresholdLimitMs: number;
    slaComplianceRate: number; // % de envios <= 3000 ms
    sreIncidentCount: number;  // Qtd de violações > 3000ms ou erros 5xx
    infraStatus: 'SAUDÁVEL' | 'DEGRADADO' | 'CRÍTICO_INDISPONÍVEL';
  };

  // Métricas Humanas / Workflow (Escala de Horas)
  humanMetrics: {
    meanDeliberationHours: number;
    medianDeliberationHours: number;
    stdDevDeliberationHours: number;
    p90DeliberationHours: number;
    p95DeliberationHours: number;
    minDeliberationHours: number;
    maxDeliberationHours: number;
    workflowSlaLimitHours: number;
    complianceRate24h: number; // % assinados em até 24h
    iarsScore: number;         // Indicador de Atrito de Resposta (0 a 100)
    iarsClassification: 'FLUIDO' | 'NOMINAL' | 'ATENÇÃO_LEMBRETES' | 'GARGALO_CRÍTICO';
    remindersToDispatchCount: number;
  };

  // Segregação e Diagnóstico de Falsos Alarmes
  segregationAnalysis: {
    falseSreAlertsPrevented: number; // Número de atrasos docentes (>24h) isolados que NÃO alertaram SRE
    sreAlertsDispatched: number;     // Apenas falhas reais da API (> 3000ms ou erro HTTP)
    governanceNoticesDispatched: number; // Notificações para envio de lembrete por e-mail
  };

  samples: SegregatedAuditSample[];
}

// ------------------------------------------------------------------------------
// CLASSE 1: MOCK REALISTA DA API DE MENSAGERIA (COM INJEÇÃO DE FALHAS E LATÊNCIA)
// ------------------------------------------------------------------------------

export interface MessagingProviderOptions {
  providerName?: string;
  injectLatencyMs?: number;
  injectHttpError?: number;
  injectTimeout?: boolean;
}

export class MockMessagingProviderApi {
  private providerName: string;

  constructor(providerName: string = 'SendGrid/SES-Academic-Relay') {
    this.providerName = providerName;
  }

  /**
   * Envia o e-mail de Magic Link e audita estritamente em milissegundos o tempo
   * desde a requisição até o ACK de confirmação do provedor.
   */
  public async dispatchMagicLink(
    signer: AcademicSigner,
    documentHash: string,
    options: MessagingProviderOptions = {}
  ): Promise<InfraDispatchResult> {
    const tRequestMs = performance.now();
    const token = gerarTokenCriptografico(32);
    const magicLinkUrl = `https://dapp.academic-ledger.edu.br/multisig/verify?token=${token}&hash=${documentHash}`;

    // Determina a latência simulada de rede/API do provedor
    let latencyMs: number;
    if (options.injectLatencyMs !== undefined) {
      latencyMs = options.injectLatencyMs;
    } else {
      // Latência normal de API externa de e-mail (120ms a 380ms)
      latencyMs = Math.round(120 + Math.random() * 260);
    }

    // Se solicitado timeout explícito
    if (options.injectTimeout) {
      latencyMs = 3500 + Math.round(Math.random() * 500); // Excede o threshold de 3000ms
    }

    // Delay de temporizador mínimo no teste
    const simulatedClockSleep = Math.min(25, Math.max(1, Math.round(latencyMs / 40)));
    await new Promise(resolve => setTimeout(resolve, simulatedClockSleep));

    const tDispatchAckMs = tRequestMs + latencyMs;

    let httpStatus = 202; // Accepted
    let errorMessage: string | undefined = undefined;

    if (options.injectHttpError) {
      httpStatus = options.injectHttpError;
      errorMessage = `HTTP ${httpStatus}: Falha de despacho no provedor de mensageria (${this.providerName}).`;
    } else if (latencyMs > SLA_INFRAESTRUTURA_DISPATCH_MS) {
      errorMessage = `SLABreachException: Latência de despacho (${latencyMs.toFixed(1)}ms) violou o threshold de ${SLA_INFRAESTRUTURA_DISPATCH_MS}ms.`;
    }

    const breachOfSla = latencyMs > SLA_INFRAESTRUTURA_DISPATCH_MS;
    const isError = httpStatus >= 400;

    let status: InfraHealthStatus = 'INFRA_HEALTHY';
    if (isError) {
      status = 'INFRA_ERROR_FAULT';
    } else if (breachOfSla) {
      status = 'INFRA_CRITICAL_BREACH';
    } else if (latencyMs > 2000) {
      status = 'INFRA_WARNING_LATENCY';
    }

    const sreAlertRequired = isError || breachOfSla;

    return {
      dispatchId: `dsp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: signer.email,
      token,
      magicLinkUrl,
      tRequestMs,
      tDispatchAckMs,
      latencyMs,
      httpStatus,
      provider: options.providerName || this.providerName,
      status,
      breachOfSla,
      errorMessage,
      sreAlertRequired
    };
  }
}

// ------------------------------------------------------------------------------
// CLASSE 2: SIMULADOR ESTOCÁSTICO DE ATESTAÇÃO HUMANA (ESCALA DE HORAS)
// ------------------------------------------------------------------------------

export class StochasticHumanDeliberationSimulator {
  /**
   * Simula a latência de atestação docente utilizando distribuição estocástica Log-Normal.
   * Modelagem de comportamento acadêmico real:
   * - Pico de respostas durante horário de expediente colegiado.
   * - Mediana configurável (ex: 12h a 24h).
   * - Cauda longa para docentes em viagens acadêmicas, períodos de aula ou sobrecarga.
   */
  public simulateHumanResponse(
    signer: AcademicSigner,
    forceHours?: number
  ): HumanAttestationResult {
    let deliberationHours: number;

    if (forceHours !== undefined) {
      deliberationHours = Math.max(0.1, forceHours);
    } else {
      // Geração de variável Log-Normal a partir de Box-Muller
      const u1 = Math.max(0.0001, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      const targetMedian = signer.expectedMeanHours; // ex: 14 horas
      const sigma = signer.varianceFactor ?? 0.45;   // Dispersão logarítmica
      const muLog = Math.log(targetMedian);

      // X = exp(mu + sigma * Z)
      deliberationHours = Math.exp(muLog + sigma * z0);
      deliberationHours = Math.max(0.5, Math.min(72.0, deliberationHours)); // clamp entre 30 min e 72h
    }

    deliberationHours = Number(deliberationHours.toFixed(2));
    const workflowSlaBreached = deliberationHours > SLA_WORKFLOW_HUMANO_HORAS;

    let status: HumanWorkflowStatus = 'HUMAN_NOMINAL_ON_TIME';
    if (deliberationHours <= 4.0) {
      status = 'HUMAN_EXEMPLARY_FAST';
    } else if (deliberationHours <= SLA_WORKFLOW_HUMANO_HORAS) {
      status = 'HUMAN_NOMINAL_ON_TIME';
    } else if (deliberationHours <= 36.0) {
      status = 'HUMAN_DELAYED_NEEDS_REMINDER';
    } else {
      status = 'HUMAN_OVERDUE_ESCALATION';
    }

    const requiresAcademicReminder = workflowSlaBreached;
    const governanceNoticeRequired = workflowSlaBreached;

    return {
      attestationId: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      signerId: signer.id,
      signerName: signer.name,
      signerRole: signer.role,
      deliberationHours,
      deliberationHoursFormatted: `${deliberationHours.toFixed(1)} h`,
      status,
      workflowSlaBreached,
      decision: 'APROVADA',
      requiresAcademicReminder,
      governanceNoticeRequired
    };
  }
}

// ------------------------------------------------------------------------------
// CÁLCULOS ESTATÍSTICOS E INDICADOR DE ATRITO (IARS)
// ------------------------------------------------------------------------------

export function calcularMediana(numeros: number[]): number {
  if (numeros.length === 0) return 0;
  const sorted = [...numeros].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calcularPercentil(numeros: number[], p: number): number {
  if (numeros.length === 0) return 0;
  const sorted = [...numeros].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
}

/**
 * Calcula o Indicador de Atrito de Resposta (IARS):
 * Pondera 70% na relação entre a Mediana Humana e o SLA Institucional de 24h,
 * e 30% no Coeficiente de Variação (dispersão/imprevisibilidade).
 */
export function calcularIARS(
  medianHours: number,
  stdDevHours: number,
  meanHours: number,
  slaLimitHours: number = SLA_WORKFLOW_HUMANO_HORAS
): {
  score: number;
  classification: 'FLUIDO' | 'NOMINAL' | 'ATENÇÃO_LEMBRETES' | 'GARGALO_CRÍTICO';
} {
  const ratioSla = medianHours / Math.max(1, slaLimitHours);
  const coefVariacao = meanHours > 0 ? (stdDevHours / meanHours) : 0;
  
  const scoreRaw = (ratioSla * 70) + (Math.min(1.0, coefVariacao) * 30);
  const score = Math.round(Math.max(0, Math.min(100, scoreRaw)));

  let classification: 'FLUIDO' | 'NOMINAL' | 'ATENÇÃO_LEMBRETES' | 'GARGALO_CRÍTICO';
  if (score < 45) {
    classification = 'FLUIDO';
  } else if (score < 65) {
    classification = 'NOMINAL';
  } else if (score < 85) {
    classification = 'ATENÇÃO_LEMBRETES';
  } else {
    classification = 'GARGALO_CRÍTICO';
  }

  return { score, classification };
}

// ------------------------------------------------------------------------------
// CLASSE 3: MOTOR DE LOG ESTRUTURADO ANTI-FADIGA DE ALERTA
// ------------------------------------------------------------------------------

export interface StructuredLogPayload {
  timestamp: string;
  category: 'INFRASTRUCTURE' | 'HUMAN_WORKFLOW' | 'SYSTEM_SUMMARY';
  level: 'INFO' | 'WARN' | 'CRITICAL';
  telemetryChannel: AlertChannel;
  sreAlertDispatched: boolean;
  governanceReminderTriggered: boolean;
  alertReason?: string;
  data: Record<string, any>;
}

export class SegregatedLogEngine {
  private logs: StructuredLogPayload[] = [];

  /**
   * Registra evento de infraestrutura da API de Mensageria
   */
  public logInfraEvent(infra: InfraDispatchResult): StructuredLogPayload {
    const isCritical = infra.sreAlertRequired;
    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      category: 'INFRASTRUCTURE',
      level: isCritical ? 'CRITICAL' : (infra.latencyMs > 2000 ? 'WARN' : 'INFO'),
      telemetryChannel: isCritical ? 'SRE_OPS' : 'NONE',
      sreAlertDispatched: isCritical,
      governanceReminderTriggered: false,
      alertReason: isCritical ? infra.errorMessage || 'SLA de Mensageria violado (>3000ms)' : undefined,
      data: {
        dispatchId: infra.dispatchId,
        recipient: infra.recipientEmail,
        latencyMs: infra.latencyMs,
        thresholdMs: SLA_INFRAESTRUTURA_DISPATCH_MS,
        httpStatus: infra.httpStatus,
        provider: infra.provider,
        status: infra.status
      }
    };

    this.logs.push(payload);
    return payload;
  }

  /**
   * Registra evento de deliberação humana docente.
   * REGRA CRÍTICA: SRE_ALERT_DISPATCHED É ESTRITAMENTE FALSE!
   */
  public logHumanEvent(human: HumanAttestationResult): StructuredLogPayload {
    const isDelayed = human.workflowSlaBreached;
    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      category: 'HUMAN_WORKFLOW',
      level: isDelayed ? 'WARN' : 'INFO',
      telemetryChannel: isDelayed ? 'ACADEMIC_GOVERNANCE' : 'NONE',
      sreAlertDispatched: false, // JAMAIS gera alerta de SRE para atraso de professor
      governanceReminderTriggered: human.requiresAcademicReminder,
      alertReason: isDelayed 
        ? `Deliberação docente (${human.deliberationHours.toFixed(1)}h) excedeu SLA institucional (${SLA_WORKFLOW_HUMANO_HORAS}h). Disparando lembrete de cortesia.`
        : undefined,
      data: {
        signerName: human.signerName,
        signerRole: human.signerRole,
        deliberationHours: human.deliberationHours,
        slaHours: SLA_WORKFLOW_HUMANO_HORAS,
        status: human.status,
        decision: human.decision,
        mitigationAction: isDelayed ? 'ENVIAR_E-MAIL_REFORCO_COORDENACAO' : 'NENHUMA_ACAO_NECESSARIA'
      }
    };

    this.logs.push(payload);
    return payload;
  }

  public getLogs(): StructuredLogPayload[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs = [];
  }
}

// ------------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL: SIMULAÇÃO E COMPILAÇÃO DE LOTE SEGREGADO
// ------------------------------------------------------------------------------

export async function executarAuditoriaSegregada(params: {
  batchId: string;
  batchName: string;
  signers: AcademicSigner[];
  documentHash?: string;
  providerOptions?: MessagingProviderOptions;
  forcedHumanDelays?: number[]; // Permite fixar tempos humanos para asserção determinística
}): Promise<{
  summary: SegregatedAuditSummary;
  logEngine: SegregatedLogEngine;
}> {
  const { batchId, batchName, signers, providerOptions } = params;
  const docHash = params.documentHash || '0x4f83b4c9e8912e5a7b6c310248a31e892c90fae14523bb89c470123ef890abcd';

  const providerApi = new MockMessagingProviderApi();
  const humanSimulator = new StochasticHumanDeliberationSimulator();
  const logEngine = new SegregatedLogEngine();

  const samples: SegregatedAuditSample[] = [];

  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    
    // 1. Mensuração de Infraestrutura (ms)
    const infra = await providerApi.dispatchMagicLink(signer, docHash, providerOptions);
    logEngine.logInfraEvent(infra);

    // 2. Mensuração Humana (horas)
    const forcedHours = params.forcedHumanDelays ? params.forcedHumanDelays[i] : undefined;
    const human = humanSimulator.simulateHumanResponse(signer, forcedHours);
    logEngine.logHumanEvent(human);

    samples.push({
      sampleId: `smp_${i + 1}`,
      documentHash: docHash,
      signer,
      infra,
      human,
      overallIarsContribution: human.deliberationHours
    });
  }

  // ---------------------------------------------------------------------------
  // AGREGAÇÃO ESTATÍSTICA DE INFRAESTRUTURA
  // ---------------------------------------------------------------------------
  const latenciasInfra = samples.map(s => s.infra.latencyMs);
  const n = latenciasInfra.length;
  const meanDispatchMs = Number((latenciasInfra.reduce((a, b) => a + b, 0) / n).toFixed(2));
  const medianDispatchMs = Number(calcularMediana(latenciasInfra).toFixed(2));
  const p95DispatchMs = Number(calcularPercentil(latenciasInfra, 95).toFixed(2));
  const maxDispatchMs = Math.max(...latenciasInfra);
  const minDispatchMs = Math.min(...latenciasInfra);

  const breachesInfra = samples.filter(s => s.infra.breachOfSla || s.infra.sreAlertRequired);
  const sreIncidentCount = breachesInfra.length;
  const slaComplianceRate = Number((((n - sreIncidentCount) / n) * 100).toFixed(1));

  let infraStatus: 'SAUDÁVEL' | 'DEGRADADO' | 'CRÍTICO_INDISPONÍVEL' = 'SAUDÁVEL';
  if (sreIncidentCount > 0 && slaComplianceRate < 80) {
    infraStatus = 'CRÍTICO_INDISPONÍVEL';
  } else if (sreIncidentCount > 0 || meanDispatchMs > 2000) {
    infraStatus = 'DEGRADADO';
  }

  // ---------------------------------------------------------------------------
  // AGREGAÇÃO ESTATÍSTICA DO WORKFLOW HUMANO
  // ---------------------------------------------------------------------------
  const horasHumanas = samples.map(s => s.human.deliberationHours);
  const meanDeliberationHours = Number((horasHumanas.reduce((a, b) => a + b, 0) / n).toFixed(2));
  const medianDeliberationHours = Number(calcularMediana(horasHumanas).toFixed(2));

  const diffSq = horasHumanas.reduce((acc, val) => acc + Math.pow(val - meanDeliberationHours, 2), 0);
  const stdDevDeliberationHours = Number(Math.sqrt(n > 1 ? diffSq / (n - 1) : 0).toFixed(2));

  const p90DeliberationHours = Number(calcularPercentil(horasHumanas, 90).toFixed(2));
  const p95DeliberationHours = Number(calcularPercentil(horasHumanas, 95).toFixed(2));
  const minDeliberationHours = Math.min(...horasHumanas);
  const maxDeliberationHours = Math.max(...horasHumanas);

  const compliantHumanCount = samples.filter(s => !s.human.workflowSlaBreached).length;
  const complianceRate24h = Number(((compliantHumanCount / n) * 100).toFixed(1));

  const { score: iarsScore, classification: iarsClassification } = calcularIARS(
    medianDeliberationHours,
    stdDevDeliberationHours,
    meanDeliberationHours,
    SLA_WORKFLOW_HUMANO_HORAS
  );

  const remindersToDispatchCount = samples.filter(s => s.human.requiresAcademicReminder).length;

  // ---------------------------------------------------------------------------
  // ANÁLISE DE SEGREGAÇÃO E ELIMINAÇÃO DE FALSOS POSITIVOS
  // ---------------------------------------------------------------------------
  const humanDelaysCount = samples.filter(s => s.human.workflowSlaBreached).length;
  const falseSreAlertsPrevented = humanDelaysCount;
  const sreAlertsDispatched = sreIncidentCount;
  const governanceNoticesDispatched = remindersToDispatchCount;

  const summary: SegregatedAuditSummary = {
    batchId,
    batchName,
    timestamp: new Date().toISOString(),
    totalSigners: n,
    infraMetrics: {
      meanDispatchMs,
      medianDispatchMs,
      p95DispatchMs,
      maxDispatchMs,
      minDispatchMs,
      thresholdLimitMs: SLA_INFRAESTRUTURA_DISPATCH_MS,
      slaComplianceRate,
      sreIncidentCount,
      infraStatus
    },
    humanMetrics: {
      meanDeliberationHours,
      medianDeliberationHours,
      stdDevDeliberationHours,
      p90DeliberationHours,
      p95DeliberationHours,
      minDeliberationHours,
      maxDeliberationHours,
      workflowSlaLimitHours: SLA_WORKFLOW_HUMANO_HORAS,
      complianceRate24h,
      iarsScore,
      iarsClassification,
      remindersToDispatchCount
    },
    segregationAnalysis: {
      falseSreAlertsPrevented,
      sreAlertsDispatched,
      governanceNoticesDispatched
    },
    samples
  };

  return { summary, logEngine };
}

// ------------------------------------------------------------------------------
// FORMATADOR DE RELATÓRIO VISUAL COM CORES ANSI PARA O CONSOLE
// ------------------------------------------------------------------------------

export function renderizarRelatorioSegregadoConsole(summary: SegregatedAuditSummary): string {
  const ANSI_RESET = '\x1b[0m';
  const ANSI_BOLD = '\x1b[1m';
  const ANSI_GREEN = '\x1b[32m';
  const ANSI_YELLOW = '\x1b[33m';
  const ANSI_RED = '\x1b[31m';
  const ANSI_BLUE = '\x1b[34m';
  const ANSI_CYAN = '\x1b[36m';
  const ANSI_MAGENTA = '\x1b[35m';
  const ANSI_BG_RED = '\x1b[41m\x1b[37m';
  const ANSI_BG_GREEN = '\x1b[42m\x1b[30m';

  const border = '═'.repeat(78);
  const divider = '─'.repeat(78);

  const lines: string[] = [];

  lines.push(`\n${ANSI_BLUE}╔${border}╗${ANSI_RESET}`);
  lines.push(`${ANSI_BLUE}║${ANSI_BOLD} AUDITORIA TEMPORAL SEGREGADA: MAGIC LINK INFRAESTRUTURA vs FATOR HUMANO ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  lines.push(`${ANSI_BLUE}╠${border}╣${ANSI_RESET}`);
  lines.push(`${ANSI_BLUE}║${ANSI_RESET} Coorte: ${ANSI_BOLD}${summary.batchName}${ANSI_RESET} (ID: ${summary.batchId})`);
  lines.push(`${ANSI_BLUE}║${ANSI_RESET} Data/Hora: ${summary.timestamp} | Signatários: ${summary.totalSigners}`);
  lines.push(`${ANSI_BLUE}╠${border}╣${ANSI_RESET}`);

  // SEÇÃO 1: LATÊNCIA DE INFRAESTRUTURA (API DE MENSAGERIA - MS)
  const infraColor = summary.infraMetrics.sreIncidentCount === 0 ? ANSI_GREEN : ANSI_RED;
  lines.push(`${ANSI_BLUE}║${ANSI_BOLD} 1. INFRAESTRUTURA: API DE MENSAGERIA (LIMIAR CRÍTICO: <= 3000 ms)           ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  lines.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  lines.push(`  • Status da Infraestrutura:    ${infraColor}${ANSI_BOLD}${summary.infraMetrics.infraStatus}${ANSI_RESET}`);
  lines.push(`  • Latência Média de Despacho:  ${ANSI_BOLD}${summary.infraMetrics.meanDispatchMs.toFixed(1)} ms${ANSI_RESET}`);
  lines.push(`  • Mediana de Despacho:         ${summary.infraMetrics.medianDispatchMs.toFixed(1)} ms | P95: ${summary.infraMetrics.p95DispatchMs.toFixed(1)} ms`);
  lines.push(`  • Dispersão [Min - Max]:       [${summary.infraMetrics.minDispatchMs.toFixed(1)} ms - ${summary.infraMetrics.maxDispatchMs.toFixed(1)} ms]`);
  lines.push(`  • Conformidade SLA Infra:      ${summary.infraMetrics.slaComplianceRate >= 95 ? ANSI_GREEN : ANSI_RED}${summary.infraMetrics.slaComplianceRate}%${ANSI_RESET} (<= 3000ms)`);
  lines.push(`  • Incidentes SRE / PagerDuty:  ${summary.infraMetrics.sreIncidentCount > 0 ? ANSI_RED + ANSI_BOLD + summary.infraMetrics.sreIncidentCount + ' ALERTAS CRÍTICOS' + ANSI_RESET : ANSI_GREEN + '0 (Nenhum incidente)' + ANSI_RESET}`);

  lines.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);

  // SEÇÃO 2: LATÊNCIA DE ATESTAÇÃO HUMANA (WORKFLOW MULTISIG - HORAS)
  let iarsColor = ANSI_GREEN;
  if (summary.humanMetrics.iarsClassification === 'NOMINAL') iarsColor = ANSI_CYAN;
  if (summary.humanMetrics.iarsClassification === 'ATENÇÃO_LEMBRETES') iarsColor = ANSI_YELLOW;
  if (summary.humanMetrics.iarsClassification === 'GARGALO_CRÍTICO') iarsColor = ANSI_RED;

  lines.push(`${ANSI_BLUE}║${ANSI_BOLD} 2. ATESTAÇÃO HUMANA: WORKFLOW MULTISIG (ESCALA DE HORAS / SLA: 24h)        ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  lines.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  lines.push(`  • Tempo Médio de Deliberação:  ${ANSI_BOLD}${summary.humanMetrics.meanDeliberationHours.toFixed(1)} h${ANSI_RESET}`);
  lines.push(`  • Mediana Colegiada (Q2):      ${ANSI_BOLD}${summary.humanMetrics.medianDeliberationHours.toFixed(1)} h${ANSI_RESET} (Norma institucional: 12h a 24h)`);
  lines.push(`  • Desvio Padrão (σ):           ${summary.humanMetrics.stdDevDeliberationHours.toFixed(1)} h | P90: ${summary.humanMetrics.p90DeliberationHours.toFixed(1)} h | P95: ${summary.humanMetrics.p95DeliberationHours.toFixed(1)} h`);
  lines.push(`  • Atas Fechadas em até 24h:    ${summary.humanMetrics.complianceRate24h >= 80 ? ANSI_GREEN : ANSI_YELLOW}${summary.humanMetrics.complianceRate24h}%${ANSI_RESET}`);
  lines.push(`  • Indicador de Atrito (IARS):  ${iarsColor}${ANSI_BOLD}${summary.humanMetrics.iarsScore}/100 [${summary.humanMetrics.iarsClassification}]${ANSI_RESET}`);
  lines.push(`  • Lembretes de Cortesia:       ${summary.humanMetrics.remindersToDispatchCount > 0 ? ANSI_YELLOW + summary.humanMetrics.remindersToDispatchCount + ' signatários pendentes' + ANSI_RESET : ANSI_GREEN + '0 (Todos em dia)' + ANSI_RESET}`);

  lines.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);

  // SEÇÃO 3: AUDITORIA DE FALSOS POSITIVOS E SEGREGAÇÃO DE ALERTAS
  lines.push(`${ANSI_BLUE}║${ANSI_BOLD} 3. CONTROLE DE FADIGA DE ALERTA (ISOLAMENTO DE RESPONSABILIDADE)           ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  lines.push(`${ANSI_BLUE}╠${divider}╣${ANSI_RESET}`);
  lines.push(`  • ${ANSI_GREEN}✔ Falsos Alarmes SRE Evitados:${ANSI_RESET} ${ANSI_BOLD}${summary.segregationAnalysis.falseSreAlertsPrevented}${ANSI_RESET} atrasos docentes tratados como negócio assíncrono.`);
  lines.push(`  • ${ANSI_BLUE}ℹ Alertas de Infraestrutura:${ANSI_RESET}    ${summary.segregationAnalysis.sreAlertsDispatched} acionamentos de DevOps (apenas erros reais de API).`);
  lines.push(`  • ${ANSI_MAGENTA}✉ Avisos de Governança Docente:${ANSI_RESET} ${summary.segregationAnalysis.governanceNoticesDispatched} disparos automáticos de lembrete cordial de assinatura.`);

  lines.push(`${ANSI_BLUE}╠${border}╣${ANSI_RESET}`);

  // BANNER FINAL
  if (summary.infraMetrics.sreIncidentCount === 0) {
    lines.push(`${ANSI_BG_GREEN}${ANSI_BOLD} ✔ INFRAESTRUTURA ESTÁVEL: API RESPONDE DENTRO DO THRESHOLD (<= 3000 ms)      ${ANSI_RESET}`);
  } else {
    lines.push(`${ANSI_BG_RED}${ANSI_BOLD} ✖ ALERTA SRE: IDENTIFICADA DEGRADAÇÃO REAL NA API DE MENSAGERIA (> 3000 ms)   ${ANSI_RESET}`);
  }

  lines.push(`${ANSI_BLUE}╚${border}╝${ANSI_RESET}\n`);

  return lines.join('\n');
}
