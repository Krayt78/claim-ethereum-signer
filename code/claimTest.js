import { registerClaim } from './registerLogic.js';
import { createSignature } from './signatureLogic.js';
import { submitSignature } from './claimLogic.js';
import { ethers } from 'ethers';

async function runClaimTest() {
    try {
        // Test parameters
        const claimAmount = 100n;
        const destAccount = 42n;
        
        // Create a deterministic private key (similar to the test's eth_test_account)
        const privateKey = "9116d6c6a9c830c06af62af6d4101b566e2466d88510b6c11d655545c74790a4";
        const wallet = new ethers.Wallet(privateKey);
        
        console.log('\n1. Starting claim test...');
        console.log('Ethereum address:', wallet.address);
        console.log('Destination account:', destAccount.toString());
        console.log('Claim amount:', claimAmount.toString());

        // Step 1: Register the claim
        console.log('\n2. Registering claim...');
        await registerClaim(wallet.address, claimAmount);

        // Step 2: Create signature for the claim
        console.log('\n3. Creating signature...');
        const signature = await createSignature(privateKey, destAccount);
        
        if (!signature) {
            throw new Error('Failed to create signature');
        }

        console.log('\n4. Test completed!');
        console.log('Signature:', signature);

        // Step 3: Submit the signature to the chain
        console.log('\n5. Submitting signature...');
        await submitSignature(wallet.address, destAccount, signature);

    } catch (error) {
        console.error('Claim test failed:', error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
    runClaimTest().catch(console.error);
}

export { runClaimTest };