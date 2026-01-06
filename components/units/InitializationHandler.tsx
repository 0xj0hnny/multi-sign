"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../app/provider/AuthProvider";
import { useConfig } from "../../app/provider/ConfigProvider";
import { useWalletConnect } from "../../app/provider/WalletConnectProvider";

export function InitializationHandler() {
  const { keycloak, authenticated } = useAuth();
  const { loadAppConfig, isInitialized, walletConnectInfo } = useConfig();
  const { initializeWithSessionInfo } = useWalletConnect();
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // Load config after authentication
  useEffect(() => {
    if (authenticated && keycloak && !isInitialized) {
      console.log('Loading app config after authentication...');
      loadAppConfig(keycloak);
    }
  }, [authenticated, keycloak, isInitialized, loadAppConfig]);

  // Initialize WalletConnect when config is loaded
  useEffect(() => {
    if (isInitialized && walletConnectInfo && authenticated && !sessionInitialized) {
      console.log('Initializing WalletConnect with session info...');
      initializeWithSessionInfo(walletConnectInfo);
      setSessionInitialized(true);
    }
  }, [isInitialized, walletConnectInfo, authenticated, sessionInitialized, initializeWithSessionInfo]);

  return null; // This component doesn't render anything
}
