import { useRef, useState, useEffect } from "react";
import { saveAs } from "file-saver";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

import { Loader2, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Options } from "./components/options";
import { DropZone } from "./components/dropzone";
import { FileQueue } from "./components/file-queue";
import { ConversionStatus } from "./components/conversion-status";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

const APP_NAME = "PDFsnap";
export type ImageFormat = "image/png" | "image/jpeg";
export type ImageScale = 2 | 4 | 8;

export type FileWithPreview = {
  file: File;
  id: string;
  previewUrl: string | null;
};

export type ProgressState = {
  currentFileNumber: number;
  totalFiles: number;
  currentFileName: string;
  currentPage: number;
  totalPages: number;
  isZipping: boolean;
};

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
