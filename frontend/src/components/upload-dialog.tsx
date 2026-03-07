"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, FileUp, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadPdf } from "@/lib/api";
import { toast } from "sonner";

interface UploadDialogProps {
  onConversionComplete: () => void;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialFile?: File | null;
}

export function UploadDialog({ onConversionComplete, open, onOpenChange, initialFile }: UploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) setSelectedFile(initialFile);
  }, [initialFile]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const result = await uploadPdf(selectedFile);
      if (result.status === "completed") {
        toast.success("Conversion complete", {
          description: `${result.original_filename} has been converted.`,
        });
      } else if (result.status === "failed") {
        toast.error("Conversion failed", {
          description: result.error_message || "An unknown error occurred.",
        });
      }
      onConversionComplete();
      onOpenChange(false);
      setSelectedFile(null);
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!uploading) {
          onOpenChange(v);
          if (!v) setSelectedFile(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
          <Upload className="h-3.5 w-3.5" />
          New Conversion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert PDF to Word</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                dragActive
                  ? "border-white/40 bg-white/5"
                  : "border-border hover:border-white/20 hover:bg-white/[0.02]"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <FileUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop your PDF here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Maximum file size: 25 MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-accent/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <FileUp className="h-4 w-4 text-red-400" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="break-all text-sm font-medium leading-snug text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(selectedFile.size)}
                </p>
              </div>
              {!uploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <Button
            disabled={!selectedFile || uploading}
            className="w-full rounded-lg"
            onClick={handleConvert}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              "Convert to Word"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
