import type { ProgressState } from "@/App";

interface ConversionStatusProps {
  progress: ProgressState;
}

export function ConversionStatus({ progress }: ConversionStatusProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center py-8">
      <p className="font-medium">
        {progress.isZipping
          ? "Compactando arquivos..."
          : "Convertendo... por favor, aguarde."}
      </p>
      <p className="text-sm text-muted-foreground">
        {progress.isZipping
          ? "Esta etapa pode levar um momento para arquivos grandes."
          : `Arquivo ${progress.currentFileNumber} de ${progress.totalFiles}: "${progress.currentFileName}"\nProcessando página ${progress.currentPage} de ${progress.totalPages}`}
      </p>
    </div>
  );
}
