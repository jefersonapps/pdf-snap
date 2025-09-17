import type { FileWithPreview } from "@/App";
import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DropZoneProps {
  onClick: () => void;
  setSelectedFiles: React.Dispatch<React.SetStateAction<FileWithPreview[]>>;
}

export function DropZone({ onClick, setSelectedFiles }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files);
    const pdfFiles = files.filter((file) => file.type === "application/pdf");
    const invalidFiles = files.filter(
      (file) => file.type !== "application/pdf"
    );

    invalidFiles.forEach((file) => {
      const [name, extension] = file.name.split(/\.(?=[^.]+$)/);
      toast.error(`${name}.${extension} não é um tipo válido.`);
    });

    if (pdfFiles.length > 0) {
      setSelectedFiles((prevFiles) => {
        const newFilesWithPreview = pdfFiles
          .filter(
            (newFile) =>
              !prevFiles.some(
                (existingFile) => existingFile.file.name === newFile.name
              )
          )
          .map((file) => ({
            file,
            id: `${file.name}-${file.lastModified}`,
            previewUrl: null,
          }));
        return [...prevFiles, ...newFilesWithPreview];
      });
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
        isDragging
          ? "scale-105 border-primary bg-muted/50"
          : "border-border bg-muted/20 hover:border-primary hover:bg-muted/50"
      }`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">
        Arraste e solte os arquivos PDF aqui ou{" "}
        <span className="font-semibold text-primary">clique para procurar</span>
      </p>
    </div>
  );
}
