"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ConversionTable } from "@/components/conversion-table";
import { UploadDialog } from "@/components/upload-dialog";
import { fetchConversions, type Conversion } from "@/lib/api";
import { FileText, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversions = useCallback(async () => {
    try {
      const data = await fetchConversions();
      setConversions(data);
    } catch {
      // silently fail on initial load — user may not have any conversions yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
      return;
    }
    if (status === "authenticated") {
      loadConversions();
    }
  }, [status, router, loadConversions]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Conversions
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your PDF to Word conversion history
            </p>
          </div>
          <UploadDialog onConversionComplete={loadConversions} />
        </div>

        <ConversionTable conversions={conversions} loading={loading} />

        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-12">
          <FileText className="h-4 w-4 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground/50">
            Drop a PDF anywhere on this page to start a conversion
          </p>
        </div>
      </main>
    </div>
  );
}
