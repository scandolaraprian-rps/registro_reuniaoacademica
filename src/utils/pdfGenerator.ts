import { jsPDF } from 'jspdf';
import { CryptoReceipt } from '../types';

/**
 * Gera um PDF profissional e institucional do Recibo Criptográfico
 * de Prova de Existência da Ata Acadêmica.
 */
export async function generateReceiptPdf(receipt: CryptoReceipt, qrCodeDataUrl?: string): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.getImageProperties ? 210 : 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174 mm
  let y = margin;

  // Paleta de cores institucional (Natural Tones)
  const primaryDark = [45, 42, 38] as const; // #2D2A26
  const primaryGreen = [74, 103, 65] as const; // #4A6741
  const neutralBorder = [222, 216, 205] as const; // #DED8CD
  const neutralBg = [250, 249, 246] as const; // #FAF9F6
  const mutedText = [120, 115, 105] as const; // #787369

  // 1. Moldura externa decorativa e elegante
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.setLineWidth(0.6);
  doc.rect(10, 10, pageWidth - 20, 277);

  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, pageWidth - 24, 273);

  // 2. Cabeçalho Institucional
  y = 22;
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, y, contentWidth, 24, 'F');

  // Texto do cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RECIBO CRIPTOGRÁFICO DE REGISTRO', pageWidth / 2, y + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 220, 220);
  doc.text('SISTEMA DE CERTIFICAÇÃO E PROVA DE EXISTÊNCIA EM BLOCKCHAIN', pageWidth / 2, y + 16, { align: 'center' });

  y += 32;

  // 3. Selo de Validação
  doc.setFillColor(neutralBg[0], neutralBg[1], neutralBg[2]);
  doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(pageWidth / 2 - 50, y, 100, 8, 3, 3, 'FD');

  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('✓ REGISTRADO NA BLOCKCHAIN COM SUCESSO', pageWidth / 2, y + 5.5, { align: 'center' });

  y += 14;

  // 4. Título do Documento
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(18);
  doc.text('Certificado de Prova de Existência', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('AUTENTICIDADE, ANTERIORIDADE E IMUTABILIDADE CRIPTOGRÁFICA', pageWidth / 2, y, { align: 'center' });

  y += 8;
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;

  // 5. Dados da Reunião Acadêmica (Bloco de Informações)
  doc.setFillColor(neutralBg[0], neutralBg[1], neutralBg[2]);
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  const snapshot = receipt.meetingSnapshot;
  const boxPadding = 4;
  let boxY = y + 6;

  // Linha 1: Título da Ata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TÍTULO DA ATA:', margin + boxPadding, boxY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const truncatedTitle = snapshot.title.length > 60 ? snapshot.title.substring(0, 58) + '...' : snapshot.title;
  doc.text(truncatedTitle, margin + 35, boxY);

  boxY += 6;

  // Linha 2: Tipo & Unidade
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TIPO DE REUNIÃO:', margin + boxPadding, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(snapshot.meetingType || 'Reunião Acadêmica', margin + 38, boxY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('UNIDADE:', margin + 100, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const unitStr = snapshot.academicUnit.length > 28 ? snapshot.academicUnit.substring(0, 26) + '..' : snapshot.academicUnit;
  doc.text(unitStr || 'Geral', margin + 120, boxY);

  boxY += 6;

  // Linha 3: Data Original
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('DATA DA SESSÃO:', margin + boxPadding, boxY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const sessionDate = snapshot.dateTime ? new Date(snapshot.dateTime).toLocaleString('pt-BR') : receipt.formattedDate;
  doc.text(sessionDate, margin + 38, boxY);

  boxY += 6;

  // Linha 4: Participantes Homologados
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('PARTICIPANTES:', margin + boxPadding, boxY);

  const participantNames = snapshot.participants
    ? snapshot.participants.filter(p => p.checked).map(p => `${p.role}: ${p.name}`).join(' | ')
    : 'Participantes registrados em ata';

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const splitParticipants = doc.splitTextToSize(participantNames, contentWidth - 40);
  doc.text(splitParticipants.slice(0, 2), margin + 35, boxY);

  y += 48;

  // 6. Dados Criptográficos da Blockchain (Hash, TxID, Bloco, Timestamp, QR Code)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('PROVAS CRIPTOGRÁFICAS GRAVADAS NA BLOCKCHAIN', margin, y);

  y += 4;

  // Box 1: Hash do Documento
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 231, 183); // emerald-300
  doc.text(`HASH DO DOCUMENTO (bytes32 - ${receipt.hashAlgorithm}):`, margin + 4, y + 6);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(receipt.documentHash, margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 180, 180);
  doc.text('Impressão digital única calculada com base na ata. Qualquer alteração invalida este hash.', margin + 4, y + 17);

  y += 24;

  // Box 2: TxID
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TxID (HASH DA TRANSAÇÃO ON-CHAIN):', margin + 4, y + 5.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(receipt.txId, margin + 4, y + 11.5);

  y += 20;

  // Grid inferior: Bloco, Timestamp, Rede + QR Code ao lado
  const leftColWidth = 118;
  const qrColWidth = contentWidth - leftColWidth - 4; // ~52 mm

  // Bloco & Timestamp Card
  doc.setFillColor(neutralBg[0], neutralBg[1], neutralBg[2]);
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.roundedRect(margin, y, leftColWidth, 48, 2, 2, 'FD');

  let gridY = y + 7;

  // Linha A: Número do Bloco
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('NÚMERO DO BLOCO:', margin + 4, gridY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`#${receipt.blockNumber}`, margin + 50, gridY);

  gridY += 8;

  // Linha B: Timestamp (Data e Hora)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('TIMESTAMP REGISTRO:', margin + 4, gridY);

  const formattedDateTime = new Date(receipt.timestamp).toLocaleString('pt-BR');
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(formattedDateTime, margin + 50, gridY);

  gridY += 4.5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`(Unix Epoch: ${receipt.timestamp})`, margin + 50, gridY);

  gridY += 8;

  // Linha C: Carteira Assinante
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('CARTEIRA ASSINANTE:', margin + 4, gridY);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(receipt.signerAddress, margin + 4, gridY + 5);

  gridY += 11;

  // Linha D: Rede Blockchain & Contrato
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('REDE / CONTRATO:', margin + 4, gridY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`${receipt.networkName} (${receipt.networkId.toUpperCase()})`, margin + 42, gridY);

  // QR Code Box (à direita)
  const qrX = margin + leftColWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.roundedRect(qrX, y, qrColWidth, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('QR CODE VALIDAÇÃO', qrX + qrColWidth / 2, y + 6, { align: 'center' });

  if (qrCodeDataUrl) {
    try {
      doc.addImage(qrCodeDataUrl, 'PNG', qrX + 8.5, y + 8, 35, 35);
    } catch (e) {
      console.warn('Could not insert QR image in PDF', e);
    }
  }

  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Etherscan / Testnet', qrX + qrColWidth / 2, y + 45.5, { align: 'center' });

  y += 56;

  // 7. Cláusula Institucional & Validação
  doc.setDrawColor(neutralBorder[0], neutralBorder[1], neutralBorder[2]);
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);

  const legalDisclaimer = [
    'DECLARAÇÃO DE PROVA DE EXISTÊNCIA E INTEGRIDADE:',
    'Este certificado comprova de maneira matematicamente incontestável que o documento especificado existia em sua forma',
    'integral na data e hora especificadas, tendo seu resumo criptográfico registrado na blockchain.',
    'A verificação de integridade pode ser realizada a qualquer momento no smart contract chamando a função pública:',
    'verificarAta(bytes32 hash) -> retorna (bool existe, uint256 timestamp, address registrador, string tipo)'
  ];

  legalDisclaimer.forEach((line, idx) => {
    if (idx === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    } else if (idx === 4) {
      doc.setFont('courier', 'bold');
      doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    }
    doc.text(line, margin, y);
    y += 4;
  });

  // 8. Rodapé com ID do Recibo e Data de Emissão
  y = 280;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(`ID Recibo: ${receipt.receiptId}`, margin, y);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, y, { align: 'right' });

  // Nome do arquivo para download
  const sanitizedTitle = snapshot.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
  const filename = `recibo_criptografico_${sanitizedTitle || 'ata'}_${receipt.receiptId.substring(0, 8)}.pdf`;

  // Salva e aciona o download diretamente no navegador do usuário
  doc.save(filename);
}
