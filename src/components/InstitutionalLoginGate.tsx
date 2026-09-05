import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  KeyRound, 
  Building2, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Lock,
  Mail,
  UserCheck,
  Fingerprint,
  Info
} from 'lucide-react';
import { InstitutionalUser } from '../types';
import { 
  mockInstitutionalLogin, 
  INSTITUTIONAL_PROFILES, 
  generateMockWallet 
} from '../utils/auth';
import { LogoPlaceholder } from './LogoPlaceholder';

interface InstitutionalLoginGateProps {
  onLoginSuccess: (user: InstitutionalUser) => void;
}

export const InstitutionalLoginGate: React.FC<InstitutionalLoginGateProps> = ({
  onLoginSuccess
}) => {
  const [selectedEmail, setSelectedEmail] = useState<string>(INSTITUTIONAL_PROFILES[0].email);
  const [customEmail, setCustomEmail] = useState<string>('');
  const [useCustomEmail, setUseCustomEmail] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const handlePerformLogin = async () => {
    setIsLoading(true);
    setLoadingStep('Consultando Provedor de Identidade Institucional (SSO)...');

    const emailToUse = useCustomEmail ? customEmail : selectedEmail;

    setTimeout(() => {
      setLoadingStep('Autenticação concedida. Derivando par de chaves e carteira Web3...');
    }, 450);

    try {
      const user = await mockInstitutionalLogin(emailToUse);
      setLoadingStep('Vínculo de identidade e chave pública concluído!');
      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(user);
      }, 300);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      alert('Erro na autenticação simulada.');
    }
  };

  const previewAddress = generateMockWallet(useCustomEmail ? (customEmail || 'joao.silva@universidade.edu.br') : selectedEmail);

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      
      {/* Container Principal do Card de Login */}
      <div className="bg-white border border-[#EBE6DD] rounded-3xl shadow-sm p-6 sm:p-10 relative overflow-hidden">
        
        {/* Faixa decorativa superior */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#4A6741] via-[#5b7e50] to-[#2D2A26]" />

        {/* Header com Logo e Brasão */}
        <div className="text-center space-y-3 pb-6 border-b border-[#F2EDE4]">
          <div className="flex justify-center">
            <LogoPlaceholder size="lg" className="shadow-xs" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4A6741]/10 text-[#4A6741] font-mono text-[11px] font-semibold border border-[#4A6741]/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Autenticação Acadêmica Centralizada (SSO)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif italic text-[#2D2A26] tracking-tight">
              Acesso ao Registro de Atas
            </h1>
            <p className="text-xs sm:text-sm text-[#8C8579] max-w-md mx-auto mt-1 leading-relaxed">
              Para lavrar, assinar ou submeter atas acadêmicas na Blockchain, autentique-se com sua credencial institucional universitária.
            </p>
          </div>
        </div>

        {/* Corpo da Autenticação */}
        <div className="py-6 space-y-5">
          
          {/* Alerta de bloqueio probatório */}
          <div className="bg-[#FAF9F6] border border-[#EBE6DD] rounded-2xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#4A6741] shrink-0 mt-0.5" />
            <div className="text-xs text-[#645e54] leading-relaxed">
              <span className="font-bold text-[#2D2A26] block mb-0.5">
                Formulário da Ata Protegido por Identidade
              </span>
              O formulário de registro de ata permanece oculto até que a identidade do signatário seja comprovada via login institucional.
            </div>
          </div>

          {/* Seleção de Perfil Institucional Simulado */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#2D2A26] uppercase font-mono tracking-wider">
                Selecione o Usuário Institucional:
              </label>
              <button
                type="button"
                onClick={() => setUseCustomEmail(!useCustomEmail)}
                className="text-[11px] text-[#4A6741] hover:underline font-semibold cursor-pointer"
              >
                {useCustomEmail ? 'Usar Perfis Prontos' : 'Digitar Outro E-mail'}
              </button>
            </div>

            {!useCustomEmail ? (
              <div className="space-y-2">
                {INSTITUTIONAL_PROFILES.map((profile) => {
                  const isSelected = selectedEmail === profile.email;
                  return (
                    <button
                      key={profile.email}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setSelectedEmail(profile.email)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-[#4A6741] bg-[#4A6741]/5 ring-1 ring-[#4A6741]'
                          : 'border-[#EBE6DD] bg-[#FAF9F6] hover:bg-white hover:border-[#DED8CD]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-[#4A6741] text-white' : 'bg-[#EBE6DD] text-[#645e54]'
                        }`}>
                          {profile.nome.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-[#2D2A26] flex items-center gap-2">
                            <span>{profile.nome}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full uppercase font-mono font-bold bg-[#EBE6DD] text-[#645e54]">
                              {profile.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8C8579] font-mono">
                            {profile.email} &middot; {profile.matricula}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#4A6741] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#8C8579] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="ex: seu.nome@universidade.edu.br"
                    className="w-full text-xs sm:text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DED8CD] bg-[#FAF9F6] text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                </div>
                <p className="text-[10px] text-[#8C8579]">
                  Qualquer e-mail digitado simulará uma conta institucional correspondente.
                </p>
              </div>
            )}
          </div>

          {/* Prévia do Vínculo Criptográfico da Carteira */}
          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#EBE6DD] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-[#8C8579] uppercase font-bold flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-[#4A6741]" />
                Vínculo Automático com Carteira Ethereum:
              </span>
              <span className="text-emerald-700 font-bold font-mono text-[10px]">
                Deterministic Key Derivation
              </span>
            </div>
            <div className="font-mono text-[11px] text-[#2D2A26] break-all bg-white p-2 rounded-lg border border-[#EBE6DD]">
              {previewAddress}
            </div>
          </div>

          {/* Botão Principal de Login com E-mail Institucional */}
          <button
            id="btn-institutional-login"
            type="button"
            disabled={isLoading}
            onClick={handlePerformLogin}
            className="w-full py-4 px-6 rounded-2xl bg-[#4A6741] hover:bg-[#3d5536] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group min-h-[52px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Autenticando via SSO Universitário...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>Login com E-mail Institucional</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {/* Status do Loading */}
          {isLoading && (
            <div className="text-center">
              <p className="text-xs text-[#4A6741] font-medium font-mono animate-pulse">
                {loadingStep}
              </p>
            </div>
          )}

          {/* Rodapé Informativo / Prova de Conceito */}
          <div className="pt-4 border-t border-[#F2EDE4] flex items-start gap-2 text-[11px] text-[#8C8579] leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-[#4A6741] mt-0.5" />
            <p>
              <strong>Ambiente de Prova de Conceito Acadêmica:</strong> Em produção, este componente integra protocolos federados (SAML 2.0 / Shibboleth / OpenID Connect) vinculados a chaves não-custodiais (Web3Auth / ERC-4337 Account Abstraction), gerando assinatura incontestável da autoridade acadêmica.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
