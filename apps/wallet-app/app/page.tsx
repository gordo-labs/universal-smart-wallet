'use client';
import {useMemo, useState} from 'react';
import {HolderCredentialClient} from '@ssw/identity-sdk/holder';
import {IdentityStudio} from './identity-studio';
import {createPrivateDid,enableAuthModules,emailCustodyWarning} from '../src/flow';
import {ClientEncryptedHolderStore,syntheticInspector,syntheticIssuance} from '../src/holder-vault';

export default function Wallet(){
  const [mode,setMode]=useState<'passkey'|'email'|'oidc'>('passkey');
  const [did,setDid]=useState('');
  const [notice,setNotice]=useState('');
  const holderClient=useMemo(()=>new HolderCredentialClient({
    store:new ClientEncryptedHolderStore(),
    issuance:syntheticIssuance,
    proofFactory:async()=> 'synthetic-development-proof',
    inspector:syntheticInspector,
    trustedIssuers:['https://issuer.example.test'],
  }),[]);
  function start(){setDid(createPrivateDid(crypto.randomUUID().replaceAll('-','')));setNotice('Wallet created locally. No DID registration was performed.')}
  return <main><section className="hero"><p className="eyebrow">PRIVATE SMART WALLET</p><h1>Your identity,<br/><em>under your control.</em></h1><p>Choose an onboarding module. You can add or remove providers without moving your wallet.</p><div className="tabs">{enableAuthModules({passkey:true,email:true,oidc:true}).map(x=><button className={mode===x?'active':''} onClick={()=>setMode(x)} key={x}>{x}</button>)}</div><button className="primary" onClick={start}>Continue with {mode}</button>{mode==='email'&&<p className="warning">{emailCustodyWarning(mode)}</p>}{notice&&<p className="success">{notice}</p>}{did&&<div className="did"><small>Private DID</small><code>{did}</code></div>}</section><section className="features"><article><b>Assets</b><span>0 ETH · 0 NFTs</span></article><article><b>Credentials</b><span>Locked until you unlock</span></article><article><b>Recovery</b><span>Add a passkey or signer</span></article></section><IdentityStudio client={holderClient} trustedIssuers={['https://issuer.example.test']}/></main>
}
