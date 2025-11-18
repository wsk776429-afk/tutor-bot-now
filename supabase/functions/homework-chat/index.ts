import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_PAYLOAD_SIZE = 100000; // 100KB
const MAX_MESSAGES = 50;

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function log(level: string, requestId: string, message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    message,
    ...(data && { data }),
  };
  console.log(JSON.stringify(logEntry));
}

function validateMessages(messages: any): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array" };
  }
  
  if (messages.length === 0) {
    return { valid: false, error: "Messages array cannot be empty" };
  }
  
  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: `Too many messages (max ${MAX_MESSAGES})` };
  }
  
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return { valid: false, error: "Each message must have role and content" };
    }
    if (!["user", "assistant", "system"].includes(msg.role)) {
      return { valid: false, error: "Invalid message role" };
    }
    if (typeof msg.content !== "string") {
      return { valid: false, error: "Message content must be a string" };
    }
    if (msg.content.length > 10000) {
      return { valid: false, error: "Message content too long (max 10000 chars)" };
    }
  }
  
  return { valid: true };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  log("info", requestId, "Incoming request", { method: req.method });

  try {
    // Validate content-type
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      log("warn", requestId, "Invalid content-type", { contentType });
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check payload size
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      log("warn", requestId, "Payload too large", { contentLength });
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      log("error", requestId, "Invalid JSON payload");
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }


    const { messages } = body;

    // Validate messages
    const validation = validateMessages(messages);
    if (!validation.valid) {
      log("warn", requestId, "Validation failed", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log("info", requestId, "Request validated", { messageCount: messages.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      log("error", requestId, "LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the last user message to determine agent
    const lastMessage = messages[messages.length - 1]?.content || "";
    
    // Agent detection logic
    let agent = "General Research Agent";
    let systemPrompt = "You are a helpful educational assistant. Provide clear, accurate, and encouraging answers to help students learn.";

    if (/math|solve|equation|calculate|algebra|geometry|calculus/i.test(lastMessage)) {
      agent = "Math Agent 📐";
      systemPrompt = "You are a Math Agent. Help students understand mathematical concepts step-by-step. Show your work clearly and explain the reasoning behind each step.";
    } else if (/essay|grammar|write|writing|paragraph|sentence/i.test(lastMessage)) {
      agent = "Writing Agent ✍️";
      systemPrompt = "You are a Writing Agent. Help students improve their writing with constructive feedback, grammar tips, and structure suggestions. Be encouraging and specific.";
    } else if (/code|coding|bug|python|javascript|program|function|algorithm/i.test(lastMessage)) {
      agent = "Coding Agent 💻";
      systemPrompt = "You are a Coding Agent. Help students understand programming concepts, debug code, and write better solutions. Explain code clearly and suggest best practices.";
    } else {
      agent = "Research Agent 📚";
      systemPrompt = "You are a Research Agent. Help students explore topics, find reliable information, and understand complex subjects. Provide well-structured, educational responses.";
    }

    log("info", requestId, "Agent selected", { agent });

    // Call Lovable AI with timeout
    const response = await fetchWithTimeout(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
      REQUEST_TIMEOUT
    );

    if (!response.ok) {
      log("error", requestId, "AI gateway error", { 
        status: response.status,
        statusText: response.statusText 
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED"
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required. Please add credits to your workspace.",
            code: "PAYMENT_REQUIRED"
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      log("error", requestId, "AI gateway detailed error", { errorText });
      
      return new Response(
        JSON.stringify({ 
          error: "AI service error. Please try again.",
          code: "AI_SERVICE_ERROR"
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    log("info", requestId, "Response generated successfully", { 
      agent,
      replyLength: reply.length 
    });

    return new Response(
      JSON.stringify({ agent, reply }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    log("error", requestId, "Unhandled error", { 
      message: error?.message,
      stack: error?.stack 
    });

    // Handle specific error types
    if (error?.message === "Request timeout") {
      return new Response(
        JSON.stringify({ 
          error: "Request timed out. Please try again.",
          code: "TIMEOUT"
        }),
        {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        code: "INTERNAL_ERROR"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
