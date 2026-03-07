"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { ConversionTable } from "@/components/conversion-table";
import { UploadDialog } from "@/components/upload-dialog";
import { fetchConversions, fetchQuota, type Conversion, type Quota } from "@/lib/api";
import { FileUp, FileText, Loader2, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pageDragActive, setPageDragActive] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const dragCounter = useRef(0);

  const loadConversions = useCallback(async () => {
    const slowTimer = setTimeout(() => setSlowLoad(true), 3000);
    try {
      const [data, quotaData] = await Promise.all([fetchConversions(), fetchQuota()]);
      setConversions(data);
      setQuota(quotaData);
    } catch {
      // silently fail on initial load — user may not have any conversions yet
    } finally {
      clearTimeout(slowTimer);
      setSlowLoad(false);
      setLoading(false);
    }
  }, []);

  const handleDialogOpenChange = (v: boolean) => {
    setDialogOpen(v);
    if (!v) setPendingFile(null);
  };

  const handlePageDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setPageDragActive(true);
  };

  const handlePageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setPageDragActive(false);
  };

  const handlePageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setPageDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setPendingFile(file);
      setDialogOpen(true);
    }
  };

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
    <div
      className="flex min-h-screen flex-col bg-background"
      onDragEnter={handlePageDragEnter}
      onDragLeave={handlePageDragLeave}
      onDragOver={handlePageDragOver}
      onDrop={handlePageDrop}
    >
      {pageDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white/20 px-16 py-12">
            <FileUp className="h-8 w-8 text-white/60" />
            <p className="text-base font-medium text-white/70">Drop to convert</p>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-3">
            {quota && quota.used >= 7 && (
              <div className={`flex items-center gap-1.5 text-xs ${quota.used >= quota.limit ? "text-red-400" : "text-amber-400"}`}>
                <AlertTriangle className="h-3.5 w-3.5" />
                {quota.used >= quota.limit
                  ? "Daily limit reached — resets tomorrow"
                  : `${quota.used} of ${quota.limit} uploads used today`}
              </div>
            )}
            <UploadDialog
              open={dialogOpen}
              onOpenChange={handleDialogOpenChange}
              initialFile={pendingFile}
              onConversionComplete={loadConversions}
            />
          </div>
        </div>

        <ConversionTable conversions={conversions} loading={loading} slowLoad={slowLoad} onDelete={loadConversions} />

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
