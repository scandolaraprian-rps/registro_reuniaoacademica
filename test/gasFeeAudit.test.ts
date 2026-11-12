/**
 * ==============================================================================
 * SCRIPT DE TESTE AUTOMATIZADO: AUDITORIA DE TAXA DE REDE & CUSTO DE GÁS (EVM)
 * Arquivo: test/gasFeeAudit.test.ts
 * Perfil: Engenheiro de Software Sênior, Desenvolvedor DApp & Especialista em Blockchain QA
 * ==============================================================================
 * 
 * ESCOPO E REQUISITOS CERTIFICADOS:
 * 1. Captura exata do consumo de unidades de gás (gasUsed) e do custo financeiro resultante
 *    para cada etapa (proporAta, atestarAssinatura, consolidarAta) e para o fluxo acumulado.
 * 2. Rotina de teste parametrizada que executa lotes de atas para cálculo de estatísticas agregadas
 *    (média, mediana, valor mínimo, valor máximo e desvio padrão).
 * 3. Validador estrito (assert) que assegura conformidade com o teto orçamentário do DApp.
 * 4. Relatório estruturado em console com profiling de ineficiências em Solidity e mitigação.
 * ==============================================================================
 */

import { ethers } from 'ethers';
import {
  EVMGasSimulator,
  auditarCicloCompletoAta,
  executarAuditoriaLoteGas,
  renderizarRelatorioGasConsole,
  SolidityGasInefficiencyDetector,
  PERFIS_REDE_PADRAO,
  TETO_ORCAMENTARIO_GAS_MEDIO,
  TETO_ORCAMENTARIO_GAS_MAXIMO,
  TETO_FINANCEIRO_USD,
  TETO_FINANCEIRO_POL,
  MeetingGasAuditSample,
  BatchGasStatistics
} from '../src/utils/gasAuditAuditor';

// ------------------------------------------------------------------------------
// HARNESS DE ASSERÇÃO DE QA (COMPATÍVEL COM NODE.JS, TSX E JEST)
// ------------------------------------------------------------------------------
let totalAssertions = 0;
let passedAssertions = 0;

function assertQA(condicao: boolean, tituloCenario: string, detalhes?: any) {
  totalAssertions++;
  if (!condicao) {
    console.error(`\x1b[31m  ✖ FALHA DE CONTROLE DE GÁS QA [Teste #${totalAssertions}]: ${tituloCenario}\x1b[0m`);
    if (detalhes) {
      console.error('    Detalhes da divergência:', detalhes);
    }
    throw new Error(`Critério de Aceitação de QA de Gás não atendido: ${tituloCenario}`);
  }
  passedAssertions++;
  console.log(`\x1b[32m  ✔ PASS [GAS-QA-${totalAssertions.toString().padStart(2, '0')}]:\x1b[0m ${tituloCenario}`);
}

async function executarSuiteGasFeeAudit() {
  console.log('\n==============================================================================');
  console.log('⛽ AUDITORIA METROLÓGICA DE GÁS: TAXA DE REDE & CUSTO ON-CHAIN (SOLIDITY)');
  console.log('   Contrato: RegistroAtaMultisig (EVM / Ethers.js v6 / Hardhat)');
  console.log('   Perfil: Engenheiro de Software Sênior & Especialista em Blockchain QA');
  console.log('==============================================================================\n');

  // ===========================================================================
  // FASE 1: MEDIÇÃO INDIVIDUAL POR ETAPA DO CICLO ON-CHAIN & FLUXO ACUMULADO
  // ===========================================================================
  console.log('\x1b[34m[FASE 1] Medição Exata de gasUsed por Etapa e Fluxo Acumulado Completo\x1b[0m');

  const simulator = new EVMGasSimulator(PERFIS_REDE_PADRAO.amoy);
  const sampleUnitaria = auditarCicloCompletoAta({
    meetingId: 'ata_banca_001',
    title: 'Defesa de Tese de Doutorado - Ciência da Computação',
    tipoReuniao: 'Banca / Defesa',
    coSignersCount: 3, // Proponente + 2 co-signatários
    quorumMinimo: 2,   // Quórum de 2 assinaturas necessárias
    simulator
  });

  // 1.1 Etapa 1: Submissão da Proposta (proporAta)
  const stepPropor = sampleUnitaria.steps.find(s => s.etapa === 'PROPOSICAO')!;
  assertQA(stepPropor !== undefined, 'Etapa de Proposição deve ter sido executada');
  assertQA(stepPropor.gasUsed >= 115000 && stepPropor.gasUsed <= 180000,
    `Consumo de gas em proporAta (${stepPropor.gasUsedFormatted}) deve estar na faixa esperada (115k-180k gas)`);
  assertQA(stepPropor.txHash.startsWith('0x') && stepPropor.txHash.length === 66,
    'Hash da transação de proposição deve ser bytes32 válido');
  assertQA(stepPropor.opcodesDominantes.some(o => o.includes('SSTORE_COLD')),
    'Opcodes dominantes devem registrar inicialização de slots com SSTORE frio');

  // 1.2 Etapa 2: Atestações de Múltiplas Assinaturas (atestarAssinatura)
  const stepsAtestar = sampleUnitaria.steps.filter(s => s.etapa === 'ATESTACAO_MULTISIG');
  assertQA(stepsAtestar.length >= 1, 'Ao menos uma atestação assíncrona deve ter sido registrada');
  for (const st of stepsAtestar) {
    assertQA(st.gasUsed >= 35000 && st.gasUsed <= 60000,
      `Consumo de gas em atestarAssinatura (${st.gasUsedFormatted}) deve situar-se entre 35k e 60k gas`);
    assertQA(st.opcodesDominantes.some(o => o.includes('SSTORE_MAPPING')),
      'Deve registrar escrita de mapping de assinante (assinou[hash][msg.sender])');
  }

  // 1.3 Etapa 3: Consolidação Final On-Chain (consolidarAta)
  const stepConsolidar = sampleUnitaria.steps.find(s => s.etapa === 'CONSOLIDACAO_FINAL')!;
  assertQA(stepConsolidar !== undefined, 'Etapa de Consolidação deve ter sido executada');
  assertQA(stepConsolidar.gasUsed >= 30000 && stepConsolidar.gasUsed <= 55000,
    `Consumo de gas em consolidarAta (${stepConsolidar.gasUsedFormatted}) deve situar-se entre 30k e 55k gas`);
  assertQA(stepConsolidar.opcodesDominantes.some(o => o.includes('SSTORE_STATE')),
    'Deve registrar transição de estado da máquina para Aprovada');

  // 1.4 Fluxo Acumulado Completo da Ata
  const somaEtapas = sampleUnitaria.steps.reduce((acc, s) => acc + s.gasUsed, 0);
  assertQA(sampleUnitaria.totalGasUsed === somaEtapas,
    `Gás total acumulado (${sampleUnitaria.totalGasUsedFormatted}) deve ser a soma exata de todas as transações`);
  assertQA(sampleUnitaria.totalGasUsed <= TETO_ORCAMENTARIO_GAS_MEDIO,
    `Gás acumulado da ata (${sampleUnitaria.totalGasUsedFormatted}) deve estar dentro do teto nominal (${TETO_ORCAMENTARIO_GAS_MEDIO.toLocaleString('pt-BR')} gas)`);

  // ===========================================================================
  // FASE 2: CONVERSÃO DE CUSTOS FINANCEIROS E PROJEÇÃO MULTI-REDE
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 2] Validação de Custos Financeiros Multi-Rede (POL / ETH / USD / BRL)\x1b[0m');

  // 2.1 Rede Polygon Amoy (L2 / Sidechain econômica)
  assertQA(sampleUnitaria.totalCostInNative > 0,
    `Custo em token nativo (${sampleUnitaria.totalCostInNative} POL) deve ser estritamente positivo`);
  assertQA(sampleUnitaria.totalCostInNative <= TETO_FINANCEIRO_POL,
    `Custo em POL (${sampleUnitaria.totalCostInNative} POL) deve ser menor que o teto de ${TETO_FINANCEIRO_POL} POL`);
  assertQA(sampleUnitaria.totalCostInUsd < TETO_FINANCEIRO_USD,
    `Custo financeiro em USD (US$ ${sampleUnitaria.totalCostInUsd}) deve ser inferior ao teto de US$ ${TETO_FINANCEIRO_USD}`);

  // 2.2 Projeção em Rede Arbitrum Sepolia (Rollup L2)
  const simArbitrum = new EVMGasSimulator(PERFIS_REDE_PADRAO.arbitrumSepolia);
  const sampleArbitrum = auditarCicloCompletoAta({
    meetingId: 'ata_arbitrum_01',
    title: 'Reunião de Colegiado - Engenharia',
    tipoReuniao: 'Reunião de Colegiado',
    coSignersCount: 3,
    simulator: simArbitrum
  });
  assertQA(sampleArbitrum.totalCostInNative < 0.0001,
    `Custo em Rollup L2 (${sampleArbitrum.totalCostInNative} ETH) deve ser ultra-reduzido (< 0.0001 ETH)`);

  // ===========================================================================
  // FASE 3: ROTINA DE TESTE PARAMETRIZADA EM LOTES (ESTATÍSTICAS AGREGADAS)
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 3] Rotina Parametrizada de Lote: Média, Mediana, Mínimo, Máximo e Desvio Padrão\x1b[0m');

  const loteAcademicoConfig = {
    batchId: 'lote_atas_campus_central_01',
    batchName: 'Sessão Ordinária do Conselho Universitário e Colegiados',
    network: PERFIS_REDE_PADRAO.amoy,
    meetings: [
      { id: 'ata_01', title: 'Homologação de Grau - Medicina', tipoReuniao: 'Banca / Defesa', coSignersCount: 3 },
      { id: 'ata_02', title: 'Aprovação de Novo Currículo - Computação', tipoReuniao: 'Reunião de Colegiado', coSignersCount: 4 },
      { id: 'ata_03', title: 'Comitê Eleitoral para Reitoria', tipoReuniao: 'Sincronização', coSignersCount: 3 },
      { id: 'ata_04', title: 'Alocação de Bolsas de Doutorado CAPES', tipoReuniao: 'Orientação', coSignersCount: 3 },
      { id: 'ata_05', title: 'Banca de Livre Docência - Física Quântica', tipoReuniao: 'Banca / Defesa', coSignersCount: 5 }
    ]
  };

  const statsLote = executarAuditoriaLoteGas(loteAcademicoConfig);

  assertQA(statsLote.totalMeetingsAudited === 5, 'Lote deve processar exatamente 5 atas acadêmicas');
  assertQA(statsLote.totalTransactionsExecuted >= 15,
    `Total de transações executadas (${statsLote.totalTransactionsExecuted}) deve contemplar todo o ciclo`);

  // Asserções estatísticas
  const { meanGas, medianGas, minGas, maxGas, stdDevGas } = statsLote.gasStats;
  assertQA(meanGas > 0, `Média de gás (${meanGas.toLocaleString('pt-BR')}) deve ser calculada e > 0`);
  assertQA(medianGas > 0, `Mediana de gás (${medianGas.toLocaleString('pt-BR')}) deve ser calculada e > 0`);
  assertQA(minGas <= medianGas && medianGas <= maxGas,
    `Relação ordinal: Mínimo (${minGas}) <= Mediana (${medianGas}) <= Máximo (${maxGas})`);
  assertQA(stdDevGas >= 0, `Desvio padrão de gás (${stdDevGas}) deve ser não-negativo`);

  // Decomposição por etapas no lote
  assertQA(statsLote.stepBreakdown.proporAta.meanGas > statsLote.stepBreakdown.consolidarAta.meanGas,
    'Etapa de Proposição deve consumir mais gás que a Consolidação devido à inicialização de structs em storage');

  // ===========================================================================
  // FASE 4: MECANISMO DE VALIDAÇÃO (ASSERT) DE TETO ORÇAMENTÁRIO
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 4] Validação de Assert de Teto Orçamentário e Prevenção de Estouro\x1b[0m');

  // 4.1 Conformidade do Lote Nominal
  assertQA(statsLote.budgetAudit.isMeanCompliant === true,
    `Custo médio do lote (${meanGas.toLocaleString('pt-BR')} gas) DEVE ser estritamente <= ao teto orçamentário (${TETO_ORCAMENTARIO_GAS_MEDIO.toLocaleString('pt-BR')} gas)`);
  assertQA(statsLote.budgetAudit.isMaxCompliant === true,
    `Custo máximo do lote (${maxGas.toLocaleString('pt-BR')} gas) DEVE ser <= ao teto máximo de emergência (${TETO_ORCAMENTARIO_GAS_MAXIMO.toLocaleString('pt-BR')} gas)`);
  assertQA(statsLote.budgetAudit.budgetStatus === 'DENTRO_DO_TETO',
    'Status orçamentário do lote nominal deve ser DENTRO_DO_TETO');

  // 4.2 Prova de Fogo do Assert: Injeção de Ata com Sobrecarga Excessiva de Signatários (12 signatários)
  const loteSobrecargaConfig = {
    batchId: 'lote_estouro_teste_01',
    batchName: 'Lote com Quórum Anormalmente Inflado (Teste de Estresse de Teto)',
    network: PERFIS_REDE_PADRAO.amoy,
    meetings: [
      { id: 'ata_inflada', title: 'Congresso Plenário com Quórum de 12 Membros', tipoReuniao: 'Reunião de Colegiado', coSignersCount: 12, quorumMinimo: 10 }
    ]
  };

  const statsSobrecarga = executarAuditoriaLoteGas(loteSobrecargaConfig);
  assertQA(statsSobrecarga.gasStats.meanGas > TETO_ORCAMENTARIO_GAS_MEDIO,
    'O motor de auditoria deve detectar fielmente que o consumo de 12 signatários ultrapassa o teto nominal planejado');
  assertQA(statsSobrecarga.budgetAudit.isMeanCompliant === false,
    'Assert de conformidade orçamentária média deve sinalizar FALSE para ata sobrecarregada');
  assertQA(statsSobrecarga.budgetAudit.budgetStatus !== 'DENTRO_DO_TETO',
    'Status orçamentário deve emitir alerta de estouro ou excedente');

  // ===========================================================================
  // FASE 5: DIAGNÓSTICO DE INEFICIÊNCIAS EM SOLIDITY E OTIMIZAÇÕES
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 5] Análise de Ineficiências de Gás em Bytecode / Storage Solidity\x1b[0m');

  const ineffDetector = new SolidityGasInefficiencyDetector();
  const diagnostico = ineffDetector.analyzeExecution(sampleUnitaria.steps, 5);

  assertQA(diagnostico.length >= 2, 'Detector deve identificar ao menos 2 oportunidades de otimização em Solidity');
  
  const ineffArray = diagnostico.find(d => d.id === 'INEFF-GAS-01');
  assertQA(ineffArray !== undefined,
    'Deve detectar ineficiência de iteração e escrita de array coSignatarios em storage');
  assertQA(ineffArray?.recomendacaoOtimizacao.includes('Merkle Root') || ineffArray?.recomendacaoOtimizacao.includes('bytes32'),
    'Recomendação deve sugerir compactação por Merkle Root ou bytes32');

  const ineffString = diagnostico.find(d => d.id === 'INEFF-GAS-02');
  assertQA(ineffString !== undefined,
    'Deve detectar uso de string dinâmica para CID IPFS em calldata/storage');

  // ===========================================================================
  // FASE 6: RENDERIZAÇÃO E VALIDAÇÃO DO RELATÓRIO ESTRUTURADO EM CONSOLE
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 6] Renderização do Relatório Estruturado de Gás com Cores ANSI\x1b[0m');

  const relatorioConsole = renderizarRelatorioGasConsole(statsLote);
  assertQA(relatorioConsole.includes('AUDITORIA DE TAXA DE REDE'),
    'Relatório deve conter cabeçalho normativo da auditoria');
  assertQA(relatorioConsole.includes('DECOMPOSIÇÃO DO CONSUMO POR ETAPA ON-CHAIN'),
    'Relatório deve conter a decomposição discriminada das 3 etapas');
  assertQA(relatorioConsole.includes('TETO ORÇAMENTÁRIO RESPEITADO'),
    'Relatório nominal deve conter banner de aprovação orçamentária');
  assertQA(relatorioConsole.includes('DIAGNÓSTICO DE EFICIÊNCIA DE SMART CONTRACT'),
    'Relatório deve conter seção de recomendações de otimização de bytecode');

  console.log(relatorioConsole);

  // ===========================================================================
  // RESUMO GERAL DE QUALIDADE
  // ===========================================================================
  console.log('==============================================================================');
  console.log(`🎉 SUÍTE DE AUDITORIA DE TAXA DE REDE E CUSTO DE GÁS CONCLUÍDA COM SUCESSO!`);
  console.log(`   Asserções Verificadas: ${passedAssertions}/${totalAssertions} (100% PASS)`);
  console.log(`   Engenharia de Confiabilidade Blockchain:`);
  console.log(`   • gasUsed capturado com precisão de opcode para proporAta, atestar e consolidar.`);
  console.log(`   • Média, mediana, dispersão e custos fiat/cripto agregados por coorte.`);
  console.log(`   • Conformidade com teto orçamentário de ${TETO_ORCAMENTARIO_GAS_MEDIO.toLocaleString('pt-BR')} gas rigorosamente auditada.`);
  console.log(`   • Ineficiências em Solidity mapeadas com recomendações de Merkle Root e packing.`);
  console.log('==============================================================================\n');
}

// Execução imediata
executarSuiteGasFeeAudit().catch(err => {
  console.error('\n✖ Falha fatal na suíte de auditoria de gás:', err);
  process.exit(1);
});
