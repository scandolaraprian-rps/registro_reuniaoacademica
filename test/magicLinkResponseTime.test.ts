/**
 * ==============================================================================
 * SCRIPT DE TESTE AUTOMATIZADO: TEMPO DE RESPOSTA DO MAGIC LINK E ATRITO
 * Arquivo: test/magicLinkResponseTime.test.ts
 * Perfil: Engenheiro de Software Sênior, Desenvolvedor DApp e Especialista em QA
 * ==============================================================================
 * 
 * ESCOPO E OBJETIVOS:
 * 1. Simular o ciclo de vida completo de disparo (t_dispatch) e retorno (t_approval)
 *    de Magic Links para lotes de signatários acadêmicos.
 * 2. Utilizar as funções utilitárias de mock do serviço de mensageria institucional
 *    e da interface de aprovação assíncrona com atrasos humanos randomizados.
 * 3. Calcular intervalos individuais Delta_t_i = t_approval - t_dispatch e agregar
 *    estatisticamente a Média (mu), Mediana (Q2) e Desvio Padrão (sigma).
 * 4. Avaliar o indicador de atrito e emitir relatórios formatados em console com
 *    alertas explícitos caso o tempo médio ultrapasse o SLA operacional da instituição.
 * ==============================================================================
 */

import {
  MockMessagingService,
  MockApprovalInterface,
  simularLoteMagicLinks,
  calcularMetricasAtrito,
  calcularMediana,
  calcularPercentil,
  calcularIndiceAtrito,
  gerarRelatorioAtritoMagicLink,
  PERFIS_ACADEMICOS_EXEMPLO,
  PERFIS_COM_ALTO_ATRITO,
  AcademicSignerProfile,
  SignerResponseMetric
} from '../src/utils/magicLinkResponseAuditor';

// Contadores de asserção de QA
let totalAssertions = 0;
let passedAssertions = 0;

function assertQA(condicao: boolean, tituloCenario: string, detalhes?: any) {
  totalAssertions++;
  if (!condicao) {
    console.error(`\x1b[31m  ✖ FALHA DE CONTROLE QA [Teste #${totalAssertions}]: ${tituloCenario}\x1b[0m`);
    if (detalhes) {
      console.error('    Detalhes adicionais da falha:', detalhes);
    }
    throw new Error(`Critério de Aceitação de QA não atendido: ${tituloCenario}`);
  }
  passedAssertions++;
  console.log(`\x1b[32m  ✔ PASS [ML-QA-${totalAssertions.toString().padStart(2, '0')}]:\x1b[0m ${tituloCenario}`);
}

async function executarSuiteMagicLinkResponseTime() {
  console.log('\n==============================================================================');
  console.log('🔬 AUDITORIA METROLÓGICA: TEMPO DE RESPOSTA DO MAGIC LINK (MULTISIG)');
  console.log('   Métrica: Intervalo de Resposta (t_approval - t_dispatch) e Indicador de Atrito');
  console.log('   Perfil: Engenheiro de Software Sênior & Especialista em QA Web3');
  console.log('==============================================================================\n');

  // ---------------------------------------------------------------------------
  // FASE 1: TESTE UNITÁRIO DE DISPARO E INTERAÇÃO COM CAPTURA DE TIMESTAMPS
  // ---------------------------------------------------------------------------
  console.log('\x1b[34m[FASE 1] Validação de Timestamps Exatos (t_dispatch e t_approval) via Mocks\x1b[0m');

  const messagingService = new MockMessagingService();
  const approvalInterface = new MockApprovalInterface();

  const perfilUnitario: AcademicSignerProfile = {
    id: 'prof_teste_unit',
    name: 'Prof. Carlos Drummond',
    role: 'Relator da Comissão Eleitoral',
    email: 'carlos.drummond@universidade.edu.br',
    baseDelayMs: 60,
    jitterMs: 15
  };

  const tAntesDispatch = performance.now();
  const dispatchEvent = await messagingService.dispatchMagicLink({
    proposalId: 'prop_unit_123',
    signer: perfilUnitario,
    documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  });
  const tAposDispatch = performance.now();

  assertQA(dispatchEvent.tDispatch >= tAntesDispatch && dispatchEvent.tDispatch <= tAposDispatch,
    't_dispatch deve ser capturado com precisão de alta resolução no momento do envio do e-mail');
  assertQA(dispatchEvent.token.length >= 32,
    'Token de autenticação do Magic Link deve ter entropia segura (>= 32 caracteres)');
  assertQA(dispatchEvent.magicLinkUrl.includes(dispatchEvent.token),
    'URL despachada no e-mail deve conter o token gerado');
  assertQA(dispatchEvent.smtpServer.status === 'ENTREGUE',
    'Mock do serviço de mensageria deve confirmar a entrega do token');

  const interactionEvent = await approvalInterface.simulateSignerInteraction({
    signer: perfilUnitario,
    dispatchEvent,
    forceDelayMs: 80
  });

  assertQA(interactionEvent.tApproval > dispatchEvent.tDispatch,
    't_approval deve ser estritamente posterior a t_dispatch');
  const deltaUnitario = interactionEvent.tApproval - dispatchEvent.tDispatch;
  assertQA(deltaUnitario >= 70,
    `Intervalo individual Delta_t (${deltaUnitario.toFixed(1)}ms) deve refletir o atraso cognitivo humano simulado`);
  assertQA(interactionEvent.action === 'APROVADA',
    'Ação padrão da interação deve ser aprovação da ata');

  // ---------------------------------------------------------------------------
  // FASE 2: SIMULAÇÃO PARAMETRIZADA DE LOTE NOMINAL (CONSELHO UNIVERSITÁRIO)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 2] Simulação Parametrizada de Lote de Signatários (Conselho Universitário)\x1b[0m');

  const slaInstitucional = 2000; // SLA de 2000 ms para este lote de teste
  const summaryNominal = await simularLoteMagicLinks({
    batchId: 'lote_conselho_01',
    batchName: 'Reunião Ordinária do Conselho Universitário',
    description: 'Aprovação de Ata com 5 Membros Colegiados',
    slaLimitMs: slaInstitucional,
    signers: PERFIS_ACADEMICOS_EXEMPLO
  });

  assertQA(summaryNominal.totalSigners === PERFIS_ACADEMICOS_EXEMPLO.length,
    `Total de signatários processados (${summaryNominal.totalSigners}) deve corresponder ao lote`);
  assertQA(summaryNominal.approvedCount === 5,
    'Todos os signatários do lote nominal devem registrar aprovação');
  assertQA(summaryNominal.rejectedCount === 0,
    'Nenhuma rejeição esperada no lote nominal');

  // Asserções Metrológicas e Estatísticas
  assertQA(summaryNominal.meanMs > 0,
    `Tempo médio (mu = ${summaryNominal.meanMs}ms) deve ser estritamente positivo`);
  assertQA(summaryNominal.medianMs > 0,
    `Mediana (Q2 = ${summaryNominal.medianMs}ms) deve ser calculada e maior que zero`);
  assertQA(summaryNominal.stdDevMs >= 0,
    `Desvio padrão (sigma = ${summaryNominal.stdDevMs}ms) deve ser não-negativo`);
  assertQA(summaryNominal.minMs <= summaryNominal.medianMs && summaryNominal.medianMs <= summaryNominal.maxMs,
    `Propriedade ordinal: Min (${summaryNominal.minMs}ms) <= Mediana (${summaryNominal.medianMs}ms) <= Max (${summaryNominal.maxMs}ms)`);
  assertQA(summaryNominal.p90Ms <= summaryNominal.p95Ms && summaryNominal.p95Ms <= summaryNominal.maxMs,
    `Propriedade de percentis: P90 (${summaryNominal.p90Ms}ms) <= P95 (${summaryNominal.p95Ms}ms) <= Max (${summaryNominal.maxMs}ms)`);
  assertQA(summaryNominal.slaCompliant === true,
    `Lote nominal deve atender ao SLA institucional (mu = ${summaryNominal.meanMs}ms <= SLA = ${slaInstitucional}ms)`);
  assertQA(summaryNominal.slaStatus === 'CONFORME_SLA',
    'Status de SLA deve ser CONFORME_SLA');
  assertQA(summaryNominal.frictionIndex < 65,
    `Índice de atrito (${summaryNominal.frictionIndex}/100) deve estar na faixa aceitável (< 65)`);

  // ---------------------------------------------------------------------------
  // FASE 3: LOTE COM DIVERGÊNCIA E REJEIÇÕES (ATRIBUIÇÃO DE MOTIVO)
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 3] Simulação com Divergências e Rejeições de Signatários\x1b[0m');

  const perfisComRejeicao: AcademicSignerProfile[] = [
    {
      id: 'prof_aprovador',
      name: 'Dr. Valter Silveira',
      role: 'Chefe de Departamento',
      email: 'valter@universidade.edu.br',
      baseDelayMs: 120,
      jitterMs: 30
    },
    {
      id: 'prof_revisor_critico',
      name: 'Dra. Luiza Campolina',
      role: 'Relatora de Ensino',
      email: 'luiza@universidade.edu.br',
      baseDelayMs: 180,
      jitterMs: 40,
      rejectProbability: 1.0, // Força rejeição
      rejectReason: 'Inclusão obrigatória de ressalva quanto à carga horária do anexo II.'
    }
  ];

  const summaryRejeicao = await simularLoteMagicLinks({
    batchId: 'lote_rejeicao_01',
    batchName: 'Aprovação de Ata com Rejeição Fundamentada',
    slaLimitMs: 2000,
    signers: perfisComRejeicao
  });

  assertQA(summaryRejeicao.totalSigners === 2,
    'Lote com rejeição deve processar 2 participantes');
  assertQA(summaryRejeicao.approvedCount === 1,
    '1 aprovação deve ser computada');
  assertQA(summaryRejeicao.rejectedCount === 1,
    '1 rejeição deve ser computada');
  const signatarioRejeitou = summaryRejeicao.signers.find(s => s.action === 'REJEITADA');
  assertQA(signatarioRejeitou !== undefined && !!signatarioRejeitou.justificativa,
    'Signatário que rejeitou deve conter justificativa acadêmica explícita');

  // ---------------------------------------------------------------------------
  // FASE 4: AUDITORIA DE ALTO ATRITO E VIOLAÇÃO DE SLA OPERACIONAL
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 4] Simulação de Alto Atrito e Emissão de Alerta de Violação de SLA\x1b[0m');

  // Definimos um SLA rigoroso de 1000ms para signatários com sobrecarga
  const slaRigoroso = 1000;
  const summarySobrecarga = await simularLoteMagicLinks({
    batchId: 'lote_sobrecarga_01',
    batchName: 'Comissão Especial com Atrasos Severos de Resposta',
    description: 'Docentes em Período de Avaliação CAPES (Sobrecarga Cognitiva)',
    slaLimitMs: slaRigoroso,
    signers: [
      {
        id: 'prof_lento_1',
        name: 'Dr. Afonso Henriques',
        role: 'Diretor de Centro de Pesquisa',
        email: 'a.henriques@universidade.edu.br',
        baseDelayMs: 1400,
        jitterMs: 100
      },
      {
        id: 'prof_lento_2',
        name: 'Dra. Solange Menezes',
        role: 'Membro de Comitê de Ética',
        email: 's.menezes@universidade.edu.br',
        baseDelayMs: 1600,
        jitterMs: 150
      }
    ]
  });

  assertQA(summarySobrecarga.slaCompliant === false,
    `Lote sobrecarregado deve detectar não-conformidade com o SLA (mu = ${summarySobrecarga.meanMs}ms > SLA = ${slaRigoroso}ms)`);
  assertQA(summarySobrecarga.slaStatus === 'ALERTA_SLA_EXCEDIDO',
    'Status deve emitir ALERTA_SLA_EXCEDIDO');
  assertQA(summarySobrecarga.deltaSlaMs > 0,
    `Delta de SLA (${summarySobrecarga.deltaSlaMs}ms) deve ser positivo indicando tempo excedido`);
  assertQA(summarySobrecarga.frictionIndex > 70,
    `Índice de atrito (${summarySobrecarga.frictionIndex}/100) deve refletir alto atrito operacional`);

  // ---------------------------------------------------------------------------
  // FASE 5: TESTE DE ROBUSTEZ MATEMÁTICA E CASOS DE BORDA
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 5] Verificação de Casos de Borda (Cálculo com 1 elemento, dispersão nula)\x1b[0m');

  const metricasUnitarias: SignerResponseMetric[] = [
    {
      participantId: 'p1',
      signerName: 'Testador Solitário',
      signerRole: 'Auditor',
      signerEmail: 'auditor@universidade.edu.br',
      tDispatch: 1000,
      tApproval: 1500,
      responseTimeMs: 500,
      action: 'APROVADA',
      withinSla: true,
      slaLimitMs: 1000
    }
  ];

  const sumarioBorda = calcularMetricasAtrito(metricasUnitarias, 1000, {
    batchId: 'borda_01',
    batchName: 'Lote Unitário'
  });

  assertQA(sumarioBorda.meanMs === 500, 'Média de elemento único deve ser igual ao próprio valor');
  assertQA(sumarioBorda.medianMs === 500, 'Mediana de elemento único deve ser igual ao próprio valor');
  assertQA(sumarioBorda.stdDevMs === 0, 'Desvio padrão de amostra com 1 elemento deve ser 0');
  assertQA(sumarioBorda.slaCompliant === true, 'Amostra unitária de 500ms deve cumprir SLA de 1000ms');

  // Teste de cálculo de percentis e medianas puras
  const valoresPar = [100, 200, 300, 400];
  const medianaPar = calcularMediana(valoresPar);
  assertQA(medianaPar === 250, 'Mediana de lista de tamanho par [100, 200, 300, 400] deve ser 250');

  const valoresImpar = [100, 300, 700];
  const medianaImpar = calcularMediana(valoresImpar);
  assertQA(medianaImpar === 300, 'Mediana de lista de tamanho ímpar [100, 300, 700] deve ser 300');

  // ---------------------------------------------------------------------------
  // FASE 6: RENDERIZAÇÃO E AUDITORIA DOS RELATÓRIOS FORMATADOS EM CONSOLE
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[34m[FASE 6] Renderização dos Relatórios Formatados em Console com Alertas de SLA\x1b[0m');

  // Relatório 1: Conforme SLA
  const relatorioConforme = gerarRelatorioAtritoMagicLink(summaryNominal);
  assertQA(relatorioConforme.includes('CONFORMIDADE CONFIRMADA'),
    'Relatório nominal deve conter o banner de conformidade com SLA');
  assertQA(relatorioConforme.includes('DISCRIMINAÇÃO INDIVIDUAL DE SIGNATÁRIOS'),
    'Relatório deve conter a tabela discriminada de signatários');
  assertQA(relatorioConforme.includes('AGREGAÇÃO ESTATÍSTICA DO LOTE'),
    'Relatório deve exibir a agregação estatística');
  console.log(relatorioConforme);

  // Relatório 2: Alerta de Violação de SLA
  const relatorioAlerta = gerarRelatorioAtritoMagicLink(summarySobrecarga);
  assertQA(relatorioAlerta.includes('ALERTA CRÍTICO DE ATRITO'),
    'Relatório com atraso deve exibir explicitamente o alerta de SLA excedido');
  assertQA(relatorioAlerta.includes('Ação Recomendada'),
    'Relatório com violação de SLA deve sugerir plano de mitigação e lembretes automáticos');
  console.log(relatorioAlerta);

  // ---------------------------------------------------------------------------
  // RESUMO GERAL DE QUALIDADE
  // ---------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`🎉 SUÍTE DE TESTES E AUDITORIA DE RESPOSTA DO MAGIC LINK CONCLUÍDA COM SUCESSO!`);
  console.log(`   Asserções Verificadas: ${passedAssertions}/${totalAssertions} (100% PASS)`);
  console.log(`   Engenharia de Confiabilidade: Metrologia, Robustez Estatística e SLA Certificados.`);
  console.log('==============================================================================\n');
}

// Execução principal
executarSuiteMagicLinkResponseTime().catch(err => {
  console.error('\n✖ Falha fatal na suíte de testes de resposta do Magic Link:', err);
  process.exit(1);
});
