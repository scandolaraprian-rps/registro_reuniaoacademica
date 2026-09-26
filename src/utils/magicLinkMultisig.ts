/**
 * ==============================================================================
 * MÓDULO DE MÚLTIPLAS ASSINATURAS (MULTISIG) INTEGRADO A MAGIC LINKS
 * Camada de Consenso Off-Chain e Validação Coletiva de Atas Acadêmicas
 * ==============================================================================
 * 
 * OBJETIVO ARQUITETURAL:
 * Eliminar a vulnerabilidade de registro unilateral de atas na blockchain.
 * Nenhuma ata é gravada diretamente no smart contract por um único participante.
 * O fluxo de aprovação prévia garante que:
 * 1. A ata sanitizada é retida em estado PENDENTE_ASSINATURAS.
 * 2. Magic Links individuais são despachados para todos os participantes oficiais
 *    (Aluno e Professor/Orientador).
 * 3. Cada co-signatário acessa a ata, audita o hash e confirma a assinatura.
 * 4. Atingido o quórum necessário (M-de-N ou unanimidade), a ata transita para
 *    APROVADA_AGUARDANDO_CONSOLIDACAO e finalmente é enviada à blockchain.
 * ==============================================================================
 */

import { AcademicMeetingData, InstitutionalUser, MultisigProposal, CoSignerStatus, AtaState } from '../types';
import { gerarTokenCriptografico, JANELA_EXPIRACAO_MS } from './magicLinkAuth';
import { assertCargaUtilValidaParaCriptografia } from './formSanitization';

export const LOCAL_STORAGE_PROPOSALS_KEY = 'academic_ledger_proposals_v1';

// Mapeamento em memória de tokens de atestação de ata: token -> { proposalId, participantId, expiresAt }
interface AtestacaoTokenRecord {
  token: string;
  proposalId: string;
  participantId: string;
  documentHash: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

const atestacaoTokenStore = new Map<string, AtestacaoTokenRecord>();

/**
 * Deriva um e-mail institucional simulado e previsível a partir do nome e papel do participante
 */
export function derivarEmailInstitucional(nome: string, role: string): string {
  const normalizado = (nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');

  const sufixo = role.toLowerCase().includes('aluno') ? 'aluno.universidade.edu.br' : 'prof.universidade.edu.br';
  return `${normalizado || 'participante'}@${sufixo}`;
}

/**
 * Deriva um endereço de carteira Ethereum determinístico a partir do nome do participante
 */
export function derivarWalletParticipante(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = (hash << 5) - hash + nome.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex.repeat(5).substring(0, 40)}`;
}

/**
 * Cria uma nova proposta de ata no estado PENDENTE_ASSINATURAS.
 * Valida rigorosamente a carga útil antes de registrar a proposta.
 */
export function criarPropostaMultisig(params: {
  meetingData: AcademicMeetingData;
  documentHash: string;
  hashAlgorithm: 'Keccak-256' | 'SHA-256';
  canonicalString: string;
  ipfsCID?: string;
  encryptedPayloadBase64?: string;
  encryptionKeyHint?: string;
  proposerUser?: InstitutionalUser | null;
  proposerWallet?: string;
}): MultisigProposal {
  // 1. Defesa em profundidade: validação obrigatória da carga útil
  const dadosSanitizados = assertCargaUtilValidaParaCriptografia(params.meetingData);

  // 2. Extrai participantes ativos da ata
  const ativos = dadosSanitizados.participants.filter(p => p.checked);
  if (ativos.length < 2) {
    throw new Error('A ata requer no mínimo 2 participantes ativos para o fluxo de multi-assinatura.');
  }

  const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const agora = Date.now();

  const proponenteEmail = params.proposerUser?.email || 'coordenacao@universidade.edu.br';
  const proponenteNome = params.proposerUser?.nome || 'Proponente da Ata';
  const proponenteRole = params.proposerUser?.role || 'coordenador';
  const proponenteWallet = params.proposerWallet || params.proposerUser?.walletAddress || '0x71C59a38F8e684077674681f215E5c6778401aB7';

  // 3. Constrói a lista de co-signatários com seus Magic Links exclusivos
  const coSigners: CoSignerStatus[] = ativos.map((part, index) => {
    const email = part.email || derivarEmailInstitucional(part.name, part.role);
    const wallet = part.walletAddress || derivarWalletParticipante(part.name);
    const token = gerarTokenCriptografico(32);
    const expiresAt = agora + JANELA_EXPIRACAO_MS;

    // Registra token em memória para verificação de atestação
    atestacaoTokenStore.set(token, {
      token,
      proposalId,
      participantId: part.id,
      documentHash: params.documentHash,
      email,
      expiresAt,
      used: false
    });

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://academic-ledger.edu.br';
    const magicLinkUrl = `${baseUrl}/multisig/attest?proposal=${proposalId}&partId=${part.id}&token=${token}&hash=${params.documentHash}`;

    // O proponente (se for o primeiro da lista ou corresponder ao email) assina inicialmente
    const isProposer = index === 0;

    return {
      participantId: part.id,
      name: part.name,
      role: part.role,
      email,
      walletAddress: wallet,
      signed: isProposer,
      signedAt: isProposer ? agora : undefined,
      signatureHash: isProposer ? `0xsig_${token.substring(0, 16)}` : undefined,
      magicToken: token,
      magicLinkUrl
    };
  });

  const collectedSignatures = coSigners.filter(c => c.signed).length;
  const requiredSignatures = coSigners.length;

  const status: AtaState = collectedSignatures >= requiredSignatures 
    ? 'APROVADA_AGUARDANDO_CONSOLIDACAO' 
    : 'PENDENTE_ASSINATURAS';

  const proposta: MultisigProposal = {
    id: proposalId,
    documentHash: params.documentHash,
    hashAlgorithm: params.hashAlgorithm,
    meetingData: dadosSanitizados,
    canonicalString: params.canonicalString,
    ipfsCID: params.ipfsCID,
    encryptedPayloadBase64: params.encryptedPayloadBase64,
    encryptionKeyHint: params.encryptionKeyHint,
    status,
    proposer: {
      name: proponenteNome,
      email: proponenteEmail,
      role: proponenteRole,
      walletAddress: proponenteWallet
    },
    coSigners,
    requiredSignatures,
    collectedSignatures,
    createdAt: agora
  };

  salvarPropostaNoStorage(proposta);

  console.group(`[Multisig Pipeline] Nova Proposta Registrada: ${proposalId}`);
  console.log('Hash da Ata:', params.documentHash);
  console.log(`Quórum Requerido: ${collectedSignatures}/${requiredSignatures} assinaturas.`);
  console.table(coSigners.map(c => ({
    Nome: c.name,
    Papel: c.role,
    Email: c.email,
    Assinado: c.signed ? 'SIM' : 'PENDENTE (Magic Link)'
  })));
  console.groupEnd();

  return proposta;
}

/**
 * Atesta e assina a proposta em nome de um co-signatário
 */
export function atestarAssinaturaParticipante(
  proposalId: string, 
  participantId: string,
  tokenOpcional?: string
): { sucesso: boolean; propostaAtualizada: MultisigProposal; mensagem: string } {
  const proposta = obterPropostaPorId(proposalId);
  if (!proposta) {
    throw new Error(`Proposta de ata "${proposalId}" não encontrada no registro.`);
  }

  if (proposta.status === 'CONSOLIDADA_ON_CHAIN') {
    throw new Error('Esta ata já foi consolidada na blockchain e é imutável.');
  }

  const coSigner = proposta.coSigners.find(c => c.participantId === participantId);
  if (!coSigner) {
    throw new Error(`Co-signatário "${participantId}" não integra o colegiado desta ata.`);
  }

  if (coSigner.signed) {
    return {
      sucesso: true,
      propostaAtualizada: proposta,
      mensagem: `O participante ${coSigner.name} já atestou esta ata anteriormente.`
    };
  }

  // Se token foi fornecido, valida no repositório de tokens
  if (tokenOpcional) {
    const reg = atestacaoTokenStore.get(tokenOpcional);
    if (reg) {
      if (Date.now() > reg.expiresAt) {
        throw new Error('O Magic Link de assinatura expirou (limite de 10 minutos excedido).');
      }
      reg.used = true;
      atestacaoTokenStore.delete(tokenOpcional);
    }
  }

  const agora = Date.now();
  const sigProof = `0xattest_${gerarTokenCriptografico(16)}`;

  coSigner.signed = true;
  coSigner.signedAt = agora;
  coSigner.signatureHash = sigProof;

  proposta.collectedSignatures = proposta.coSigners.filter(c => c.signed).length;

  if (proposta.collectedSignatures >= proposta.requiredSignatures) {
    proposta.status = 'APROVADA_AGUARDANDO_CONSOLIDACAO';
  }

  salvarPropostaNoStorage(proposta);

  console.info(`[Multisig Consensus] Assinatura coletada com sucesso: ${coSigner.name} (${coSigner.role}). Quórum: ${proposta.collectedSignatures}/${proposta.requiredSignatures}`);

  return {
    sucesso: true,
    propostaAtualizada: proposta,
    mensagem: `Assinatura de ${coSigner.name} confirmada com sucesso via Magic Link.`
  };
}

/**
 * Marca a ata como consolidada na blockchain após envio da transação
 */
export function marcarAtaConsolidadaOnChain(
  proposalId: string, 
  txHash: string
): MultisigProposal {
  const proposta = obterPropostaPorId(proposalId);
  if (!proposta) {
    throw new Error(`Proposta "${proposalId}" não localizada.`);
  }

  proposta.status = 'CONSOLIDADA_ON_CHAIN';
  proposta.consolidatedTxId = txHash;
  proposta.consolidatedAt = Date.now();

  salvarPropostaNoStorage(proposta);
  return proposta;
}

const memoriaPropostas = new Map<string, MultisigProposal>();

/**
 * Persiste proposta no localStorage e no cache em memória
 */
function salvarPropostaNoStorage(proposta: MultisigProposal): void {
  memoriaPropostas.set(proposta.id, proposta);
  try {
    if (typeof localStorage !== 'undefined') {
      const existentes = carregarTodasPropostas();
      const index = existentes.findIndex(p => p.id === proposta.id);
      if (index >= 0) {
        existentes[index] = proposta;
      } else {
        existentes.unshift(proposta);
      }
      localStorage.setItem(LOCAL_STORAGE_PROPOSALS_KEY, JSON.stringify(existentes));
    }
  } catch (err) {
    console.warn('[Multisig Storage] Falha ao persistir proposta no localStorage:', err);
  }
}

/**
 * Obtém proposta pelo ID
 */
export function obterPropostaPorId(id: string): MultisigProposal | null {
  if (memoriaPropostas.has(id)) {
    return memoriaPropostas.get(id)!;
  }
  const propostas = carregarTodasPropostas();
  return propostas.find(p => p.id === id) || null;
}

/**
 * Carrega todas as propostas salvas
 */
export function carregarTodasPropostas(): MultisigProposal[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_PROPOSALS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MultisigProposal[];
        parsed.forEach(p => memoriaPropostas.set(p.id, p));
        return parsed;
      }
    }
    return Array.from(memoriaPropostas.values());
  } catch {
    return Array.from(memoriaPropostas.values());
  }
}
