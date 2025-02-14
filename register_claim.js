import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { hexToU8a } from '@polkadot/util';

// Substrate node WebSocket endpoint
const WS_ENDPOINT = 'ws://127.0.0.1:9944';

// The Ethereum address to register the claim for
// This should match the address generated from the private key in sign.js
const ETHEREUM_ADDRESS = '0x79933Da2de793DFC61c90017884C253B9BDF8B90';

// Amount of tokens to claim (adjust as needed)
const CLAIM_AMOUNT = 1_000_000_000_000; // 1 UNIT (12 decimals)

async function registerClaim() {
    let api;
    try {
        // Connect to the Substrate chain
        console.log('Connecting to Substrate chain...');
        const wsProvider = new WsProvider(WS_ENDPOINT);
        api = await ApiPromise.create({ provider: wsProvider });
        await api.isReady;
        console.log('Connected to chain');

        // Create Alice's keypair (has Root access)
        const keyring = new Keyring({ type: 'sr25519' });
        const alice = keyring.addFromUri('//Alice');
        console.log('Using Alice\'s account:', alice.address);

        // Convert Ethereum address to bytes (remove 0x prefix if present)
        const ethAddressBytes = hexToU8a(ETHEREUM_ADDRESS);
        
        console.log('Registering claim for Ethereum address:', ETHEREUM_ADDRESS);
        console.log('Claim amount:', CLAIM_AMOUNT);

        // Create and sign the registerClaim transaction
        console.log('Submitting registerClaim transaction...');
        const tx = api.tx.airdrop.registerClaim(ethAddressBytes, CLAIM_AMOUNT);
        
        // Sign and submit as Alice (Root)
        await new Promise((resolve, reject) => {
            tx.signAndSend(alice, ({ status, events = [] }) => {
                if (status.isInBlock) {
                    console.log('Transaction included in block:', status.asInBlock.toHex());
                    
                    // Check events for success or errors
                    events.forEach(({ event: { data, method, section } }) => {
                        if (section === 'system' && method === 'ExtrinsicSuccess') {
                            console.log('Claim registration successful!');
                        } else if (section === 'system' && method === 'ExtrinsicFailed') {
                            console.error('Claim registration failed:', data.toString());
                        }
                    });
                    
                    resolve();
                } else if (status.isFinalized) {
                    console.log('Transaction finalized in block:', status.asFinalized.toHex());
                }
            }).catch(reject);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (api) {
            await api.disconnect();
            console.log('Disconnected from chain');
        }
    }
}

// Run the registration
registerClaim();
