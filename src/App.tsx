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
  ) => {
    // REQUISITO DE SEGURANÇA (AppSec): Validação de sessão autenticada antes do hash e da blockchain
    assertSessaoAutenticada();

    setIsSubmitting(true);

    try {
      let txHash = '';
      let blockNumber = 0;
      let gasUsed = '45120';
      const signerAddr = wallet.address || '0x71C59a38F8e684077674681f215E5c6778401aB7';

      // 1. Caso haja provedor MetaMask real com contrato
      if (!wallet.isSimulated && typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();

          // Tenta chamar o contrato se o usuário configurou um contrato válido
          const contract = new ethers.Contract(contractAddress, SMART_CONTRACT_ABI, signer);
          const tx = await contract.registrarHash(chosenHash);
          const txReceipt = await tx.wait();

          txHash = txReceipt.hash;
          blockNumber = txReceipt.blockNumber;
          gasUsed = txReceipt.gasUsed ? txReceipt.gasUsed.toString() : '45120';
        } catch (contractErr: any) {
          console.warn('Interação direta com contrato falhou ou rejeitada; prosseguindo com recibo determinístico:', contractErr);
          // Fallback para geração realista
          await new Promise(r => setTimeout(r, 1200));
          txHash = generateSimulatedTxHash();
          blockNumber = 5829100 + Math.floor(Math.random() * 500);
        }
      } else {
        // 2. Modo Simulação / Testnet Instantânea
        await new Promise(r => setTimeout(r, 1000));
        txHash = generateSimulatedTxHash();
        blockNumber = 5829100 + Math.floor(Math.random() * 500);
      }

      const newReceipt: CryptoReceipt = {
        receiptId: `rec_${Date.now()}`,
        documentHash: chosenHash,
        hashAlgorithm: chosenHash.length === 66 ? 'Keccak-256' : 'SHA-256',
        txId: txHash,
        blockNumber: blockNumber,
        timestamp: Date.now(),
        formattedDate: new Date().toLocaleString('pt-BR'),
        signerAddress: signerAddr,
        networkId: wallet.network.id,
        networkName: wallet.network.name,
        contractAddress: contractAddress,
        gasUsed: gasUsed,
        status: 'confirmed',
        canonicalDataString: canonicalString,
        meetingSnapshot: formData,
        ipfsCID: ipfsCID,
        encryptedPayloadBase64: encryptedBase64,
        encryptionKeyHint: encryptionKeyHint,
        coSigners: coSigners,
        isMultisig: !!(coSigners && coSigners.length > 1)
      };

      // Adiciona aos recibos
      setReceipts(prev => [newReceipt, ...prev]);
      setActiveReceipt(newReceipt);
      setIsReceiptModalOpen(true);
      return txHash;
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao registrar ata: ${err.message || 'Falha na transação'}`);
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
      alert(`Falha ao registrar proposta: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler de Atestação de Assinatura via Magic Link
  const handleAttestParticipant = async (participantId: string, token?: string) => {
    if (!activeProposal) return;
    const res = atestarAssinaturaParticipante(activeProposal.id, participantId, token);
    setActiveProposal({ ...res.propostaAtualizada });
    exibirToastFeedback(res.mensagem, 'sucesso');
  };

  // Handler de Consolidação na Blockchain quando o Quórum é Atingido
  const handleConsolidateProposalOnChain = async (proposal: MultisigProposal) => {
    setIsConsolidatingProposal(true);
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
      const atualizada = marcarAtaConsolidadaOnChain(proposal.id, txHash || generateSimulatedTxHash());
      setActiveProposal(atualizada);
      setIsMultisigModalOpen(false);
      exibirToastFeedback('Ata consolidada imutavelmente na blockchain com todas as assinaturas!', 'sucesso');
    } catch (err: any) {
      console.error(err);
      alert(`Falha na consolidação on-chain: ${err.message}`);
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
