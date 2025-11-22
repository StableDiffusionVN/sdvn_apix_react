/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls } from '../uiUtils';
import type { Chat } from '@google/genai';
import { sendChatMessage } from '../../services/geminiService';
import { type Layer } from './LayerComposer.types';
import { LoadingSpinnerIcon, CloseIcon, SendIcon } from '../icons';
import toast from 'react-hot-toast';

interface AIChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    selectedLayers: Layer[];
    captureLayer: (layer: Layer) => Promise<string>;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast.success("Đã sao chép prompt!");
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    return (
        <div className="chatbot-code-block">
            <div className="code-block-header">
                <span>prompt</span>
                <button
                    onClick={handleCopy}
                    className="copy-btn"
                    title={isCopied ? "Đã sao chép!" : "Sao chép"}
                >
                    {isCopied ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    )}
                </button>
            </div>
            <pre>{code}</pre>
        </div>
    );
};

const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|\[(.*?)\]\((.*?)\))/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            elements.push(text.substring(lastIndex, match.index));
        }
        if (match[1].startsWith('**')) {
            elements.push(<strong key={match.index}>{match[2]}</strong>);
        } else if (match[1].startsWith('*')) {
            elements.push(<em key={match.index}>{match[3]}</em>);
        } else if (match[1].startsWith('[')) {
            elements.push(<a href={match[5]} target="_blank" rel="noopener noreferrer" key={match.index}>{match[4]}</a>);
        }
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        elements.push(text.substring(lastIndex));
    }
    return elements;
};

const parseMarkdownToReact = (text: string): React.ReactNode[] => {
    // Split by both ```...``` blocks and double newlines for other elements
    const blocks = text.split(/(```[\s\S]*?```|\n\n)/g).filter(Boolean);

    const elements: React.ReactNode[] = [];
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (inList) {
            if (listType === 'ul') {
                elements.push(<ul key={`list-${elements.length}`}>{listItems}</ul>);
            } else {
                elements.push(<ol key={`list-${elements.length}`}>{listItems}</ol>);
            }
            listItems = [];
            inList = false;
            listType = null;
        }
    };

    blocks.forEach((block, index) => {
        if (block.trim() === '') return;

        // Code blocks
        const codeMatch = block.match(/^```([\s\S]*?)```$/);
        if (codeMatch) {
            flushList();
            const code = codeMatch[1].trim();
            elements.push(<CodeBlock key={`code-${index}`} code={code} />);
            return;
        }
        
        const lines = block.trim().split('\n');
        lines.forEach((line, lineIndex) => {
            const isUnorderedListItem = line.startsWith('* ') || line.startsWith('- ');
            const isOrderedListItem = line.match(/^\d+\.\s/);

            if (isUnorderedListItem || isOrderedListItem) {
                if (!inList) {
                    inList = true;
                    listType = isUnorderedListItem ? 'ul' : 'ol';
                }
                const content = isUnorderedListItem ? line.substring(2) : line.replace(/^\d+\.\s/, '');
                listItems.push(<li key={`${index}-${lineIndex}`}>{parseInlineMarkdown(content)}</li>);
            } else {
                flushList();
                 if (line.startsWith('# ')) {
                    elements.push(<h1 key={`${index}-${lineIndex}`}>{parseInlineMarkdown(line.substring(2))}</h1>);
                } else if (line.startsWith('## ')) {
                    elements.push(<h2 key={`${index}-${lineIndex}`}>{parseInlineMarkdown(line.substring(3))}</h2>);
                } else if (line.startsWith('### ')) {
                    elements.push(<h3 key={`${index}-${lineIndex}`}>{parseInlineMarkdown(line.substring(4))}</h3>);
                } else if (line.startsWith('> ')) {
                    elements.push(<blockquote key={`${index}-${lineIndex}`}>{parseInlineMarkdown(line.substring(2))}</blockquote>);
                } else if (line.startsWith('---')) {
                    elements.push(<hr key={`${index}-${lineIndex}`} />);
                } else if (line.trim() !== '') {
                    elements.push(<p key={`${index}-${lineIndex}`}>{parseInlineMarkdown(line)}</p>);
                }
            }
        });
    });

    flushList(); // Flush any remaining list
    return elements;
};

const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
    return <div className="chatbot-message">{parseMarkdownToReact(text)}</div>;
};


export const AIChatbot: React.FC<AIChatbotProps> = ({ isOpen, onClose, selectedLayers, captureLayer }) => {
    const { t, language } = useAppControls();
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isVisibleRef = useRef(isOpen);

    useEffect(() => {
        isVisibleRef.current = isOpen;
        if (!isOpen) {
            chatSession.current = null;
            setMessages([]);
        }
    }, [isOpen]);

    // Reset chat history and session if language changes
    useEffect(() => {
        chatSession.current = null;
        setMessages([]);
    }, [language]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (prompt: string, imageDataUrls?: string[]) => {
        if (!prompt && (!imageDataUrls || imageDataUrls.length === 0)) return;
        
        setIsLoading(true);
        if (prompt) {
            setMessages(prev => [...prev, { role: 'user', text: prompt }]);
        }
        setUserInput('');

        try {
            const { responseText, updatedChat } = await sendChatMessage(chatSession.current, prompt, imageDataUrls, language);
            chatSession.current = updatedChat;
            if (isVisibleRef.current) {
                setMessages(prev => [...prev, { role: 'model', text: responseText }]);
            }
        } catch (error) {
            if (isVisibleRef.current) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
                setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]);
            }
        } finally {
            if (isVisibleRef.current) {
                setIsLoading(false);
            }
        }
    };

    const submitPrompt = async () => {
        const prompt = userInput.trim();
        if (!prompt) return;

        let imageUrls: string[] = [];

        if (selectedLayers.length > 0) {
            try {
                // Capture all selected layers concurrently
                imageUrls = await Promise.all(selectedLayers.map(layer => captureLayer(layer)));
            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : "Failed to capture one or more layers.";
                setMessages(prev => [...prev, { role: 'model', text: `Error: ${errorMessage}` }]);
                return;
            }
        }
        await handleSendMessage(prompt, imageUrls.length > 0 ? imageUrls : undefined);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitPrompt();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submitPrompt();
        }
    };

    return (
         <AnimatePresence>
            {isOpen && (
                <motion.div
                    drag
                    dragMomentum={false}
                    dragConstraints={{ left: -400, right: 400, top: -200, bottom: 200 }}
                    className="fixed bottom-24 right-6 w-full max-w-md bg-neutral-900/80 backdrop-blur-lg border border-white/10 shadow-2xl z-[65] rounded-xl flex flex-col overflow-hidden"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center p-3 border-b border-white/10 flex-shrink-0 cursor-grab active:cursor-grabbing">
                        <h4 className="font-bold text-yellow-400">{t('layerComposer_chatbot_title')}</h4>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors" aria-label="Close chatbot">
                            <CloseIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-grow h-80 overflow-y-auto p-3 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-2 rounded-lg max-w-xs text-sm break-words ${msg.role === 'user' ? 'bg-yellow-400 text-black' : 'bg-neutral-700 text-neutral-200'}`}>
                                    <MarkdownContent text={msg.text} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="p-2 rounded-lg bg-neutral-700">
                                    <LoadingSpinnerIcon className="h-5 w-5 text-neutral-400" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 border-t border-white/10 flex-shrink-0">
                         <form onSubmit={handleFormSubmit}>
                            <div className="relative">
                                <textarea
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('layerComposer_chatbot_placeholder')}
                                    className="form-input !text-sm w-full !h-24 !pr-10 resize-none"
                                    rows={4}
                                />
                                <button
                                    type="submit"
                                    className="chatbot-send-btn"
                                    disabled={isLoading || !userInput.trim()}
                                    aria-label="Send message"
                                    title="Gửi (Cmd/Ctrl+Enter)"
                                >
                                    <SendIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};