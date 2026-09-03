export type MeetingType = 'Orientação' | 'Feedback' | 'Sincronização' | 'Banca / Defesa' | 'Reunião de Colegiado' | 'Outro';

export interface Participant {
  id: string;
  role: 'Aluno' | 'Professor' | 'Orientador' | 'Coordenador';
  name: string;
  departmentOrId: string;
  checked: boolean;
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
