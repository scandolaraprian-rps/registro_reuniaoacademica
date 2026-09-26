import { ethers } from 'ethers';
import { AcademicMeetingData } from '../types';
import { eliminarCaracteresNulosEInvisiveis } from './formSanitization';

/**
 * ==============================================================================
 * FUNÇÃO UTILITÁRIA DE SANITIZAÇÃO E LIMPEZA DE TEXTO PARA HASHING
 * ==============================================================================
 * 
 * Previne falsos positivos de adulteração durante a auditoria criptográfica
 * decorrentes de diferenças invisíveis de formatação ou injeção de bytes nulos.
 * 
 * Passos executados:
 * 1. eliminarCaracteresNulosEInvisiveis(): Elimina \0, \x00 e Zero-Width Spaces.
 * 2. .trim(): Remove espaços em branco no início e no final da string inteira.
 * 3. .replace(/\s+/g, ' '): Utiliza expressão regular para substituir qualquer
 *    sequência de múltiplos espaços, tabulações ou quebras de linha por um único
 *    espaço simples.
 * 4. .toLowerCase(): Padroniza todo o texto para letras minúsculas, garantindo
 *    que variações de caixa alta/baixa não alterem o hash matemático.
 * 
 * @param rawText Texto bruto a ser limpo
 * @returns Texto canônico sanitizado e pronto para hashing
 */
export function sanitizeForHashing(rawText: string): string {
  if (typeof rawText !== 'string') return '';
  const semInvisiveis = eliminarCaracteresNulosEInvisiveis(rawText);
  return semInvisiveis
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Concatena os campos capturados do formulário em uma string única e padronizada.
 * A ordem dos campos e a ordenação alfabética de participantes e ações
 * garantem que a mesma ata sempre resulte na mesma sequência textual.
 * 
 * @param data Dados estruturados da ata acadêmica
 * @returns String unificada dos dados da ata
 */
export function concatenateMeetingData(data: AcademicMeetingData): string {
  // Participantes ativos ordenados
  const activeParticipants = (data.participants || [])
    .filter(p => p.checked && p.name && p.name.trim().length > 0)
    .map(p => `${p.role}: ${p.name.trim()}${p.departmentOrId?.trim() ? ` (${p.departmentOrId.trim()})` : ''}`)
    .sort((a, b) => a.localeCompare(b))
    .join('; ');

  // Ações da checklist ordenadas
  const actions = (data.actionChecklist || [])
    .map(a => `${a.label.trim()}${a.responsible ? ` [resp: ${a.responsible.trim()}]` : ''}${a.deadline ? ` [prazo: ${a.deadline.trim()}]` : ''}`)
    .sort((a, b) => a.localeCompare(b))
    .join('; ');

  // Concatenação linear dos campos da ata
  const pautaText = (data.pauta || '').trim();
  const deliberacoesText = (data.deliberacoes || data.summaryAndDecisions || '').trim();

  return [
    `título: ${data.title || ''}`,
    `tipo: ${data.meetingType || ''}`,
    `unidade: ${data.academicUnit || ''}`,
    `data: ${data.dateTime || ''}`,
    `pauta: ${pautaText}`,
    `deliberações: ${deliberacoesText}`,
    `participantes: ${activeParticipants}`,
    `ações: ${actions}`,
    `notas: ${data.extraNotes || ''}`
  ].join(' | ');
}

/**
 * Prepara o texto da ata acadêmica para a geração do hash:
 * Concatena os dados do formulário e aplica obrigatoriamente a sanitização.
 */
export function prepareMeetingTextForHashing(data: AcademicMeetingData): {
  rawConcatenated: string;
  sanitizedText: string;
} {
  const rawConcatenated = concatenateMeetingData(data);
  const sanitizedText = sanitizeForHashing(rawConcatenated);
  return { rawConcatenated, sanitizedText };
}

/**
 * Normaliza os dados da ata acadêmica em uma string canônica JSON previsível.
 */
export function buildCanonicalMeetingString(data: AcademicMeetingData): string {
  const activeParticipants = (data.participants || [])
    .filter(p => p.checked && p.name.trim().length > 0)
    .map(p => ({
      role: p.role,
      name: p.name.trim(),
      id: p.departmentOrId.trim()
    }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  const actions = (data.actionChecklist || [])
    .map(a => ({
      item: a.label.trim(),
      checked: a.completed,
      responsible: a.responsible ? a.responsible.trim() : '',
      deadline: a.deadline ? a.deadline.trim() : ''
    }))
    .sort((a, b) => a.item.localeCompare(b.item));

  const canonicalPayload = {
    schema: "ATA_ACADEMICA_V1",
    titulo: data.title.trim(),
    tipoReuniao: data.meetingType,
    unidadeAcademica: data.academicUnit.trim(),
    dataHoraOriginal: data.dateTime.trim(),
    participantes: activeParticipants,
    resumoDecisoes: data.summaryAndDecisions.trim(),
    checklistAcoes: actions,
    observacoesExtras: (data.extraNotes || '').trim()
  };

  return JSON.stringify(canonicalPayload, null, 2);
}

/**
 * Calcula o hash Keccak-256 (padrão EVM bytes32) usando ethers.js.
 * Passa obrigatoriamente qualquer texto fornecido pela função sanitizeForHashing().
 * 
 * @param rawText Texto bruto da ata (concatenado ou colado pelo usuário)
 * @returns Hash hexadecimal '0x...' de 32 bytes
 */
export function calculateKeccak256(rawText: string): string {
  const cleanText = sanitizeForHashing(rawText);
  return ethers.keccak256(ethers.toUtf8Bytes(cleanText));
}

/**
 * Calcula o hash SHA-256 no formato bytes32 compatível com Solidity (0x...)
 * Passa obrigatoriamente qualquer texto fornecido pela função sanitizeForHashing().
 * 
 * @param rawText Texto bruto da ata (concatenado ou colado pelo usuário)
 * @returns Hash hexadecimal '0x...' de 32 bytes
 */
export async function calculateSha256(rawText: string): Promise<string> {
  const cleanText = sanitizeForHashing(rawText);
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanText);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hexString}`;
}

/**
 * Gera um ID de transação realista de 32 bytes (64 caracteres hex)
 */
export function generateSimulatedTxHash(): string {
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Abrevia endereços ethereum para visualização elegante (ex: 0x71C...a489)
 */
export function formatEthAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Abrevia hashes longos (TxHash ou DocumentHash)
 */
export function formatLongHash(hash: string, startLen = 10, endLen = 8): string {
  if (!hash || hash.length <= startLen + endLen) return hash;
  return `${hash.substring(0, startLen)}...${hash.substring(hash.length - endLen)}`;
}
