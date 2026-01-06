'use client';

import { useWalletConnect } from '../../app/provider/WalletConnectProvider';
import { Separator } from '@/components/ui/separator';
import { FileText, Loader2 } from 'lucide-react';
import { DocumentCreator } from './DocumentCreator';
import { DocumentList } from './DocumentList';
import { FeatureBanner } from './FeatureBanner';

export const Document = () => {
  const { isConnected, isLoading: isConnecting } = useWalletConnect();

  if (!isConnected || isConnecting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isConnecting ? 'Connecting wallet...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 pb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <FileText className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Multi-Party Document Signing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create, share, and cryptographically sign documents with multiple parties using VIA ZTF
        </p>
      </div>

      {/* Features Banner */}
      <FeatureBanner />

      <Separator className="my-8" />

      {/* Main Content - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Create Document */}
        <div className="space-y-6">
          <DocumentCreator />
        </div>

        {/* Right Column - Document List */}
        <div className="space-y-6">
          <DocumentList />
        </div>
      </div>
    </div>
  );
};