# Prompt para abrir el proyecto en el Mac Studio

Copia desde la siguiente línea y pégalo como primer mensaje en el chat que tenga
acceso al Mac Studio.

---

Quiero que abras y prepares un nuevo proyecto local llamado
`sovereign-smart-wallet` en este ordenador.

## Objetivo

Construir un MVP de una smart wallet que una:

- smart account programable;
- identidad digital controlada por la cuenta;
- almacenamiento cifrado de Verifiable Credentials;
- emisión OpenID4VCI;
- presentación OpenID4VP;
- selective disclosure;
- verificación off-chain por defecto;
- verificación on-chain opcional mediante una attestation o prueba.

El vertical slice inicial debe permitir:

```text
Crear smart account con passkey
→ recibir una VC de mayoría de edad
→ guardarla cifrada
→ abrir una solicitud OpenID4VP
→ aprobar divulgación mínima
→ verificarla off-chain
→ conceder acceso en una aplicación demo
```

## Forma de trabajar

Actúa como lead engineer y trabaja directamente en el proyecto hasta dejar una
base ejecutable y verificada. No te limites a explicar cómo hacerlo.

Antes de editar:

1. Inspecciona el directorio actual y busca `AGENTS.md`, `README`, reglas locales,
   archivos de configuración y repositorios existentes.
2. Localiza la carpeta habitual de proyectos de este Mac Studio. Si el chat ya
   está abierto dentro de una carpeta de proyectos, úsala. Si hay varias rutas
   plausibles y elegir una cambiaría la ubicación final, pregúntame cuál usar.
3. Busca primero un repositorio o carpeta existente llamado
   `sovereign-smart-wallet`.
4. Si ya existe, ábrelo, inspecciona su estado Git y continúa sin destruir ni
   sobrescribir cambios locales.
5. Si no existe, crea la carpeta y un repositorio Git nuevo.
6. No leas ni muestres secretos. No inventes claves privadas, tokens, API keys,
   RPC URLs o credenciales.
7. No despliegues a mainnet ni a producción.
8. No publiques ni hagas push a GitHub sin mi autorización explícita.
9. Usa una testnet EVM y variables de entorno documentadas cuando sean
   necesarias.
10. Conserva un registro corto de decisiones en `docs/decisions/`.

## Arquitectura obligatoria

### Smart account

- ERC-4337 para UserOperations.
- ERC-1271 para firmas de smart-contract accounts.
- ERC-7579 para módulos, siempre que la implementación base elegida lo soporte.
- Passkey/WebAuthn como autenticador principal.
- Recuperación modular preparada, aunque la primera implementación pueda ser
  mínima.
- Session keys restringibles por tiempo, contrato y función como extensión
  posterior.

No escribas una implementación completa de account abstraction desde cero.
Evalúa una base mantenida y auditada, como Safe o Kernel, y documenta la
elección. Antes de fijar dependencias o versiones, consulta documentación
oficial vigente.

### Identidad

- Utiliza W3C DID Core.
- La smart account debe controlar o estar vinculada criptográficamente al DID.
- La rotación del autenticador no debe cambiar necesariamente la identidad.
- Compara `did:pkh` y `did:ethr` para el MVP.
- No crees un método DID propio.
- Documenta la decisión mediante un ADR.

### Credenciales

- W3C Verifiable Credentials Data Model 2.0.
- SD-JWT VC como formato inicial preferido.
- OpenID4VCI para emisión.
- OpenID4VP para presentación.
- Selective disclosure.
- Estado/revocación verificable.
- Audience, nonce, expiración y holder binding obligatorios.

### Privacidad

- No guardes credenciales completas ni PII en blockchain.
- Guarda las VC cifradas localmente.
- Para el navegador, usa IndexedDB con cifrado mediante WebCrypto.
- Las claves de cifrado no deben guardarse en texto plano.
- Diseña exportación y restauración mediante un backup cifrado, aunque pueda
  quedar fuera del primer vertical slice.
- Reduce correlación entre verificadores y documenta las limitaciones.

### Verificación

La verificación off-chain es el camino predeterminado. El verifier debe validar:

1. firma e integridad;
2. issuer y trust policy;
3. tipo y esquema;
4. expiración;
5. estado o revocación;
6. audience;
7. nonce y protección contra replay;
8. holder binding;
9. restricciones de divulgación.

Prepara una interfaz para convertir un resultado válido en una attestation de
corta duración. La verificación on-chain debe quedar desacoplada y no debe
bloquear el MVP.

## Stack preferido

- Monorepo TypeScript.
- `pnpm` workspaces.
- Next.js para las aplicaciones web.
- Solidity y Foundry para contratos.
- Vitest para unidades TypeScript.
- Playwright para el recorrido end-to-end.
- Biome o ESLint + Prettier, eligiendo una sola estrategia coherente.
- TypeScript estricto.
- Variables de entorno validadas y `.env.example` sin secretos.

Comprueba primero las versiones actuales y compatibilidades en las fuentes
oficiales. Evita dependencias abandonadas. Justifica cualquier desviación del
stack.

## Estructura inicial

Usa esta estructura como objetivo, ajustándola únicamente si la herramienta de
smart accounts elegida exige otra organización:

```text
sovereign-smart-wallet/
  apps/
    wallet-web/
    issuer-demo/
    verifier-demo/
  packages/
    identity-core/
    credential-vault/
    openid4vc-client/
    presentation-policy/
    shared-types/
  contracts/
    src/
      modules/
        IdentityModule.sol
        RecoveryModule.sol
        CredentialProofModule.sol
      registry/
        TrustedIssuerRegistry.sol
        CredentialSchemaRegistry.sol
    script/
    test/
  docs/
    architecture/
    decisions/
    protocols/
    threat-model/
  .env.example
  package.json
  pnpm-workspace.yaml
  README.md
```

No generes contratos vacíos solo para completar nombres. Si un componente no
se implementa todavía, represéntalo en arquitectura y backlog, no como código
ficticio.

## Esquemas iniciales

Define los tipos en `packages/shared-types` y valida entradas en runtime.

### Presentation policy

```json
{
  "type": "sovereign.presentation-policy.v0",
  "id": "age-over-18",
  "acceptedCredentialTypes": ["AgeCredential"],
  "trustedIssuerRegistry": "eip155:chainId:address",
  "constraints": [
    {
      "claim": "ageOver",
      "operator": ">=",
      "value": 18
    }
  ],
  "disclosure": [],
  "maxCredentialAge": 86400
}
```

### Verification result

```json
{
  "type": "sovereign.verification-result.v0",
  "policyId": "age-over-18",
  "subjectBinding": "opaque-holder-binding",
  "verified": true,
  "issuedAt": 0,
  "expiresAt": 0,
  "nonce": "random-challenge"
}
```

## Primera fase de implementación

### 1. Inicialización

- Crea el monorepo.
- Configura workspaces, TypeScript estricto, formato, lint y tests.
- Añade scripts raíz para `dev`, `build`, `lint`, `typecheck` y `test`.
- Crea un `README.md` con requisitos, instalación, ejecución y arquitectura.
- Añade `.gitignore` y `.env.example`.

### 2. Documentación y decisiones

Crea:

- `docs/architecture/overview.md`;
- `docs/threat-model/initial.md`;
- ADR de implementación de smart account;
- ADR de método DID;
- ADR de formato VC y protocolos;
- backlog por fases.

El threat model inicial debe cubrir:

- pérdida o robo del dispositivo;
- phishing de solicitudes OpenID4VP;
- replay;
- issuer comprometido;
- estado de revocación desactualizado;
- correlación entre verificadores;
- fuga de bóveda o backup;
- módulos maliciosos;
- guardianes coludidos;
- censura de bundler/paymaster;
- front-end o supply chain comprometida.

### 3. Núcleo independiente

Implementa primero código comprobable sin depender de infraestructura externa:

- esquema y parser de presentation policies;
- creación y validación de nonce;
- modelo de verification result;
- interfaces de issuer, holder, verifier y credential store;
- bóveda local con una abstracción de cifrado;
- mocks deterministas para issuer y verifier;
- pruebas unitarias de casos válidos y fallos.

No implementes criptografía casera. Usa APIs o librerías auditadas y encierra
cualquier dependencia criptográfica detrás de interfaces pequeñas.

### 4. Demos

Crea tres aplicaciones mínimas:

- `issuer-demo`: emite una credencial de prueba;
- `wallet-web`: recibe, cifra, lista y presenta la credencial;
- `verifier-demo`: genera challenge/policy y valida la presentación.

La interfaz puede ser austera, pero el flujo debe ser comprensible y mostrar:

- qué se solicita;
- qué se comparte;
- quién lo solicita;
- cuándo expira;
- resultado de validación;
- errores accionables.

### 5. Smart account

Integra la smart account después de que el flujo local issuer-wallet-verifier
funcione:

- registro con passkey;
- dirección determinista o claramente explicada;
- validación ERC-1271;
- operación patrocinada en testnet cuando haya configuración;
- fallback local documentado si faltan RPC, bundler o paymaster.

No bloquees los tests principales por servicios externos.

## Criterios de aceptación

Considera terminada esta primera sesión solo cuando:

1. El repositorio está creado y su estructura es coherente.
2. La instalación de dependencias termina correctamente.
3. `pnpm lint` pasa.
4. `pnpm typecheck` pasa.
5. `pnpm test` pasa.
6. Las tres apps arrancan o existe un comando único para arrancarlas.
7. El flujo demo puede recorrerse localmente con credenciales de prueba.
8. Los límites entre mock, implementación real y trabajo pendiente están
   claramente marcados.
9. No hay secretos ni PII en Git.
10. El README contiene comandos exactos para retomar el proyecto.

Si el entorno impide completar alguno, no simules éxito: identifica el bloqueo,
deja el repositorio en un estado consistente y proporciona el comando exacto
para continuar.

## Orden y commits

Trabaja en incrementos pequeños:

1. `chore: initialize sovereign smart wallet monorepo`
2. `docs: define architecture and security model`
3. `feat: add credential policy and verification core`
4. `feat: add issuer wallet verifier demo flow`
5. `feat: integrate smart account foundation`

No hagas commit si el repositorio contiene cambios anteriores que no son tuyos
o si no puedes separar con seguridad tu trabajo. En ese caso, explícame el
estado antes de continuar.

## Entrega final

Al terminar, responde de forma concisa con:

- ruta absoluta del proyecto;
- qué funciona realmente;
- arquitectura y decisiones tomadas;
- comandos para instalar, ejecutar y probar;
- resultado de lint, typecheck y tests;
- elementos todavía simulados;
- riesgos o bloqueos;
- siguiente hito recomendado.

Empieza inspeccionando el entorno y la ubicación del proyecto. Después ejecuta
el trabajo; no me devuelvas únicamente un plan.

---
