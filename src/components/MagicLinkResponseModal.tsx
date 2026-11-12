import React, { useState } from 'react';
import { 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Play, 
  X, 
  BarChart3, 
  ShieldCheck, 
  Download, 
  RefreshCw,
  Gauge,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';
import { 
  BatchResponseSummary, 
  simularLoteMagicLinks, 
  gerarRelatorioAtritoMagicLink,
  PERFIS_ACADEMICOS_EXEMPLO,
  PERFIS_COM_ALTO_ATRITO,
  SLA_INSTITUCIONAL_PADRAO_MS,
  AcademicSignerProfile
} from '../utils/magicLinkResponseAuditor';

interface MagicLinkResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MagicLinkResponseModal: React.FC<MagicLinkResponseModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<BatchResponseSummary | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<'nominal' | 'rejeicao' | 'alto_atrito'>('nominal');
  const [customSlaMs, setCustomSlaMs] = useState<number>(SLA_INSTITUCIONAL_PADRAO_MS);
  const [consoleOutput, setConsoleOutput] = useState<string>('');

  if (!isOpen) return null;

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setSummary(null);
    setConsoleOutput('');

    try {
      let signers: AcademicSignerProfile[] = [];
      let batchId = '';
      let batchName = '';
      let description = '';

      if (selectedCohort === 'nominal') {
        signers = PERFIS_ACADEMICOS_EXEMPLO;
        batchId = 'batch_conselho_nominal';
        batchName = 'Conselho Universitário (Lote Nominal)';
        description = 'Simulação com 5 docentes e discentes em regime de aprovação padrão.';
      } else if (selectedCohort === 'rejeicao') {
        signers = [
          ...PERFIS_ACADEMICOS_EXEMPLO.slice(0, 3),
          {
            id: 'prof_ressalva',
            name: 'Dra. Luiza Campolina',
            role: 'Relatora de Ensino',
            email: 'luiza@universidade.edu.br',
            baseDelayMs: 600,
            jitterMs: 150,
            rejectProbability: 1.0,
            rejectReason: 'Inclusão de ressalva orçamentária do item 4 da pauta.'
          }
        ];
        batchId = 'batch_colegiado_rejeicao';
        batchName = 'Comissão de Pós-Graduação (Com Ressalva/Rejeição)';
        description = 'Simulação com presença de ressalva fundamentada por membro relator.';
      } else {
        signers = PERFIS_COM_ALTO_ATRITO;
        batchId = 'batch_sobrecarga_gargalo';
        batchName = 'Comitê com Sobrecarga e Alto Atrito';
        description = 'Simulação de atrasos severos com potencial violação do SLA institucional.';
      }

      const res = await simularLoteMagicLinks({
        batchId,
        batchName,
        description,
        slaLimitMs: customSlaMs,
        signers
      });

      setSummary(res);
      const textReport = gerarRelatorioAtritoMagicLink(res);
      setConsoleOutput(textReport);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadJson = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_magic_link_${summary.batchId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#FAF8F5] border border-[#DED8CD] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Institucional */}
        <div className="bg-[#2C2825] text-[#FAF8F5] px-6 py-4 flex items-center justify-between border-b border-[#3C3833]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4A6741] text-[#FAF8F5] rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#F2EDE4]">
                Auditoria de Tempo de Resposta: Magic Links (Multisig)
              </h2>
              <p className="text-xs text-[#C5BCAD]">
                Medição de <code className="bg-[#3C3833] px-1 py-0.5 rounded font-mono text-[10px]">t_dispatch → t_approval</code>, Média, Mediana, Desvio Padrão e Alerta de SLA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#C5BCAD] hover:text-[#FAF8F5] p-1.5 rounded-lg hover:bg-[#3C3833] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#2C2825]">
          
          {/* Seletor de Coortes e Configuração de SLA */}
          <div className="bg-[#F2EDE4] p-4 rounded-lg border border-[#DED8CD] grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#5A544B] uppercase tracking-wider mb-2">
                Coorte de Simulação de Signatários Acadêmicos:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCohort('nominal')}
                  disabled={isRunning}
                  className={`px-3 py-2 text-xs font-medium rounded border text-left transition-all cursor-pointer ${
                    selectedCohort === 'nominal'
                      ? 'bg-[#4A6741] text-white border-[#4A6741] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#5A544B] border-[#DED8CD] hover:bg-[#EAE4D9]'
                  }`}
                >
                  <div className="font-semibold">Lote Nominal</div>
                  <div className="text-[10px] opacity-80">5 signatários, ~800ms</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCohort('rejeicao')}
                  disabled={isRunning}
                  className={`px-3 py-2 text-xs font-medium rounded border text-left transition-all cursor-pointer ${
                    selectedCohort === 'rejeicao'
                      ? 'bg-[#4A6741] text-white border-[#4A6741] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#5A544B] border-[#DED8CD] hover:bg-[#EAE4D9]'
                  }`}
                >
                  <div className="font-semibold">Com Ressalva</div>
                  <div className="text-[10px] opacity-80">4 signatários (1 rejeição)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCohort('alto_atrito')}
                  disabled={isRunning}
                  className={`px-3 py-2 text-xs font-medium rounded border text-left transition-all cursor-pointer ${
                    selectedCohort === 'alto_atrito'
                      ? 'bg-[#B24C3D] text-white border-[#B24C3D] shadow-xs'
                      : 'bg-[#FAF8F5] text-[#5A544B] border-[#DED8CD] hover:bg-[#EAE4D9]'
                  }`}
                >
                  <div className="font-semibold">Alto Atrito (SLA)</div>
                  <div className="text-[10px] opacity-80">Sobrecarga &gt; 3500ms</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5A544B] uppercase tracking-wider mb-2">
                Limite de SLA (ms):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="250"
                  value={customSlaMs}
                  disabled={isRunning}
                  onChange={(e) => setCustomSlaMs(Math.max(200, Number(e.target.value)))}
                  className="w-full bg-[#FAF8F5] border border-[#DED8CD] rounded px-3 py-1.5 text-xs font-mono font-bold text-[#2C2825]"
                />
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isRunning}
                  className="bg-[#4A6741] hover:bg-[#3D5535] text-white px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Auditando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Executar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Banner de Status de Execução */}
          {isRunning && (
            <div className="bg-[#EAE4D9] p-4 rounded-lg border border-[#DED8CD] flex items-center gap-3 animate-pulse">
              <Clock className="w-5 h-5 text-[#4A6741] animate-spin" />
              <div>
                <div className="text-xs font-bold text-[#2C2825]">Despachando tokens e simulando tempo cognitivo de resposta...</div>
                <div className="text-[11px] text-[#5A544B]">Calculando timestamps de saída do servidor e interação dos membros acadêmicos.</div>
              </div>
            </div>
          )}

          {/* Resultados e Estatísticas */}
          {summary && (
            <div className="space-y-6">
              
              {/* Banner de Conformidade ou Alerta de SLA */}
              {summary.slaCompliant ? (
                <div className="bg-[#EAF3E8] border border-[#A7CDA1] p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4A6741] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#2D4525]">
                      ✔ CONFORMIDADE CONFIRMADA: TEMPO MÉDIO ATENDE AO SLA INSTITUCIONAL
                    </h4>
                    <p className="text-xs text-[#3D5C32] mt-0.5">
                      Tempo médio de resposta (μ = <strong>{summary.meanMs.toFixed(1)} ms</strong>) está{' '}
                      <strong>{Math.abs(summary.deltaSlaMs).toFixed(1)} ms</strong> abaixo do limite ({summary.slaThresholdMs} ms).
                      Processo de multi-assinatura fluido e sem gargalos operacionais.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FBEBE8] border border-[#E3A39A] p-4 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#B24C3D] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-[#802417]">
                      ⚠ ALERTA CRÍTICO DE ATRITO: TEMPO MÉDIO ULTRAPASSOU O SLA INSTITUCIONAL
                    </h4>
                    <p className="text-xs text-[#9E3627] mt-0.5">
                      O tempo médio de resposta (μ = <strong>{summary.meanMs.toFixed(1)} ms</strong>) excedeu o teto estipulado em{' '}
                      <strong>+{summary.deltaSlaMs.toFixed(1)} ms</strong>. 
                    </p>
                    <div className="text-[11px] text-[#802417] mt-1 font-semibold">
                      Ação Recomendada: Notificar signatários via mensageria alternativa ou disparar gatilho de re-envio com urgência.
                    </div>
                  </div>
                </div>
              )}

              {/* Cards Métricas Estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg border border-[#DED8CD] shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-[#8C8579]">Média (μ)</div>
                  <div className="text-xl font-mono font-bold text-[#2C2825] mt-1">
                    {summary.meanMs.toFixed(1)} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                  </div>
                  <div className="text-[10px] text-[#5A544B] mt-0.5">Tempo Médio Global</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-[#DED8CD] shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-[#8C8579]">Mediana (Q2)</div>
                  <div className="text-xl font-mono font-bold text-[#2C2825] mt-1">
                    {summary.medianMs.toFixed(1)} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                  </div>
                  <div className="text-[10px] text-[#5A544B] mt-0.5">50% das Respostas</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-[#DED8CD] shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-[#8C8579]">Desvio Padrão (σ)</div>
                  <div className="text-xl font-mono font-bold text-[#2C2825] mt-1">
                    {summary.stdDevMs.toFixed(1)} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                  </div>
                  <div className="text-[10px] text-[#5A544B] mt-0.5">Variância: {summary.varianceMs.toFixed(0)} ms²</div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-[#DED8CD] shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-[#8C8579]">Índice de Atrito</div>
                  <div className="text-xl font-mono font-bold text-[#2C2825] mt-1 flex items-center gap-1.5">
                    <span>{summary.frictionIndex}</span>
                    <span className="text-xs font-normal text-[#8C8579]">/ 100</span>
                  </div>
                  <div className="text-[10px] font-semibold text-[#4A6741] mt-0.5">
                    {summary.frictionLevel.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Tabela de Discriminação Individual de Signatários */}
              <div className="bg-white rounded-lg border border-[#DED8CD] overflow-hidden">
                <div className="bg-[#F2EDE4] px-4 py-2 border-b border-[#DED8CD] flex items-center justify-between">
                  <div className="text-xs font-bold text-[#3C3833] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#4A6741]" />
                    <span>Discriminação Individual dos Signatários (t_dispatch → t_approval)</span>
                  </div>
                  <span className="text-[10px] text-[#8C8579]">
                    {summary.totalSigners} participantes auditados
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#5A544B] border-b border-[#DED8CD] font-medium text-[11px]">
                      <tr>
                        <th className="px-4 py-2">Signatário</th>
                        <th className="px-4 py-2">Papel Institucional</th>
                        <th className="px-4 py-2">Decisão</th>
                        <th className="px-4 py-2 text-right">Delta_t (ms)</th>
                        <th className="px-4 py-2 text-center">Status SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4D9]">
                      {summary.signers.map((s, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="px-4 py-2 font-medium text-[#2C2825]">
                            {s.signerName}
                            <div className="text-[10px] text-[#8C8579]">{s.signerEmail}</div>
                          </td>
                          <td className="px-4 py-2 text-[#5A544B]">{s.signerRole}</td>
                          <td className="px-4 py-2">
                            {s.action === 'APROVADA' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF3E8] text-[#2D4525]">
                                <CheckCircle2 className="w-3 h-3" /> Aprovada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBEBE8] text-[#802417]">
                                <UserX className="w-3 h-3" /> Rejeitada
                              </span>
                            )}
                            {s.justificativa && (
                              <div className="text-[10px] text-[#B24C3D] italic mt-0.5">
                                "{s.justificativa}"
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-[#2C2825]">
                            {s.responseTimeMs.toFixed(1)} ms
                          </td>
                          <td className="px-4 py-2 text-center">
                            {s.withinSla ? (
                              <span className="text-[10px] font-bold text-[#4A6741]">✔ Conforme</span>
                            ) : (
                              <span className="text-[10px] font-bold text-[#B24C3D]">
                                ✖ +{(s.responseTimeMs - summary.slaThresholdMs).toFixed(0)}ms
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="bg-white border border-[#DED8CD] hover:bg-[#F2EDE4] text-[#3C3833] px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Sumário JSON</span>
                </button>

                <div className="text-[11px] text-[#8C8579]">
                  Auditoria baseada em relógio de alta precisão <code>performance.now()</code>
                </div>
              </div>

            </div>
          )}

          {!summary && !isRunning && (
            <div className="bg-white p-8 rounded-lg border border-[#DED8CD] text-center space-y-3">
              <div className="w-12 h-12 bg-[#F2EDE4] text-[#4A6741] rounded-full flex items-center justify-center mx-auto">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#2C2825]">Auditoria Pronta para Execução</h3>
              <p className="text-xs text-[#5A544B] max-w-md mx-auto">
                Selecione uma coorte de signatários acadêmicos e clique em <strong>Executar</strong> para simular o envio de Magic Links, interação humana assíncrona e cálculo das métricas de atrito com checagem de SLA.
              </p>
            </div>
          )}

        </div>

        {/* Footer do Modal */}
        <div className="bg-[#F2EDE4] px-6 py-3 border-t border-[#DED8CD] flex items-center justify-between text-xs text-[#8C8579]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4A6741]" />
            <span>Métrica de Governança Descentralizada &bull; Norma Institucional de SLA</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2C2825] hover:bg-[#3C3833] text-white rounded text-xs font-medium cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
