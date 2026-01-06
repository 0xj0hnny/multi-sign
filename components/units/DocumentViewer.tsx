'use client';

import { useEffect, useState } from 'react';
import { useDocument } from '../../app/provider/DocumentProvider';
import { useAuth } from '../../app/provider/AuthProvider';
import type { DocumentVerification, PDFData } from '../../app/types/document';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  PenTool,
  Download,
  Code,
  File
} from 'lucide-react';
import { prettyPrintJSON } from '../../app/utils/jsonUtils';
import { createPDFDownloadLink, formatFileSize } from '../../app/utils/pdfUtils';
import { PdfViewer } from './PdfViewer';

export const DocumentViewer = () => {
  const { currentDocument, signDocument, isSigning, verifyDocument, error, clearError } = useDocument();
  const { keycloak } = useAuth();
  const [verification, setVerification] = useState<DocumentVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const doc = currentDocument;

  useEffect(() => {
    setVerification(null);
  }, [doc?.id]);

  if (!doc) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Viewer
          </CardTitle>
          <CardDescription>Select a document to view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click on a document from the list to view details</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentUserEmail = keycloak.tokenParsed?.email || '';
  const currentUserId = keycloak.tokenParsed?.sub || '';
  const hasUserSigned = doc.signatures.some(sig => sig.signer.userId === currentUserId);
  const canUserSign = doc.requiredSigners.some(s => {
    return s.userId === currentUserId || s.username === currentUserEmail
  }) && !hasUserSigned;

  const handleSign = async () => {
    try {
      clearError();
      await signDocument(doc.id);
    } catch (err) {
      console.error('Failed to sign document:', err);
    }
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      const result = await verifyDocument(doc.id);
      setVerification(result);
    } catch (err) {
      console.error('Failed to verify document:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadPDF = () => {
    if (doc.content.type !== 'pdf') return;

    const pdfData = doc.content.data as PDFData;
    const downloadUrl = createPDFDownloadLink(pdfData);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = pdfData.filename;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    switch (doc.status) {
      case 'complete':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
      case 'partial':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge variant="outline"><FileText className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{doc.status}</Badge>;
    }
  };

  const getContentTypeIcon = () => {
    switch (doc.content.type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <Code className="h-4 w-4" />;
      case 'pdf':
        return <File className="h-4 w-4" />;
    }
  };

  const renderContent = () => {
    switch (doc.content.type) {
      case 'text':
        return (
          <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm leading-relaxed font-mono">
            {doc.content.data as string}
          </div>
        );

      case 'json':
        return (
          <div className="p-4 bg-muted rounded-md">
            <pre className="text-sm leading-relaxed font-mono overflow-x-auto">
              {prettyPrintJSON(doc.content.data)}
            </pre>
          </div>
        );

      case 'pdf':
        const pdfData = doc.content.data as PDFData;
        const pdfUrl = `data:${pdfData.mimeType};base64,${pdfData.base64}`;

        return (
          <div className="space-y-4">
            {/* PDF Info */}
            <div className="p-4 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <File className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">{pdfData.filename}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(pdfData.size)}</p>
                  </div>
                </div>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF Hash: <code className="bg-background px-2 py-1 rounded">{doc.content.hash.substring(0, 16)}...</code>
              </p>
            </div>

            {/* PDF Preview */}
            <div className="border rounded-md overflow-hidden bg-white">
              <PdfViewer pdfUrl={pdfUrl} />
            </div>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">Document</CardTitle>
              <Badge variant="outline" className="text-xs">
                {doc.content.type.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="space-y-1">
              <div>Created by <strong>{doc.createdBy.username}</strong></div>
              <div>{formatDate(doc.createdAt)}</div>
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Content */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            {getContentTypeIcon()}
            Document Content ({doc.content.type})
          </h4>
          {renderContent()}
          <p className="text-xs text-muted-foreground">
            Content Hash: <code className="bg-muted px-2 py-1 rounded">{doc.content.hash.substring(0, 32)}...</code>
          </p>
        </div>

        <Separator />

        {/* Signatures */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Signatures ({doc.signatures.length} of {doc.requiredSigners.length})
          </h4>
          <div className="space-y-2">
            {doc.requiredSigners.map((signer, index) => {
              // Find signature by matching userId or email
              const signature = doc.signatures.find(sig =>
                sig.signer.userId === signer.userId ||
                sig.signer.email === signer.userId ||
                sig.signer.userId === signer.username
              );
              const hasSigned = !!signature;

              return (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${hasSigned
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasSigned ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{signer.username}</p>
                        {signature && (
                          <p className="text-xs text-muted-foreground">
                            Signed {formatDate(signature.signedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    {hasSigned && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Signed
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Verification Result */}
        {verification && (
          <Alert variant={verification.valid ? "default" : "destructive"}
            className={verification.valid ? "border-green-500 bg-green-50" : ""}>
            {verification.valid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <strong>{verification.valid ? '✅ Document Verified' : '❌ Verification Failed'}</strong>
              {verification.errors.length > 0 && (
                <ul className="mt-2 ml-4 list-disc text-xs space-y-1">
                  {verification.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canUserSign && (
            <Button
              onClick={handleSign}
              disabled={isSigning}
              className="flex-1"
              size="lg"
            >
              {isSigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="mr-2 h-4 w-4" />
                  Sign Document
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            variant="outline"
            size="lg"
            className={canUserSign ? "" : "flex-1"}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Verify Signatures
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        {canUserSign && (
          <Alert>
            <AlertDescription className="text-xs">
              <strong>Ready to sign:</strong> Review the content above and click "Sign Document" to add your cryptographic signature
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
