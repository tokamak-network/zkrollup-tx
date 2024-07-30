pragma circom 2.0.0;
include "./SingleTx.circom";

template MultipleTx(k, n) {
    // k is the depth of accounts tree
    // n is the number of transactions to process

    // Initial accounts root
    signal input initial_accounts_root;

    // Array of inputs for each transaction
    signal input sender_pubkey[n][2];
    signal input sender_balance[n];
    signal input receiver_pubkey[n][2];
    signal input receiver_balance[n];
    signal input amount[n];
    signal input signature_R8x[n];
    signal input signature_R8y[n];
    signal input signature_S[n];
    signal input sender_proof[n][k];
    signal input sender_proof_pos[n][k];
    signal input receiver_proof[n][k];
    signal input receiver_proof_pos[n][k];
    signal input enabled[n];
    signal input intermediate_roots[n];  // New input for intermediate roots

    // Output final accounts root after all transactions
    signal output final_accounts_root;

    // Array to store roots after each transaction
    signal roots[n+1];
    roots[0] <== initial_accounts_root;

    // Process each transaction sequentially
    component txs[n];
    for (var i = 0; i < n; i++) {
        txs[i] = SingleTx(k);

        // Connect inputs
        txs[i].accounts_root <== roots[i];
        txs[i].intermediate_root <== intermediate_roots[i];
        txs[i].sender_pubkey[0] <== sender_pubkey[i][0];
        txs[i].sender_pubkey[1] <== sender_pubkey[i][1];
        txs[i].sender_balance <== sender_balance[i];
        txs[i].receiver_pubkey[0] <== receiver_pubkey[i][0];
        txs[i].receiver_pubkey[1] <== receiver_pubkey[i][1];
        txs[i].receiver_balance <== receiver_balance[i];
        txs[i].amount <== amount[i];
        txs[i].signature_R8x <== signature_R8x[i];
        txs[i].signature_R8y <== signature_R8y[i];
        txs[i].signature_S <== signature_S[i];
        for (var j = 0; j < k; j++) {
            txs[i].sender_proof[j] <== sender_proof[i][j];
            txs[i].sender_proof_pos[j] <== sender_proof_pos[i][j];
            txs[i].receiver_proof[j] <== receiver_proof[i][j];
            txs[i].receiver_proof_pos[j] <== receiver_proof_pos[i][j];
        }
        txs[i].enabled <== enabled[i];

        // Store the new accounts root for the next transaction
        roots[i+1] <== txs[i].new_accounts_root;
    }

    // Set the final accounts root
    final_accounts_root <== roots[n];
}

component main = MultipleTx(2, 3);