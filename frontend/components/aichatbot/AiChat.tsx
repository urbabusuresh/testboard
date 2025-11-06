"use client";
import React, { useState, useRef, useEffect } from "react";

type Message = { 
  role: "user" | "assistant"; 
  text: string;
  structured?: boolean; 
  title?: string; 
  steps?: string; 
  expected?: string;
  isTyping?: boolean;
};

function renderStyledText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <b key={i}>{part.slice(2, -2)}</b>
      : part.startsWith("*") && part.endsWith("*")
        ? <span key={i} className="text-purple-800 font-serif border-b border-dotted border-purple-300">{part.slice(1, -1)}</span>
        : <span key={i}>{part}</span>
  );
}

export default function AiChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [mode, setMode] = useState<"testcase" | "normal" | "rephrase">("testcase");
  const controllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // === Auto-scroll to latest message ===
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // === Dynamic textarea height ===
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  function parseTestCase(text: string) {
    const testCases = [];
    const testCaseBlocks = text.split(/(?=Test Case|Title[:\-])/i);
    for (const block of testCaseBlocks) {
      if (!block.trim()) continue;
      const titleMatch = block.match(/(?:Test Case\s*\d*[:\-]\s*)?Title[:\-]\s*(.*?)(?=\n|Steps|Expected|$)/i);
      const stepsMatch = block.match(/Steps[:\-]\s*([\s\S]*?)(?=Expected Result|Test Case|Title|$)/i);
      const expectedMatch = block.match(/Expected Result[:\-]\s*([\s\S]*?)(?=Test Case|Title|$)/i);
      testCases.push({
        title: titleMatch?.[1]?.trim() || "Untitled Test Case",
        steps: stepsMatch?.[1]?.trim() || "",
        expected: expectedMatch?.[1]?.trim() || "",
      });
    }
    return testCases.length > 0
      ? testCases
      : [{ title: "Test Case", steps: text, expected: "" }];
  }

  async function send() {
    if (!input.trim()) return;

    const userInput = input;
    const userMessage: Message = { role: "user", text: userInput, isTyping: false };
    setMessages(m => [...m, userMessage]);
    setInput("");
    setLoading(true);

    const promptMap: Record<typeof mode, string> = {
      testcase: `Generate 2-3 detailed manual test cases for: "${userInput}". For each test case, use this format:
Test Case X:
Title: [clear title]
Steps: [numbered steps]
Expected Result: [expected outcome]

Make each test case distinct and comprehensive.`,
      normal: userInput,
      rephrase: `Rephrase the following text clearly and professionally: ${userInput}`,
    };
    const prompt = promptMap[mode];

    const controller = new AbortController();
    controllerRef.current = controller;

    const assistantMessage: Message = { role: "assistant", text: "", isTyping: true };
    setMessages(m => [...m, assistantMessage]);
    const assistantMessageIndex = messages.length + 1;

    try {
      const res = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:latest",
          prompt,
          stream: streamEnabled,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      // === STREAMING MODE ===
      if (streamEnabled && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";

        (async function processStream() {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const data = JSON.parse(line);
                  if (data.response) {
                    fullResponse += data.response;

                    setMessages(prev => {
                      const newMessages = [...prev];
                      if (newMessages[assistantMessageIndex]) {
                        let updated = {
                          ...newMessages[assistantMessageIndex],
                          text: fullResponse,
                          isTyping: true,
                        };
                        if (mode === "testcase") {
                          const tests = parseTestCase(fullResponse);
                          if (tests.length > 0) {
                            updated = {
                              ...updated,
                              structured: true,
                              title: tests[0].title,
                              steps: tests[0].steps,
                              expected: tests[0].expected,
                            };
                          }
                        }
                        newMessages[assistantMessageIndex] = updated;
                      }
                      return newMessages;
                    });

                    // 🔹 Force flush UI to show streaming text
                    await new Promise(r => setTimeout(r, 1));
                  }
                } catch (e) {
                  console.warn("Bad JSON line:", line);
                }
              }
            }
          } catch (err) {
            console.error("Stream error:", err);
          } finally {
            setMessages(prev => {
              const newMessages = [...prev];
              if (newMessages[assistantMessageIndex])
                newMessages[assistantMessageIndex].isTyping = false;
              return newMessages;
            });
            setLoading(false);
            controllerRef.current = null;
          }
        })();
      } 
      // === NON-STREAM MODE ===
      else {
        const data = await res.json();
        const text = data.response || data.text || "";

        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[assistantMessageIndex]) {
            let updated: Message = { ...newMessages[assistantMessageIndex], text, isTyping: false };
            if (mode === "testcase") {
              const tests = parseTestCase(text);
              if (tests.length > 0) {
                updated = {
                  ...updated,
                  structured: true,
                  title: tests[0].title,
                  steps: tests[0].steps,
                  expected: tests[0].expected,
                };
              }
            }
            newMessages[assistantMessageIndex] = updated;
          }
          return newMessages;
        });
        setLoading(false);
        controllerRef.current = null;
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[assistantMessageIndex]) {
          newMessages[assistantMessageIndex] = {
            role: "assistant",
            text:
              err.name === "AbortError"
                ? "[Streaming stopped]"
                : "Error: " + (err.message || "Failed to fetch response"),
            isTyping: false,
          };
        }
        return newMessages;
      });
      setLoading(false);
      controllerRef.current = null;
    }
  }

  function stopStream() {
    controllerRef.current?.abort();
    setLoading(false);
    setMessages(m => m.map(msg => ({ ...msg, isTyping: false })));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const TypingCursor = () => (
    <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse"></span>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="flex flex-wrap gap-3 p-4 items-center border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <h1 className="text-xl font-bold text-blue-600">AI Chat Assistant</h1>

        <select
          value={mode}
          onChange={e => setMode(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
          <option value="testcase">Test Case</option>
          <option value="normal">Chat</option>
          <option value="rephrase">Rephrase</option>
        </select>

        <label className="inline-flex items-center gap-2 text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-300">
          <input
            type="checkbox"
            checked={streamEnabled}
            onChange={e => setStreamEnabled(e.target.checked)}
            className="accent-blue-600 w-4 h-4"
          />
          Stream Response
        </label>

        {loading && (
          <button
            onClick={stopStream}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Stop
          </button>
        )}
      </div>

      {/* Messages */}
      <section className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-32">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg">Start a conversation or generate test cases!</p>
            <p className="text-sm mt-2">Use Test Case mode to create structured scenarios.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`relative max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm"
              }`}
            >
              <span
                className={`block mb-2 font-medium text-xs ${
                  m.role === "user" ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {m.role === "user" ? "You" : "AI Assistant"}
                {m.isTyping && <span className="ml-2 text-xs opacity-70">(typing...)</span>}
              </span>

              {m.structured ? (
                <div className="space-y-3 min-w-[300px]">
                  <div>
                    <div className="font-semibold text-blue-600 text-sm uppercase tracking-wide">Title</div>
                    <div className="pl-2 text-gray-700 mt-1">
                      {m.title}
                      {m.isTyping && <TypingCursor />}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600 text-sm uppercase tracking-wide">Steps</div>
                    <div className="pl-2 text-gray-700 mt-1 whitespace-pre-wrap">
                      {m.steps}
                      {m.isTyping && <TypingCursor />}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-600 text-sm uppercase tracking-wide">Expected Result</div>
                    <div className="pl-2 text-gray-700 mt-1 whitespace-pre-wrap">
                      {m.expected}
                      {m.isTyping && <TypingCursor />}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {renderStyledText(m.text)}
                  {m.isTyping && <TypingCursor />}
                </div>
              )}

              {m.role === "assistant" && m.text && !m.isTyping && (
                <button
                  onClick={() => copyToClipboard(m.text)}
                  title="Copy to clipboard"
                  className={`absolute top-2 right-2 transition-colors ${
                  (m.role as "user" | "assistant") === "user"

                      ? "text-blue-200 hover:text-white"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  ⧉
                </button>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </section>

      {/* Input */}
      <form
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg"
        onSubmit={e => {
          e.preventDefault();
          send();
        }}
      >
        <div className="max-w-6xl mx-auto flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all px-4 py-3 text-gray-800 resize-none pr-12"
              placeholder={
                mode === "testcase"
                  ? "Describe the feature or scenario..."
                  : mode === "rephrase"
                  ? "Enter text to rephrase..."
                  : "Type your message..."
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              disabled={loading}
              style={{ minHeight: "52px", maxHeight: "120px" }}
            />
          </div>

          <button
            type="submit"
            className={`px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold transition-all min-w-[80px] ${
              loading || !input.trim()
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5"
            }`}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
            ) : (
              "Send"
            )}
          </button>
        </div>

        <div className="text-xs text-gray-500 text-center mt-2">
          Press Enter to send, Shift+Enter for newline
        </div>
      </form>
    </div>
  );
}
