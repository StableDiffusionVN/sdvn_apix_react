/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider, ImageEditorProvider, AppControlProvider } from './components/uiUtils';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
        <ImageEditorProvider>
            <AppControlProvider>
                <App />
            </AppControlProvider>
        </ImageEditorProvider>
    </AuthProvider>
  </React.StrictMode>
);
