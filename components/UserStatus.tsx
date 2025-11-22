/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useAuth, useAppControls } from './uiUtils';
import { LogoutIcon } from './icons';

const UserStatus: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { t } = useAppControls();

    if (!currentUser) return null;

    return (
        <button 
            onClick={logout}
            className="group flex items-center gap-2 rounded-full bg-black/30 pl-4 pr-3 py-1.5 text-sm text-neutral-200 backdrop-blur-sm border border-white/10 hover:bg-red-500/80 hover:border-red-500/90 transition-all duration-200"
            aria-label={t('userStatus_logout', currentUser)}
        >
            <span className="font-bold text-yellow-400">{currentUser}</span>
            <LogoutIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
        </button>
    );
};

export default UserStatus;