import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  AcademicMeetingData, 
  CryptoReceipt, 
  WalletState, 
  BlockchainNetwork,
  InstitutionalUser,
  MultisigProposal,
  CoSignerStatus
} from './types';
import { 
  SUPPORTED_NETWORKS, 
  DEFAULT_CONTRACT_ADDRESSES,
  SMART_CONTRACT_ABI 
} from './contracts/solidityContract';
import { 
  generateSimulatedTxHash, 
  formatEthAddress 
} from './utils/crypto';
import { 
  LOCAL_STORAGE_USER_KEY,
  generateMockWallet 
} from './utils/auth';
import { assertSessaoAutenticada, 
  encerrarSessaoAtiva,
  sincronizarSessaoExistente
} from './utils/magicLinkAuth';
import { 
  criarPropostaMultisig, 
  atestarAssinaturaParticipante, 
  marcarAtaConsolidadaOnChain, 
  carregarTodasPropostas 
} from './utils/magicLinkMultisig';
import { exibirToastFeedback } from './utils/formReset';
import { 
  transmitirEConfirmarHashOnChain, 
  compilarReciboCriptografico,
  BlockchainTransactionError 
} from './utils/blockchainConnector';
import { travarInterface } from './utils/web3Lockdown';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import { Navbar } from './components/Navbar';
import { MeetingForm } from './components/MeetingForm';
import { InstitutionalLoginGate } from './components/InstitutionalLoginGate';
import { CryptoReceiptModal } from './components/CryptoReceiptModal';
import { MultisigModal } from './components/MultisigModal';
import { SmartContractViewer } from './components/SmartContractViewer';
import { AuditVerifier } from './components/AuditVerifier';
import { ReceiptsHistory } from './components/ReceiptsHistory';

const LOCAL_STORAGE_RECEIPTS_KEY = 'academic_blockchain_receipts_v1';
const LOCAL_STORAGE_CONTRACT_KEY = 'academic_blockchain_custom_contract';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'audit' | 'contract'>('form');

  // Estado da Identidade Institucional (SSO Acadêmico)
  const [institutionalUser, setInstitutionalUser] = useState<InstitutionalUser | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return null; // Inicia sem login para exibir o gate institucional
  });

  // Sincroniza sessão ativa de segurança com o usuário autenticado
  useEffect(() => {
    if (institutionalUser?.email) {
      sincronizarSessaoExistente(institutionalUser.email);
    } else {
      encerrarSessaoAtiva();
    }
  }, [institutionalUser]);
  
  // Wallet State
  const [wallet, setWallet] = useState<WalletState>(() => {
    const initialAddress = institutionalUser?.walletAddress || '0x71C59a38F8e684077674681f215E5c6778401aB7';
    return {
      isConnected: true,
      address: initialAddress,
      network: SUPPORTED_NETWORKS[0], // Sepolia
      balance: '1.450',
      isSimulated: true
    };
  });

  const [contractAddress, setContractAddress] = useState<string>(
    localStorage.getItem(LOCAL_STORAGE_CONTRACT_KEY) || DEFAULT_CONTRACT_ADDRESSES['sepolia']
  );

  // Histórico de Recibos
  const [receipts, setReceipts] = useState<CryptoReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RECEIPTS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    // Semente inicial de demonstração para já ter histórico visível se o usuário quiser auditar
    return [
      {
        receiptId: 'rec_init_9981',
        documentHash: '0x8f4d92a10b7549112999e5cb1562b08a8a43fe9918739a896d8b94ce5180cb91',
        hashAlgorithm: 'Keccak-256',
        txId: '0x5b32e18d6bf91469e3a6a9b4fe2b947c617937da9228d9c34d3bb0e0bf27498c',
        blockNumber: 5829104,
        timestamp: Date.now() - 86400000 * 2,
        formattedDate: new Date(Date.now() - 86400000 * 2).toLocaleString('pt-BR'),
        signerAddress: '0x71C59a38F8e684077674681f215E5c6778401aB7',
        networkId: 'sepolia',
        networkName: 'Ethereum Sepolia Testnet',
        contractAddress: '0x3a48981A4aE8e08Fa6714E69719F8a0fF08d74B2',
        gasUsed: '44812',
        status: 'confirmed',
        canonicalDataString: '{\n  "schema": "ATA_ACADEMICA_V1",\n  "titulo": "Reunião de Alinhamento Semestral de Pesquisa",\n  "tipoReuniao": "Orientação"\n}',
        meetingSnapshot: {
          dateTime: '2026-09-01T14:00',
          title: 'Reunião de Alinhamento Semestral de Pesquisa',
          meetingType: 'Orientação',
          academicUnit: 'Depto. de Engenharia de Software',
          participants: [
            { id: '1', role: 'Aluno', name: 'Marcos Vinícius Costa', departmentOrId: '2023190', checked: true },
            { id: '2', role: 'Professor', name: 'Prof. Dr. André Silveira', departmentOrId: 'SIAPE: 98112', checked: true }
          ],
          summaryAndDecisions: 'Homologação do tema de monografia e entrega dos diagramas de arquitetura de software.',
          actionChecklist: [
            { id: 'a1', label: 'Aprovar plano de trabalho preliminar', completed: true },
            { id: 'a2', label: 'Revisão bibliográfica entregue e validada', completed: true }
          ]
        }
      }
    ];
  });

  const [activeReceipt, setActiveReceipt] = useState<CryptoReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [auditPrefillReceipt, setAuditPrefillReceipt] = useState<CryptoReceipt | null>(null);

  // Estado de Múltiplas Assinaturas (Multisig via Magic Links)
  const [activeProposal, setActiveProposal] = useState<MultisigProposal | null>(() => {
    const todas = carregarTodasPropostas();
    return todas.length > 0 ? todas[0] : null;
  });
  const [isMultisigModalOpen, setIsMultisigModalOpen] = useState<boolean>(false);
  const [isConsolidatingProposal, setIsConsolidatingProposal] = useState<boolean>(false);

  // Monitoramento e Tratamento de Falhas na Blockchain (Eliminando Falhas Silenciosas)
  const [blockchainError, setBlockchainError] = useState<{
    tipo: string;
    mensagem: string;
    codigoOriginal?: string | number;
  } | null>(null);
  const [blockchainProgress, setBlockchainProgress] = useState<{
    etapa: string;
    mensagem: string;
  } | null>(null);

  // Salva recibos no localStorage sempre que atualizado
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RECEIPTS_KEY, JSON.stringify(receipts));
    } catch (e) {
      console.error(e);
    }
  }, [receipts]);

  // Conexão com MetaMask (Web3 real) ou fallback inteligente
  const handleConnectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const network = await provider.getNetwork();
        const signer = await provider.getSigner();
        const balanceWei = await provider.getBalance(accounts[0]);
        const balanceEth = parseFloat(ethers.formatEther(balanceWei)).toFixed(3);

        const currentMatchedNet = SUPPORTED_NETWORKS.find(n => n.chainId === Number(network.chainId)) || wallet.network;

        setWallet({
          isConnected: true,
          address: accounts[0],
          network: currentMatchedNet,
          balance: balanceEth,
          isSimulated: false
        });
      } catch (err: any) {
        console.warn('Falha ao conectar MetaMask, usando modo simulação testnet', err);
        enableSimulatedWallet();
      }
    } else {
      // MetaMask não detectado no browser
      enableSimulatedWallet();
    }
  };

  const enableSimulatedWallet = () => {
    setWallet({
      isConnected: true,
      address: '0x71C59a38F8e684077674681f215E5c6778401aB7',
      network: wallet.network,
      balance: '2.500',
      isSimulated: true
    });
  };

  const handleDisconnectWallet = () => {
    setWallet({
      isConnected: false,
      address: null,
      network: wallet.network,
      balance: '0.000',
      isSimulated: false
    });
  };

  const handleSwitchNetwork = async (network: BlockchainNetwork) => {
    // Se estiver conectado via MetaMask real, tenta trocar a chain no MetaMask
    if (!wallet.isSimulated && typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const hexChainId = '0x' + network.chainId.toString(16);
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      } catch (switchError: any) {
        // Se a rede não estiver cadastrada no MetaMask
        if (switchError.code === 4902 && network.rpcUrl) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x' + network.chainId.toString(16),
                  chainName: network.name,
                  nativeCurrency: {
                    name: network.currencySymbol,
                    symbol: network.currencySymbol,
                    decimals: 18
                  },
                  rpcUrls: [network.rpcUrl],
                  blockExplorerUrls: [network.explorerUrl]
                },
              ],
            });
          } catch (addError) {
            console.error('Falha ao adicionar rede:', addError);
          }
        }
      }
    }

    // Atualiza estado
    setWallet(prev => ({ ...prev, network }));
    const defaultAddr = DEFAULT_CONTRACT_ADDRESSES[network.id] || contractAddress;
    setContractAddress(defaultAddr);
  };

  const handleToggleSimulatedWallet = () => {
    if (wallet.isSimulated) {
      handleConnectWallet();
    } else {
      enableSimulatedWallet();
    }
  };

  const handleSaveContractAddress = (newAddr: string) => {
    setContractAddress(newAddr);
    localStorage.setItem(LOCAL_STORAGE_CONTRACT_KEY, newAddr);
  };

  // Submissão da Ata: Cálculo do Hash e Gravação na Blockchain com IPFS
  const handleSubmitMeeting = async (
    formData: AcademicMeetingData,
    chosenHash: string,
    canonicalString: string,
    ipfsCID?: string,
    encryptedBase64?: string,
    encryptionKeyHint?: string,
    coSigners?: CoSignerStatus[]
  ): Promise<string> => {
    // REQUISITO DE SEGURANÇA (AppSec): Validação de sessão autenticada antes do hash e da blockchain
    assertSessaoAutenticada();

    setIsSubmitting(true);
    setBlockchainError(null);

    try {
      // Rotina assíncrona para aguardar confirmação da transação na rede e capturar o txId
      const resultadoTx = await transmitirEConfirmarHashOnChain({
        documentHash: chosenHash,
        contractAddress,
        wallet,
        onProgresso: (etapa, mensagem) => {
          setBlockchainProgress({ etapa, mensagem });
        }
      });

      // Compilação rigorosa do recibo criptográfico visual vinculado ao txId capturado
      const newReceipt = compilarReciboCriptografico({
        resultadoTx,
        documentHash: chosenHash,
        meetingData: formData,
        canonicalDataString: canonicalString,
        ipfsCID,
        encryptedPayloadBase64: encryptedBase64,
        encryptionKeyHint,
        coSigners
      });

      // Adiciona aos recibos e renderiza no histórico
      setReceipts(prev => [newReceipt, ...prev]);
      setActiveReceipt(newReceipt);
      setIsReceiptModalOpen(true);
      setBlockchainProgress(null);

      // Trava o formulário na interface para proteger o documento
      travarInterface(formData);

      exibirToastFeedback(`Recibo emitido com sucesso! TxID: ${resultadoTx.txId.substring(0, 10)}...`, 'sucesso');
      return resultadoTx.txId;
    } catch (err: any) {
      console.error('[Blockchain Communication Error]', err);
      const erroTratado = {
        tipo: err?.tipo || 'ERRO_BLOCKCHAIN',
        mensagem: err?.message || 'Falha na comunicação com o contrato inteligente na blockchain.',
        codigoOriginal: err?.codigoOriginal
      };
      setBlockchainError(erroTratado);
      setBlockchainProgress(null);
      exibirToastFeedback(erroTratado.mensagem, 'erro');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler de Abertura de Proposta Multisig Pré-Consenso via Magic Link
  const handleInitiateMultisig = async (
    formData: AcademicMeetingData,
    chosenHash: string,
    canonicalString: string,
    ipfsCID?: string,
    encryptedBase64?: string,
    encryptionKeyHint?: string
  ) => {
    assertSessaoAutenticada();
    setIsSubmitting(true);
    setBlockchainError(null);
    try {
      const proposta = criarPropostaMultisig({
        meetingData: formData,
        documentHash: chosenHash,
        hashAlgorithm: chosenHash.length === 66 ? 'Keccak-256' : 'SHA-256',
        canonicalString,
        ipfsCID,
        encryptedPayloadBase64: encryptedBase64,
        encryptionKeyHint,
        proposerUser: institutionalUser,
        proposerWallet: wallet.address || undefined
      });
      setActiveProposal(proposta);
      setIsMultisigModalOpen(true);
      exibirToastFeedback('Proposta de ata submetida! Quórum de Magic Links aberto.', 'sucesso');
    } catch (err: any) {
      console.error(err);
      exibirToastFeedback(`Falha ao registrar proposta: ${err.message}`, 'erro');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler de Atestação de Assinatura via Magic Link
  const handleAttestParticipant = async (participantId: string, token?: string) => {
    if (!activeProposal) return;
    try {
      const res = atestarAssinaturaParticipante(activeProposal.id, participantId, token);
      setActiveProposal({ ...res.propostaAtualizada });
      exibirToastFeedback(res.mensagem, 'sucesso');

      // DIRETRIZ 1: Garantir que o evento de aprovação unânime via links mágicos dispare imediatamente a função de envio do hash para a blockchain
      const todasAssinadas = res.propostaAtualizada.coSigners.every(c => c.signed);
      const atingiuQuorum = res.propostaAtualizada.collectedSignatures >= res.propostaAtualizada.requiredSignatures;

      if (todasAssinadas || atingiuQuorum || res.propostaAtualizada.status === 'APROVADA_AGUARDANDO_CONSOLIDACAO') {
        exibirToastFeedback('Quórum de aprovação unânime atingido! Disparando envio do hash para a blockchain...', 'aviso');
        await handleConsolidateProposalOnChain(res.propostaAtualizada);
      }
    } catch (err: any) {
      console.error('[Attestation Error]', err);
      exibirToastFeedback(err.message, 'erro');
    }
  };

  // Handler de Consolidação na Blockchain quando o Quórum é Atingido
  const handleConsolidateProposalOnChain = async (proposal: MultisigProposal) => {
    setIsConsolidatingProposal(true);
    setBlockchainError(null);
    try {
      const txHash = await handleSubmitMeeting(
        proposal.meetingData,
        proposal.documentHash,
        proposal.canonicalString,
        proposal.ipfsCID,
        proposal.encryptedPayloadBase64,
        proposal.encryptionKeyHint,
        proposal.coSigners
      );
      const atualizada = marcarAtaConsolidadaOnChain(proposal.id, txHash);
      setActiveProposal(atualizada);
      setIsMultisigModalOpen(false);
      exibirToastFeedback('Ata consolidada imutavelmente na blockchain com todas as assinaturas!', 'sucesso');
    } catch (err: any) {
      console.error('[Consolidation Error]', err);
      // O erro já foi formatado e setado no blockchainError com alerta explícito na interface
    } finally {
      setIsConsolidatingProposal(false);
    }
  };

  const handleClearHistory = () => {
    const confirmacao = window.confirm(
      'Tem certeza que deseja limpar o histórico local de recibos? Esta ação não apaga os dados da blockchain, apenas a sua visualização.'
    );
    if (confirmacao) {
      setReceipts([]);
      try {
        localStorage.removeItem(LOCAL_STORAGE_RECEIPTS_KEY);
        localStorage.setItem(LOCAL_STORAGE_RECEIPTS_KEY, '[]');
      } catch (e) {
        console.error(e);
      }
      exibirToastFeedback('Histórico local de recibos limpo com sucesso.', 'sucesso');
    }
  };

  const handleNavigateToAudit = (receipt: CryptoReceipt) => {
    setAuditPrefillReceipt(receipt);
    setActiveTab('audit');
  };

  // Handlers de Autenticação Institucional (SSO)
  const handleInstitutionalLogin = (user: InstitutionalUser) => {
    setInstitutionalUser(user);
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    // Vincula automaticamente a carteira Web3 ao endereço derivado da identidade do usuário
    setWallet(prev => ({
      ...prev,
      isConnected: true,
      address: user.walletAddress,
      isSimulated: true
    }));
  };

  const handleLogoutInstitutional = () => {
    encerrarSessaoAtiva();
    setInstitutionalUser(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    } catch (e) {
      console.error(e);
    }
    // Retorna imediatamente à página inicial para informar outro e-mail e selecionar outro usuário
    setActiveTab('form');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#2D2A26] flex flex-col font-sans selection:bg-[#4A6741]/20 selection:text-[#2D2A26]">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wallet={wallet}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onSwitchNetwork={handleSwitchNetwork}
        onToggleSimulatedWallet={handleToggleSimulatedWallet}
        receiptCount={receipts.length}
        institutionalUser={institutionalUser}
        onLogoutInstitutional={handleLogoutInstitutional}
      />

      {/* Main Content Area - padded for mobile bottom dock */}
      <main className="flex-1 pb-24 sm:pb-16">
        
        {/* Alerta Explícito de Falha na Blockchain (Diretriz 2 - Eliminação de Falhas Silenciosas) */}
        {blockchainError && (
          <div 
            id="blockchain-error-alert"
            role="alert" 
            className="max-w-6xl mx-auto my-4 mx-3 sm:mx-6 p-4 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-950 shadow-md animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm uppercase tracking-wide text-rose-950">
                    Alerta de Falha na Blockchain: {blockchainError.tipo}
                  </span>
                  {blockchainError.codigoOriginal && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300">
                      Código: {String(blockchainError.codigoOriginal)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-900 leading-relaxed">
                  {blockchainError.mensagem}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {activeProposal && activeProposal.status !== 'CONSOLIDADA_ON_CHAIN' && (
                <button
                  id="btn-retry-blockchain"
                  type="button"
                  onClick={() => handleConsolidateProposalOnChain(activeProposal)}
                  className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tentar Novamente</span>
                </button>
              )}
              <button
                id="btn-dismiss-blockchain-error"
                type="button"
                onClick={() => setBlockchainError(null)}
                className="px-3 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* Banner de Sincronização e Confirmação Assíncrona da Transação (Diretriz 3) */}
        {blockchainProgress && (
          <div 
            id="blockchain-progress-banner"
            role="status"
            className="max-w-6xl mx-auto my-4 mx-3 sm:mx-6 p-4 rounded-xl bg-emerald-50 border-2 border-[#4A6741] text-[#2D2A26] shadow-md flex items-center justify-between gap-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A6741] block">
                  Comunicação com o Smart Contract ({blockchainProgress.etapa})
                </span>
                <span className="text-xs sm:text-sm font-semibold text-[#2D2A26] font-mono">
                  {blockchainProgress.mensagem}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md hidden sm:inline-block">
              Aguardando Bloco
            </span>
          </div>
        )}

        {activeTab === 'form' && (
          !institutionalUser ? (
            <InstitutionalLoginGate onLoginSuccess={handleInstitutionalLogin} />
          ) : (
            <MeetingForm
              wallet={wallet}
              onConnectWallet={handleConnectWallet}
              onSubmitMeeting={handleSubmitMeeting}
              onInitiateMultisigProposal={handleInitiateMultisig}
              isSubmitting={isSubmitting}
              institutionalUser={institutionalUser}
              onLogoutInstitutional={handleLogoutInstitutional}
              activeProposal={activeProposal}
              onOpenMultisigModal={() => setIsMultisigModalOpen(true)}
            />
          )
        )}

        {activeTab === 'history' && (
          <ReceiptsHistory
            receipts={receipts}
            onSelectReceipt={(rec) => {
              setActiveReceipt(rec);
              setIsReceiptModalOpen(true);
            }}
            onClearHistory={handleClearHistory}
            onNavigateToNew={() => setActiveTab('form')}
          />
        )}

        {activeTab === 'audit' && (
          <AuditVerifier
            receipts={receipts}
            prefilledReceipt={auditPrefillReceipt}
          />
        )}

        {activeTab === 'contract' && (
          <SmartContractViewer
            customContractAddress={contractAddress}
            onSaveContractAddress={handleSaveContractAddress}
            selectedNetworkId={wallet.network.id}
          />
        )}
      </main>

      {/* Modal do Recibo Criptográfico Emitido */}
      <CryptoReceiptModal
        receipt={activeReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNavigateToAudit={handleNavigateToAudit}
      />

      {/* Modal do Fluxo de Múltiplas Assinaturas (Multisig via Magic Links) */}
      <MultisigModal
        isOpen={isMultisigModalOpen}
        proposal={activeProposal}
        onClose={() => setIsMultisigModalOpen(false)}
        onAttestParticipant={handleAttestParticipant}
        onConsolidateOnChain={handleConsolidateProposalOnChain}
        isConsolidating={isConsolidatingProposal}
      />

      {/* Institutional Footer */}
      <footer className="bg-[#F2EDE4] border-t border-[#DED8CD] py-6 text-center text-xs text-[#8C8579] print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#3C3833]">Sistema de Atas Acadêmicas On-Chain</span>
            <span>&middot;</span>
            <span>Regra de Ouro: Gás Mínimo (~45k) com Hashing Bytes32</span>
          </div>
          <div className="flex items-center gap-3 text-[#8C8579]">
            <span>Redes: Ethereum Sepolia / Polygon Amoy</span>
            <span>&middot;</span>
            <button
              onClick={() => setActiveTab('contract')}
              className="text-[#3C3833] hover:text-[#4A6741] underline font-mono text-[11px] transition-colors"
            >
              RegistroAtaAcademica.sol
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
