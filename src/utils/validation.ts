/**
 * ==============================================================================
 * UTILITÁRIO DE VALIDAÇÃO E SANITIZAÇÃO DE ENTRADAS DE ATAS
 * Arquivo: src/utils/validation.ts
 * ==============================================================================
 * 
 * Fornece a função de limpeza baseada em expressões regulares para proteger o
 * formulário contra injeção de bytes nulos, espaços excessivos nas extremidades,
 * e sequências de whitespace redundantes.
 */

// Expressão regular para bytes nulos (\0, \x00) e caracteres de controle ASCII
export const REGEX_NULL_BYTES = /[\x00\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Expressão regular para caracteres invisíveis Unicode (Zero-Width Space, Joiners, BOM)
export const REGEX_CARACTERES_INVISIVEIS = /[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g;

// Expressão regular para espaços repetidos/sequenciais (tabs, quebras de linha e múltiplos espaços)
export const REGEX_ESPACOS_SEQUENCIAIS = /\s+/g;

// Limiares mínimos recomendados para campos críticos da ata
export const LIMIAR_MINIMO_TITULO = 5;
export const LIMIAR_MINIMO_PAUTA = 15;
export const LIMIAR_MINIMO_DELIBERACOES = 20;
export const LIMIAR_MINIMO_PADRAO = 10;

/**
 * Sanitiza rigorosamente qualquer string de entrada do formulário de ata:
 * 1. Remove bytes nulos (\0, \x00) e caracteres de controle via regex.
 * 2. Remove caracteres invisíveis Unicode (Zero-Width Spaces).
 * 3. Remove espaços excedentes no início e no fim (.trim()).
 * 4. Normaliza sequências de múltiplos espaços internos para um único espaço via regex (/\s+/g).
 * 
 * @param input Texto de entrada fornecido pelo usuário
 * @returns Texto higienizado e padronizado
 */
export function sanitizarInputAta(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(REGEX_NULL_BYTES, '')
    .replace(REGEX_CARACTERES_INVISIVEIS, '')
    .trim()
    .replace(REGEX_ESPACOS_SEQUENCIAIS, ' ');
}

/**
 * Verifica se uma cadeia de caracteres, após sanitização regex,
 * atinge o limiar mínimo de caracteres exigido para o campo.
 * 
 * @param input Texto a ser verificado
 * @param limiarMinimo Quantidade mínima de caracteres requerida (padrão: 10)
 * @returns true se o comprimento for estritamente menor que o limiar mínimo
 */
export function isAbaixoDoLimiarMinimo(
  input: string | null | undefined, 
  limiarMinimo: number = LIMIAR_MINIMO_PADRAO
): boolean {
  const limpo = sanitizarInputAta(input);
  return limpo.length < limiarMinimo;
}

/**
 * Valida os campos textuais principais da ata utilizando a sanitização regex
 * 
 * @param titulo Título da ata
 * @param pauta Pauta da reunião
 * @param deliberacoes Deliberações da reunião
 * @returns Objeto com status de validação, valores limpos e eventuais mensagens de bloqueio
 */
export function validarCamposAta(
  titulo: string | null | undefined,
  pauta: string | null | undefined,
  deliberacoes: string | null | undefined
): {
  valido: boolean;
  tituloLimpo: string;
  pautaLimpa: string;
  deliberacoesLimpa: string;
  motivoBloqueio?: string;
} {
  const tituloLimpo = sanitizarInputAta(titulo);
  const pautaLimpa = sanitizarInputAta(pauta);
  const deliberacoesLimpa = sanitizarInputAta(deliberacoes);

  if (tituloLimpo.length < LIMIAR_MINIMO_TITULO) {
    return {
      valido: false,
      tituloLimpo,
      pautaLimpa,
      deliberacoesLimpa,
      motivoBloqueio: `O título da reunião deve conter pelo menos ${LIMIAR_MINIMO_TITULO} caracteres após a sanitização (atual: ${tituloLimpo.length}).`
    };
  }

  if (pautaLimpa.length < LIMIAR_MINIMO_PAUTA) {
    return {
      valido: false,
      tituloLimpo,
      pautaLimpa,
      deliberacoesLimpa,
      motivoBloqueio: `A pauta deve conter pelo menos ${LIMIAR_MINIMO_PAUTA} caracteres após a sanitização (atual: ${pautaLimpa.length}).`
    };
  }

  if (deliberacoesLimpa.length < LIMIAR_MINIMO_DELIBERACOES) {
    return {
      valido: false,
      tituloLimpo,
      pautaLimpa,
      deliberacoesLimpa,
      motivoBloqueio: `As deliberações devem conter pelo menos ${LIMIAR_MINIMO_DELIBERACOES} caracteres após a sanitização (atual: ${deliberacoesLimpa.length}).`
    };
  }

  return {
    valido: true,
    tituloLimpo,
    pautaLimpa,
    deliberacoesLimpa
  };
}
