import { ethers } from 'ethers';
import { hexToU8a } from '@polkadot/util';

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

async function createSignature(privateKey, destAccount) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        
        // Print ethereum address (equivalent to eth(&alice()))
        console.log("eth_address:", wallet.address);

        // Convert destAccount to LE bytes (same as using_encoded in Rust)
        const buffer = new Uint8Array(8);
        let n = destAccount;
        for (let i = 0; i < 8; i++) {
            buffer[i] = Number(n & 255n);
            n >>= 8n;
        }

        console.log("destAccount:", destAccount);

        // Convert to ASCII hex (same as to_ascii_hex in Rust)
        const hexMessage = toAsciiHex(buffer);
        
        // Add the prefix as in Rust implementation
        const prefix = "Pay RUSTs to the TEST account:";
        const messageWithPrefix = prefix + Buffer.from(hexMessage).toString();

        // Create and sign the message (equivalent to sig::<Test>)
        const messageHash = ethers.hashMessage(messageWithPrefix);
        const signature = await wallet.signMessage(messageWithPrefix);
        
        // Normalize the v value by subtracting 27
        let sigBytes = ethers.getBytes(signature);
        sigBytes[64] = sigBytes[64] - 27;  // Convert from Ethereum's v (27/28) to standard ECDSA v (0/1)
        
        console.log("Signature bytes:", sigBytes);

        // Verify the signature (equivalent to eth_recover)
        const recoveredAddress = ethers.recoverAddress(messageHash, signature);
        console.log("Recovered address:", recoveredAddress);
        console.log("Original address:", wallet.address);
        console.log("Signature valid:", recoveredAddress.toLowerCase() === wallet.address.toLowerCase());

        // In a real implementation, you would now use this signature to make the claim
        // on the Substrate chain

        return signature;
    } catch (error) {
        console.error('Test failed:', error);
    }
}

export { createSignature, toAsciiHex }; 