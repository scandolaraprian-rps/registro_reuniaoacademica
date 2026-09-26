/**
 * ==============================================================================
 * MÓDULO DE SANITIZAÇÃO RIGOROSA E DEFESA EM PROFUNDIDADE DO CLIENTE
 * Projeto: Registro de Ata de Reunião Acadêmica (DApp)
 * ==============================================================================
 * 
 * OBJETIVO DE SEGURANÇA E INTEGRIDADE:
 * 1. Eliminação cirúrgica de caracteres nulos (\0, \x00), caracteres invisíveis
 *    (Zero-Width Spaces \u200B-\u200D, \uFEFF) e sequências espúrias.
 * 2. Supressão de espaços excedentes nas extremidades (.trim()) e colapso de
 *    espaços duplicados internos (/\s+/g).
 * 3. Análise métrica de densidade alfanumérica para mitigar injeção de strings
 *    semanticamente vazias (ex: pontuação repetitiva, ruído ou caracteres de controle).
 * 4. Bloqueio pré-criptográfico: o sistema aborta e desabilita qualquer submissão
 *    ou cálculo de hash (Keccak/SHA) se os dados não satisfizerem o quórum semântico.
 * ==============================================================================
 */

import { AcademicMeetingData, Participant, FormValidationResult, FormValidationMetrics } from '../types';

// Expressão regular para caracteres de controle ASCII e nulos (0x00 - 0x1F exceto tabs/newlines controlados, e 0x7F)
export const REGEX_CARACTERES_NULOS_E_CONTROLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Expressão regular para caracteres invisíveis Unicode (Zero-Width Space, Joiners, BOM, Soft Hyphen)
export const REGEX_CARACTERES_INVISIVEIS_UNICODE = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g;

// Expressão regular para caracteres alfanuméricos válidos (incluindo acentuação em língua portuguesa)
export const REGEX_ALFANUMERICOS = /[a-zA-Z0-9À-ÿ]/g;

// Expressão regular para grupos contíguos de texto semântico
export const REGEX_TOKEN_SEMANTICO = /[a-zA-Z0-9À-ÿ]{3,}/;

/**
 * Remove qualquer caractere nulo (\0), caracteres de controle ASCII ou
 * caracteres invisíveis Unicode (Zero-Width Space, BOM).
 */
export function eliminarCaracteresNulosEInvisiveis(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(REGEX_CARACTERES_NULOS_E_CONTROLE, '')
    .replace(REGEX_CARACTERES_INVISIVEIS_UNICODE, '');
}

/**
 * Remove espaços e quebras de linha nas extremidades do texto (.trim()).
 */
export function removerEspacosExtremidades(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim();
}

/**
 * Normaliza qualquer sequência interna de múltiplos espaços, quebras de linha ou tabulações
 * para um único caractere de espaço simples ' '.
 */
export function normalizarEspacosInternos(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ');
}

/**
 * Pipeline completo de sanitização de texto:
 * 1. Elimina caracteres nulos e invisíveis.
 * 2. Executa .trim() nas extremidades.
 * 3. Normaliza espaços múltiplos internos.
 */
export function sanitizarEntradaTexto(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  const semInvisiveis = eliminarCaracteresNulosEInvisiveis(raw);
  const aparado = removerEspacosExtremidades(semInvisiveis);
  return normalizarEspacosInternos(aparado);
}

/**
 * Conta a quantidade de caracteres puramente alfanuméricos válidos (a-z, A-Z, 0-9, acentos PT-BR).
 */
export function contarCaracteresAlfanumericos(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  const matches = text.match(REGEX_ALFANUMERICOS);
  return matches ? matches.length : 0;
}

/**
 * Calcula a densidade de caracteres alfanuméricos em relação ao comprimento total
 * do texto sanitizado (desconsiderando espaços).
 * Retorna valor entre 0.00 e 1.00 (ex: 0.85 = 85% alfanumérico).
 */
export function calcularDensidadeAlfanumerica(text: string): number {
  const sanitizado = sanitizarEntradaTexto(text);
  if (!sanitizado) return 0;
  
  // Total de caracteres excluindo espaços simples
  const caracteresSemEspaco = sanitizado.replace(/\s/g, '').length;
  if (caracteresSemEspaco === 0) return 0;

  const alfas = contarCaracteresAlfanumericos(sanitizado);
  return Number((alfas / caracteresSemEspaco).toFixed(4));
}

/**
 * Detecta se a string é composta exclusivamente por pontuação ou repetição de símbolos espúrios.
 * Ex: "........", ",,,,,,,,,", "!@#$%^&*()", "   - - -   "
 */
export function isStringEspuriaOuApenasPontuacao(text: string): boolean {
  const sanitizado = sanitizarEntradaTexto(text);
  if (!sanitizado) return true;
  
  const alfas = contarCaracteresAlfanumericos(sanitizado);
  // Se não possui nenhum alfanumérico ou tem densidade insignificante
  if (alfas === 0) return true;

  // Se for apenas repetição do mesmo caractere por mais de 4 vezes seguidas sem variação
  const caracteresSemEspaco = sanitizado.replace(/\s/g, '');
  if (/^(.)\1{4,}$/.test(caracteresSemEspaco)) return true;

  return false;
}

/**
 * Validação rigorosa do campo "Título da Reunião"
 * Regras:
 * - Comprimento mínimo: 5 caracteres
 * - Comprimento máximo: 140 caracteres
 * - Pelo menos 4 caracteres alfanuméricos
 * - Densidade alfanumérica >= 55%
 * - Conter pelo menos 1 palavra/token com 3 ou mais caracteres alfanuméricos
 */
export function validarTitulo(titulo: string): { 
  valido: boolean; 
  erro?: string; 
  valorLimpo: string; 
  densidade: number; 
  comprimento: number; 
} {
  const valorLimpo = sanitizarEntradaTexto(titulo);
  const comprimento = valorLimpo.length;
  const densidade = calcularDensidadeAlfanumerica(valorLimpo);
  const alfas = contarCaracteresAlfanumericos(valorLimpo);

  if (comprimento === 0) {
    return {
      valido: false,
      erro: 'O título da reunião é obrigatório e não pode ser vazio ou composto unicamente por espaços/caracteres invisíveis.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (isStringEspuriaOuApenasPontuacao(valorLimpo)) {
    return {
      valido: false,
      erro: 'O título da reunião contém apenas símbolos ou pontuação sem conteúdo semântico válido.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (comprimento < 5) {
    return {
      valido: false,
      erro: `O título deve conter no mínimo 5 caracteres (atual: ${comprimento}).`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (comprimento > 140) {
    return {
      valido: false,
      erro: `O título excede o limite máximo permitido de 140 caracteres (atual: ${comprimento}).`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (alfas < 4 || densidade < 0.55) {
    return {
      valido: false,
      erro: `Densidade alfanumérica insuficiente no título (${(densidade * 100).toFixed(0)}%). O título deve conter texto descritivo real.`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (!REGEX_TOKEN_SEMANTICO.test(valorLimpo)) {
    return {
      valido: false,
      erro: 'O título da reunião deve conter termos descritivos com pelo menos 3 caracteres alfanuméricos contíguos.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  return { valido: true, valorLimpo, densidade, comprimento };
}

/**
 * Validação rigorosa do campo "Pauta da Reunião"
 * Regras:
 * - Comprimento mínimo: 15 caracteres
 * - Comprimento máximo: 1000 caracteres
 * - Pelo menos 10 caracteres alfanuméricos
 * - Densidade alfanumérica >= 45%
 */
export function validarPauta(pauta: string): { 
  valido: boolean; 
  erro?: string; 
  valorLimpo: string; 
  densidade: number; 
  comprimento: number; 
} {
  const valorLimpo = sanitizarEntradaTexto(pauta);
  const comprimento = valorLimpo.length;
  const densidade = calcularDensidadeAlfanumerica(valorLimpo);
  const alfas = contarCaracteresAlfanumericos(valorLimpo);

  if (comprimento === 0) {
    return {
      valido: false,
      erro: 'A pauta da reunião é obrigatória e não pode conter apenas espaços em branco ou nulos.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (isStringEspuriaOuApenasPontuacao(valorLimpo)) {
    return {
      valido: false,
      erro: 'A pauta informada contém apenas sequências repetitivas ou símbolos sem conteúdo temático.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (comprimento < 15) {
    return {
      valido: false,
      erro: `A pauta deve descrever os tópicos da reunião com no mínimo 15 caracteres (atual: ${comprimento}).`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (comprimento > 1000) {
    return {
      valido: false,
      erro: `A pauta excede o limite máximo estabelecido de 1000 caracteres (atual: ${comprimento}).`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (alfas < 10 || densidade < 0.45) {
    return {
      valido: false,
      erro: `Densidade alfanumérica da pauta muito baixa (${(densidade * 100).toFixed(0)}%). Forneça termos textuais válidos.`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (!REGEX_TOKEN_SEMANTICO.test(valorLimpo)) {
    return {
      valido: false,
      erro: 'A pauta deve conter termos gramaticais válidos para registrar os objetivos do encontro.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  return { valido: true, valorLimpo, densidade, comprimento };
}

/**
 * Validação rigorosa do campo "Deliberações da Reunião"
 * Regras:
 * - Comprimento mínimo: 20 caracteres
 * - Comprimento máximo: 1000 caracteres
 * - Pelo menos 12 caracteres alfanuméricos
 * - Densidade alfanumérica >= 45%
 */
export function validarDeliberacoes(deliberacoes: string): { 
  valido: boolean; 
  erro?: string; 
  valorLimpo: string; 
  densidade: number; 
  comprimento: number; 
} {
  const valorLimpo = sanitizarEntradaTexto(deliberacoes);
  const comprimento = valorLimpo.length;
  const densidade = calcularDensidadeAlfanumerica(valorLimpo);
  const alfas = contarCaracteresAlfanumericos(valorLimpo);

  if (comprimento === 0) {
    return {
      valido: false,
      erro: 'O campo "Deliberações" é obrigatório e não pode ser vazio ou conter apenas caracteres nulos.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (isStringEspuriaOuApenasPontuacao(valorLimpo)) {
    return {
      valido: false,
      erro: 'O campo "Deliberações" contém apenas caracteres pontuais sem valor probatório.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (comprimento < 20) {
    return {
      valido: false,
      erro: `As deliberações devem conter no mínimo 20 caracteres descrevendo as decisões tomadas (atual: ${comprimento}).`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (comprimento > 1000) {
    return {
      valido: false,
      erro: `As deliberações excedem o limite estabelecido de 1000 caracteres (atual: ${comprimento}).`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (alfas < 12 || densidade < 0.45) {
    return {
      valido: false,
      erro: `Densidade alfanumérica das deliberações insuficiente (${(densidade * 100).toFixed(0)}%). O registro formal requer frases conclusivas.`,
      valorLimpo,
      densidade,
      comprimento
    };
  }

  if (!REGEX_TOKEN_SEMANTICO.test(valorLimpo)) {
    return {
      valido: false,
      erro: 'As deliberações devem conter deliberações textuais identificáveis.',
      valorLimpo,
      densidade,
      comprimento
    };
  }

  return { valido: true, valorLimpo, densidade, comprimento };
}

/**
 * Validação dos Participantes da Ata
 * Requisitos:
 * - Pelo menos 2 participantes ativos marcados (checked: true)
 * - Pelo menos 1 Aluno e 1 Professor/Orientador (mitiga registro unilateral)
 * - Nome de cada participante deve ter no mínimo 3 caracteres alfanuméricos válidos
 */
export function validarParticipantes(participants: Participant[]): {
  valido: boolean;
  erro?: string;
  participantesAtivos: Participant[];
} {
  if (!participants || !Array.isArray(participants) || participants.length === 0) {
    return {
      valido: false,
      erro: 'Nenhum participante informado na ata acadêmica.',
      participantesAtivos: []
    };
  }

  const ativos = participants.filter(p => p.checked);

  if (ativos.length < 2) {
    return {
      valido: false,
      erro: 'A ata acadêmica requer a presença confirmada de pelo menos 2 participantes (Aluno e Professor/Orientador) para impedir o registro unilateral.',
      participantesAtivos: ativos
    };
  }

  // Verifica se cada participante ativo possui nome sanitizado válido
  for (const part of ativos) {
    const nomeLimpo = sanitizarEntradaTexto(part.name);
    const alfasNome = contarCaracteresAlfanumericos(nomeLimpo);
    const densidadeNome = calcularDensidadeAlfanumerica(nomeLimpo);

    if (nomeLimpo.length < 3 || alfasNome < 3 || densidadeNome < 0.60) {
      return {
        valido: false,
        erro: `O participante (${part.role}) possui nome inválido ou incompleto. Forneça o nome civil completo com ao menos 3 caracteres alfanuméricos.`,
        participantesAtivos: ativos
      };
    }
  }

  // Verifica paridade institucional (Aluno + Professor/Orientador)
  const temAluno = ativos.some(p => p.role === 'Aluno');
  const temProfessorOuOrientador = ativos.some(p => p.role === 'Professor' || p.role === 'Orientador' || p.role === 'Coordenador');

  if (!temAluno || !temProfessorOuOrientador) {
    return {
      valido: false,
      erro: 'A ata deve conter a representação de ambas as partes (ao menos um Aluno e um Professor/Orientador/Coordenador).',
      participantesAtivos: ativos
    };
  }

  return {
    valido: true,
    participantesAtivos: ativos
  };
}

/**
 * Sanitiza estruturalmente todos os campos de AcademicMeetingData de forma profunda
 */
export function sanitizarDadosAtaCompletos(data: AcademicMeetingData): AcademicMeetingData {
  return {
    ...data,
    title: sanitizarEntradaTexto(data.title),
    pauta: sanitizarEntradaTexto(data.pauta),
    deliberacoes: sanitizarEntradaTexto(data.deliberacoes || data.summaryAndDecisions),
    summaryAndDecisions: sanitizarEntradaTexto(data.summaryAndDecisions || data.deliberacoes),
    academicUnit: sanitizarEntradaTexto(data.academicUnit),
    extraNotes: sanitizarEntradaTexto(data.extraNotes),
    participants: (data.participants || []).map(p => ({
      ...p,
      name: sanitizarEntradaTexto(p.name),
      departmentOrId: sanitizarEntradaTexto(p.departmentOrId),
      email: sanitizarEntradaTexto(p.email)
    })),
    actionChecklist: (data.actionChecklist || []).map(a => ({
      ...a,
      label: sanitizarEntradaTexto(a.label),
      responsible: sanitizarEntradaTexto(a.responsible),
      deadline: sanitizarEntradaTexto(a.deadline)
    }))
  };
}

/**
 * Executa a validação global do formulário de ata em tempo real
 */
export function validarFormularioCompleto(data: AcademicMeetingData): FormValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  const resTitulo = validarTitulo(data.title || '');
  if (!resTitulo.valido && resTitulo.erro) {
    errors.title = resTitulo.erro;
  }

  const resPauta = validarPauta(data.pauta || '');
  if (!resPauta.valido && resPauta.erro) {
    errors.pauta = resPauta.erro;
  }

  const resDeliberacoes = validarDeliberacoes(data.deliberacoes || data.summaryAndDecisions || '');
  if (!resDeliberacoes.valido && resDeliberacoes.erro) {
    errors.deliberacoes = resDeliberacoes.erro;
  }

  const resParticipantes = validarParticipantes(data.participants || []);
  if (!resParticipantes.valido && resParticipantes.erro) {
    errors.participants = resParticipantes.erro;
  }

  const unidadeLimpa = sanitizarEntradaTexto(data.academicUnit || '');
  if (unidadeLimpa.length < 3) {
    errors.academicUnit = 'A unidade acadêmica / departamento é obrigatório (mínimo de 3 caracteres).';
  }

  const metrics: FormValidationMetrics = {
    titleLength: resTitulo.comprimento,
    titleAlphaCount: contarCaracteresAlfanumericos(resTitulo.valorLimpo),
    titleAlphaDensity: resTitulo.densidade,
    pautaLength: resPauta.comprimento,
    pautaAlphaCount: contarCaracteresAlfanumericos(resPauta.valorLimpo),
    pautaAlphaDensity: resPauta.densidade,
    deliberacoesLength: resDeliberacoes.comprimento,
    deliberacoesAlphaCount: contarCaracteresAlfanumericos(resDeliberacoes.valorLimpo),
    deliberacoesAlphaDensity: resDeliberacoes.densidade,
    activeParticipantsCount: resParticipantes.participantesAtivos.length
  };

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    warnings,
    metrics
  };
}

/**
 * Cláusula de guarda rigorosa executada ANTES de qualquer rotina criptográfica.
 * Dispara uma exceção imediata caso os dados sejam semanticamente inválidos,
 * garantindo que nenhum hash Keccak/SHA nem transação Web3 seja disparada.
 */
export function assertCargaUtilValidaParaCriptografia(data: AcademicMeetingData): AcademicMeetingData {
  const validacao = validarFormularioCompleto(data);
  if (!validacao.isValid) {
    const primeiroErro = Object.values(validacao.errors)[0] || 'Carga útil rejeitada na validação semântica.';
    console.error('[Defesa em Profundidade] Tentativa de submissão com dados inválidos bloqueada:', validacao.errors);
    throw new Error(`[Bloqueio de Segurança] ${primeiroErro}`);
  }
  return sanitizarDadosAtaCompletos(data);
}
