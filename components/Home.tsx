/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAppControls, useImageEditor, extractJsonFromPng, type AppConfig } from './uiUtils';
import * as fileStorage from '../services/fileStorage';
import { CloudUploadIcon, LayerComposerIcon, EditorIcon, StoryboardIcon } from './icons';

interface ProcessedAppConfig extends AppConfig {
  title: string;
  description: string;
}

interface HomeProps {
  onSelectApp: (appId: string) => void;
  title: React.ReactNode;
  subtitle: string;
  apps: ProcessedAppConfig[];
}

const Home: React.FC<HomeProps> = ({ onSelectApp, title, subtitle, apps }) => {
  const { t, importSettingsAndNavigate, openLayerComposer, addImagesToGallery, openStoryboardingModal } = useAppControls();
  const { openEmptyImageEditor } = useImageEditor();
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const APPS_PER_PAGE = 8;
  const totalPages = Math.ceil(apps.length / APPS_PER_PAGE);

  const displayedApps = showAll 
    ? apps 
    : apps.slice((currentPage - 1) * APPS_PER_PAGE, currentPage * APPS_PER_PAGE);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleToggleShowAll = () => {
    setShowAll(prev => !prev);
    if (showAll) { // If it's currently showing all, we are collapsing it
      setCurrentPage(1);
    }
  };

    const handleOpenEditor = useCallback(() => {
        openEmptyImageEditor((newUrl) => {
            addImagesToGallery([newUrl], 'image_editor');
        });
    }, [openEmptyImageEditor, addImagesToGallery]);


  // Use flexbox to center app cards in each row.
  const appListContainerClasses = 'flex flex-wrap items-stretch justify-center w-full max-w-screen-2xl gap-6';

  const renderAppTitle = (title: string) => {
    // Replace newline characters with a space for single-line display on home cards
    return title.replace(/\n/g, ' ');
  };
  
  const handleFile = async (file: File) => {
    let settings: any = null;
    try {
        if (file.type === 'image/png') {
            settings = await extractJsonFromPng(file);
        } else if (file.type === 'application/json') {
            settings = JSON.parse(await file.text());
        }

        if (settings) {
            // Check if it's a Canvas file
            if (settings.canvasSettings && Array.isArray(settings.layers)) {
                await fileStorage.saveData('canvas-state.json', settings);
                openLayerComposer();
            } 
            // Check if it's a regular app settings file
            else if (settings.viewId && settings.state) {
                importSettingsAndNavigate(settings);
            } 
            // Unrecognized format
            else {
                toast.error("File không hợp lệ hoặc không được nhận dạng.");
            }
        } else {
            toast.error("Không tìm thấy dữ liệu cài đặt trong file.");
        }
    } catch (e) {
        console.error("Failed to process file", e);
        toast.error("Lỗi khi xử lý file. File có thể bị hỏng.");
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
      }
      // Reset input value to allow re-uploading the same file
      e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await handleFile(e.dataTransfer.files[0]);
      }
  };

  return (
    <motion.div 
      key="home-wrapper"
      className="w-full max-w-screen-2xl mx-auto text-center flex flex-col items-center justify-center h-full relative"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center mb-12">
          <h1 className="text-6xl/[1.3] md:text-8xl/[1.3] title-font font-bold text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider">{title}</h1>
          <p className="sub-title-font font-bold text-neutral-200 mt-2 text-xl tracking-wide">{subtitle}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
              <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json,.png"
                  onChange={handleFileUploadChange}
              />
              <button
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-black/20 border border-white/20 rounded-md text-sm text-neutral-200 hover:bg-black/40 transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                  <CloudUploadIcon className="h-4 w-4" />
                  {t('home_uploadJson')}
              </button>
              <button
                  onClick={openLayerComposer}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-black/20 border border-white/20 rounded-md text-sm text-neutral-200 hover:bg-black/40 transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                  <LayerComposerIcon className="h-4 w-4" strokeWidth="1.5" />
                  {t('home_openCanvas')}
              </button>
              <button
                  onClick={openStoryboardingModal}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-black/20 border border-white/20 rounded-md text-sm text-neutral-200 hover:bg-black/40 transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                  <StoryboardIcon className="h-4 w-4" />
                  {t('extraTools_storyboarding')}
              </button>
              <button
                  onClick={handleOpenEditor}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-black/20 border border-white/20 rounded-md text-sm text-neutral-200 hover:bg-black/40 transition-colors focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                  <EditorIcon className="h-4 w-4" />
                  {t('home_openEditor')}
              </button>
          </div>
      </div>


      <div className={appListContainerClasses}>
        {displayedApps.map((app, index) => {
          return (
            <motion.div
              key={app.id}
              className="app-card group"
              onClick={() => onSelectApp(app.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              role="button"
              tabIndex={0}
              aria-label={`Mở tính năng ${app.title.replace('\n', ' ')}`}
            >
              {/* Content that fades out */}
              <div className="absolute inset-0 p-5 flex flex-col items-start text-left transition-opacity duration-300 ease-in-out group-hover:opacity-0">
                  <div className="text-4xl mb-3 transition-transform duration-300 group-hover:scale-110">{app.icon}</div>
                  <h3 className="base-font font-bold text-xl text-yellow-400 mb-2 min-h-[3rem] flex items-center">
                      {renderAppTitle(app.title)}
                  </h3>
                  <p className="base-font text-neutral-300 text-sm line-clamp-2">{app.description}</p>
                  <span className="base-font font-bold text-white mt-auto pt-2 self-end transition-transform duration-300 group-hover:translate-x-1">{t('home_start')}</span>
              </div>

              {/* Preview image that fades in */}
              {app.previewImageUrl && (
                  <div className="absolute inset-0 w-full h-full opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100">
                      <img src={app.previewImageUrl} className="w-full h-full object-cover" alt={`Preview for ${app.title}`} loading="lazy" />
                  </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {apps.length > APPS_PER_PAGE && (
        <div className="mt-8 w-full flex justify-center">
          <motion.div 
            className="pagination-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {!showAll && totalPages > 1 && (
              <>
                <button onClick={handlePrevPage} disabled={currentPage === 1} aria-label="Trang trước">
                  {t('home_prevPage')}
                </button>
                <span aria-live="polite">{t('home_page')} {currentPage} / {totalPages}</span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages} aria-label="Trang sau">
                  {t('home_nextPage')}
                </button>
              </>
            )}
            <button onClick={handleToggleShowAll}>
              {showAll ? t('home_collapse') : t('home_showAll')}
            </button>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
          {isDraggingOver && (
              <motion.div
                  className="absolute inset-0 bg-black/70 border-4 border-dashed border-yellow-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <CloudUploadIcon className="h-16 w-16 text-yellow-400 mb-4" strokeWidth={1}/>
                  <p className="text-2xl font-bold text-yellow-400">Thả file JSON hoặc ảnh PNG để import cài đặt</p>
              </motion.div>
          )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Home;
