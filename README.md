# 📜 Registro de Ata de Reunião Acadêmica / Academic Meeting Minutes Registry
### *Blockchain Proof of Existence & Cryptographic Receipt System*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-6.17-2535a0.svg)](https://docs.ethers.org/)

---

<p align="center">
  <b>Idioma / Language:</b><br>
  <a href="#-português">🇧🇷 <b>Português (Brasil)</b></a> &nbsp;|&nbsp; <a href="#-english">🇺🇸 <b>English</b></a>
</p>

---

<a name="-português"></a>
# 🇧🇷 Português (Brasil)

Aplicação descentralizada (dApp) para elaboração, assinatura e **registro imutável de atas de reuniões acadêmicas** (orientações, bancas, colegiados, alinhamentos de tese e pesquisa) com geração de prova de existência (*Proof of Existence*) e timestamp oficial na blockchain.

---

## 🏛️ Visão Geral & Proposta

Em ambientes universitários e de pesquisa, reuniões de orientação, bancas de qualificação e deliberações de colegiado frequentemente dependem de registros em papel ou arquivos digitais centralizados suscetíveis a adulterações, perdas ou contestações de datas.

Este sistema resolve esse desafio aplicando **criptografia de chave pública e registros distribuídos (EVM)** para certificar a autenticidade e a anterioridade de qualquer reunião acadêmica de forma matematicamente auditável e juridicamente incontestável.

---

## ⚡ Regra de Ouro de Armazenamento e LGPD

> **"Dados sensíveis e texto integral ficam sob a custódia do usuário; apenas a assinatura criptográfica de 32 bytes (`bytes32`) é persistida na blockchain."**

* **Privacidade & Conformidade (LGPD/GDPR)**: Nomes de discentes, pareceres, notas e conteúdos confidenciais de pesquisas **não** são expostos em redes públicas.
* **Eficiência de Gás**: Gravar 2 KB de texto puro em uma rede EVM demandaria mais de 1.200.000 unidades de gas. Ao persistir unicamente o hash criptográfico (`bytes32`), o consumo médio por transação é de apenas **~45.000 gas**, reduzindo os custos em mais de 99,8%.
* **Integridade Matemática**: Qualquer caractere ou espaço alterado no documento original gera um hash totalmente diferente (efeito avalanche), invalidando qualquer tentativa de fraude.

---

## ✨ Funcionalidades Principais

### 1. Formulário Web Acadêmico
* Preenchimento guiado com modelos pré-configurados (*Orientação*, *Feedback*, *Sincronização*, *Banca*).
* Campos de Data/Hora, Unidade Acadêmica/Programa e Título da Reunião.
* Gestão dinâmica de participantes com funções pré-definidas (*Aluno*, *Professor*, *Orientador*, *Membro da Banca*) e nomes editáveis.
* Resumo detalhado, deliberações e lista de verificação de ações acordadas com adição dinâmica de itens.

### 2. Motor Criptográfico Dual
* Geração do hash em tempo real a partir da representação canônica da ata.
* Suporte nativo para:
  * **Keccak-256**: Padrão nativo das redes EVM (Ethereum / Polygon).
  * **SHA-256**: Padrão internacional de integridade digital Web.

### 3. Integração Web3 & Simulação Acadêmica
* Conexão simples com carteiras Web3 (MetaMask, Coinbase Wallet ou provedores EIP-1193).
* Suporte configurável para redes de teste (*Sepolia*, *Polygon Amoy*) ou nós locais (*Hardhat/Anvil*).
* Modo de simulação/demonstração acadêmica com geração de blocos e TxIDs sintéticos quando uma carteira física não estiver conectada.

### 4. Recibo Criptográfico Oficial & Exportação em PDF
* Modal institucional exibindo:
  * **Hash do Documento (`bytes32`)**
  * **Identificador da Transação (TxID)**
  * **Número do Bloco Minerado**
  * **Timestamp Oficial da Rede**
  * **Endereço da Carteira do Assinante**
  * **QR Code para validação direta**
* Exportação em **PDF de Alta Resolução** (`jspdf`), formatado como certificado institucional com carimbos, QR Code embutido e metadados de autenticidade.
* Exportação do comprovante completo em formato **JSON**.
* Fechamento rápido acessível pelo botão "X" ou pela tecla `ESC`.

### 5. Validador de Autenticidade & Auditoria
* Ferramenta de auditoria independente:
  * Verificação via upload do arquivo `.json` da ata (recalcula o hash localmente e compara com o registro).
  * Verificação manual digitando a chave `bytes32` ou o `TxID`.
  * Verificação on-chain via consulta à função pública `verificarAta(bytes32)`.

### 6. Central do Smart Contract
* Código fonte integral do contrato inteligente em **Solidity (v0.8.20)** com documentação NatSpec.
* Interface ABI pronta para cópia.
* Snippet de integração com **Ethers.js v6**.
* Tutorial passo a passo para compilação e deploy via **Remix IDE**.

### 7. Design Responsivo & Mobile First
* Estilizado na paleta sóbria e acadêmica **Natural Tones** (`#FAF9F6`, `#2D2A26`, `#4A6741`).
* Dock inferior ergonômico para dispositivos móveis (`md:hidden`) com alvos de toque otimizados (≥44px).
* Logotipo institucional configurável de forma limpa e centralizada via código.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Linguagem** | TypeScript 5.8 | Tipagem estática rigorosa e segurança de dados |
| **Framework UI** | React 19 | Arquitetura declarativa e reativa |
| **Build Tool** | Vite 6 | Servidor ultrarrápido com Hot Module Replacement |
| **Estilização** | Tailwind CSS 4 | Utility-first styling moderno e paleta sob medida |
| **Ícones** | Lucide React | Ícones SVG acessíveis e padronizados |
| **Criptografia Web** | Web Crypto API / Ethers.js | Algoritmos SHA-256 e Keccak-256 |
| **Web3 & Conexão** | Ethers.js v6 | Comunicação com RPCs e contratos EVM |
| **Exportação PDF** | jsPDF | Emissão de certificados vetoriais no cliente |
| **QR Code** | qrcode | Geração de QR codes base64 e canvas |
| **Smart Contract** | Solidity 0.8.20 | Lógica de persistência e validação on-chain |

---

## 📂 Estrutura do Projeto

```text
├── public/
│   ├── logo-placeholder.jpg   # Imagem/Brasão institucional
│   └── ...
├── src/
│   ├── assets/                # Recursos estáticos
│   ├── components/            # Componentes modulares da interface
│   │   ├── AuditVerifier.tsx       # Módulo de auditoria e recálculo de hash
│   │   ├── CryptoReceiptModal.tsx  # Modal do certificado de prova de existência
│   │   ├── LogoPlaceholder.tsx     # Componente centralizado do logotipo
│   │   ├── MeetingForm.tsx         # Formulário acadêmico e deliberações
│   │   ├── Navbar.tsx              # Cabeçalho institucional e dock mobile
│   │   ├── ReceiptsHistory.tsx     # Histórico local de atas registradas
│   │   └── SmartContractViewer.tsx # Visualizador de código Solidity e ABI
│   ├── contracts/
│   │   └── solidityContract.ts     # Código Solidity, ABI e redes suportadas
│   ├── utils/
│   │   ├── crypto.ts          # Funções de hashing (Keccak-256, SHA-256)
│   │   ├── pdfGenerator.ts    # Motor de geração do certificado em PDF
│   │   └── qrCode.ts          # Gerador de QR Code
│   ├── types.ts               # Definições de tipos e interfaces TypeScript
│   ├── App.tsx                # Componente raiz e orquestrador de estado
│   ├── main.tsx               # Ponto de entrada React
│   └── index.css              # Configurações globais Tailwind CSS
├── index.html                 # Entry point HTML com fontes e metadados
├── package.json               # Dependências e scripts do projeto
├── tsconfig.json              # Configuração do compilador TypeScript
└── vite.config.ts             # Configuração do Vite
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Node.js** (versão 18.0.0 ou superior) ou **Bun** / **pnpm** / **yarn**
* Carteira Web3 no navegador (ex.: [MetaMask](https://metamask.io/)) para assinar transações em testnets (opcional).

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/registro-ata-academica.git
cd registro-ata-academica
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
O servidor estará acessível em `http://localhost:3000`.

### 4. Compilar para produção
```bash
npm run build
```
Os arquivos otimizados para produção serão gerados no diretório `dist/`.

---

## 📄 O Smart Contract (`RegistroAtaAcademica.sol`)

Abaixo está a estrutura central do contrato inteligente em Solidity utilizado para o registro de prova de existência:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RegistroAtaAcademica
 * @dev Contrato para prova de existência de atas de reuniões acadêmicas
 */
contract RegistroAtaAcademica {

    struct RegistroAta {
        bytes32 documentHash; // Hash SHA-256 ou Keccak-256 da ata
        address assinante;    // Carteira que efetuou o registro
        uint256 timestamp;    // Carimbo temporal do bloco
        uint256 blockNumber;  // Número do bloco
    }

    mapping(bytes32 => RegistroAta) public registros;
    bytes32[] public historicoHashes;

    event AtaRegistrada(
        bytes32 indexed documentHash,
        address indexed assinante,
        uint256 timestamp,
        uint256 blockNumber
    );

    function registrarHash(bytes32 _documentHash) external returns (bool) {
        require(_documentHash != bytes32(0), "Hash nao pode ser nulo");
        require(registros[_documentHash].timestamp == 0, "Ata ja registrada");

        registros[_documentHash] = RegistroAta({
            documentHash: _documentHash,
            assinante: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        historicoHashes.push(_documentHash);
        emit AtaRegistrada(_documentHash, msg.sender, block.timestamp, block.number);
        return true;
    }

    function verificarAta(bytes32 _documentHash) external view returns (
        bool existe,
        address assinante,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        RegistroAta memory r = registros[_documentHash];
        if (r.timestamp == 0) return (false, address(0), 0, 0);
        return (true, r.assinante, r.timestamp, r.blockNumber);
    }
}
```

### Implantação rápida no Remix IDE:
1. Acesse o [Remix IDE](https://remix.ethereum.org/).
2. Crie o arquivo `RegistroAtaAcademica.sol` e cole o código acima.
3. No painel "Solidity Compiler", selecione o compilador `0.8.20` e clique em **Compile**.
4. No painel "Deploy & Run Transactions", selecione o ambiente **Injected Provider - MetaMask**.
5. Realize o deploy na testnet de sua escolha (*Sepolia*, *Polygon Amoy*).
6. Copie o endereço do contrato implantado e cole no campo de endereço da aplicação na aba **Smart Contract**.

---

## 🎨 Como Customizar o Logotipo

Para alterar a imagem do escudo/logotipo exibido no cabeçalho:
1. Copie seu arquivo de imagem para a pasta `/public` (ex.: `/public/meu_brasao.png`).
2. Abra o arquivo `src/components/LogoPlaceholder.tsx` e altere a constante:
   ```ts
   export const DEFAULT_LOGO_SRC = '/meu_brasao.png';
   ```

---

<br>

<a name="-english"></a>
# 🇺🇸 English

A decentralized application (dApp) for drafting, signing, and **immutably registering academic meeting minutes** (thesis advisings, dissertation defenses, collegiate boards, research syncs) with blockchain-backed Proof of Existence and official network timestamps.

---

## 🏛️ Overview & Purpose

In university and research ecosystems, advising logs, defense minutes, and collegiate resolutions often rely on paper documents or centralized file systems vulnerable to tampering, loss, backdating, or disputed agreements.

This platform resolves this challenge by utilizing **public-key cryptography and Ethereum Virtual Machine (EVM) distributed ledgers** to certify the authenticity, integrity, and chronological precedence of any academic meeting in a mathematically auditable manner.

---

## ⚡ Golden Rule of Storage & Privacy (GDPR / LGPD)

> **"Sensitive personal data and raw minutes text remain under user custody; only the 32-byte cryptographic digest (`bytes32`) is persisted on-chain."**

* **Privacy & Legal Compliance**: Student names, confidential research findings, internal notes, and evaluations are **never** published to public ledgers.
* **Gas Efficiency**: Storing 2 KB of raw text on an EVM network would consume over 1,200,000 gas. By persisting exclusively the cryptographic hash (`bytes32`), the average transaction cost drops to **~45,000 gas** (a >99.8% cost reduction).
* **Cryptographic Integrity**: Any alteration to a single character or punctuation mark produces an entirely different hash (avalanche effect), immediately flagging unauthorized changes.

---

## ✨ Key Features

### 1. Academic Web Form
* Streamlined entry with pre-configured templates (*Advising*, *Feedback*, *Sync*, *Defense Board*).
* Dedicated inputs for Date/Time, Academic Department/Program, and Meeting Title.
* Dynamic participant management with defined roles (*Student*, *Professor*, *Advisor*, *Board Member*) and custom names.
* Detailed executive summary, formal resolutions, and action checklist with dynamic item creation.

### 2. Dual Cryptographic Engine
* Instant hash calculation based on the canonical representation of meeting records.
* Out-of-the-box support for:
  * **Keccak-256**: The native cryptographic hashing standard of EVM networks (Ethereum / Polygon).
  * **SHA-256**: The international standard for digital web integrity.

### 3. Web3 Integration & Academic Simulation Mode
* Frictionless connection with Web3 wallets (MetaMask, Coinbase Wallet, or EIP-1193 providers).
* Configurable support for testnets (*Ethereum Sepolia*, *Polygon Amoy*) and local dev nodes (*Hardhat / Anvil*).
* Simulated demonstration mode generating realistic synthetic blocks and TxIDs when a Web3 wallet is not connected.

### 4. Official Cryptographic Receipt & PDF Export
* Institutional modal certificate detailing:
  * **Document Digest (`bytes32`)**
  * **Transaction Hash (TxID)**
  * **Mined Block Number**
  * **Network Block Timestamp**
  * **Signer's Wallet Address**
  * **Embedded QR Code for instant audit**
* Vector-grade **Institutional PDF Certificate** generation (`jspdf`) formatted with academic seals, QR Code, and verification metadata.
* Full raw **JSON receipt export**.
* Keyboard accessibility: close with `ESC` key or click the quick exit button.

### 5. Independent Audit & Authenticity Verifier
* Standalone verification suite:
  * Audit by uploading the `.json` minute file (recomputes the hash on the client and compares against on-chain status).
  * Manual search by entering a `bytes32` digest or `TxID`.
  * Real-time on-chain verification calling the public smart contract function `verificarAta(bytes32)`.

### 6. Smart Contract Suite & Developer Center
* Complete **Solidity (v0.8.20)** smart contract source code with NatSpec documentation.
* Full Contract ABI ready to copy.
* **Ethers.js v6** integration snippet for frontend integration.
* Step-by-step tutorial for compilation and deployment via **Remix IDE**.

### 7. Responsive Design & Mobile First
* Crafted in an academic **Natural Tones** palette (`#FAF9F6`, `#2D2A26`, `#4A6741`).
* Ergonomic bottom navigation dock on mobile screens (`md:hidden`) with touch targets (≥44px).
* Centralized, clean logo component for easy branding adjustments.

---

## 🛠️ Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Language** | TypeScript 5.8 | Strict static typing and end-to-end data integrity |
| **UI Framework** | React 19 | Component-driven reactive architecture |
| **Build Tool** | Vite 6 | High-speed bundler with instant HMR |
| **Styling** | Tailwind CSS 4 | Modern utility-first styling with custom palette |
| **Icons** | Lucide React | Clean, accessible SVG icons |
| **Cryptography** | Web Crypto API / Ethers.js | Client-side SHA-256 and Keccak-256 hashing |
| **Web3 Layer** | Ethers.js v6 | RPC communication, contract calls, and signer handling |
| **PDF Generation** | jsPDF | Client-side vector certificate generation |
| **QR Codes** | qrcode | Canvas and Base64 QR code generator |
| **Smart Contract** | Solidity 0.8.20 | On-chain registration and existence verification |

---

## 📂 Project Structure

```text
├── public/
│   ├── logo-placeholder.jpg   # Institutional emblem / logo
│   └── ...
├── src/
│   ├── assets/                # Static assets
│   ├── components/            # Modular UI components
│   │   ├── AuditVerifier.tsx       # Audit module & hash recomputation
│   │   ├── CryptoReceiptModal.tsx  # Proof of existence certificate modal
│   │   ├── LogoPlaceholder.tsx     # Centralized logo component
│   │   ├── MeetingForm.tsx         # Academic form and resolutions
│   │   ├── Navbar.tsx              # Institutional header & mobile dock
│   │   ├── ReceiptsHistory.tsx     # Local list of registered minutes
│   │   └── SmartContractViewer.tsx # Solidity contract viewer & ABI
│   ├── contracts/
│   │   └── solidityContract.ts     # Solidity code, ABI, and testnet definitions
│   ├── utils/
│   │   ├── crypto.ts          # Hashing helpers (Keccak-256, SHA-256)
│   │   ├── pdfGenerator.ts    # PDF certificate generator
│   │   └── qrCode.ts          # QR code generator
│   ├── types.ts               # Shared TypeScript interfaces & types
│   ├── App.tsx                # Main app state orchestrator
│   ├── main.tsx               # React entry point
│   └── index.css              # Tailwind CSS configuration
├── index.html                 # HTML shell with typography & meta tags
├── package.json               # Node packages and project scripts
├── tsconfig.json              # TypeScript compiler settings
└── vite.config.ts             # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher) or **Bun** / **pnpm** / **yarn**
* Web3 browser wallet (e.g., [MetaMask](https://metamask.io/)) to sign transactions on testnets (optional).

### 1. Clone the repository
```bash
git clone https://github.com/your-username/academic-meeting-minutes-registry.git
cd academic-meeting-minutes-registry
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```
The app will be accessible at `http://localhost:3000`.

### 4. Build for production
```bash
npm run build
```
Optimized static production assets will be output to the `dist/` directory.

---

## 📄 The Smart Contract (`RegistroAtaAcademica.sol`)

Below is the Solidity smart contract implementation for registering meeting minutes proof of existence:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RegistroAtaAcademica
 * @dev Proof of existence contract for academic meeting minutes
 */
contract RegistroAtaAcademica {

    struct RegistroAta {
        bytes32 documentHash; // SHA-256 or Keccak-256 hash of the minutes
        address assinante;    // Signer wallet address
        uint256 timestamp;    // Block timestamp
        uint256 blockNumber;  // Block number
    }

    mapping(bytes32 => RegistroAta) public registros;
    bytes32[] public historicoHashes;

    event AtaRegistrada(
        bytes32 indexed documentHash,
        address indexed assinante,
        uint256 timestamp,
        uint256 blockNumber
    );

    function registrarHash(bytes32 _documentHash) external returns (bool) {
        require(_documentHash != bytes32(0), "Hash cannot be zero");
        require(registros[_documentHash].timestamp == 0, "Minute already registered");

        registros[_documentHash] = RegistroAta({
            documentHash: _documentHash,
            assinante: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        historicoHashes.push(_documentHash);
        emit AtaRegistrada(_documentHash, msg.sender, block.timestamp, block.number);
        return true;
    }

    function verificarAta(bytes32 _documentHash) external view returns (
        bool existe,
        address assinante,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        RegistroAta memory r = registros[_documentHash];
        if (r.timestamp == 0) return (false, address(0), 0, 0);
        return (true, r.assinante, r.timestamp, r.blockNumber);
    }
}
```

### Quick Deployment via Remix IDE:
1. Open [Remix IDE](https://remix.ethereum.org/).
2. Create a file named `RegistroAtaAcademica.sol` and paste the code above.
3. In the "Solidity Compiler" tab, pick compiler version `0.8.20` and click **Compile**.
4. In the "Deploy & Run Transactions" tab, select **Injected Provider - MetaMask**.
5. Deploy to your network of choice (*Sepolia*, *Polygon Amoy*).
6. Copy the deployed contract address and paste it into the **Smart Contract** tab inside the application.

---

## 🎨 Customizing the Emblem / Logo

To replace the institutional emblem in the header:
1. Place your image file in the `/public` directory (e.g., `/public/university-crest.png`).
2. Open `src/components/LogoPlaceholder.tsx` and update the constant:
   ```ts
   export const DEFAULT_LOGO_SRC = '/university-crest.png';
   ```

---

## 🛡️ Security & Best Practices

* **Non-Custodial**: The application never touches or requests seed phrases or private keys. Signatures are handled by the user's browser wallet.
* **Canonical Document Sorting**: Form contents are canonicalized before hashing, preventing hash mismatches across different operating systems.
* **Anti-Replay / Uniqueness**: Smart contracts reject duplicate registration of identical hashes to preserve chronological uniqueness.

---

## 📝 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<p align="center">
  Built for academic integrity, digital governance, and decentralized trust.
</p>
