// /app/api/chat/route.ts (Next.js 14+)
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ✅ important to allow streaming

export async function POST(req: Request) {
  const { prompt, model } = await req.json();

  // Example: stream response from Ollama or mock AI
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const fakeResponse = `This is a streamed response for model ${model}. Let's show it word by word.`;
      for (const word of fakeResponse.split(" ")) {
        controller.enqueue(encoder.encode(word + " "));
        await new Promise(r => setTimeout(r, 80));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
