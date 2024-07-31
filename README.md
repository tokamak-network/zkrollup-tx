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
  Inputs(singleTx(k)) = 13 + 4 * k
  ~~~
    - **Fixed Inputs**: Total of 13 inputs.
    - **Variable Inputs Based on k**:
      - **Proofs**: `sender_proof`, `sender_proof_pos`, `receiver_proof`, `receiver_proof_pos`: Total of 4k inputs.


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

Before running the development build, follow these steps:

1. Navigate to the circuits folder.
2. Generate the JSON input file by executing the following command:
~~~bash
node generate_input_multipleTx.js
~~~

3. After generating the input file, proceed with the development build:
~~~bash
yarn circom:dev
~~~

## Production builds

`yarn circom:prod` for production builds (using `Date.now()` as entropy)
