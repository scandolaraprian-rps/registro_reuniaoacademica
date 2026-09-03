import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink, 
  BookOpen, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  Terminal,
  Save,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { SOLIDITY_SOURCE_CODE, SMART_CONTRACT_ABI, SUPPORTED_NETWORKS } from '../contracts/solidityContract';

interface SmartContractViewerProps {
  customContractAddress: string;
  onSaveContractAddress: (address: string) => void;
  selectedNetworkId: string;
}

export const SmartContractViewer: React.FC<SmartContractViewerProps> = ({
  customContractAddress,
  onSaveContractAddress,
  selectedNetworkId
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAbi, setCopiedAbi] = useState(false);
  const [addressInput, setAddressInput] = useState(customContractAddress);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'solidity' | 'abi' | 'ethersSnippet'>('solidity');

  const currentNetwork = SUPPORTED_NETWORKS.find(n => n.id === selectedNetworkId) || SUPPORTED_NETWORKS[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(SOLIDITY_SOURCE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyAbi = () => {
    navigator.clipboard.writeText(JSON.stringify(SMART_CONTRACT_ABI, null, 2));
    setCopiedAbi(true);
    setTimeout(() => setCopiedAbi(false), 2000);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveContractAddress(addressInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const ethersSnippet = `// Exemplo de Conexão Frontend com Ethers.js v6:
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "${addressInput || '0x3a48981A4aE8e08Fa6714E69719F8a0fF08d74B2'}";
const ABI = ${JSON.stringify(SMART_CONTRACT_ABI.slice(1, 3))};

async function registrarAtaNaBlockchain(bytes32Hash) {
  // 1. Conecta ao provedor Web3 (MetaMask)
  if (!window.ethereum) throw new Error("MetaMask não detectada");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // 2. Instancia o Smart Contract
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  // 3. Executa a função registrarHash passando apenas bytes32
  console.log("Enviando hash para o Smart Contract...");
  const tx = await contract.registrarHash(bytes32Hash);
  
  // 4. Aguarda confirmação de mineração do bloco
  const receipt = await tx.wait();
  console.log("Ata confirmada no bloco #", receipt.blockNumber);
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}`;

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-6 sm:space-y-8">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#4A6741] shrink-0" />
          <h1 className="text-xl sm:text-2xl font-serif italic text-[#2D2A26] tracking-tight">
            Lógica do Smart Contract & Guia de Testnet
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#8C8579] mt-1">
          Código fonte do contrato inteligente em Solidity (v0.8.20), ABI e instruções para implantação em redes de teste Ethereum Sepolia ou Polygon Amoy.
        </p>
      </div>

      {/* Regra de Ouro Explicada */}
      <div className="bg-[#3C3833] text-[#F2EDE4] rounded-2xl p-6 border border-white/10 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm uppercase tracking-wider font-mono">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Regra de Ouro: Por que não salvar o texto completo na Blockchain?
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm pt-1">
          <div className="space-y-1.5 p-4 rounded-xl bg-white/5 border border-white/10">
            <span className="font-semibold text-rose-300 block">Salvar Texto Completo (Inviável):</span>
            <p className="text-[#8C8579] text-xs leading-relaxed">
              Gravar 2 KB de texto de ata na blockchain Ethereum custaria aproximadamente 1.200.000 de gas (centenas de reais na Mainnet e demora excessiva). Além disso, dados pessoais gravados em blockchain pública violam princípios da LGPD e GDPR (direito ao esquecimento).
            </p>
          </div>
          <div className="space-y-1.5 p-4 rounded-xl bg-[#4A6741]/20 border border-[#4A6741]/40">
            <span className="font-semibold text-emerald-300 block">Salvar apenas Hash bytes32 (Padrão Ouro):</span>
            <p className="text-[#DED8CD] text-xs leading-relaxed">
              O front-end gera o hash (SHA-256 ou Keccak-256) de 32 bytes. O contrato armazena apenas essa chave fixa. Custo: míseros ~45.000 gas. A integridade é 100% garantida matematicamente: alterar 1 caractere no texto destrói a compatibilidade com o hash da blockchain.
            </p>
          </div>
        </div>
      </div>

      {/* Configuração de Endereço do Contrato */}
      <div className="bg-white border border-[#EBE6DD] rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F2EDE4]">
          <div className="text-xs sm:text-sm font-bold text-[#2D2A26] flex items-center gap-2 font-mono uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-[#4A6741]" />
            Endereço do Smart Contract Implantado ({currentNetwork.name})
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#4A6741]/15 text-[#4A6741] border border-[#4A6741]/30 font-mono font-semibold">
            ChainID: {currentNetwork.chainId}
          </span>
        </div>

        <form onSubmit={handleSaveAddress} className="space-y-3">
          <label className="block text-xs text-[#8C8579]">
            Insira o endereço do contrato que você implantou via Remix ou utilize o endereço pré-configurado:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="input-contract-address"
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x..."
              className="flex-1 text-xs sm:text-sm font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg px-3.5 py-2.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
            <button
              id="btn-save-contract-address"
              type="submit"
              className="px-5 py-2.5 bg-[#4A6741] hover:bg-[#3d5536] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Endereço</span>
            </button>
          </div>

          {savedSuccess && (
            <div className="text-xs text-[#4A6741] flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Endereço do contrato atualizado com sucesso!
            </div>
          )}
        </form>
      </div>

      {/* Passo a Passo para Deploy no Remix IDE */}
      <div className="bg-white border border-[#EBE6DD] rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="text-xs sm:text-sm font-bold text-[#2D2A26] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-[#F2EDE4] font-mono">
          <BookOpen className="w-4 h-4 text-[#4A6741]" />
          Guia Passo a Passo: Como Implantar o Contrato no Remix IDE
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EBE6DD] text-xs space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#4A6741] text-white font-bold flex items-center justify-center text-xs">
              1
            </div>
            <div className="font-bold text-[#2D2A26]">Acesse o Remix</div>
            <p className="text-[#8C8579] leading-relaxed">
              Abra o <a href="https://remix.ethereum.org" target="_blank" rel="noreferrer" className="text-[#4A6741] underline font-medium inline-flex items-center gap-0.5">Remix IDE <ExternalLink className="w-3 h-3" /></a> e crie o arquivo <code className="font-mono bg-[#EBE6DD] px-1 rounded text-[#2D2A26]">RegistroAtaAcademica.sol</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EBE6DD] text-xs space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#4A6741] text-white font-bold flex items-center justify-center text-xs">
              2
            </div>
            <div className="font-bold text-[#2D2A26]">Cole & Compile</div>
            <p className="text-[#8C8579] leading-relaxed">
              Copie o código Solidity da aba abaixo. No painel "Solidity Compiler", selecione o compilador <code className="font-mono bg-[#EBE6DD] px-1 rounded text-[#2D2A26]">0.8.20</code> e clique em "Compile".
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EBE6DD] text-xs space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#4A6741] text-white font-bold flex items-center justify-center text-xs">
              3
            </div>
            <div className="font-bold text-[#2D2A26]">Selecione a Testnet</div>
            <p className="text-[#8C8579] leading-relaxed">
              No painel "Deploy & Run", selecione <code className="font-mono bg-[#EBE6DD] px-1 rounded text-[#2D2A26]">Injected Provider - MetaMask</code>. Conecte-se na Sepolia ou Polygon Amoy.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#EBE6DD] text-xs space-y-2">
            <div className="w-6 h-6 rounded-full bg-[#4A6741] text-white font-bold flex items-center justify-center text-xs">
              4
            </div>
            <div className="font-bold text-[#2D2A26]">Deploy & Conexão</div>
            <p className="text-[#8C8579] leading-relaxed">
              Clique em "Deploy" e assine no MetaMask. Copie o endereço gerado e cole no campo acima desta aplicação!
            </p>
          </div>

        </div>
      </div>

      {/* Code Viewer Tabs (Solidity, ABI, Ethers.js) */}
      <div className="bg-[#2D2A26] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        
        {/* Tab Headers */}
        <div className="bg-[#24211e] px-4 py-2.5 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCodeTab('solidity')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg font-medium transition-colors cursor-pointer ${
                activeCodeTab === 'solidity'
                  ? 'bg-white/10 text-emerald-400 border border-white/15'
                  : 'text-[#8C8579] hover:text-[#F2EDE4]'
              }`}
            >
              RegistroAtaAcademica.sol
            </button>
            <button
              onClick={() => setActiveCodeTab('abi')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg font-medium transition-colors cursor-pointer ${
                activeCodeTab === 'abi'
                  ? 'bg-white/10 text-emerald-400 border border-white/15'
                  : 'text-[#8C8579] hover:text-[#F2EDE4]'
              }`}
            >
              SmartContract_ABI.json
            </button>
            <button
              onClick={() => setActiveCodeTab('ethersSnippet')}
              className={`px-3 py-1.5 text-xs font-mono rounded-lg font-medium transition-colors cursor-pointer ${
                activeCodeTab === 'ethersSnippet'
                  ? 'bg-white/10 text-emerald-400 border border-white/15'
                  : 'text-[#8C8579] hover:text-[#F2EDE4]'
              }`}
            >
              Ethers.js Integration
            </button>
          </div>

          <div>
            {activeCodeTab === 'solidity' && (
              <button
                id="btn-copy-solidity"
                onClick={handleCopyCode}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-[#F2EDE4] border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copiado!' : 'Copiar Solidity'}</span>
              </button>
            )}
            {activeCodeTab === 'abi' && (
              <button
                id="btn-copy-abi"
                onClick={handleCopyAbi}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-[#F2EDE4] border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedAbi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAbi ? 'Copiado!' : 'Copiar ABI'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Code Content */}
        <div className="p-5 overflow-x-auto max-h-[500px]">
          {activeCodeTab === 'solidity' && (
            <pre className="font-mono text-xs text-[#DED8CD] leading-relaxed select-all">
              {SOLIDITY_SOURCE_CODE}
            </pre>
          )}

          {activeCodeTab === 'abi' && (
            <pre className="font-mono text-xs text-emerald-400 leading-relaxed select-all">
              {JSON.stringify(SMART_CONTRACT_ABI, null, 2)}
            </pre>
          )}

          {activeCodeTab === 'ethersSnippet' && (
            <pre className="font-mono text-xs text-[#FAF9F6] leading-relaxed select-all">
              {ethersSnippet}
            </pre>
          )}
        </div>

      </div>

    </div>
  );
};
