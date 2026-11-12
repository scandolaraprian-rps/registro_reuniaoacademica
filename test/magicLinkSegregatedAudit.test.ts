/**
 * ==============================================================================
 * SCRIPT DE TESTE AUTOMATIZADO: AUDITORIA TEMPORAL SEGREGADA DO MAGIC LINK
 * Arquivo: test/magicLinkSegregatedAudit.test.ts
 * Perfil: Engenheiro de Software Sênior, Desenvolvedor DApp & Especialista em QA
 * ==============================================================================
 * 
 * ESCOPO E OBJETIVOS DE QUALIDADE:
 * 1. Medir a Latência de Infraestrutura (API de Mensageria) em milissegundos estritos
 *    (t_dispatch_ack - t_request). Validar conformidade com o threshold de 3000 ms.
 * 2. Simular a Latência de Atestação Humana (Workflow Multisig) em escala de horas
 *    (distribuição estocástica com mediana de 12h a 24h) e certificar o IARS.
 * 3. Validar a Segregação de Logs Anti-Fadiga de Alerta:
 *    - Falhas reais de rede / API (> 3000 ms ou 5xx) acionam canal de SRE/DevOps.
 *    - Atrasos comportamentais docentes (> 24 h) acionam lembretes institucionais
 *      SEM DISPARAR alertas de infraestrutura (zero alertas falsos de SRE).
 * ==============================================================================
 */

import {
  MockMessagingProviderApi,
  StochasticHumanDeliberationSimulator,
  SegregatedLogEngine,
  executarAuditoriaSegregada,
  renderizarRelatorioSegregadoConsole,
  calcularIARS,
  calcularMediana,
  SLA_INFRAESTRUTURA_DISPATCH_MS,
  SLA_WORKFLOW_HUMANO_HORAS,
  AcademicSigner
} from '../src/utils/magicLinkSegregatedAuditor';

// ------------------------------------------------------------------------------
// HARNESS DE ASSERÇÃO QA (COMPATÍVEL COM NODE.JS, TSX E JEST)
// ------------------------------------------------------------------------------
let totalAssertions = 0;
let passedAssertions = 0;

function assertQA(condicao: boolean, tituloCenario: string, detalhes?: any) {
  totalAssertions++;
  if (!condicao) {
    console.error(`\x1b[31m  ✖ FALHA DE CONTROLE QA [Teste #${totalAssertions}]: ${tituloCenario}\x1b[0m`);
    if (detalhes) {
      console.error('    Detalhes adicionais:', detalhes);
    }
    throw new Error(`Critério de Aceitação de QA não atendido: ${tituloCenario}`);
  }
  passedAssertions++;
  console.log(`\x1b[32m  ✔ PASS [ML-SEG-${totalAssertions.toString().padStart(2, '0')}]:\x1b[0m ${tituloCenario}`);
}

// ------------------------------------------------------------------------------
// COORTES DE TESTE PARA CENÁRIOS ACADÊMICOS
// ------------------------------------------------------------------------------
const COORTE_COLEGIADO_NOMINAL: AcademicSigner[] = [
  {
    id: 'prof_coord',
    name: 'Dra. Maria Helena Ramos',
    role: 'Coordenadora de Colegiado',
    email: 'm.ramos@universidade.edu.br',
    expectedMeanHours: 11.5,
    varianceFactor: 0.35
  },
  {
    id: 'prof_titular',
    name: 'Dr. Roberto Santos Guimarães',
    role: 'Decano de Pós-Graduação',
    email: 'r.guimaraes@universidade.edu.br',
    expectedMeanHours: 16.0,
    varianceFactor: 0.40
  },
  {
    id: 'sec_academica',
    name: 'Fernanda Albuquerque Lima',
    role: 'Secretária de Reuniões',
    email: 'f.lima@universidade.edu.br',
    expectedMeanHours: 4.2,
    varianceFactor: 0.25
  },
  {
    id: 'prof_membro_1',
    name: 'Dr. Valter Silveira',
    role: 'Membro Docente do Conselho',
    email: 'valter@universidade.edu.br',
    expectedMeanHours: 14.8,
    varianceFactor: 0.38
  },
  {
    id: 'rep_discente',
    name: 'Lucas Pereira Duarte',
    role: 'Representante Discente',
    email: 'l.duarte@aluno.universidade.edu.br',
    expectedMeanHours: 8.5,
    varianceFactor: 0.30
  }
];

const COORTE_DOCENTES_SOBRECARREGADOS: AcademicSigner[] = [
  {
    id: 'prof_diretor_centro',
    name: 'Dr. Afonso Henriques',
    role: 'Diretor de Centro Tecnológico',
    email: 'a.henriques@universidade.edu.br',
    expectedMeanHours: 32.0, // Atraso de 32h (> 24h)
    varianceFactor: 0.50
  },
  {
    id: 'prof_comite_etica',
    name: 'Dra. Solange Menezes',
    role: 'Presidente do Comitê de Ética em Pesquisa',
    email: 's.menezes@universidade.edu.br',
    expectedMeanHours: 29.5, // Atraso de 29.5h (> 24h)
    varianceFactor: 0.45
  },
  {
    id: 'prof_avaliador_externo',
    name: 'Dr. Marcelo Paiva',
    role: 'Membro de Avaliação CAPES',
    email: 'm.paiva@externo.edu.br',
    expectedMeanHours: 38.0, // Atraso de 38h (> 24h)
    varianceFactor: 0.60
  }
];

// ------------------------------------------------------------------------------
// SUÍTE DE TESTES EXECUTIVA
// ------------------------------------------------------------------------------
async function executarSuiteSegregacaoMagicLink() {
  console.log('\n==============================================================================');
  console.log('🔬 SUÍTE DE TESTE E AUDITORIA METROLÓGICA: RESPOSTA DO MAGIC LINK SEGREGADA');
  console.log('   Dimensão 1: Infraestrutura de Mensageria (Milissegundos, SLA <= 3000 ms)');
  console.log('   Dimensão 2: Workflow Humano Multisig (Escala de Horas, Mediana 12h-24h, IARS)');
  console.log('   Controle:   Isolamento de Canais de Alerta para Eliminação de Fadiga de SRE');
  console.log('==============================================================================\n');

  // ===========================================================================
  // FASE 1: TESTE UNITÁRIO DE LATÊNCIA DA API DE INFRAESTRUTURA (MILISSEGUNDOS)
  // ===========================================================================
  console.log('\x1b[34m[FASE 1] Auditoria Estrita da Latência de Infraestrutura (API de E-mail)\x1b[0m');

  const providerApi = new MockMessagingProviderApi('SendGrid-Campus-Gateway');
  const signerTeste = COORTE_COLEGIADO_NOMINAL[0];

  // Cenário 1.1: Despacho nominal em milissegundos
  const tAntes = performance.now();
  const dispatchNominal = await providerApi.dispatchMagicLink(signerTeste, '0xabcdef0123456789', {
    injectLatencyMs: 245
  });
  const tDepois = performance.now();

  assertQA(dispatchNominal.latencyMs === 245,
    'Latência do provedor deve ser computada estritamente em milissegundos (245 ms)');
  assertQA(dispatchNominal.latencyMs <= SLA_INFRAESTRUTURA_DISPATCH_MS,
    `Latência deve estar abaixo do threshold de SLA de infraestrutura (${SLA_INFRAESTRUTURA_DISPATCH_MS} ms)`);
  assertQA(dispatchNominal.status === 'INFRA_HEALTHY',
    'Status de saúde da infraestrutura deve ser INFRA_HEALTHY para latência nominal');
  assertQA(dispatchNominal.sreAlertRequired === false,
    'Nenhum alerta de SRE deve ser disparado para despacho nominal dentro do SLA');
  assertQA(dispatchNominal.token.length >= 32,
    'Token de segurança criptográfica do Magic Link deve ter comprimento >= 32');

  // Cenário 1.2: Violação de SLA de Infraestrutura (> 3000 ms)
  const dispatchLento = await providerApi.dispatchMagicLink(signerTeste, '0xabcdef0123456789', {
    injectLatencyMs: 3850 // Excede 3000ms
  });

  assertQA(dispatchLento.latencyMs === 3850,
    'Latência de degradação da API deve ser registrada com precisão (3850 ms)');
  assertQA(dispatchLento.breachOfSla === true,
    'Violação de SLA deve ser marcada como true quando latencyMs > 3000 ms');
  assertQA(dispatchLento.status === 'INFRA_CRITICAL_BREACH',
    'Status de infraestrutura deve transitar para INFRA_CRITICAL_BREACH');
  assertQA(dispatchLento.sreAlertRequired === true,
    'Alerta crítico de SRE (SEV-1) DEVE ser acionado para latência de infraestrutura > 3000 ms');
  assertQA(dispatchLento.errorMessage?.includes('violou o threshold'),
    'Mensagem de erro de infraestrutura deve detalhar a causa-raiz da quebra de SLA');

  // Cenário 1.3: Falha de Rede / Erro HTTP 503 na API
  const dispatchErro = await providerApi.dispatchMagicLink(signerTeste, '0xabcdef0123456789', {
    injectHttpError: 503,
    injectLatencyMs: 150
  });

  assertQA(dispatchErro.httpStatus === 503,
    'Erro de rede do provedor deve registrar código HTTP 503');
  assertQA(dispatchErro.status === 'INFRA_ERROR_FAULT',
    'Status de infraestrutura deve ser INFRA_ERROR_FAULT');
  assertQA(dispatchErro.sreAlertRequired === true,
    'Falha HTTP 5xx do provedor deve acionar imediatamente a equipe de SRE');

  // ===========================================================================
  // FASE 2: SIMULAÇÃO ESTOCÁSTICA DE DELIBERAÇÃO HUMANA (ESCALA DE HORAS)
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 2] Simulação Estocástica de Deliberação Docente em Escala de Horas\x1b[0m');

  const humanSim = new StochasticHumanDeliberationSimulator();

  // Cenário 2.1: Resposta dentro do horário comercial (~6.5 horas)
  const respostaAgil = humanSim.simulateHumanResponse(COORTE_COLEGIADO_NOMINAL[0], 6.5);
  assertQA(respostaAgil.deliberationHours === 6.5,
    'Tempo de deliberação deve ser registrado em escala de horas (6.5 h)');
  assertQA(respostaAgil.workflowSlaBreached === false,
    'Deliberação de 6.5h deve cumprir o SLA institucional de workflow de 24h');
  assertQA(respostaAgil.status === 'HUMAN_NOMINAL_ON_TIME',
    'Status de atestação deve ser HUMAN_NOMINAL_ON_TIME');
  assertQA(respostaAgil.requiresAcademicReminder === false,
    'Signatário pontual não deve receber lembretes de cobrança');
  assertQA(respostaAgil.governanceNoticeRequired === false,
    'Nenhuma notificação de governança deve ser emitida para signatário em dia');

  // Cenário 2.2: Atraso docente colegiado (~31.0 horas)
  const respostaAtrasada = humanSim.simulateHumanResponse(COORTE_DOCENTES_SOBRECARREGADOS[0], 31.0);
  assertQA(respostaAtrasada.deliberationHours === 31.0,
    'Tempo de deliberação de docente ocupado deve ser 31.0 horas');
  assertQA(respostaAtrasada.workflowSlaBreached === true,
    'Deliberação de 31.0h deve registrar violação do SLA de 24h');
  assertQA(respostaAtrasada.status === 'HUMAN_DELAYED_NEEDS_REMINDER',
    'Status deve ser classificado como HUMAN_DELAYED_NEEDS_REMINDER');
  assertQA(respostaAtrasada.requiresAcademicReminder === true,
    'Signatário atrasado deve ativar gatilho de lembrete de cortesia institucional');
  assertQA(respostaAtrasada.governanceNoticeRequired === true,
    'Notificação de governança colegiada deve ser gerada');

  // Cenário 2.3: Distribuição Estocástica Livre (Log-Normal com mediana 14h)
  const amostrasEstocasticas: number[] = [];
  for (let i = 0; i < 50; i++) {
    const res = humanSim.simulateHumanResponse({
      id: `doc_${i}`,
      name: `Docente ${i}`,
      role: 'Professor Adjunto',
      email: `prof${i}@universidade.edu.br`,
      expectedMeanHours: 15.0,
      varianceFactor: 0.40
    });
    amostrasEstocasticas.push(res.deliberationHours);
  }
  const medianaEstocastica = calcularMediana(amostrasEstocasticas);
  assertQA(medianaEstocastica >= 10.0 && medianaEstocastica <= 22.0,
    `Mediana da distribuição estocástica (${medianaEstocastica.toFixed(1)} h) deve situar-se na faixa acadêmica típica (10h-22h)`);

  // ===========================================================================
  // FASE 3: AUDITORIA DO INDICADOR DE ATRITO DE RESPOSTA (IARS)
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 3] Validação do Indicador de Atrito de Resposta (IARS)\x1b[0m');

  // Lote ágil: mediana 10h, desvio 2h, média 10h -> IARS baixo (< 45)
  const iarsFluido = calcularIARS(10.0, 2.0, 10.0, 24.0);
  assertQA(iarsFluido.score < 45,
    `IARS de resposta ágil (${iarsFluido.score}/100) deve ser classificado como FLUIDO`);
  assertQA(iarsFluido.classification === 'FLUIDO',
    'Classificação deve ser FLUIDO');

  // Lote nominal: mediana 16h, desvio 4h, média 16h -> IARS nominal (45 a 65)
  const iarsNominal = calcularIARS(16.0, 4.0, 16.0, 24.0);
  assertQA(iarsNominal.score >= 45 && iarsNominal.score <= 65,
    `IARS de resposta típica (${iarsNominal.score}/100) deve estar na faixa NOMINAL`);
  assertQA(iarsNominal.classification === 'NOMINAL',
    'Classificação deve ser NOMINAL');

  // Lote sobrecarregado: mediana 30h, desvio 10h, média 30h -> IARS crítico (> 85)
  const iarsCritico = calcularIARS(30.0, 10.0, 30.0, 24.0);
  assertQA(iarsCritico.score > 85,
    `IARS com sobrecarga docente (${iarsCritico.score}/100) deve acusar GARGALO_CRÍTICO`);
  assertQA(iarsCritico.classification === 'GARGALO_CRÍTICO',
    'Classificação deve ser GARGALO_CRÍTICO');

  // ===========================================================================
  // FASE 4: SEGREGAÇÃO DE LOGS E PREVENÇÃO DE FALSOS POSITIVOS DE SRE
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 4] Validação de Logs Estruturados e Defesa Contra Fadiga de Alerta\x1b[0m');

  const logEngine = new SegregatedLogEngine();

  // Teste 4.1: Log de atraso docente (36 horas)
  const humanAtrasoLog = logEngine.logHumanEvent({
    attestationId: 'att_delay_99',
    signerId: 'prof_sobrecarregado',
    signerName: 'Dr. Afonso Henriques',
    signerRole: 'Diretor de Centro',
    deliberationHours: 36.5,
    deliberationHoursFormatted: '36.5 h',
    status: 'HUMAN_OVERDUE_ESCALATION',
    workflowSlaBreached: true,
    decision: 'APROVADA',
    requiresAcademicReminder: true,
    governanceNoticeRequired: true
  });

  assertQA(humanAtrasoLog.sreAlertDispatched === false,
    'REGRA DE OURO: Atraso docente de 36.5h JAMAIS deve disparar alerta de SRE / PagerDuty');
  assertQA(humanAtrasoLog.telemetryChannel === 'ACADEMIC_GOVERNANCE',
    'Atraso docente deve ser encaminhado exclusivamente ao canal ACADEMIC_GOVERNANCE');
  assertQA(humanAtrasoLog.governanceReminderTriggered === true,
    'Atraso docente deve disparar evento de envio de lembrete institucional');
  assertQA(humanAtrasoLog.data.mitigationAction === 'ENVIAR_E-MAIL_REFORCO_COORDENACAO',
    'Ação de mitigação deve ser disparo de e-mail de reforço pela coordenação acadêmica');

  // Teste 4.2: Log de falha de infraestrutura (latência de 3400ms)
  const infraLentaLog = logEngine.logInfraEvent({
    dispatchId: 'dsp_slow_01',
    recipientEmail: 'coord@universidade.edu.br',
    token: 'token_seguro_12345678901234567890123456789012',
    magicLinkUrl: 'https://dapp.edu.br/attest',
    tRequestMs: 1000,
    tDispatchAckMs: 4400,
    latencyMs: 3400,
    httpStatus: 202,
    provider: 'SendGrid-API',
    status: 'INFRA_CRITICAL_BREACH',
    breachOfSla: true,
    errorMessage: 'Latência de despacho (3400ms) excedeu SLA de infraestrutura (3000ms)',
    sreAlertRequired: true
  });

  assertQA(infraLentaLog.sreAlertDispatched === true,
    'Degradação real da API de mensageria (>3000ms) DEVE acionar alerta para o time de SRE');
  assertQA(infraLentaLog.telemetryChannel === 'SRE_OPS',
    'Canal de telemetria de falha de API deve ser SRE_OPS');
  assertQA(infraLentaLog.level === 'CRITICAL',
    'Nível de severidade deve ser CRITICAL para violação de SLA de mensageria');

  // ===========================================================================
  // FASE 5: SIMULAÇÃO E AUDITORIA COMPLETA DE LOTE NOMINAL
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 5] Execução de Coorte Completa: Conselho Universitário (Nominal)\x1b[0m');

  const { summary: sumarioNominal } = await executarAuditoriaSegregada({
    batchId: 'coorte_consuni_nominal_01',
    batchName: 'Reunião Ordinária do Conselho Universitário',
    signers: COORTE_COLEGIADO_NOMINAL,
    forcedHumanDelays: [11.0, 15.5, 4.0, 14.0, 8.5], // Deliberações humanas realistas
    providerOptions: {
      injectLatencyMs: 180 // API de e-mail com resposta saudável de 180ms
    }
  });

  assertQA(sumarioNominal.totalSigners === 5,
    'Lote nominal deve processar 5 signatários');
  assertQA(sumarioNominal.infraMetrics.meanDispatchMs === 180,
    'Latência média da API de e-mail deve ser 180 ms');
  assertQA(sumarioNominal.infraMetrics.slaComplianceRate === 100,
    'Conformidade de infraestrutura deve ser 100%');
  assertQA(sumarioNominal.infraMetrics.sreIncidentCount === 0,
    'Zero incidentes de SRE no lote nominal');
  assertQA(sumarioNominal.humanMetrics.medianDeliberationHours === 11.0 || sumarioNominal.humanMetrics.medianDeliberationHours === 14.0,
    `Mediana humana (${sumarioNominal.humanMetrics.medianDeliberationHours} h) calculada corretamente`);
  assertQA(sumarioNominal.humanMetrics.complianceRate24h === 100,
    '100% das atas do conselho fechadas dentro do prazo de 24h');
  assertQA(sumarioNominal.humanMetrics.iarsScore < 65,
    `IARS do conselho (${sumarioNominal.humanMetrics.iarsScore}/100) deve ser satisfatório`);
  assertQA(sumarioNominal.segregationAnalysis.sreAlertsDispatched === 0,
    'Zero alertas SRE emitidos');

  const relatorioNominal = renderizarRelatorioSegregadoConsole(sumarioNominal);
  assertQA(relatorioNominal.includes('INFRAESTRUTURA ESTÁVEL'),
    'Relatório deve certificar estabilidade da infraestrutura');
  assertQA(relatorioNominal.includes('Falsos Alarmes SRE Evitados'),
    'Relatório deve discriminar a prevenção de fadiga de alertas');
  console.log(relatorioNominal);

  // ===========================================================================
  // FASE 6: AUDITORIA DO CENÁRIO DE ALTA FADIGA (DOCENTES LENTOS + API SAUDÁVEL)
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 6] Cenário Crítico: Alta Latência Humana com API 100% Saudável\x1b[0m');

  const { summary: sumarioDocentesLentos } = await executarAuditoriaSegregada({
    batchId: 'coorte_capes_atraso_01',
    batchName: 'Comissão Especial de Avaliação Trienal (Sobrecarga Docente)',
    signers: COORTE_DOCENTES_SOBRECARREGADOS,
    forcedHumanDelays: [32.0, 29.5, 38.0], // Todos acima de 24 horas
    providerOptions: {
      injectLatencyMs: 140 // API de mensageria perfeitamente saudável (140 ms)
    }
  });

  // PROVA DE FOGO DA SEGREGAÇÃO ARQUITETURAL:
  assertQA(sumarioDocentesLentos.infraMetrics.slaComplianceRate === 100,
    'A API de mensageria continua 100% saudável (140ms), sem qualquer incidente técnico');
  assertQA(sumarioDocentesLentos.infraMetrics.sreIncidentCount === 0,
    'Nenhum incidente de SRE foi gerado, impedindo que o time de DevOps seja acordado');
  assertQA(sumarioDocentesLentos.humanMetrics.complianceRate24h === 0,
    '0% das assinaturas cumpriram o prazo de 24h devido a sobrecarga docente');
  assertQA(sumarioDocentesLentos.humanMetrics.remindersToDispatchCount === 3,
    'Todos os 3 docentes atrasados foram elegíveis para recebimento de lembrete cordial');
  assertQA(sumarioDocentesLentos.segregationAnalysis.falseSreAlertsPrevented === 3,
    'Exatamente 3 falsos alarmes de SRE foram interceptados e prevenidos pelo motor segregado');
  assertQA(sumarioDocentesLentos.segregationAnalysis.governanceNoticesDispatched === 3,
    '3 avisos de governança foram despachados com sucesso para o fluxo administrativo');

  const relatorioLento = renderizarRelatorioSegregadoConsole(sumarioDocentesLentos);
  assertQA(relatorioLento.includes('Falsos Alarmes SRE Evitados') && relatorioLento.includes('3'),
    'Relatório comprova 3 falsos alarmes evitados com sucesso');
  console.log(relatorioLento);

  // ===========================================================================
  // FASE 7: CENÁRIO DE FALHA REAL DE INFRAESTRUTURA (API DE MENSAGERIA DEGRADADA)
  // ===========================================================================
  console.log('\n\x1b[34m[FASE 7] Cenário Crítico de Infraestrutura: Degradação Real da API (> 3000 ms)\x1b[0m');

  const { summary: sumarioFalhaInfra } = await executarAuditoriaSegregada({
    batchId: 'coorte_falha_api_01',
    batchName: 'Lote com Degradação no Gateway SMTP Acadêmico',
    signers: COORTE_COLEGIADO_NOMINAL.slice(0, 3),
    providerOptions: {
      injectLatencyMs: 3450 // Violação gritante de SLA (> 3000 ms)
    }
  });

  assertQA(sumarioFalhaInfra.infraMetrics.sreIncidentCount === 3,
    'Todos os 3 disparos violaram o threshold e registraram incidente de SRE');
  assertQA(sumarioFalhaInfra.infraMetrics.slaComplianceRate === 0,
    'Conformidade de infraestrutura cai para 0%');
  assertQA(sumarioFalhaInfra.segregationAnalysis.sreAlertsDispatched === 3,
    'Exatamente 3 alertas de SRE (SEV-1) foram disparados para o plantão de DevOps');

  const relatorioFalhaInfra = renderizarRelatorioSegregadoConsole(sumarioFalhaInfra);
  assertQA(relatorioFalhaInfra.includes('ALERTA SRE: IDENTIFICADA DEGRADAÇÃO REAL'),
    'Relatório emite banner de alerta de SRE para falha de infraestrutura');
  console.log(relatorioFalhaInfra);

  // ===========================================================================
  // SUMÁRIO DE CERTIFICAÇÃO DE QA
  // ===========================================================================
  console.log('==============================================================================');
  console.log(`🎉 SUÍTE DE TESTE SEGREGADA DO MAGIC LINK CONCLUÍDA COM 100% DE SUCESSO!`);
  console.log(`   Asserções Verificadas: ${passedAssertions}/${totalAssertions} (PASS)`);
  console.log(`   Engenharia de Confiabilidade:`);
  console.log(`   • Latência de Infraestrutura (API de Mensageria) auditada em milissegundos (< 3000ms).`);
  console.log(`   • Latência de Atestação Humana modelada em horas estocásticas (mediana 12h-24h & IARS).`);
  console.log(`   • Segregação de Alertas ativa: 0% de alertas falsos gerados por atrasos docentes.`);
  console.log('==============================================================================\n');
}

// Execução imediata
executarSuiteSegregacaoMagicLink().catch(err => {
  console.error('\n✖ Falha na execução da suíte de teste segregada:', err);
  process.exit(1);
});
