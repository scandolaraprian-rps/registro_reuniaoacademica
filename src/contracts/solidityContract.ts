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
     * @notice Retorna a quantidade total de atas registradas no contrato
     */
    function totalAtasRegistradas() external view returns (uint256) {
        return historicoHashes.length;
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
