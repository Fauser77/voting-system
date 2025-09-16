// elgamal-params-generator.js
// Script para gerar e salvar parâmetros ElGamal de 256 bits (compatível com Solidity)
// Execução: node scripts/elgamal-params-generator.js

const crypto = require('crypto');
const fs = require('fs');

// Função para calcular exponenciação modular
function modPow(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) {
            result = (result * base) % modulus;
        }
        exponent = exponent / 2n;
        base = (base * base) % modulus;
    }
    return result;
}

// Teste de primalidade Miller-Rabin
function isProbablePrime(n, k = 10) {
    if (n === 2n || n === 3n) return true;
    if (n < 2n || n % 2n === 0n) return false;
    
    let d = n - 1n;
    let r = 0n;
    while (d % 2n === 0n) {
        d /= 2n;
        r++;
    }
    
    for (let i = 0; i < k; i++) {
        const a = BigInt(2) + BigInt(Math.floor(Math.random() * Number(n - 4n)));
        let x = modPow(a, d, n);
        
        if (x === 1n || x === n - 1n) continue;
        
        let continueWitnessLoop = false;
        for (let j = 0n; j < r - 1n; j++) {
            x = (x * x) % n;
            if (x === n - 1n) {
                continueWitnessLoop = true;
                break;
            }
        }
        
        if (!continueWitnessLoop) return false;
    }
    
    return true;
}

// Função para gerar primo seguro de n bits (ajustado para 256 bits)
function generateLargePrime(bits = 256) {
    console.log(`Gerando primo de ${bits} bits (compatível com uint256 do Solidity)...`);
    let prime;
    let attempts = 0;
    
    // Limite máximo para uint256: 2^256 - 1
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    do {
        attempts++;
        const bytes = Math.ceil(bits / 8);
        const buffer = crypto.randomBytes(bytes);
        
        // Para 256 bits, garantir que não exceda o limite
        if (bits === 256) {
            buffer[0] = buffer[0] & 0x7F; // Limpar bit mais significativo para garantir < 2^256
        }
        buffer[0] |= 0x40; // Setar segundo bit mais significativo para garantir número grande
        
        prime = BigInt('0x' + buffer.toString('hex'));
        
        // Garantir que está dentro do limite do uint256
        if (prime > MAX_UINT256) {
            continue;
        }
        
        if (prime % 2n === 0n) prime += 1n;
        
        if (isProbablePrime(prime, 10)) {
            console.log(`  Primo encontrado após ${attempts} tentativas`);
            return prime;
        }
    } while (attempts < 10000);
    
    throw new Error("Não foi possível gerar primo");
}

// Função para encontrar gerador primitivo (otimizada)
function findPrimitiveRoot(p) {
    console.log("Procurando gerador primitivo...");
    
    // Fatores conhecidos de p-1 para teste
    const pm1 = p - 1n;
    const halfPm1 = pm1 / 2n;
    
    // Testar pequenos primos como geradores
    const candidates = [2n, 3n, 5n, 7n, 11n, 13n];
    
    for (const g of candidates) {
        // Teste rápido: g^2 != 1 e g^((p-1)/2) != 1
        if (modPow(g, 2n, p) !== 1n && modPow(g, halfPm1, p) !== 1n) {
            console.log(`  Gerador encontrado: ${g}`);
            return g;
        }
    }
    
    // Se não encontrar entre os candidatos comuns, procurar
    for (let g = 17n; g < 100n; g += 2n) {
        if (modPow(g, 2n, p) !== 1n && modPow(g, halfPm1, p) !== 1n) {
            console.log(`  Gerador encontrado: ${g}`);
            return g;
        }
    }
    
    return 3n; // Fallback
}

// Função principal para gerar parâmetros
function generateAndSaveParams() {
    console.log("================================================");
    console.log("   GERADOR DE PARÂMETROS ELGAMAL 256 BITS");
    console.log("   (Compatível com uint256 do Solidity)");
    console.log("================================================\n");
    
    // Verificar se já existe arquivo
    if (fs.existsSync('elgamal-params.json')) {
        console.log("⚠️  Arquivo elgamal-params.json já existe!");
        console.log("   Use 'node scripts/elgamal-params-generator.js --force' para sobrescrever\n");
        
        if (!process.argv.includes('--force')) {
            const params = JSON.parse(fs.readFileSync('elgamal-params.json', 'utf8'));
            console.log("Parâmetros existentes:");
            console.log(`  P (${params.bits} bits): ${params.p.substring(0, 50)}...`);
            console.log(`  G: ${params.g}`);
            console.log(`  H: ${params.h.substring(0, 50)}...`);
            console.log(`  Gerado em: ${params.generated}`);
            return params;
        }
        console.log("Sobrescrevendo parâmetros existentes...\n");
    }
    
    // Gerar primo p de 256 bits (compatível com Solidity)
    const p = generateLargePrime(256);
    console.log(`\nP (${p.toString().length} dígitos, 256 bits):`);
    console.log(`  Hex: 0x${p.toString(16)}`);
    console.log(`  Decimal: ${p.toString()}`);
    
    // Verificar se está dentro do limite do uint256
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    if (p > MAX_UINT256) {
        console.error("❌ Erro: Primo gerado excede uint256!");
        process.exit(1);
    }
    console.log(`  ✓ Compatível com uint256 (< 2^256)`);
    
    // Encontrar gerador g
    const g = findPrimitiveRoot(p);
    console.log(`\nG (gerador): ${g}`);
    
    // Gerar chave privada x aleatória (também 256 bits)
    const xBytes = crypto.randomBytes(32); // 32 bytes = 256 bits
    const x = BigInt('0x' + xBytes.toString('hex')) % (p - 2n) + 1n;
    console.log(`\nX (chave privada - ${x.toString().length} dígitos):`);
    console.log(`  Hex: 0x${x.toString(16)}`);
    console.log(`  ⚠️  ATENÇÃO: Esta chave deve ser mantida em SEGREDO!`);
    
    // Calcular chave pública h = g^x mod p
    console.log("\nCalculando chave pública H = G^X mod P...");
    const h = modPow(g, x, p);
    console.log(`H (${h.toString().length} dígitos):`);
    console.log(`  Hex: 0x${h.toString(16)}`);
    console.log(`  Decimal: ${h.toString()}`);
    
    // Verificar todos os valores
    console.log("\n📊 Verificação final:");
    console.log(`  P < 2^256: ${p < MAX_UINT256 ? '✓' : '✗'}`);
    console.log(`  G < P: ${g < p ? '✓' : '✗'}`);
    console.log(`  H < P: ${h < p ? '✓' : '✗'}`);
    console.log(`  X < P: ${x < p ? '✓' : '✗'}`);
    
    // Salvar em arquivo
    const params = {
        p: p.toString(),
        g: g.toString(),
        h: h.toString(),
        x: x.toString(),
        generated: new Date().toISOString(),
        bits: 256
    };
    
    fs.writeFileSync('elgamal-params.json', JSON.stringify(params, null, 2));
    console.log("\n✅ Parâmetros salvos em elgamal-params.json");
    console.log("   Use estes parâmetros em deploy-elgamal.js e test-elgamal-voting.js");
    
    return params;
}

// Executar se chamado diretamente
if (require.main === module) {
    generateAndSaveParams();
}

module.exports = { generateAndSaveParams, modPow };