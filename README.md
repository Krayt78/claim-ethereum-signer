# Ethereum Signer for Substrate Claims

This project provides JavaScript utilities for managing and claiming tokens in a Substrate-based blockchain using Ethereum signatures. It includes tools for setting up claims, registering them, and executing the claims using Ethereum signatures.

## Overview

The project consists of three main scripts:
- `setup_extrinsics.js`: Sets up the initial state (funds pallet, registers test claims)
- `register_claim.js`: Registers claims for Ethereum addresses
- `sign.js`: Generates Ethereum signatures and submits claims

## Prerequisites

- Node.js (v14 or later)
- A running Substrate node with the airdrop pallet
- Access to sudo account (Alice) for registration
- An Ethereum private key for claiming

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Configuration

### Common Settings
- `WS_ENDPOINT`: WebSocket endpoint for your Substrate node (default: `ws://127.0.0.1:9944`)
- `TEST_ETH_ADDRESS`: Ethereum address for testing (in `setup_extrinsics.js`)

### For Claiming
In `sign.js`:
- Update `privateKey` with your Ethereum private key
- Adjust `PREFIX` if your pallet uses a different signing prefix

### For Registration
In `register_claim.js`:
- Set `ETHEREUM_ADDRESS` to match your target address
- Adjust `CLAIM_AMOUNT` to set the token amount

## Usage

1. First, set up the environment and register test claims:
```bash
node setup_extrinsics.js
```

2. Register a specific claim (requires sudo access):
```bash
node register_claim.js
```

3. Generate signature and claim tokens:
```bash
node sign.js
```

## Script Details

### setup_extrinsics.js
- Connects to the Substrate chain
- Funds the airdrop pallet account
- Registers test claims
- Displays claim information

### register_claim.js
- Registers claims for specific Ethereum addresses
- Requires sudo access (Alice in development)
- Verifies claim registration

### sign.js
- Generates Ethereum signatures for claiming
- Handles message formatting and signing
- Submits unsigned claim transactions
- Verifies signature recovery

## Dependencies

- `@polkadot/api`: Substrate chain interaction
- `@polkadot/keyring`: Account management
- `@polkadot/util`: Utility functions
- `ethers`: Ethereum signing and key management
- `keccak256`: Message hashing

## Development

- Use `.env` for sensitive configuration (not included)
- Check `.gitignore` for excluded files
- Run scripts individually for testing

## Troubleshooting

If you encounter issues:
1. Verify your node is running and accessible
2. Check claim registration status
3. Ensure correct Ethereum key configuration
4. Verify signature generation and recovery
