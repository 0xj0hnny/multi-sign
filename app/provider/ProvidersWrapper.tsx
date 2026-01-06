"use client";

import { useAuth } from "./AuthProvider";
import { WalletConnectProvider } from "./WalletConnectProvider";
import { TransactionProvider } from "./TransactionProvider";
import { DocumentProvider } from "./DocumentProvider";
import { InitializationHandler } from "../../components/units/InitializationHandler";
import { ReactNode } from "react";

export function ProvidersWrapper({ children }: { children: ReactNode }) {
  const { logout } = useAuth();

  return (
    <WalletConnectProvider onSessionDisconnected={logout}>
      <TransactionProvider>
        <DocumentProvider>
          <InitializationHandler />
          {children}
        </DocumentProvider>
      </TransactionProvider>
    </WalletConnectProvider>
  );
}
