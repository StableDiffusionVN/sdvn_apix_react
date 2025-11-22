/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export interface AILogMessage {
  id: number;
  message: string;
  type: 'info' | 'prompt' | 'success' | 'error' | 'spinner';
}

interface AIProcessLoggerProps {
    log: AILogMessage[];
    onClose: () => void;
    t: (key: string, ...args: any[]) => string;
}

export const AIProcessLogger: React.FC<AIProcessLoggerProps> = ({ log, onClose, t }) => {
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const logContainerRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [log]);

    const handleCopy = (message: string, id: number) => {
        navigator.clipboard.writeText(message).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    return (
        <motion.div
            className="ai-process-logger"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="ai-process-logger-header">
                <h4 className="ai-process-logger-title">{t('layerComposer_ai_processTitle')}</h4>
                <button onClick={onClose} className="ai-process-logger-close" aria-label="Close log">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <ul ref={logContainerRef} className="ai-process-logger-content">
                {log.map(item => {
                    if (item.message === '---') {
                        return (
                            <li key={item.id} className="py-2">
                                <div className="border-t border-neutral-700/50"></div>
                            </li>
                        );
                    }
                    return (
                        <li key={item.id} className={`ai-process-logger-item log-item-${item.type}`}>
                            {item.type === 'spinner' ? (
                                <div className="log-item-spinner">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <span>{item.message}</span>
                                </div>
                            ) : item.type === 'prompt' ? (
                                <div className="log-item-prompt">
                                    <pre>{item.message}</pre>
                                    <button onClick={() => handleCopy(item.message, item.id)} className="copy-btn" title={copiedId === item.id ? t('layerComposer_ai_log_copied') : t('layerComposer_ai_log_copy')}>
                                        {copiedId === item.id ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <span>{item.message}</span>
                            )}
                        </li>
                    )
                })}
            </ul>
        </motion.div>
    );
};
