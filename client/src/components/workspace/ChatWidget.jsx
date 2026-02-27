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
        <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium text-sm">AI Mentor</h3>
                        <p className="text-xs text-gray-400">
                            {isLoading ? "Thinking..." : "Online"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-400" />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        <div
                            className={`flex items-start gap-2 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""
                                }`}
                        >
                            {/* Avatar */}
                            <div
                                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${message.role === "user"
                                    ? "bg-gray-700"
                                    : "bg-gray-900 border border-gray-700"
                                    }`}
                            >
                                {message.role === "user" ? (
                                    <User className="w-4 h-4 text-gray-200" />
                                ) : (
                                    <Bot className="w-4 h-4 text-green-400" />
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div
                                className={`rounded-2xl px-4 py-2 ${message.role === "user"
                                    ? "bg-gray-700 text-white rounded-br-sm"
                                    : message.isError
                                        ? "bg-red-900/50 text-red-300 rounded-bl-sm"
                                        : "bg-gray-800 text-gray-200 rounded-bl-sm"
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                <div
                                    className={`flex items-center gap-2 mt-1 text-xs ${message.role === "user" ? "text-gray-400" : "text-gray-500"
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
                        <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-green-400" />
                            </div>
                            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="px-4 pb-2">
                    <button
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 mb-2"
                    >
                        <Lightbulb className="w-3 h-3" />
                        <span>Quick questions</span>
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
                                    className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors disabled:opacity-50"
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
                className="p-4 bg-gray-800 border-t border-gray-700"
            >
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask your AI mentor..."
                        disabled={isLoading}
                        className="flex-1 bg-gray-900 text-white rounded-full px-4 py-2 text-sm border border-gray-700 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/40 disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                {error && (
                    <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
            </form>
        </div>
    );
};

export default ChatWidget;
