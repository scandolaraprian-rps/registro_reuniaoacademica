import { ethers } from 'ethers';
import { AcademicMeetingData } from '../types';

/**
 * Normaliza os dados da ata acadêmica em uma string canônica previsível e determinística.
 * A ordem das chaves e a remoção de espaços redundantes garante que a mesma ata
 * gere sempre exatamente o mesmo hash criptográfico.
 */
export function buildCanonicalMeetingString(data: AcademicMeetingData): string {
  // Filtra apenas participantes marcados com nomes preenchidos
  const activeParticipants = data.participants
    .filter(p => p.checked && p.name.trim().length > 0)
    .map(p => ({
      role: p.role,
      name: p.name.trim(),
      id: p.departmentOrId.trim()
    }))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  // Ações filtradas e padronizadas
  const actions = data.actionChecklist
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
 * Calcula o hash SHA-256 no formato bytes32 compatível com Solidity (0x...)
 */
export async function calculateSha256(canonicalString: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `0x${hexString}`;
}

/**
 * Calcula o hash Keccak-256 nativo de Ethereum (bytes32) usando ethers.js
 */
export function calculateKeccak256(canonicalString: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalString));
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
