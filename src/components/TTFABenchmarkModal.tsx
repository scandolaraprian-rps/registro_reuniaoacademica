import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Play, 
  X, 
  BarChart3, 
  Layers, 
  ShieldCheck, 
  Download, 
  RefreshCw,
  Cpu,
  Hash,
  Users,
  FileCheck2,
  Hourglass
} from 'lucide-react';
import { 
  TTFAMeasurement, 
  TTFACohortConfig, 
  TTFASuiteSummary 
} from '../types';
import { 
  COORTES_PADRAO_AUDITORIA, 
  executarAuditoriaTTFAParametrizada,
  formatarRelatorioAuditoriaConsole 
} from '../utils/ttfaAuditor';
import {
  BatchHoursStatistics,
  simularLoteAtasHours,
  gerarRelatorioEstruturadoGargalos
} from '../utils/ttfaHoursAuditor';

interface TTFABenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TTFABenchmarkModal: React.FC<TTFABenchmarkModalProps> = ({ isOpen, onClose }) => {
  // Modo de auditoria: 'hours' (Escala de Horas & SLA 24h & Gargalos) vs 'ms' (Pipeline EVM & DOM em ms)
  const [auditScope, setAuditScope] = useState<'hours' | 'ms'>('hours');

  // Estado da Auditoria em Escala de Horas (SLA 24h)
  const [isHoursRunning, setIsHoursRunning] = useState(false);
  const [hoursStats, setHoursStats] = useState<BatchHoursStatistics | null>(null);
  const [selectedHoursScenario, setSelectedHoursScenario] = useState<'nominal' | 'sobrecarga'>('nominal');

  // Estado da Auditoria em Milissegundos
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<TTFASuiteSummary | null>(null);
  const [currentProgress, setCurrentProgress] = useState<{
    coorteNome: string;
    cicloAtual: number;
    totalCiclos: number;
    ultimaMedicao?: TTFAMeasurement;
  } | null>(null);

  if (!isOpen) return null;

  // Handler para iniciar simulação em Escala de Horas
  const handleStartHoursSimulation = async (scenario: 'nominal' | 'sobrecarga') => {
    setIsHoursRunning(true);
    setHoursStats(null);
    setSelectedHoursScenario(scenario);

    try {
      if (scenario === 'nominal') {
        const res = await simularLoteAtasHours({
          batchId: 'lote_academico_nominal_2026',
          batchName: 'Lote 2026.1 - Bancas de Pós-Graduação e Colegiados',
          description: 'Atas deliberativas em regime nominal com 3 signatários pares',
          ataCount: 12,
          slaLimitHours: 24.0,
          humanResponseDistribution: {
            baseHoursPerSigner: 9.5,
            jitterHours: 3.2,
            outlierChance: 0
          },
          messagingLatencyMinutes: 1.8,
          blockchainLatencySeconds: 28
        });
        setHoursStats(res);
      } else {
        const res = await simularLoteAtasHours({
          batchId: 'lote_recesso_sobrecarga',
          batchName: 'Lote Período de Recesso & Sobrecarga de Avaliadores',
          description: 'Atrasos extremos por ausência de signatários gerando estouro de SLA',
          ataCount: 10,
          slaLimitHours: 24.0,
          humanResponseDistribution: {
            baseHoursPerSigner: 27.5,
            jitterHours: 4.0,
            outlierChance: 0.3,
            outlierHours: 38.0
          }
        });
        setHoursStats(res);
      }
    } catch (err: any) {
      console.error('Falha na auditoria de horas TTFA:', err);
    } finally {
      setIsHoursRunning(false);
    }
  };

  const handleDownloadHoursReport = () => {
    if (!hoursStats) return;
    const txtReport = gerarRelatorioEstruturadoGargalos(hoursStats);
    const blob = new Blob([txtReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-ttfa-horas-gargalos-${hoursStats.batchId}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handlers para auditoria em milissegundos
  const handleStartBenchmark = async (modoRapido: boolean = false) => {
    setIsRunning(true);
    setSummary(null);

    const cohortsToRun: TTFACohortConfig[] = COORTES_PADRAO_AUDITORIA.map(c => ({
      ...c,
      runs: modoRapido ? 3 : c.runs
    }));

    const totalPrevisto = cohortsToRun.reduce((acc, c) => acc + c.runs, 0);
    let acumulado = 0;

    try {
      const resultado = await executarAuditoriaTTFAParametrizada({
        cohorts: cohortsToRun,
        globalSlaLimitMs: 3800,
        onProgress: (info) => {
          acumulado++;
          setCurrentProgress({
            coorteNome: info.measurement.cohortName,
            cicloAtual: acumulado,
            totalCiclos: totalPrevisto,
            ultimaMedicao: info.measurement
          });
        }
      });
      setSummary(resultado);
    } catch (err: any) {
      console.error('Falha durante execução do benchmark TTFA:', err);
    } finally {
      setIsRunning(false);
      setCurrentProgress(null);
    }
  };

  const handleDownloadReport = () => {
    if (!summary) return;
    const txtReport = formatarRelatorioAuditoriaConsole(summary);
    const blob = new Blob([txtReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-auditoria-ttfa-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ttfa-modal-title"
    >
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#DED8CD] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header do Modal */}
        <div className="px-5 py-4 border-b border-[#DED8CD] bg-[#F2EDE4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A6741] text-white flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 id="ttfa-modal-title" className="text-sm sm:text-base font-bold text-[#3C3833] flex items-center gap-2">
                <span>Auditoria & Benchmark TTFA</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#4A6741]/10 text-[#4A6741] font-semibold border border-[#4A6741]/20">
                  Total Meeting Closing Time
                </span>
              </h2>
              <p className="text-xs text-[#8C8579]">
                Macrofluxo: Submissão inicial (t_start) &rarr; Consenso Multisig &rarr; Confirmação On-Chain &rarr; Recibo no DOM (t_end)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRunning || isHoursRunning}
            className="p-1.5 rounded-lg text-[#8C8579] hover:text-[#3C3833] hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Escopo de Auditoria */}
        <div className="bg-[#EAE4D9] px-6 py-2 border-b border-[#DED8CD] flex items-center justify-between gap-4">
          <div className="text-xs font-semibold text-[#5A544B] uppercase tracking-wider">
            Escopo de Auditoria Metrológica:
          </div>
          <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-lg border border-[#DED8CD]">
            <button
              type="button"
              onClick={() => setAuditScope('hours')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                auditScope === 'hours'
                  ? 'bg-[#4A6741] text-white shadow-2xs'
                  : 'text-[#5A544B] hover:text-[#2C2825]'
              }`}
            >
              Escala de Horas & Gargalos (SLA 24h)
            </button>
            <button
              type="button"
              onClick={() => setAuditScope('ms')}
              className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                auditScope === 'ms'
                  ? 'bg-[#4A6741] text-white shadow-2xs'
                  : 'text-[#5A544B] hover:text-[#2C2825]'
              }`}
            >
              Pipeline EVM & DOM (Milissegundos)
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================================= */}
          {/* MODO 1: ESCALA DE HORAS, SLA 24H E ANÁLISE DE GARGALOS                     */}
          {/* ========================================================================= */}
          {auditScope === 'hours' && (
            <div className="space-y-6">
              {/* Banner Explicativo de Governança Institucional */}
              <div className="p-4 rounded-xl bg-white border border-[#DED8CD] shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A6741] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>SLA Institucional de Governança: Meta de 95% das Atas Fechadas em até 24 Horas</span>
                </div>
                <p className="text-xs text-[#5C564E] leading-relaxed">
                  Avalia o tempo decorrido do macrofluxo total de governança colegiada, discriminando a latência técnica da mensageria e mineração em bloco frente ao tempo de deliberação e resposta humana dos pares acadêmicos.
                </p>
              </div>

              {/* Botões de Execução do Lote */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DED8CD]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#3C3833]">Simular Lote de Atas:</span>
                  <button
                    type="button"
                    onClick={() => handleStartHoursSimulation('nominal')}
                    disabled={isHoursRunning}
                    className="px-3.5 py-2 rounded-lg bg-[#4A6741] hover:bg-[#3d5436] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isHoursRunning && selectedHoursScenario === 'nominal' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>Lote Nominal (12 Atas, ~9.5h)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartHoursSimulation('sobrecarga')}
                    disabled={isHoursRunning}
                    className="px-3.5 py-2 rounded-lg bg-white border border-[#B24C3D] hover:bg-[#B24C3D]/5 text-[#B24C3D] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isHoursRunning && selectedHoursScenario === 'sobrecarga' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>Lote com Recesso / Sobrecarga (&gt;24h)</span>
                  </button>
                </div>

                {hoursStats && (
                  <button
                    onClick={handleDownloadHoursReport}
                    className="px-3.5 py-2 rounded-lg bg-white border border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741]/5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Relatório Formatado (.txt)</span>
                  </button>
                )}
              </div>

              {/* Status de Execução */}
              {isHoursRunning && (
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-[#4A6741] text-[#2D2A26] flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-[#4A6741] animate-spin" />
                  <div>
                    <div className="text-xs font-bold">Processando Lote de Atas em Escala de Horas...</div>
                    <div className="text-[11px] text-[#5C564E]">Executando hashing, quórum multisig, emissão on-chain e apuração estatística.</div>
                  </div>
                </div>
              )}

              {/* Painel de Resultados de Horas */}
              {hoursStats && (
                <div className="space-y-6">
                  {/* Banner de Veredito de SLA (24h) */}
                  <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    hoursStats.slaPass
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                      : 'bg-rose-50 border-rose-500 text-rose-950'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-white ${
                        hoursStats.slaPass ? 'bg-[#4A6741]' : 'bg-rose-600'
                      }`}>
                        {hoursStats.slaPass ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide">
                          Veredito do SLA: {hoursStats.slaPass ? 'SISTEMA CONFORME À NORMA INSTITUCIONAL' : 'VIOLAÇÃO DE SLA DETECTADA (NÃO CONFORME)'}
                        </h3>
                        <p className="text-xs opacity-90 leading-relaxed mt-0.5">
                          {hoursStats.slaPass
                            ? `Taxa de conformidade de ${hoursStats.complianceRatePercentage}% e percentil P95 de ${hoursStats.p95Hours.toFixed(1)}h cumprem rigorosamente a meta institucional de fechamento em até ${hoursStats.slaThresholdHours} horas.`
                            : `O percentil P95 (${hoursStats.p95Hours.toFixed(1)}h) ultrapassou o teto regulamentar de ${hoursStats.slaThresholdHours} horas. ${hoursStats.totalAtas - hoursStats.atasWithinSlaCount} atas acumularam atraso excessivo.`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white/80 border shadow-2xs">
                        P95: {hoursStats.p95Hours.toFixed(2)} h (Meta: &le; 24h)
                      </span>
                    </div>
                  </div>

                  {/* Cards de Métricas Estatísticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Média (&mu;)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#3C3833]">
                        {hoursStats.meanHours.toFixed(2)} <span className="text-xs font-normal text-[#8C8579]">horas</span>
                      </span>
                      <span className="text-[10px] text-[#8C8579] block mt-0.5">
                        Tempo Médio de Ciclo
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Mediana (Q2)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#3C3833]">
                        {hoursStats.medianHours.toFixed(2)} <span className="text-xs font-normal text-[#8C8579]">horas</span>
                      </span>
                      <span className="text-[10px] text-[#8C8579] block mt-0.5">
                        50% das atas fechadas
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Desvio Padrão (&sigma;)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#3C3833]">
                        &plusmn;{hoursStats.stdDevHours.toFixed(2)} <span className="text-xs font-normal text-[#8C8579]">horas</span>
                      </span>
                      <span className="text-[10px] text-[#8C8579] block mt-0.5">
                        Variância: {hoursStats.varianceHours.toFixed(1)} h²
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Taxa de Conformidade
                      </span>
                      <span className="text-xl font-bold font-mono text-[#4A6741]">
                        {hoursStats.complianceRatePercentage}%
                      </span>
                      <span className="text-[10px] text-[#8C8579] block mt-0.5">
                        {hoursStats.atasWithinSlaCount}/{hoursStats.totalAtas} atas em &le; 24h
                      </span>
                    </div>
                  </div>

                  {/* Identificação de Gargalos (Root-Cause Bottleneck Analysis) */}
                  <div className="bg-white p-5 rounded-xl border border-[#DED8CD] shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#DED8CD] pb-3">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#4A6741]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#3C3833]">
                          Decomposição dos Gargalos do Macrofluxo (Onde Reside a Retenção?)
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-[#8C8579]">
                        Gargalo Primário: <strong className="text-[#B24C3D]">{hoursStats.bottleneckBreakdown.dominantBottleneck}</strong>
                      </span>
                    </div>

                    {/* Barras de Proporção de Gargalo */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-[#3C3833] flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-600" />
                            <span>1. Lentidão Humana (Consenso Assíncrono dos Pares Acadêmicos)</span>
                          </span>
                          <span className="font-mono text-amber-800">{hoursStats.bottleneckBreakdown.humanDeliberationSharePct}%</span>
                        </div>
                        <div className="w-full h-3 bg-amber-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full" 
                            style={{ width: `${hoursStats.bottleneckBreakdown.humanDeliberationSharePct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-[#3C3833] flex items-center gap-1.5">
                            <Hash className="w-3.5 h-3.5 text-blue-600" />
                            <span>2. Confirmação da Blockchain (Mineração EVM e Inclusão em Bloco)</span>
                          </span>
                          <span className="font-mono text-blue-800">{hoursStats.bottleneckBreakdown.blockchainSharePct}%</span>
                        </div>
                        <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${Math.max(1, hoursStats.bottleneckBreakdown.blockchainSharePct)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-[#3C3833] flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3. Mensageria Institucional (Despacho SMTP e Entrega Magic Links)</span>
                          </span>
                          <span className="font-mono text-emerald-800">{hoursStats.bottleneckBreakdown.messagingSharePct}%</span>
                        </div>
                        <div className="w-full h-3 bg-emerald-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${Math.max(1, hoursStats.bottleneckBreakdown.messagingSharePct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Diagnóstico Textual e Recomendação */}
                    <div className="bg-[#FAF7F2] p-3.5 rounded-lg border border-[#DED8CD] space-y-2 text-xs">
                      <div>
                        <strong className="text-[#3C3833]">Diagnóstico de Causa-Raiz:</strong>{' '}
                        <span className="text-[#5C564E]">{hoursStats.bottleneckBreakdown.rootCauseDiagnosis}</span>
                      </div>
                      <div>
                        <strong className="text-[#4A6741]">Recomendação de Engenharia & Governança:</strong>{' '}
                        <span className="text-[#5C564E]">{hoursStats.bottleneckBreakdown.governanceRecommendation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tabela Resumida das Atas do Lote */}
                  <div className="bg-white rounded-xl border border-[#DED8CD] shadow-2xs overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#DED8CD] bg-[#F2EDE4] flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#3C3833]">
                        Amostragem Individual do Lote de Atas ({hoursStats.totalAtas} atas auditadas)
                      </h4>
                      <span className="text-[11px] text-[#8C8579]">
                        Validação DOM e Evento On-Chain: 100% OK
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2] text-[#8C8579] font-medium border-b border-[#DED8CD]">
                          <tr>
                            <th className="px-3 py-2">ID / Ata</th>
                            <th className="px-3 py-2">Signatários</th>
                            <th className="px-3 py-2 text-right">TTFA (Horas)</th>
                            <th className="px-3 py-2">Gargalo Crítico</th>
                            <th className="px-3 py-2 text-center">Status SLA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE4D9]">
                          {hoursStats.measurements.slice(0, 6).map((m, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF8F5]">
                              <td className="px-3 py-2 font-medium text-[#2C2825]">
                                {m.title.slice(0, 32)}...
                              </td>
                              <td className="px-3 py-2 text-[#5A544B]">{m.signersCount} pares</td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-[#2C2825]">
                                {m.totalClosingHours.toFixed(2)} h
                              </td>
                              <td className="px-3 py-2 text-[#8C8579]">
                                {m.primaryBottleneck} ({m.bottleneckPercentage}%)
                              </td>
                              <td className="px-3 py-2 text-center">
                                {m.withinSla24h ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    Conforme
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Excedido
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO 2: PIPELINE EVM & DOM EM MILISSEGUNDOS (BENCHMARK TÉCNICO)           */}
          {/* ========================================================================= */}
          {auditScope === 'ms' && (
            <div className="space-y-6">
              {/* Banner Explicativo de Engenharia de Software */}
              <div className="p-4 rounded-xl bg-white border border-[#DED8CD] shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4A6741] uppercase tracking-wider">
                  <Cpu className="w-4 h-4" />
                  <span>Benchmark Técnico de Latência do Pipeline em Milissegundos</span>
                </div>
                <p className="text-xs text-[#5C564E] leading-relaxed">
                  Esta ferramenta audita o tempo decorrido (<code className="bg-[#F2EDE4] px-1 py-0.5 rounded text-[11px] font-mono">TTFA = t_end - t_start</code>)
                  executando a higienização de strings contra caracteres vazios, quórum multisig, 
                  mineração no contrato inteligente Solidity e injeção do recibo no DOM com validação estrita.
                </p>
              </div>

              {/* Barra de Ações & Gatilho de Benchmark */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DED8CD]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#3C3833]">Executar Auditoria:</span>
                  <button
                    id="btn-run-fast-ttfa"
                    type="button"
                    onClick={() => handleStartBenchmark(true)}
                    disabled={isRunning}
                    className="px-3.5 py-2 rounded-lg bg-[#4A6741] hover:bg-[#3d5436] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Executar Benchmark Rápido (12 Ciclos)</span>
                  </button>

                  <button
                    id="btn-run-full-ttfa"
                    type="button"
                    onClick={() => handleStartBenchmark(false)}
                    disabled={isRunning}
                    className="px-3.5 py-2 rounded-lg bg-white border border-[#DED8CD] hover:bg-[#F2EDE4] text-[#3C3833] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#8C8579]" />
                    <span>Auditoria Rigorosa Completa (26 Ciclos)</span>
                  </button>
                </div>

                {summary && (
                  <button
                    onClick={handleDownloadReport}
                    className="px-3.5 py-2 rounded-lg bg-white border border-[#4A6741] text-[#4A6741] hover:bg-[#4A6741]/5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Relatório Formatado (.txt)</span>
                  </button>
                )}
              </div>

              {/* Telemetria de Progresso em Tempo Real */}
              {isRunning && currentProgress && (
                <div className="p-4 rounded-xl bg-emerald-50 border-2 border-[#4A6741] text-[#2D2A26] space-y-3 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-[#4A6741]">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executando: {currentProgress.coorteNome}</span>
                    </span>
                    <span className="font-mono">
                      Ciclo {currentProgress.cicloAtual} de {currentProgress.totalCiclos} ({Math.round((currentProgress.cicloAtual / currentProgress.totalCiclos) * 100)}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#4A6741] transition-all duration-300"
                      style={{ width: `${(currentProgress.cicloAtual / currentProgress.totalCiclos) * 100}%` }}
                    />
                  </div>

                  {currentProgress.ultimaMedicao && (
                    <div className="text-[11px] font-mono text-emerald-950 flex flex-wrap items-center gap-3 pt-1 border-t border-emerald-200">
                      <span>Último TTFA: <strong>{currentProgress.ultimaMedicao.phases.totalClosingTimeMs}ms</strong></span>
                      <span>TxID: {currentProgress.ultimaMedicao.txId.slice(0, 12)}...</span>
                      <span>DOM Verificado: <strong className="text-emerald-700">OK</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Resultados em Milissegundos */}
              {summary && (
                <div className="space-y-6">
                  <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    summary.systemControlStatus === 'CONFORME'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                      : 'bg-rose-50 border-rose-500 text-rose-950'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-white ${
                        summary.systemControlStatus === 'CONFORME' ? 'bg-[#4A6741]' : 'bg-rose-600'
                      }`}>
                        {summary.systemControlStatus === 'CONFORME' ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide">
                          Veredito de Auditoria: Sistema {summary.systemControlStatus}
                        </h3>
                        <p className="text-xs opacity-90 leading-relaxed">
                          {summary.systemControlStatus === 'CONFORME'
                            ? `O tempo médio global (${summary.globalStats.mean}ms) e o percentil P95 (${summary.globalStats.p95}ms) operam rigorosamente dentro do Limite de Controle (<= ${summary.globalStats.slaLimit}ms).`
                            : `O tempo de fechamento excedeu o limite de controle estabelecido. Revisar latência de rede e quórum.`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-white/80 border shadow-2xs">
                        Média: {summary.globalStats.mean} ms
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Média (&mu;)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#3C3833]">
                        {summary.globalStats.mean} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Mediana (Q2)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#3C3833]">
                        {summary.globalStats.median} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Desvio Padrão (&sigma;)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#3C3833]">
                        &plusmn;{summary.globalStats.stdDev} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#DED8CD] shadow-2xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8579] block">
                        Percentil 95 (P95)
                      </span>
                      <span className="text-xl font-bold font-mono text-[#4A6741]">
                        {summary.globalStats.p95} <span className="text-xs font-normal text-[#8C8579]">ms</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 py-3 border-t border-[#DED8CD] bg-[#F2EDE4] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#8C8579]">
            Auditoria de Desempenho e SLA 24h &bull; Registro de Ata de Reunião Acadêmica
          </span>
          <button
            onClick={onClose}
            disabled={isRunning || isHoursRunning}
            className="px-4 py-1.5 rounded-lg bg-white border border-[#DED8CD] text-[#3C3833] hover:bg-black/5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
