/**
 * Utilitários para Simulação de Criptografia e Armazenamento Descentralizado IPFS
 * Resolvendo a disponibilidade de dados para atas acadêmicas.
 */

/**
 * Simula a criptografia do texto da ata unindo-o com a senha do usuário
 * e convertendo o payload em Base64 para representação visual ofuscada no front-end.
 * 
 * @param textoAta Conteúdo textual da ata acadêmica
 * @param senha Senha ou chave de decodificação local
 * @returns String em Base64 representando o documento ofuscado
 */
export function encryptDocument(textoAta: string, senha: string): string {
  if (!textoAta) return '';

  const payload = JSON.stringify({
    textoAta: textoAta,
    senhaSegredo: senha || 'chave-academica-padrao',
    protocolo: 'AES-GCM-SIMULATED-BASE64',
    timestamp: new Date().toISOString()
  });

  try {
    // Tratamento seguro de strings UTF-8 para Base64 no navegador
    const bytes = new TextEncoder().encode(payload);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    return btoa(unescape(encodeURIComponent(payload)));
  }
}

/**
 * Decodifica a string Base64 simulada (reversibilidade para auditoria)
 */
export function decryptDocument(encryptedBase64: string, senha: string): { valido: boolean; textoAta?: string; erro?: string } {
  try {
    const binary = atob(encryptedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decodedText = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decodedText);

    if (parsed.senhaSegredo && parsed.senhaSegredo !== senha) {
      return { valido: false, erro: 'Senha incorreta para decriptografia.' };
    }

    return { valido: true, textoAta: parsed.textoAta };
  } catch (err: any) {
    return { valido: false, erro: 'Payload corrompido ou formato inválido.' };
  }
}

/**
 * Simula o upload do documento criptografado para o IPFS.
 * Simula a latência de rede de nós IPFS (delay assíncrono via setTimeout)
 * e retorna um Content Identifier (CID) no formato ipfs://Qm...
 * 
 * @param textoCriptografado Conteúdo Base64 ofuscado a ser armazenado
 * @returns Promise com o CID do IPFS
 */
export async function uploadToIPFSMock(textoCriptografado: string): Promise<string> {
  // Simula latência de rede no nó/gateway IPFS (750ms)
  await new Promise((resolve) => setTimeout(resolve, 750));

  // Geração de um CID fictício determinístico/realista baseado em multihash Base58btc (Qm...)
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hashPart = '';

  // Cria semente numérica a partir do texto criptografado
  let seed = 0;
  for (let i = 0; i < textoCriptografado.length; i++) {
    seed = (seed * 31 + textoCriptografado.charCodeAt(i)) >>> 0;
  }

  for (let i = 0; i < 42; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    hashPart += base58Chars.charAt(seed % base58Chars.length);
  }

  return `ipfs://Qm${hashPart}`;
}
