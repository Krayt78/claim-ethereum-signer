import { ethers } from 'ethers';
import { hexToU8a } from '@polkadot/util';
import { submitSignature, verifyClaimResult } from './code/claimLogic.js';

function toAsciiHex(data) {
    const result = new Uint8Array(data.length * 2);
    for (let i = 0; i < data.length; i++) {
        const byte = data[i];
        const n1 = byte >> 4;
        result[i * 2] = n1 < 10 ? (48 + n1) : (97 + n1 - 10);
        const n2 = byte & 0x0F;
        result[i * 2 + 1] = n2 < 10 ? (48 + n2) : (97 + n2 - 10);
    }
    return result;
}

async function claimTest() {
    try {
        // Mimic alice() function by creating a deterministic private key
        const alicePrivateKey = ethers.keccak256(ethers.toUtf8Bytes("Alice"));
        const aliceWallet = new ethers.Wallet(alicePrivateKey);
        
        // Print ethereum address (equivalent to eth(&alice()))
        console.log("eth_address:", aliceWallet.address);

        // Set up test parameters
        const claimAmount = 100;
        const destAccount = 42n;

        // Convert destAccount to LE bytes (same as using_encoded in Rust)
        const buffer = new Uint8Array(8);
        let n = destAccount;
        for (let i = 0; i < 8; i++) {
            buffer[i] = Number(n & 255n);
            n >>= 8n;
        }

        // Convert to ASCII hex (same as to_ascii_hex in Rust)
        const hexMessage = toAsciiHex(buffer);
        
        // Add the prefix as in Rust implementation
        const prefix = "Pay RUSTs to the TEST account:";
        const messageWithPrefix = prefix + Buffer.from(hexMessage).toString();

        // Create and sign the message (equivalent to sig::<Test>)
        const messageHash = ethers.hashMessage(messageWithPrefix);
        const signature = await aliceWallet.signMessage(messageWithPrefix);
        
        // Normalize the v value by subtracting 27
        let sigBytes = ethers.getBytes(signature);
        sigBytes[64] = sigBytes[64] - 27;  // Convert from Ethereum's v (27/28) to standard ECDSA v (0/1)
        
        console.log("Signature bytes:", sigBytes);

        // Verify the signature (equivalent to eth_recover)
        const recoveredAddress = ethers.recoverAddress(messageHash, signature);
        console.log("Recovered address:", recoveredAddress);
        console.log("Original address:", aliceWallet.address);
        console.log("Signature valid:", recoveredAddress.toLowerCase() === aliceWallet.address.toLowerCase());

        // Submit the claim to the chain
        console.log('Submitting claim to chain...');
        const txHash = await submitSignature(destAccount, sigBytes);
        
        // Verify the claim was successful
        console.log('Verifying claim result...');
        const success = await verifyClaimResult(txHash);
        
        console.log('Claim process completed:', success ? 'SUCCESS' : 'FAILED');

    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
claimTest().catch(console.error);

export { claimTest, toAsciiHex }; 