/**
 * ==============================================================================
 * SUÍTE DE TESTES DE RESILIÊNCIA, MUTAÇÃO E DEFESA EM PROFUNDIDADE
 * Projeto: Registro de Ata de Reunião Acadêmica (DApp)
 * Executável: npx tsx test/sanitizationAndResilience.test.ts
 * ==============================================================================
 */

import {
  eliminarCaracteresNulosEInvisiveis,
  removerEspacosExtremidades,
  normalizarEspacosInternos,
  sanitizarEntradaTexto,
  contarCaracteresAlfanumericos,
  calcularDensidadeAlfanumerica,
  validarTitulo,
  validarPauta,
  validarDeliberacoes,
  validarParticipantes,
  validarFormularioCompleto,
  assertCargaUtilValidaParaCriptografia
} from '../src/utils/formSanitization';

import {
  calculateKeccak256,
  sanitizeForHashing
} from '../src/utils/crypto';

import {
  criarPropostaMultisig,
  atestarAssinaturaParticipante,
  marcarAtaConsolidadaOnChain
} from '../src/utils/magicLinkMultisig';

import { AcademicMeetingData } from '../src/types';
import { 
  sanitizarInputAta, 
  isAbaixoDoLimiarMinimo, 
  validarCamposAta,
  LIMIAR_MINIMO_TITULO,
  LIMIAR_MINIMO_PAUTA,
  LIMIAR_MINIMO_DELIBERACOES 
} from '../src/utils/validation';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

function expectThrows(fn: () => void, testName: string) {
  totalTests++;
  try {
    fn();
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${testName} (esperava exceção, mas executou com sucesso)`);
  } catch (err: any) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName} (rejeitado corretamente: ${err.message})`);
  }
}

console.log('\n==============================================================================');
console.log('🧪 INICIANDO SUÍTE DE TESTES: SANITIZAÇÃO, RESILIÊNCIA E MULTISIG');
console.log('==============================================================================\n');

// ------------------------------------------------------------------------------
// GRUPO 1: ELIMINAÇÃO DE CARACTERES NULOS E INVISÍVEIS
// ------------------------------------------------------------------------------
console.log('\x1b[34m[GRUPO 1] Sanitização de Nulos, Controles e Zero-Width Spaces\x1b[0m');

{
  const inputComNulo = 'Ata\0de\x00Reunião\x1FAcadêmica';
  const limpo = eliminarCaracteresNulosEInvisiveis(inputComNulo);
  assert(limpo === 'AtadeReuniãoAcadêmica', 'Deve purgar bytes nulos \\0 e códigos de controle ASCII');
}

{
  const inputComZeroWidth = 'Pauta\u200B\u200Ccom\u200Dzero\uFEFFwidth\u00ADspaces';
  const limpo = eliminarCaracteresNulosEInvisiveis(inputComZeroWidth);
  assert(limpo === 'Pautacomzerowidthspaces', 'Deve purgar caracteres invisíveis Unicode (\\u200B-\\u200D, \\uFEFF, \\u00AD)');
}

{
  const inputExtremidades = '   \t\n  Orientação de Projeto Final   \r\n   ';
  const aparado = removerEspacosExtremidades(inputExtremidades);
  assert(aparado === 'Orientação de Projeto Final', 'Deve remover espaços, tabulações e quebras nas extremidades');
}

{
  const inputMuitosEspacos = 'Definição   do    escopo \t\t  e    cronograma \n\n da ata';
  const normalizado = normalizarEspacosInternos(inputMuitosEspacos);
  assert(normalizado === 'Definição do escopo e cronograma da ata', 'Deve colapsar sequências de espaços/newlines internos para espaço simples');
}

{
  const pipelineTotal = sanitizarEntradaTexto('  \0\u200B  Reunião   \x00   Extraordinária  \uFEFF \t ');
  assert(pipelineTotal === 'Reunião Extraordinária', 'Pipeline global sanitizarEntradaTexto deve entregar texto limpo unificado');
}

// ------------------------------------------------------------------------------
// GRUPO 2: ANÁLISE DE VALORES LIMITE (BOUNDARY VALUE ANALYSIS)
// ------------------------------------------------------------------------------
console.log('\n\x1b[34m[GRUPO 2] Análise de Valores Limite (Boundary Values)\x1b[0m');

{
  // Título: mínimo 5 caracteres
  assert(validarTitulo('').valido === false, 'Título vazio ("") deve ser rejeitado');
  assert(validarTitulo('   ').valido === false, 'Título apenas com espaços deve ser rejeitado');
  assert(validarTitulo('Ata').valido === false, 'Título com 3 caracteres (< 5) deve ser rejeitado');
  assert(validarTitulo('Atas').valido === false, 'Título com 4 caracteres (< 5) deve ser rejeitado');
  assert(validarTitulo('Ata 1').valido === true, 'Título no limite mínimo de 5 caracteres ("Ata 1") deve ser aceito');
  assert(validarTitulo('Orientacao Academica: '.repeat(10)).valido === false, 'Título com mais de 140 caracteres deve ser rejeitado');
  const titulo140Chars = 'Orientacao de TCC em Engenharia de Software e Sistemas Distribuidos com Validacao Descentralizada por Contratos Inteligentes EVM Versao 2.0'.substring(0, 140);
  assert(validarTitulo(titulo140Chars).valido === true, 'Título longo semântico com até 140 caracteres deve ser aceito');
  assert(validarTitulo('A'.repeat(50)).valido === false, 'Repetição de caractere único ("AAAAA...") deve ser rejeitado por regra anti-spam');
}

{
  // Pauta: mínimo 15 caracteres, máximo 1000
  assert(validarPauta('').valido === false, 'Pauta vazia deve ser rejeitada');
  assert(validarPauta('Pauta curta 123').valido === true, 'Pauta com 15 caracteres úteis ("Pauta curta 123") deve ser aceita');
  assert(validarPauta('Pauta curta 12').valido === false, 'Pauta com 14 caracteres deve ser rejeitada');
  assert(validarPauta('P'.repeat(1001)).valido === false, 'Pauta com 1001 caracteres deve ser rejeitada');
  assert(validarPauta('Definição da arquitetura técnica da aplicação').valido === true, 'Pauta canônica bem formatada deve ser aceita');
}

{
  // Deliberações: mínimo 20 caracteres, máximo 1000
  assert(validarDeliberacoes('').valido === false, 'Deliberações vazias devem ser rejeitadas');
  assert(validarDeliberacoes('Decisão aprovada ok').valido === false, 'Deliberações com 19 caracteres devem ser rejeitadas');
  assert(validarDeliberacoes('Decisão aprovada ok!').valido === true, 'Deliberações com 20 caracteres válidos devem ser aceitas');
  assert(validarDeliberacoes('D'.repeat(1001)).valido === false, 'Deliberações com 1001 caracteres devem ser rejeitadas');
}

// ------------------------------------------------------------------------------
// GRUPO 3: INJEÇÃO DE ESPAÇOS, CARACTERES ESPÚRIOS E BAIXA DENSIDADE ALFANUMÉRICA
// ------------------------------------------------------------------------------
console.log('\n\x1b[34m[GRUPO 3] Injeção de Sequências Espúrias e Baixa Densidade Alfanumérica\x1b[0m');

{
  // Sequências de pontuação
  const pontos = '........................................';
  assert(validarTitulo(pontos).valido === false, 'Injeção de pontuação pura repetida no título deve ser rejeitada');
  assert(validarPauta(pontos).valido === false, 'Injeção de pontuação pura na pauta deve ser rejeitada');
  assert(validarDeliberacoes(pontos).valido === false, 'Injeção de pontuação pura nas deliberações deve ser rejeitada');
}

{
  // Tentativa de burlar contagem de caracteres intercalando espaços e pontos
  const bypassAttempt = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . .';
  assert(validarPauta(bypassAttempt).valido === false, 'Tentativa de inflar tamanho com pontos e espaços deve ser rejeitada por densidade');
}

{
  // Injeção de caracteres nulos disfarçados
  const nullInjection = '   \0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0   ';
  assert(validarPauta(nullInjection).valido === false, 'Injeção de múltiplos bytes nulos mascarados com espaços deve ser rejeitada');
}

{
  // Densidade alfanumérica métrica
  const densidadeTextoReal = calcularDensidadeAlfanumerica('Orientação Acadêmica 2026');
  assert(densidadeTextoReal > 0.8, `Densidade de texto real deve ser alta (atual: ${densidadeTextoReal})`);

  const densidadeSimbolos = calcularDensidadeAlfanumerica('!!??##$$%%^^&&**(()))');
  assert(densidadeSimbolos === 0, `Densidade de símbolos puros deve ser 0 (atual: ${densidadeSimbolos})`);
}

// ------------------------------------------------------------------------------
// GRUPO 4: VALIDAÇÃO DE PARTICIPANTES E PREVENÇÃO DE REGISTRO UNILATERAL
// ------------------------------------------------------------------------------
console.log('\n\x1b[34m[GRUPO 4] Prevenção de Registro Unilateral e Validação de Colegiado\x1b[0m');

{
  const semParticipantes: any[] = [];
  assert(validarParticipantes(semParticipantes).valido === false, 'Ata sem participantes deve ser rejeitada');

  const umParticipante: any[] = [
    { id: '1', role: 'Aluno', name: 'Lucas Gabriel', departmentOrId: 'Mat: 123', checked: true }
  ];
  assert(validarParticipantes(umParticipante).valido === false, 'Ata com apenas 1 participante deve ser rejeitada (registro unilateral)');

  const doisAlunos: any[] = [
    { id: '1', role: 'Aluno', name: 'Lucas Gabriel', departmentOrId: 'Mat: 123', checked: true },
    { id: '2', role: 'Aluno', name: 'Marcos Souza', departmentOrId: 'Mat: 456', checked: true }
  ];
  assert(validarParticipantes(doisAlunos).valido === false, 'Ata sem representação docente/orientador deve ser rejeitada');

  const participanteNomeVazio: any[] = [
    { id: '1', role: 'Aluno', name: '   \0   ', departmentOrId: 'Mat: 123', checked: true },
    { id: '2', role: 'Professor', name: 'Profa. Dra. Mariana', departmentOrId: 'SIAPE: 789', checked: true }
  ];
  assert(validarParticipantes(participanteNomeVazio).valido === false, 'Participante com nome composto de espaços/nulos deve ser rejeitado');

  const comissaoValida: any[] = [
    { id: '1', role: 'Aluno', name: 'Lucas Gabriel Silveira', departmentOrId: 'Mat: 123', checked: true },
    { id: '2', role: 'Professor', name: 'Profa. Dra. Mariana Esteves', departmentOrId: 'SIAPE: 789', checked: true }
  ];
  assert(validarParticipantes(comissaoValida).valido === true, 'Colegiado com Aluno e Docente válidos deve ser aceito');
}

// ------------------------------------------------------------------------------
// GRUPO 5: DEFESA EM PROFUNDIDADE E ABORTO CRIPTOGRÁFICO
// ------------------------------------------------------------------------------
console.log('\n\x1b[34m[GRUPO 5] Aborto Pré-Criptográfico e Proteção de Recursos da Rede\x1b[0m');

{
  const ataInvalidaComNulos: AcademicMeetingData = {
    dateTime: new Date().toISOString(),
    title: '   \0\0   ',
    meetingType: 'Orientação',
    academicUnit: 'DCC',
    participants: [],
    pauta: '   ',
    deliberacoes: '   ',
    summaryAndDecisions: '',
    actionChecklist: []
  };

  expectThrows(() => {
    assertCargaUtilValidaParaCriptografia(ataInvalidaComNulos);
  }, 'assertCargaUtilValidaParaCriptografia deve lançar erro e abortar rotina para ata com dados espúrios');
}

{
  const rawSpurious = '   \0\0\x00   \u200B   ';
  const cleanForHash = sanitizeForHashing(rawSpurious);
  assert(cleanForHash === '', 'sanitizeForHashing deve reduzir injeção nula para string vazia');

  // Ata íntegra válida
  const ataValida: AcademicMeetingData = {
    dateTime: new Date().toISOString(),
    title: 'Orientação de TCC - Arquitetura Descentralizada',
    meetingType: 'Orientação',
    academicUnit: 'Departamento de Computação',
    participants: [
      { id: '1', role: 'Aluno', name: 'Lucas Gabriel Silveira', departmentOrId: 'Mat: 123', checked: true },
      { id: '2', role: 'Professor', name: 'Profa. Dra. Mariana Esteves', departmentOrId: 'SIAPE: 789', checked: true }
    ],
    pauta: 'Definição da arquitetura técnica da aplicação e sanitização de dados.',
    deliberacoes: 'Apresentação do estado da arte sobre autenticação Web3 e contratos.',
    summaryAndDecisions: 'Apresentação do estado da arte sobre autenticação Web3 e contratos.',
    actionChecklist: []
  };

  const sanitizada = assertCargaUtilValidaParaCriptografia(ataValida);
  assert(sanitizada.title.length > 0, 'Carga útil válida deve ser aceita e sanitizada com sucesso');

  const hashKeccak = calculateKeccak256(sanitizada.title);
  assert(hashKeccak.startsWith('0x') && hashKeccak.length === 66, 'Hash Keccak-256 de 32 bytes gerado apenas após aprovação');
}

// ------------------------------------------------------------------------------
// GRUPO 6: FLUXO DE MÚLTIPLAS ASSINATURAS (MULTISIG) COM MAGIC LINKS
// ------------------------------------------------------------------------------
console.log('\n\x1b[34m[GRUPO 6] Fluxo de Múltiplas Assinaturas (Multisig) com Magic Links\x1b[0m');

{
  const ataMultisig: AcademicMeetingData = {
    dateTime: new Date().toISOString(),
    title: 'Reunião de Alinhamento e Defesa Prévia',
    meetingType: 'Orientação',
    academicUnit: 'Faculdade de Tecnologia',
    participants: [
      { id: 'part_aluno', role: 'Aluno', name: 'Bruno Dias Castro', departmentOrId: 'Mat: 2021001', checked: true },
      { id: 'part_prof', role: 'Professor', name: 'Prof. Carlos Eduardo', departmentOrId: 'SIAPE: 55432', checked: true }
    ],
    pauta: 'Validação da metodologia e alinhamento do cronograma da dissertação.',
    deliberacoes: 'Cronograma ajustado e homologado para entrega no próximo mês.',
    summaryAndDecisions: 'Cronograma ajustado e homologado para entrega no próximo mês.',
    actionChecklist: []
  };

  const hashAta = calculateKeccak256(ataMultisig.title + ataMultisig.pauta);

  // 1. Criação da proposta (não consolida diretamente on-chain)
  const proposta = criarPropostaMultisig({
    meetingData: ataMultisig,
    documentHash: hashAta,
    hashAlgorithm: 'Keccak-256',
    canonicalString: JSON.stringify(ataMultisig),
    proposerUser: {
      nome: 'Bruno Dias Castro',
      email: 'bruno.castro@aluno.universidade.edu.br',
      role: 'aluno',
      walletAddress: '0x1111111111111111111111111111111111111111'
    }
  });

  assert(proposta.status === 'PENDENTE_ASSINATURAS', 'Proposta recém-criada deve iniciar em PENDENTE_ASSINATURAS');
  assert(proposta.requiredSignatures === 2, 'Quórum necessário deve ser 2 (Aluno + Professor)');
  assert(proposta.collectedSignatures === 1, 'Proponente já assina inicialmente (1/2 coletado)');

  const profSigner = proposta.coSigners.find(c => c.participantId === 'part_prof');
  assert(profSigner !== undefined, 'Professor co-signatário deve estar na lista');
  assert(profSigner?.magicToken !== undefined && profSigner.magicToken.length > 20, 'Deve gerar Magic Token seguro para o co-signatário');
  assert(profSigner?.magicLinkUrl?.includes('token='), 'Deve gerar URL de Magic Link com parâmetro de token');

  // 2. Co-signatário atesta assinatura via Magic Link
  const resultadoAtestacao = atestarAssinaturaParticipante(proposta.id, 'part_prof', profSigner?.magicToken);
  assert(resultadoAtestacao.sucesso === true, 'Atestação via Magic Link do docente deve ser aceita com sucesso');
  assert(resultadoAtestacao.propostaAtualizada.collectedSignatures === 2, 'Total de assinaturas coletadas deve atingir 2/2');
  assert(resultadoAtestacao.propostaAtualizada.status === 'APROVADA_AGUARDANDO_CONSOLIDACAO', 'Estado deve transitar para APROVADA_AGUARDANDO_CONSOLIDACAO');

  // 3. Consolidação final on-chain
  const propostaConsolidada = marcarAtaConsolidadaOnChain(proposta.id, '0xsimulated_tx_hash_987654321');
  assert(propostaConsolidada.status === 'CONSOLIDADA_ON_CHAIN', 'Estado deve transitar para CONSOLIDADA_ON_CHAIN após gravação na blockchain');
}

// ------------------------------------------------------------------------------
// GRUPO 7: SANITIZAR INPUT ATA (REGEX-BASED CLEANING & MINIMUM THRESHOLDS)
// ------------------------------------------------------------------------------
console.log('\n\x1b[34m[GRUPO 7] sanitizarInputAta: Limpeza Regex e Verificação de Limiares\x1b[0m');

{
  const inputSujo = '  \0\x00  Reunião   \t\n  Ordinária   \0 de   \u200B Colegiado  \r\n  ';
  const limpo = sanitizarInputAta(inputSujo);
  assert(limpo === 'Reunião Ordinária de Colegiado', 'sanitizarInputAta deve remover bytes nulos, invisíveis e normalizar espaços via regex');

  const apenasNulosEEspacos = '   \0\0\x00 \t \r\n   ';
  assert(sanitizarInputAta(apenasNulosEEspacos) === '', 'sanitizarInputAta deve reduzir cadeia espúria a string vazia');

  // Testes de limiares mínimos
  assert(isAbaixoDoLimiarMinimo('Ata', LIMIAR_MINIMO_TITULO) === true, 'Deve identificar título ("Ata") abaixo do limiar de 5 caracteres');
  assert(isAbaixoDoLimiarMinimo('Ata de TCC', LIMIAR_MINIMO_TITULO) === false, 'Deve aprovar título atingindo o limiar de 5 caracteres');

  assert(isAbaixoDoLimiarMinimo('Pauta curta', LIMIAR_MINIMO_PAUTA) === true, 'Deve identificar pauta ("Pauta curta", 11 chars) abaixo do limiar de 15 caracteres');
  assert(isAbaixoDoLimiarMinimo('Pauta completa da reuniao', LIMIAR_MINIMO_PAUTA) === false, 'Deve aprovar pauta atingindo o limiar de 15 caracteres');

  assert(isAbaixoDoLimiarMinimo('Decisões tomadas', LIMIAR_MINIMO_DELIBERACOES) === true, 'Deve identificar deliberações curtas abaixo do limiar de 20 caracteres');
  assert(isAbaixoDoLimiarMinimo('Decisões regimentais homologadas pela banca', LIMIAR_MINIMO_DELIBERACOES) === false, 'Deve aprovar deliberações com mais de 20 caracteres');

  const validacaoCampos = validarCamposAta('   \0   ', 'Pauta curta', 'Deliberações');
  assert(validacaoCampos.valido === false, 'validarCamposAta deve invalidar campos quando algum estiver abaixo do limiar');
  assert(validacaoCampos.tituloLimpo === '', 'validarCamposAta deve retornar título limpo e higienizado');
}

console.log('\n==============================================================================');
console.log(`📊 RESULTADO DA SUÍTE DE TESTES: ${passedTests}/${totalTests} PASSARAM (${failedTests} FALHAS)`);
console.log('==============================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
