import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
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

    console.log("Using agent:", agent);

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    console.log("Response generated successfully");

    return new Response(
      JSON.stringify({ agent, reply }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
