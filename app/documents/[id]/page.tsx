'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useDocument } from '@/app/provider/DocumentProvider';
import { DocumentViewer } from '@/components/units/DocumentViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DocumentPage() {
  const params = useParams();
  const router = useRouter();
  const { selectDocument, currentDocument } = useDocument();

  // Extract the ID from the URL params
  const documentId = params.id as string;

  useEffect(() => {
    if (documentId) {
      selectDocument(documentId);
    }
  }, [documentId, selectDocument]);

  if (!currentDocument) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <h1>Document not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto p-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>

        {/* Document Viewer */}
        <DocumentViewer />
      </div>
    </div>
  );
}