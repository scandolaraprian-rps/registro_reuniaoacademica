export interface InstitutionalUser {
  nome: string;
  email: string;
  role: 'aluno' | 'professor' | 'coordenador' | 'orientador';
  matricula?: string;
  instituicao?: string;
  departamento?: string;
  walletAddress: string;
  loginTimestamp?: number;
}

export type MeetingType = 'Orientação' | 'Feedback' | 'Sincronização' | 'Banca / Defesa' | 'Reunião de Colegiado' | 'Outro';

export interface Participant {
  id: string;
  role: 'Aluno' | 'Professor' | 'Orientador' | 'Coordenador';
  name: string;
  departmentOrId: string;
  checked: boolean;
  email?: string;
  walletAddress?: string;
  signed?: boolean;
  signedAt?: number;
}

export type AtaState = 
  | 'RASCUNHO' 
  | 'PENDENTE_ASSINATURAS' 
  | 'APROVADA_AGUARDANDO_CONSOLIDACAO' 
  | 'CONSOLIDADA_ON_CHAIN' 
  | 'REJEITADA';

export interface CoSignerStatus {
  participantId: string;
  name: string;
  role: string;
  email: string;
  walletAddress: string;
  signed: boolean;
  signedAt?: number;
  signatureHash?: string;
  magicToken?: string;
  magicLinkUrl?: string;
}

export interface MultisigProposal {
  id: string;
  documentHash: string;
  hashAlgorithm: 'Keccak-256' | 'SHA-256';
  meetingData: AcademicMeetingData;
  canonicalString: string;
  ipfsCID?: string;
  encryptedPayloadBase64?: string;
  encryptionKeyHint?: string;
  status: AtaState;
  proposer: {
    name: string;
    email: string;
    role: string;
    walletAddress: string;
  };
  coSigners: CoSignerStatus[];
  requiredSignatures: number;
  collectedSignatures: number;
  createdAt: number;
  consolidatedTxId?: string;
  consolidatedAt?: number;
}

export interface FormValidationMetrics {
  titleLength: number;
  titleAlphaCount: number;
  titleAlphaDensity: number;
  pautaLength: number;
  pautaAlphaCount: number;
  pautaAlphaDensity: number;
  deliberacoesLength: number;
  deliberacoesAlphaCount: number;
  deliberacoesAlphaDensity: number;
  activeParticipantsCount: number;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
  metrics: FormValidationMetrics;
}

export interface ActionItem {
  id: string;
  label: string;
  completed: boolean;
  responsible?: string;
  deadline?: string;
}

export interface AcademicMeetingData {
  dateTime: string;
  title: string;
  pauta?: string; // Pauta da reunião (obrigatório para ata)
  deliberacoes?: string; // Deliberações da reunião (obrigatório para ata)
  meetingType: MeetingType;
  academicUnit: string;
  participants: Participant[];
  summaryAndDecisions: string;
  actionChecklist: ActionItem[];
  extraNotes?: string;
}

export interface CryptoReceipt {
  receiptId: string;
  documentHash: string; // bytes32 hex string
  hashAlgorithm: 'SHA-256' | 'Keccak-256';
  txId: string; // 0x...
  blockNumber: number;
  timestamp: number; // Unix timestamp
  formattedDate: string;
  signerAddress: string;
  networkId: string;
  networkName: string;
  contractAddress: string;
  gasUsed: string;
  status: 'confirmed' | 'pending' | 'failed';
  canonicalDataString: string;
  meetingSnapshot: AcademicMeetingData;
  ipfsCID?: string;
  encryptedPayloadBase64?: string;
  encryptionKeyHint?: string;
  coSigners?: CoSignerStatus[];
  isMultisig?: boolean;
}

export interface BlockchainNetwork {
  id: string;
  name: string;
  chainId: number;
  currencySymbol: string;
  explorerUrl: string;
  rpcUrl?: string;
  badgeColor: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: BlockchainNetwork;
  balance: string;
  isSimulated: boolean;
}
