/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, SearchIcon } from './icons';

interface AppConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectApp: (appId: string) => void;
    apps: AppConfig[];
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectApp, apps }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSearchTerm(''); // Reset search term when modal opens
        }
    }, [isOpen]);

    const filteredApps = apps.filter(app =>
        app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="modal-overlay"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="modal-content !max-w-2xl"
                    >
                        <div className="flex justify-between items-center">
                             <h3 className="base-font font-bold text-2xl text-yellow-400">Tìm kiếm ứng dụng</h3>
                             <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Đóng tìm kiếm">
                                <CloseIcon className="h-6 w-6" />
                             </button>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nhập tên hoặc mô tả ứng dụng..."
                                className="form-input !pl-10"
                                autoFocus
                            />
                             <SearchIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" strokeWidth={2} />
                        </div>
                        <div className="max-h-96 overflow-y-auto mt-4 pr-2 -mr-2 space-y-2">
                             {filteredApps.length > 0 ? (
                                <ul className="space-y-2">
                                    {filteredApps.map((app, index) => (
                                        <motion.li 
                                            key={app.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <button onClick={() => onSelectApp(app.id)} className="w-full text-left p-4 rounded-lg hover:bg-yellow-400/10 border border-transparent hover:border-yellow-400/30 transition-all duration-200 flex items-start gap-4">
                                                <span className="text-3xl mt-1">{app.icon}</span>
                                                <div>
                                                    <h4 className="font-bold text-yellow-400">{app.title}</h4>
                                                    <p className="text-sm text-neutral-300">{app.description}</p>
                                                </div>
                                            </button>
                                        </motion.li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-neutral-400 py-8">Không tìm thấy ứng dụng nào.</p>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;