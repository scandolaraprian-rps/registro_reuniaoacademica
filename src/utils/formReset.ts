/**
 * ==============================================================================
 * UTILITÁRIO DE LIMPEZA E RESET DE FORMULÁRIO COM VALIDAÇÃO DE ESTADO
 * Camada de Qualidade de Software (QA) e Frontend Sênior
 * ==============================================================================
 * 
 * CRITÉRIOS DE ACEITAÇÃO:
 * 1. Restauração Integral: limpa inputs de texto, data, number, checkboxes (checked = false),
 *    textareas e selects (selectedIndex = 0).
 * 2. Validação de Estado (Regra de Negócio): Impede a limpeza caso a ata esteja em
 *    estado imutável ou em validação ("Aprovada" ou "Aguardando Avaliação" / "Pendente").
 * 3. Feedback Visual: Notificação toast e animação no botão.
 * 4. Tratamento de exceções e log estruturado no console.
 */

export interface ResultadoLimpeza {
  sucesso: boolean;
  mensagem: string;
  motivoBloqueio?: 'ESTADO_APROVADO' | 'ESTADO_AGUARDANDO_AVALIACAO' | 'FORMULARIO_NAO_ENCONTRADO';
  camposAfetados?: number;
}

/**
 * Função modularizada para limpar os registros do formulário da ata acadêmica
 * 
 * @param formId ID do formulário no DOM (padrão: 'meeting-form')
 * @param estadoAtaForcado Estado opcional fornecido programaticamente (ex: 'Rascunho', 'Aprovada')
 * @returns ResultadoLimpeza
 */
export function limparFormulario(
  formId: string = 'meeting-form',
  estadoAtaForcado?: string
): ResultadoLimpeza {
  console.group('[QA Form Reset] Executando rotina de limpeza do formulário...');

  try {
    // 1. Localização segura do formulário no DOM
    const formulario = document.getElementById(formId) as HTMLFormElement | null || document.querySelector('form');
    
    if (!formulario) {
      const msgErro = `Formulário com ID "${formId}" não foi localizado no DOM. Ação abortada.`;
      console.error(`%c[FALHA DE BINDING] ${msgErro}`, 'color: #dc2626; font-weight: bold;');
      console.groupEnd();
      return {
        sucesso: false,
        mensagem: msgErro,
        motivoBloqueio: 'FORMULARIO_NAO_ENCONTRADO'
      };
    }

    // 2. VALIDAÇÃO DE ESTADO (REGRA DE NEGÓCIO DA BLOCKCHAIN)
    // Obtém o estado atual da ata a partir dos atributos data-*, classes ou parâmetro forçado
    const statusDocumento = (
      estadoAtaForcado ||
      formulario.getAttribute('data-status-ata') ||
      formulario.getAttribute('data-status-documento') ||
      'Rascunho'
    ).trim();

    console.log('[Validação de Estado] Status atual do documento detectado:', statusDocumento);

    // REGRA: "Limpar Registros" NÃO pode executar se o estado for "Aprovada" ou "Aguardando Avaliação" (ou "Pendente")
    const estadosBloqueados = ['Aprovada', 'Aguardando Avaliação', 'Pendente'];
    if (estadosBloqueados.includes(statusDocumento)) {
      const msgBloqueio = `Ação Bloqueada: Não é permitido limpar registros de uma ata com status "${statusDocumento}". O documento possui garantias de integridade imutáveis na Blockchain.`;
      
      console.warn(`%c[TRAVA DE SEGURANÇA ATIVA] ${msgBloqueio}`, 'color: #d97706; font-weight: bold;', {
        statusDocumento,
        timestamp: new Date().toISOString()
      });

      exibirToastFeedback(msgBloqueio, 'erro');
      console.groupEnd();

      return {
        sucesso: false,
        mensagem: msgBloqueio,
        motivoBloqueio: statusDocumento === 'Aprovada' ? 'ESTADO_APROVADO' : 'ESTADO_AGUARDANDO_AVALIACAO'
      };
    }

    // 3. RESTAURAÇÃO INTEGRAL DE TODOS OS TIPOS DE DADOS
    let totalCamposLimpos = 0;

    // A. Inputs de texto, data, hora, etc.
    const inputs = formulario.querySelectorAll<HTMLInputElement>('input');
    inputs.forEach((input) => {
      const tipo = (input.getAttribute('type') || 'text').toLowerCase();

      if (tipo === 'checkbox' || tipo === 'radio') {
        // Correção do Bug 3: Reseta checkboxes
        input.checked = false;
        input.removeAttribute('checked');
        totalCamposLimpos++;
      } else if (tipo !== 'submit' && tipo !== 'button' && tipo !== 'hidden') {
        input.value = '';
        input.defaultValue = '';
        totalCamposLimpos++;
      }
    });

    // B. Textareas (Pauta, Deliberações, Observações)
    const textareas = formulario.querySelectorAll<HTMLTextAreaElement>('textarea');
    textareas.forEach((textarea) => {
      textarea.value = '';
      textarea.defaultValue = '';
      totalCamposLimpos++;
    });

    // C. Menus Suspensos / Selects
    const selects = formulario.querySelectorAll<HTMLSelectElement>('select');
    selects.forEach((select) => {
      // Correção do Bug 3: Reseta o menu para a primeira opção (selectedIndex = 0)
      select.selectedIndex = 0;
      if (select.options.length > 0) {
        select.value = select.options[0].value;
      }
      totalCamposLimpos++;
    });

    // D. Atualização de contadores visuais de caracteres caso existam no DOM
    const contadores = formulario.querySelectorAll<HTMLElement>('#contador-pauta, #contador-deliberacoes, small.contador');
    contadores.forEach((contador) => {
      contador.textContent = '0/1000';
      contador.className = 'text-xs font-mono text-[#8C8579]';
    });

    // 4. FEEDBACK VISUAL AO USUÁRIO
    exibirToastFeedback('Formulário resetado com sucesso! Todos os campos foram limpos.', 'sucesso');
    animarBotaoLimpeza();

    console.info(
      `%c[SUCESSO] Restauração integral concluída com sucesso: ${totalCamposLimpos} campos resetados para o estado original.`,
      'color: #059669; font-weight: bold;'
    );
    console.groupEnd();

    return {
      sucesso: true,
      mensagem: 'Formulário limpo com sucesso.',
      camposAfetados: totalCamposLimpos
    };

  } catch (erro: any) {
    console.error('[EXCEÇÃO NÃO TRATADA EM limparFormulario]', erro);
    exibirToastFeedback(`Erro ao limpar formulário: ${erro.message}`, 'erro');
    console.groupEnd();
    return {
      sucesso: false,
      mensagem: `Erro de execução: ${erro.message}`
    };
  }
}

/**
 * Exibe notificação Toast flutuante com feedback de sucesso ou bloqueio
 */
export function exibirToastFeedback(mensagem: string, tipo: 'sucesso' | 'erro' | 'aviso' = 'sucesso'): void {
  const toastId = 'toast-feedback-sistema';
  const toastExistente = document.getElementById(toastId);
  if (toastExistente) {
    toastExistente.remove();
  }

  const toast = document.createElement('div');
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  
  const bgCor = tipo === 'sucesso' ? '#065F46' : tipo === 'erro' ? '#991B1B' : '#92400E';
  const borderCor = tipo === 'sucesso' ? '#34D399' : tipo === 'erro' ? '#F87171' : '#FBBF24';
  const icone = tipo === 'sucesso' ? '✓' : tipo === 'erro' ? '✕' : '⚠';

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    background-color: ${bgCor};
    color: #FFFFFF;
    border: 1.5px solid ${borderCor};
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: 420px;
    animation: slideInToast 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  toast.innerHTML = `
    <span style="font-weight: 900; font-size: 16px;">${icone}</span>
    <span style="line-height: 1.4;">${mensagem}</span>
  `;

  document.body.appendChild(toast);

  // Auto-remoção após 3.5 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 320);
  }, 3500);
}

/**
 * Anima o botão "Limpar Registros" por 1 segundo indicando o processamento
 */
function animarBotaoLimpeza(): void {
  const botao = document.getElementById('btn-limpar-formulario');
  if (!botao) return;

  const classesOriginais = botao.className;
  const textoOriginal = botao.innerHTML;

  // Feedback sutil de sucesso por 1 segundo
  botao.style.transition = 'all 0.2s ease';
  botao.style.backgroundColor = '#ECFDF5';
  botao.style.borderColor = '#10B981';
  botao.style.color = '#065F46';

  setTimeout(() => {
    botao.style.backgroundColor = '';
    botao.style.borderColor = '';
    botao.style.color = '';
  }, 1000);
}
