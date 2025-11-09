import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageGeneratorProps {
  onImageGenerated?: (imageUrl: string) => void;
}

export const ImageGenerator = ({ onImageGenerated }: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for the image");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        onImageGenerated?.(data.imageUrl);
        toast.success("Image generated successfully!");
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

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          onKeyDown={(e) => e.key === "Enter" && !isGenerating && handleGenerate()}
          disabled={isGenerating}
          className="flex-1"
        />
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
      </div>

      {generatedImage && (
        <div className="rounded-lg overflow-hidden border border-border shadow-lg">
          <img
            src={generatedImage}
            alt="Generated"
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
};
