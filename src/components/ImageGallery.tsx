import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Download, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface SavedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

interface ImageGalleryProps {
  onImageSelect?: (imageUrl: string) => void;
}

export const ImageGallery = ({ onImageSelect }: ImageGalleryProps) => {
  const [images, setImages] = useState<SavedImage[]>([]);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = () => {
    try {
      const saved = localStorage.getItem("astra_images");
      if (saved) {
        const parsed = JSON.parse(saved);
        setImages(parsed.map((img: any) => ({
          ...img,
          timestamp: new Date(img.timestamp)
        })));
      }
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  };

  const saveImage = (url: string, prompt: string) => {
    const newImage: SavedImage = {
      id: Date.now().toString(),
      url,
      prompt,
      timestamp: new Date(),
    };
    const updated = [newImage, ...images].slice(0, 50); // Keep last 50 images
    setImages(updated);
    localStorage.setItem("astra_images", JSON.stringify(updated));
    toast.success("Image saved to gallery");
  };

  const deleteImage = (id: string) => {
    const updated = images.filter((img) => img.id !== id);
    setImages(updated);
    localStorage.setItem("astra_images", JSON.stringify(updated));
    toast.success("Image deleted");
  };

  const downloadImage = async (url: string, prompt: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `astra-${prompt.slice(0, 20)}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  // Expose save function for parent components
  useEffect(() => {
    (window as any).saveToGallery = saveImage;
  }, [images]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <ImageIcon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Image Gallery</h3>
        <span className="text-xs text-muted-foreground">({images.length})</span>
      </div>

      <ScrollArea className="h-[500px]">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No images yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border border-border hover:border-primary transition-all cursor-pointer"
                onClick={() => onImageSelect?.(image.url)}
              >
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(image.url, image.prompt);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(image.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-2 bg-card">
                  <p className="text-xs text-muted-foreground truncate">
                    {image.prompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
