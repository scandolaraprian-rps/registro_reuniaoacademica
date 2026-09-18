import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Lock, 
  Mail, 
  Send, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  KeyRound, 
  Clock, 
  ShieldAlert, 
  Terminal,
  RotateCcw
} from 'lucide-react';
import { InstitutionalUser } from '../types';
import { 
  mockInstitutionalLogin, 
  generateMockWallet, 
  INSTITUTIONAL_PROFILES 
} from '../utils/auth';
import { 
  solicitarMagicLink, 
  processarMagicLink, 
  MagicLinkDispatchResult, 
  JANELA_EXPIRACAO_MS 
} from '../utils/magicLinkAuth';
import { LogoPlaceholder } from './LogoPlaceholder';

interface InstitutionalLoginGateProps {
  onLoginSuccess: (user: InstitutionalUser) => void;
}

export const InstitutionalLoginGate: React.FC<InstitutionalLoginGateProps> = ({
  onLoginSuccess
}) => {
  // Estado do formulário minimalista
  const [emailInput, setEmailInput] = useState<string>('joao.silva@universidade.edu.br');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Transição de Estado: formulário ocultado -> mensagem "Verifique sua caixa de entrada"
  const [magicLinkEnviado, setMagicLinkEnviado] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<MagicLinkDispatchResult | null>(null);

  // Estados de simulação da Caixa de Entrada e Roteamento
  const [inboxStatusMessage, setInboxStatusMessage] = useState<string | null>(null);
  const [inboxErrorType, setInboxErrorType] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState<boolean>(false);
  const [rawTokenUrl, setRawTokenUrl] = useState<string>('');

  /**
   * ============================================================================
   * GATILHO 1: Solicitação de Acesso Seguro (Formulário Minimalista)
   * ============================================================================
   */
  const handleSolicitarAcesso = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInboxStatusMessage(null);
    setInboxErrorType(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const resultado = solicitarMagicLink(emailInput);

      if (!resultado.sucesso) {
        setFormError(resultado.mensagem);
        setIsSubmitting(false);
        return;
      }

      // Transição de estado: oculta o formulário e exibe "Verifique sua caixa de entrada"
      setDispatchResult(resultado);
      setRawTokenUrl(resultado.urlSimulada || '');
      setMagicLinkEnviado(true);
      setIsSubmitting(false);
    }, 450);
  };

  /**
   * ============================================================================
   * GATILHO 2: Processamento do Magic Link (Simulação do Clique pelo Usuário)
   * ============================================================================
   */
  const handleClicarMagicLink = async (urlParaProcessar: string) => {
    setIsValidatingToken(true);
    setInboxStatusMessage(null);
    setInboxErrorType(null);

    // Pequena latência simulada para reproduzir a validação no servidor
    setTimeout(async () => {
      const validacao = processarMagicLink(urlParaProcessar);

      if (!validacao.autenticado) {
        setIsValidatingToken(false);
        setInboxErrorType(validacao.motivoFalha || 'ERRO');
        setInboxStatusMessage(validacao.mensagem);
        return;
      }

      setInboxStatusMessage('Token validado com sucesso! Carregando sessão acadêmica...');

      // Cria ou vincula o perfil institucional correspondente ao e-mail autenticado
      try {
        const user = await mockInstitutionalLogin(validacao.email);
        setTimeout(() => {
          setIsValidatingToken(false);
          // Liberação do DOM e renderização da tela de criação da ata
          onLoginSuccess(user);
        }, 500);
      } catch (err: any) {
        setIsValidatingToken(false);
        setInboxStatusMessage(`Erro ao instanciar sessão: ${err.message}`);
      }
    }, 600);
  };

  /**
   * Teste de Cenário de Ataque: Replay Attack (Segundo Clique)
   */
  const handleSimularAtaqueReplay = () => {
    if (!rawTokenUrl) return;
    console.warn('[AppSec Test] Injetando tentativa de replay attack com token já consumido...');
    handleClicarMagicLink(rawTokenUrl);
  };

  /**
   * Teste de Cenário de Segurança: Expiração Temporal (>10 minutos)
   */
  const handleSimularExpiracaoTemporal = () => {
    if (!dispatchResult?.token) return;
    console.warn('[AppSec Test] Simulando ultrapassagem da janela de 10 minutos...');
    // Forja a URL com token inexistente/expirado
    const urlExpirada = `${window.location.origin}/login/magic?token=tok_expirado_${Date.now()}`;
    handleClicarMagicLink(urlExpirada);
  };

  /**
   * Reinicia o fluxo para novo e-mail
   */
  const handleReiniciarFluxo = () => {
    setMagicLinkEnviado(false);
    setDispatchResult(null);
    setFormError(null);
    setInboxStatusMessage(null);
    setInboxErrorType(null);
    setRawTokenUrl('');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-8">
      
      {/* ===================================================================== */}
      {/* COMPONENTE PRINCIPAL: TELA DE LOGIN MINIMALISTA OU CONFIRMAÇÃO        */}
      {/* ===================================================================== */}
      <div className="bg-white border border-[#EBE6DD] rounded-3xl shadow-sm p-6 sm:p-10 relative overflow-hidden transition-all">
        
        {/* Faixa decorativa superior com gradiente de segurança */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4A6741] via-[#2F4F2F] to-[#1E301E]" />

        {/* Cabeçalho Institucional Minimalista */}
        <div className="text-center space-y-3 pb-6 border-b border-[#F2EDE4]">
          <div className="flex justify-center">
            <LogoPlaceholder size="lg" className="shadow-xs" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] font-mono text-[11px] font-semibold border border-[#4A6741]/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4A6741]" />
              <span>Autenticação sem Senha &middot; Magic Links Acadêmicos</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-serif italic text-[#2D2A26] tracking-tight">
              Registro de Atas Acadêmicas
            </h1>
            
            <p className="text-xs sm:text-sm text-[#8C8579] max-w-lg mx-auto mt-1.5 leading-relaxed">
              Eliminação de senhas vulneráveis e proteção estrita contra personificação de identidade. Apenas identidades acadêmicas validadas podem emitir hashes na Blockchain.
            </p>
          </div>
        </div>

        {/* ESTADO 1: FORMULÁRIO MINIMALISTA (Apenas E-mail e Botão de Acesso) */}
        {!magicLinkEnviado ? (
          <div className="py-8 max-w-md mx-auto space-y-6">
            
            <form onSubmit={handleSolicitarAcesso} className="space-y-4">
              <div className="space-y-2">
                <label 
                  htmlFor="input-email-institucional" 
                  className="block text-xs uppercase tracking-widest font-bold text-[#2D2A26] font-mono"
                >
                  E-mail Institucional Acadêmico
                </label>
                
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C8579] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-email-institucional"
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="aluno@universidade.edu.br"
                    className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-[#DED8CD] bg-[#FAF9F6] text-[#2D2A26] placeholder-[#A0988A] focus:outline-none focus:ring-2 focus:ring-[#4A6741] focus:bg-white transition-all font-mono"
                  />
                </div>
                
                <div className="flex items-center justify-between text-[11px] text-[#8C8579]">
                  <span>Domínio restrito: <strong>@universidade.edu.br</strong></span>
                  <span className="font-mono text-[10px]">Padrão: OTT (One-Time Token)</span>
                </div>
              </div>

              {/* Mensagem de Erro de Validação de Regex */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-sans">{formError}</div>
                </div>
              )}

              {/* Botão de Submissão Minimalista */}
              <button
                id="btn-solicitar-acesso"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-[#4A6741] hover:bg-[#3d5536] text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gerando Token Alfanumérico...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Solicitar Acesso Seguro</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Sugestões de E-mails Institucionais Rápidos */}
            <div className="pt-4 border-t border-[#F2EDE4] space-y-2">
              <span className="block text-[11px] uppercase tracking-wider font-mono text-[#8C8579] font-bold">
                Exemplos de Identidades Acadêmicas:
              </span>
              <div className="flex flex-wrap gap-2">
                {INSTITUTIONAL_PROFILES.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => setEmailInput(p.email)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#FAF9F6] border border-[#EBE6DD] hover:border-[#4A6741] text-[#2D2A26] transition-colors cursor-pointer"
                  >
                    {p.email} ({p.role})
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* ESTADO 2: TRANSIÇÃO DE ESTADO (Formulário Ocultado -> "Verifique sua caixa de entrada") */
          <div className="py-8 max-w-lg mx-auto text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
            
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-[#4A6741] shadow-xs">
              <Send className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif italic text-[#2D2A26]">
                Verifique sua caixa de entrada
              </h2>
              <p className="text-xs sm:text-sm text-[#645e54] leading-relaxed">
                Um link de autenticação temporário foi gerado e disparado para:
              </p>
              <div className="inline-block px-3.5 py-1.5 rounded-lg bg-[#FAF9F6] border border-[#DED8CD] font-mono font-bold text-xs text-[#4A6741]">
                {dispatchResult?.emailDestino}
              </div>
            </div>

            <div className="bg-[#FAF9F6] border border-[#EBE6DD] rounded-xl p-4 text-left text-xs text-[#645e54] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#2D2A26]">
                <Clock className="w-4 h-4 text-[#4A6741]" />
                <span>Parâmetros de Segurança do Token:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#8C8579]">
                <li><strong>Validade Temporal:</strong> 10 minutos a partir do envio.</li>
                <li><strong>Uso Único Estrito:</strong> Invalidação e destruição automática após o 1º clique.</li>
                <li><strong>Anti-Personificação:</strong> Protege o aluno contra lavratura espúria de ata.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleReiniciarFluxo}
              className="inline-flex items-center gap-1.5 text-xs text-[#4A6741] hover:underline font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Digitar outro e-mail institucional</span>
            </button>

          </div>
        )}

      </div>

      {/* ===================================================================== */}
      {/* COMPONENTE VISUAL SECUNDÁRIO: SIMULADOR DA "CAIXA DE ENTRADA"        */}
      {/* ===================================================================== */}
      <div className="bg-[#FAF9F6] border border-[#DED8CD] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Barra superior do Webmail Simulado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EBE6DD] pb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A6741] text-white flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#2D2A26] font-mono">
                Caixa de Entrada (@universidade.edu.br)
              </h3>
              <p className="text-[11px] text-[#8C8579]">
                Simulador de Webmail Institucional (Ambiente de Demonstração AppSec)
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white border border-[#DED8CD] text-[#645e54] self-start sm:self-auto">
            Status: {magicLinkEnviado ? 'Novo e-mail recebido (1)' : 'Aguardando envio'}
          </span>
        </div>

        {/* Conteúdo do E-mail Fictício */}
        {magicLinkEnviado && dispatchResult ? (
          <div className="bg-white rounded-2xl border border-[#EBE6DD] p-5 sm:p-7 space-y-6 shadow-xs animate-in fade-in duration-300">
            
            {/* Metadados do E-mail */}
            <div className="border-b border-[#F2EDE4] pb-4 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[#8C8579] gap-1">
                <span><strong>De:</strong> Provedor de Identidade Universitário &lt;sso-seguro@universidade.edu.br&gt;</span>
                <span className="font-mono text-[10px]">Recebido agora (TTL: 10 min)</span>
              </div>
              <div className="text-[#8C8579]">
                <strong>Para:</strong> {dispatchResult.emailDestino}
              </div>
              <div className="text-[#2D2A26] font-bold text-sm pt-1">
                Assunto: Link de Acesso Seguro - Registro de Ata de Reunião Acadêmica
              </div>
            </div>

            {/* Corpo do E-mail */}
            <div className="space-y-4 text-xs sm:text-sm text-[#2D2A26] leading-relaxed">
              <p>
                Prezado(a) membro acadêmico,
              </p>
              <p>
                Foi solicitada uma autenticação sem senha (<em>Magic Link</em>) para acessar o módulo de criação, assinatura e lavratura de Atas de Reunião Acadêmica com registro imutável na Blockchain.
              </p>
              
              {/* Aviso de Segurança Institucional */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Aviso de Segurança (AppSec):</strong> Este link é estritamente confidencial, de uso único (One-Time Token) e expira automaticamente em 10 minutos. O token é invalidado e expurgado da memória no instante do primeiro clique para impedir ataques de repetição (<em>Replay Attacks</em>).
                </div>
              </div>

              {/* Botão de Ação do Magic Link */}
              <div className="py-3 text-center sm:text-left space-y-3">
                <button
                  id="btn-clicar-magic-link"
                  type="button"
                  disabled={isValidatingToken}
                  onClick={() => handleClicarMagicLink(rawTokenUrl)}
                  className="px-6 py-3.5 rounded-xl bg-[#4A6741] hover:bg-[#3d5536] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 group"
                >
                  {isValidatingToken ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Processando e Validando Token...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Acessar Sistema com Magic Link</span>
                      <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                    </>
                  )}
                </button>

                {/* Exibição da URL bruta com token para auditoria */}
                <div className="pt-2">
                  <label className="block text-[10px] font-mono text-[#8C8579] uppercase font-bold mb-1">
                    URL Transmitida (Parâmetro ?token=...):
                  </label>
                  <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#DED8CD] font-mono text-[11px] text-[#2D2A26] break-all select-all">
                    {rawTokenUrl}
                  </div>
                </div>
              </div>

              {/* Mensagem de Feedback da Validação */}
              {inboxStatusMessage && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
                  inboxErrorType 
                    ? 'bg-rose-50 border border-rose-300 text-rose-800' 
                    : 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                }`}>
                  {inboxErrorType ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <div className="leading-relaxed font-medium">
                    {inboxStatusMessage}
                  </div>
                </div>
              )}

              {/* Controles de Teste de Ataque e Resiliência */}
              <div className="pt-4 border-t border-[#F2EDE4] space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8C8579] uppercase font-bold">
                  <Terminal className="w-3.5 h-3.5 text-[#4A6741]" />
                  <span>Painel de Testabilidade de Segurança (AppSec):</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSimularAtaqueReplay}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Tenta consumir novamente um token já invalidado para demonstrar o bloqueio de Replay Attack"
                  >
                    <span>Testar Replay Attack (2º Clique)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSimularExpiracaoTemporal}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Simula a expiração temporal após a janela estrita de 10 minutos"
                  >
                    <span>Testar Expiração (&gt; 10 min)</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-[#DED8CD] p-8 text-center text-xs text-[#8C8579] space-y-2">
            <Mail className="w-8 h-8 text-[#DED8CD] mx-auto" />
            <p className="font-medium text-[#645e54]">
              Nenhum Magic Link gerado ainda.
            </p>
            <p className="text-[11px]">
              Preencha seu e-mail acadêmico acima e clique em "Solicitar Acesso Seguro" para disparar a mensagem simulada.
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
