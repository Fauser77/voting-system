const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ballot", function () {
  let ballot;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    // Obter os signers (contas de teste)
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    // Preparar os nomes dos candidatos para passar ao construtor
    const candidateNames = ["Candidato 1", "Candidato 2"];
    
    // Deploy do contrato para testes
    const Ballot = await ethers.getContractFactory("Ballot");
    ballot = await Ballot.deploy(candidateNames);
    await ballot.waitForDeployment();
  });

  it("Deve ser implantado com os candidatos corretos", async function () {
    // Verificar se existem 2 candidatos
    const count = await ballot.getProposalCount();
    expect(count).to.equal(2);
    
    // Verificar os nomes dos candidatos
    const candidate1 = await ballot.getCandidate(0);
    const candidate2 = await ballot.getCandidate(1);
    
    expect(candidate1[0]).to.equal("Candidato 1");
    expect(candidate2[0]).to.equal("Candidato 2");
    
    // Ambos devem começar com 0 votos
    expect(candidate1[1]).to.equal(0);
    expect(candidate2[1]).to.equal(0);
  });

  it("Deve definir o chairperson como o deployer do contrato", async function () {
    const chairPerson = await ballot.chairPerson();
    expect(chairPerson).to.equal(owner.address);
    
    // O chairperson deve ter direito a voto por padrão
    expect(await ballot.hasRightToVote(owner.address)).to.equal(true);
  });

  it("Deve permitir que o chairperson dê direito de voto a outros", async function () {
    // Verificar que addr1 começa sem direito a voto
    expect(await ballot.hasRightToVote(addr1.address)).to.equal(false);
    
    // Dar direito de voto a addr1
    await ballot.giveRightToVote(addr1.address);
    
    // Verificar que addr1 agora tem direito a voto
    expect(await ballot.hasRightToVote(addr1.address)).to.equal(true);
  });

  it("Não deve permitir que não-chairperson dê direito de voto", async function () {
    // Tentar dar direito de voto a partir de addr1 deve falhar
    await expect(
      ballot.connect(addr1).giveRightToVote(addr2.address)
    ).to.be.revertedWith("Apenas o administrador pode executar esta funcao");
  });

  it("Deve permitir um voto válido", async function () {
    // Dar direito de voto a addr1
    await ballot.giveRightToVote(addr1.address);
    
    // addr1 vota no candidato 0
    await ballot.connect(addr1).vote(0);
    
    // Verificar se o voto foi registrado
    const candidate = await ballot.getCandidate(0);
    expect(candidate[1]).to.equal(1);
    
    // Verificar se o eleitor foi marcado como tendo votado
    const voter = await ballot.voters(addr1.address);
    expect(voter.isVoted).to.equal(true);
    expect(voter.vote).to.equal(0);
  });

  it("Não deve permitir votar sem direito a voto", async function () {
    // addr2 tenta votar sem ter direito
    await expect(
      ballot.connect(addr2).vote(1)
    ).to.be.revertedWith("Voce nao tem direito a voto");
  });

  it("Não deve permitir votar duas vezes", async function () {
    // Dar direito de voto a addr1
    await ballot.giveRightToVote(addr1.address);
    
    // addr1 vota no candidato 0
    await ballot.connect(addr1).vote(0);
    
    // Tentar votar novamente deve falhar
    await expect(
      ballot.connect(addr1).vote(1)
    ).to.be.revertedWith("Voce ja votou");
  });

  it("Não deve permitir votar em um candidato inválido", async function () {
    // Dar direito de voto a addr1
    await ballot.giveRightToVote(addr1.address);
    
    // Tentar votar em um candidato que não existe
    await expect(
      ballot.connect(addr1).vote(99)
    ).to.be.revertedWith("Proposta invalida");
  });

  it("Deve determinar corretamente o vencedor", async function () {
    // Dar direito de voto a addr1 e addr2
    await ballot.giveRightToVote(addr1.address);
    await ballot.giveRightToVote(addr2.address);
    
    // O owner e addr1 votam no candidato 0, addr2 vota no candidato 1
    await ballot.vote(0);
    await ballot.connect(addr1).vote(0);
    await ballot.connect(addr2).vote(1);
    
    // Candidato 0 deve ser o vencedor
    const winningProposalIndex = await ballot.winningProposal();
    expect(winningProposalIndex).to.equal(0);
    
    // Verificar o nome do vencedor
    const winnerName = await ballot.winnerName();
    expect(winnerName).to.equal("Candidato 1");
  });

  it("Deve emitir evento quando um voto é registrado", async function () {
    // Dar direito de voto a addr1
    await ballot.giveRightToVote(addr1.address);
    
    // Verificar se o evento é emitido com os parâmetros corretos
    await expect(ballot.connect(addr1).vote(0))
      .to.emit(ballot, "VoteCast")
      .withArgs(await ethers.provider.getBlockNumber() + 1, "Candidato 1");
  });
});