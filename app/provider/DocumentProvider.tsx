import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { useTransaction } from './TransactionProvider';
import { useAuth } from './AuthProvider';
import { useWalletConnect } from './WalletConnectProvider';
import type {
  Document,
  DocumentStatus,
  DocumentSignature,
  SignatureStatus,
  CreateDocumentParams,
  DocumentVerification,
  SignatureVerification,
  DocumentUser,
  DocumentContent,
  PDFData
} from '../types/document';
import { canonicalizeJSON } from '../utils/jsonUtils';
import { readPDFFile } from '../utils/pdfUtils';

/**
 * Document Provider State
 */
interface DocumentState {
  /** All documents */
  documents: Document[];
  /** Currently selected document */
  currentDocument: Document | null;
  /** Loading state for document operations */
  isLoading: boolean;
  /** Loading state for signing */
  isSigning: boolean;
  /** Last error */
  error: string | null;

  /** Create a new document */
  createDocument: (params: CreateDocumentParams) => Promise<Document>;
  /** Get document by ID */
  getDocument: (id: string) => Document | null;
  /** Get all my documents */
  getMyDocuments: () => Document[];
  /** Get documents requiring my signature */
  getPendingDocuments: () => Document[];
  /** Sign a document */
  signDocument: (documentId: string) => Promise<void>;
  /** Get signature status for a document */
  getSignatureStatus: (documentId: string) => SignatureStatus | null;
  /** Verify all signatures on a document */
  verifyDocument: (documentId: string) => Promise<DocumentVerification>;
  /** Select a document */
  selectDocument: (documentId: string) => void;
  /** Clear error */
  clearError: () => void;
}

const DocumentContext = createContext<DocumentState | null>(null);

interface DocumentProviderProps {
  children: ReactNode;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const { signMessage } = useTransaction();
  const { keycloak } = useAuth();
  const { session } = useWalletConnect();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load documents from localStorage on mount
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem('via_documents');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const docs = parsed.map((doc: any) => ({
          ...doc,
          createdAt: new Date(doc.createdAt),
          updatedAt: new Date(doc.updatedAt),
          signatures: doc.signatures.map((sig: any) => ({
            ...sig,
            signedAt: new Date(sig.signedAt),
            verifiedAt: sig.verifiedAt ? new Date(sig.verifiedAt) : undefined
          }))
        }));
        setDocuments(docs);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  }, []);

  /**
   * Save documents to localStorage whenever they change
   */
  useEffect(() => {
    try {
      localStorage.setItem('via_documents', JSON.stringify(documents));
    } catch (err) {
      console.error('Failed to save documents:', err);
    }
  }, [documents]);

  /**
   * Get current user info
   */
  const getCurrentUser = useCallback((): DocumentUser | null => {
    if (!keycloak.authenticated || !keycloak.tokenParsed || !session) return null;

    // Extract wallet address from session
    const accounts = session.namespaces.viasecurechain?.accounts || [];
    if (accounts.length === 0) return null;

    const walletAddress = accounts[0].split(':')[2];

    return {
      userId: keycloak.tokenParsed.sub || '',
      username: keycloak.tokenParsed.preferred_username || keycloak.tokenParsed.email || 'Unknown User',
      email: keycloak.tokenParsed.email,
      walletAddress
    };
  }, [keycloak, session]);

  /**
   * Generate document hash based on content type
   */
  const hashDocumentContent = useCallback((content: DocumentContent): string => {
    let canonicalForm: string;

    switch (content.type) {
      case 'text':
        // For text, use the string directly
        canonicalForm = content.data as string;
        break;

      case 'json':
        // For JSON, use canonical form (sorted keys)
        canonicalForm = canonicalizeJSON(content.data);
        break;

      case 'pdf':
        // For PDF, use the base64 data
        const pdfData = content.data as PDFData;
        canonicalForm = pdfData.base64;
        break;

      default:
        throw new Error(`Unsupported content type: ${content.type}`);
    }

    // Compute Keccak-256 hash (Ethereum standard)
    return ethers.keccak256(ethers.toUtf8Bytes(canonicalForm));
  }, []);

  /**
   * Create message for document signing (using personal_sign)
   * Since VIA Wallet doesn't support eth_signTypedData_v4, we use personal_sign with structured message
   */
  const createDocumentMessage = useCallback((doc: Document): string => {
    // Create a structured message that includes all important document info
    const message = [
      '=== VIA DOCUMENT SIGNATURE ===',
      '',
      `Document ID: ${doc.id}`,
      `Content Type: ${doc.content.type}`,
      `Content Hash: ${doc.content.hash}`,
      `Created: ${doc.createdAt.toISOString()}`,
      `Required Signers: ${doc.requiredSigners.map(s => s.userId).join(', ')}`,
      '',
      'By signing this message, I confirm that I have reviewed and approve this document.',
      '',
      '=== END SIGNATURE ==='
    ].join('\n');

    return message;
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a new document
   */
  const createDocument = async (params: CreateDocumentParams): Promise<Document> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated or wallet not connected');
    }

    try {
      setIsLoading(true);
      clearError();

      // Generate document ID
      const id = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process content based on type
      let documentContent: DocumentContent;

      switch (params.contentType) {
        case 'text':
          // Text content - store as-is
          documentContent = {
            type: 'text',
            data: params.contentData as string,
            hash: '' // Will be computed below
          };
          break;

        case 'json':
          // JSON content - validate and store object
          const jsonData = typeof params.contentData === 'string'
            ? JSON.parse(params.contentData as string)
            : params.contentData;
          documentContent = {
            type: 'json',
            data: jsonData,
            hash: '' // Will be computed below
          };
          break;

        case 'pdf':
          // PDF content - read file and store base64
          if (!(params.contentData instanceof File)) {
            throw new Error('PDF content must be a File object');
          }
          const pdfData = await readPDFFile(params.contentData);
          documentContent = {
            type: 'pdf',
            data: pdfData,
            hash: '' // Will be computed below
          };
          break;

        default:
          throw new Error(`Unsupported content type: ${params.contentType}`);
      }

      // Compute content hash
      documentContent.hash = hashDocumentContent(documentContent);

      // Create document
      const doc: Document = {
        id,
        content: documentContent,
        createdBy: currentUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
        requiredSigners: params.requiredSigners.map(userId => ({
          userId,
          username: userId, // In real app, would look up username
          required: true,
          hasSigned: false
        })),
        signatures: []
      };

      // Add to documents
      setDocuments(prev => [doc, ...prev]);

      // Auto-sign if requested
      if (params.signImmediately) {
        // Pass the document directly instead of looking it up from state
        await signDocumentDirect(doc);
      }

      return doc;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create document';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get document by ID
   */
  const getDocument = useCallback((id: string): Document | null => {
    return documents.find(doc => doc.id === id) || null;
  }, [documents]);

  /**
   * Get my documents (created by me)
   */
  const getMyDocuments = useCallback((): Document[] => {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];

    return documents.filter(doc => {
      // Check if I created this document (by userId OR email)
      const isCreator = doc.createdBy.userId === currentUser.userId ||
        doc.createdBy.email === currentUser.email;

      // Check if I'm a required signer (by userId OR email)
      const isRequiredSigner = doc.requiredSigners.some(s =>
        s.userId === currentUser.userId ||
        s.userId === currentUser.email ||
        (currentUser.email && s.userId.toLowerCase() === currentUser.email.toLowerCase())
      );

      // Return true if either condition is met
      return isCreator || isRequiredSigner;
    });
  }, [documents, getCurrentUser]);

  /**
   * Get documents requiring my signature
   */
  const getPendingDocuments = useCallback((): Document[] => {
    const currentUser = getCurrentUser();

    if (!currentUser) return [];

    const pending = documents.filter(doc => {
      // Check if I'm a required signer (match by userId OR email)
      const isRequiredSigner = doc.requiredSigners.some(s =>
        s.userId === currentUser.userId ||
        s.userId === currentUser.email ||
        (currentUser.email && s.userId.toLowerCase() === currentUser.email.toLowerCase())
      );

      if (!isRequiredSigner) return false;

      // Check if I haven't signed yet (match by userId OR email)
      const hasSigned = doc.signatures.some(sig =>
        sig.signer.userId === currentUser.userId ||
        sig.signer.email === currentUser.email
      );

      return !hasSigned;
    });

    return pending;
  }, [documents, getCurrentUser]);

  /**
   * Sign a document (helper that accepts document directly)
   * Used during document creation when document isn't in state yet
   */
  const signDocumentDirect = async (doc: Document): Promise<void> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated or wallet not connected');
    }

    // Check if already signed
    const alreadySigned = doc.signatures.some(sig => sig.signer.userId === currentUser.userId);
    if (alreadySigned) {
      throw new Error('You have already signed this document');
    }

    // Check if user is a required signer
    const isRequiredSigner = doc.requiredSigners.some(s => s.userId === currentUser.userId);
    if (!isRequiredSigner) {
      throw new Error('You are not a required signer for this document');
    }

    try {
      setIsSigning(true);
      clearError();

      // Create message for signing
      const message = createDocumentMessage(doc);

      // Sign with wallet using personal_sign
      const signature = await signMessage(message);

      if (!signature) {
        throw new Error('Signature failed');
      }

      // Create signature record
      const docSignature: DocumentSignature = {
        signer: currentUser,
        signature,
        signedAt: new Date(),
        documentHash: doc.content.hash,
        verified: false
      };

      // Update document in state
      setDocuments(prev => prev.map(d => {
        if (d.id !== doc.id) return d;

        const newSignatures = [...d.signatures, docSignature];

        // Update required signers - match by both userId and email
        const newRequiredSigners = d.requiredSigners.map(s => {
          const hasSignedNow = s.userId === currentUser.userId ||
            s.userId === currentUser.email ||
            s.username === currentUser.email;
          return hasSignedNow ? { ...s, hasSigned: true } : s;
        });

        // Update status
        let newStatus: DocumentStatus = d.status;
        const allSigned = newRequiredSigners.every(s => s.hasSigned);
        if (allSigned) {
          newStatus = 'complete';
        } else if (newSignatures.length > 0) {
          newStatus = 'partial';
        }

        return {
          ...d,
          signatures: newSignatures,
          requiredSigners: newRequiredSigners,
          status: newStatus,
          updatedAt: new Date()
        };
      }));

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sign document';
      setError(errorMsg);
      throw err;
    } finally {
      setIsSigning(false);
    }
  };

  /**
   * Sign a document
   */
  const signDocument = async (documentId: string): Promise<void> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated or wallet not connected');
    }

    const doc = getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    // Check if already signed
    const alreadySigned = doc.signatures.some(sig => sig.signer.userId === currentUser.userId);
    if (alreadySigned) {
      throw new Error('You have already signed this document');
    }

    // Check if user is a required signer (check both userId and email)
    const isRequiredSigner = doc.requiredSigners.some(s =>
      s.userId === currentUser.userId || s.username === currentUser.email
    );

    if (!isRequiredSigner) {
      throw new Error('You are not a required signer for this document');
    }

    try {
      setIsSigning(true);
      clearError();

      // Create message for signing
      const message = createDocumentMessage(doc);

      // Sign with wallet using personal_sign
      const signature = await signMessage(message);

      if (!signature) {
        throw new Error('Signature failed');
      }

      // Create signature record
      const docSignature: DocumentSignature = {
        signer: currentUser,
        signature,
        signedAt: new Date(),
        documentHash: doc.content.hash,
        verified: false // Will be verified later
      };

      // Update document
      setDocuments(prev => prev.map(d => {
        if (d.id !== documentId) return d;

        const newSignatures = [...d.signatures, docSignature];

        // Update required signers - match by both userId and email
        const newRequiredSigners = d.requiredSigners.map(s => {
          const hasSignedNow = s.userId === currentUser.userId ||
            s.userId === currentUser.email ||
            s.username === currentUser.email;
          return hasSignedNow ? { ...s, hasSigned: true } : s;
        });

        // Update status
        let newStatus: DocumentStatus = d.status;
        const allSigned = newRequiredSigners.every(s => s.hasSigned);
        if (allSigned) {
          newStatus = 'complete';
        } else if (newSignatures.length > 0) {
          newStatus = 'partial';
        }

        return {
          ...d,
          signatures: newSignatures,
          requiredSigners: newRequiredSigners,
          status: newStatus,
          updatedAt: new Date()
        };
      }));

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to sign document';
      setError(errorMsg);
      throw err;
    } finally {
      setIsSigning(false);
    }
  };

  /**
   * Get signature status for a document
   */
  const getSignatureStatus = useCallback((documentId: string): SignatureStatus | null => {
    const doc = getDocument(documentId);
    if (!doc) return null;

    const total = doc.requiredSigners.length;
    const signed = doc.signatures.length;
    const pending = doc.requiredSigners
      .filter(s => !s.hasSigned)
      .map(s => s.userId);
    const missingSigners = doc.requiredSigners.filter(s => !s.hasSigned);

    return {
      total,
      signed,
      percentage: total > 0 ? Math.round((signed / total) * 100) : 0,
      pending,
      complete: signed === total,
      missingSigners
    };
  }, [getDocument]);

  /**
   * Verify a single signature
   */
  const verifySignature = async (
    signature: DocumentSignature,
    doc: Document
  ): Promise<SignatureVerification> => {
    try {
      // Create the same message that was signed
      const message = createDocumentMessage(doc);

      // Recover signer address from signature
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature.signature);

      const addressMatch = recoveredAddress.toLowerCase() === signature.signer.walletAddress.toLowerCase();
      const hashMatch = signature.documentHash === doc.content.hash;

      return {
        valid: addressMatch && hashMatch,
        recoveredAddress,
        expectedAddress: signature.signer.walletAddress,
        addressMatch,
        hashMatch
      };

    } catch (err) {
      return {
        valid: false,
        recoveredAddress: '',
        expectedAddress: signature.signer.walletAddress,
        addressMatch: false,
        hashMatch: false,
        error: err instanceof Error ? err.message : 'Verification failed'
      };
    }
  };

  /**
   * Verify all signatures on a document
   */
  const verifyDocument = async (documentId: string): Promise<DocumentVerification> => {
    const doc = getDocument(documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    const errors: string[] = [];
    let signaturesValid = true;
    const contentHashValid = hashDocumentContent(doc.content) === doc.content.hash;

    // Verify each signature
    for (const sig of doc.signatures) {
      const verification = await verifySignature(sig, doc);
      if (!verification.valid) {
        signaturesValid = false;
        errors.push(`Invalid signature from ${sig.signer.username}: ${verification.error || 'Signature verification failed'}`);
      }
    }

    // Check all required signers signed - dynamically check signatures instead of relying on hasSigned flag
    const allSignersPresent = doc.requiredSigners.every(signer => {
      // Check if there's a signature from this signer (match by userId or email)
      const hasSignature = doc.signatures.some(sig =>
        sig.signer.userId === signer.userId ||
        sig.signer.email === signer.userId ||
        sig.signer.userId === signer.username
      );

      return hasSignature;
    });

    if (!allSignersPresent) {
      errors.push('Not all required signers have signed');
    }

    const valid = signaturesValid && contentHashValid && allSignersPresent;

    return {
      valid,
      signaturesValid,
      contentHashValid,
      allSignersPresent,
      errors,
      verifiedAt: new Date()
    };
  };

  /**
   * Select a document
   */
  const selectDocument = useCallback((documentId: string) => {
    const doc = getDocument(documentId);
    setCurrentDocument(doc);
  }, [getDocument]);

  const value: DocumentState = {
    documents,
    currentDocument,
    isLoading,
    isSigning,
    error,
    createDocument,
    getDocument,
    getMyDocuments,
    getPendingDocuments,
    signDocument,
    getSignatureStatus,
    verifyDocument,
    selectDocument,
    clearError
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocument = (): DocumentState => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within DocumentProvider');
  }
  return context;
};
