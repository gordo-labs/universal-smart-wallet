import type {Metadata} from 'next'; import './styles.css';
export const metadata:Metadata={title:'Sovereign Wallet',description:'Private, modular smart wallet'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><header><strong>◆ Sovereign Wallet</strong><span>Base Sepolia · local-first</span></header>{children}</body></html>}
