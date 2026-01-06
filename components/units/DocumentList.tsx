import { useRouter } from 'next/navigation';
import { useDocument } from '../../app/provider/DocumentProvider';
import type { Document } from '../../app/types/document';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, Clock, FileCheck, FilePlus, Code, File } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const DocumentList = () => {
  const router = useRouter();
  const { documents, getPendingDocuments, getMyDocuments, selectDocument } = useDocument();

  const myDocuments = getMyDocuments();
  const pendingDocuments = getPendingDocuments();

  const getStatusVariant = (status: Document['status']): "complete" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'complete':
        return 'complete';
      case 'partial':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'partial':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'json':
        return <Code className="h-4 w-4" />;
      case 'pdf':
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getContentPreview = (doc: Document) => {
    switch (doc.content.type) {
      case 'text':
        const text = doc.content.data as string;
        return text.substring(0, 60) + (text.length > 60 ? '...' : '');
      case 'json':
        return 'JSON Object';
      case 'pdf':
        const pdfData = doc.content.data as any;
        return pdfData.filename || 'PDF Document';
      default:
        return 'Document';
    }
  };

  const renderDocumentCard = (doc: Document) => {
    const signatureCount = doc.signatures.length;
    const requiredCount = doc.requiredSigners.length;
    const percentage = requiredCount > 0 ? Math.round((signatureCount / requiredCount) * 100) : 0;

    return (
      <Card
        key={doc.id}
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
        onClick={() => {
          selectDocument(doc.id);
          router.push(`/documents/${doc.id}`);
        }}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getContentTypeIcon(doc.content.type)}
                <h4 className="font-semibold text-base">{getContentPreview(doc)}</h4>
                <Badge variant="outline" className="text-xs">
                  {doc.content.type.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                Created by {doc.createdBy.username} • {formatDate(doc.createdAt)}
              </p>
            </div>
            <Badge variant={getStatusVariant(doc.status)} className="ml-2">
              <span className="flex items-center gap-1">
                {getStatusIcon(doc.status)}
                <span className="capitalize">{doc.status}</span>
              </span>
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Signatures: {signatureCount} of {requiredCount}</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
          <CardDescription>No documents yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FilePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Create your first document to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Documents */}
      {pendingDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Pending Your Signature
              <Badge variant="secondary">{pendingDocuments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingDocuments.map(renderDocumentCard)}
          </CardContent>
        </Card>
      )}

      {/* My Documents */}
      {myDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-blue-500" />
              My Documents
              <Badge variant="secondary">{myDocuments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myDocuments.map(renderDocumentCard)}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
