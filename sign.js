import { ethers } from 'ethers';
import keccak256 from 'keccak256';
import { u8aToHex, hexToU8a, stringToU8a } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

// Replace this with your private key
const privateKey = '9116d6c6a9c830c06af62af6d4101b566e2466d88510b6c11d655545c74790a4';

// Substrate node WebSocket endpoint
const WS_ENDPOINT = 'ws://127.0.0.1:9944';

// Prefix used in the pallet (should match T::Prefix)
const PREFIX = 'Pay RUSTs to the TEST account:';

function toAsciiHex(data) {
    // Convert each byte to two ASCII hex characters
    const result = new Uint8Array(data.length * 2);
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        // First nibble
        const n1 = byte >> 4;
        result[i * 2] = n1 < 10 ? (48 + n1) : (97 + n1 - 10);
        // Second nibble
        const n2 = byte & 0x0F;
        result[i * 2 + 1] = n2 < 10 ? (48 + n2) : (97 + n2 - 10);
    }
    return result;
}

function numberToLEBytes(num) {
    // Encode as a single byte for small numbers
    if (num < 256) {
        const bytes = new Uint8Array(8);
        bytes[0] = num;
        return bytes;
    }
    // Otherwise use full u64 encoding
    const buffer = new Uint8Array(8);
    let n = BigInt(num);
    for (let i = 0; i < 8; i++) {
        buffer[i] = Number(n & BigInt(255));
        n >>= BigInt(8);
    }
    return buffer;
}

function createSubstrateAccount(num) {
    // Create a byte array of length 32 (substrate account length)
    const bytes = new Uint8Array(32);
    // Write the number in the first 8 bytes (little-endian)
    const numBytes = numberToLEBytes(num);
    bytes.set(numBytes, 0);
    // Create a substrate address from these bytes
    return encodeAddress(bytes);
}

function ethereumSignableMessage(what, extra = new Uint8Array(0)) {
    const prefix = PREFIX;
    const whatHex = toAsciiHex(what);
    
    // Calculate length exactly like the pallet does
    let length = prefix.length + whatHex.length + extra.length;
    let lengthBytes = [];
    while (length > 0) {
        // Add '0' (48 in ASCII) plus the digit
        lengthBytes.push(48 + (length % 10));
        length = Math.floor(length / 10);
    }
    lengthBytes.reverse();
    
    // Construct message exactly like the pallet
    const messagePrefix = Buffer.from('\x19Ethereum Signed Message:\n');
    return Buffer.concat([
        messagePrefix,
        Buffer.from(lengthBytes),
        Buffer.from(prefix),
        whatHex,
        Buffer.from(extra)
    ]);
}

async function connectToChain() {
    const wsProvider = new WsProvider(WS_ENDPOINT);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    return api;
}

async function signSubstrateStyle() {
    let api;
    try {
        // Connect to the Substrate chain
        console.log('Connecting to Substrate chain...');
        api = await connectToChain();
        console.log('Connected to chain');

        // Create a wallet instance from the private key
        const wallet = new ethers.Wallet(privateKey);
        console.log('Ethereum address:', wallet.address);

        // Create the account number and get its SCALE encoding
        const accountNumber = 42;
        const accountBytes = numberToLEBytes(accountNumber);
        
        // Convert account bytes to ASCII hex (this matches using_encoded(to_ascii_hex))
        const accountHexBytes = toAsciiHex(accountBytes);
        console.log('Account hex:', Buffer.from(accountHexBytes).toString());
        
        // Create the message similar to Substrate's ethereum_signable_message
        const message = ethereumSignableMessage(accountBytes);
        
        // Hash the message with keccak256
        const messageHash = keccak256(message);
        
        // Sign the message using the wallet's private key
        const messageHashBytes = ethers.getBytes(messageHash);
        const flatSig = await wallet.signingKey.sign(messageHashBytes);
        
        // Convert the signature to the format expected by Substrate
        // The v value should be normalized to 0
        const v = flatSig.v === 27 ? 0 : 1;
        
        // Create the 65-byte signature in the exact format expected by Substrate
        const signature = new Uint8Array(65);
        signature.set(ethers.getBytes(flatSig.r), 0);  // r - first 32 bytes
        signature.set(ethers.getBytes(flatSig.s), 32); // s - next 32 bytes
        signature.set([v], 64);                        // v - last byte (normalized)
        
        // Create the substrate account from the number
        const substrateAccount = createSubstrateAccount(accountNumber);
        
        // Log everything for debugging
        console.log('Account Number:', accountNumber);
        console.log('Substrate Account:', substrateAccount);
        console.log('Account Bytes (hex):', u8aToHex(accountBytes));
        console.log('Raw message:', Buffer.from(message).toString('hex'));
        console.log('Message Hash:', ethers.hexlify(messageHash));
        console.log('Signature R:', flatSig.r);
        console.log('Signature S:', flatSig.s);
        console.log('Signature V:', v);
        console.log('Full Signature:', ethers.hexlify(signature));
        
        // Verify using ethers
        const recoveredAddress = ethers.recoverAddress(messageHashBytes, {
            r: flatSig.r,
            s: flatSig.s,
            v: v
        });
        console.log('Signer address:', wallet.address);
        console.log('Recovered address:', recoveredAddress);
        console.log('Signature verification:', recoveredAddress === wallet.address ? 'Valid ' : 'Invalid ');

        console.log('Submitting unsigned claim transaction...');
        
        // Create the unsigned claim extrinsic with the substrate account
        const tx = api.tx.airdrop.claim(substrateAccount, signature);
        
        // Submit as unsigned and watch events
        await new Promise((resolve, reject) => {
            tx.send(({ status, events = [] }) => {
                if (status.isInBlock) {
                    console.log('Transaction included in block:', status.asInBlock.toHex());
                } else if (status.isFinalized) {
                    console.log('Transaction finalized in block:', status.asFinalized.toHex());
                    
                    // Check events for success or failure
                    events.forEach(({ event: { data, method, section } }) => {
                        if (section === 'airdrop' && method === 'Claimed') {
                            console.log('Claim successful!', data.toString());
                        }
                    });
                    
                    resolve();
                }
            }).catch(reject);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        // Ensure we disconnect even if there's an error
        if (api) {
            await api.disconnect();
            console.log('Disconnected from chain');
        }
    }
}

// Run the script
signSubstrateStyle();
