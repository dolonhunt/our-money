"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/overlay";
import { NeuButton } from "@/components/ui/primitives";
import {
  Download,
  ExternalLink,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  FileText,
} from "lucide-react";

interface ReceiptPreviewModalProps {
  open: boolean;
  onClose: () => void;
  url: string | null;
  title?: string;
  onDelete?: () => void;
  readOnly?: boolean;
}

export function ReceiptPreviewModal({
  open,
  onClose,
  url,
  title = "Receipt Attachment",
  onDelete,
  readOnly = false,
}: ReceiptPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!url) return null;

  const isPdf = url.toLowerCase().includes(".pdf") || url.startsWith("data:application/pdf");

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="flex flex-col gap-3">
        {/* Controls toolbar */}
        <div className="neu-card flex flex-wrap items-center justify-between gap-2 p-2.5">
          {!isPdf && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleZoomIn}
                className="neu-btn !p-2 !rounded-xl text-sub hover:text-ink"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="neu-btn !p-2 !rounded-xl text-sub hover:text-ink"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="neu-btn !p-2 !rounded-xl text-sub hover:text-ink"
                title="Rotate"
                aria-label="Rotate"
              >
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="neu-btn !px-2.5 !py-1 text-xs text-sub hover:text-ink"
                title="Reset View"
              >
                {Math.round(zoom * 100)}%
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="neu-btn !px-3 !py-1.5 text-xs flex items-center gap-1.5 text-sub hover:text-ink"
            >
              <ExternalLink size={14} /> Open original
            </a>
            <a
              href={url}
              download="receipt"
              target="_blank"
              rel="noopener noreferrer"
              className="neu-btn !px-3 !py-1.5 text-xs flex items-center gap-1.5 text-sub hover:text-ink"
            >
              <Download size={14} /> Download
            </a>
            {!readOnly && onDelete && (
              <NeuButton
                size="sm"
                variant="danger"
                className="!px-3 !py-1.5 text-xs"
                onClick={() => {
                  if (confirm("Are you sure you want to remove this receipt?")) {
                    onDelete();
                    onClose();
                  }
                }}
              >
                <Trash2 size={14} /> Remove
              </NeuButton>
            )}
          </div>
        </div>

        {/* Viewport container */}
        <div className="neu-inset relative flex items-center justify-center min-h-[320px] max-h-[60vh] overflow-auto rounded-2xl p-4 bg-[rgba(38,50,56,0.03)]">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 w-full">
              <FileText size={48} className="text-peach" />
              <div className="text-center">
                <p className="font-semibold text-ink text-sm">PDF Document Attached</p>
                <p className="text-xs text-sub mt-1">This attachment is a PDF document.</p>
              </div>
              <iframe
                src={url}
                className="w-full h-[380px] rounded-xl border border-[var(--c-border)] shadow-sm"
                title="Receipt PDF"
              />
            </div>
          ) : (
            <div
              className="transition-transform duration-200 ease-out origin-center flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Receipt"
                className="max-h-[50vh] max-w-full rounded-xl object-contain shadow-md"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
