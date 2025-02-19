import { ApiPromise, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const WS_ENDPOINT = 'ws://127.0.0.1:9944';

async function connectToChain() {
    await cryptoWaitReady();
    const wsProvider = new WsProvider(WS_ENDPOINT);
    const api = await ApiPromise.create({
        provider: wsProvider,
        types: {
            EthereumAddress: '[u8; 20]',
            EcdsaSignature: '[u8; 65]'
        }
    });
    console.log('Connected to node');
    return api;
}

async function submitSignature(walletAddress, destAccount, signature) {
    let api;
    try {
        api = await connectToChain();
        
        // Convert the signature to bytes if it's a hex string
        let signatureBytes;
        if (typeof signature === 'string') {
            // Remove '0x' prefix if present
            const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
            signatureBytes = new Uint8Array(Buffer.from(cleanSig, 'hex'));
        } else if (signature instanceof Uint8Array) {
            signatureBytes = signature;
        } else {
            throw new Error('Signature must be a hex string or Uint8Array');
        }

        // Ensure the signature is exactly 65 bytes
        if (signatureBytes.length !== 65) {
            throw new Error(`Invalid signature length: ${signatureBytes.length} bytes. Expected 65 bytes.`);
        }

        // Convert destAccount to BigInt if it's not already
        const destAccountBigInt = BigInt(destAccount);
        
        // Add debug logging
        console.log('Wallet Address:', walletAddress);
        console.log('Destination Account:', destAccount.toString());
        console.log('Signature Length:', signatureBytes.length);
        console.log('Signature Bytes:', Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
        
        // Convert destAccount to a proper 32-byte AccountId
        const accountBytes = new Uint8Array(32);
        // Write the number in little-endian format
        let n = destAccountBigInt;
        for (let i = 0; i < 8; i++) {
            accountBytes[i] = Number(n & BigInt(255));
            n >>= BigInt(8);
        }
        // The rest of the bytes remain as zeros

        // Create the unsigned transaction
        const tx = api.tx.airdrop.claim(accountBytes, signatureBytes);

        // Submit as unsigned transaction (matches the Rust test's RuntimeOrigin::none())
        const hash = await tx.send();

        console.log('Claim submitted with hash:', hash.toHex());
        console.log('Account ID used:', u8aToHex(accountBytes));
        console.log('Signature used:', u8aToHex(signatureBytes));

        // Wait for the transaction to be finalized
        const unsub = await api.tx(hash).waitFinalized();
        console.log('Transaction finalized');

        // Query the balance to verify the claim (optional)
        const balance = await api.query.system.account(accountBytes);
        console.log('New balance:', balance.data.free.toString());

        return hash.toHex();

    } catch (error) {
        console.error('Failed to submit claim:', error);
        throw error;
    } finally {
        if (api) {
            await api.disconnect();
            console.log('Disconnected from node');
        }
    }
}

async function verifyClaimResult(txHash) {
    let api;
    try {
        api = await connectToChain();
        
        // Get the transaction events
        const signedBlock = await api.rpc.chain.getBlock(txHash);
        const allRecords = await api.query.system.events.at(signedBlock.block.header.hash);
        
        // Find relevant events
        const claimEvents = allRecords.filter(({ event }) => 
            event.section === 'airdrop' && event.method === 'Claimed'
        );

        if (claimEvents.length > 0) {
            console.log('Claim successful!');
            claimEvents.forEach(({ event }) => {
                const [who, ethereumAddress, amount] = event.data;
                console.log('Claimed:', {
                    who: who.toString(),
                    ethereumAddress: ethereumAddress.toHex(),
                    amount: amount.toString()
                });
            });
            return true;
        } else {
            console.log('No claim events found');
            return false;
        }

    } catch (error) {
        console.error('Failed to verify claim:', error);
        throw error;
    } finally {
        if (api) {
            await api.disconnect();
        }
    }
}

export { submitSignature, verifyClaimResult };
