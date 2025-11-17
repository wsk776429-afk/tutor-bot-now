import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Loader2, Sparkles, Download, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "./ui/card";

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  date: string;
  quality: string;
}

interface ImageGeneratorProps {
  onImageGenerated?: (imageUrl: string) => void;
}

export const ImageGenerator = ({ onImageGenerated }: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [quality, setQuality] = useState<"low" | "medium" | "high" | "ultra">("high");
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("image_gen_history");
      if (raw) setImages(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to parse image history", e);
    }
  }, []);

  // Save to localStorage whenever images change
  useEffect(() => {
    localStorage.setItem("image_gen_history", JSON.stringify(images));
  }, [images]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for the image");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: prompt.trim(), quality },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const newImage: GeneratedImage = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          prompt: prompt.trim(),
          imageUrl: data.imageUrl,
          date: new Date().toISOString(),
          quality,
        };
        setImages((prev) => [newImage, ...prev].slice(0, 100));
        onImageGenerated?.(data.imageUrl);
        toast.success("Image generated successfully!");
        setPrompt("");
      } else {
        throw new Error("No image URL returned");
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    const a = document.createElement("a");
    a.download = `image-${image.id}.png`;
    a.href = image.imageUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Image downloaded!");
  };

  const deleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.success("Image deleted from history");
  };

  const clearHistory = () => {
    if (confirm("Clear all generation history?")) {
      setImages([]);
      localStorage.removeItem("image_gen_history");
      toast.success("History cleared");
    }
  };

  // Filter images based on search query
  const filteredImages = images.filter((img) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      img.prompt.toLowerCase().includes(query) ||
      img.quality.toLowerCase().includes(query) ||
      img.date.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Generate New Image</h2>
        <div className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want (e.g. 'A cinematic portrait in golden hour, shallow depth of field, photorealistic')"
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
          
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="bg-gradient-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>

            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              className="px-4 py-2 rounded-md border border-input bg-background"
              disabled={isGenerating}
            >
              <option value="low">Low Quality (Fast)</option>
              <option value="medium">Medium Quality</option>
              <option value="high">High Quality</option>
              <option value="ultra">Ultra Quality (Slow)</option>
            </select>

            <Button
              variant="outline"
              onClick={() => setPrompt("")}
              disabled={isGenerating}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Search & History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Generated Images ({filteredImages.length})</h2>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            Clear History
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by prompt, quality, or date..."
            className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background"
          />
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredImages.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="h-48 flex items-center justify-center bg-muted">
                <img
                  src={img.imageUrl}
                  alt={img.prompt}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium line-clamp-2">{img.prompt}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{img.quality}</span>
                  <span>•</span>
                  <span>{new Date(img.date).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadImage(img)}
                    className="flex-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteImage(img.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {images.length === 0
              ? "No images generated yet. Create your first image above!"
              : "No images match your search."}
          </div>
        )}
      </Card>
    </div>
  );
};
