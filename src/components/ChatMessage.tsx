import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Brain, User, Code, PenTool, Calculator, BookOpen } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  agent?: string;
}

const getAgentIcon = (agent?: string) => {
  if (!agent) return <Brain className="w-4 h-4" />;
  
  if (agent.toLowerCase().includes("math")) return <Calculator className="w-4 h-4" />;
  if (agent.toLowerCase().includes("writing")) return <PenTool className="w-4 h-4" />;
  if (agent.toLowerCase().includes("coding")) return <Code className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
};

const getAgentColor = (agent?: string) => {
  if (!agent) return "bg-primary";
  
  if (agent.toLowerCase().includes("math")) return "bg-accent";
  if (agent.toLowerCase().includes("writing")) return "bg-primary-light";
  if (agent.toLowerCase().includes("coding")) return "bg-primary-dark";
  return "bg-primary";
};

export const ChatMessage = ({ role, content, agent }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className={`w-8 h-8 ${isUser ? "bg-muted" : getAgentColor(agent)}`}>
        <AvatarFallback className={isUser ? "text-foreground" : "text-white"}>
          {isUser ? <User className="w-4 h-4" /> : getAgentIcon(agent)}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : ""}`}>
        {!isUser && agent && (
          <span className="text-xs font-medium text-muted-foreground">{agent}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm transition-smooth ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
};
