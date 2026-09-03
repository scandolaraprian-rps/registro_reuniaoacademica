import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  FileText, 
  History, 
  Code2, 
  Search, 
  ExternalLink, 
  ChevronDown,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { WalletState, BlockchainNetwork } from '../types';
import { SUPPORTED_NETWORKS } from '../contracts/solidityContract';
import { formatEthAddress } from '../utils/crypto';
import { LogoPlaceholder } from './LogoPlaceholder';

interface NavbarProps {
  activeTab: 'form' | 'history' | 'audit' | 'contract';
  setActiveTab: (tab: 'form' | 'history' | 'audit' | 'contract') => void;
  wallet: WalletState;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onSwitchNetwork: (network: BlockchainNetwork) => void;
  onToggleSimulatedWallet: () => void;
  receiptCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  wallet,
  onConnectWallet,
  onDisconnectWallet,
  onSwitchNetwork,
  onToggleSimulatedWallet,
  receiptCount
}) => {
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  return (
    <>
      <header className="h-16 sm:h-20 bg-[#F2EDE4] border-b border-[#DED8CD] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-2">
            
            {/* Logo / Brand com Placeholder Configurável */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <LogoPlaceholder size="md" />
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs sm:text-base lg:text-lg font-bold sm:font-semibold tracking-tight text-[#3C3833]">
                    <span className="inline sm:hidden">Ata Acadêmica</span>
                    <span className="hidden sm:inline">REGISTRO DE ATA DE REUNIÃO ACADÊMICA</span>
                  </span>
                  <span className="hidden lg:inline-flex text-[11px] px-2.5 py-0.5 rounded-full bg-[#4A6741]/10 text-[#4A6741] font-semibold border border-[#4A6741]/25">
                    Blockchain
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#8C8579] hidden sm:block">
                  Imutabilidade probatória &middot; Prova de Existência Criptográfica EVM
                </p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                id="nav-tab-form"
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'form'
                    ? 'bg-white text-[#3C3833] border border-[#DED8CD] shadow-2xs'
                    : 'text-[#8C8579] hover:text-[#3C3833] hover:bg-white/50'
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${activeTab === 'form' ? 'text-[#4A6741]' : 'text-[#8C8579]'}`} />
                Nova Ata
              </button>

              <button
                id="nav-tab-history"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white text-[#3C3833] border border-[#DED8CD] shadow-2xs'
                    : 'text-[#8C8579] hover:text-[#3C3833] hover:bg-white/50'
                }`}
              >
                <History className={`w-3.5 h-3.5 ${activeTab === 'history' ? 'text-[#4A6741]' : 'text-[#8C8579]'}`} />
                Recibos
                {receiptCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#4A6741] text-white font-mono">
                    {receiptCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-audit"
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-white text-[#3C3833] border border-[#DED8CD] shadow-2xs'
                    : 'text-[#8C8579] hover:text-[#3C3833] hover:bg-white/50'
                }`}
              >
                <Search className={`w-3.5 h-3.5 ${activeTab === 'audit' ? 'text-[#4A6741]' : 'text-[#8C8579]'}`} />
                Validar Ata
              </button>

              <button
                id="nav-tab-contract"
                onClick={() => setActiveTab('contract')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'contract'
                    ? 'bg-white text-[#3C3833] border border-[#DED8CD] shadow-2xs'
                    : 'text-[#8C8579] hover:text-[#3C3833] hover:bg-white/50'
                }`}
              >
                <Code2 className={`w-3.5 h-3.5 ${activeTab === 'contract' ? 'text-[#4A6741]' : 'text-[#8C8579]'}`} />
                Smart Contract
              </button>
            </nav>

            {/* Network Selector & Wallet Button */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              
              {/* Network Badge / Selector */}
              <div className="relative">
                <button
                  id="btn-network-select"
                  onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium border border-[#DED8CD] hover:bg-[#FDFCFB] text-[#3C3833] bg-white transition-colors cursor-pointer"
                  title="Selecionar Testnet"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="max-w-[70px] sm:max-w-[120px] truncate">{wallet.network.name.replace(' Testnet', '')}</span>
                  <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#8C8579] shrink-0" />
                </button>

                {networkDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl bg-white border border-[#DED8CD] shadow-xl py-1 z-40">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#8C8579] uppercase tracking-widest">
                      Redes Suportadas (Testnets)
                    </div>
                    {SUPPORTED_NETWORKS.map((net) => (
                      <button
                        key={net.id}
                        onClick={() => {
                          onSwitchNetwork(net);
                          setNetworkDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-[#2D2A26] hover:bg-[#FAF9F6] flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-medium">{net.name}</span>
                        {wallet.network.id === net.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4A6741]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet Connect Button */}
              {wallet.isConnected ? (
                <div className="relative">
                  <button
                    id="btn-wallet-connected"
                    onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#DED8CD] bg-white hover:bg-[#FDFCFB] text-[#3C3833] text-[11px] sm:text-xs font-mono transition-colors shadow-2xs cursor-pointer"
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
                    <span className="truncate max-w-[80px] sm:max-w-none">{formatEthAddress(wallet.address || '')}</span>
                    {wallet.isSimulated && (
                      <span className="hidden sm:inline-block bg-[#F2EDE4] text-[#8C8579] text-[10px] px-1.5 py-0.2 rounded font-sans font-semibold">
                        Simulado
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-[#8C8579] shrink-0" />
                  </button>

                  {walletDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl bg-white border border-[#DED8CD] shadow-xl py-2 z-40 text-xs">
                      <div className="px-3 py-1 text-[#8C8579]">
                        Conectado como:
                        <div className="font-mono font-medium text-[#2D2A26] break-all mt-0.5 select-all text-[11px]">
                          {wallet.address}
                        </div>
                      </div>
                      <div className="px-3 py-1 text-[#8C8579] border-t border-[#F2EDE4] mt-1 pt-1 flex justify-between items-center">
                        <span>Saldo Testnet:</span>
                        <span className="font-mono font-semibold text-[#3C3833]">
                          {wallet.balance} {wallet.network.currencySymbol}
                        </span>
                      </div>
                      <div className="px-3 py-2 border-t border-[#F2EDE4] mt-1 flex flex-col gap-1.5">
                        <button
                          onClick={() => {
                            onToggleSimulatedWallet();
                            setWalletDropdownOpen(false);
                          }}
                          className="flex items-center gap-1.5 text-left text-[#3C3833] hover:text-[#4A6741] py-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Alternar {wallet.isSimulated ? 'para MetaMask' : 'para Carteira Virtual'}
                        </button>
                        <button
                          onClick={() => {
                            onDisconnectWallet();
                            setWalletDropdownOpen(false);
                          }}
                          className="text-left text-rose-600 hover:text-rose-800 font-medium py-1 cursor-pointer"
                        >
                          Desconectar Carteira
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  id="btn-connect-wallet"
                  onClick={onConnectWallet}
                  className="px-3 sm:px-6 py-1.5 sm:py-2 bg-white border border-[#DED8CD] rounded-full text-[11px] sm:text-sm font-medium hover:bg-[#FDFCFB] text-[#3C3833] transition-colors flex items-center gap-1.5 sm:gap-2 shadow-2xs cursor-pointer"
                >
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="tracking-tight">CONECTAR</span>
                </button>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock (High Ergonomics, Native App Feel) */}
      <nav 
        aria-label="Navegação Mobile" 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-md border-t border-[#DED8CD] px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        <button
          id="mobile-nav-form"
          onClick={() => setActiveTab('form')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[64px] min-h-[48px] transition-all cursor-pointer ${
            activeTab === 'form'
              ? 'text-[#4A6741] font-bold bg-[#4A6741]/10'
              : 'text-[#8C8579] font-medium hover:text-[#2D2A26]'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Nova Ata</span>
        </button>

        <button
          id="mobile-nav-history"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[64px] min-h-[48px] relative transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'text-[#4A6741] font-bold bg-[#4A6741]/10'
              : 'text-[#8C8579] font-medium hover:text-[#2D2A26]'
          }`}
        >
          <div className="relative">
            <History className="w-5 h-5 mb-0.5" />
            {receiptCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#4A6741] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-mono font-bold">
                {receiptCount}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight">Recibos</span>
        </button>

        <button
          id="mobile-nav-audit"
          onClick={() => setActiveTab('audit')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[64px] min-h-[48px] transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'text-[#4A6741] font-bold bg-[#4A6741]/10'
              : 'text-[#8C8579] font-medium hover:text-[#2D2A26]'
          }`}
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Validar</span>
        </button>

        <button
          id="mobile-nav-contract"
          onClick={() => setActiveTab('contract')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[64px] min-h-[48px] transition-all cursor-pointer ${
            activeTab === 'contract'
              ? 'text-[#4A6741] font-bold bg-[#4A6741]/10'
              : 'text-[#8C8579] font-medium hover:text-[#2D2A26]'
          }`}
        >
          <Code2 className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Contrato</span>
        </button>
      </nav>
    </>
  );
};
