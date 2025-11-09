import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { VoiceControls } from "@/components/VoiceControls";
import { FileUpload } from "@/components/FileUpload";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  agent?: string;
}

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([
    { id: "1", title: "New Chat", timestamp: new Date() },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("1");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Auto-detect if input looks like an image prompt
  const looksLikeImagePrompt = (text: string): boolean => {
    const lower = text.toLowerCase();
    const keywords = ["diagram", "illustration", "draw", "image", "picture", "sketch", "chart", "plot", "visualize"];
    return keywords.some(k => lower.includes(k)) || /^(diagram|illustration|draw|image):/i.test(text);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Auto-detect if this should be an image generation request
      if (looksLikeImagePrompt(messageText)) {
        await handleImageGeneration(messageText);
        return;
      }

      // Regular chat flow
      const { data, error } = await supabase.functions.invoke("homework-chat", {
        body: { 
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
        agent: data.agent,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speak(data.reply);

      // Update session title if it's the first message
      if (messages.length === 0) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId
              ? { ...s, title: messageText.slice(0, 30) + "..." }
              : s
          )
        );
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageGeneration = async (prompt: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt },
      });

      if (error) throw error;

      setGeneratedImage(data.imageUrl);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: `Generated an image based on: "${prompt}". Check the preview panel on the right!`,
        agent: "Image Generator",
      };
      setMessages((prev) => [...prev, assistantMessage]);

      toast({
        title: "Image generated!",
        description: "See the preview panel on the right",
      });
    } catch (error: any) {
      console.error("Image generation error:", error);
      
      const errorMessage: Message = {
        role: "assistant",
        content: `Failed to generate image. ${error.message || "Please try rephrasing your prompt."}`,
        agent: "Image Generator",
      };
      setMessages((prev) => [...prev, errorMessage]);

      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      toast({
        title: "Not supported",
        description: "Voice input is not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      toast({
        title: "Voice input error",
        description: "Could not recognize speech. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // For now, just show that file was uploaded
      // In production, you'd send this to the edge function
      toast({
        title: "File uploaded",
        description: `Processing ${file.name}...`,
      });

      const userMessage: Message = {
        role: "user",
        content: `[Uploaded file: ${file.name}]`,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Simulate processing
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content: `I've received your file "${file.name}". In the production version, I would extract text from it and help you with questions about its content.`,
          agent: "File Processing Agent",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error: any) {
      console.error("File upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      timestamp: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSessionId === sessionId && sessions.length > 1) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId);
      setCurrentSessionId(remainingSessions[0].id);
    }
  };

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" style={{ animationDelay: "4s" }} />
      </div>
      
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col relative z-10">
        <header className="border-b border-border bg-card/80 backdrop-blur-xl px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                AstraMind AI
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Unified chat + image generation for students
              </p>
            </div>
            <ThemeSwitcher />
          </div>
        </header>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            <div className="lg:col-span-2 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-lg">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold mb-3">
                    Welcome to AstraMind AI!
                  </h2>
                  <p className="text-muted-foreground max-w-md mb-8">
                    Your unified assistant for chat and image generation. Just type naturally - I'll auto-detect if you want an image or conversation!
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-2xl">
                    {[
                      { icon: "📐", text: "diagram: water cycle with labels" },
                      { icon: "💬", text: "Explain photosynthesis simply" },
                      { icon: "🎨", text: "illustration: neuron structure" },
                      { icon: "📚", text: "Help with algebra homework" },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(item.text)}
                        className="p-4 rounded-xl border border-border hover:border-primary hover:bg-muted/50 transition-smooth text-left"
                      >
                        <span className="text-2xl mb-2 block">{item.icon}</span>
                        <span className="text-sm font-medium">{item.text}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 p-4 rounded-lg bg-muted/50 max-w-xl">
                    <p className="text-xs text-muted-foreground">
                      <strong>💡 Tip:</strong> Start with "diagram:", "illustration:", or "draw:" for images. 
                      Regular questions trigger chat mode automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessage key={index} {...message} />
                  ))}
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                </>
              )}
              <div ref={scrollRef} />
            </div>

            <div className="lg:col-span-1">
              <Card className="p-4 sticky top-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Image Preview
                  </h3>
                </div>
                <div className="aspect-square rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden border border-border">
                  {generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Generated" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        No image yet. Try: "diagram: solar system with labels"
                      </p>
                    </div>
                  )}
                </div>
                {generatedImage && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = generatedImage;
                      a.download = "astramind-image.png";
                      a.click();
                    }}
                  >
                    Download Image
                  </Button>
                )}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs space-y-2">
                  <p className="font-medium">Quick examples:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• diagram: photosynthesis process</li>
                    <li>• illustration: atom structure</li>
                    <li>• draw: human heart labeled</li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card/80 backdrop-blur-xl p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex gap-2">
            <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
            
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask anything or request an image (e.g., 'diagram: water cycle')..."
              disabled={isLoading}
              className="flex-1 transition-smooth focus:ring-2 focus:ring-primary"
            />
            
            <VoiceControls
              isListening={isListening}
              voiceEnabled={voiceEnabled}
              onToggleListening={handleVoiceInput}
              onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
            />
            
            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
