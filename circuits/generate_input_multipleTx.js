const fs = require("fs");
const { buildBabyjub, buildMimc7, buildEddsa } = require("circomlibjs");

async function main() {
  const babyJub = await buildBabyjub();
  const mimc7 = await buildMimc7();
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

  // Calculate initial root
  const accountHashes = accounts.map(account => 
    mimc7.multiHash([account.publicKey[0], account.publicKey[1], account.balance], 1)
  );
  
  let currentRoot = mimc7.multiHash(accountHashes, 1);

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

    // Calculate intermediate root (after sender's balance is updated)
    const intermediateSenderBalance = sender.balance - tx.amount;
    const intermediateAccountHashes = accountHashes.map((hash, index) => 
      index === tx.from ? mimc7.multiHash([sender.publicKey[0], sender.publicKey[1], intermediateSenderBalance], 1) : hash
    );
    const intermediateRoot = mimc7.multiHash(intermediateAccountHashes, 1);

    // Update balances
    sender.balance -= tx.amount;
    receiver.balance += tx.amount;

    // Calculate new account hashes
    accountHashes[tx.from] = mimc7.multiHash([sender.publicKey[0], sender.publicKey[1], sender.balance], 1);
    accountHashes[tx.to] = mimc7.multiHash([receiver.publicKey[0], receiver.publicKey[1], receiver.balance], 1);

    // Calculate new root
    const newRoot = mimc7.multiHash(accountHashes, 1);

    // Sign transaction
    const txHash = mimc7.multiHash(
      [sender.publicKey[0], sender.publicKey[1], receiver.publicKey[0], receiver.publicKey[1], tx.amount],
      1
    );
    const signature = eddsa.signMiMC(sender.privateKey, txHash);

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

    // Generate Merkle proofs (simplified version)
    inputs.sender_proof[i] = Array(k).fill(BigInt(F.toObject(accountHashes[0])).toString());
    inputs.sender_proof_pos[i] = Array(k).fill("0");
    inputs.receiver_proof[i] = Array(k).fill(BigInt(F.toObject(accountHashes[1])).toString());
    inputs.receiver_proof_pos[i] = Array(k).fill("1");
    inputs.enabled[i] = "1";

    // Add intermediate root
    inputs.intermediate_roots[i] = BigInt(F.toObject(intermediateRoot)).toString();

    // Update current root for next transaction
    currentRoot = newRoot;
  }

  console.log(BigInt(F.toObject(currentRoot)).toString());
  fs.writeFileSync("./multipleTx.json", JSON.stringify(inputs), 'utf-8');
}

main();