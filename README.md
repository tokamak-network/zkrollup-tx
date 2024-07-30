# Documentation

### Basic Rollup Transaction Circuits Progress

This update outlines the current computational constraints and input structures for the `SingleTx` and `MultipleTx` components of our rollup system, highlighting areas for potential optimization.

### SingleTx Component Status

The `SingleTx` component processes individual transactions. Here are the details on constraints and inputs:

- **Constraints**:
  ~~~ 
  MiMC hash: Constraints(singleTx(k)) = 11900 + 2924 * k
  Poseidon hash: Constraints(singleTx(k)) = 5582 + 972 * k
  ~~~
    - The variable `k` indicates the depth of the accounts tree involved in the transaction.

  ⚠️ Poseidon hash constraints increase approximately 8 times when converted to Plonk constraints.
- **Inputs**:
  ~~~
  Inputs(singleTx(k)) = 13 + 4 * k + 3 * 2^k
  ~~~
    - **Fixed Inputs**: Total of 13 inputs.
    - **Variable Inputs Based on k**:
      - **Proofs**: `sender_proof`, `sender_proof_pos`, `receiver_proof`, `receiver_proof_pos`: Total of 4k inputs.
      - **Accounts Public Keys**: Requires 2 * 2^k inputs.
      - **Accounts Balances**: Requires 2^k inputs.


### MultipleTx Component Status

The `MultipleTx` component manages the processing of multiple transactions per batch:

- **Constraints**:
  ~~~
  Constraints(multipleTx(k, n)) = n * (singleTx(k))
  ~~~
    - `n` represents the number of transactions in a batch.

- **Inputs**:
  ~~~
  Inputs(multipleTx(k, n)) ≈ n * (Inputs(singleTx(k)))
  ~~~
    - This implies that the input requirements scale linearly with the number of transactions.



## Install

`yarn` to install dependencies

## Development builds

`yarn circom:dev` to build deterministic development circuits.

Further, for debugging purposes, you may wish to inspect the intermediate files. This is possible with the `--debug` flag which the `circom:dev` task enables by default. You'll find them (by default) in `artifacts/circom/`

To build a single circuit during development, you can use the `--circuit` CLI parameter. For example, if you make a change to `hash.circom` and you want to _only_ rebuild that, you can run `yarn circom:dev --circuit hash`.

## Production builds

`yarn circom:prod` for production builds (using `Date.now()` as entropy)
