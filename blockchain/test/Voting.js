const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting", function () {
  let voting;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Obter os signers (contas de teste)
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy do contrato para testes - não use mais .deployed()
    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();
    await voting.waitForDeployment(); // Use waitForDeployment ao invés de deployed()
  });

  it("Deve inicializar com 2 candidatos", async function () {
    const count = await voting.candidatesCount();
    expect(count).to.equal(2);
  });

  it("Deve permitir um voto válido", async function () {
    await voting.connect(addr1).vote(1);
    
    // Verificar se o voto foi registrado
    const candidato = await voting.candidates(1);
    expect(candidato.voteCount).to.equal(1);
    
    // Verificar se o eleitor foi marcado como tendo votado
    expect(await voting.voters(addr1.address)).to.equal(true);
  });

  it("Não deve permitir votar duas vezes", async function () {
    await voting.connect(addr1).vote(1);
    
    // Tentar votar novamente deve falhar
    await expect(
      voting.connect(addr1).vote(2)
    ).to.be.revertedWith("Voce ja votou.");
  });

  it("Não deve permitir votar em um candidato inválido", async function () {
    await expect(
      voting.connect(addr1).vote(99)
    ).to.be.revertedWith("Candidato invalido.");
  });
});