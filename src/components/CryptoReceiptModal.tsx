import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Printer, 
  Download, 
  FileDown,
  ShieldCheck, 
  Hash, 
  Layers, 
  Clock, 
  Wallet, 
  FileText,
  Search,
  Share2,
  RefreshCw,
  CloudUpload,
  Database,
  Key
} from 'lucide-react';
import { CryptoReceipt } from '../types';
import { generateQrCodeDataUrl } from '../utils/qrCode';
import { formatEthAddress } from '../utils/crypto';
import { generateReceiptPdf } from '../utils/pdfGenerator';

interface CryptoReceiptModalProps {
  receipt: CryptoReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAudit?: (receipt: CryptoReceipt) => void;
}

export const CryptoReceiptModal: React.FC<CryptoReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onNavigateToAudit
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Escuta tecla ESC para sair da página do certificado de prova de existência
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (receipt) {
      // Gera QR code apontando para validação da transação
      const validationLink = `${receipt.contractAddress ? 'https://sepolia.etherscan.io/tx/' : 'https://sepolia.etherscan.io/tx/'}${receipt.txId}`;
      generateQrCodeDataUrl(validationLink).then(url => {
        setQrCodeUrl(url);
      });
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf || !receipt) return;
    try {
      setIsGeneratingPdf(true);
      await generateReceiptPdf(receipt, qrCodeUrl);
    } catch (err) {
      console.error('Falha ao gerar o PDF do recibo criptográfico:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `recibo_ata_${receipt.receiptId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Formatação de data amigável
  const dateObj = new Date(receipt.timestamp);
  const formattedDateTime = dateObj.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  const explorerBaseUrl = receipt.networkId === 'amoy' 
    ? 'https://amoy.polygonscan.com' 
    : 'https://sepolia.etherscan.io';

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2A26]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 print:p-0 print:static print:bg-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      
      <div 
        id="crypto-receipt-card"
        className="bg-[#FAF9F6] text-[#2D2A26] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#EBE6DD] overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:w-full print:max-w-none"
      >
        
        {/* Top Header - Not visible in print */}
        <div className="bg-[#3C3833] text-[#F2EDE4] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-xs sm:text-base tracking-tight uppercase font-mono truncate">
              Recibo Criptográfico de Registro
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-block text-[11px] font-mono text-[#8C8579] bg-white/5 px-2 py-0.5 rounded border border-white/10">
              ESC para sair
            </span>
            <button
              id="btn-close-receipt-modal"
              onClick={onClose}
              title="Fechar Certificado (ESC)"
              aria-label="Fechar Certificado"
              className="p-2 rounded-lg text-[#8C8579] hover:text-white hover:bg-white/10 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Container - Scrollable on mobile */}
        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
          
          {/* Certificate Header Stamp */}
          <div className="text-center pb-5 border-b border-[#EBE6DD]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4A6741]/15 text-[#4A6741] text-xs font-bold border border-[#4A6741]/30 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A6741]" />
              REGISTRADO NA BLOCKCHAIN COM SUCESSO
            </div>
            <h2 className="text-xl sm:text-2xl font-serif italic font-bold text-[#2D2A26] tracking-tight">
              Certificado de Prova de Existência
            </h2>
            <p className="text-xs text-[#8C8579] uppercase tracking-widest mt-1 font-mono">
              Autenticidade e Imutabilidade Criptográfica Garantida
            </p>
          </div>

          {/* Dados Resumidos da Reunião Acadêmica */}
          <div className="bg-white rounded-xl p-4 border border-[#EBE6DD] text-xs sm:text-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#F2EDE4] pb-2">
              <span className="text-[#8C8579] font-medium">Título da Ata:</span>
              <span className="font-bold text-[#2D2A26] text-right">{receipt.meetingSnapshot.title}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <span className="text-[#8C8579]">Tipo de Reunião:</span>{' '}
                <span className="font-semibold text-[#2D2A26]">{receipt.meetingSnapshot.meetingType}</span>
              </div>
              <div>
                <span className="text-[#8C8579]">Unidade:</span>{' '}
                <span className="font-semibold text-[#2D2A26]">{receipt.meetingSnapshot.academicUnit}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#8C8579]">Participantes Homologados:</span>{' '}
                <span className="font-medium text-[#2D2A26]">
                  {receipt.meetingSnapshot.participants.filter(p => p.checked).map(p => `${p.role}: ${p.name}`).join(' | ')}
                </span>
              </div>
            </div>
          </div>

          {/* OS 4 DADOS OBRIGATÓRIOS DO RECIBO CRIPTOGRÁFICO */}
          <div className="space-y-3.5">
            
            {/* 1. Hash do Documento (Impressão Digital) */}
            <div className="p-4 rounded-xl border border-white/10 bg-[#3C3833] text-[#F2EDE4] space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#8C8579]">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                  <Hash className="w-3.5 h-3.5" />
                  Hash do Documento (bytes32 - {receipt.hashAlgorithm})
                </span>
                <button
                  onClick={() => copyToClipboard(receipt.documentHash, 'hash')}
                  className="flex items-center gap-1 text-[11px] text-[#F2EDE4] hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded border border-white/10 transition-colors cursor-pointer"
                >
                  {copiedField === 'hash' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'hash' ? 'Copiado!' : 'Copiar Hash'}</span>
                </button>
              </div>
              <div className="font-mono text-xs sm:text-sm text-emerald-300 break-all select-all font-semibold pt-1">
                {receipt.documentHash}
              </div>
              <div className="text-[10px] text-[#8C8579] pt-0.5">
                Calculado a partir dos dados consolidados da ata. Qualquer alteração no texto invalidará este hash.
              </div>
            </div>

            {/* 2. TxID (Hash da Transação da Blockchain) */}
            <div className="p-4 rounded-xl border border-[#EBE6DD] bg-white space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#8C8579]">
                <span className="font-bold text-[#2D2A26] uppercase tracking-wider flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#4A6741]" />
                  TxID (Hash da Transação na Blockchain)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(receipt.txId, 'txId')}
                    className="flex items-center gap-1 text-[11px] text-[#3C3833] hover:text-[#2D2A26] bg-[#F2EDE4] hover:bg-[#E5DFD3] px-2 py-0.5 rounded border border-[#DED8CD] cursor-pointer"
                  >
                    {copiedField === 'txId' ? <Check className="w-3 h-3 text-[#4A6741]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'txId' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <a
                    href={`${explorerBaseUrl}/tx/${receipt.txId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#4A6741] hover:underline font-semibold"
                  >
                    <span>Explorador</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="font-mono text-xs sm:text-sm text-[#2D2A26] break-all select-all font-semibold">
                {receipt.txId}
              </div>
            </div>

            {/* IPFS Content Identifier (CID) se gravado com suporte a disponibilidade de dados */}
            {receipt.ipfsCID && (
              <div className="p-4 rounded-xl border-2 border-[#4A6741]/30 bg-[#FAF9F6] space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#8C8579]">
                  <span className="font-bold text-[#2D2A26] uppercase tracking-wider flex items-center gap-1.5">
                    <CloudUpload className="w-3.5 h-3.5 text-[#4A6741]" />
                    IPFS Content Identifier (CID - Disponibilidade de Dados)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(receipt.ipfsCID!, 'ipfsCID')}
                      className="flex items-center gap-1 text-[11px] text-[#3C3833] hover:text-[#2D2A26] bg-white hover:bg-[#E5DFD3] px-2 py-0.5 rounded border border-[#DED8CD] cursor-pointer"
                    >
                      {copiedField === 'ipfsCID' ? <Check className="w-3 h-3 text-[#4A6741]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'ipfsCID' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-100 text-[#4A6741] font-bold">
                      IPFS Pinning Mock
                    </span>
                  </div>
                </div>
                <div className="font-mono text-xs sm:text-sm text-[#4A6741] break-all select-all font-bold">
                  {receipt.ipfsCID}
                </div>
                <div className="text-[10px] text-[#8C8579] flex items-center justify-between pt-1">
                  <span>Documento criptografado armazenado na rede descentralizada IPFS antes da confirmação do bloco.</span>
                  {receipt.encryptionKeyHint && (
                    <span className="font-mono text-[9px] text-[#3C3833] bg-white px-1.5 py-0.5 rounded border border-[#EBE6DD]">
                      Chave: {receipt.encryptionKeyHint}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Grid com Bloco, Timestamp, Assinante e QR Code */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              
              <div className="sm:col-span-8 space-y-3">
                {/* 3. Número do Bloco */}
                <div className="p-3.5 rounded-xl border border-[#EBE6DD] bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#8C8579]">
                    <Layers className="w-4 h-4 text-[#4A6741]" />
                    <span className="font-bold text-[#2D2A26]">Número do Bloco:</span>
                  </div>
                  <span className="font-mono font-bold text-[#2D2A26] text-sm">
                    #{receipt.blockNumber}
                  </span>
                </div>

                {/* 4. Timestamp */}
                <div className="p-3.5 rounded-xl border border-[#EBE6DD] bg-white flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#8C8579]">
                    <Clock className="w-4 h-4 text-[#4A6741]" />
                    <span className="font-bold text-[#2D2A26]">Timestamp:</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-[#2D2A26]">{formattedDateTime}</div>
                    <div className="text-[10px] text-[#8C8579] font-mono">Epoch: {receipt.timestamp}</div>
                  </div>
                </div>

                {/* Endereço do Assinante & Rede */}
                <div className="p-3.5 rounded-xl border border-[#EBE6DD] bg-white text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C8579] font-medium">Carteira Assinante:</span>
                    <span className="font-mono font-bold text-[#2D2A26]">
                      {formatEthAddress(receipt.signerAddress)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C8579] font-medium">Rede Blockchain:</span>
                    <span className="font-semibold text-[#2D2A26]">{receipt.networkName}</span>
                  </div>
                </div>
              </div>

              {/* QR Code Simbólico para Validação */}
              <div className="sm:col-span-4 p-3 rounded-xl border border-[#EBE6DD] bg-white flex flex-col items-center justify-center text-center">
                <div className="text-[10px] font-bold text-[#8C8579] uppercase tracking-wider mb-1">
                  QR Code de Validação
                </div>
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code de Validação Criptográfica" 
                    className="w-28 h-28 object-contain rounded"
                  />
                ) : (
                  <div className="w-28 h-28 bg-[#FAF9F6] rounded flex items-center justify-center text-xs text-[#8C8579]">
                    Gerando QR...
                  </div>
                )}
                <div className="text-[9px] text-[#8C8579] mt-1 font-mono uppercase">
                  Testnet Sepolia
                </div>
              </div>

            </div>

            {/* Múltiplas Assinaturas e Quórum Institucional (se houver co-signatários) */}
            {receipt.coSigners && receipt.coSigners.length > 0 && (
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Quórum Homologado via Magic Links ({receipt.coSigners.length} Co-Signatários)
                  </span>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                    Consenso 100%
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {receipt.coSigners.map((cs) => (
                    <div key={cs.participantId} className="p-2 rounded-lg bg-white border border-emerald-200/70 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#2D2A26] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{cs.name}</span>
                        </div>
                        <div className="text-[10px] text-[#8C8579] font-mono">{cs.email}</div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">
                        {cs.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Rodapé Institucional do Certificado */}
          <div className="text-center pt-3 border-t border-[#EBE6DD] text-[11px] text-[#8C8579] leading-relaxed">
            Este recibo comprova a existência e integridade do documento na blockchain Ethereum / Polygon.
            <br />
            Para verificar este registro, utilize a chave hash bytes32 pública através da função <span className="font-mono font-semibold text-[#2D2A26]">verificarAta(bytes32)</span>.
          </div>

        </div>

        {/* Action Buttons Bar - Hidden in print */}
        <div className="bg-[#F2EDE4] px-4 sm:px-6 py-3 sm:py-4 border-t border-[#EBE6DD] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 print:hidden">
          
          <div className="flex items-center gap-2">
            <button
              id="btn-close-receipt-footer"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#8C8579] hover:text-[#2D2A26] bg-[#FAF9F6] hover:bg-white border border-[#DED8CD] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              title="Fechar certificado (ESC)"
            >
              <X className="w-4 h-4" />
              <span>Fechar (ESC)</span>
            </button>

            {onNavigateToAudit && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToAudit(receipt);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#3C3833] hover:text-[#2D2A26] hover:bg-[#E5DFD3] border border-[#DED8CD] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              >
                <Search className="w-4 h-4 text-[#4A6741]" />
                <span>Auditar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <button
              id="btn-download-json"
              onClick={handleDownloadJson}
              className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl text-xs font-semibold text-[#3C3833] hover:text-[#2D2A26] bg-[#FAF9F6] hover:bg-white border border-[#DED8CD] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              title="Baixar comprovante em formato JSON"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Baixar</span> JSON
            </button>

            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              className="hidden xs:flex px-3 py-2.5 rounded-xl text-xs font-semibold text-[#3C3833] hover:text-[#2D2A26] bg-[#FAF9F6] hover:bg-white border border-[#DED8CD] items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
              title="Imprimir via navegador"
            >
              <Printer className="w-4 h-4 text-[#8C8579]" />
              <span>Imprimir</span>
            </button>

            <button
              id="btn-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex-2 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#4A6741] hover:bg-[#3d5536] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50 min-h-[40px]"
              title="Baixar Certificado de Prova de Existência em formato PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Gerando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
