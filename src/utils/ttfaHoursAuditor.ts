/**
 * ==============================================================================
 * MOTOR DE AUDITORIA DO TEMPO TOTAL DE FECHAMENTO DE ATA (TTFA) EM ESCALA DE HORAS
 * Análise de Gargalos (Bottleneck Root-Cause) e Validação de SLA Institucional (24h)
 * Arquivo: src/utils/ttfaHoursAuditor.ts
 * Perfil: Engenheiro de Software Sênior, Desenvolvedor DApp e Especialista em QA
 * ==============================================================================
 * 
 * OBJETIVO METROLÓGICO:
 * Auditar o macrofluxo temporal completo de governança descentralizada:
 * 1. Início da contagem (t_start): Submissão da ata saneada no formulário web.
 * 2. Período intermediário: Consenso assíncrono de múltiplos signatários (Multisig)
 *    operado via Magic Links em escala de horas reais de resposta dos pares acadêmicos.
 * 3. Submissão, mineração e confirmação do hash no contrato inteligente Solidity (EVM).
 * 4. Conclusão do ciclo (t_end): Escuta do evento on-chain de sucesso e renderização
 *    do recibo criptográfico no DOM local.
 * 5. Avaliação estatística (Média, Mediana, Desvio Padrão, P95).
 * 6. Validação do SLA institucional: "95% das atas fechadas em até 24 horas" (P95 <= 24h).
 * 7. Decomposição de gargalos: Identificação clara se o maior atrito reside na mensageria,
 *    na lentidão humana ou na confirmação da blockchain.
 * ==============================================================================
 */

import { createIsolatedDomSandbox, VirtualDOMLike } from './domSandbox';
import { sanitizarInputAta, validarCamposAta } from './validation';
import { buildCanonicalMeetingString, calculateKeccak256 } from './crypto';
import { criarPropostaMultisig, atestarAssinaturaParticipante, marcarAtaConsolidadaOnChain } from './magicLinkMultisig';
import { transmitirEConfirmarHashOnChain, compilarReciboCriptografico } from './blockchainConnector';
import { travarInterface } from './web3Lockdown';
import { AcademicMeetingData, WalletState, InstitutionalUser, MeetingType } from '../types';

// ------------------------------------------------------------------------------
// MODELOS DE DADOS DA AUDITORIA TEMPORAL EM HORAS
// ------------------------------------------------------------------------------

export type GargaloIdentificado = 'LENTIDAO_HUMANA' | 'MENSAGERIA' | 'CONFIRMACAO_BLOCKCHAIN' | 'PRE_VALIDACAO_CLIENTE';

export interface TTFAHoursPhaseBreakdown {
  sanitizationHours: number;           // T1: Validação regex, sanitização e Keccak-256 (fração de segundo)
  messagingDispatchHours: number;      // T2: Despacho SMTP institucional e entrega dos Magic Links (~0.01 - 0.05h)
  humanDeliberationHours: number;      // T3: Dwell time humano / consenso assíncrono dos pares acadêmicos (1h a 20h+)
  blockchainConfirmationHours: number; // T4: Transmissão mempool, mineração e confirmação de bloco (~0.01 - 0.03h)
  domVerificationHours: number;        // T5: Escuta de evento on-chain e renderização visual do recibo no DOM
  totalClosingHours: number;           // TTFA Total = T1 + T2 + T3 + T4 + T5 (em horas)
}

export interface TTFAHoursMeasurement {
  runId: string;
  meetingId: string;
  title: string;
  academicUnit: string;
  signersCount: number;
  tStartIso: string;
  tEndIso: string;
  phases: TTFAHoursPhaseBreakdown;
  totalClosingHours: number;
  withinSla24h: boolean;
  txId: string;
  blockNumber: number;
  eventEmitted: boolean;
  domVerified: boolean;
  primaryBottleneck: GargaloIdentificado;
  bottleneckPercentage: number;
  benchExecutionDurationMs: number; // Tempo real de execução do teste no Node.js
}

export interface BatchHoursStatistics {
  batchId: string;
  batchName: string;
  description: string;
  timestamp: string;
  totalAtas: number;
  meanHours: number;       // Média (μ)
  medianHours: number;     // Mediana (Q2)
  stdDevHours: number;     // Desvio Padrão (σ)
  varianceHours: number;   // Variância (σ²)
  minHours: number;        // Menor tempo de fechamento
  maxHours: number;        // Maior tempo de fechamento
  p90Hours: number;        // 90º percentil
  p95Hours: number;        // 95º percentil (métrica-chave de SLA)
  slaThresholdHours: number; // Padrão: 24.0 horas
  atasWithinSlaCount: number;
  complianceRatePercentage: number; // % de atas fechadas em até 24h
  slaPass: boolean;        // true se p95Hours <= slaThresholdHours e complianceRate >= 95%
  bottleneckBreakdown: {
    humanDeliberationSharePct: number;
    messagingSharePct: number;
    blockchainSharePct: number;
    preValidationAndDomSharePct: number;
    dominantBottleneck: GargaloIdentificado;
    secondaryBottleneck: GargaloIdentificado;
    rootCauseDiagnosis: string;
    governanceRecommendation: string;
  };
  measurements: TTFAHoursMeasurement[];
}

export interface BatchSimulationScenarioConfig {
  batchId: string;
  batchName: string;
  description: string;
  ataCount: number;
  slaLimitHours?: number; // Padrão: 24.0 horas
  // Configuração da distribuição de resposta humana dos pares acadêmicos (em horas)
  humanResponseDistribution: {
    baseHoursPerSigner: number; // Média de horas de revisão
    jitterHours: number;        // Variação estocástica
    outlierChance?: number;     // Probabilidade de signatário esquecer ou atrasar (> 24h)
    outlierHours?: number;      // Tempo do outlier
  };
  // Latências de infraestrutura simuladas
  messagingLatencyMinutes?: number;  // Típico 1 a 3 minutos
  blockchainLatencySeconds?: number; // Típico 15 a 45 segundos
}

// ------------------------------------------------------------------------------
// MOCK DO LISTENER DE EVENTOS ON-CHAIN HARDHAT / WEB3 PROVIDER
// ------------------------------------------------------------------------------

export interface OnChainAtaRegistradaEvent {
  documentHash: string;
  proponente: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  eventSignature: 'AtaRegistrada(bytes32,address,uint256,uint256)';
}

export class MockHardhatContractEventListener {
  private listeners: Array<(event: OnChainAtaRegistradaEvent) => void> = [];

  public onAtaRegistrada(callback: (event: OnChainAtaRegistradaEvent) => void): void {
    this.listeners.push(callback);
  }

  public emitAtaRegistrada(eventData: OnChainAtaRegistradaEvent): void {
    for (const listener of this.listeners) {
      listener(eventData);
    }
  }

  public removeAllListeners(): void {
    this.listeners = [];
  }
}

// ------------------------------------------------------------------------------
// MOTOR DE EXECUÇÃO INDIVIDUAL DE UMA ATA COM DECOMPOSIÇÃO EM HORAS
// ------------------------------------------------------------------------------

/**
 * Cria dados representativos de uma ata acadêmica para os lotes de teste
 */
export function gerarDadosAtaSimulada(indice: number): AcademicMeetingData {
  const unidades = [
    'Faculdade de Medicina & Bioética',
    'Instituto de Computação e Inteligência Artificial',
    'Departamento de Filosofia e Ciências Humanas',
    'Escola Politécnica de Engenharia',
    'Conselho de Ensino, Pesquisa e Extensão (CEPE)'
  ];
  const tipos: MeetingType[] = ['Banca / Defesa', 'Reunião de Colegiado', 'Orientação', 'Sincronização'];

  const unidade = unidades[indice % unidades.length];
  const tipo: MeetingType = tipos[indice % tipos.length];

  return {
    dateTime: new Date(Date.now() - (indice + 1) * 86400000).toISOString(),
    title: `Ata da Reunião Deliberativa Ordinária #${(indice + 1).toString().padStart(3, '0')} - ${unidade}`,
    pauta: `Deliberação das diretrizes de pesquisa, credenciamento de orientadores e validação de quórum do ciclo ${indice + 1}.`,
    deliberacoes: `Aprovado por consenso colegiado com recomendação expressa de consolidação imutável on-chain sob norma institucional.`,
    meetingType: tipo,
    academicUnit: unidade,
    participants: [
      {
        id: `part_coord_${indice}`,
        role: 'Coordenador',
        name: `Prof. Titular Dr. Alexandre Bastos #${indice + 1}`,
        departmentOrId: unidade,
        checked: true,
        email: `coordenacao.${indice}@universidade.edu.br`,
        walletAddress: '0x71C59a38F8e684077674681f215E5c6778401aB7'
      },
      {
        id: `part_docente_${indice}`,
        role: 'Professor',
        name: `Profa. Dra. Juliana Silveira #${indice + 1}`,
        departmentOrId: unidade,
        checked: true,
        email: `juliana.${indice}@universidade.edu.br`,
        walletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30'
      },
      {
        id: `part_discente_${indice}`,
        role: 'Aluno',
        name: `Marcos Vinícius Prado #${indice + 1}`,
        departmentOrId: 'Representação Estudantil',
        checked: true,
        email: `marcos.${indice}@aluno.universidade.edu.br`,
        walletAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E'
      }
    ],
    summaryAndDecisions: `Homologação final e despacho colegiado registrado com identificação digital dos participantes #${indice + 1}.`,
    actionChecklist: [
      { id: 'act_1', label: 'Coleta de assinaturas digitais via Magic Link', completed: true },
      { id: 'act_2', label: 'Consolidação de hash Keccak-256 on-chain', completed: true }
    ],
    extraNotes: 'Ata auditada para medição de TTFA em escala de governança acadêmica.'
  };
}

/**
 * Executa o macrofluxo completo de uma ata medindo o tempo em horas simuladas
 * e registrando o tempo físico de execução no pipeline de testes.
 */
export async function executarMacrofluxoAtaHours(params: {
  runId: string;
  meetingIndex: number;
  meetingData?: AcademicMeetingData;
  humanDeliberationHours: number;
  messagingLatencyMinutes?: number;
  blockchainLatencySeconds?: number;
  domInstance?: VirtualDOMLike;
}): Promise<TTFAHoursMeasurement> {
  const tBenchStart = performance.now();
  const meetingData = params.meetingData || gerarDadosAtaSimulada(params.meetingIndex);
  const messagingMinutes = params.messagingLatencyMinutes ?? (1.0 + Math.random() * 2.0); // 1 a 3 min
  const blockchainSeconds = params.blockchainLatencySeconds ?? (20 + Math.random() * 25); // 20 a 45 s

  // Instância do DOM isolado para renderização do recibo (compatível com Browser e Node.js)
  let dom = params.domInstance;
  if (!dom) {
    dom = createIsolatedDomSandbox(`
      <div id="container-modal-recibo"></div>
      <div id="lista-recibos"></div>
      <div id="event-listener-status"></div>
    `);
  }

  // ============================================================================
  // ETAPA 1 (t_start): Submissão da ata saneada no frontend
  // ============================================================================
  const tStartReal = Date.now();
  const tStartIso = new Date(tStartReal).toISOString();

  // 1.1 Sanitização e Hashing local
  const tituloSanitizado = sanitizarInputAta(meetingData.title);
  const pautaSanitizada = sanitizarInputAta(meetingData.pauta || '');
  const deliberacoesSanitizadas = sanitizarInputAta(meetingData.deliberacoes || '');
  const validacao = validarCamposAta(tituloSanitizado, pautaSanitizada, deliberacoesSanitizadas);

  if (!validacao.valido) {
    throw new Error(`[TTFA] Falha na validação dos campos da ata: ${validacao.motivoBloqueio}`);
  }

  const dadosHigienizados: AcademicMeetingData = {
    ...meetingData,
    title: tituloSanitizado,
    pauta: pautaSanitizada,
    deliberacoes: deliberacoesSanitizadas
  };

  const canonicalString = buildCanonicalMeetingString(dadosHigienizados);
  const documentHash = calculateKeccak256(canonicalString);

  // Sanitização consome ~1.5 segundos na escala real (~0.0004 horas)
  const sanitizationHours = Number((1.5 / 3600).toFixed(6));

  // ============================================================================
  // ETAPA 2: Despacho de Mensageria e Conexão de Magic Links
  // ============================================================================
  const proposerUser: InstitutionalUser = {
    nome: meetingData.participants[0].name,
    email: meetingData.participants[0].email || 'coord@universidade.edu.br',
    role: 'professor',
    matricula: '20230001',
    walletAddress: '0x71C59a38F8e684077674681f215E5c6778401aB7'
  };

  const proposta = criarPropostaMultisig({
    meetingData: dadosHigienizados,
    documentHash,
    hashAlgorithm: 'Keccak-256',
    canonicalString,
    proposerUser,
    proposerWallet: proposerUser.walletAddress || undefined
  });

  const messagingDispatchHours = Number((messagingMinutes / 60).toFixed(4));

  // ============================================================================
  // ETAPA 3: Consenso Assíncrono dos Pares Acadêmicos (Lentidão Humana em Horas)
  // ============================================================================
  // Na execução de teste, simulamos a passagem assíncrona assinando cada co-signatário
  for (let i = 0; i < proposta.coSigners.length; i++) {
    const coSigner = proposta.coSigners[i];
    atestarAssinaturaParticipante(proposta.id, coSigner.participantId, coSigner.magicToken);
  }

  const humanDeliberationHours = Number(params.humanDeliberationHours.toFixed(3));

  // ============================================================================
  // ETAPA 4: Submissão da Transação ao Smart Contract Solidity (EVM)
  // ============================================================================
  const hardhatListener = new MockHardhatContractEventListener();
  let eventCaptured = false;
  let capturedBlockNumber = 0;
  let capturedTxHash = '';

  // Registra o listener do evento on-chain
  hardhatListener.onAtaRegistrada((ev) => {
    eventCaptured = true;
    capturedBlockNumber = ev.blockNumber;
    capturedTxHash = ev.transactionHash;
    const domEl = dom.window.document.getElementById('event-listener-status');
    if (domEl) {
      domEl.textContent = `EVENT_CAPTURED:${ev.transactionHash}`;
    }
  });

  // Transmite para a blockchain simulada
  const resultadoTx = await transmitirEConfirmarHashOnChain({
    documentHash,
    contractAddress: '0x3a48981A4aE8e08Fa6714E69719F8a0fF08d74B2',
    wallet: {
      isConnected: true,
      address: proposerUser.walletAddress || '0x71C59a38F8e684077674681f215E5c6778401aB7',
      network: {
        id: 'sepolia',
        name: 'Ethereum Sepolia Testnet',
        chainId: 11155111,
        currencySymbol: 'ETH',
        explorerUrl: 'https://sepolia.etherscan.io',
        badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-800'
      },
      balance: '1.850',
      isSimulated: true
    }
  });

  marcarAtaConsolidadaOnChain(proposta.id, resultadoTx.txId);

  // Dispara o evento capturado pelo mock do Hardhat / Web3 provider
  hardhatListener.emitAtaRegistrada({
    documentHash,
    proponente: proposerUser.walletAddress || '0x71C59a38F8e684077674681f215E5c6778401aB7',
    blockNumber: resultadoTx.blockNumber,
    transactionHash: resultadoTx.txId,
    timestamp: Math.floor(Date.now() / 1000),
    eventSignature: 'AtaRegistrada(bytes32,address,uint256,uint256)'
  });

  const blockchainConfirmationHours = Number((blockchainSeconds / 3600).toFixed(4));

  // ============================================================================
  // ETAPA 5 (t_end): Escuta do Evento On-Chain e Renderização do Recibo no DOM
  // ============================================================================
  const reciboEmitido = compilarReciboCriptografico({
    resultadoTx,
    documentHash,
    meetingData: dadosHigienizados,
    canonicalDataString: canonicalString,
    coSigners: proposta.coSigners
  });

  // Renderização imperativa no Document Object Model
  const container = dom.window.document.getElementById('container-modal-recibo');
  if (container) {
    container.innerHTML = `
      <div id="crypto-receipt-card" class="recibo-card" data-txid="${reciboEmitido.txId}">
        <div class="stamp-sucesso">REGISTRADO NA BLOCKCHAIN COM SUCESSO</div>
        <h2 id="receipt-title">${reciboEmitido.meetingSnapshot.title}</h2>
        <span id="receipt-hash-val">${reciboEmitido.documentHash}</span>
        <span id="receipt-txid-val">${reciboEmitido.txId}</span>
        <span id="receipt-block-val">#${reciboEmitido.blockNumber}</span>
      </div>
    `;
  }

  travarInterface(dadosHigienizados, dom.window.document);

  const receiptInDom = dom.window.document.getElementById('crypto-receipt-card');
  const txInDom = dom.window.document.getElementById('receipt-txid-val')?.textContent;
  const domVerified = receiptInDom !== null && txInDom === resultadoTx.txId && eventCaptured;

  // Render e verificação no DOM consome ~1 segundo na escala real (~0.0003 horas)
  const domVerificationHours = Number((1.0 / 3600).toFixed(6));

  // ============================================================================
  // CÁLCULO FINAL DE METROLOGIA E GARGALO
  // ============================================================================
  const totalClosingHours = Number(
    (sanitizationHours + messagingDispatchHours + humanDeliberationHours + blockchainConfirmationHours + domVerificationHours).toFixed(3)
  );

  const tEndReal = tStartReal + Math.round(totalClosingHours * 3600 * 1000);
  const tEndIso = new Date(tEndReal).toISOString();

  // Decomposição de proporção de gargalo
  const shares: Record<GargaloIdentificado, number> = {
    LENTIDAO_HUMANA: humanDeliberationHours,
    MENSAGERIA: messagingDispatchHours,
    CONFIRMACAO_BLOCKCHAIN: blockchainConfirmationHours,
    PRE_VALIDACAO_CLIENTE: sanitizationHours + domVerificationHours
  };

  let primaryBottleneck: GargaloIdentificado = 'LENTIDAO_HUMANA';
  let maxDuration = 0;
  for (const [key, val] of Object.entries(shares) as [GargaloIdentificado, number][]) {
    if (val > maxDuration) {
      maxDuration = val;
      primaryBottleneck = key;
    }
  }

  const bottleneckPercentage = Number(((maxDuration / Math.max(0.0001, totalClosingHours)) * 100).toFixed(1));
  const tBenchEnd = performance.now();

  const phases: TTFAHoursPhaseBreakdown = {
    sanitizationHours,
    messagingDispatchHours,
    humanDeliberationHours,
    blockchainConfirmationHours,
    domVerificationHours,
    totalClosingHours
  };

  return {
    runId: params.runId,
    meetingId: proposta.id,
    title: meetingData.title,
    academicUnit: meetingData.academicUnit || 'Institucional',
    signersCount: proposta.coSigners.length,
    tStartIso,
    tEndIso,
    phases,
    totalClosingHours,
    withinSla24h: totalClosingHours <= 24.0,
    txId: resultadoTx.txId,
    blockNumber: resultadoTx.blockNumber,
    eventEmitted: eventCaptured,
    domVerified,
    primaryBottleneck,
    bottleneckPercentage,
    benchExecutionDurationMs: Number((tBenchEnd - tBenchStart).toFixed(2))
  };
}

// ------------------------------------------------------------------------------
// MOTOR ESTATÍSTICO DE COMPILAÇÃO DE LOTES E ANÁLISE DE GARGALOS
// ------------------------------------------------------------------------------

/**
 * Calcula a mediana de um array de números
 */
function calcularMedianaArray(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ord = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(ord.length / 2);
  if (ord.length % 2 !== 0) return ord[mid];
  return (ord[mid - 1] + ord[mid]) / 2;
}

/**
 * Calcula percentis arbitrários (P90, P95)
 */
function calcularPercentilArray(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ord = [...valores].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * ord.length) - 1;
  const validIdx = Math.max(0, Math.min(idx, ord.length - 1));
  return ord[validIdx];
}

/**
 * Compila estatísticas completas do lote de atas em horas, avalia o SLA de 24h e extrai a causa-raiz dos gargalos.
 */
export function compilarEstatisticasLoteTTFA(
  measurements: TTFAHoursMeasurement[],
  batchMeta: { batchId: string; batchName: string; description?: string; slaLimitHours?: number }
): BatchHoursStatistics {
  const n = measurements.length;
  if (n === 0) {
    throw new Error('Não é possível compilar estatísticas de um lote sem medições.');
  }

  const slaThreshold = batchMeta.slaLimitHours ?? 24.0;
  const totalHoursList = measurements.map(m => m.totalClosingHours);

  // Média (μ)
  const soma = totalHoursList.reduce((acc, v) => acc + v, 0);
  const meanHours = Number((soma / n).toFixed(2));

  // Mediana (Q2)
  const medianHours = Number(calcularMedianaArray(totalHoursList).toFixed(2));

  // Variância e Desvio Padrão (σ)
  const somaQuadrados = totalHoursList.reduce((acc, v) => acc + Math.pow(v - meanHours, 2), 0);
  const varianceHours = n > 1 ? Number((somaQuadrados / (n - 1)).toFixed(2)) : 0;
  const stdDevHours = n > 1 ? Number(Math.sqrt(varianceHours).toFixed(2)) : 0;

  const minHours = Number(Math.min(...totalHoursList).toFixed(2));
  const maxHours = Number(Math.max(...totalHoursList).toFixed(2));
  const p90Hours = Number(calcularPercentilArray(totalHoursList, 90).toFixed(2));
  const p95Hours = Number(calcularPercentilArray(totalHoursList, 95).toFixed(2));

  // Validação de SLA (ex: 95% das atas fechadas em até 24h)
  const atasWithinSlaCount = measurements.filter(m => m.totalClosingHours <= slaThreshold).length;
  const complianceRatePercentage = Number(((atasWithinSlaCount / n) * 100).toFixed(1));
  const slaPass = p95Hours <= slaThreshold && complianceRatePercentage >= 95.0;

  // Decomposição média das etapas
  const somaHuman = measurements.reduce((acc, m) => acc + m.phases.humanDeliberationHours, 0);
  const somaMsg = measurements.reduce((acc, m) => acc + m.phases.messagingDispatchHours, 0);
  const somaChain = measurements.reduce((acc, m) => acc + m.phases.blockchainConfirmationHours, 0);
  const somaPreDom = measurements.reduce(
    (acc, m) => acc + m.phases.sanitizationHours + m.phases.domVerificationHours,
    0
  );

  const humanDeliberationSharePct = Number(((somaHuman / soma) * 100).toFixed(1));
  const messagingSharePct = Number(((somaMsg / soma) * 100).toFixed(1));
  const blockchainSharePct = Number(((somaChain / soma) * 100).toFixed(1));
  const preValidationAndDomSharePct = Number(((somaPreDom / soma) * 100).toFixed(1));

  // Identificação dos gargalos dominante e secundário
  const sharesSorted = [
    { type: 'LENTIDAO_HUMANA' as GargaloIdentificado, pct: humanDeliberationSharePct },
    { type: 'CONFIRMACAO_BLOCKCHAIN' as GargaloIdentificado, pct: blockchainSharePct },
    { type: 'MENSAGERIA' as GargaloIdentificado, pct: messagingSharePct },
    { type: 'PRE_VALIDACAO_CLIENTE' as GargaloIdentificado, pct: preValidationAndDomSharePct }
  ].sort((a, b) => b.pct - a.pct);

  const dominantBottleneck = sharesSorted[0].type;
  const secondaryBottleneck = sharesSorted[1].type;

  let rootCauseDiagnosis = '';
  let governanceRecommendation = '';

  if (dominantBottleneck === 'LENTIDAO_HUMANA') {
    rootCauseDiagnosis = `O gargalo crítico absoluto do TTFA reside na lentidão de resposta humana dos pares acadêmicos, respondendo por ${humanDeliberationSharePct}% do tempo total de ciclo. A infraestrutura técnica (blockchain + mensageria) representa menos de ${(100 - humanDeliberationSharePct).toFixed(1)}% da latência.`;
    governanceRecommendation = `Instituir gatilho de notificação automática de re-engajamento via e-mail e SMS após 6h e 12h de inação do co-signatário, além de quórum flexível M-de-N para evitar bloqueios por avaliadores ausentes.`;
  } else if (dominantBottleneck === 'CONFIRMACAO_BLOCKCHAIN') {
    rootCauseDiagnosis = `A confirmação em bloco da blockchain representa o maior ponto de retenção (${blockchainSharePct}%), decorrente de congestionamento na rede EVM ou taxa de gás prioritária insuficiente.`;
    governanceRecommendation = `Adotar otimização de EIP-1559 com ajuste dinâmico de maxPriorityFeePerGas ou migração para rede L2/rollup (ex: Arbitrum ou Polygon).`;
  } else {
    rootCauseDiagnosis = `Atrasos no despacho de mensageria institucional e entrega SMTP constituem o principal fator de atrito (${messagingSharePct}%).`;
    governanceRecommendation = `Otimizar a fila de mensageria com provedor transacional de alto throughput e webhooks diretos de leitura.`;
  }

  return {
    batchId: batchMeta.batchId,
    batchName: batchMeta.batchName,
    description: batchMeta.description || 'Auditoria de Lote TTFA em Escala de Horas',
    timestamp: new Date().toISOString(),
    totalAtas: n,
    meanHours,
    medianHours,
    stdDevHours,
    varianceHours,
    minHours,
    maxHours,
    p90Hours,
    p95Hours,
    slaThresholdHours: slaThreshold,
    atasWithinSlaCount,
    complianceRatePercentage,
    slaPass,
    bottleneckBreakdown: {
      humanDeliberationSharePct,
      messagingSharePct,
      blockchainSharePct,
      preValidationAndDomSharePct,
      dominantBottleneck,
      secondaryBottleneck,
      rootCauseDiagnosis,
      governanceRecommendation
    },
    measurements
  };
}

// ------------------------------------------------------------------------------
// EXECUTOR DE SIMULAÇÃO PARAMETRIZADA DE LOTES DE ATAS
// ------------------------------------------------------------------------------

/**
 * Simula um lote completo de atas com distribuição configurada de resposta dos signatários
 */
export async function simularLoteAtasHours(config: BatchSimulationScenarioConfig): Promise<BatchHoursStatistics> {
  const measurements: TTFAHoursMeasurement[] = [];
  const dist = config.humanResponseDistribution;

  for (let i = 0; i < config.ataCount; i++) {
    // Cálculo do atraso humano para a ata i
    let humanHours: number;
    const isOutlier = dist.outlierChance && Math.random() < dist.outlierChance;

    if (isOutlier && dist.outlierHours) {
      humanHours = dist.outlierHours + (Math.random() * 4 - 2);
    } else {
      // Distribuição pseudo-normal em torno de baseHoursPerSigner
      const jitter = (Math.random() + Math.random() - 1.0) * dist.jitterHours;
      humanHours = Math.max(0.5, dist.baseHoursPerSigner + jitter);
    }

    const measurement = await executarMacrofluxoAtaHours({
      runId: `${config.batchId}_ata_${i + 1}`,
      meetingIndex: i,
      humanDeliberationHours: humanHours,
      messagingLatencyMinutes: config.messagingLatencyMinutes,
      blockchainLatencySeconds: config.blockchainLatencySeconds
    });

    measurements.push(measurement);
  }

  return compilarEstatisticasLoteTTFA(measurements, {
    batchId: config.batchId,
    batchName: config.batchName,
    description: config.description,
    slaLimitHours: config.slaLimitHours ?? 24.0
  });
}

// ------------------------------------------------------------------------------
// GERADOR DE RELATÓRIO ESTRUTURADO DE GARGALOS E SLA
// ------------------------------------------------------------------------------

/**
 * Gera relatório visual em ASCII/ANSI detalhando estatísticas, validação de SLA (24h) e análise de gargalos
 */
export function gerarRelatorioEstruturadoGargalos(stats: BatchHoursStatistics): string {
  const ANSI_RESET = '\x1b[0m';
  const ANSI_BOLD = '\x1b[1m';
  const ANSI_GREEN = '\x1b[32m';
  const ANSI_YELLOW = '\x1b[33m';
  const ANSI_RED = '\x1b[31m';
  const ANSI_BLUE = '\x1b[34m';
  const ANSI_CYAN = '\x1b[36m';
  const ANSI_BG_RED = '\x1b[41m\x1b[37m';
  const ANSI_BG_GREEN = '\x1b[42m\x1b[30m';

  const sepDuplo = '═'.repeat(82);
  const sepSimples = '─'.repeat(82);

  const linhas: string[] = [];
  linhas.push(`\n${ANSI_BLUE}╔${sepDuplo}╗${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} AUDITORIA DE FECHAMENTO DE ATA (TTFA) EM ESCALA DE HORAS & ANÁLISE DE GARGALOS ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${sepDuplo}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Lote Auditado: ${ANSI_BOLD}${stats.batchName}${ANSI_RESET} (${stats.batchId})`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Total de Atas Auditadas: ${ANSI_BOLD}${stats.totalAtas}${ANSI_RESET} | Data de Execução: ${stats.timestamp}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_RESET} Meta de SLA Institucional: ${ANSI_BOLD}95% das atas concluídas em até ${stats.slaThresholdHours.toFixed(1)} horas${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${sepDuplo}╣${ANSI_RESET}`);

  // Tabela Individual
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} DISCRIMINAÇÃO DO LOTE DE ATAS (t_start -> Multisig -> Blockchain -> t_end)     ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  linhas.push(`  ${ANSI_BOLD}ID / Título Resumido${ANSI_RESET.padEnd(34)} ${ANSI_BOLD}Signatários${ANSI_RESET.padEnd(14)} ${ANSI_BOLD}TTFA (h)${ANSI_RESET.padEnd(12)} ${ANSI_BOLD}Gargalo Crítico${ANSI_RESET.padEnd(16)} ${ANSI_BOLD}SLA (<=24h)${ANSI_RESET}`);

  for (const m of stats.measurements.slice(0, 8)) {
    const tituloTrunc = (m.title.length > 28 ? m.title.substring(0, 25) + '...' : m.title).padEnd(30);
    const signersStr = `${m.signersCount} pares`.padEnd(12);
    const ttfaStr = `${m.totalClosingHours.toFixed(2)} h`.padEnd(10);
    const gargaloStr = `${m.primaryBottleneck} (${m.bottleneckPercentage}%)`.padEnd(20);
    const slaStr = m.withinSla24h 
      ? `${ANSI_GREEN}✔ Conforme${ANSI_RESET}` 
      : `${ANSI_RED}✖ Excedido (+${(m.totalClosingHours - stats.slaThresholdHours).toFixed(1)}h)${ANSI_RESET}`;

    linhas.push(`  ${tituloTrunc} ${signersStr} ${ttfaStr} ${gargaloStr} ${slaStr}`);
  }

  if (stats.measurements.length > 8) {
    linhas.push(`  ... e mais ${stats.measurements.length - 8} atas computadas no lote.`);
  }

  linhas.push(`${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} 1. AGREGAÇÃO ESTATÍSTICA DO TEMPO TOTAL DE FECHAMENTO (TTFA)                ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  linhas.push(`  • Média Aritmética (μ):       ${ANSI_BOLD}${stats.meanHours.toFixed(2)} horas${ANSI_RESET}`);
  linhas.push(`  • Mediana (Q2):              ${ANSI_BOLD}${stats.medianHours.toFixed(2)} horas${ANSI_RESET}`);
  linhas.push(`  • Desvio Padrão Amostral (σ):${ANSI_BOLD}${stats.stdDevHours.toFixed(2)} horas${ANSI_RESET} (Variância: ${stats.varianceHours.toFixed(2)} h²)`);
  linhas.push(`  • Intervalo de Dispersão:    [ Mín: ${stats.minHours.toFixed(2)} h  ──  Máx: ${stats.maxHours.toFixed(2)} h ]`);
  linhas.push(`  • Percentil 90 (P90):        ${stats.p90Hours.toFixed(2)} horas`);
  linhas.push(`  • Percentil 95 (P95):        ${ANSI_BOLD}${stats.p95Hours.toFixed(2)} horas${ANSI_RESET} (Métrica de corte do SLA)`);

  linhas.push(`${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} 2. VALIDAÇÃO AUTOMATIZADA CONTRA O SLA INSTITUCIONAL (95% <= 24h)            ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  linhas.push(`  • Atas em Conformidade (<= 24h):  ${ANSI_BOLD}${stats.atasWithinSlaCount}/${stats.totalAtas}${ANSI_RESET} (${ANSI_BOLD}${stats.complianceRatePercentage}%${ANSI_RESET})`);
  linhas.push(`  • Percentil 95 Registrado:        ${ANSI_BOLD}${stats.p95Hours.toFixed(2)} h${ANSI_RESET} (Tolerância Máxima do SLA: ${stats.slaThresholdHours.toFixed(1)} h)`);

  if (stats.slaPass) {
    linhas.push(`\n  ${ANSI_BG_GREEN}${ANSI_BOLD} ✔ VEREDITO DO SLA: SISTEMA CONFORME À NORMA INSTITUCIONAL                    ${ANSI_RESET}`);
    linhas.push(`  A taxa de conformidade (${stats.complianceRatePercentage}%) e o P95 (${stats.p95Hours.toFixed(2)}h) atendem plenamente`);
    linhas.push(`  à exigência de fechamento tempestivo das atas em até 24 horas.`);
  } else {
    linhas.push(`\n  ${ANSI_BG_RED}${ANSI_BOLD} ✖ VEREDITO DO SLA: VIOLAÇÃO DE SLA DETECTADA (NÃO CONFORME)                  ${ANSI_RESET}`);
    linhas.push(`  ${ANSI_RED}${ANSI_BOLD}O percentil 95 (${stats.p95Hours.toFixed(2)}h) ou a taxa de conformidade (${stats.complianceRatePercentage}%) violaram a norma!${ANSI_RESET}`);
  }

  linhas.push(`\n${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}║${ANSI_BOLD} 3. DECOMPOSIÇÃO E IDENTIFICAÇÃO ESTRUTURADA DE GARGALOS                     ${ANSI_RESET}${ANSI_BLUE}║${ANSI_RESET}`);
  linhas.push(`${ANSI_BLUE}╠${sepSimples}╣${ANSI_RESET}`);
  
  // Gráfico de Barras em Texto dos Gargalos
  const b = stats.bottleneckBreakdown;
  const barHuman = '█'.repeat(Math.round(b.humanDeliberationSharePct / 2.5));
  const barChain = '█'.repeat(Math.round(b.blockchainSharePct / 2.5));
  const barMsg = '█'.repeat(Math.round(b.messagingSharePct / 2.5));

  linhas.push(`  [1] LENTIDÃO HUMANA (Consenso dos Pares):  ${ANSI_YELLOW}${barHuman}${ANSI_RESET} ${b.humanDeliberationSharePct}%`);
  linhas.push(`  [2] CONFIRMAÇÃO BLOCKCHAIN (Mineração EVM): ${ANSI_CYAN}${barChain}${ANSI_RESET} ${b.blockchainSharePct}%`);
  linhas.push(`  [3] MENSAGERIA & ENTREGA (Magic Links):    ${ANSI_GREEN}${barMsg}${ANSI_RESET} ${b.messagingSharePct}%`);
  linhas.push(`  [4] PRÉ-VALIDAÇÃO REGEX & DOM:            ${b.preValidationAndDomSharePct}%`);

  linhas.push(`\n  ${ANSI_BOLD}Diagnóstico de Causa-Raiz (Root-Cause):${ANSI_RESET}`);
  linhas.push(`  ${b.rootCauseDiagnosis}`);

  linhas.push(`\n  ${ANSI_BOLD}Recomendação de Engenharia e Governança:${ANSI_RESET}`);
  linhas.push(`  ${b.governanceRecommendation}`);

  linhas.push(`${ANSI_BLUE}╚${sepDuplo}╝${ANSI_RESET}\n`);

  return linhas.join('\n');
}
