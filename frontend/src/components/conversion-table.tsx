"use client";

import { useState } from "react";
import {
  FileText,
  FileDown,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Conversion, getDownloadUrl, deleteConversion } from "@/lib/api";
import { toast } from "sonner";

type ConversionStatus = "completed" | "processing" | "failed";

const statusConfig: Record<
  ConversionStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  completed: {
    label: "Completed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
  },
  processing: {
    label: "Processing",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className:
      "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10",
  },
  failed: {
    label: "Failed",
    icon: <XCircle className="h-3 w-3" />,
    className:
      "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/10",
  },
};

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

async function handleDownload(conversionId: string, fileType: "pdf" | "docx") {
  try {
    const { url } = await getDownloadUrl(conversionId, fileType);
    window.open(url, "_blank");
  } catch (err) {
    toast.error("Download failed", {
      description: err instanceof Error ? err.message : "Could not generate download link.",
    });
  }
}

interface ConversionTableProps {
  conversions: Conversion[];
  loading: boolean;
  slowLoad?: boolean;
  onDelete: () => void;
}

export function ConversionTable({
  conversions,
  loading,
  slowLoad,
  onDelete,
}: ConversionTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteConversion(confirmDeleteId);
      setConfirmDeleteId(null);
      onDelete();
    } catch (err) {
      toast.error("Delete failed", {
        description: err instanceof Error ? err.message : "Could not delete conversion.",
      });
    } finally {
      setDeleting(false);
    }
  };
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-card py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        {slowLoad && (
          <div className="flex flex-col items-center gap-1 animate-in fade-in duration-500">
            <p className="text-sm text-muted-foreground">Waking up the server...</p>
            <p className="text-xs text-muted-foreground/60">This can take up to 30 seconds on first visit</p>
          </div>
        )}
      </div>
    );
  }

  if (conversions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/50 bg-card py-20">
        <FileText className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No conversions yet</p>
        <p className="text-xs text-muted-foreground/60">
          Upload a PDF to get started
        </p>
      </div>
    );
  }

  return (
    <>
    <Dialog open={!!confirmDeleteId} onOpenChange={(v) => { if (!v && !deleting) setConfirmDeleteId(null); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete conversion?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete the file and its converted output. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <div className="rounded-xl border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-[40%] pl-5 text-xs font-medium text-muted-foreground">
              File
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Size
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground">
              Date
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground">
              Download
            </TableHead>
            <TableHead className="w-10 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversions.map((conversion) => {
            const status = statusConfig[conversion.status];
            return (
              <TableRow
                key={conversion.id}
                className="border-border/50 transition-colors"
              >
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                      <FileText className="h-4 w-4 text-red-400" />
                    </div>
                    <span className="truncate text-sm font-medium text-foreground" title={conversion.original_filename}>
                      {conversion.original_filename}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`gap-1 text-[11px] font-normal ${status.className}`}
                  >
                    {status.icon}
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatSize(conversion.file_size_bytes)}
                  </span>
                </TableCell>
                <TableCell>
                  <div
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    title={new Date(conversion.created_at).toLocaleString()}
                  >
                    <Clock className="h-3 w-3" />
                    {formatDate(conversion.created_at)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                      disabled={conversion.status !== "completed"}
                      onClick={() => handleDownload(conversion.id, "pdf")}
                    >
                      <FileText className="h-3 w-3 text-red-400" />
                      PDF
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
                      disabled={conversion.status !== "completed"}
                      onClick={() => handleDownload(conversion.id, "docx")}
                    >
                      <FileDown className="h-3 w-3 text-blue-400" />
                      DOCX
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="pr-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 rounded-md p-0 text-muted-foreground/40 hover:text-red-400"
                    onClick={() => setConfirmDeleteId(conversion.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
