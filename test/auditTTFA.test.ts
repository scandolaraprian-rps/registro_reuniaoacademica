/**
 * ==============================================================================
 * SCRIPT DE TESTE AUTOMATIZADO E AUDITORIA: TEMPO DE FECHAMENTO DE ATA (TTFA)
 * Arquivo: test/auditTTFA.test.ts
 * Papel: Engenheiro de Software Sênior, Desenvolvedor DApp e Especialista em QA
 * ==============================================================================
 * 
 * ESCOPO E OBJETIVOS DO TESTE:
 * 1. Medir o timestamp exato desde a criação inicial do documento (t_start)
 *    até a confirmação da transação no contrato inteligente e exibição
 *    completa do recibo criptográfico no DOM (t_end).
 * 2. Executar uma rotina de teste parametrizada que simule diferentes tempos
 *    de resposta dos signatários via Magic Links (lotes de teste multicoorte).
 * 3. Calcular média, mediana, desvio padrão, mínimo, máximo e P95 para cada lote.
 * 4. Emitir relatório de log formatado com avaliação de conformidade frente
 *    ao Limite Superior de Controle (SLA) estabelecido para o DApp.
 * ==============================================================================
 */

import { 
  executarCicloFechamentoAta, 
  executarAuditoriaTTFAParametrizada,
  formatarRelatorioAuditoriaConsole,
  COORTES_PADRAO_AUDITORIA,
  criarDadosAtaPadrao
} from '../src/utils/ttfaAuditor';
import { JSDOM } from 'jsdom';

// Contadores de asserção de QA
let testesExecutados = 0;
let testesAprovados = 0;

function assertQA(condicao: boolean, tituloCenario: string, detalhes?: any) {
  testesExecutados++;
  if (!condicao) {
    console.error(`\x1b[31m  ✖ FALHA DE CONTROLE QA [Teste ${testesExecutados}]: ${tituloCenario}\x1b[0m`);
    if (detalhes) {
      console.error('    Detalhes adicionais da falha:', detalhes);
    }
    throw new Error(`Critério de Aceitação de QA não atendido: ${tituloCenario}`);
  }
  testesAprovados++;
  console.log(`\x1b[32m  ✔ PASS [TTFA-QA-${testesExecutados.toString().padStart(2, '0')}]:\x1b[0m ${tituloCenario}`);
}

async function executarSuiteAuditoriaTTFA() {
  console.log('\n==============================================================================');
  console.log('🔬 AUDITORIA METROLÓGICA E BENCHMARK DE DESEMPENHO DAPP (TTFA)');
  console.log('   Métrica Auditada: Tempo de Fechamento de Ata (Total Meeting Closing Time)');
  console.log('   Perfil: Engenheiro de Software Sênior & Especialista em QA Web3');
  console.log('==============================================================================\n');

  // ---------------------------------------------------------------------------
  // PARTE 1: VERIFICAÇÃO UNITÁRIA DE ALTA RESOLUÇÃO DE UM CICLO COMPLETO
  // ---------------------------------------------------------------------------
  console.log('\x1b[34m[FASE 1] Verificação de Ciclo Individual com Registro de Timestamps Exatos (t_start a t_end)\x1b[0m');

  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <body>
        <div id="container-modal-recibo"></div>
        <div id="lista-recibos"></div>
        <form id="meeting-form" data-status-ata="Rascunho"></form>
      </body>
    </html>
  `);

  const tAntesChamada = performance.now();
  const medicaoUnitaria = await executarCicloFechamentoAta({
    runId: 'ttfa_unit_001',
    iteration: 1,
    cohortId: 'coorte-verificacao-unitaria',
    cohortName: 'Verificação Unitária de Precisão',
    signerDelaysMs: [20, 40, 60],
    domInstance: dom
  });
  const tAposChamada = performance.now();

  // Asserções do Timestamp e Medição Exata
  assertQA(medicaoUnitaria.tStart > 0, 'Timestamp t_start deve ser capturado com precisão e ser maior que zero');
  assertQA(medicaoUnitaria.tEnd > medicaoUnitaria.tStart, 'Timestamp t_end deve ser estritamente posterior a t_start');
  assertQA(medicaoUnitaria.phases.totalClosingTimeMs > 0, 'TTFA calculado (t_end - t_start) deve ser estritamente positivo');
  assertQA(medicaoUnitaria.phases.totalClosingTimeMs <= (tAposChamada - tAntesChamada) + 5, 'Duração calculada deve ser consistente com o relógio de alta resolução');

  // Asserções das Fases Granulares
  assertQA(medicaoUnitaria.phases.sanitizationMs > 0, 'Etapa 1 (Sanitização e Keccak-256) deve registrar duração mensurável');
  assertQA(medicaoUnitaria.phases.multisigMs >= 100, 'Etapa 2 (Multisig e Magic Links) deve refletir os delays parametrizados (>= 100ms)');
  assertQA(medicaoUnitaria.phases.blockchainMs > 500, 'Etapa 3 (Blockchain e Mineração) deve registrar o tempo de confirmação da transação');
  assertQA(medicaoUnitaria.phases.domRenderMs >= 0, 'Etapa 4 (DOM Render) deve registrar a injeção do recibo visual');

  // Asserções de Integridade Criptográfica e no DOM
  assertQA(medicaoUnitaria.txId.startsWith('0x') && medicaoUnitaria.txId.length === 66, 'Identificador de transação (txId) deve ser um hash hexadecimal bytes32 válido');
  assertQA(medicaoUnitaria.blockNumber > 5000000, 'Número do bloco deve ser retornado pelo recibo da transação');
  assertQA(medicaoUnitaria.domVerified === true, 'Recibo criptográfico visual (#crypto-receipt-card) deve ser validado no DOM');

  // ---------------------------------------------------------------------------
  // PARTE 2: EXECUÇÃO DA ROTINA PARAMETRIZADA EM LOTES MULTICOORTE
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 2] Execução da Rotina de Teste Parametrizada por Coortes de Latência\x1b[0m');
  console.log('  Simulando atrasos em Magic Links, quóruns assíncronos e confirmação on-chain...');

  let cicloProgresso = 0;
  const resumoAuditoria = await executarAuditoriaTTFAParametrizada({
    cohorts: COORTES_PADRAO_AUDITORIA,
    globalSlaLimitMs: 3800, // Limite Superior de Controle Global: 3.800 ms
    onProgress: (info) => {
      cicloProgresso++;
      process.stdout.write(`  \r  • Executando baterias de teste: ciclo #${cicloProgresso.toString().padStart(2, '0')} (${info.measurement.cohortName.split(':')[0]}) - TTFA: ${info.measurement.phases.totalClosingTimeMs}ms`);
    }
  });

  console.log('\n  ✔ Todas as baterias de teste foram concluídas com sucesso.\n');

  // Validação das Coortes Individuais
  for (const cr of resumoAuditoria.cohortResults) {
    assertQA(
      cr.measurements.length === cr.cohort.runs, 
      `Coorte ${cr.cohort.name.split(':')[0]} deve ter executado exatamente ${cr.cohort.runs} ciclos parametrizados`
    );
    assertQA(
      cr.stats.mean > 0, 
      `Média de tempo da coorte ${cr.cohort.name.split(':')[0]} deve ser calculada (obtido: ${cr.stats.mean}ms)`
    );
    assertQA(
      cr.stats.median > 0, 
      `Mediana da coorte ${cr.cohort.name.split(':')[0]} deve ser calculada (obtido: ${cr.stats.median}ms)`
    );
    assertQA(
      cr.stats.stdDev >= 0, 
      `Desvio padrão da coorte ${cr.cohort.name.split(':')[0]} deve ser >= 0 (obtido: ${cr.stats.stdDev}ms)`
    );
    assertQA(
      cr.stats.slaPass === true, 
      `Coorte ${cr.cohort.name.split(':')[0]} deve atender ao limite de controle estabelecido de ${cr.cohort.slaThresholdMs}ms (média: ${cr.stats.mean}ms, P95: ${cr.stats.p95}ms)`
    );
  }

  // ---------------------------------------------------------------------------
  // PARTE 3: ASSERÇÕES GLOBAIS DE CONFORMIDADE E LIMITE DE CONTROLE (SLA)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 3] Auditoria de Conformidade com o Limite de Controle Operacional (SLA)\x1b[0m');

  assertQA(
    resumoAuditoria.totalRuns >= 20, 
    `Amostragem total deve conter massa crítica estatística (mínimo 20 execuções, executadas: ${resumoAuditoria.totalRuns})`
  );

  assertQA(
    resumoAuditoria.globalStats.mean <= resumoAuditoria.globalStats.slaLimit,
    `Tempo médio global (${resumoAuditoria.globalStats.mean}ms) deve ser menor ou igual ao limite de controle (${resumoAuditoria.globalStats.slaLimit}ms)`
  );

  assertQA(
    resumoAuditoria.systemControlStatus === 'CONFORME',
    'Status de controle de qualidade do sistema deve ser estritamente "CONFORME"'
  );

  // ---------------------------------------------------------------------------
  // PARTE 4: EMISSÃO DO RELATÓRIO FORMATADO NO CONSOLE DE LOG
  // ---------------------------------------------------------------------------
  const relatorioFormatado = formatarRelatorioAuditoriaConsole(resumoAuditoria);
  console.log(relatorioFormatado);

  console.log(`\x1b[32m══════════════════════════════════════════════════════════════════════════════`);
  console.log(`✔ SUÍTE DE AUDITORIA TTFA CONCLUÍDA: ${testesAprovados}/${testesExecutados} asserções de QA aprovadas.`);
  console.log(`══════════════════════════════════════════════════════════════════════════════\x1b[0m\n`);
}

// Execução direta via Node / tsx
executarSuiteAuditoriaTTFA().catch((err) => {
  console.error('\n\x1b[31m✖ FALHA CRÍTICA NA AUDITORIA TTFA:\x1b[0m', err);
  process.exit(1);
});
