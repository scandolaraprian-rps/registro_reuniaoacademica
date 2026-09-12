export const SOLIDITY_SOURCE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RegistroAtaAcademica
 * @dev Contrato inteligente para registro descentralizado e imutável de atas de reuniões acadêmicas.
 * 
 * REGRA DE OURO DE ESCALABILIDADE E GÁS:
 * O texto completo da ata NÃO é armazenado na blockchain (on-chain) para manter
 * o consumo de gás mínimo (~45.000 gas por registro) e custos previsíveis.
 * Apenas o hash criptográfico (bytes32) representativo do documento é persistido.
 */
contract RegistroAtaAcademica {

    // Estrutura que guarda a prova de existência e autoria
    struct RegistroAta {
        bytes32 documentHash; // Hash SHA-256 ou Keccak-256 da ata
        address assinante;    // Endereço da carteira que registrou
        uint256 timestamp;    // Carimbo temporal do bloco (segundos desde unix epoch)
        uint256 blockNumber;  // Número do bloco na rede
    }

    // Mapeamento: documentHash => RegistroAta
    mapping(bytes32 => RegistroAta) public registros;

    // Lista ordenada de todos os hashes registrados (para auditoria e enumeração)
    bytes32[] public historicoHashes;

    // Proprietário do contrato (opcional para manutenções administrativas)
    address public immutable owner;

    // Evento emitido quando uma nova ata é registrada (útil para indexadores TheGraph / Web3)
    event AtaRegistrada(
        bytes32 indexed documentHash,
        address indexed assinante,
        uint256 timestamp,
        uint256 blockNumber
    );

    modifier hashValido(bytes32 _documentHash) {
        require(_documentHash != bytes32(0), "Hash do documento nao pode ser nulo");
        require(registros[_documentHash].timestamp == 0, "Ata ja registrada nesta blockchain");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Registra o hash de uma ata acadêmica na blockchain
     * @param _documentHash O hash de 32 bytes gerado pelo front-end
     * @return sucesso Retorna true em caso de confirmação
     */
    function registrarHash(bytes32 _documentHash) external hashValido(_documentHash) returns (bool sucesso) {
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

    /**
     * @notice Consulta e valida uma ata pelo seu hash
     * @param _documentHash Hash a ser verificado
     */
    function verificarAta(bytes32 _documentHash) external view returns (
        bool existe,
        address assinante,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        RegistroAta memory r = registros[_documentHash];
        if (r.timestamp != 0) {
            return (true, r.assinante, r.timestamp, r.blockNumber);
        }
        return (false, address(0), 0, 0);
    }

    /**
     * @notice Retorna o estado canônico da ata para controle de imutabilidade no DOM
     * @dev Permite que o front-end consulte a blockchain como única fonte da verdade
     * @param _documentHash Hash criptográfico da ata
     * @return estado Retorna "Aprovada", "Pendente" ou "Inexistente"
     * @return assinante Endereço da carteira que assinou o registro
     * @return timestamp Carimbo de tempo do registro
     */
    function obterEstadoAta(bytes32 _documentHash) external view returns (
        string memory estado,
        address assinante,
        uint256 timestamp
    ) {
        RegistroAta memory r = registros[_documentHash];
        if (r.timestamp != 0) {
            return ("Aprovada", r.assinante, r.timestamp);
        }
        return ("Inexistente", address(0), 0);
    }

    /**
     * @notice Retorna a quantidade total de atas registradas no contrato
     */
    function totalAtasRegistradas() external view returns (uint256) {
        return historicoHashes.length;
    }
}
`;

/**
 * NOVO CONTRATO INTELIGENTE COM DISPONIBILIDADE DE DADOS VIA IPFS
 * MUDANÇA DE ARQUITETURA:
 * Em vez de armazenar apenas o bytes32 documentHash, o contrato agora persiste:
 * 1. O Content Identifier (string ipfsCID) apontando para o arquivo criptografado no IPFS
 * 2. O endereço do professor (orientador)
 * 3. O endereço do aluno signatário
 * 4. O timestamp do registro
 */
export const SOLIDITY_IPFS_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RegistroAtaIPFS
 * @dev Contrato para registro de atas acadêmicas vinculando identidade e IPFS.
 * Resolve o problema de disponibilidade de dados (risco de perda do texto original da ata)
 * persistindo o identificador de conteúdo (CID) do arquivo criptografado no IPFS.
 */
contract RegistroAtaIPFS {

    // Estrutura exigida com IPFS CID, professor, aluno e timestamp
    struct Ata {
        string ipfsCID;        // Identificador de Conteúdo do IPFS (ex: ipfs://Qm...)
        address professor;     // Endereço da carteira do professor/orientador
        address aluno;         // Endereço da carteira institucional do aluno
        uint256 timestamp;     // Carimbo temporal imutável da blockchain (block.timestamp)
    }

    // Mapeamento: ipfsCID => Ata
    mapping(string => Ata) public atasPorCID;

    // Histórico ordenado de todos os CIDs registrados no contrato
    string[] public historicoCIDs;

    // Evento emitido quando a ata é registrada com seu identificador IPFS
    event AtaRegistradaComIPFS(
        string indexed ipfsCIDIndexed,
        string ipfsCID,
        address indexed professor,
        address indexed aluno,
        uint256 timestamp
    );

    /**
     * @notice Registra uma nova ata acadêmica armazenada previamente no IPFS
     * @param _ipfsCID O Content Identifier gerado no IPFS após criptografia local
     * @param _aluno Endereço da carteira institucional do aluno signatário
     */
    function registrarAta(string calldata _ipfsCID, address _aluno) external returns (bool sucesso) {
        require(bytes(_ipfsCID).length > 0, "CID do IPFS nao pode ser vazio");
        require(_aluno != address(0), "Endereco do aluno invalido");
        require(atasPorCID[_ipfsCID].timestamp == 0, "Ata ja registrada com este CID");

        // msg.sender é o professor/orientador autenticado que submete a transação
        atasPorCID[_ipfsCID] = Ata({
            ipfsCID: _ipfsCID,
            professor: msg.sender,
            aluno: _aluno,
            timestamp: block.timestamp
        });

        historicoCIDs.push(_ipfsCID);

        emit AtaRegistradaComIPFS(_ipfsCID, _ipfsCID, msg.sender, _aluno, block.timestamp);
        return true;
    }

    /**
     * @notice Consulta e valida uma ata pelo seu identificador do IPFS
     * @param _ipfsCID O CID do IPFS a ser consultado
     */
    function obterAta(string calldata _ipfsCID) external view returns (
        string memory ipfsCID,
        address professor,
        address aluno,
        uint256 timestamp
    ) {
        Ata memory a = atasPorCID[_ipfsCID];
        require(a.timestamp > 0, "Ata nao encontrada com este CID");
        return (a.ipfsCID, a.professor, a.aluno, a.timestamp);
    }

    /**
     * @notice Retorna o total de atas registradas com IPFS no contrato
     */
    function totalAtas() external view returns (uint256) {
        return historicoCIDs.length;
    }
}
`;


export const SMART_CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "documentHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "assinante",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "blockNumber",
        "type": "uint256"
      }
    ],
    "name": "AtaRegistrada",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_documentHash",
        "type": "bytes32"
      }
    ],
    "name": "registrarHash",
    "outputs": [
      {
        "internalType": "bool",
        "name": "sucesso",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_documentHash",
        "type": "bytes32"
      }
    ],
    "name": "verificarAta",
    "outputs": [
      {
        "internalType": "bool",
        "name": "existe",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "assinante",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "blockNumber",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_documentHash",
        "type": "bytes32"
      }
    ],
    "name": "obterEstadoAta",
    "outputs": [
      {
        "internalType": "string",
        "name": "estado",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "assinante",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalAtasRegistradas",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export const SUPPORTED_NETWORKS = [
  {
    id: 'sepolia',
    name: 'Ethereum Sepolia Testnet',
    chainId: 11155111,
    currencySymbol: 'SepoliaETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.sepolia.org',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: 'amoy',
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    currencySymbol: 'POL',
    explorerUrl: 'https://amoy.polygonscan.com',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
  }
];

// Endereço de demonstração de contrato implantado nas testnets
export const DEFAULT_CONTRACT_ADDRESSES: Record<string, string> = {
  sepolia: '0x3a48981A4aE8e08Fa6714E69719F8a0fF08d74B2',
  amoy: '0x8fE091176b5d95dD3eF186D9C58742b6cbA32Db9'
};
