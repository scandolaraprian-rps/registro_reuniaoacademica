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
  Clock,
  Sparkles,
  AlignLeft,
  FileCode2,
  Check
} from 'lucide-react';
import { CryptoReceipt } from '../types';
import { 
  calculateSha256, 
  calculateKeccak256, 
  sanitizeForHashing, 
  concatenateMeetingData,
  buildCanonicalMeetingString 
} from '../utils/crypto';

interface AuditVerifierProps {
  receipts: CryptoReceipt[];
  prefilledReceipt?: CryptoReceipt | null;
}

type AuditMode = 'text' | 'json' | 'hash';

export const AuditVerifier: React.FC<AuditVerifierProps> = ({
  receipts,
  prefilledReceipt
}) => {
  const [auditMode, setAuditMode] = useState<AuditMode>(prefilledReceipt ? 'json' : 'text');
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [inputHash, setInputHash] = useState(prefilledReceipt?.documentHash || '');
  const [jsonInput, setJsonInput] = useState(prefilledReceipt ? JSON.stringify(prefilledReceipt, null, 2) : '');
  const [hashAlgo, setHashAlgo] = useState<'Keccak-256' | 'SHA-256'>('Keccak-256');

  const [verificationResult, setVerificationResult] = useState<{
    performed: boolean;
    valid: boolean;
    message: string;
    sanitizedTextUsed?: string;
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
        setAuditMode('json');
      } catch (err) {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  // Carrega exemplo para teste de sanitização no auditor
  const handleLoadSanitizationSample = () => {
    setAuditMode('text');
    // Exemplo com espaços múltiplos propositais, tabulações e maiúsculas misturadas
    const dirtyText = `  TÍTULO:   Orientação Mensal - PROJETO FINAL de Engenharia de Software  \n\n\n\t   TIPO: Orientação | UNIDADE: Instituto de Informática - Campus Central   \n\t  | DATA: 2026-09-01T14:00   \n  | PARTICIPANTES: Aluno: Ana Beatriz Souza; Professor: Prof. Dr. Roberto Albuquerque   \n\n  | DELIBERAÇÕES:   Alinhamento dos objetivos específicos do trabalho de conclusão de curso. Decidido adotar arquitetura de microsserviços e validação via smart contract em testnet pública.  \n   `;
    setRawTextInput(dirtyText);
    // Hash Keccak-256 gerado após sanitização desse mesmo conteúdo
    const cleanSample = sanitizeForHashing(dirtyText);
    const sampleKeccak = calculateKeccak256(cleanSample);
    setInputHash(sampleKeccak);
  };

  // Executa a auditoria e verificação matemática com sanitização prévia
  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // MODO 1: Verificação via Texto da Ata Colado pelo Usuário
      if (auditMode === 'text') {
        if (!rawTextInput.trim()) {
          alert('Por favor, cole o texto da ata a ser auditado.');
          setIsVerifying(false);
          return;
        }

        // =========================================================================
        // ETAPA OBRIGATÓRIA DE SANITIZAÇÃO ANTES DO HASH (REQUISITO DA AUDITORIA)
        // 1. .trim()
        // 2. .replace(/\s+/g, ' ')
        // 3. .toLowerCase()
        // =========================================================================
        const sanitizedText = sanitizeForHashing(rawTextInput);

        // Geração dos hashes a partir do texto sanitizado
        const computedKeccak = calculateKeccak256(sanitizedText);
        const computedSha = await calculateSha256(sanitizedText);
        const activeCalculatedHash = hashAlgo === 'Keccak-256' ? computedKeccak : computedSha;

        let target = inputHash.trim().toLowerCase();
        let found = receipts.find(r => 
          r.documentHash.toLowerCase() === computedKeccak.toLowerCase() ||
          r.documentHash.toLowerCase() === computedSha.toLowerCase()
        );

        if (!target && found) {
          target = found.documentHash.toLowerCase();
        }

        const matches = target 
          ? (computedKeccak.toLowerCase() === target || computedSha.toLowerCase() === target)
          : !!found;

        setTimeout(() => {
          setVerificationResult({
            performed: true,
            valid: matches,
            message: matches 
              ? 'Integridade Matemática 100% Confirmada! A ata foi sanitizada e o hash coincide perfeitamente com o registro blockchain (zero falsos positivos de formatação).'
              : 'FALHA DE INTEGRIDADE: O conteúdo do texto foi alterado em relação à versão assinada ou o hash fornecido não corresponde a esta ata.',
            sanitizedTextUsed: sanitizedText,
            calculatedHash: activeCalculatedHash,
            targetHash: target || 'Não informado (pesquisa por correspondência)',
            foundReceipt: found
          });
          setIsVerifying(false);
        }, 350);
        return;
      }

      // MODO 2: Verificação via Arquivo JSON ou Recibo Criptográfico
      if (auditMode === 'json' && jsonInput.trim()) {
        const parsed = JSON.parse(jsonInput.trim());
        let textCandidate = '';
        let targetHash = parsed.documentHash || inputHash.trim();

        if (parsed.meetingSnapshot) {
          // Concatena os dados do snapshot e sanitiza
          const concatenated = concatenateMeetingData(parsed.meetingSnapshot);
          textCandidate = sanitizeForHashing(concatenated);
        } else if (parsed.canonicalDataString) {
          textCandidate = sanitizeForHashing(parsed.canonicalDataString);
        } else {
          textCandidate = sanitizeForHashing(jsonInput);
        }

        const computedKeccak = calculateKeccak256(textCandidate);
        const computedSha = await calculateSha256(textCandidate);

        const target = targetHash.toLowerCase();
        const matches = computedKeccak.toLowerCase() === target || computedSha.toLowerCase() === target;
        const found = receipts.find(r => r.documentHash.toLowerCase() === target);

        setTimeout(() => {
          setVerificationResult({
            performed: true,
            valid: matches,
            message: matches 
              ? 'Integridade Matemática 100% Confirmada! Recibo verificado com sanitização canônica ativa.' 
              : 'FALHA DE INTEGRIDADE: O payload JSON foi adulterado ou difere da assinatura criptográfica original!',
            sanitizedTextUsed: textCandidate,
            calculatedHash: parsed.hashAlgorithm === 'SHA-256' ? computedSha : computedKeccak,
            targetHash: targetHash,
            foundReceipt: found || parsed
          });
          setIsVerifying(false);
        }, 350);
        return;
      }

      // MODO 3: Consulta Rápida por Hash (bytes32)
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
        return;
      }

      alert('Por favor, informe o texto da ata, o arquivo JSON ou o Hash a ser auditado.');
      setIsVerifying(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EBE6DD]">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[#4A6741] shrink-0" />
            <h1 className="text-xl sm:text-2xl font-serif italic text-[#2D2A26] tracking-tight">
              Validador de Autenticidade & Auditoria
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8C8579] mt-1">
            Comprove a integridade matemática da ata acadêmica com sanitização pré-hash para eliminar falsos positivos de formatação.
          </p>
        </div>

        {/* Badge Informativo de Sanitização */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A6741]/10 border border-[#4A6741]/20 text-[11px] font-mono text-[#4A6741] font-semibold self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Sanitização Ativa: .trim() + /\s+/g + lowercase</span>
        </div>
      </div>

      {/* Input Card */}
      <div className="bg-white border border-[#EBE6DD] rounded-2xl p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
        
        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-[#FAF9F6] rounded-xl border border-[#EBE6DD]">
          <button
            type="button"
            onClick={() => setAuditMode('text')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              auditMode === 'text'
                ? 'bg-[#4A6741] text-white shadow-xs'
                : 'text-[#645e54] hover:text-[#2D2A26] hover:bg-white/60'
            }`}
          >
            <AlignLeft className="w-4 h-4 shrink-0" />
            <span>Texto da Ata (Colado)</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditMode('json')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              auditMode === 'json'
                ? 'bg-[#4A6741] text-white shadow-xs'
                : 'text-[#645e54] hover:text-[#2D2A26] hover:bg-white/60'
            }`}
          >
            <FileCode2 className="w-4 h-4 shrink-0" />
            <span>Recibo / JSON (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditMode('hash')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              auditMode === 'hash'
                ? 'bg-[#4A6741] text-white shadow-xs'
                : 'text-[#645e54] hover:text-[#2D2A26] hover:bg-white/60'
            }`}
          >
            <Hash className="w-4 h-4 shrink-0" />
            <span>Consulta por Hash</span>
          </button>
        </div>

        {/* Tab 1: Texto Puro da Ata Colado */}
        {auditMode === 'text' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-[#2D2A26] uppercase tracking-wider font-mono">
                  Texto da Ata para Auditoria:
                </label>
                <p className="text-[11px] text-[#8C8579] mt-0.5">
                  Espaços acidentais nas pontas, tabulações, quebras de linha duplas e diferenças de maiúsculas são sanitizados automaticamente antes de calcular o hash.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadSanitizationSample}
                className="text-[11px] text-[#4A6741] hover:underline font-semibold cursor-pointer shrink-0 ml-2"
                title="Carrega um texto com espaçamentos irregulares para testar a sanitização"
              >
                Carregar Exemplo de Teste
              </button>
            </div>

            <textarea
              rows={6}
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder="Cole aqui o texto da ata acadêmica copiado de um documento, e-mail ou editor..."
              className="w-full text-xs font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg p-3.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741] leading-relaxed"
            />

            {/* Input Hash Alvo de Comparação */}
            <div>
              <label className="block text-[11px] font-bold text-[#8C8579] uppercase tracking-wider mb-1.5 font-mono">
                Hash Esperado da Blockchain (bytes32 - opcional se já estiver nos recibos):
              </label>
              <input
                type="text"
                value={inputHash}
                onChange={(e) => setInputHash(e.target.value)}
                placeholder="0x... (deixe em branco para localizar automaticamente no livro de recibos)"
                className="w-full text-xs sm:text-sm font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg px-3.5 py-2.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Arquivo JSON ou Recibo */}
        {auditMode === 'json' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2EDE4]">
              <div>
                <div className="text-xs font-bold text-[#2D2A26] uppercase tracking-wider font-mono">
                  Carregar Arquivo da Ata (.json)
                </div>
                <div className="text-xs text-[#8C8579] mt-0.5">
                  Upload direto do arquivo emitido com o recibo criptográfico
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-[#8C8579] uppercase tracking-wider font-mono">
                  Ou Cole o Conteúdo JSON:
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
                placeholder="Cole aqui o JSON da ata ou do recibo criptográfico..."
                className="w-full text-xs font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg p-3.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Consulta Rápida por Hash */}
        {auditMode === 'hash' && (
          <div>
            <label className="block text-[11px] font-bold text-[#8C8579] uppercase tracking-wider mb-1.5 font-mono">
              Hash do Documento (bytes32) ou TxID:
            </label>
            <input
              type="text"
              value={inputHash}
              onChange={(e) => setInputHash(e.target.value)}
              placeholder="0x..."
              className="w-full text-xs sm:text-sm font-mono bg-[#FAF9F6] border border-[#DED8CD] rounded-lg px-3.5 py-2.5 text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
            />
          </div>
        )}

        {/* Seletor de Algoritmo de Hashing */}
        <div className="flex items-center justify-between pt-2 border-t border-[#F2EDE4] text-xs">
          <span className="text-[#8C8579] font-medium">Algoritmo de Auditoria:</span>
          <div className="inline-flex rounded-lg p-1 bg-[#FAF9F6] border border-[#EBE6DD]">
            <button
              type="button"
              onClick={() => setHashAlgo('Keccak-256')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-colors ${
                hashAlgo === 'Keccak-256'
                  ? 'bg-[#4A6741] text-white'
                  : 'text-[#8C8579] hover:text-[#2D2A26]'
              }`}
            >
              Keccak-256 (EVM)
            </button>
            <button
              type="button"
              onClick={() => setHashAlgo('SHA-256')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold font-mono transition-colors ${
                hashAlgo === 'SHA-256'
                  ? 'bg-[#4A6741] text-white'
                  : 'text-[#8C8579] hover:text-[#2D2A26]'
              }`}
            >
              SHA-256 (Web)
            </button>
          </div>
        </div>

        {/* Verify Button */}
        <div className="pt-2">
          <button
            id="btn-perform-audit"
            type="button"
            onClick={handleVerify}
            disabled={isVerifying || (!rawTextInput && !jsonInput && !inputHash)}
            className="w-full py-4 px-3 bg-[#4A6741] hover:bg-[#3d5536] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[48px] text-center"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#F2EDE4] shrink-0" />
                <span>Sanitizando Texto e Recalculando Hash Criptográfico...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#F2EDE4] shrink-0" />
                <span>Auditar com Sanitização Pré-Hash</span>
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

            <div className="space-y-3.5 flex-1">
              <div>
                <h3 className="text-base font-serif italic font-bold tracking-tight">
                  {verificationResult.valid ? 'Documento Autêntico e Íntegro' : 'Documento Inválido ou Adulterado'}
                </h3>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-relaxed">
                  {verificationResult.message}
                </p>
              </div>

              {/* Informações dos Hashes */}
              {(verificationResult.targetHash || verificationResult.calculatedHash) && (
                <div className="bg-white p-4 rounded-xl border border-[#EBE6DD] text-xs font-mono space-y-2">
                  {verificationResult.targetHash && (
                    <div>
                      <div className="text-[10px] text-[#8C8579] uppercase font-semibold">
                        Hash Registrado na Blockchain:
                      </div>
                      <div className="break-all font-bold text-[#2D2A26]">
                        {verificationResult.targetHash}
                      </div>
                    </div>
                  )}

                  {verificationResult.calculatedHash && (
                    <div className="pt-2 border-t border-[#F2EDE4]">
                      <div className="text-[10px] text-[#8C8579] uppercase font-semibold">
                        Hash Recalculado do Documento Atual ({hashAlgo}):
                      </div>
                      <div className={`break-all font-bold ${verificationResult.valid ? 'text-[#4A6741]' : 'text-rose-700'}`}>
                        {verificationResult.calculatedHash}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Prévia do Texto Sanitizado Utilizado */}
              {verificationResult.sanitizedTextUsed && (
                <div className="bg-white p-4 rounded-xl border border-[#EBE6DD] text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#8C8579] uppercase font-mono font-bold">
                      Texto Sanitizado Utilizado no Cálculo do Hash:
                    </span>
                    <span className="text-[10px] text-[#4A6741] font-mono font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Espaços múltiplos e quebras normalizados
                    </span>
                  </div>
                  <pre className="bg-[#FAF9F6] p-3 rounded-lg border border-[#EBE6DD] text-[10px] font-mono text-[#2D2A26] max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed break-all">
                    {verificationResult.sanitizedTextUsed}
                  </pre>
                </div>
              )}

              {/* Detalhes da Ata caso encontrada no Livro Razão */}
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
