'use client'
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Keycloak from "keycloak-js";
import { REALM } from '../utils/constant';

// Initialize Keycloak instance
const keycloak = new Keycloak({
  url: "https://auth.solvewithvia.com/auth",
  realm: REALM,
  clientId: "localhost-app",
});

// Define the shape of our auth context
interface AuthContextType {
  authenticated: boolean;
  loading: boolean;
  keycloak: Keycloak;
  currentToken: string | undefined;
  lastTokenUpdate: Date | undefined;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentToken, setCurrentToken] = useState<string | undefined>();
  const [lastTokenUpdate, setLastTokenUpdate] = useState<Date>();

  const handleLogout = () => {
    console.log('Logging out...');
    setCurrentToken(undefined);
    setLastTokenUpdate(undefined);
    setAuthenticated(false);
    keycloak.logout({
      redirectUri: window.location.origin + "/"
    });
  };

  const getTokenDisplay = (token: string | undefined) => {
    if (!token) return "No token";

    // Split JWT into parts (header.payload.signature)
    const parts = token.split('.');
    if (parts.length < 2) return token.substring(0, 30) + "...";

    // Show part of header, payload, and signature for better visibility of changes
    const header = parts[0].substring(0, 8);
    const payload = parts[1].substring(20, 40); // Show middle section of payload (contains user/time data)
    const signature = parts[2] ? parts[2].substring(0, 8) : "";

    return `${header}..${payload}..${signature}`;
  };

  const setupTokenRefresh = () => {
    // Update token every 5 minutes if it expires within 350 seconds
    keycloak.updateToken(350).then((refreshed) => {
      const tokenDisplay = getTokenDisplay(keycloak.token);
      if (refreshed) {
        console.log('Token refreshed. New token:', tokenDisplay);
      } else {
        console.log('Token is still valid. Token:', tokenDisplay);
      }
      // Update the displayed token whether it was refreshed or not
      setCurrentToken(keycloak.token);
      setLastTokenUpdate(new Date());
    }).catch((error) => {
      console.error('Failed to refresh token:', error);
      // If refresh fails, redirect to login
      keycloak.login({
        redirectUri: window.location.href
      });
    });
  };

  useEffect(() => {
    // Build redirect URI that preserves port and path
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const pathname = window.location.pathname;
    const redirectUri = `${protocol}//${hostname}${port}${pathname}`;

    keycloak.init({
      onLoad: "login-required",
      redirectUri: redirectUri,
      checkLoginIframe: false,
      responseMode: "query",
      pkceMethod: "S256",
      enableLogging: true,
      scope: "openid profile email",
      checkLoginIframeInterval: 0,
      messageReceiveTimeout: 10000,
      flow: "standard",
      // Enable nonce validation for better security
      useNonce: true
    })
      .then(auth => {
        if (!keycloak.authenticated) {
          keycloak.login({
            redirectUri: redirectUri
          }).catch(err => {
            setLoading(false);
          });
        } else {
          setAuthenticated(true);
          setCurrentToken(keycloak.token);
          setLastTokenUpdate(new Date());
          setLoading(false);
        }
      })
      .catch((error) => {
        // Try to extract more information from the URL if there's an error
        const urlParams = new URLSearchParams(window.location.search);
        const authError = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        if (authError) {
          console.error('URL Error:', authError);
          console.error('URL Error Description:', errorDescription);
        }

        // Check if we have an authorization code but authentication failed
        const code = urlParams.get('code');
        if (code) {
          console.error('Authorization code received but token exchange failed');
          console.error('Code:', code.substring(0, 20) + '...');

          // Try manual token exchange for debugging
          const state = urlParams.get('state');
          console.error('State:', state);
          console.error('Full URL:', window.location.href);
        }

        setAuthenticated(false);
        setLoading(false);
      });
  }, []);

  // Set up token refresh monitoring
  useEffect(() => {
    if (authenticated) {
      // Set up periodic token refresh
      const refreshInterval = setInterval(setupTokenRefresh, 300000); // Check every 5 minutes

      // Initial token refresh setup
      setupTokenRefresh();

      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [authenticated]);

  const value: AuthContextType = {
    authenticated,
    loading,
    keycloak,
    currentToken,
    lastTokenUpdate,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
