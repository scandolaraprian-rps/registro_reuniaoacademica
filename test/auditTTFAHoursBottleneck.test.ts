/**
 * ==============================================================================
 * SCRIPT DE TESTE AUTOMATIZADO: AUDITORIA DO TTFA EM ESCALA DE HORAS
 * Análise de Gargalos (Lentidão Humana vs Mensageria vs Blockchain) e SLA (24h)
 * Arquivo: test/auditTTFAHoursBottleneck.test.ts
 * Perfil: Engenheiro de Software Sênior, Desenvolvedor DApp e Especialista em QA
 * ==============================================================================
 * 
 * ESCOPO E OBJETIVOS DO TESTE:
 * 1. Simular o macrofluxo temporal completo desde o início da submissão saneada (t_start),
 *    período intermediário de consenso assíncrono via Magic Links (em escala de horas),
 *    confirmação on-chain no contrato inteligente Solidity (com escuta de evento mock Hardhat)
 *    até a renderização do recibo no DOM local (t_end).
 * 2. Calcular rigorosamente a Média (μ), Mediana (Q2) e Desvio Padrão (σ) do TTFA para lotes de atas.
 * 3. Validar automaticamente contra a norma institucional de SLA: "95% das atas fechadas em até 24h".
 * 4. Emitir relatório estruturado diagnosticando claramente a causa-raiz dos gargalos.
 * ==============================================================================
 */

import {
  executarMacrofluxoAtaHours,
  compilarEstatisticasLoteTTFA,
  simularLoteAtasHours,
  gerarRelatorioEstruturadoGargalos,
  MockHardhatContractEventListener,
  BatchSimulationScenarioConfig,
  TTFAHoursMeasurement
} from '../src/utils/ttfaHoursAuditor';
import { JSDOM } from 'jsdom';

// Contadores de asserção de QA
let totalAssertions = 0;
let passedAssertions = 0;

function assertQA(condicao: boolean, tituloCenario: string, detalhes?: any) {
  totalAssertions++;
  if (!condicao) {
    console.error(`\x1b[31m  ✖ FALHA DE CONTROLE QA [Teste #${totalAssertions}]: ${tituloCenario}\x1b[0m`);
    if (detalhes) {
      console.error('    Detalhes da falha:', detalhes);
    }
    throw new Error(`Critério de Aceitação de QA não atendido: ${tituloCenario}`);
  }
  passedAssertions++;
  console.log(`\x1b[32m  ✔ PASS [TTFA-HOURS-${totalAssertions.toString().padStart(2, '0')}]:\x1b[0m ${tituloCenario}`);
}

async function executarSuiteTTFAHoursBottleneck() {
  console.log('\n==============================================================================');
  console.log('🔬 AUDITORIA METROLÓGICA AVANÇADA: TTFA EM ESCALA DE HORAS & ANÁLISE DE GARGALOS');
  console.log('   Métrica: Tempo Total de Fechamento de Ata (t_start a t_end)');
  console.log('   Norma Institucional: SLA 95% das Atas Fechadas em até 24 Horas');
  console.log('   Perfil: Engenheiro de Software Sênior & Especialista em QA Web3');
  console.log('==============================================================================\n');

  // ---------------------------------------------------------------------------
  // FASE 1: AUDITORIA DE MACROFLUXO UNITÁRIO E MOCK DO EVENT LISTENER HARDHAT
  // ---------------------------------------------------------------------------
  console.log('\x1b[34m[FASE 1] Verificação Unitária do Macrofluxo Temporal com Evento On-Chain e DOM\x1b[0m');

  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <body>
        <div id="container-modal-recibo"></div>
        <div id="lista-recibos"></div>
        <div id="event-listener-status"></div>
      </body>
    </html>
  `);

  const mockHardhatListener = new MockHardhatContractEventListener();
  let eventoCapturado = false;
  mockHardhatListener.onAtaRegistrada((ev) => {
    eventoCapturado = true;
    assertQA(ev.documentHash.startsWith('0x') && ev.documentHash.length === 66,
      'Evento on-chain AtaRegistrada deve carregar bytes32 documentHash válido');
    assertQA(ev.blockNumber > 0,
      'Evento on-chain deve conter número de bloco minerado');
  });

  mockHardhatListener.emitAtaRegistrada({
    documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    proponente: '0x71C59a38F8e684077674681f215E5c6778401aB7',
    blockNumber: 5821034,
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    timestamp: Math.floor(Date.now() / 1000),
    eventSignature: 'AtaRegistrada(bytes32,address,uint256,uint256)'
  });
  assertQA(eventoCapturado, 'Mock do listener de eventos Hardhat deve interceptar e despachar eventos on-chain');

  // Executa um ciclo individual com 6.5 horas de deliberação humana
  const medicaoUnitaria = await executarMacrofluxoAtaHours({
    runId: 'ttfa_unit_hours_001',
    meetingIndex: 0,
    humanDeliberationHours: 6.5,
    messagingLatencyMinutes: 2.0,
    blockchainLatencySeconds: 30,
    domInstance: dom
  });

  assertQA(medicaoUnitaria.totalClosingHours >= 6.5,
    'Tempo total de fechamento deve englobar a deliberação dos signatários (>= 6.5h)');
  assertQA(medicaoUnitaria.phases.sanitizationHours > 0,
    'Etapa 1 (Sanitização e Keccak-256) deve ter duração computada');
  assertQA(medicaoUnitaria.phases.messagingDispatchHours > 0,
    'Etapa 2 (Mensageria e envio de Magic Links) deve ter duração computada');
  assertQA(medicaoUnitaria.phases.humanDeliberationHours === 6.5,
    'Etapa 3 (Consenso humano assíncrono) deve refletir exatamente 6.5 horas simuladas');
  assertQA(medicaoUnitaria.phases.blockchainConfirmationHours > 0,
    'Etapa 4 (Confirmação na blockchain) deve ter duração computada');
  assertQA(medicaoUnitaria.phases.domVerificationHours > 0,
    'Etapa 5 (Renderização do recibo no DOM) deve ter duração computada');
  assertQA(medicaoUnitaria.eventEmitted === true,
    'Evento on-chain deve ser escutado e atestado pelo listener');
  assertQA(medicaoUnitaria.domVerified === true,
    'Recibo criptográfico (#crypto-receipt-card) deve ser validado no DOM');
  assertQA(medicaoUnitaria.withinSla24h === true,
    'Ata de 6.5h deve estar conforme o SLA de 24h');
  assertQA(medicaoUnitaria.primaryBottleneck === 'LENTIDAO_HUMANA',
    'O gargalo primário em cenário nominal deve ser identificado como LENTIDAO_HUMANA');
  assertQA(medicaoUnitaria.bottleneckPercentage > 95,
    `Lentidão humana (${medicaoUnitaria.bottleneckPercentage}%) deve representar a quase totalidade do ciclo`);

  // ---------------------------------------------------------------------------
  // FASE 2: SIMULAÇÃO DE LOTE NOMINAL COM CÁLCULO DE MÉDIA, MEDIANA E DESVIO PADRÃO
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 2] Lote de Atas em Regime Nominal (Conselho & Bancas Acadêmicas)\x1b[0m');

  const configNominal: BatchSimulationScenarioConfig = {
    batchId: 'lote_academico_nominal_2026',
    batchName: 'Lote 2026.1 - Bancas de Pós-Graduação e Colegiados',
    description: 'Atas deliberativas com rotina padrão de avaliação pelos pares (média ~8h a 14h)',
    ataCount: 12,
    slaLimitHours: 24.0,
    humanResponseDistribution: {
      baseHoursPerSigner: 9.5,
      jitterHours: 3.2,
      outlierChance: 0
    },
    messagingLatencyMinutes: 1.8,
    blockchainLatencySeconds: 28
  };

  const statsNominal = await simularLoteAtasHours(configNominal);

  assertQA(statsNominal.totalAtas === 12, 'Lote deve processar rigorosamente 12 atas');
  assertQA(statsNominal.meanHours > 0,
    `Média calculada (μ = ${statsNominal.meanHours}h) deve ser estritamente positiva`);
  assertQA(statsNominal.medianHours > 0,
    `Mediana calculada (Q2 = ${statsNominal.medianHours}h) deve ser estritamente positiva`);
  assertQA(statsNominal.stdDevHours >= 0,
    `Desvio padrão calculado (σ = ${statsNominal.stdDevHours}h) deve ser não-negativo`);
  assertQA(statsNominal.minHours <= statsNominal.medianHours && statsNominal.medianHours <= statsNominal.maxHours,
    `Ordenação estatística válida: Min (${statsNominal.minHours}h) <= Mediana (${statsNominal.medianHours}h) <= Max (${statsNominal.maxHours}h)`);
  assertQA(statsNominal.p90Hours <= statsNominal.p95Hours && statsNominal.p95Hours <= statsNominal.maxHours,
    `Ordenação de percentis válida: P90 (${statsNominal.p90Hours}h) <= P95 (${statsNominal.p95Hours}h) <= Max (${statsNominal.maxHours}h)`);

  // ---------------------------------------------------------------------------
  // FASE 3: VALIDAÇÃO DO SLA INSTITUCIONAL (95% DAS ATAS EM ATÉ 24 HORAS)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 3] Validação Automatizada contra o SLA Institucional (P95 <= 24h)\x1b[0m');

  assertQA(statsNominal.p95Hours <= 24.0,
    `Percentil 95 (${statsNominal.p95Hours}h) deve ser inferior ou igual ao SLA de 24.0h`);
  assertQA(statsNominal.complianceRatePercentage >= 95.0,
    `Taxa de conformidade (${statsNominal.complianceRatePercentage}%) deve ser >= 95%`);
  assertQA(statsNominal.slaPass === true,
    'Veredito do SLA para lote nominal deve ser PASS (Conforme)');

  // ---------------------------------------------------------------------------
  // FASE 4: SIMULAÇÃO DE LOTE COM VIOLAÇÃO DE SLA (STRESS / OUTLIERS > 24H)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 4] Simulação de Lote com Violação de SLA e Atrasos Extremos (> 24h)\x1b[0m');

  const configSobrecarga: BatchSimulationScenarioConfig = {
    batchId: 'lote_recesso_sobrecarga',
    batchName: 'Lote Recesso Acadêmico / Férias Docentes',
    description: 'Período com múltiplos signatários ausentes ou com alta sobrecarga',
    ataCount: 10,
    slaLimitHours: 24.0,
    humanResponseDistribution: {
      baseHoursPerSigner: 27.0, // Média já superior ao SLA
      jitterHours: 4.0,
      outlierChance: 0.3,
      outlierHours: 38.0
    }
  };

  const statsSobrecarga = await simularLoteAtasHours(configSobrecarga);

  assertQA(statsSobrecarga.p95Hours > 24.0,
    `Percentil 95 do lote estressado (${statsSobrecarga.p95Hours}h) deve ultrapassar 24.0h`);
  assertQA(statsSobrecarga.slaPass === false,
    'Veredito do SLA para lote com sobrecarga deve ser estritamente FAIL (Não Conforme)');
  assertQA(statsSobrecarga.complianceRatePercentage < 95.0,
    `Taxa de conformidade (${statsSobrecarga.complianceRatePercentage}%) deve ser inferior a 95%`);

  // ---------------------------------------------------------------------------
  // FASE 5: IDENTIFICAÇÃO ESTRUTURADA DE GARGALOS (ROOT-CAUSE DECOMPOSITION)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 5] Decomposição de Causa-Raiz: Humano vs Mensageria vs Blockchain\x1b[0m');

  const bNominal = statsNominal.bottleneckBreakdown;
  assertQA(bNominal.dominantBottleneck === 'LENTIDAO_HUMANA',
    'Auditoria deve apontar inequivocamente LENTIDAO_HUMANA como gargalo primário');
  assertQA(bNominal.humanDeliberationSharePct > 90.0,
    `Consenso humano deve responder por mais de 90% do TTFA (${bNominal.humanDeliberationSharePct}%)`);
  assertQA(bNominal.blockchainSharePct < 5.0,
    `Confirmação da blockchain deve representar fração residual (< 5%) do TTFA (${bNominal.blockchainSharePct}%)`);
  assertQA(bNominal.messagingSharePct < 5.0,
    `Despacho da mensageria deve representar fração residual (< 5%) do TTFA (${bNominal.messagingSharePct}%)`);
  assertQA(bNominal.rootCauseDiagnosis.length > 20,
    'Diagnóstico de causa-raiz deve conter texto técnico fundamentado');
  assertQA(bNominal.governanceRecommendation.length > 20,
    'Recomendação de governança e engenharia de processo deve ser emitida');

  // Teste de lote sintético onde a blockchain seria o gargalo (ex: rede congestionada)
  const medicoesBlockchainGargalo: TTFAHoursMeasurement[] = [
    {
      runId: 'chain_test_1',
      meetingId: 'prop_chain_1',
      title: 'Ata de Teste Rede Lenta',
      academicUnit: 'Engenharia',
      signersCount: 2,
      tStartIso: new Date().toISOString(),
      tEndIso: new Date().toISOString(),
      phases: {
        sanitizationHours: 0.0001,
        messagingDispatchHours: 0.01,
        humanDeliberationHours: 0.2, // 12 minutos
        blockchainConfirmationHours: 2.5, // 2.5 horas de mempool congestionado
        domVerificationHours: 0.0001,
        totalClosingHours: 2.71
      },
      totalClosingHours: 2.71,
      withinSla24h: true,
      txId: '0x123',
      blockNumber: 100,
      eventEmitted: true,
      domVerified: true,
      primaryBottleneck: 'CONFIRMACAO_BLOCKCHAIN',
      bottleneckPercentage: 92.2,
      benchExecutionDurationMs: 12
    }
  ];

  const statsChainGargalo = compilarEstatisticasLoteTTFA(medicoesBlockchainGargalo, {
    batchId: 'chain_bottleneck_synthetic',
    batchName: 'Lote Sintético com Congestionamento EVM'
  });

  assertQA(statsChainGargalo.bottleneckBreakdown.dominantBottleneck === 'CONFIRMACAO_BLOCKCHAIN',
    'Auditoria deve apontar CONFIRMACAO_BLOCKCHAIN caso a mineração on-chain supere as demais fases');

  // ---------------------------------------------------------------------------
  // FASE 6: EMISSÃO DOS RELATÓRIOS ESTRUTURADOS FORMATADOS
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 6] Renderização dos Relatórios Estruturados em Console\x1b[0m');

  // 1. Relatório Conforme
  const relatorioNominal = gerarRelatorioEstruturadoGargalos(statsNominal);
  assertQA(relatorioNominal.includes('AUDITORIA DE FECHAMENTO DE ATA (TTFA)'),
    'Relatório deve conter cabeçalho oficial de auditoria');
  assertQA(relatorioNominal.includes('SISTEMA CONFORME À NORMA INSTITUCIONAL'),
    'Relatório nominal deve emitir parecer de conformidade');
  assertQA(relatorioNominal.includes('LENTIDÃO HUMANA'),
    'Relatório deve discriminar visualmente o gargalo da lentidão humana');
  console.log(relatorioNominal);

  // 2. Relatório Não Conforme (Sobrecarga)
  const relatorioSobrecarga = gerarRelatorioEstruturadoGargalos(statsSobrecarga);
  assertQA(relatorioSobrecarga.includes('VIOLAÇÃO DE SLA DETECTADA'),
    'Relatório com atraso deve emitir explicitamente a violação do SLA de 24h');
  console.log(relatorioSobrecarga);

  // ---------------------------------------------------------------------------
  // RESUMO GERAL
  // ---------------------------------------------------------------------------
  console.log('==============================================================================');
  console.log(`🎉 SUÍTE DE TESTES TTFA (HORAS & GARGALOS) CONCLUÍDA COM 100% DE APROVAÇÃO!`);
  console.log(`   Asserções Verificadas: ${passedAssertions}/${totalAssertions} (PASS)`);
  console.log(`   Metrologia: Média, Mediana, Desvio Padrão, SLA 24h e Root-Cause Analysis Certificados.`);
  console.log('==============================================================================\n');
}

// Execução principal
executarSuiteTTFAHoursBottleneck().catch(err => {
  console.error('\n✖ Falha fatal no teste de TTFA em escala de horas:', err);
  process.exit(1);
});
