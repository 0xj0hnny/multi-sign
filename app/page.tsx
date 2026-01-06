"use client";

import { useAuth } from "./provider/AuthProvider";
import { Document } from "../components/units/Document";

export default function Home() {
  const { authenticated, loading, logout, } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div className="text-xl">Not authenticated</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans dark:bg-black">
      <main className="flex flex-1 w-full items-center justify-center">
        <div className="flex w-full max-w-7xl flex-col items-center justify-center gap-8 p-8">
          <Document />
        </div>
      </main>
    </div>
  );
}
