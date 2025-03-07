# Overview

## Prerequisites

1. **Foundry Tools** (forge, anvil, cast):

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Node.js and npm/yarn**:

- Node.js >= 18.x
- npm >= 9.x

## Installation

```bash
# Clone the repository
git clone https://github.com/stevennevins/storage-proofs.git
cd storage-proofs

# Install dependencies
npm install
```

## Project Setup

1. Start local Anvil node in a terminal:

```bash
anvil
```

2. Build and test contracts:

```bash
forge build
forge test
```

3. Deploy to local Anvil:

```bash
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Storage Proofs and Verification

4. Set a value in the contract:

```bash
cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    0x5FbDB2315678afecb367f032d93F642f64180aa3 \
    "set(uint256)" 42
```

5. Run storage proof tests:

```bash
npm test
```
