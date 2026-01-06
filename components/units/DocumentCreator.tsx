'use client';

import React, { useState, useCallback } from 'react';
import { useDocument } from '../../app/provider/DocumentProvider';
import { useAuth } from '../../app/provider/AuthProvider';
import { useWalletConnect } from '../../app/provider/WalletConnectProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, X, CheckCircle2, AlertCircle, Loader2, Upload, Code } from 'lucide-react';
import { DocumentShare } from './DocumentShare';
import { validateJSON } from '../../app/utils/jsonUtils';
import { validatePDF, validatePDFSize, formatFileSize } from '../../app/utils/pdfUtils';
import type { DocumentContentType } from '../../app/types/document';
import { PdfViewer } from './PdfViewer';

export const DocumentCreator = () => {
  const { createDocument, isLoading, error, clearError } = useDocument();
  const { keycloak } = useAuth();
  const { isConnected } = useWalletConnect();

  // Content type and data
  const [contentType, setContentType] = useState<DocumentContentType>('text');
  const [textContent, setTextContent] = useState('');
  const [jsonContent, setJsonContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Required signers
  const [signerInput, setSignerInput] = useState('');
  const [signers, setSigners] = useState<string[]>([]);

  // UI state
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [createdDocumentId, setCreatedDocumentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleAddSigner = () => {
    if (!signerInput.trim()) return;

    const currentUserId = keycloak.tokenParsed?.sub || '';
    const currentEmail = keycloak.tokenParsed?.email || '';
    const currentUsername = keycloak.tokenParsed?.preferred_username || '';
    const trimmedInput = signerInput.trim();

    // Check if user is trying to add themselves
    if (trimmedInput === currentUserId ||
      trimmedInput === currentEmail ||
      trimmedInput === currentUsername) {
      setValidationError('You cannot add yourself as a signer. You will be automatically added.');
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    // Check if already added
    if (signers.includes(trimmedInput)) {
      setValidationError('This signer has already been added.');
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    setSigners([...signers, trimmedInput]);
    setSignerInput('');
    setValidationError(null);
  };

  const handleRemoveSigner = (signer: string) => {
    setSigners(signers.filter(s => s !== signer));
  };

  const handleFileSelect = (file: File) => {
    // Validate PDF
    if (!validatePDF(file)) {
      setValidationError('Please select a valid PDF file.');
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    // Validate size (10MB max)
    if (!validatePDFSize(file, 10)) {
      setValidationError('PDF file must be smaller than 10MB.');
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    setPdfFile(file);
    setValidationError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateContent = (): boolean => {
    switch (contentType) {
      case 'text':
        if (!textContent.trim()) {
          setValidationError('Please enter document content.');
          setTimeout(() => setValidationError(null), 3000);
          return false;
        }
        break;

      case 'json':
        if (!jsonContent.trim()) {
          setValidationError('Please enter JSON content.');
          setTimeout(() => setValidationError(null), 3000);
          return false;
        }
        if (!validateJSON(jsonContent)) {
          setValidationError('Invalid JSON format. Please check your syntax.');
          setTimeout(() => setValidationError(null), 3000);
          return false;
        }
        break;

      case 'pdf':
        if (!pdfFile) {
          setValidationError('Please upload a PDF file.');
          setTimeout(() => setValidationError(null), 3000);
          return false;
        }
        break;
    }

    if (signers.length === 0) {
      setValidationError('Please add at least one other signer for multi-party signing.');
      setTimeout(() => setValidationError(null), 3000);
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!validateContent()) return;

    try {
      clearError();
      setShowSuccess(false);

      const currentUserId = keycloak.tokenParsed?.sub || '';
      const allSigners = signers.includes(currentUserId) ? signers : [currentUserId, ...signers];

      // Prepare content data based on type
      let contentData: string | object | File;
      switch (contentType) {
        case 'text':
          contentData = textContent.trim();
          break;
        case 'json':
          contentData = jsonContent.trim();
          break;
        case 'pdf':
          contentData = pdfFile!;
          break;
      }

      const doc = await createDocument({
        contentType,
        contentData,
        requiredSigners: allSigners,
        signImmediately: true
      });

      // Store document ID for sharing
      setCreatedDocumentId(doc.id);

      // Reset form
      setTextContent('');
      setJsonContent('');
      setPdfFile(null);
      setSigners([]);
      setShowSuccess(true);

      setTimeout(() => setShowSuccess(false), 5000);

    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Document
          </CardTitle>
          <CardDescription>
            Please connect your wallet to create documents
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create New Document
        </CardTitle>
        <CardDescription>
          Create a document with text, JSON, or PDF content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Content Type Tabs */}
        <Tabs value={contentType} onValueChange={(value) => setContentType(value as DocumentContentType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="json">
              <Code className="h-4 w-4 mr-2" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <Upload className="h-4 w-4 mr-2" />
              PDF
            </TabsTrigger>
          </TabsList>

          {/* Text Content */}
          <TabsContent value="text" className="space-y-2">
            <label className="text-sm font-medium">Document Content</label>
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Enter your document content here..."
              className="min-h-[200px] resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Plain text content that will be cryptographically signed
            </p>
          </TabsContent>

          {/* JSON Content */}
          <TabsContent value="json" className="space-y-2">
            <label className="text-sm font-medium">JSON Object</label>
            <Textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              placeholder={'{\n  "key": "value",\n  "data": {\n    "nested": true\n  }\n}'}
              className="min-h-[200px] resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Valid JSON object - will be canonicalized for consistent hashing
            </p>
          </TabsContent>

          {/* PDF Upload */}
          <TabsContent value="pdf" className="space-y-2">
            <label className="text-sm font-medium">PDF File</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg text-center transition-colors ${isDragging
                ? 'border-primary bg-primary/5'
                : pdfFile
                  ? 'border-green-500 bg-green-50 p-1'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50 p-8'
                }`}
            >
              {pdfFile ? (
                <div className="relative">
                  {/* PDF Preview */}
                  <div className="border rounded-md overflow-hidden bg-white">
                    <PdfViewer pdfUrl={URL.createObjectURL(pdfFile)} />
                  </div>

                  {/* Subtle Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPdfFile(null)}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-sm"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Drop PDF file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="max-w-xs mx-auto"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PDF file will be stored and its hash will be signed (max 10MB)
            </p>
          </TabsContent>
        </Tabs>

        {/* Required Signers */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Required Signers</label>
          <div className="flex gap-2">
            <Input
              value={signerInput}
              onChange={(e) => setSignerInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSigner()}
              placeholder="Enter user ID or email"
              className="flex-1"
            />
            <Button onClick={handleAddSigner} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Signer List */}
          {signers.length > 0 && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Signers ({signers.length})</p>
              <div className="flex flex-wrap gap-2">
                {signers.map((signer, index) => (
                  <Badge key={index} variant="secondary" className="pl-2 pr-1">
                    <span className="text-xs font-mono">{signer}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2 hover:bg-destructive/20"
                      onClick={() => handleRemoveSigner(signer)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            💡 You will automatically be added as a signer
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {showSuccess && (
          <Alert className="border-green-500 bg-green-50 text-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>Document created and signed successfully!</AlertDescription>
          </Alert>
        )}

        {/* Create Button */}
        <Button
          onClick={handleCreate}
          disabled={isLoading || signers.length === 0}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating & Signing...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Create & Sign Document
            </>
          )}
        </Button>

        {/* Info */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>How it works:</strong>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li className="text-left">Content hash is computed and signed with your wallet</li>
              <li className="text-left">Other signers can view content and sign via shared link</li>
              <li className="text-left">Document is complete when all signers have signed</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Share Link */}
        {createdDocumentId && (
          <DocumentShare
            documentId={createdDocumentId}
            documentTitle={`Document (${contentType})`}
          />
        )}

      </CardContent>
    </Card>
  );
};
