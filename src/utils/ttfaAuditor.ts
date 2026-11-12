/**
 * ==============================================================================
 * MOTOR DE AUDITORIA E BENCHMARK DO TEMPO DE FECHAMENTO DE ATA (TTFA)
 * Arquivo: src/utils/ttfaAuditor.ts
 * Perfil: Engenheiro de Software Sênior, Desenvolvedor DApp e Especialista em QA
 * ==============================================================================
 * 
 * Definição Metrológica:
 * TTFA (Total Meeting Closing Time / Tempo de Fechamento de Ata):
 * Intervalo de tempo rigorosamente medido desde a submissão inicial dos dados
 * no formulário (t_start), passando pela sanitização regex de strings, emissão
 * de links mágicos, coleta assíncrona de assinaturas de múltiplos signatários
 * (Multisig), transmissão e mineração da transação no contrato inteligente
 * Solidity, até a confirmação e renderização visual do recibo criptográfico no DOM (t_end).
 * 
 * TTFA = t_end - t_start = T_sanitização + T_multisig + T_blockchain + T_dom_render
 * ==============================================================================
 */

import { createIsolatedDomSandbox, VirtualDOMLike } from './domSandbox';
import { 
  AcademicMeetingData, 
  CryptoReceipt, 
  WalletState, 
  InstitutionalUser,
  TTFAMeasurement,
  TTFAPhaseBreakdown,
  TTFACohortConfig,
  TTFACohortResult,
  TTFAStatistics,
  TTFASuiteSummary 
} from '../types';
import { sanitizarInputAta, validarCamposAta } from './validation';
import { buildCanonicalMeetingString, calculateKeccak256 } from './crypto';
import { criarPropostaMultisig, atestarAssinaturaParticipante, marcarAtaConsolidadaOnChain } from './magicLinkMultisig';
import { transmitirEConfirmarHashOnChain, compilarReciboCriptografico } from './blockchainConnector';
import { travarInterface } from './web3Lockdown';

/**
 * Dados padrão de ata acadêmica para os ciclos de auditoria
 */
export function criarDadosAtaPadrao(indice: number): AcademicMeetingData {
  return {
    dateTime: new Date(Date.now() - indice * 3600000).toISOString(),
    title: `Ata de Sessão Solene de Defesa de Doutorado #${indice.toString().padStart(3, '0')}`,
    pauta: `Avaliação do modelo de consenso, tolerância a falhas bizantinas e medição de latência TTFA do lote ${indice}.`,
    deliberacoes: `O comitê deliberou pela aprovação com distinção acadêmica e determinação de consolidação imutável on-chain #${indice}.`,
    meetingType: 'Banca / Defesa',
    academicUnit: 'Instituto de Computação e Engenharia de Software',
    participants: [
      {
        id: 'part_aluno',
        role: 'Aluno',
        name: 'Lucas Ferreira',
        departmentOrId: 'Matrícula 20220918',
        checked: true,
        email: 'lucas.aluno@universidade.edu.br',
        walletAddress: '0x71C59a38F8e684077674681f215E5c6778401aB7'
      },
      {
        id: 'part_orientador',
        role: 'Orientador',
        name: 'Profa. Dra. Mariana Salles',
        departmentOrId: 'Depto. de Ciência da Computação',
        checked: true,
        email: 'mariana.salles@universidade.edu.br',
        walletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30'
      },
      {
        id: 'part_avaliador',
        role: 'Professor',
        name: 'Prof. Dr. Roberto Albuquerque',
        departmentOrId: 'Membro Externo / Coordenadoria',
        checked: true,
        email: 'roberto.albuquerque@universidade.edu.br',
        walletAddress: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E'
      }
    ],
    summaryAndDecisions: `Resumo técnico homologado e atestado para a sessão #${indice}.`,
    actionChecklist: [
      { id: 'act_1', label: 'Assinatura eletrônica via Magic Link', completed: true },
      { id: 'act_2', label: 'Geração do recibo criptográfico e hash bytes32', completed: true },
      { id: 'act_3', label: 'Arquivamento no repositório institucional', completed: false }
    ],
    extraNotes: 'Auditoria de fechamento TTFA realizada sob controle estrito de QA.'
  };
}

/**
 * Cria uma carteira simulada para uso nas medições
 */
export function criarWalletMock(): WalletState {
  return {
    isConnected: true,
    address: '0x71C59a38F8e684077674681f215E5c6778401aB7',
    network: {
      id: 'sepolia',
      name: 'Ethereum Sepolia Testnet',
      chainId: 11155111,
      currencySymbol: 'ETH',
      explorerUrl: 'https://sepolia.etherscan.io',
      badgeColor: 'border-emerald-600 bg-emerald-50 text-emerald-800'
    },
    balance: '2.500',
    isSimulated: true
  };
}

/**
 * Opções de configuração para execução de um ciclo individual de TTFA
 */
export interface CicloTTFAOptions {
  runId: string;
  iteration: number;
  cohortId: string;
  cohortName: string;
  signerDelaysMs: number[];
  domInstance?: VirtualDOMLike;
  meetingData?: AcademicMeetingData;
  wallet?: WalletState;
  contractAddress?: string;
}

/**
 * Executa um ciclo completo de ponta a ponta medindo timestamps em alta resolução
 * (t_start até t_end) e validando o recibo criptográfico no DOM.
 */
export async function executarCicloFechamentoAta(
  options: CicloTTFAOptions
): Promise<TTFAMeasurement> {
  const {
    runId,
    iteration,
    cohortId,
    cohortName,
    signerDelaysMs,
    meetingData = criarDadosAtaPadrao(iteration),
    wallet = criarWalletMock(),
    contractAddress = '0x3a48981A4aE8e08Fa6714E69719F8a0fF08d74B2'
  } = options;

  // Inicializa ambiente DOM isolado se não fornecido (compatível com Browser e Node.js)
  let dom = options.domInstance;
  if (!dom) {
    dom = createIsolatedDomSandbox(`
      <div id="container-modal-recibo"></div>
      <div id="lista-recibos"></div>
      <form id="meeting-form" data-status-ata="Rascunho"></form>
    `);
  }

  // ============================================================================
  // MARCO TEMPORAL 0 (t_start): Início formal da submissão do formulário
  // ============================================================================
  const tStart = performance.now();

  // ----------------------------------------------------------------------------
  // ETAPA 1: Sanitização Regex, Validação de Densidade e Geração de Hash (T_sanit)
  // ----------------------------------------------------------------------------
  const t1_start = performance.now();
  const tituloSanitizado = sanitizarInputAta(meetingData.title);
  const pautaSanitizada = sanitizarInputAta(meetingData.pauta || '');
  const deliberacoesSanitizadas = sanitizarInputAta(meetingData.deliberacoes || '');

  const validacao = validarCamposAta(tituloSanitizado, pautaSanitizada, deliberacoesSanitizadas);
  if (!validacao.valido) {
    throw new Error(`[TTFA] Falha de validação e sanitização dos campos na iteração ${iteration}: ${validacao.motivoBloqueio}`);
  }

  // Atualiza dados com strings sanitizadas
  const dadosHigienizados: AcademicMeetingData = {
    ...meetingData,
    title: tituloSanitizado,
    pauta: pautaSanitizada,
    deliberacoes: deliberacoesSanitizadas
  };

  const canonicalString = buildCanonicalMeetingString(dadosHigienizados);
  const documentHash = calculateKeccak256(canonicalString);
  const t1_end = performance.now();
  const sanitizationMs = t1_end - t1_start;

  // ----------------------------------------------------------------------------
  // ETAPA 2: Criação de Proposta Multisig e Coleta Assíncrona via Magic Links (T_multisig)
  // ----------------------------------------------------------------------------
  const t2_start = performance.now();
  const proposerUser: InstitutionalUser = {
    nome: meetingData.participants[0].name,
    email: meetingData.participants[0].email || 'proposer@universidade.edu.br',
    role: 'aluno',
    matricula: '20220918',
    walletAddress: wallet.address || '0x71C59a38F8e684077674681f215E5c6778401aB7'
  };

  const proposta = criarPropostaMultisig({
    meetingData: dadosHigienizados,
    documentHash,
    hashAlgorithm: 'Keccak-256',
    canonicalString,
    proposerUser,
    proposerWallet: wallet.address || undefined
  });

  // Simulação assíncrona parametrizada do tempo de resposta dos signatários
  // Cada co-signatário recebe seu link mágico e atesta após seu respectivo delay
  for (let i = 0; i < proposta.coSigners.length; i++) {
    const coSigner = proposta.coSigners[i];
    const delay = signerDelaysMs[i] ?? signerDelaysMs[signerDelaysMs.length - 1] ?? 50;
    
    // Simula o tempo assíncrono real de leitura e assinatura via link mágico
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const resultadoAtestacao = atestarAssinaturaParticipante(proposta.id, coSigner.participantId, coSigner.magicToken);
    if (!resultadoAtestacao.sucesso) {
      throw new Error(`[TTFA] Falha na atestação do signatário ${coSigner.name}`);
    }
  }

  const t2_end = performance.now();
  const multisigMs = t2_end - t2_start;

  // ----------------------------------------------------------------------------
  // ETAPA 3: Transmissão e Mineração no Smart Contract Solidity (T_blockchain)
  // ----------------------------------------------------------------------------
  const t3_start = performance.now();
  
  // Transmissão e confirmação de inclusão em bloco on-chain
  const resultadoTx = await transmitirEConfirmarHashOnChain({
    documentHash,
    contractAddress,
    wallet
  });

  const propostaConsolidada = marcarAtaConsolidadaOnChain(proposta.id, resultadoTx.txId);
  if (propostaConsolidada.status !== 'CONSOLIDADA_ON_CHAIN') {
    throw new Error(`[TTFA] Estado da proposta não transitou para CONSOLIDADA_ON_CHAIN`);
  }

  const t3_end = performance.now();
  const blockchainMs = t3_end - t3_start;

  // ----------------------------------------------------------------------------
  // ETAPA 4: Compilação do Recibo Criptográfico e Renderização no DOM (T_dom_render)
  // ----------------------------------------------------------------------------
  const t4_start = performance.now();

  const reciboEmitido: CryptoReceipt = compilarReciboCriptografico({
    resultadoTx,
    documentHash,
    meetingData: dadosHigienizados,
    canonicalDataString: canonicalString,
    coSigners: propostaConsolidada.coSigners
  });

  // Renderização imperativa no Document Object Model (DOM)
  const containerModal = dom.window.document.getElementById('container-modal-recibo');
  if (containerModal) {
    containerModal.style.display = 'block';
    containerModal.innerHTML = `
      <div id="crypto-receipt-card" class="recibo-card" data-txid="${reciboEmitido.txId}">
        <div class="stamp-sucesso">REGISTRADO NA BLOCKCHAIN COM SUCESSO</div>
        <h2 id="receipt-title">${reciboEmitido.meetingSnapshot.title}</h2>
        <span id="receipt-hash-val">${reciboEmitido.documentHash}</span>
        <span id="receipt-txid-val">${reciboEmitido.txId}</span>
        <span id="receipt-block-val">#${reciboEmitido.blockNumber}</span>
        <span id="receipt-status-val">${reciboEmitido.status}</span>
        <div id="receipt-signers-count">${reciboEmitido.coSigners?.length || 0}</div>
      </div>
    `;
  }

  // Travamento de imutabilidade na interface isolada (sandbox)
  travarInterface(dadosHigienizados, dom.window.document);

  // Verificação rigorosa no DOM
  const receiptCardInDom = dom.window.document.getElementById('crypto-receipt-card');
  const txIdInDom = dom.window.document.getElementById('receipt-txid-val')?.textContent;
  const hashInDom = dom.window.document.getElementById('receipt-hash-val')?.textContent;
  const titleInDom = dom.window.document.getElementById('receipt-title')?.textContent;

  const domVerified = 
    receiptCardInDom !== null &&
    txIdInDom === resultadoTx.txId &&
    hashInDom === documentHash &&
    titleInDom === dadosHigienizados.title;

  if (!domVerified) {
    throw new Error(`[TTFA] Falha ao verificar a presença íntegra do recibo no DOM na iteração ${iteration}`);
  }

  const t4_end = performance.now();
  const domRenderMs = t4_end - t4_start;

  // ============================================================================
  // MARCO TEMPORAL FINAL (t_end): Recibo certificado e visível no DOM
  // ============================================================================
  const tEnd = performance.now();
  const totalClosingTimeMs = tEnd - tStart;

  const phases: TTFAPhaseBreakdown = {
    sanitizationMs: Number(sanitizationMs.toFixed(3)),
    multisigMs: Number(multisigMs.toFixed(3)),
    blockchainMs: Number(blockchainMs.toFixed(3)),
    domRenderMs: Number(domRenderMs.toFixed(3)),
    totalClosingTimeMs: Number(totalClosingTimeMs.toFixed(3))
  };

  return {
    runId,
    iteration,
    cohortId,
    cohortName,
    tStart: Number(tStart.toFixed(2)),
    tEnd: Number(tEnd.toFixed(2)),
    phases,
    txId: resultadoTx.txId,
    blockNumber: resultadoTx.blockNumber,
    success: true,
    domVerified: true,
    signerCount: propostaConsolidada.coSigners.length
  };
}

// ==============================================================================
// MOTOR ESTATÍSTICO DE QUALIDADE (QA STATISTICAL PROCESS CONTROL)
// ==============================================================================

/**
 * Calcula a média aritmética de um array numérico
 */
export function calcularMedia(valores: number[]): number {
  if (valores.length === 0) return 0;
  const soma = valores.reduce((acc, v) => acc + v, 0);
  return Number((soma / valores.length).toFixed(2));
}

/**
 * Calcula a mediana (segundo quartil Q2)
 */
export function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  if (ordenados.length % 2 !== 0) {
    return Number(ordenados[meio].toFixed(2));
  }
  return Number(((ordenados[meio - 1] + ordenados[meio]) / 2).toFixed(2));
}

/**
 * Calcula o desvio padrão amostral
 */
export function calcularDesvioPadrao(valores: number[], media: number): number {
  if (valores.length <= 1) return 0;
  const somaQuadrados = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0);
  const variancia = somaQuadrados / (valores.length - 1);
  return Number(Math.sqrt(variancia).toFixed(2));
}

/**
 * Calcula um percentil específico (ex: P95)
 */
export function calcularPercentil(valores: number[], percentil: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.ceil((percentil / 100) * ordenados.length) - 1;
  const indiceValido = Math.max(0, Math.min(indice, ordenados.length - 1));
  return Number(ordenados[indiceValido].toFixed(2));
}

/**
 * Compila todas as métricas estatísticas para uma série de medições TTFA
 */
export function compilarEstatisticas(
  measurements: TTFAMeasurement[],
  slaLimit: number
): TTFAStatistics {
  const tempos = measurements.map(m => m.phases.totalClosingTimeMs);
  const media = calcularMedia(tempos);
  const mediana = calcularMediana(tempos);
  const stdDev = calcularDesvioPadrao(tempos, media);
  const min = tempos.length ? Number(Math.min(...tempos).toFixed(2)) : 0;
  const max = tempos.length ? Number(Math.max(...tempos).toFixed(2)) : 0;
  const p95 = calcularPercentil(tempos, 95);

  const meanPhases = {
    sanitizationMs: calcularMedia(measurements.map(m => m.phases.sanitizationMs)),
    multisigMs: calcularMedia(measurements.map(m => m.phases.multisigMs)),
    blockchainMs: calcularMedia(measurements.map(m => m.phases.blockchainMs)),
    domRenderMs: calcularMedia(measurements.map(m => m.phases.domRenderMs))
  };

  const slaPass = media <= slaLimit && p95 <= slaLimit * 1.25;

  return {
    count: measurements.length,
    mean: media,
    median: mediana,
    stdDev,
    min,
    max,
    p95,
    meanPhases,
    slaLimit,
    slaPass
  };
}

// ==============================================================================
// COORTES PARAMETRIZADAS DE TESTE DE CARGA E RESILIÊNCIA
// ==============================================================================

export const COORTES_PADRAO_AUDITORIA: TTFACohortConfig[] = [
  {
    id: 'coorte-agilidade-maxima',
    name: 'Coorte A: Agilidade Máxima (Sessão Síncrona / Quórum Imediato)',
    description: 'Signatários ativos na sessão com confirmação quase instantânea de link mágico (15ms - 40ms por participante).',
    runs: 6,
    signerDelaysMs: [15, 25, 35],
    slaThresholdMs: 2500 // Limite de controle de 2.500 ms
  },
  {
    id: 'coorte-nominal-academica',
    name: 'Coorte B: Cenário Acadêmico Típico (Interação Nominal de Membros)',
    description: 'Comportamento padrão com latência moderada na abertura de e-mails e atestação (70ms - 150ms por participante).',
    runs: 8,
    signerDelaysMs: [70, 110, 140],
    slaThresholdMs: 3200 // Limite de controle de 3.200 ms
  },
  {
    id: 'coorte-alta-latencia',
    name: 'Coorte C: Alta Latência / Avaliadores Remotos Dispersos',
    description: 'Membros externos em conexões heterogêneas ou com tempo de resposta estendido (200ms - 350ms por participante).',
    runs: 6,
    signerDelaysMs: [200, 280, 340],
    slaThresholdMs: 4200 // Limite de controle de 4.200 ms
  },
  {
    id: 'coorte-heterogenea-gargalo',
    name: 'Coorte D: Heterogênea com Gargalo Assíncrono',
    description: 'Signatários com latências desbalanceadas simulando atraso em signatário chave (20ms, 90ms, 400ms).',
    runs: 6,
    signerDelaysMs: [20, 90, 400],
    slaThresholdMs: 3800 // Limite de controle de 3.800 ms
  }
];

export interface TTFAAuditExecutionOptions {
  cohorts?: TTFACohortConfig[];
  onProgress?: (info: { coorteIndex: number; runIndex: number; measurement: TTFAMeasurement }) => void;
  globalSlaLimitMs?: number;
}

/**
 * Executa a suíte de auditoria completa em lotes de teste parametrizados
 */
export async function executarAuditoriaTTFAParametrizada(
  options: TTFAAuditExecutionOptions = {}
): Promise<TTFASuiteSummary> {
  const cohorts = options.cohorts || COORTES_PADRAO_AUDITORIA;
  const globalSlaLimit = options.globalSlaLimitMs || 3500;
  const cohortResults: TTFACohortResult[] = [];
  const allMeasurements: TTFAMeasurement[] = [];

  for (let c = 0; c < cohorts.length; c++) {
    const cohort = cohorts[c];
    const measurements: TTFAMeasurement[] = [];

    for (let r = 1; r <= cohort.runs; r++) {
      const runId = `ttfa_${cohort.id}_r${r}`;
      
      // Resolve delays
      let delays: number[] = [];
      if (typeof cohort.signerDelaysMs === 'function') {
        delays = [cohort.signerDelaysMs(0), cohort.signerDelaysMs(1), cohort.signerDelaysMs(2)];
      } else {
        delays = [...cohort.signerDelaysMs];
      }

      // Adiciona jitter realista (variabilidade estocástica de +/- 10%)
      const jitteredDelays = delays.map(d => Math.max(5, Math.round(d * (0.9 + Math.random() * 0.2))));

      const measurement = await executarCicloFechamentoAta({
        runId,
        iteration: r,
        cohortId: cohort.id,
        cohortName: cohort.name,
        signerDelaysMs: jitteredDelays
      });

      measurements.push(measurement);
      allMeasurements.push(measurement);

      options.onProgress?.({
        coorteIndex: c,
        runIndex: r,
        measurement
      });
    }

    const stats = compilarEstatisticas(measurements, cohort.slaThresholdMs);
    cohortResults.push({
      cohort,
      measurements,
      stats
    });
  }

  const globalStats = compilarEstatisticas(allMeasurements, globalSlaLimit);
  const allPassed = cohortResults.every(cr => cr.stats.slaPass) && globalStats.slaPass;

  return {
    timestamp: Date.now(),
    totalRuns: allMeasurements.length,
    cohortResults,
    globalStats,
    systemControlStatus: allPassed ? 'CONFORME' : 'NAO_CONFORME'
  };
}

// ==============================================================================
// FORMATADOR DE RELATÓRIO DE AUDITORIA DE QUALIDADE (QA & DEV)
// ==============================================================================

/**
 * Gera um relatório formatado em ASCII/ANSI detalhado para saída de console e logs de auditoria
 */
export function formatarRelatorioAuditoriaConsole(summary: TTFASuiteSummary): string {
  const { cohortResults, globalStats, totalRuns, systemControlStatus } = summary;
  const dataFormatada = new Date(summary.timestamp).toLocaleString('pt-BR');

  const sepDuplo = '═'.repeat(82);
  const sepSimples = '─'.repeat(82);

  let out = '';
  out += `\n${sepDuplo}\n`;
  out += `  RELATÓRIO DE AUDITORIA QA: TEMPO DE FECHAMENTO DE ATA (TTFA)\n`;
  out += `  DApp: Registro de Ata de Reunião Acadêmica com Imutabilidade On-Chain\n`;
  out += `  Data da Auditoria: ${dataFormatada} | Total de Ciclos Auditados: ${totalRuns}\n`;
  out += `${sepDuplo}\n\n`;

  // Tabela por Coorte
  out += `┌${'─'.repeat(30)}┬──────┬─────────┬─────────┬─────────┬─────────┬──────────┬────────┐\n`;
  out += `│ Coorte / Cenário de Teste     │ Lote │ Média   │ Mediana │ Desv.P. │ P95     │ SLA Max  │ Status │\n`;
  out += `├${'─'.repeat(30)}┼──────┼─────────┼─────────┼─────────┼─────────┼──────────┼────────┤\n`;

  for (const cr of cohortResults) {
    const nomeCortado = cr.cohort.name.split(':')[1]?.trim().slice(0, 28) || cr.cohort.id.slice(0, 28);
    const count = cr.stats.count.toString().padStart(4, ' ');
    const media = `${cr.stats.mean}ms`.padStart(7, ' ');
    const mediana = `${cr.stats.median}ms`.padStart(7, ' ');
    const stdDev = `±${cr.stats.stdDev}ms`.padStart(7, ' ');
    const p95 = `${cr.stats.p95}ms`.padStart(7, ' ');
    const sla = `<=${cr.stats.slaLimit}ms`.padStart(8, ' ');
    const status = cr.stats.slaPass ? ' \x1b[32mPASS\x1b[0m ' : ' \x1b[31mFAIL\x1b[0m ';

    out += `│ ${nomeCortado.padEnd(28, ' ')} │ ${count} │ ${media} │ ${mediana} │ ${stdDev} │ ${p95} │ ${sla} │ ${status} │\n`;
  }

  out += `└${'─'.repeat(30)}┴──────┴─────────┴─────────┴─────────┴─────────┴──────────┴────────┘\n\n`;

  // Decomposição Granular das Etapas (Phase Breakdown)
  out += `DETALHAMENTO MÉDIO POR ETAPA DO CICLO DE FECHAMENTO (DECOMPOSIÇÃO TEMPORAL):\n`;
  out += `${sepSimples}\n`;
  const p = globalStats.meanPhases;
  const pctSanit = ((p.sanitizationMs / globalStats.mean) * 100).toFixed(1);
  const pctMultisig = ((p.multisigMs / globalStats.mean) * 100).toFixed(1);
  const pctChain = ((p.blockchainMs / globalStats.mean) * 100).toFixed(1);
  const pctDom = ((p.domRenderMs / globalStats.mean) * 100).toFixed(1);

  out += `  [1] Sanitização Regex & Hash Keccak-256 : ${p.sanitizationMs.toString().padStart(7, ' ')} ms (${pctSanit.padStart(5, ' ')}%)  [Pré-validação cliente]\n`;
  out += `  [2] Quórum Multisig via Magic Links     : ${p.multisigMs.toString().padStart(7, ' ')} ms (${pctMultisig.padStart(5, ' ')}%)  [Coleta assíncrona]\n`;
  out += `  [3] Transmissão & Mineração Blockchain  : ${p.blockchainMs.toString().padStart(7, ' ')} ms (${pctChain.padStart(5, ' ')}%)  [Consolidação EVM]\n`;
  out += `  [4] Compilação do Recibo & Render no DOM: ${p.domRenderMs.toString().padStart(7, ' ')} ms (${pctDom.padStart(5, ' ')}%)  [Lockdown e Verificação]\n`;
  out += `${sepSimples}\n`;
  out += `  TEMPO MÉDIO GLOBAL (TTFA Global)        : ${globalStats.mean.toString().padStart(7, ' ')} ms (100.0%)\n`;
  out += `  PERCENTIL 95 GLOBAL (P95)               : ${globalStats.p95.toString().padStart(7, ' ')} ms\n`;
  out += `  INTERVALO TOTAL REGISTRADO              : [ Mín: ${globalStats.min}ms | Máx: ${globalStats.max}ms ]\n\n`;

  // Avaliação do Limite de Controle (SLA Compliance)
  out += `AVALIAÇÃO DO LIMITE DE CONTROLE OPERACIONAL (SLA):\n`;
  out += `${sepSimples}\n`;
  out += `  • Limite Superior de Controle Estabelecido (USL): <= ${globalStats.slaLimit} ms\n`;
  out += `  • Tempo Médio de Fechamento Obtido             : ${globalStats.mean} ms\n`;
  out += `  • Margem de Segurança Operacional              : +${(globalStats.slaLimit - globalStats.mean).toFixed(2)} ms (${(((globalStats.slaLimit - globalStats.mean) / globalStats.slaLimit) * 100).toFixed(1)}%)\n`;
  
  if (systemControlStatus === 'CONFORME') {
    out += `\n  \x1b[32m✔ VEREDITO DE QA: SISTEMA CONFORME\x1b[0m\n`;
    out += `    O tempo médio e o percentil 95 atendem plenamente aos limites de tolerância do DApp.\n`;
    out += `    A sincronização assíncrona entre o frontend, quórum multisig e contrato inteligente\n`;
    out += `    opera de forma estável, sem travamentos silenciosos e com garantia de emissão do recibo no DOM.\n`;
  } else {
    out += `\n  \x1b[31m✖ VEREDITO DE QA: SISTEMA NÃO CONFORME\x1b[0m\n`;
    out += `    O tempo de fechamento excedeu o limite de controle estipulado. Revisar tempos de mineração ou quórum.\n`;
  }

  out += `\n${sepDuplo}\n`;
  return out;
}
