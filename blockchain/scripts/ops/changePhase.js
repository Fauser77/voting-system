const hre = require("hardhat");
const readline = require("readline");

async function main() {
    const contractAddress = "0x6f576CE3bdF91505Cf725DBbAC850F600D985Bf1"; // Ajuste aqui
    
    const Voting = await hre.ethers.getContractFactory("Ballot");
    const voting = await Voting.attach(contractAddress);

    const phaseNames = ["Registration", "Voting", "Ended"];
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const askPhase = () => {
        voting.phase().then(currentPhase => {
            console.log(`\n📊 Fase atual: ${currentPhase} (${phaseNames[Number(currentPhase)]})`);
            console.log("\n0 = Registration");
            console.log("1 = Voting");
            console.log("2 = Ended");
            console.log("Enter = Sair\n");

            rl.question("Digite a nova fase: ", async (answer) => {
                if (answer === "") {
                    console.log("👋 Saindo...");
                    rl.close();
                    return;
                }

                const newPhase = parseInt(answer);
                
                if (newPhase < 0 || newPhase > 2 || isNaN(newPhase)) {
                    console.log("❌ Fase inválida! Use 0, 1 ou 2.");
                    askPhase();
                    return;
                }

                try {
                    console.log(`🔄 Mudando para fase ${newPhase} (${phaseNames[newPhase]})...`);
                    const tx = await voting.setPhase(newPhase);
                    await tx.wait();
                    console.log("✅ Fase alterada com sucesso!");
                } catch (error) {
                    console.log("❌ Erro:", error.message);
                }

                askPhase();
            });
        });
    };

    askPhase();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});