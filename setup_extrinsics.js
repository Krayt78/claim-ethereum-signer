import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { u8aConcat, stringToU8a, hexToU8a } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import BN from 'bn.js';

const WS_ENDPOINT = 'ws://127.0.0.1:9944';
const TEST_ETH_ADDRESS = '0x79933Da2de793DFC61c90017884C253B9BDF8B90';
const FUND_AMOUNT = new BN('100');
const CLAIM_AMOUNT = new BN('10');

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

function getPalletAccount(keyring) {
  const modlPrefix = stringToU8a('modl');
  const palletIdBytes = stringToU8a('airdrop!');
  const accountIdU8a = u8aConcat(
    modlPrefix, 
    palletIdBytes, 
    new Uint8Array(32 - modlPrefix.length - palletIdBytes.length)
  );
  return keyring.encodeAddress(accountIdU8a);
}

async function fundPalletAccount(api, sudoKey, palletAccount) {
  console.log('\nFunding pallet account...');
  const initialBalance = await api.query.system.account(palletAccount);
  console.log('Initial pallet balance:', initialBalance.toString());

  const tx = api.tx.balances.transferAllowDeath(palletAccount, FUND_AMOUNT);
  await sendAndWaitForSuccess(tx, sudoKey);

  const finalBalance = await api.query.system.account(palletAccount);
  console.log('Pallet balance after transfer:', finalBalance.toString());
}

async function registerTestClaim(api, sudoKey) {
  console.log('\nRegistering claim...');
  const ethAddressBytes = hexToU8a(TEST_ETH_ADDRESS.slice(2));
  const testEthAddress = api.createType('EthereumAddress', ethAddressBytes);
  
  const claimCall = api.tx.airdrop.registerClaim(testEthAddress, CLAIM_AMOUNT);
  const sudoCall = api.tx.sudo.sudo(claimCall);
  
  await sendAndWaitForSuccess(sudoCall, sudoKey, true);
}

async function sendAndWaitForSuccess(tx, signer, checkEvents = false) {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, ({ status, events = [] }) => {
      if (status.isInBlock || status.isFinalized) {
        if (checkEvents) {
          events.forEach(({ event }) => {
            if (event.section === 'system') {
              if (event.method === 'ExtrinsicSuccess') {
                console.log('Transaction succeeded');
              } else if (event.method === 'ExtrinsicFailed') {
                const [dispatchError] = event.data;
                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(dispatchError.asModule);
                  console.error(`Module error: ${decoded.section}.${decoded.name}`);
                }
                reject(new Error('Transaction failed'));
              }
            }
          });
        }
        resolve();
      }
    }).catch(reject);
  });
}

async function displayClaimInfo(api) {
  console.log('\nChecking claims...');
  const ethAddressBytes = hexToU8a(TEST_ETH_ADDRESS.slice(2));
  const testEthAddress = api.createType('EthereumAddress', ethAddressBytes);
  
  const claim = await api.query.airdrop.claims(testEthAddress);
  console.log('Claim for', TEST_ETH_ADDRESS, ':', claim.toString());
  
  const total = await api.query.airdrop.total();
  console.log('Total claims:', total.toString());
  
  console.log('\nAll registered claims:');
  const entries = await api.query.airdrop.claims.entries();
  entries.forEach(([key, value]) => {
    console.log('Address:', key.args[0].toHex(), 'Amount:', value.toString());
  });
}

async function main() {
  let api;
  try {
    api = await connectToChain();
    
    const keyring = new Keyring({ type: 'sr25519' });
    const sudoKey = keyring.addFromUri('//Alice');
    console.log('Using sudo account:', sudoKey.address);
    
    const palletAccount = getPalletAccount(keyring);
    await fundPalletAccount(api, sudoKey, palletAccount);
    await registerTestClaim(api, sudoKey);
    await displayClaimInfo(api);
    
    console.log('\nSetup completed successfully!');
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  } finally {
    if (api) {
      await api.disconnect();
      console.log('Disconnected from node');
    }
  }
}

// Run the script if it's being executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error).finally(() => process.exit());
}

export { main }; 