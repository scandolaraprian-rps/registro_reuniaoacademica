import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Link, 
  Copy, 
  Check, 
  Send, 
  AlertTriangle, 
  FileText, 
  Fingerprint, 
  X,
  ExternalLink,
  Lock
} from 'lucide-react';
import { MultisigProposal, CoSignerStatus } from '../types';
import { formatEthAddress, formatLongHash } from '../utils/crypto';

interface MultisigModalProps {
  isOpen: boolean;
  proposal: MultisigProposal | null;
  onClose: () => void;
  onAttestParticipant: (participantId: string, token?: string) => Promise<void>;
  onConsolidateOnChain: (proposal: MultisigProposal) => Promise<void>;
  isConsolidating: boolean;
}

export const MultisigModal: React.FC<MultisigModalProps> = ({
  isOpen,
  proposal,
  onClose,
  onAttestParticipant,
  onConsolidateOnChain,
  isConsolidating
}) => {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [attestingId, setAttestingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleAttest = async (participantId: string, token?: string) => {
    setAttestingId(participantId);
    setFeedbackMsg(null);
    try {
      await onAttestParticipant(participantId, token);
      setFeedbackMsg('Assinatura atestada com sucesso via Magic Link institucional!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg(`Erro ao atestar: ${err.message}`);
    } finally {
      setAttestingId(null);
    }
  };

  const quorumAtingido = proposal.collectedSignatures >= proposal.requiredSignatures;
  const porcentagemQuorum = Math.round((proposal.collectedSignatures / proposal.requiredSignatures) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div 
        className="bg-[#FAF9F6] border border-[#DED8CD] rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#3C3833] text-[#F2EDE4] p-4 sm:p-6 flex items-center justify-between border-b border-[#2D2A26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A6741] flex items-center justify-center text-white shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif italic text-base sm:text-xl font-bold tracking-tight">
                  Consenso Coletivo & Quórum de Assinaturas
                </h2>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  proposal.status === 'CONSOLIDADA_ON_CHAIN'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : quorumAtingido
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {proposal.status === 'CONSOLIDADA_ON_CHAIN' 
                    ? 'CONSOLIDADA ON-CHAIN' 
                    : quorumAtingido 
                    ? 'QUÓRUM ATINGIDO' 
                    : 'PENDENTE DE ASSINATURAS'}
                </span>
              </div>
              <p className="text-xs text-[#8C8579] mt-0.5">
                Defesa contra registro unilateral: a ata requer homologação mútua via Magic Links antes de gravar na blockchain.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C8579] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Informações da Proposta e Hash */}
          <div className="p-4 rounded-xl bg-[#F2EDE4] border border-[#E5DFD3] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#3C3833]">
                Título da Ata Proposta:
              </span>
              <span className="text-xs font-semibold text-[#4A6741] truncate max-w-md">
                {proposal.meetingData.title}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#DED8CD]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C8579]">
                Hash Criptográfico ({proposal.hashAlgorithm}):
              </span>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono font-bold text-[#2D2A26] bg-white px-2.5 py-1 rounded border border-[#DED8CD] select-all break-all">
                  {formatLongHash(proposal.documentHash, 14, 12)}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(proposal.documentHash, 'hash_doc')}
                  className="p-1.5 rounded bg-white hover:bg-stone-50 border border-[#DED8CD] text-stone-600 cursor-pointer"
                  title="Copiar Hash Completo"
                >
                  {copiedToken === 'hash_doc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Barra de Progresso do Quórum */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-[#3C3833] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#4A6741]" />
                  Quórum de Assinaturas: {proposal.collectedSignatures} de {proposal.requiredSignatures} coletadas
                </span>
                <span className="font-mono font-bold text-[#4A6741]">{porcentagemQuorum}%</span>
              </div>
              <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    quorumAtingido ? 'bg-[#4A6741]' : 'bg-amber-500'
                  }`}
                  style={{ width: `${porcentagemQuorum}%` }}
                />
              </div>
            </div>
          </div>

          {/* Lista de Co-Signatários e Magic Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C8579] mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Signatários Obrigatórios (Colegiado da Ata)
            </h3>

            <div className="space-y-3">
              {proposal.coSigners.map((signer, idx) => (
                <div 
                  key={signer.participantId}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    signer.signed 
                      ? 'bg-emerald-50/60 border-emerald-200' 
                      : 'bg-white border-[#DED8CD] shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        signer.signed 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {signer.signed ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-[#2D2A26]">
                            {signer.name}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            signer.role === 'Aluno' 
                              ? 'bg-sky-100 text-sky-800' 
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {signer.role}
                          </span>
                          {signer.signed ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Assinado via Magic Link
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pendente de Confirmação
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-[#8C8579] font-mono mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>E-mail: <strong className="text-stone-700">{signer.email}</strong></span>
                          <span>Carteira: <strong className="text-stone-700">{formatEthAddress(signer.walletAddress)}</strong></span>
                        </div>

                        {signer.signed && signer.signedAt && (
                          <div className="text-[10px] text-emerald-800 font-mono mt-1.5 flex items-center gap-2">
                            <span>Atestado em: {new Date(signer.signedAt).toLocaleTimeString('pt-BR')}</span>
                            {signer.signatureHash && (
                              <span>Comprovante: {formatLongHash(signer.signatureHash, 8, 6)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações para signatário pendente */}
                    {!signer.signed && (
                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(signer.magicLinkUrl || '', signer.participantId)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-[#DED8CD] text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Copiar URL do Magic Link institucional deste signatário"
                        >
                          {copiedToken === signer.participantId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-500" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={attestingId === signer.participantId}
                          onClick={() => handleAttest(signer.participantId, signer.magicToken)}
                          className="px-3 py-1.5 rounded-lg bg-[#4A6741] hover:bg-[#3d5536] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          title="Simular clique e confirmação de assinatura via Magic Link institucional"
                        >
                          {attestingId === signer.participantId ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          <span>Atestar Assinatura</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Banner de Quórum / Consolidação */}
          {quorumAtingido && proposal.status !== 'CONSOLIDADA_ON_CHAIN' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Quórum Homologado por Todas as Partes!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Tanto Aluno quanto Professor confirmaram a integridade do texto via Magic Link. A ata está autorizada para gravação imutável on-chain.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isConsolidating}
                onClick={() => onConsolidateOnChain(proposal)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isConsolidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gravando na Blockchain...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Consolidar na Blockchain (EVM)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Banner quando já consolidada */}
          {proposal.status === 'CONSOLIDADA_ON_CHAIN' && (
            <div className="p-4 rounded-xl bg-stone-100 border border-stone-300 text-stone-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Ata Consolidada Imutavelmente na Blockchain
                  </span>
                  <span className="text-[11px] font-mono text-stone-600">
                    Tx: {proposal.consolidatedTxId || '0x...'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
                Consolidado
              </span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#F2EDE4] p-4 border-t border-[#DED8CD] flex justify-between items-center text-xs">
          <span className="text-[#8C8579] font-mono text-[11px]">
            Proposta ID: {proposal.id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white text-stone-700 hover:bg-stone-50 border border-[#DED8CD] rounded-lg font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
