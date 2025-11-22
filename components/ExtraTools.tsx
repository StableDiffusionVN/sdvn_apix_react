/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppControls } from './uiUtils';
import { LayoutIcon, BeforeAfterIcon, AppCoverIcon } from './icons';

const ExtraTools: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
    const { openImageLayoutModal, openBeforeAfterModal, openAppCoverCreatorModal, t } = useAppControls();

    const tools = [
        {
            id: 'before-after',
            label: t('extraTools_beforeAfter'),
            action: openBeforeAfterModal,
            icon: <BeforeAfterIcon className="h-5 w-5 group-hover:text-yellow-400 transition-colors" />,
        },
        {
            id: 'image-layout',
            label: t('extraTools_layout'),
            action: openImageLayoutModal,
            icon: <LayoutIcon className="h-5 w-5 group-hover:text-yellow-400 transition-colors" strokeWidth={2} />,
        },
        {
            id: 'app-cover',
            label: t('extraTools_appCover'),
            action: openAppCoverCreatorModal,
            icon: <AppCoverIcon className="h-5 w-5 group-hover:text-yellow-400 transition-colors" />,
        }
    ];

    return (
        <div
            className="fixed top-[60px] right-4 z-20 flex flex-col items-end gap-2"
            aria-live="polite"
            aria-label="Extra tools menu"
        >
            <AnimatePresence>
                {isOpen && tools.map((tool, index) => (
                    <motion.button
                        key={tool.id}
                        onClick={tool.action}
                        className="btn-search group"
                        aria-label={tool.label}
                        title={tool.label}
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1, transition: { delay: index * 0.07, ease: [0.22, 1, 0.36, 1] } }}
                        exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.15, ease: [0.22, 1, 0.36, 1] } }}
                    >
                        {tool.icon}
                    </motion.button>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ExtraTools;