const fs = require("fs");
const { buildBabyjub, buildPoseidon, buildEddsa } = require("circomlibjs");

async function main() {
  const babyJub = await buildBabyjub();
  const poseidon = await buildPoseidon();
  const eddsa = await buildEddsa();
  const F = babyJub.F;
  
  // Circuit parameters
  const k = 2; // depth of the merkle tree
  const n = 3; // number of transactions
  const accountsCount = 2**k; // number of accounts

  // Setup accounts
  const accounts = Array(accountsCount).fill().map((_, i) => ({
    privateKey: Buffer.from((i + 1).toString().padStart(64, "0"), "hex"),
    balance: 1000 * (i + 1)
  }));

  accounts.forEach(account => {
    account.publicKey = eddsa.prv2pub(account.privateKey);
  });

  // Helper function to calculate account hash
  function calculateAccountHash(account) {
    return poseidon([account.publicKey[0], account.publicKey[1], account.balance]);
  }

  // Helper function to calculate Merkle root
  function calculateMerkleRoot(hashes) {
    if (hashes.length === 1) return hashes[0];
    const newHashes = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = i + 1 < hashes.length ? hashes[i + 1] : left;
      newHashes.push(poseidon([left, right]));
    }
    return calculateMerkleRoot(newHashes);
  }

  // Helper function to generate Merkle proof
  function generateMerkleProof(hashes, index) {
    const proof = [];
    const proofPos = [];
    let currentIndex = index;
    while (hashes.length > 1) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      proof.push(siblingIndex < hashes.length ? hashes[siblingIndex] : hashes[currentIndex]);
      proofPos.push(currentIndex % 2);
      hashes = hashes.reduce((acc, _, i, arr) => {
        if (i % 2 === 0) acc.push(poseidon([arr[i], arr[i + 1] || arr[i]]));
        return acc;
      }, []);
      currentIndex = Math.floor(currentIndex / 2);
    }
    return { proof, proofPos };
  }

  // Calculate initial account hashes and root
  let accountHashes = accounts.map(calculateAccountHash);
  let currentRoot = calculateMerkleRoot(accountHashes);

  // Define transactions
  const transactions = [
    { from: 0, to: 3, amount: 100 },
    { from: 1, to: 2, amount: 50 },
    { from: 2, to: 0, amount: 25 }
  ];

  const inputs = {
    initial_accounts_root: BigInt(F.toObject(currentRoot)).toString(),
    accounts_pubkey: Array(n).fill().map(() => Array(accountsCount).fill().map(() => ["0", "0"])),
    accounts_balance: Array(n).fill().map(() => Array(accountsCount).fill("0")),
    sender_pubkey: Array(n).fill().map(() => ["0", "0"]),
    sender_balance: Array(n).fill("0"),
    receiver_pubkey: Array(n).fill().map(() => ["0", "0"]),
    receiver_balance: Array(n).fill("0"),
    amount: Array(n).fill("0"),
    signature_R8x: Array(n).fill("0"),
    signature_R8y: Array(n).fill("0"),
    signature_S: Array(n).fill("0"),
    sender_proof: Array(n).fill().map(() => Array(k).fill("0")),
    sender_proof_pos: Array(n).fill().map(() => Array(k).fill("0")),
    receiver_proof: Array(n).fill().map(() => Array(k).fill("0")),
    receiver_proof_pos: Array(n).fill().map(() => Array(k).fill("0")),
    enabled: Array(n).fill("0"),
    intermediate_roots: Array(n).fill("0")
  };

  for (let i = 0; i < n; i++) {
    const tx = transactions[i];
    const sender = accounts[tx.from];
    const receiver = accounts[tx.to];

    // Calculate intermediate state (after sender's balance is updated)
    const intermediateSenderBalance = sender.balance - tx.amount;
    const intermediateAccountHashes = [...accountHashes];
    intermediateAccountHashes[tx.from] = poseidon([sender.publicKey[0], sender.publicKey[1], intermediateSenderBalance]);
    const intermediateRoot = calculateMerkleRoot(intermediateAccountHashes);

    // Update balances
    sender.balance -= tx.amount;
    receiver.balance += tx.amount;

    // Update account hashes
    accountHashes[tx.from] = calculateAccountHash(sender);
    accountHashes[tx.to] = calculateAccountHash(receiver);

    // Calculate new root
    const newRoot = calculateMerkleRoot(accountHashes);

    // Sign transaction
    const txHash = poseidon([
      sender.publicKey[0], sender.publicKey[1], receiver.publicKey[0], receiver.publicKey[1], F.e(tx.amount)
    ]);
    const signature = eddsa.signPoseidon(sender.privateKey, txHash);

    // Generate Merkle proofs
    const senderProof = generateMerkleProof(intermediateAccountHashes, tx.from);
    const receiverProof = generateMerkleProof(accountHashes, tx.to);

    // Prepare inputs for this transaction
    for (let j = 0; j < accountsCount; j++) {
      inputs.accounts_pubkey[i][j] = [
        BigInt(F.toObject(accounts[j].publicKey[0])).toString(),
        BigInt(F.toObject(accounts[j].publicKey[1])).toString()
      ];
      inputs.accounts_balance[i][j] = accounts[j].balance.toString();
    }
    inputs.sender_pubkey[i] = [
      BigInt(F.toObject(sender.publicKey[0])).toString(),
      BigInt(F.toObject(sender.publicKey[1])).toString()
    ];
    inputs.sender_balance[i] = (sender.balance + tx.amount).toString();
    inputs.receiver_pubkey[i] = [
      BigInt(F.toObject(receiver.publicKey[0])).toString(),
      BigInt(F.toObject(receiver.publicKey[1])).toString()
    ];
    inputs.receiver_balance[i] = (receiver.balance - tx.amount).toString();
    inputs.amount[i] = tx.amount.toString();
    inputs.signature_R8x[i] = BigInt(F.toObject(signature.R8[0])).toString();
    inputs.signature_R8y[i] = BigInt(F.toObject(signature.R8[1])).toString();
    inputs.signature_S[i] = BigInt(signature.S).toString();

    inputs.sender_proof[i] = senderProof.proof.map(h => BigInt(F.toObject(h)).toString());
    inputs.sender_proof_pos[i] = senderProof.proofPos.map(String);
    inputs.receiver_proof[i] = receiverProof.proof.map(h => BigInt(F.toObject(h)).toString());
    inputs.receiver_proof_pos[i] = receiverProof.proofPos.map(String);
    inputs.enabled[i] = "1";

    inputs.intermediate_roots[i] = BigInt(F.toObject(intermediateRoot)).toString();

    // Update current root for next transaction
    currentRoot = newRoot;
  }

  console.log(BigInt(F.toObject(currentRoot)).toString());
  fs.writeFileSync("./multipleTx.json", JSON.stringify(inputs), 'utf-8');
}

main();