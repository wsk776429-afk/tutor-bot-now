import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  isListening: boolean;
  voiceEnabled: boolean;
  onToggleListening: () => void;
  onToggleVoice: () => void;
}

export const VoiceControls = ({
  isListening,
  voiceEnabled,
  onToggleListening,
  onToggleVoice,
}: VoiceControlsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleListening}
        className={cn(
          "transition-smooth",
          isListening && "bg-accent text-accent-foreground hover:bg-accent/90"
        )}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleVoice}
        className={cn(
          "transition-smooth",
          voiceEnabled && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
      >
        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </Button>
    </div>
  );
};
