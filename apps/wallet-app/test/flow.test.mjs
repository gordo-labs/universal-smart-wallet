import {describe,it,expect} from 'vitest';
import {createPrivateDid,enableAuthModules,emailCustodyWarning,lockWallet,previewSensitiveAction} from '../src/flow.ts';
describe('modular wallet flow',()=>{
 it('enables auth modules independently',()=>expect(enableAuthModules({email:true,oidc:false,passkey:true})).toEqual(['passkey','email']));
 it('creates local DID without registration',()=>expect(createPrivateDid('0123456789abcdef')).toMatch(/^did:pkh:eip155:84532:/));
 it('requires consent and valid target for sensitive actions',()=>expect(()=>previewSensitiveAction({kind:'mint',chainId:84532,target:'0x1111111111111111111111111111111111111111',cost:'0.001'},false)).toThrow(/consent/));
 it('locking clears pending sensitive action',()=>expect(lockWallet({locked:false,did:'did:pkh:x',pending:{kind:'mint',chainId:1,target:'0x1111111111111111111111111111111111111111',cost:'0',consent:'explicit'}}).pending).toBeUndefined());
 it('discloses email custody limitation',()=>expect(emailCustodyWarning('email')).toMatch(/convenience factor/));
});
