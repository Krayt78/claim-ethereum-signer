import { ethers } from 'ethers';
import { hexToU8a } from '@polkadot/util';

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

async function verifyTestSignature() {
    try {
        // Known test values from the Rust code
        const signature = "0x444023e89b67e67c0562ed0305d252a5dd12b2af5ac51d6d3cb69a0b486bc4b3191401802dc29d26d586221f7256cd3329fe82174bdf659baea149a40e1c495d1c";
        const expectedSigner = "0x6d31165d5d932d571f3b44695653b46dcc327e84";
        const testNumber = 42n;

        // Convert number to LE bytes (same as using_encoded in Rust)
        const buffer = new Uint8Array(8);
        let n = testNumber;
        for (let i = 0; i < 8; i++) {
            buffer[i] = Number(n & 255n);
            n >>= 8n;
        }

        // Convert to ASCII hex (same as to_ascii_hex in Rust)
        const hexMessage = toAsciiHex(buffer);
        
        // Add the prefix as in Rust implementation
        const prefix = "Pay RUSTs to the TEST account:";
        const messageWithPrefix = prefix + Buffer.from(hexMessage).toString();
        
        // Parse the signature
        const sigBytes = hexToU8a(signature);
        console.log('Signature length:', sigBytes.length);
        console.log('Signature (hex):', signature);

        // Split signature into r, s, v components
        const r = signature.slice(0, 66);
        const s = '0x' + signature.slice(66, 130);
        const v = parseInt(signature.slice(130, 132), 16);

        // Create message hash (using the prefixed message)
        const messageHash = ethers.hashMessage(messageWithPrefix);
        console.log('Message with prefix:', messageWithPrefix);
        console.log('Message hash:', messageHash);

        // Recover the address
        const recoveredAddress = ethers.recoverAddress(messageHash, {
            r: r,
            s: s,
            v: v
        });
        
        console.log('Expected signer:', expectedSigner.toLowerCase());
        console.log('Recovered signer:', recoveredAddress.toLowerCase());
        console.log('Signature valid:', recoveredAddress.toLowerCase() === expectedSigner.toLowerCase());

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

// Run the test
verifyTestSignature().catch(console.error);

export { verifyTestSignature, toAsciiHex }; 