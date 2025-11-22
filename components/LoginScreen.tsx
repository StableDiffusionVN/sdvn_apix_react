/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useAuth, useAppControls } from './uiUtils';

const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const { t } = useAppControls();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const success = await login(username, password);
        if (!success) {
            setError(t('login_error'));
            setIsLoading(false);
        }
        // On success, the App component will re-render, no need to do anything else here.
    };

    return (
        <main className="text-neutral-200 min-h-screen w-full relative flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 z-0" aria-hidden="true"></div>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-sm"
            >
                <form 
                    onSubmit={handleSubmit}
                    className="modal-content !bg-neutral-900/50"
                >
                    <div className="text-center mb-6">
                        <h1 className="text-5xl title-font font-bold text-white">aPix</h1>
                        <p className="sub-title-font font-bold text-neutral-300 mt-1">{t('login_title')}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-neutral-300 mb-1">{t('login_username')}</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="form-input"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="password"  className="block text-sm font-medium text-neutral-300 mb-1">{t('login_password')}</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <motion.p 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="text-red-400 text-sm text-center mt-4"
                            role="alert"
                        >
                            {error}
                        </motion.p>
                    )}

                    <div className="mt-6">
                        <button 
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? t('login_loading') : t('login_submit')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </main>
    );
};

export default LoginScreen;