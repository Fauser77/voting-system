// Script para gerar e salvar parâmetros ElGamal de 256 bits (compatível com Solidity)
// Execução: node scripts/elgamal-params-generator.js

const crypto = require('crypto');
const fs = require('fs');
const { modPow } = require('../core/elgamal-utils');
const path = require('path');
const paramsFile = path.join(__dirname, '../../config/elgamal-params.json');


// Teste de primalidade Miller-Rabin
function isProbablePrime(n, k = 20) { // Aumentado k para mais segurança
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

// Função para gerar primo seguro p = 2q + 1 onde q também é primo
function generateSafePrime(bits = 256) {
    console.log(`Gerando primo seguro de ${bits} bits (p = 2q + 1)...`);
    let p, q;
    let attempts = 0;
    
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    do {
        attempts++;
        if (attempts % 100 === 0) {
            console.log(`  Tentativa ${attempts}...`);
        }
        
        // Gerar candidato para q (primo Sophie Germain)
        const qBytes = crypto.randomBytes(32);
        qBytes[0] = qBytes[0] & 0x3F; // Garantir que 2q+1 < 2^256
        qBytes[0] |= 0x20; // Garantir número grande
        
        q = BigInt('0x' + qBytes.toString('hex'));
        if (q % 2n === 0n) q += 1n;
        
        // Verificar se q é primo
        if (!isProbablePrime(q, 20)) continue;
        
        // Calcular p = 2q + 1
        p = 2n * q + 1n;
        
        // Verificar limites e se p é primo
        if (p <= MAX_UINT256 && isProbablePrime(p, 20)) {
            console.log(`  ✓ Primo seguro encontrado após ${attempts} tentativas`);
            console.log(`  q = ${q.toString().substring(0, 40)}...`);
            console.log(`  p = ${p.toString().substring(0, 40)}...`);
            return { p, q };
        }
    } while (attempts < 50000);
    
    // Fallback para primo comum se não encontrar primo seguro
    console.log("  ⚠️ Não encontrou primo seguro, usando primo comum...");
    return { p: generateLargePrime(bits), q: null };
}

// Função para gerar primo comum (fallback)
function generateLargePrime(bits = 256) {
    console.log(`Gerando primo comum de ${bits} bits...`);
    let prime;
    let attempts = 0;
    
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    
    do {
        attempts++;
        const bytes = Math.ceil(bits / 8);
        const buffer = crypto.randomBytes(bytes);
        
        buffer[0] = buffer[0] & 0x7F;
        buffer[0] |= 0x40;
        
        prime = BigInt('0x' + buffer.toString('hex'));
        
        if (prime > MAX_UINT256) continue;
        if (prime % 2n === 0n) prime += 1n;
        
        if (isProbablePrime(prime, 20)) {
            console.log(`  Primo encontrado após ${attempts} tentativas`);
            return prime;
        }
    } while (attempts < 10000);
    
    throw new Error("Não foi possível gerar primo");
}

// Função melhorada para encontrar gerador
function findGenerator(p, q = null) {
    console.log("Procurando gerador do subgrupo de ordem q...");
    
    // Se temos q (primo seguro), procurar gerador do subgrupo de ordem q
    if (q) {
        // Para primo seguro, procurar gerador de ordem q (mais seguro)
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            
            // Gerar h aleatório
            const hBytes = crypto.randomBytes(32);
            let h = BigInt('0x' + hBytes.toString('hex')) % (p - 2n) + 2n;
            
            // g = h^2 mod p garante que g está no subgrupo de ordem q
            let g = modPow(h, 2n, p);
            
            // Verificar se g != 1 e g^q = 1 (confirmando ordem q)
            if (g !== 1n && modPow(g, q, p) === 1n) {
                console.log(`  ✓ Gerador encontrado (ordem q): ${g.toString().substring(0, 40)}...`);
                return g;
            }
        }
    }
    
    // Fallback: usar gerador pequeno mas verificado
    console.log("  Usando gerador padrão verificado...");
    const pm1 = p - 1n;
    const factors = [2n]; // Fatores conhecidos de p-1
    
    if (q) factors.push(q);
    
    // Testar geradores candidatos
    for (let g = 2n; g < 100n; g++) {
        let isGenerator = true;
        
        for (const factor of factors) {
            const exp = pm1 / factor;
            if (modPow(g, exp, p) === 1n) {
                isGenerator = false;
                break;
            }
        }
        
        if (isGenerator) {
            console.log(`  ✓ Gerador encontrado: ${g}`);
            return g;
        }
    }
    
    return 2n; // Fallback final
}

// Função principal para gerar parâmetros
function generateAndSaveParams() {
    console.log("================================================");
    console.log("   GERADOR DE PARÂMETROS ELGAMAL 256 BITS");
    console.log("   (Compatível com uint256 do Solidity)");
    console.log("================================================\n");
    
    // Tentar gerar primo seguro primeiro
    const { p, q } = generateSafePrime(256);
    
    console.log(`\n📊 Primo P (${p.toString(2).length} bits):`);
    console.log(`  Decimal: ${p.toString()}`);
    console.log(`  Hex: 0x${p.toString(16)}`);
    if (q) {
        console.log(`  Tipo: Primo seguro (p = 2q + 1)`);
    } else {
        console.log(`  Tipo: Primo comum`);
    }
    
    // Verificar limite uint256
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    if (p > MAX_UINT256) {
        console.error("❌ Erro: Primo gerado excede uint256!");
        process.exit(1);
    }
    console.log(`  ✓ Compatível com uint256`);
    
    // Encontrar gerador g
    const g = findGenerator(p, q);
    console.log(`\n📊 Gerador G:`);
    console.log(`  Decimal: ${g.toString()}`);
    if (g.toString().length > 20) {
        console.log(`  Hex: 0x${g.toString(16)}`);
    }
    
    // Gerar chave privada x
    console.log("\n🔑 Gerando chave privada...");
    const xBytes = crypto.randomBytes(32);
    // x deve estar em [1, p-2] para segurança máxima
    const x = (BigInt('0x' + xBytes.toString('hex')) % (p - 2n)) + 1n;
    console.log(`  X (${x.toString(2).length} bits)`);
    console.log(`  ⚠️  ATENÇÃO: Esta chave deve ser mantida em SEGREDO!`);
    
    // Calcular chave pública h = g^x mod p
    console.log("\n🔑 Calculando chave pública H = G^X mod P...");
    const h = modPow(g, x, p);
    console.log(`  H (chave pública):`);
    console.log(`  Decimal: ${h.toString()}`);
    console.log(`  Hex: 0x${h.toString(16)}`);
    
    // Verificação final
    console.log("\n✅ Verificação final:");
    console.log(`  P < 2^256: ${p < MAX_UINT256 ? '✓' : '✗'}`);
    console.log(`  G < P: ${g < p ? '✓' : '✗'}`);
    console.log(`  H < P: ${h < p ? '✓' : '✗'}`);
    console.log(`  X < P-1: ${x < (p - 1n) ? '✓' : '✗'}`);
    console.log(`  G ≠ 1: ${g !== 1n ? '✓' : '✗'}`);
    console.log(`  H ≠ 1: ${h !== 1n ? '✓' : '✗'}`);
    
    // Teste de corretude: verificar se podemos cifrar e decifrar
    console.log("\n🔬 Teste de corretude:");
    const testMsg = 42n;
    const k = (BigInt('0x' + crypto.randomBytes(32).toString('hex')) % (p - 2n)) + 1n;
    const c1 = modPow(g, k, p);
    const c2 = (testMsg * modPow(h, k, p)) % p;
    const decrypted = (c2 * modPow(c1, p - 1n - x, p)) % p;
    console.log(`  Mensagem original: ${testMsg}`);
    console.log(`  Mensagem decifrada: ${decrypted}`);
    console.log(`  Teste: ${testMsg === decrypted ? '✓ PASSOU' : '✗ FALHOU'}`);
    
    // Salvar em arquivo
    const params = {
        p: p.toString(),
        g: g.toString(),
        h: h.toString(),
        x: x.toString(),
        generated: new Date().toISOString(),
        bits: 256,
        type: q ? 'safe_prime' : 'common_prime'
    };
    
    fs.writeFileSync(paramsFile, JSON.stringify(params, null, 2));
    console.log("\n✅ Parâmetros salvos em elgamal-params.json");
    console.log("   Use estes parâmetros em deploy.js");
    
    // Aviso de segurança
    console.log("\n⚠️  IMPORTANTE:");
    console.log("   - Mantenha a chave privada (x) em SEGREDO");
    console.log("   - Considere usar um HSM em produção");
    console.log("   - Faça backup seguro dos parâmetros");
    
    return params;
}

// Executar se chamado diretamente
if (require.main === module) {
    generateAndSaveParams();
}

module.exports = { generateAndSaveParams, modPow };