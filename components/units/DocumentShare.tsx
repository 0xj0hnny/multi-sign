import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Share2, Copy, CheckCircle2 } from 'lucide-react';

interface DocumentShareProps {
  documentId: string;
  documentTitle: string;
}

export const DocumentShare = ({ documentId, documentTitle }: DocumentShareProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/documents/${documentId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-blue-600" />
          Share Document
        </CardTitle>
        <CardDescription>
          Share this link with required signers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert>
          <AlertDescription className="text-xs">
            <strong>Document:</strong> {documentTitle}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-white font-mono text-xs"
            onClick={(e) => e.currentTarget.select()}
          />
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant={copied ? "default" : "outline"}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        <Alert className="bg-white">
          <AlertDescription className="text-xs">
            <strong>How to share:</strong>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>Copy the link above</li>
              <li>Send it to required signers via email/chat</li>
              <li>They'll open the link and sign the document</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
