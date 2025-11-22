/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface ApiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
            if (storedKey) {
                setApiKey(storedKey);
                setHasExistingKey(true);
            } else {
                setApiKey('');
                setHasExistingKey(false);
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!apiKey.trim()) {
            toast.error('Vui lòng nhập API key');
            return;
        }

        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
        toast.success('Đã lưu API key thành công! Vui lòng tải lại trang để áp dụng.');
        setHasExistingKey(true);
        onClose();
    };

    const handleClear = () => {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
        setApiKey('');
        setHasExistingKey(false);
        toast.success('Đã xóa API key. Vui lòng tải lại trang để sử dụng API key mặc định.');
    };

    const handleClose = () => {
        setShowKey(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                />

                {/* Modal */}
                <motion.div
                    className="relative bg-neutral-900 border border-white/20 rounded-lg shadow-2xl max-w-md w-full p-6"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-neutral-100">Cài đặt API Gemini</h2>
                        <button
                            onClick={handleClose}
                            className="text-neutral-400 hover:text-neutral-200 transition-colors"
                            aria-label="Đóng"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Status */}
                    <div className="mb-4 p-3 bg-black/30 rounded-md border border-white/10">
                        <p className="text-sm text-neutral-300">
                            <span className="font-semibold">Trạng thái: </span>
                            {hasExistingKey ? (
                                <span className="text-green-400">✓ Đã cấu hình API key</span>
                            ) : (
                                <span className="text-yellow-400">⚠ Chưa cấu hình (sử dụng key mặc định)</span>
                            )}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="api-key" className="block text-sm font-medium text-neutral-300 mb-2">
                                Google Gemini API Key
                            </label>
                            <div className="relative">
                                <input
                                    id="api-key"
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Nhập API key của bạn..."
                                    className="w-full px-4 py-2 pr-12 bg-black/40 border border-white/20 rounded-md text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors"
                                    aria-label={showKey ? 'Ẩn API key' : 'Hiện API key'}
                                >
                                    {showKey ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-neutral-400">
                                Lấy API key miễn phí tại{' '}
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-yellow-400 hover:text-yellow-300 underline"
                                >
                                    Google AI Studio
                                </a>
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
                            >
                                Lưu
                            </button>
                            {hasExistingKey && (
                                <button
                                    onClick={handleClear}
                                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-2 px-4 rounded-md transition-colors border border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
                                >
                                    Xóa
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="bg-black/40 hover:bg-black/60 text-neutral-300 font-semibold py-2 px-4 rounded-md transition-colors border border-white/20 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ApiSettingsModal;
