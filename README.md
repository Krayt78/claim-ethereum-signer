# Ethereum Signer for Substrate Claims

This project provides JavaScript utilities for generating Ethereum signatures compatible with Substrate's claims pallet.

## Scripts

- `register_claim.js`: Registers a claim for an Ethereum address (requires root access)
- `sign.js`: Generates and submits an Ethereum signature to claim tokens

## Usage

1. First, register a claim for your Ethereum address:
```bash
node register_claim.js
```

2. Then generate and submit the signature to claim your tokens:
```bash
node sign.js
```

## Configuration

- Update the `privateKey` in `sign.js` with your Ethereum private key
- Update the `ETHEREUM_ADDRESS` in `register_claim.js` to match your address
- Adjust `CLAIM_AMOUNT` in `register_claim.js` as needed

## Dependencies

- ethers: For Ethereum key handling and signing
- @polkadot/api: For interacting with the Substrate node
- @polkadot/keyring: For Substrate account handling
- @polkadot/util: For utility functions
- keccak256: For message hashing
