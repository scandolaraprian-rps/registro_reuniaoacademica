# 📜 Registro de Ata de Reunião Acadêmica (Blockchain Proof of Existence)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-6.17-2535a0.svg)](https://docs.ethers.org/)

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
* Resumo detalhado, deliberações e lista de verificação de ações acordadas.

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
  * **Hash do Documento (bytes32)**
  * **Identificador da Transação (TxID)**
  * **Número do Bloco Minerado**
  * **Timestamp Oficial da Rede**
  * **Endereço da Carteira do Assinante**
  * **QR Code para validação direta**
* Exportação em **PDF de Alta Resolução** (`jspdf`), formatado como certificado institucional com carimbos, QR Code embutido e metadados de autenticidade.
* Exportação do comprovante completo em formato **JSON**.

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
* Acessibilidade completa por teclado (ex.: fechar modais com tecla `ESC`).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Linguagem** | TypeScript 5.8 | Tipagem estática rigorosa e segurança |
| **Framework UI** | React 19 | Arquitetura de componentes reativos |
| **Build & Dev** | Vite 6 | Empacotamento ultrarrápido |
| **Estilização** | Tailwind CSS 4 | Utility-first styling moderno e responsivo |
| **Ícones** | Lucide React | Biblioteca de ícones SVG acessíveis |
| **Criptografia Web** | Web Crypto API / Ethers.js | Algoritmos SHA-256 e Keccak-256 |
| **Web3 & Conexão** | Ethers.js v6 | Comunicação com RPCs e contratos EVM |
| **Exportação PDF** | jsPDF | Emissão de certificados vetoriais no cliente |
| **QR Code** | qrcode | Geração de QR codes base64/canvas |
| **Smart Contract** | Solidity 0.8.20 | Lógica de persistência e validação on-chain |

---

## 📂 Estrutura do Projeto

```text
├── public/
│   ├── logo-placeholder.jpg   # Imagem/Brasão institucional
│   └── ...
├── src/
│   ├── assets/                # Imagens e recursos estáticos
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

Abaixo está a estrutura central do contrato inteligente utilizado para o registro de prova de existência:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RegistroAtaAcademica {

    struct RegistroAta {
        bytes32 documentHash; // Hash SHA-256 ou Keccak-256
        address assinante;    // Endereço da carteira que registrou
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

### Implantação rápida no Remix:
1. Abra o [Remix IDE](https://remix.ethereum.org/).
2. Crie um arquivo `RegistroAtaAcademica.sol` e cole o código acima.
3. Compile utilizando o compilador Solidity `0.8.20`.
4. Na aba de Deploy, selecione **Injected Provider - MetaMask**.
5. Realize o deploy na rede de sua escolha (ex: Sepolia ou Polygon Amoy).
6. Copie o endereço gerado e informe-o na aba **Smart Contract** da aplicação.

---

## 🛡️ Segurança e Boas Práticas

* **Sem Custódia de Chaves Privadas**: A aplicação não solicita nem armazena frases mnemônicas ou chaves privadas. Todas as assinaturas ocorrem via provedor Web3 seguro.
* **Validação Canônica**: O texto da reunião é normalizado em formato determinístico antes do cálculo do hash, evitando divergências causadas por quebras de linha de diferentes sistemas operacionais.
* **Prevenção de Duplicatas**: O smart contract rejeita a reutilização de um mesmo hash (`require(registros[_documentHash].timestamp == 0)`), garantindo a unicidade de cada ata.

---

## 📝 Licença

Este projeto está licenciado sob a licença **MIT** - consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com foco em integridade acadêmica, governança digital e tecnologias descentralizadas.
</p>
