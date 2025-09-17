import type { ImageFormat, ImageScale } from "@/App";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface OptionsProps {
  zipFileName: string;
  onZipFileNameChange: (name: string) => void;
  imageFormat: ImageFormat;
  onImageFormatChange: (format: ImageFormat) => void;
  imageScale: ImageScale;
  onImageScaleChange: (scale: ImageScale) => void;
  isConverting: boolean;
}

export function Options({
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
