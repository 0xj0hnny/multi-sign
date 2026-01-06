'use client';

import { useAuth } from '@/app/provider/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { keycloak, logout } = useAuth();

  const userEmail = keycloak.tokenParsed?.email || 'Unknown User';
  const username = keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.email || 'User';

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split('@')[0] // Remove email domain if it's an email
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-black shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">VIA Document Signing</h1>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(username)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{username}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>

            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}