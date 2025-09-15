import { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

import { UploadCloud, Loader2, FileText, XCircle, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "./components/mode-toggle";
import { Separator } from "./components/ui/separator";
import { ScrollArea, ScrollBar } from "./components/ui/scroll-area";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const APP_NAME = "PDFsnap";
type ImageFormat = "image/png" | "image/jpeg";
type ImageScale = 2 | 4 | 8;

type FileWithPreview = {
  file: File;
  id: string;
  previewUrl: string | null;
};

type ProgressState = {
  currentFileNumber: number;
  totalFiles: number;
  currentFileName: string;
  currentPage: number;
  totalPages: number;
  isZipping: boolean;
};

interface OptionsProps {
  zipFileName: string;
  onZipFileNameChange: (name: string) => void;
  imageFormat: ImageFormat;
  onImageFormatChange: (format: ImageFormat) => void;
  imageScale: ImageScale;
  onImageScaleChange: (scale: ImageScale) => void;
  isConverting: boolean;
}
interface DropZoneProps {
  onClick: () => void;
  setSelectedFiles: React.Dispatch<React.SetStateAction<FileWithPreview[]>>;
}
interface FileQueueProps {
  files: FileWithPreview[];
  onRemoveFile: (id: string) => void;
  isConverting: boolean;
}
interface ConversionStatusProps {
  progress: ProgressState;
}

function Options({
  zipFileName,
  onZipFileNameChange,
  imageFormat,
  onImageFormatChange,
  imageScale,
  onImageScaleChange,
  isConverting,
}: OptionsProps) {
  return (
    <div className="flex flex-wrap w-full gap-4 mb-6">
      <div className="space-y-2 w-full">
        <Label htmlFor="zip-name">Nome do arquivo final</Label>
        <div className="flex gap-1 items-center">
          <Input
            id="zip-name"
            value={zipFileName}
            onChange={(e) => onZipFileNameChange(e.target.value)}
            placeholder="ex: imagens_convertidas"
            disabled={isConverting}
          />
          <span className="text-sm text-muted-foreground">.zip</span>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="image-format">Formato (Saída)</Label>
        <Select
          value={imageFormat}
          onValueChange={(value: ImageFormat) => onImageFormatChange(value)}
          disabled={isConverting}
        >
          <SelectTrigger id="image-format">
            <SelectValue placeholder="Selecione o formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image/png">PNG</SelectItem>
            <SelectItem value="image/jpeg">JPG</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="image-quality">Qualidade</Label>
        <Select
          value={String(imageScale)}
          onValueChange={(value) =>
            onImageScaleChange(Number(value) as ImageScale)
          }
          disabled={isConverting}
        >
          <SelectTrigger id="image-quality">
            <SelectValue placeholder="Selecione a qualidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2x (Alta)</SelectItem>
            <SelectItem value="4">4x (Muito Alta)</SelectItem>
            <SelectItem value="8">8x (Ultra)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DropZone({ onClick, setSelectedFiles }: DropZoneProps) {
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

function FileQueue({ files, onRemoveFile, isConverting }: FileQueueProps) {
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

function ConversionStatus({ progress }: ConversionStatusProps) {
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

export default function App() {
  const [zipFileName, setZipFileName] = useState("pdfsnap");
  const [imageFormat, setImageFormat] = useState<ImageFormat>("image/png");
  const [imageScale, setImageScale] = useState<ImageScale>(2);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<ProgressState>({
    currentFileNumber: 0,
    totalFiles: 0,
    currentFileName: "",
    currentPage: 0,
    totalPages: 0,
    isZipping: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      selectedFiles.forEach(
        (file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)
      );
    };
  }, [selectedFiles]);

  const generateThumbnail = async (fileWithPreview: FileWithPreview) => {
    try {
      const arrayBuffer = await fileWithPreview.file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer))
        .promise;
      const page = await pdf.getPage(1);

      const THUMBNAIL_WIDTH = 100;
      const viewport = page.getViewport({ scale: 1 });
      const scale = THUMBNAIL_WIDTH / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const context = canvas.getContext("2d");

      if (!context) return;

      await page.render({
        canvasContext: context,
        viewport: scaledViewport,
        canvas: canvas,
      }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7)
      );
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setSelectedFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.id === fileWithPreview.id ? { ...f, previewUrl: url } : f
        )
      );
    } catch (error) {
      console.error(
        `Falha ao gerar miniatura para ${fileWithPreview.file.name}:`,
        error
      );
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFilesWithPreview = Array.from(files)
        .filter(
          (newFile) =>
            !selectedFiles.some(
              (existingFile) => existingFile.file.name === newFile.name
            )
        )
        .map((file) => ({
          file,
          id: `${file.name}-${file.lastModified}`,
          previewUrl: null,
        }));

      newFilesWithPreview.forEach(generateThumbnail);
      setSelectedFiles((prevFiles) => [...prevFiles, ...newFilesWithPreview]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (idToRemove: string) => {
    const fileToRemove = selectedFiles.find((f) => f.id === idToRemove);
    if (fileToRemove && fileToRemove.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl);
    }
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file.id !== idToRemove)
    );
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) {
      toast.warning("Nenhum arquivo selecionado.");
      return;
    }

    setIsConverting(true);
    const toastId = toast.loading("Iniciando a conversão...");
    const zip = new JSZip();

    try {
      for (const [index, fileWithPreview] of selectedFiles.entries()) {
        const currentFileNumber = index + 1;
        setConversionProgress({
          currentFileNumber,
          totalFiles: selectedFiles.length,
          currentFileName: fileWithPreview.file.name,
          currentPage: 0,
          totalPages: 0,
          isZipping: false,
        });

        toast.loading(
          `Processando arquivo ${currentFileNumber}/${selectedFiles.length}: ${fileWithPreview.file.name}`,
          { id: toastId }
        );

        const folderName = fileWithPreview.file.name.replace(/\.pdf$/i, "");
        const pdfFolder = zip.folder(folderName);
        if (!pdfFolder)
          throw new Error("Não foi possível criar a pasta no ZIP.");

        const arrayBuffer = await fileWithPreview.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer))
          .promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          setConversionProgress((prev) => ({
            ...prev,
            currentPage: i,
            totalPages: pdf.numPages,
          }));

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: imageScale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");

          if (!context) continue;

          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          }).promise;

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, imageFormat)
          );

          if (blob) {
            const fileExtension = imageFormat === "image/png" ? "png" : "jpg";
            pdfFolder.file(`pagina_${i}.${fileExtension}`, blob);
          }
        }
      }

      setConversionProgress((prev) => ({ ...prev, isZipping: true }));
      toast.loading("Finalizando o arquivo ZIP...", { id: toastId });
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${zipFileName || "download"}.zip`);

      toast.success("Conversão concluída com sucesso!", {
        id: toastId,
        duration: 5000,
      });
    } catch (error) {
      console.error("Erro durante a conversão:", error);
      toast.error("A conversão falhou.", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsConverting(false);
      selectedFiles.forEach(
        (file) => file.previewUrl && URL.revokeObjectURL(file.previewUrl)
      );
      setSelectedFiles([]);
    }
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex min-h-svh flex-col items-center justify-between p-4 sm:p-6 bg-background text-foreground">
        <Toaster richColors theme="dark" position="top-right" />

        <header className="w-full max-w-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="icon.png" alt="Logo do PDFsnap" className="h-8 sm:h-10" />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {APP_NAME}
            </h1>
          </div>
          <ModeToggle />
        </header>

        <main className="w-full flex-grow flex items-center justify-center py-8">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl sm:text-3xl font-extrabold">
                Converter PDF para Imagens
              </CardTitle>
              <CardDescription className="pt-2">
                Selecione os arquivos, escolha as configurações de saída e
                converta em pastas de imagens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isConverting ? (
                <ConversionStatus progress={conversionProgress} />
              ) : (
                <>
                  <DropZone
                    onClick={triggerFileInput}
                    setSelectedFiles={setSelectedFiles}
                  />
                  <FileQueue
                    files={selectedFiles}
                    onRemoveFile={handleRemoveFile}
                    isConverting={isConverting}
                  />
                </>
              )}
            </CardContent>
            <Separator />
            <CardFooter className="flex flex-col gap-3">
              <input
                type="file"
                accept=".pdf,application/pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
                multiple
              />

              <Options
                zipFileName={zipFileName}
                onZipFileNameChange={setZipFileName}
                imageFormat={imageFormat}
                onImageFormatChange={setImageFormat}
                imageScale={imageScale}
                onImageScaleChange={setImageScale}
                isConverting={isConverting}
              />
              <Button
                className="w-full"
                size="lg"
                onClick={handleConvert}
                disabled={isConverting || selectedFiles.length === 0}
              >
                {isConverting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                Converter{" "}
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} Arquivo(s)`
                  : ""}
              </Button>
            </CardFooter>
          </Card>
        </main>

        <footer className="w-full max-w-2xl text-center text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            Created by
            <a
              href="http://github.com/jefersonapps"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Github size={14} /> Jeferson Leite
            </a>
            .
          </p>
        </footer>
      </div>
    </ThemeProvider>
  );
}
