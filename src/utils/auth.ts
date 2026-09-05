import { ethers } from 'ethers';
import { InstitutionalUser } from '../types';

export const LOCAL_STORAGE_USER_KEY = 'academic_institutional_user_v1';

/**
 * Perfis pré-definidos para teste rápido na simulação de SSO institucional
 */
export const INSTITUTIONAL_PROFILES: Omit<InstitutionalUser, 'walletAddress'>[] = [
  {
    nome: 'João Silva',
    email: 'joao.silva@universidade.edu.br',
    role: 'aluno',
    matricula: '202410882',
    instituicao: 'Universidade Federal de Tecnologia',
    departamento: 'Depto. de Engenharia de Software'
  },
  {
    nome: 'Prof. Dr. Roberto Albuquerque',
    email: 'roberto.albuquerque@universidade.edu.br',
    role: 'orientador',
    matricula: 'SIAPE-88291',
    instituicao: 'Universidade Federal de Tecnologia',
    departamento: 'Instituto de Informática'
  },
  {
    nome: 'Profa. Dra. Mariana Menezes',
    email: 'mariana.menezes@universidade.edu.br',
    role: 'coordenadora' as any,
    matricula: 'SIAPE-44102',
    instituicao: 'Universidade Federal de Tecnologia',
    departamento: 'Coordenação de Pós-Graduação'
  }
];

/**
 * Gera deterministicamente um endereço Ethereum público a partir do e-mail do usuário.
 * 
 * Na arquitetura Web3Auth / Account Abstraction real, a identidade federada do SSO
 * (Google Workspace, Microsoft Entra ID ou OAuth2 Universitário) gera ou desbloqueia
 * um par de chaves criptográficas (secp256k1) não-custodiais via Shamir Secret Sharing (TSS).
 * 
 * Aqui, para fins de prova de conceito acadêmica, derivamos o endereço público de forma
 * canônica através do Keccak-256 do e-mail institucional normalizado.
 * 
 * @param email E-mail institucional do usuário
 * @returns Endereço Ethereum no padrão 0x...
 */
export function generateMockWallet(email: string): string {
  if (!email || typeof email !== 'string') {
    return '0x71C59a38F8e684077674681f215E5c6778401aB7';
  }

  // Normaliza o e-mail institucional
  const cleanEmail = email.trim().toLowerCase();

  // Gera hash de 32 bytes a partir do e-mail
  const emailHash = ethers.keccak256(ethers.toUtf8Bytes(cleanEmail));

  // Em Ethereum, o endereço público é composto pelos últimos 20 bytes (40 caracteres hex) do hash
  const rawAddress = '0x' + emailHash.slice(26);

  // Aplica o checksum EIP-55 (letras maiúsculas/minúsculas canônicas)
  try {
    return ethers.getAddress(rawAddress);
  } catch (e) {
    return rawAddress;
  }
}

/**
 * Simula a autenticação SSO (Single Sign-On) com provedor de identidade institucional
 * (SAML 2.0 / OpenID Connect universitário).
 * 
 * Executa um atraso de rede (setTimeout) de 900ms para simulação realista de handshake.
 * 
 * @param selectedEmail E-mail institucional escolhido ou digitado (opcional)
 * @returns Promise com o objeto do usuário institucional autenticado e carteira vinculada
 */
export function mockInstitutionalLogin(selectedEmail?: string): Promise<InstitutionalUser> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let baseProfile = INSTITUTIONAL_PROFILES.find(
        p => p.email.toLowerCase() === (selectedEmail || '').toLowerCase()
      );

      if (!baseProfile) {
        if (selectedEmail && selectedEmail.trim()) {
          const email = selectedEmail.trim().toLowerCase();
          const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
          const formattedName = namePart
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          baseProfile = {
            nome: formattedName || 'Usuário Acadêmico',
            email: email,
            role: email.includes('prof') ? 'professor' : 'aluno',
            matricula: `MAT-${Math.floor(100000 + Math.random() * 900000)}`,
            instituicao: 'Universidade Federal de Tecnologia',
            departamento: 'Faculdade de Tecnologia'
          };
        } else {
          // Perfil padrão: João Silva (conforme especificação da requisição)
          baseProfile = INSTITUTIONAL_PROFILES[0];
        }
      }

      // Gera o par de chaves e endereço público vinculado à identidade institucional
      const walletAddress = generateMockWallet(baseProfile.email);

      const authenticatedUser: InstitutionalUser = {
        ...baseProfile,
        walletAddress,
        loginTimestamp: Date.now()
      };

      resolve(authenticatedUser);
    }, 900);
  });
}
