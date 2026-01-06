# VIA Document Signing Application

A decentralized document signing application built with Next.js, Keycloak authentication, and WalletConnect for cryptographic signatures.

---

## How to Run the App Locally

### Prerequisites
- **Node.js** 18+ and **pnpm** installed
- **Keycloak Server** 
- **WalletConnect Project ID**
- **Compatible Wallet**: VIA Wallet or any WalletConnect v2 compatible wallet

### Environment Setup

1. **Clone the repository** (if applicable):
   ```bash
   git clone <repository-url>
   cd via
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   
   Create a `.env.local` file in the root directory with the following:
   ```env  
   # WalletConnect Configuration
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```

5. **Access the application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup

1. **Login with Keycloak**: You'll be redirected to the Keycloak login page
2. **Connect Wallet**: After authentication, connect your WalletConnect-compatible wallet
3. **Create Documents**: Start creating and signing documents!

### Troubleshooting

- **Port Issues**: If `localhost:3000` shows a blank page, manually ensure you're accessing `localhost:3000` (with port)
- **Wallet Connection**: Make sure your wallet app supports WalletConnect v2
- **Session Persistence**: Documents are stored in browser localStorage - clear cache if needed

---

## POC Demo Videos

- **Text Document**: [View Demo](https://drive.google.com/file/d/1ayh-_l0Dj5ZWVu7Twd7pe96zzAhkoK9P/view?usp=sharing)

- **JSON Document**: [View Demo](https://drive.google.com/file/d/1bnOvSwQEtl3dQ6DVqxxnYUXbV15tsj6D/view?usp=sharing)

- **PDF Document**: [View Demo](https://drive.google.com/file/d/1iExYR8zL_9v06rZ5zi8OWBr_28tcvkEz/view?usp=sharing)

---

## Design Rationale: Signature Format

### Why This Approach?

Our signature format combines **structured message signing** with **content hashing** to achieve both security and efficiency while maintaining compatibility with standard Ethereum wallets.

**Key Design Decisions:**

1. **Keccak-256 for Content Hashing**
   - **Why**: Native Ethereum hash function, consistent with blockchain standards
   - **Benefit**: Enables future on-chain verification without additional conversion
   - **Efficiency**: Single hash operation per document, O(1) verification complexity

2. **Structured Message Format (EIP-191)**
   - **Why**: Human-readable messages improve user trust and transparency
   - **Security**: Users can see exactly what they're signing (no blind signatures)
   - **Compatibility**: Works with all standard Ethereum wallets via `personal_sign`

3. **Canonical JSON (RFC 8785)**
   - **Why**: Prevents hash manipulation through key reordering or whitespace
   - **Security**: Ensures identical JSON objects always produce identical hashes
   - **Deterministic**: Same content = same hash, regardless of formatting

4. **Embedded Content Hash in Signature Message**
   - **Why**: Binds signature to specific document version
   - **Security**: Tamper-evident - any content change invalidates all signatures
   - **Efficiency**: No need to re-sign if verification fails, just compare hashes

**Security Properties:**

- ✅ **Non-repudiation**: ECDSA signatures cryptographically prove signer identity
- ✅ **Integrity**: Content hash ensures document hasn't been modified
- ✅ **Authenticity**: Signature recovery verifies the actual signer's wallet address
- ✅ **Completeness**: All required signers must sign before document is complete
- ✅ **Transparency**: Human-readable message shows exactly what is being signed
- ✅ **Replay Protection**: Document ID and timestamp prevent signature reuse

**Efficiency Advantages:**

- **Fast Verification**: O(1) hash comparison + ECDSA recovery
- **Minimal Storage**: Only signature bytes (65 bytes) + metadata stored
- **Offline Capable**: Third parties can verify without network access
- **No Smart Contract Required**: Works entirely client-side, zero gas costs
- **Wallet Compatible**: Works with any EIP-191 compatible wallet (universal support)

**Why Not EIP-712 Typed Data?**

While EIP-712 provides better structured data signing, we chose EIP-191 (`personal_sign`) because:
- **Broader Compatibility**: Current VIA wallet does not support `eth_signTypedData_v4`
- **Simpler Implementation**: No complex type definitions required
- **Human Readable**: Users see plain text, not encoded data
- **Sufficient Security**: Content hash provides the same tamper protection

This approach balances **maximum security** with **practical usability**, ensuring signatures are both cryptographically sound and verifiable by any third party with standard Ethereum tools.

---

## Signature Design & Cryptographic Architecture

### What Exactly is Being Signed?

The application uses a **structured message format** that includes all critical document metadata. When a user signs a document, they sign a human-readable message containing:

```
=== VIA DOCUMENT SIGNATURE ===

Document ID: doc_1234567890_abcdef
Content Type: pdf
Content Hash: 0x8f3e2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f
Created: 2026-01-06T12:00:00.000Z
Required Signers: user1@example.com, user2@example.com

By signing this message, I confirm that I have reviewed and approve this document.

=== END SIGNATURE ===
```

**Key Components:**
- **Document ID**: Unique identifier for the document
- **Content Type**: Type of content (text, json, pdf)
- **Content Hash**: Keccak-256 hash of the document content (Ethereum standard)
- **Timestamp**: When the document was created
- **Required Signers**: List of all parties who must sign
- **Attestation**: Explicit confirmation statement

This structured message is signed using **Ethereum's `personal_sign`** method (EIP-191), which:
1. Prefixes the message with `\x19Ethereum Signed Message:\n{length}`
2. Hashes the prefixed message with Keccak-256
3. Signs the hash with the user's private key (ECDSA)

### How Do You Prove Both Parties Signed the Same Version?

**Content Hash Immutability:**

1. **Hash Generation**: When a document is created, a Keccak-256 hash is computed of the content:
   ```typescript
   // For text: Hash the string directly
   hash = keccak256(textContent)
   
   // For JSON: Hash the canonical string (sorted keys, no whitespace)
   hash = keccak256(canonicalizedJSON)
   
   // For PDF: Hash the base64-encoded binary data
   hash = keccak256(base64PdfData)
   ```

2. **Hash in Signature Message**: The content hash is embedded in the signature message, so every signer signs:
   - The exact same content hash
   - The same document ID
   - The same list of required signers
   - The same creation timestamp

3. **Verification**: During verification, the system:
   - Recomputes the content hash from the stored document
   - Compares it to the hash in each signature
   - Ensures all signatures reference the **identical content hash**

**Tamper Detection:**
- If the document content is modified after signing, the recomputed hash will not match
- All signature verifications will fail
- The system explicitly checks `hashMatch` for each signature

**Example:**
```typescript
// Document creation
const contentHash = hashDocumentContent(content); // 0x8f3e2a...

// User A signs
const messageA = createDocumentMessage(doc); // Includes hash: 0x8f3e2a...
const signatureA = await signMessage(messageA);

// User B signs
const messageB = createDocumentMessage(doc); // Same hash: 0x8f3e2a...
const signatureB = await signMessage(messageB);

// Verification proves both signed the same content
verifySignature(signatureA) // Checks hash matches 0x8f3e2a...
verifySignature(signatureB) // Checks hash matches 0x8f3e2a...
```

### How Would a Third Party Verify These Signatures Later?

**Cryptographic Signature Recovery:**

The application uses **ECDSA signature recovery** (Ethereum standard) to verify signatures without needing the signer's private key:

```typescript
// Verification process
1. Reconstruct the signed message from document data
2. Hash the message (Ethereum message hash)
3. Recover the public key/address from the signature
4. Compare recovered address to expected signer's address
```

**Implementation:**
```typescript
const verifySignature = async (signature, document) => {
  // 1. Recreate the exact message that was signed
  const message = createDocumentMessage(document);
  
  // 2. Hash the message (Ethereum standard)
  const messageHash = ethers.hashMessage(message);
  
  // 3. Recover the signer's address from the signature
  const recoveredAddress = ethers.recoverAddress(messageHash, signature.signature);
  
  // 4. Verify address matches expected signer
  const addressMatch = recoveredAddress.toLowerCase() === signature.signer.walletAddress.toLowerCase();
  
  // 5. Verify content hash hasn't changed
  const hashMatch = signature.documentHash === document.content.hash;
  
  return {
    valid: addressMatch && hashMatch,
    recoveredAddress,
    expectedAddress: signature.signer.walletAddress,
    addressMatch,
    hashMatch
  };
};
```

**What a Third Party Needs:**

To independently verify signatures, a third party needs:

1. **The Document Data**:
   - Document ID
   - Content (text, JSON, or PDF)
   - Content type
   - Creation timestamp
   - List of required signers

2. **The Signatures**:
   - Signature bytes (ECDSA signature)
   - Signer's wallet address
   - Timestamp of signature
   - Document hash at time of signing

3. **Verification Steps**:
   ```
   a. Compute content hash from document data
   b. Reconstruct the signature message
   c. Recover signer address from signature
   d. Verify recovered address matches claimed signer
   e. Verify content hash matches hash in signature
   f. Verify all required signers have signed
   ```

**Verification Properties:**
- ✅ **Non-repudiation**: Signers cannot deny signing (private key proof)
- ✅ **Integrity**: Any content modification invalidates signatures
- ✅ **Authenticity**: Recovered address proves signer identity
- ✅ **Completeness**: All required signers must sign
- ✅ **Timestamp**: Signature order and timing is recorded
- ✅ **Deterministic**: Same inputs always produce same verification result

**Example Verification by Third Party:**

```javascript
// Third party has document JSON and signatures
const document = {
  id: "doc_123",
  content: { type: "text", data: "Agreement text", hash: "0x8f3e..." },
  createdAt: "2026-01-06T12:00:00.000Z",
  requiredSigners: ["user1@example.com", "user2@example.com"],
  signatures: [
    {
      signer: { walletAddress: "0xABC..." },
      signature: "0x1234...",
      documentHash: "0x8f3e...",
      signedAt: "2026-01-06T12:05:00.000Z"
    }
  ]
};

// Verification (can be done offline with ethers.js)
const message = createDocumentMessage(document);
const messageHash = ethers.hashMessage(message);
const recoveredAddress = ethers.recoverAddress(messageHash, signature.signature);

console.log("Signature valid:", recoveredAddress === "0xABC...");
console.log("Content unchanged:", hashDocumentContent(document.content) === "0x8f3e...");
```

---

## Data Schema

### Document Structure
```typescript
{
  id: string;                    // Unique document ID
  content: {
    type: 'text' | 'json' | 'pdf';
    data: string | object | PDFData;
    hash: string;                // Keccak-256 hash of content
  };
  createdBy: DocumentUser;
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'partial' | 'complete';
  requiredSigners: RequiredSigner[];
  signatures: DocumentSignature[];
}
```

### Signature Structure
```typescript
{
  signer: DocumentUser;          // User who signed
  signature: string;             // ECDSA signature (hex)
  signedAt: Date;               // Timestamp
  documentHash: string;         // Content hash at signing time
  verified: boolean;            // Verification status
}
```

---

## Security Considerations

1. **Content Integrity**: Keccak-256 hashing ensures tamper detection
2. **Signer Authentication**: Wallet signatures prove identity
3. **Non-Repudiation**: ECDSA signatures cannot be forged
4. **Replay Protection**: Document ID and timestamp prevent reuse
5. **Multi-Party Consensus**: All required signers must sign
6. **Canonical JSON**: RFC 8785 canonicalization prevents hash manipulation

---

## Technology Stack

- **Frontend**: Next.js 16, React, TypeScript
- **Authentication**: Keycloak (OAuth 2.0 / OIDC)
- **Wallet Integration**: WalletConnect v2
- **Cryptography**: ethers.js (ECDSA signatures, Keccak-256 hashing)
- **UI**: Shadcn UI, Tailwind CSS
- **Storage**: LocalStorage (client-side)

---

## Future Enhancements

- Add a backend database to store the documents and signatures

---

## License

MIT
# multi-sign
