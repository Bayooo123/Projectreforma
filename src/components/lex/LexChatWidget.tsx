"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, Maximize2, X } from 'lucide-react';
import styles from './LexChatWidget.module.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function LexChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! I'm Lex, your AI assistant. I can help you create matters, record expenses, manage clients, and much more. What would you like to do?",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const quickActions = [
        "Show me all active matters",
        "What are today's expenses?",
        "Create a new matter",
        "Check NDPA compliance",
    ];

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: inputValue,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/lex/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputValue,
                    conversationId,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: data.message,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);

                if (data.conversationId && !conversationId) {
                    setConversationId(data.conversationId);
                }
            } else {
                const errorMessage: Message = {
                    role: 'assistant',
                    content: `Sorry, I encountered an error: ${data.error}`,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Sorry, I could not connect to the server. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickAction = (action: string) => {
        setInputValue(action);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={styles.floatingButton}
                aria-label="Open Lex Assistant"
            >
                <div className={styles.lexIcon}>
                    <span className={styles.lexText}>Lex</span>
                </div>
                <div className={styles.pulse}></div>
            </button>
        );
    }

    return (
        <div className={`${styles.chatWidget} ${isMinimized ? styles.minimized : ''}`}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.lexAvatar}>
                        <span>L</span>
                    </div>
                    <div className={styles.headerInfo}>
                        <h3>Lex</h3>
                        <span className={styles.status}>
                            <span className={styles.statusDot}></span>
                            Online
                        </span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className={styles.iconButton}
                        aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className={styles.iconButton}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
                <>
                    <div className={styles.messagesContainer}>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.assistantMessage
                                    }`}
                            >
                                {message.role === 'assistant' && (
                                    <div className={styles.messageAvatar}>L</div>
                                )}
                                <div className={styles.messageContent}>
                                    <p>{message.content}</p>
                                    <span className={styles.messageTime}>
                                        {message.timestamp.toLocaleTimeString('en-NG', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className={`${styles.message} ${styles.assistantMessage}`}>
                                <div className={styles.messageAvatar}>L</div>
                                <div className={styles.messageContent}>
                                    <div className={styles.typingIndicator}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    {messages.length === 1 && (
                        <div className={styles.quickActions}>
                            <p className={styles.quickActionsLabel}>Quick actions:</p>
                            <div className={styles.quickActionButtons}>
                                {quickActions.map((action, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickAction(action)}
                                        className={styles.quickActionButton}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className={styles.inputContainer}>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask Lex anything..."
                            className={styles.input}
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSendMessage}
                            className={styles.sendButton}
                            disabled={!inputValue.trim() || isLoading}
                            aria-label="Send message"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
