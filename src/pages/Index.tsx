import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { VoiceControls } from "@/components/VoiceControls";
import { FileUpload } from "@/components/FileUpload";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ImageGenerator } from "@/components/ImageGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

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
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Homework Helper 24/7
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your AI-powered study assistant
          </p>
        </header>

        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Image
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-6 shadow-lg">
                      <span className="text-4xl">🧠</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-3">
                      Welcome to Homework Helper!
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-8">
                      Ask me anything about math, writing, coding, or research. I'm here to help you learn 24/7!
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-2xl">
                      {[
                        { icon: "📐", text: "Help with math problems" },
                        { icon: "✍️", text: "Writing assistance" },
                        { icon: "💻", text: "Coding questions" },
                        { icon: "📚", text: "Research topics" },
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
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <ChatMessage key={index} {...message} />
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                  </>
                )}
                <div ref={scrollRef} />
              </TabsContent>

              <TabsContent value="image" className="space-y-6">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-2xl font-bold">Generate Educational Images</h3>
                    <p className="text-muted-foreground">
                      Create diagrams, illustrations, or visual aids for your studies
                    </p>
                  </div>
                  <ImageGenerator />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <div className="border-t border-border bg-card/80 backdrop-blur-xl p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex gap-2">
            <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
            
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask me anything..."
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
