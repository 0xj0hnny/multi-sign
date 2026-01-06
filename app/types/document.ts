/**
 * Document Type Definitions for Multi-Party Signing
 * 
 * Supports text, JSON, and PDF document types with cryptographic verification
 */

/**
 * Document content types
 */
export type DocumentContentType = 'text' | 'json' | 'pdf';

/**
 * Document status throughout its lifecycle
 */
export type DocumentStatus = 'draft' | 'pending' | 'partial' | 'complete' | 'cancelled';

/**
 * PDF file data
 */
export interface PDFData {
  /** Base64-encoded PDF file */
  base64: string;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Document content (flexible format)
 */
export interface DocumentContent {
  /** Content type */
  type: DocumentContentType;
  /** Actual content data */
  data: string | object | PDFData;
  /** SHA-256 hash of canonical form */
  hash: string;
}

/**
 * Main document interface
 */
export interface Document {
  /** Unique document identifier */
  id: string;
  /** Document content */
  content: DocumentContent;
  /** Creator information */
  createdBy: DocumentUser;
  /** Creation timestamp */
  createdAt: Date;
  /** Current document status */
  status: DocumentStatus;
  /** List of required signers */
  requiredSigners: DocumentSigner[];
  /** Collected signatures */
  signatures: DocumentSignature[];
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * User information in document context
 */
export interface DocumentUser {
  /** Keycloak user ID */
  userId: string;
  /** Display name */
  username: string;
  /** Email (optional) */
  email?: string;
  /** VIA Wallet address */
  walletAddress: string;
}

/**
 * Required signer information
 */
export interface DocumentSigner {
  /** Keycloak user ID or email */
  userId: string;
  /** Display name */
  username: string;
  /** VIA Wallet address (if known) */
  walletAddress?: string;
  /** Whether signature is required */
  required: boolean;
  /** Whether this signer has signed */
  hasSigned: boolean;
}

/**
 * Signature on a document
 */
export interface DocumentSignature {
  /** Signer information */
  signer: DocumentUser;
  /** Cryptographic signature (personal_sign) */
  signature: string;
  /** When signature was created */
  signedAt: Date;
  /** Hash of document at signing time */
  documentHash: string;
  /** Whether signature has been verified */
  verified: boolean;
  /** Verification timestamp */
  verifiedAt?: Date;
}

/**
 * Signature collection status
 */
export interface SignatureStatus {
  /** Total required signatures */
  total: number;
  /** Number of signatures collected */
  signed: number;
  /** Percentage complete */
  percentage: number;
  /** User IDs still pending */
  pending: string[];
  /** Whether all required signatures collected */
  complete: boolean;
  /** Missing signers */
  missingSigners: DocumentSigner[];
}

/**
 * Document creation parameters
 */
export interface CreateDocumentParams {
  /** Content type */
  contentType: DocumentContentType;
  /** Content data (string, object, or PDF file) */
  contentData: string | object | File;
  /** List of required signer user IDs or emails */
  requiredSigners: string[];
  /** Whether creator should auto-sign */
  signImmediately?: boolean;
}

/**
 * Document filter options
 */
export interface DocumentFilter {
  /** Filter by status */
  status?: DocumentStatus | DocumentStatus[];
  /** Filter by content type */
  contentType?: DocumentContentType;
  /** Filter by creator */
  createdBy?: string;
  /** Filter documents requiring my signature */
  requiresMySignature?: boolean;
  /** Filter documents I created */
  createdByMe?: boolean;
}

/**
 * Document verification result
 */
export interface DocumentVerification {
  /** Whether document is valid */
  valid: boolean;
  /** All signatures verified */
  signaturesValid: boolean;
  /** Content hash matches */
  contentHashValid: boolean;
  /** All required signers signed */
  allSignersPresent: boolean;
  /** Verification errors */
  errors: string[];
  /** Verification timestamp */
  verifiedAt: Date;
}

/**
 * Signature verification result
 */
export interface SignatureVerification {
  /** Whether signature is valid */
  valid: boolean;
  /** Recovered signer address */
  recoveredAddress: string;
  /** Expected signer address */
  expectedAddress: string;
  /** Addresses match */
  addressMatch: boolean;
  /** Document hash matches */
  hashMatch: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Document share/export data
 */
export interface DocumentShareData {
  /** Document data */
  document: Document;
  /** Share URL (optional) */
  shareUrl?: string;
  /** QR code data (optional) */
  qrCode?: string;
  /** Expiration time (optional) */
  expiresAt?: Date;
}

/**
 * Document event for tracking
 */
export interface DocumentEvent {
  /** Event type */
  type: 'created' | 'signed' | 'verified' | 'completed' | 'cancelled';
  /** Document ID */
  documentId: string;
  /** User who triggered event */
  userId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Additional data */
  data?: any;
}
