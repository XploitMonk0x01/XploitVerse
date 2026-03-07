import React, { useState, useRef, useEffect } from "react";
import {
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    MessageSquare,
    Lightbulb,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import api from "../../services/api";

const ChatWidget = ({ sessionId, labId, labName }) => {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: `👋 Hello! I'm your AI Cybersecurity Mentor. I'm here to help you with "${labName || "this lab"}". Ask me anything - I'll guide you without giving away the solution!`,
            timestamp: new Date().toISOString(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch suggestions on mount
    useEffect(() => {
        fetchSuggestions();
    }, [sessionId, labId]);

    const fetchSuggestions = async () => {
        try {
            const response = await api.get("/chat/suggestions", {
                params: { sessionId, labId },
            });
            setSuggestions(response.data.data.suggestions || []);
        } catch (err) {
            console.error("Failed to fetch suggestions:", err);
        }
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || isLoading) return;

        const userMessage = {
            role: "user",
            content: messageText.trim(),
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        try {
            // Build conversation history for context
            const conversationHistory = messages
                .filter((m) => m.role !== "system")
                .slice(-10) // Last 10 messages for context
                .map((m) => ({ role: m.role, content: m.content }));

            const response = await api.post("/chat", {
                message: messageText.trim(),
                sessionId,
                labId,
                conversationHistory,
            });

            const assistantMessage = {
                role: "assistant",
                content: response.data.data.response,
                timestamp: new Date().toISOString(),
                provider: response.data.data.provider,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            console.error("Chat error:", err);
            setError(err.response?.data?.message || "Failed to send message");

            // Add error message to chat
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                    timestamp: new Date().toISOString(),
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleSuggestionClick = (suggestion) => {
        sendMessage(suggestion);
        setShowSuggestions(false);
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-col h-full bg-paper border-2 border-border shadow-[4px_4px_0px_rgba(0,0,0,1)] font-mono overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b-2 border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-paper border border-border flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        <Bot className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                        <h3 className="text-ink font-bold text-xs uppercase tracking-widest">AI_OPERATIVE</h3>
                        <p className="text-[10px] text-muted uppercase tracking-widest">
                            {isLoading ? "PROCESSING..." : "SYS_ONLINE"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-paper">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`flex items-start gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""
                                }`}
                        >
                            {/* Avatar */}
                            <div
                                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center border border-border shadow-[2px_2px_0px_rgba(0,0,0,1)] ${message.role === "user"
                                    ? "bg-surface text-ink"
                                    : "bg-surface text-accent"
                                    }`}
                            >
                                {message.role === "user" ? (
                                    <User className="w-4 h-4" />
                                ) : (
                                    <Bot className="w-4 h-4" />
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div
                                className={`px-4 py-3 border border-border ${message.role === "user"
                                    ? "bg-surface text-ink shadow-[4px_4px_0px_rgba(0,0,0,0.2)]"
                                    : message.isError
                                        ? "bg-error/10 text-error border-error border-dashed"
                                        : "bg-paper text-ink shadow-[4px_4px_0px_rgba(0,0,0,0.1)]"
                                    }`}
                            >
                                <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono">{message.content}</p>
                                <div
                                    className={`flex items-center gap-2 mt-2 text-[10px] uppercase tracking-widest font-bold ${message.role === "user" ? "text-muted" : "text-muted"
                                        }`}
                                >
                                    <span>{formatTime(message.timestamp)}</span>
                                    {message.provider && message.provider !== "mock" && (
                                        <span className="opacity-50">• {message.provider}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-surface border border-border flex flex-shrink-0 items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                <Bot className="w-4 h-4 text-accent" />
                            </div>
                            <div className="bg-paper border border-border shadow-[4px_4px_0px_rgba(0,0,0,0.1)] px-4 py-3">
                                <div className="flex items-center gap-1.5 h-4">
                                    <div className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1.5 h-1.5 bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="px-4 pb-4">
                    <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="flex items-center gap-2 text-[10px] font-bold text-muted hover:text-ink uppercase tracking-widest mb-3 border border-border px-2 py-1 bg-surface"
                    >
                        <Lightbulb className="w-3 h-3" />
                        <span>SUGGESTED_QUERIES</span>
                        {showSuggestions ? (
                            <ChevronUp className="w-3 h-3" />
                        ) : (
                            <ChevronDown className="w-3 h-3" />
                        )}
                    </button>
                    {showSuggestions && (
                        <div className="flex flex-wrap gap-2">
                            {suggestions.slice(0, 4).map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    disabled={isLoading}
                                    className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-surface border border-border hover:bg-ink hover:text-paper hover:-translate-y-0.5 transition-all text-muted disabled:opacity-50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Input Area */}
            <form
                onSubmit={handleSubmit}
                className="p-4 bg-surface border-t-2 border-border"
            >
                <div className="flex items-center gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="ENTER_QUERY..."
                        disabled={isLoading}
                        className="flex-1 bg-paper text-ink px-4 py-3 text-xs uppercase font-mono tracking-widest border border-border focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.2)]"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-12 h-12 bg-accent flex flex-shrink-0 items-center justify-center text-paper hover:bg-paper hover:text-accent border border-transparent hover:border-accent shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {error && (
                    <p className="text-error font-bold uppercase tracking-widest text-[10px] mt-3">{error}</p>
                )}
            </form>
        </div>
    );
};

export default ChatWidget;
