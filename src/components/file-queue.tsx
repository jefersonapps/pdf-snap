import type { FileWithPreview } from "@/App";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { FileText, XCircle } from "lucide-react";

interface FileQueueProps {
  files: FileWithPreview[];
  onRemoveFile: (id: string) => void;
  isConverting: boolean;
}

export function FileQueue({
  files,
  onRemoveFile,
  isConverting,
}: FileQueueProps) {
  if (files.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Fila de Arquivos ({files.length})
      </h3>
      <div className="flex pb-2">
        <ScrollArea className="w-full rounded-md border whitespace-nowrap">
          <div className="flex w-max space-x-3 p-3">
            {files.map((fileWithPreview) => (
              <div
                key={fileWithPreview.id}
                className="flex-shrink-0 flex items-center gap-2 bg-muted border border-border p-2 rounded-md w-52"
              >
                {fileWithPreview.previewUrl ? (
                  <img
                    src={fileWithPreview.previewUrl}
                    alt={`Preview of ${fileWithPreview.file.name}`}
                    className="h-8 w-8 object-cover rounded-sm flex-shrink-0"
                  />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <p
                  className="text-sm truncate flex-grow"
                  title={fileWithPreview.file.name}
                >
                  {fileWithPreview.file.name}
                </p>
                <button
                  onClick={() => onRemoveFile(fileWithPreview.id)}
                  disabled={isConverting}
                  aria-label={`Remover ${fileWithPreview.file.name}`}
                >
                  <XCircle className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors" />
                </button>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
