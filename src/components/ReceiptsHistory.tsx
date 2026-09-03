import React, { useState } from 'react';
import { 
  History, 
  Search, 
  FileText, 
  ExternalLink, 
  Eye, 
  Download, 
  FileDown,
  Calendar, 
  Hash, 
  Layers, 
  Clock, 
  CheckCircle2,
  Trash2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { CryptoReceipt } from '../types';
import { formatEthAddress, formatLongHash } from '../utils/crypto';
import { generateReceiptPdf } from '../utils/pdfGenerator';
import { generateQrCodeDataUrl } from '../utils/qrCode';

interface ReceiptsHistoryProps {
  receipts: CryptoReceipt[];
  onSelectReceipt: (receipt: CryptoReceipt) => void;
  onClearHistory: () => void;
  onNavigateToNew: () => void;
}

export const ReceiptsHistory: React.FC<ReceiptsHistoryProps> = ({
  receipts,
  onSelectReceipt,
  onClearHistory,
  onNavigateToNew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdfQuick = async (receipt: CryptoReceipt, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(receipt.receiptId);
      const validationLink = `https://sepolia.etherscan.io/tx/${receipt.txId}`;
      const qrDataUrl = await generateQrCodeDataUrl(validationLink);
      await generateReceiptPdf(receipt, qrDataUrl);
    } catch (err) {
      console.error('Falha ao baixar PDF no histórico:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const term = searchTerm.toLowerCase();
    const titleMatch = r.meetingSnapshot.title.toLowerCase().includes(term);
    const hashMatch = r.documentHash.toLowerCase().includes(term);
    const txMatch = r.txId.toLowerCase().includes(term);
    const participantMatch = r.meetingSnapshot.participants.some(p => 
      p.name.toLowerCase().includes(term)
    );
    return titleMatch || hashMatch || txMatch || participantMatch;
  });

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-[#4A6741] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-serif italic text-[#2D2A26] tracking-tight">
              Histórico de Atas & Recibos Registrados
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8C8579] mt-1">
            Consulte todas as atas acadêmicas registradas com carimbo de tempo e hash na blockchain.
          </p>
        </div>

        {receipts.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onClearHistory}
              className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex items-center gap-1 transition-colors cursor-pointer min-h-[36px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Registros
            </button>
          </div>
        )}
      </div>

      {/* Search Input */}
      {receipts.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C8579] absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por título, aluno, professor, hash ou TxID..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm bg-[#FDFCFB] border border-[#DED8CD] rounded-xl text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
          />
        </div>
      )}

      {/* List or Empty State */}
      {receipts.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-[#DED8CD] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FAF9F6] flex items-center justify-center mx-auto text-[#8C8579] border border-[#F2EDE4]">
            <FileText className="w-6 h-6 text-[#4A6741]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif italic font-bold text-[#2D2A26]">
              Nenhuma ata registrada ainda
            </h3>
            <p className="text-xs text-[#8C8579] max-w-md mx-auto leading-relaxed">
              Preencha o formulário de reunião acadêmica e assine para gerar o primeiro recibo criptográfico com gravação de hash na blockchain.
            </p>
          </div>
          <button
            onClick={onNavigateToNew}
            className="px-5 py-2.5 bg-[#4A6741] hover:bg-[#3d5536] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer min-h-[40px]"
          >
            Registrar Primeira Ata
          </button>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="bg-white border border-[#EBE6DD] rounded-xl p-8 text-center text-xs text-[#8C8579]">
          Nenhum registro encontrado para "{searchTerm}".
        </div>
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.receiptId}
              className="bg-white border border-[#EBE6DD] hover:border-[#DED8CD] rounded-2xl p-4 sm:p-6 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#F2EDE4] text-[#3C3833] border border-[#DED8CD]">
                    {receipt.meetingSnapshot.meetingType}
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-[#4A6741]/15 text-[#4A6741] border border-[#4A6741]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Bloco #{receipt.blockNumber}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[#8C8579] font-mono">
                    {new Date(receipt.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#2D2A26]">
                  {receipt.meetingSnapshot.title}
                </h3>

                <div className="text-xs text-[#645e54]">
                  Participantes:{' '}
                  <span className="font-medium text-[#2D2A26]">
                    {receipt.meetingSnapshot.participants.filter(p => p.checked).map(p => `${p.role}: ${p.name}`).join(' | ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs font-mono pt-1 text-[#8C8579]">
                  <div>
                    Hash: <span className="font-semibold text-[#3C3833]">{formatLongHash(receipt.documentHash, 8, 6)}</span>
                  </div>
                  <div>
                    TxID: <span className="text-[#3C3833]">{formatLongHash(receipt.txId, 8, 6)}</span>
                  </div>
                  <div>
                    Rede: <span className="text-[#3C3833]">{receipt.networkName}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Full width on mobile */}
              <div className="flex items-center gap-2 w-full md:w-auto mt-1 md:mt-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-[#F2EDE4]">
                <button
                  id={`btn-download-pdf-${receipt.receiptId}`}
                  onClick={(e) => handleDownloadPdfQuick(receipt, e)}
                  disabled={downloadingId === receipt.receiptId}
                  className="flex-1 md:flex-initial px-3.5 py-2.5 bg-[#FAF9F6] hover:bg-white text-[#3C3833] hover:text-[#2D2A26] border border-[#DED8CD] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 min-h-[40px]"
                  title="Baixar Certificado em PDF"
                >
                  {downloadingId === receipt.receiptId ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5 text-[#4A6741]" />
                  )}
                  <span>PDF</span>
                </button>

                <button
                  id={`btn-view-receipt-${receipt.receiptId}`}
                  onClick={() => onSelectReceipt(receipt)}
                  className="flex-1 md:flex-initial px-4 py-2.5 bg-[#4A6741] hover:bg-[#3d5536] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer min-h-[40px]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Recibo</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
