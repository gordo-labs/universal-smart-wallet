export type AuthMode='passkey'|'email'|'oidc';
export type WalletState={auth?:AuthMode; locked:boolean; did?:string; pending?:{kind:string;chainId:number;target:string;cost:string;consent:string}};
export function enableAuthModules(input:Partial<Record<AuthMode,boolean>>): AuthMode[] { return (['passkey','email','oidc'] as const).filter(mode=>input[mode]===true); }
export function createPrivateDid(seed:string): string { if(!seed || seed.length<16) throw new Error('wallet-controlled seed required'); return `did:pkh:eip155:84532:${seed.slice(0,8).toLowerCase()}`; }
export function previewSensitiveAction(action:{kind:string;chainId:number;target:string;cost:string}, consent=false): WalletState['pending'] { if(!/^0x[0-9a-f]{40}$/iu.test(action.target) || action.chainId<1 || !consent) throw new Error('preview and explicit consent required'); return {...action,consent:'explicit'}; }
export function lockWallet(state:WalletState):WalletState { return {...state,locked:true,pending:undefined}; }
export function emailCustodyWarning(mode:AuthMode):string { return mode==='email'?'Email recovery is a convenience factor; add a passkey or recovery signer before holding value.':''; }
