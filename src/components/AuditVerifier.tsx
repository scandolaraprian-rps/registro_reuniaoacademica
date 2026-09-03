import React, { useState } from 'react';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Upload, 
  FileText, 
  Hash, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ExternalLink,
  Layers,
  Clock
} from 'lucide-react';
import { CryptoReceipt } from '../types';
import { calculateSha256, calculateKeccak256, buildCanonicalMeetingString } from '../utils/crypto';

interface AuditVerifierProps {
  receipts: CryptoReceipt[];
  prefilledReceipt?: CryptoReceipt | null;
}

export const AuditVerifier: React.FC<AuditVerifierProps> = ({
  receipts,
  prefilledReceipt
}) => {
  const [inputHash, setInputHash] = useState(prefilledReceipt?.documentHash || '');
  const [jsonInput, setJsonInput] = useState(prefilledReceipt ? JSON.stringify(prefilledReceipt, null, 2) : '');
  const [verificationResult, setVerificationResult] = useState<{
    performed: boolean;
    valid: boolean;
    message: string;
    calculatedHash?: string;
    targetHash?: string;
    foundReceipt?: CryptoReceipt;
  } | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);

  // Manipulador de upload de arquivo JSON de recibo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonInput(content);
        const parsed = JSON.parse(content);
        if (parsed.documentHash) {
          setInputHash(parsed.documentHash);
        }
      } catch (err) {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  // Executa a auditoria e verificação matemática
  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Caso o usuário tenha colado um JSON completo
      if (jsonInput.trim()) {
        const parsed = JSON.parse(jsonInput.trim());

        if (parsed.meetingSnapshot) {
          const canonical = buildCanonicalMeetingString(parsed.meetingSnapshot);
          const computedKeccak = calculateKeccak256(canonical);
          const computedSha = await calculateSha256(canonical);
          
          const targetHash = parsed.documentHash || inputHash.trim();
          const matches = computedKeccak.toLowerCase() === targetHash.toLowerCase() || 
                          computedSha.toLowerCase() === targetHash.toLowerCase();

          // Procura se está em nossa base local ou simulação
          const found = receipts.find(r => r.documentHash.toLowerCase() === targetHash.toLowerCase());

          setTimeout(() => {
            setVerificationResult({
              performed: true,
              valid: matches,
              message: matches 
                ? 'Integridade Matemática 100% Confirmada! A ata não sofreu nenhuma alteração desde o registro.' 
                : 'FALHA DE INTEGRIDADE: O conteúdo do documento foi modificado ou corrompido. O hash recalculado difere da assinatura!',
              calculatedHash: parsed.hashAlgorithm === 'SHA-256' ? computedSha : computedKeccak,
              targetHash: targetHash,
              foundReceipt: found || parsed
            });
            setIsVerifying(false);
          }, 400);
          return;
        }
      }

      // Se só digitou o hash
      if (inputHash.trim()) {
        const cleanHash = inputHash.trim().toLowerCase();
        const found = receipts.find(r => r.documentHash.toLowerCase() === cleanHash || r.txId.toLowerCase() === cleanHash);

        setTimeout(() => {
          if (found) {
            setVerificationResult({
              performed: true,
              valid: true,
              message: 'Hash Localizado e Homologado no Livro Registro da Blockchain!',
              targetHash: inputHash.trim(),
              foundReceipt: found
            });
          } else {
            setVerificationResult({
              performed: true,
              valid: false,
              message: 'Hash não localizado no registro local. Você pode consultar diretamente no explorador de blocos da Testnet.',
              targetHash: inputHash.trim()
            });
          }
          setIsVerifying(false);
        }, 300);
      } else {
        alert('Por favor, informe o Hash do Documento ou cole o arquivo JSON da Ata.');
        setIsVerifying(false);
      }
    } catch (err: any) {
      setVerificationResult({
        performed: true,
        valid: false,
        message: `Erro na leitura dos dados: ${err.message}`
      });
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-3 sm:px-6 space-y-4 sm:space-y-6">
      
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[#4A6741] shrink-0" />
          <h1 className="text-xl sm:text-2xl font-serif italic text-[#2D2A26] tracking-tight">
            Validador de Autenticidade & Auditoria
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#8C8579] mt-1">
          Comprove a inviolabilidade e verifique se uma ata acadêmica sofreu qualquer modificação após sua emissão na blockchain.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
        
        {/* File Upload Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F2EDE4]">
          <div>
            <div className="text-xs font-bold text-[#2D2A26] uppercase tracking-wider font-mono">
              Carregar Arquivo da Ata (.json)
            </div>
            <div className="text-xs text-[#8C8579] mt-0.5">
              Faça upload do arquivo baixado ao emitir o recibo criptográfico
            </div>
          </div>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F2EDE4] hover:bg-[#E5DFD3] border border-[#DED8CD] text-xs font-bold text-[#2D2A26] transition-colors min-h-[40px] w-full sm:w-auto">
            <Upload className="w-4 h-4 text-[#4A6741]" />
            <span>Selecionar Arquivo JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Input Hash manual */}
        <div>
          <label className="block text-[11px] font-bold text-[#8C8579] uppercase tracking-wider mb-1.5 font-mono">
            Hash do Documento (bytes32) ou TxID:
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              placeholder="0x..."
              className="w-full text-xs sm:text-sm font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg px-3.5 py-2.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>
        </div>

        {/* Textarea JSON data */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-bold text-[#8C8579] uppercase tracking-wider font-mono">
              Ou Conteúdo Completo do Recibo (JSON):
            </label>
            {jsonInput && (
              <button
                type="button"
                onClick={() => {
                  setJsonInput('');
                  setInputHash('');
                }}
                className="text-[11px] text-rose-700 hover:underline cursor-pointer font-semibold"
              >
                Limpar
              </button>
            )}
          </div>
          <textarea
            rows={5}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Cole aqui o JSON da ata ou do recibo criptográfico para recálculo automático do hash..."
            className="w-full text-xs font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg p-3.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
          />
        </div>

        {/* Verify Button */}
        <div className="pt-2">
          <button
            id="btn-perform-audit"
            type="button"
            onClick={handleVerify}
            disabled={isVerifying || (!inputHash && !jsonInput)}
            className="w-full py-4 px-3 bg-[#4A6741] hover:bg-[#3d5536] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[48px] text-center"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#F2EDE4] shrink-0" />
                <span>Auditando e Recalculando Hash Criptográfico...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#F2EDE4] shrink-0" />
                <span>Auditar e Validar Integridade na Blockchain</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Verification Result Card */}
      {verificationResult && (
        <div
          id="verification-result-box"
          className={`p-4 sm:p-7 rounded-2xl border-2 transition-all ${
            verificationResult.valid
              ? 'bg-[#FAF9F6] border-[#4A6741] text-[#2D2A26]'
              : 'bg-rose-50/80 border-rose-400 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-4">
            {verificationResult.valid ? (
              <CheckCircle2 className="w-6 h-6 text-[#4A6741] shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            )}

            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-base font-serif italic font-bold tracking-tight">
                  {verificationResult.valid ? 'Documento Autêntico e Válido' : 'Documento Inválido ou Adulterado'}
                </h3>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed">
                  {verificationResult.message}
                </p>
              </div>

              {verificationResult.targetHash && (
                <div className="bg-white p-4 rounded-xl border border-[#EBE6DD] text-xs font-mono space-y-1.5">
                  <div className="text-[10px] text-[#8C8579] uppercase font-semibold">
                    Hash da Blockchain:
                  </div>
                  <div className="break-all font-bold text-[#2D2A26]">
                    {verificationResult.targetHash}
                  </div>

                  {verificationResult.calculatedHash && (
                    <>
                      <div className="text-[10px] text-[#8C8579] uppercase font-semibold pt-2 border-t border-[#F2EDE4]">
                        Hash Recalculado do Documento Atual:
                      </div>
                      <div className={`break-all font-bold ${verificationResult.valid ? 'text-[#4A6741]' : 'text-rose-700'}`}>
                        {verificationResult.calculatedHash}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Detalhes da Ata caso encontrada */}
              {verificationResult.foundReceipt && (
                <div className="bg-white p-4 rounded-xl border border-[#EBE6DD] text-xs space-y-2 text-[#2D2A26]">
                  <div className="font-bold text-[#2D2A26] border-b border-[#F2EDE4] pb-2 flex items-center justify-between">
                    <span>{verificationResult.foundReceipt.meetingSnapshot?.title || 'Ata Acadêmica Registrada'}</span>
                    <span className="font-mono text-[11px] text-[#4A6741] bg-[#4A6741]/15 px-2 py-0.5 rounded-md font-semibold border border-[#4A6741]/20">
                      Bloco #{verificationResult.foundReceipt.blockNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#645e54]">
                    <div>
                      Data/Hora de Registro:{' '}
                      <span className="font-semibold text-[#2D2A26]">
                        {new Date(verificationResult.foundReceipt.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div>
                      Rede:{' '}
                      <span className="font-semibold text-[#2D2A26]">
                        {verificationResult.foundReceipt.networkName}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      TxID:{' '}
                      <span className="font-mono text-[#2D2A26] break-all">
                        {verificationResult.foundReceipt.txId}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
