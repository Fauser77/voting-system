const readline = require('readline');
const { ethers } = require('ethers');
const fs = require('fs').promises;
const path = require('path');
const {getContractConfig} = require('../core/elgamal-utils');

// Configuration paths
const CONFIG_DIR = path.join(__dirname, '../../config');
const CPF_FILE = path.join(CONFIG_DIR, 'election-cpfs.json');
const ELECTION_CONFIG_FILE = path.join(CONFIG_DIR, 'election-config.json');

// Configuration
const PROVIDER_URL = 'http://localhost:8545';
//const CONTRACT_ADDRESS = '0x11Ac9a244A4468C4E12fF2f3593e32f2aABa8c92'; // Update after deployment
const PRIVATE_KEY = '0x4b303ac43aaaee7491caebd674f22356343b7fbfa936e3b313564fc4132ef744'; // Admin account to register voters

// Contract ABI (only functions we need)
const CONTRACT_ABI = [
  "function checkCPFStatus(bytes32 cpfHash) view returns (bool isUsed)",
  "function registerVoterWithCPF(address voterAddress, bytes32 cpfHash)",
  "event VoterRegistered(address indexed voter, bytes32 indexed cpfHash)"
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function hashCPF(cpf) {
  return ethers.keccak256(ethers.toUtf8Bytes(cpf));
}

async function loadAuthorizedCPFs() {
  try {
    const data = await fs.readFile(CPF_FILE, 'utf8');
    return JSON.parse(data).cpfs;
  } catch (error) {
    console.error('❌ Erro ao carregar CPFs autorizados');
    throw error;
  }
}

async function checkCPFOffChain(cpf, authorizedCPFs) {
  return authorizedCPFs.includes(cpf);
}

async function checkCPFOnChain(cpfHash, contract) {
  try {
    const isUsed = await contract.checkCPFStatus(cpfHash);
    return !isUsed; // Return true if NOT used
  } catch (error) {
    console.error('❌ Erro ao verificar status on-chain');
    throw error;
  }
}

function generateKeyPair() {
  // Generate a new random wallet
  const wallet = ethers.Wallet.createRandom();
  return {
    privateKey: wallet.privateKey,
    address: wallet.address
  };
}

async function registerVoterOnChain(voterAddress, cpfHash, contract) {
  try {
    console.log('📝 Registrando eleitor no blockchain...');
    const tx = await contract.registerVoterWithCPF(voterAddress, cpfHash);
    console.log('⏳ Aguardando confirmação...');
    await tx.wait();
    console.log('✅ Eleitor registrado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao registrar eleitor:', error.message);
    return false;
  }
}

async function updateConfigFile(voterAddress) {
  try {
    const configData = await fs.readFile(ELECTION_CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    if (!config.authorizedVoters.includes(voterAddress)) {
      config.authorizedVoters.push(voterAddress);
      await fs.writeFile(ELECTION_CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log('📄 Configuração atualizada');
    }
  } catch (error) {
    console.error('⚠️ Aviso: Não foi possível atualizar election-config.json');
  }
}

async function main() {
  console.log('=== Sistema de Autorização de Eleitores ===\n');
  const config = await getContractConfig();
  const contract_adress = config.contract.target;
  console.log('address:', contract_adress);
  
  try {
    // Setup
    const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contract_adress, CONTRACT_ABI, signer);
    
    // Load authorized CPFs
    const authorizedCPFs = await loadAuthorizedCPFs();
    console.log(`✅ ${authorizedCPFs.length} CPFs autorizados carregados\n`);
    
    // Get CPF from user
    const cpf = await question('Digite seu CPF (apenas números): ');
    
    // Validate CPF format
    if (!/^\d{11}$/.test(cpf)) {
      console.log('❌ CPF inválido. Use apenas 11 números.');
      rl.close();
      return;
    }
    
    // Step 1: Check if CPF is in authorized list (off-chain)
    console.log('\n🔍 Verificando autorização...');
    if (!await checkCPFOffChain(cpf, authorizedCPFs)) {
      console.log('❌ CPF não autorizado para esta eleição');
      rl.close();
      return;
    }
    console.log('✅ CPF autorizado');
    
    // Step 2: Check if CPF was already used (on-chain)
    console.log('🔍 Verificando status do CPF...');
    const cpfHash = hashCPF(cpf);
    if (!await checkCPFOnChain(cpfHash, contract)) {
      console.log('❌ Este CPF já foi utilizado para gerar chaves');
      rl.close();
      return;
    }
    console.log('✅ CPF disponível para registro');
    
    // Step 3: Generate key pair
    console.log('\n🔐 Gerando par de chaves...');
    const keyPair = generateKeyPair();
    console.log('✅ Chaves geradas com sucesso');
    
    // Step 4: Register voter on-chain
    const registered = await registerVoterOnChain(keyPair.address, cpfHash, contract);
    
    if (!registered) {
      console.log('❌ Falha no registro. Tente novamente.');
      rl.close();
      return;
    }
    
    // Step 5: Update config file
    await updateConfigFile(keyPair.address);
    
    // Step 6: Display keys to voter
    console.log('\n' + '='.repeat(60));
    console.log('🎉 REGISTRO CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n⚠️  ATENÇÃO: Guarde estas informações com segurança!');
    console.log('    Você precisará delas para votar.\n');
    console.log('📍 Seu endereço público:');
    console.log(`   ${keyPair.address}\n`);
    console.log('🔑 Sua chave privada:');
    console.log(`   ${keyPair.privateKey}\n`);
    console.log('='.repeat(60));
    console.log('\n⚠️  NUNCA compartilhe sua chave privada com ninguém!');
    console.log('    Sem ela, você não poderá votar.');
    
  } catch (error) {
    console.error('\n❌ Erro no sistema:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch(console.error);