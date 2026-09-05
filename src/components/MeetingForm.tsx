import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Send, 
  Hash, 
  Sparkles, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  ListChecks, 
  Plus, 
  Trash2, 
  Info, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  HelpCircle,
  Cpu,
  UserCheck,
  LogOut,
  Fingerprint,
  CloudUpload,
  Key,
  Database,
  LockKeyhole
} from 'lucide-react';
import { AcademicMeetingData, Participant, ActionItem, WalletState, InstitutionalUser } from '../types';
import { 
  buildCanonicalMeetingString, 
  calculateSha256, 
  calculateKeccak256, 
  sanitizeForHashing, 
  concatenateMeetingData 
} from '../utils/crypto';
import { generateQrCodeDataUrl } from '../utils/qrCode';
import { encryptDocument, uploadToIPFSMock } from '../utils/ipfs';

interface MeetingFormProps {
  wallet: WalletState;
  onConnectWallet: () => void;
  onSubmitMeeting: (
    formData: AcademicMeetingData, 
    hash: string, 
    canonicalString: string,
    ipfsCID?: string,
    encryptedBase64?: string,
    encryptionKeyHint?: string
  ) => Promise<void>;
  isSubmitting: boolean;
  institutionalUser?: InstitutionalUser | null;
  onLogoutInstitutional?: () => void;
}

export const MeetingForm: React.FC<MeetingFormProps> = ({
  wallet,
  onConnectWallet,
  onSubmitMeeting,
  isSubmitting,
  institutionalUser,
  onLogoutInstitutional
}) => {
  // Estado inicial do formulário
  const [formData, setFormData] = useState<AcademicMeetingData>({
    dateTime: new Date().toISOString().slice(0, 16),
    title: 'Orientação de TCC - Definição da Arquitetura do Sistema',
    meetingType: 'Orientação',
    academicUnit: 'Departamento de Ciência da Computação - DCC / UF',
    participants: [
      { id: '1', role: 'Aluno', name: 'Lucas Gabriel Silveira', departmentOrId: 'Matrícula: 2021049281', checked: true },
      { id: '2', role: 'Professor', name: 'Profa. Dra. Mariana Esteves Ramos', departmentOrId: 'SIAPE: 1982731', checked: true }
    ],
    summaryAndDecisions: 'Apresentação do estado da arte sobre autenticação Web3. Foi deliberado o uso de hashing off-chain (Keccak-256) acoplado a registro de prova de existência em smart contract EVM para conformidade com a LGPD e otimização de gás. Próxima entrega focará na modelagem do banco de dados e testes unitários.',
    actionChecklist: [
      { id: 'a1', label: 'Aprovar plano de trabalho preliminar', completed: true, responsible: 'Prof. Orientador' },
      { id: 'a2', label: 'Revisão bibliográfica entregue e validada', completed: true, responsible: 'Aluno' },
      { id: 'a3', label: 'Definição de cronograma e marcos do semestre', completed: true, responsible: 'Ambos' },
      { id: 'a4', label: 'Ajustes no texto da introdução e metodologia', completed: false, responsible: 'Aluno' },
      { id: 'a5', label: 'Próxima entrega e sincronização agendada', completed: true, responsible: 'Ambos' }
    ],
    extraNotes: 'Reunião realizada em ambiente híbrido (sala 204 e Google Meet). Documento formal assinado via chave criptográfica.'
  });

  const [currentHashSha256, setCurrentHashSha256] = useState<string>('');
  const [currentHashKeccak, setCurrentHashKeccak] = useState<string>('');
  const [canonicalPreview, setCanonicalPreview] = useState<string>('');
  const [sanitizedPreview, setSanitizedPreview] = useState<string>('');
  const [inspectorTab, setInspectorTab] = useState<'sanitized' | 'json' | 'encrypted'>('sanitized');
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [hashAlgorithm, setHashAlgorithm] = useState<'Keccak-256' | 'SHA-256'>('Keccak-256');
  const [newActionLabel, setNewActionLabel] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [liveQrCodeUrl, setLiveQrCodeUrl] = useState<string>('');

  // Disponibilidade de Dados: Criptografia e Mock de IPFS
  const [ipfsPassword, setIpfsPassword] = useState<string>('chave-academica-segura-2026');
  const [encryptedBase64Preview, setEncryptedBase64Preview] = useState<string>('');
  const [submissionStatusMessage, setSubmissionStatusMessage] = useState<string | null>(null);
  const [lastGeneratedCID, setLastGeneratedCID] = useState<string | null>(null);

  // Recalcula a string concatenada, aplica a sanitização obrigatória e gera os hashes
  useEffect(() => {
    // 1. Concatena os campos estruturados da ata em uma string única linear
    const rawConcatenated = concatenateMeetingData(formData);

    // 2. OBRIGATÓRIO: Passa pela função sanitizeForHashing() (trim + regex /\s+/g + lowercase)
    const cleanText = sanitizeForHashing(rawConcatenated);
    setSanitizedPreview(cleanText);

    // Gera o preview criptografado simulado (Base64)
    const encrypted = encryptDocument(cleanText, ipfsPassword);
    setEncryptedBase64Preview(encrypted);

    // Também mantemos o payload JSON canônico para visualização estruturada
    const canonical = buildCanonicalMeetingString(formData);
    setCanonicalPreview(canonical);

    // 3. Geração dos hashes a partir do texto sanitizado
    calculateSha256(cleanText).then(sha => {
      setCurrentHashSha256(sha);
    });

    const keccak = calculateKeccak256(cleanText);
    setCurrentHashKeccak(keccak);
  }, [formData, ipfsPassword]);

  // Gera o QR code dinâmico da prova de existência
  useEffect(() => {
    const chosenHash = hashAlgorithm === 'Keccak-256' ? currentHashKeccak : currentHashSha256;
    if (chosenHash) {
      const explorerDemoUrl = `https://sepolia.etherscan.io/address/0x3a48981A4aE8e08Fa6714E69719F8a0fF08d74B2#hash=${chosenHash}`;
      generateQrCodeDataUrl(explorerDemoUrl).then(url => {
        setLiveQrCodeUrl(url);
      });
    }
  }, [currentHashKeccak, currentHashSha256, hashAlgorithm]);

  // Carrega exemplo acadêmico alternativo
  const loadExample = (type: 'orientacao' | 'feedback' | 'banca') => {
    if (type === 'orientacao') {
      setFormData({
        dateTime: new Date().toISOString().slice(0, 16),
        title: 'Orientação Mensal - Projeto Final de Engenharia de Software',
        meetingType: 'Orientação',
        academicUnit: 'Instituto de Informática - Campus Central',
        participants: [
          { id: '1', role: 'Aluno', name: 'Ana Beatriz Souza', departmentOrId: 'Matrícula: 202210103', checked: true },
          { id: '2', role: 'Professor', name: 'Prof. Dr. Roberto Albuquerque', departmentOrId: 'SIAPE: 334109', checked: true }
        ],
        summaryAndDecisions: 'Alinhamento dos objetivos específicos do trabalho de conclusão de curso. Decidido adotar arquitetura de microsserviços e validação via smart contract em testnet pública.',
        actionChecklist: [
          { id: 'a1', label: 'Aprovar plano de trabalho preliminar', completed: true, responsible: 'Professor' },
          { id: 'a2', label: 'Revisão bibliográfica entregue e validada', completed: true, responsible: 'Aluno' },
          { id: 'a3', label: 'Definição de cronograma e marcos do semestre', completed: true, responsible: 'Ambos' },
          { id: 'a4', label: 'Ajustes no texto da introdução e metodologia', completed: false, responsible: 'Aluno' }
        ],
        extraNotes: 'Ata protocolada digitalmente.'
      });
    } else if (type === 'feedback') {
      setFormData({
        dateTime: new Date().toISOString().slice(0, 16),
        title: 'Sessão de Feedback e Avaliação Formativa - Estágio Supervisionado',
        meetingType: 'Feedback',
        academicUnit: 'Coordenação de Graduação em Sistemas de Informação',
        participants: [
          { id: '1', role: 'Aluno', name: 'Carlos Eduardo Mendes', departmentOrId: 'Matrícula: 202020941', checked: true },
          { id: '2', role: 'Professor', name: 'Profa. Me. Camila Fontes', departmentOrId: 'SIAPE: 981120', checked: true }
        ],
        summaryAndDecisions: 'Avaliação dos relatórios de progresso quinzenais do estágio. Desempenho satisfatório nas entregas de backlog. Recomenda-se maior aprofundamento na análise de segurança de dados.',
        actionChecklist: [
          { id: 'a1', label: 'Aprovar relatório de atividades do estágio', completed: true, responsible: 'Orientador' },
          { id: 'a2', label: 'Incluir métricas quantitativas no relatório final', completed: false, responsible: 'Aluno' },
          { id: 'a3', label: 'Próxima entrega de relatório agendada para o dia 20', completed: true, responsible: 'Aluno' }
        ],
        extraNotes: 'Feedback homologado pelo colegiado.'
      });
    } else {
      setFormData({
        dateTime: new Date().toISOString().slice(0, 16),
        title: 'Reunião de Sincronização e Parecer de Qualificação de Mestrado',
        meetingType: 'Sincronização',
        academicUnit: 'Programa de Pós-Graduação em Computação Aplicada (PPGCA)',
        participants: [
          { id: '1', role: 'Aluno', name: 'Juliana Vieira Lima', departmentOrId: 'Matrícula: 202409001', checked: true },
          { id: '2', role: 'Professor', name: 'Prof. Dr. Henrique Vasconcelos', departmentOrId: 'Orientador - SIAPE: 441092', checked: true }
        ],
        summaryAndDecisions: 'Revisão dos capítulos 1 e 2 da dissertação. O comitê de orientação aprovou o direcionamento dos experimentos computacionais. A data prevista para defesa da qualificação foi fixada.',
        actionChecklist: [
          { id: 'a1', label: 'Aprovar plano de trabalho preliminar', completed: true, responsible: 'Comitê' },
          { id: 'a2', label: 'Revisão bibliográfica entregue e validada', completed: true, responsible: 'Aluna' },
          { id: 'a3', label: 'Definição de cronograma e marcos da qualificação', completed: true, responsible: 'Orientador' },
          { id: 'a4', label: 'Submissão de artigo para conferência Qualis A2', completed: false, responsible: 'Ambos' }
        ],
        extraNotes: 'Ata de registro probatório com hash em blockchain.'
      });
    }
  };

  // Toggle do checkbox de participante
  const handleParticipantToggle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === id ? { ...p, checked: !p.checked } : p
      )
    }));
  };

  // Atualiza nome ou id do participante
  const handleParticipantChange = (id: string, field: 'name' | 'departmentOrId', value: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map(p => 
        p.id === id ? { ...p, [field]: value } : p
      )
    }));
  };

  // Adiciona novo participante
  const handleAddParticipant = () => {
    const newId = Date.now().toString();
    setFormData(prev => ({
      ...prev,
      participants: [
        ...prev.participants,
        { id: newId, role: 'Orientador', name: '', departmentOrId: '', checked: true }
      ]
    }));
  };

  // Remove participante
  const handleRemoveParticipant = (id: string) => {
    if (formData.participants.length <= 2) {
      alert('A ata deve conter pelo menos Aluno e Professor.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.id !== id)
    }));
  };

  // Toggle da checklist de ações
  const handleActionToggle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      actionChecklist: prev.actionChecklist.map(a => 
        a.id === id ? { ...a, completed: !a.completed } : a
      )
    }));
  };

  // Adiciona nova ação à checklist
  const handleAddAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionLabel.trim()) return;
    const newAction: ActionItem = {
      id: Date.now().toString(),
      label: newActionLabel.trim(),
      completed: false,
      responsible: 'Ambos'
    };
    setFormData(prev => ({
      ...prev,
      actionChecklist: [...prev.actionChecklist, newAction]
    }));
    setNewActionLabel('');
  };

  // Remove ação da checklist
  const handleRemoveAction = (id: string) => {
    setFormData(prev => ({
      ...prev,
      actionChecklist: prev.actionChecklist.filter(a => a.id !== id)
    }));
  };

  // Submissão do formulário com Criptografia e Mock de IPFS
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validação básica
    if (!formData.title.trim()) {
      setFormError('Por favor, informe o Título da Reunião.');
      return;
    }

    const activeParticipants = formData.participants.filter(p => p.checked && p.name.trim().length > 0);
    if (activeParticipants.length === 0) {
      setFormError('Selecione e informe o nome de pelo menos um participante (Aluno ou Professor).');
      return;
    }

    if (!formData.summaryAndDecisions.trim()) {
      setFormError('Por favor, descreva o Resumo e as Decisões da reunião.');
      return;
    }

    const chosenHash = hashAlgorithm === 'Keccak-256' ? currentHashKeccak : currentHashSha256;

    try {
      // (A) Criptografa os dados com a senha informada
      setSubmissionStatusMessage('Criptografando texto da ata e gerando payload ofuscado (Base64)...');
      const payloadCriptografado = encryptDocument(sanitizedPreview, ipfsPassword);

      // (B) Upload simulado para a rede descentralizada IPFS
      setSubmissionStatusMessage('Enviando documento criptografado para o IPFS (simulando nó IPFS)...');
      const ipfsCID = await uploadToIPFSMock(payloadCriptografado);
      setLastGeneratedCID(ipfsCID);

      // (C) Exibe na tela a mensagem exigida com o CID retornado
      setSubmissionStatusMessage(`Ata salva no IPFS! CID: ${ipfsCID} Preparando transação para a Blockchain...`);

      // Breve pausa para garantir percepção e leitura visual clara do status
      await new Promise(resolve => setTimeout(resolve, 1400));

      // (D) Chama o handler de transação da blockchain gravando o CID
      await onSubmitMeeting(
        formData, 
        chosenHash, 
        sanitizedPreview, 
        ipfsCID, 
        payloadCriptografado, 
        ipfsPassword
      );
    } catch (err: any) {
      setFormError(`Erro durante o processamento da ata: ${err.message}`);
    } finally {
      setSubmissionStatusMessage(null);
    }
  };

  const selectedHash = hashAlgorithm === 'Keccak-256' ? currentHashKeccak : currentHashSha256;

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-8">
      
      {/* Top Banner / Template Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 border-b border-[#EBE6DD]">
        <div>
          <h1 className="text-lg sm:text-2xl font-serif italic text-[#2D2A26] tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#4A6741] shrink-0" />
            <span>Registro de Ata de Reunião Acadêmica</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8C8579] mt-1">
            Preencha os termos deliberados. Apenas a assinatura criptográfica (Hash de 32 bytes) será imutavelmente gravada na blockchain.
          </p>
        </div>

        {/* Quick Load Example Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto flex-wrap pt-1 sm:pt-0">
          <span className="text-[11px] sm:text-xs font-bold text-[#8C8579] uppercase tracking-wider mr-1">
            Modelos:
          </span>
          <button
            type="button"
            onClick={() => loadExample('orientacao')}
            className="px-3 py-1.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-[#F2EDE4] hover:bg-[#E5DFD3] text-[#3C3833] border border-[#DED8CD] transition-colors cursor-pointer min-h-[36px] flex items-center"
            title="Carregar ata de Orientação"
          >
            Orientação
          </button>
          <button
            type="button"
            onClick={() => loadExample('feedback')}
            className="px-3 py-1.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-[#F2EDE4] hover:bg-[#E5DFD3] text-[#3C3833] border border-[#DED8CD] transition-colors cursor-pointer min-h-[36px] flex items-center"
            title="Carregar ata de Feedback"
          >
            Feedback
          </button>
          <button
            type="button"
            onClick={() => loadExample('banca')}
            className="px-3 py-1.5 sm:py-1.5 text-xs font-semibold rounded-lg bg-[#F2EDE4] hover:bg-[#E5DFD3] text-[#3C3833] border border-[#DED8CD] transition-colors cursor-pointer min-h-[36px] flex items-center"
            title="Carregar ata de Sincronização"
          >
            Sincronização
          </button>
        </div>
      </div>

      {/* Identidade Institucional Comprovada (Exibição Obrigatória do Requisito) */}
      {institutionalUser && (
        <div 
          id="institutional-identity-badge" 
          className="mb-5 p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#4A6741] text-[#2D2A26] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4A6741] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs sm:text-sm text-[#2D2A26] flex items-center gap-2 flex-wrap">
                <span className="font-semibold">
                  Logado como: <strong className="text-[#4A6741] font-bold">{institutionalUser.nome}</strong>
                </span>
                <span className="text-[#8C8579] font-mono text-xs hidden md:inline">
                  ({institutionalUser.email})
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#4A6741]/10 text-[#4A6741] font-bold border border-[#4A6741]/20">
                  {institutionalUser.role}
                </span>
              </div>
              <div className="text-xs text-[#645e54] font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[#8C8579] font-sans text-xs">Carteira Vinculada:</span>
                <span className="font-bold text-[#2D2A26] bg-[#FAF9F6] px-2 py-0.5 rounded-md border border-[#EBE6DD] select-all break-all">
                  {institutionalUser.walletAddress}
                </span>
              </div>
            </div>
          </div>

          {onLogoutInstitutional && (
            <button
              id="btn-logout-institutional"
              type="button"
              onClick={onLogoutInstitutional}
              className="self-end sm:self-auto text-xs font-semibold px-3.5 py-2 rounded-xl border border-rose-200 hover:border-rose-400 text-rose-700 hover:text-rose-800 bg-rose-50/70 hover:bg-rose-100/80 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              title="Desconectar e retornar para a página inicial para informar outro e-mail e selecionar outro usuário"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Desconectar / Trocar Usuário</span>
            </button>
          )}
        </div>
      )}

      {/* Regra de Ouro da Blockchain Notice */}
      <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-[#F2EDE4]/70 border border-[#DED8CD] text-[#3C3833] text-xs sm:text-sm flex items-start gap-2.5 sm:gap-3 shadow-xs">
        <Lock className="w-5 h-5 text-[#4A6741] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#2D2A26] flex items-center gap-2 flex-wrap">
            <span>Regra de Ouro do Registro em Blockchain:</span>
            <span className="px-2 py-0.5 rounded bg-[#4A6741]/15 text-[#4A6741] font-mono text-[11px] sm:text-xs font-bold">
              EVM Gas Optimization
            </span>
          </div>
          <p className="text-[#645e54] leading-relaxed text-xs sm:text-sm">
            O texto integral e dados pessoais permanecem privados sob custódia do usuário. O Smart Contract armazena exclusivamente o 
            <span className="font-mono font-bold text-[#2D2A26] mx-1">hash criptográfico bytes32</span>, garantindo timestamp oficial, integridade matemática e economia de até 99.8% no custo de gás da rede.
          </p>
        </div>
      </div>

      {/* Responsive 2-Column Layout matching Design HTML */}
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
        
        {/* Left Section: Main Form */}
        <section className="w-full lg:w-3/5 flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 sm:p-8 border border-[#EBE6DD] shadow-sm flex flex-col gap-5 sm:gap-6">
            
            <div className="flex items-center justify-between border-b border-[#F2EDE4] pb-3">
              <h2 className="text-lg font-serif italic text-[#4A6741]">
                Formulário de Registro
              </h2>
              <span className="text-[11px] uppercase tracking-wider text-[#8C8579] font-mono">
                Padrão: <strong className="text-[#4A6741]">{hashAlgorithm}</strong>
              </span>
            </div>

            {/* SEÇÃO 1: Identificação Básica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579] mb-2">
                  Data / Hora *
                </label>
                <input
                  id="input-datetime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  className="w-full bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-4 py-2.5 text-sm text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579] mb-2">
                  Tipo de Reunião *
                </label>
                <select
                  id="select-meeting-type"
                  value={formData.meetingType}
                  onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as any })}
                  className="w-full bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-4 py-2.5 text-sm text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741] font-medium cursor-pointer"
                >
                  <option value="Orientação">Orientação</option>
                  <option value="Feedback">Feedback</option>
                  <option value="Sincronização">Sincronização</option>
                  <option value="Banca / Defesa">Banca / Defesa</option>
                  <option value="Reunião de Colegiado">Reunião de Colegiado</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579] mb-2">
                  Unidade Acadêmica / Programa
                </label>
                <input
                  id="input-academic-unit"
                  type="text"
                  value={formData.academicUnit}
                  onChange={(e) => setFormData({ ...formData, academicUnit: e.target.value })}
                  placeholder="Ex: Departamento de Computação - Campus Central"
                  className="w-full bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-4 py-2.5 text-sm text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579] mb-2">
                  Título da Reunião *
                </label>
                <input
                  id="input-meeting-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Alinhamento de Tese - Semestre 2"
                  className="w-full bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-4 py-2.5 text-sm text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741] font-medium"
                  required
                />
              </div>
            </div>

            {/* SEÇÃO 2: Participantes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579]">
                  Participantes
                </label>
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="text-xs font-semibold text-[#4A6741] hover:text-[#3d5536] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.participants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className={`flex items-center gap-3 p-3 bg-[#FAF9F6] rounded-lg border border-[#F2EDE4] transition-all ${
                      !participant.checked ? 'opacity-60' : ''
                    }`}
                  >
                    <input
                      id={`checkbox-participant-${participant.id}`}
                      type="checkbox"
                      checked={participant.checked}
                      onChange={() => handleParticipantToggle(participant.id)}
                      className="accent-[#4A6741] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold w-14 text-[#2D2A26] select-none">
                      {participant.role}
                    </span>
                    <input
                      type="text"
                      value={participant.name}
                      disabled={!participant.checked}
                      onChange={(e) => handleParticipantChange(participant.id, 'name', e.target.value)}
                      placeholder={`Nome do ${participant.role.toLowerCase()}`}
                      className="bg-transparent border-none text-sm text-[#2D2A26] focus:outline-none w-full placeholder:text-[#8C8579]"
                    />
                    {formData.participants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="p-1 text-[#8C8579] hover:text-rose-600 rounded transition-colors"
                        title="Remover participante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 3: Resumo e Decisões */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579]">
                  Resumo e Decisões *
                </label>
                <span className="text-[11px] text-[#8C8579]">
                  {formData.summaryAndDecisions.length} caracteres
                </span>
              </div>
              <textarea
                id="textarea-summary"
                rows={4}
                value={formData.summaryAndDecisions}
                onChange={(e) => setFormData({ ...formData, summaryAndDecisions: e.target.value })}
                placeholder="Definição do cronograma de coleta de dados para o capítulo 3. Ajuste na metodologia qualitativa conforme sugestão do orientador."
                className="w-full bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-4 py-3 text-sm text-[#2D2A26] leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                required
              />
            </div>

            {/* SEÇÃO 4: Checklist de Ações */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579]">
                  Checklist de Ações
                </label>
                <span className="text-xs text-[#8C8579]">
                  {formData.actionChecklist.filter(a => a.completed).length} de {formData.actionChecklist.length} concluídas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.actionChecklist.map((action) => (
                  <div
                    key={action.id}
                    onClick={() => handleActionToggle(action.id)}
                    className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      action.completed
                        ? 'bg-[#FAF9F6] border-[#4A6741]/30 text-[#2D2A26]'
                        : 'bg-white border-[#EBE6DD] text-[#645e54] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id={`action-${action.id}`}
                        checked={action.completed}
                        onChange={() => {}} // handled by parent onClick
                        className="accent-[#4A6741] w-4 h-4 mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className={`text-xs sm:text-sm font-medium ${action.completed ? 'text-[#2D2A26]' : 'text-[#645e54]'}`}>
                          {action.label}
                        </span>
                        {action.responsible && (
                          <div className="text-[11px] text-[#8C8579] mt-0.5 font-normal">
                            Responsável: <span className="font-semibold text-[#3C3833]">{action.responsible}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAction(action.id);
                      }}
                      className="text-[#8C8579] hover:text-rose-600 p-0.5"
                      title="Remover ação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar nova ação */}
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <input
                  type="text"
                  value={newActionLabel}
                  onChange={(e) => setNewActionLabel(e.target.value)}
                  placeholder="Adicionar deliberação ou ação..."
                  className="flex-1 bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAction(e);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddAction}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#F2EDE4] hover:bg-[#E5DFD3] border border-[#DED8CD] rounded-lg text-xs font-semibold text-[#3C3833] flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[40px]"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>

            {/* SEÇÃO 5: Observações Finais */}
            <div>
              <label className="block text-xs uppercase tracking-widest font-bold text-[#8C8579] mb-2">
                Observações Finais / Local / Link
              </label>
              <input
                type="text"
                value={formData.extraNotes || ''}
                onChange={(e) => setFormData({ ...formData, extraNotes: e.target.value })}
                placeholder="Ex: Reunião remota via Google Meet. Link gravado em repositório institucional."
                className="w-full bg-[#FDFCFB] border border-[#DED8CD] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
              />
            </div>

            {/* SEÇÃO 6: Disponibilidade de Dados & Armazenamento Descentralizado (IPFS Criptografado) */}
            <div className="p-4 sm:p-5 rounded-xl border-2 border-[#4A6741]/30 bg-[#FAF9F6] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EBF1EA] text-[#4A6741] flex items-center justify-center font-bold">
                    <CloudUpload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#2D2A26] flex items-center gap-1.5">
                      <span>Disponibilidade de Dados: IPFS Criptografado</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#4A6741]/10 text-[#4A6741] font-semibold border border-[#4A6741]/20">
                        Off-Chain Storage
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#8C8579]">
                      Evita a perda do texto original pelo aluno. O texto é ofuscado/criptografado localmente e enviado ao IPFS. Apenas o CID é gravado na blockchain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#2D2A26] mb-1.5 flex items-center gap-1">
                    <Key className="w-3 h-3 text-[#4A6741]" />
                    Senha de Criptografia da Ata
                  </label>
                  <input
                    type="text"
                    value={ipfsPassword}
                    onChange={(e) => setIpfsPassword(e.target.value)}
                    placeholder="Defina uma chave de proteção"
                    className="w-full bg-white border border-[#DED8CD] rounded-lg px-3 py-2 text-xs font-mono text-[#2D2A26] focus:outline-none focus:ring-1 focus:ring-[#4A6741]"
                  />
                  <span className="text-[10px] text-[#8C8579]">Usada no front-end para ofuscar o payload antes do upload.</span>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#2D2A26] mb-1.5 flex items-center gap-1">
                    <Database className="w-3 h-3 text-[#4A6741]" />
                    Identificador de Conteúdo (CID Previsto)
                  </label>
                  <div className="w-full bg-white border border-[#DED8CD] rounded-lg px-3 py-2 text-xs font-mono text-[#4A6741] truncate bg-opacity-70">
                    {lastGeneratedCID || 'ipfs://Qm...(gerado ao clicar em enviar)'}
                  </div>
                  <span className="text-[10px] text-[#8C8579]">Este CID será persistido na struct do Smart Contract.</span>
                </div>
              </div>

              {/* Mini Preview do Base64 Ofuscado */}
              <div className="pt-2 border-t border-[#EBE6DD]">
                <div className="flex items-center justify-between text-[11px] text-[#8C8579] mb-1">
                  <span className="flex items-center gap-1">
                    <LockKeyhole className="w-3 h-3 text-[#4A6741]" />
                    <span>Payload Criptografado Simulado (Base64 enviado ao IPFS):</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#4A6741] font-semibold">
                    {encryptedBase64Preview.length} caracteres
                  </span>
                </div>
                <div className="font-mono text-[10px] text-[#8C8579] bg-white p-2 rounded border border-[#EBE6DD] truncate select-all">
                  {encryptedBase64Preview || 'Aguardando preenchimento do formulário...'}
                </div>
              </div>
            </div>

            {/* Banner de Feedback em Tempo Real da Submissão (Exigido pelo Requisito C) */}
            {submissionStatusMessage && (
              <div 
                id="ipfs-submission-status-banner"
                className="p-4 rounded-xl bg-emerald-50 border-2 border-[#4A6741] text-[#2D2A26] flex items-center gap-3 shadow-md animate-pulse"
              >
                <div className="w-5 h-5 border-2 border-[#4A6741] border-t-transparent rounded-full animate-spin shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-[11px] uppercase font-bold text-[#4A6741] tracking-wider">
                    Processo de Registro Híbrido (IPFS + Blockchain)
                  </div>
                  <div className="text-xs sm:text-sm font-semibold font-mono text-[#2D2A26]">
                    {submissionStatusMessage}
                  </div>
                </div>
              </div>
            )}

            {/* Erros do formulário se houver */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Botão Principal Conforme Design HTML */}
            <button
              id="btn-submit-meeting"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-3 bg-[#4A6741] text-white rounded-xl font-bold tracking-wide hover:bg-[#3d5536] transition-colors shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-xs sm:text-base uppercase text-center leading-snug min-h-[52px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>{submissionStatusMessage || 'Processando envio e gravação...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 shrink-0" />
                  <span>ENVIAR ATA (CRIPTOGRAFAR, UPLOAD IPFS & REGISTRAR)</span>
                </>
              )}
            </button>

          </form>
        </section>

        {/* Right Section: Status da Transação Aside matching Design HTML */}
        <aside className="w-full lg:w-2/5 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="bg-[#3C3833] text-[#F2EDE4] rounded-2xl p-4 sm:p-8 flex flex-col shadow-xl">
            
            {/* Header Status da Transação */}
            <div className="flex items-center justify-between mb-5 sm:mb-6 gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold">Status da Transação</h3>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                isSubmitting 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                  : wallet.isConnected 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/10 text-white/80 border-white/20'
              }`}>
                {isSubmitting ? 'PROCESSANDO...' : wallet.isConnected ? 'CONECTADO' : 'PRONTO PARA REGISTRO'}
              </span>
            </div>

            <div className="space-y-5 sm:space-y-6">
              
              {/* Algoritmo Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                <span className="text-[10px] uppercase tracking-wider text-[#8C8579]">Algoritmo Criptográfico:</span>
                <div className="inline-flex rounded-lg bg-black/30 p-0.5 border border-white/10 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setHashAlgorithm('Keccak-256')}
                    className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors cursor-pointer ${
                      hashAlgorithm === 'Keccak-256'
                        ? 'bg-[#4A6741] text-white shadow-xs'
                        : 'text-[#8C8579] hover:text-white'
                    }`}
                  >
                    Keccak-256 (EVM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHashAlgorithm('SHA-256')}
                    className={`px-2.5 py-1 text-xs rounded font-mono font-medium transition-colors cursor-pointer ${
                      hashAlgorithm === 'SHA-256'
                        ? 'bg-[#4A6741] text-white shadow-xs'
                        : 'text-[#8C8579] hover:text-white'
                    }`}
                  >
                    SHA-256 (Web)
                  </button>
                </div>
              </div>

              {/* Hash do Documento */}
              <div className="space-y-2 pb-5 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-[#8C8579]">
                    Hash do Documento ({hashAlgorithm})
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400">32 bytes</span>
                </div>
                <p className="font-mono text-xs break-all text-white bg-black/30 p-3 rounded-lg border border-white/5 select-all leading-relaxed">
                  {selectedHash}
                </p>
              </div>

              {/* Informações da Blockchain */}
              <div className="space-y-3.5 pb-5 border-b border-white/10 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#8C8579]">Carteira Ativa:</span>
                  {wallet.isConnected ? (
                    <span className="font-mono text-emerald-300 font-semibold">
                      {wallet.address?.substring(0, 6)}...{wallet.address?.substring(wallet.address.length - 4)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onConnectWallet}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                    >
                      Conectar Carteira
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8C8579]">Rede Blockchain:</span>
                  <span className="font-mono text-[#F2EDE4]">{wallet.network.name}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8C8579]">Contrato:</span>
                  <span className="font-mono text-[#F2EDE4]">0x3a48...74B2</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[#8C8579]">Armazenamento:</span>
                  <span className="font-mono text-emerald-300 font-semibold">IPFS (CID) + Hash EVM</span>
                </div>
                {lastGeneratedCID && (
                  <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                    <span className="text-[10px] text-[#8C8579]">Último CID Gravado:</span>
                    <span className="font-mono text-[10px] text-emerald-300 break-all bg-black/40 p-1.5 rounded border border-white/10 select-all">
                      {lastGeneratedCID}
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code de Validação na Testnet Sepolia */}
              <div className="pt-2 flex flex-col items-center justify-center gap-3">
                <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg">
                  {liveQrCodeUrl ? (
                    <img src={liveQrCodeUrl} alt="QR Code de Validação" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-[#FAF9F6] flex items-center justify-center text-[10px] text-[#8C8579]">
                      Carregando...
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-center text-[#8C8579] font-medium leading-relaxed uppercase">
                  Escaneie para validar <br />autenticidade na Testnet Sepolia
                </span>
              </div>

              {/* Inspecionar Dados Normalizados / Sanitizados / Criptografados */}
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInspector(!showInspector)}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#F2EDE4] flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="text-[11px] uppercase tracking-wider text-[#8C8579]">Inspeção de Payloads</span>
                  <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                    {showInspector ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showInspector ? 'Ocultar' : 'Inspecionar'}
                  </span>
                </button>
                {showInspector && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-1 p-1 bg-black/40 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => setInspectorTab('sanitized')}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${
                          inspectorTab === 'sanitized' 
                            ? 'bg-[#4A6741] text-white shadow-xs' 
                            : 'text-[#8C8579] hover:text-white'
                        }`}
                      >
                        Sanitizado
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('encrypted')}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${
                          inspectorTab === 'encrypted' 
                            ? 'bg-[#4A6741] text-white shadow-xs' 
                            : 'text-[#8C8579] hover:text-white'
                        }`}
                      >
                        IPFS (Base64)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorTab('json')}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors ${
                          inspectorTab === 'json' 
                            ? 'bg-[#4A6741] text-white shadow-xs' 
                            : 'text-[#8C8579] hover:text-white'
                        }`}
                      >
                        JSON Canônico
                      </button>
                    </div>

                    {inspectorTab === 'sanitized' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                          <CheckSquare className="w-3 h-3" />
                          <span>Sanitizado: .trim() + regex /\s+/g + .toLowerCase()</span>
                        </div>
                        <pre className="bg-black/50 p-3 rounded-lg border border-white/10 text-[10px] font-mono text-[#F2EDE4]/90 max-h-48 overflow-y-auto whitespace-pre-wrap leading-tight break-all">
                          {sanitizedPreview}
                        </pre>
                      </div>
                    ) : inspectorTab === 'encrypted' ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono">
                          <LockKeyhole className="w-3 h-3" />
                          <span>Payload Criptografado (Base64) pronto para IPFS</span>
                        </div>
                        <pre className="bg-black/50 p-3 rounded-lg border border-white/10 text-[10px] font-mono text-[#F2EDE4]/90 max-h-48 overflow-y-auto whitespace-pre-wrap leading-tight break-all">
                          {encryptedBase64Preview}
                        </pre>
                      </div>
                    ) : (
                      <pre className="bg-black/50 p-3 rounded-lg border border-white/10 text-[10px] font-mono text-[#F2EDE4]/90 max-h-48 overflow-y-auto whitespace-pre-wrap leading-tight">
                        {canonicalPreview}
                      </pre>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Footer stamp matching Design HTML */}
            <div className="mt-8 pt-4 text-[9px] text-center text-[#8C8579] tracking-widest uppercase border-t border-white/10">
              ACADEMIC BLOCKCHAIN PROTOCOL V1.0
            </div>

          </div>
        </aside>

      </div>

    </div>
  );
};

