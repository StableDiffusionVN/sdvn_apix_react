/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const BACKEND_URL = 'http://localhost:3001';

/**
 * Upload a base64 image to the server
 * @param base64 Base64 encoded image string
 * @param category Storage category (gallery or history)
 * @returns URL of the uploaded image
 */
/**
 * Upload a base64 image to the server
 * @param base64 Base64 encoded image string
 * @param category Storage category (gallery or history)
 * @param subfolder Optional subfolder within the category
 * @returns URL of the uploaded image
 */
export async function uploadBase64Image(base64: string, category: string = 'gallery', subfolder: string = ''): Promise<string> {
    try {
        const query = subfolder ? `?subfolder=${encodeURIComponent(subfolder)}` : '';
        const response = await fetch(`${BACKEND_URL}/api/upload-base64/${category}${query}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ base64 }),
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.url;
    } catch (error) {
        console.error('Error uploading base64 image:', error);
        throw error;
    }
}

/**
 * Upload a File or Blob to the server
 * @param file File or Blob to upload
 * @param category Storage category
 * @param subfolder Optional subfolder within the category
 * @returns URL of the uploaded image
 */
export async function uploadFile(file: File | Blob, category: string = 'gallery', subfolder: string = ''): Promise<string> {
    try {
        const formData = new FormData();
        formData.append('images', file);

        const query = subfolder ? `?subfolder=${encodeURIComponent(subfolder)}` : '';
        const response = await fetch(`${BACKEND_URL}/api/upload/${category}${query}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.urls[0]; // Return first URL
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

/**
 * Upload multiple base64 images
 * @param base64Images Array of base64 strings
 * @param category Storage category
 * @param subfolder Optional subfolder within the category
 * @returns Array of URLs
 */
export async function uploadMultipleBase64Images(
    base64Images: string[],
    category: string = 'gallery',
    subfolder: string = ''
): Promise<string[]> {
    try {
        const uploadPromises = base64Images.map(base64 => uploadBase64Image(base64, category, subfolder));
        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error('Error uploading multiple images:', error);
        throw error;
    }
}

/**
 * Delete an image by URL
 * @param url Full URL of the image to delete
 */
export async function deleteImageByUrl(url: string): Promise<void> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/delete-by-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
}

/**
 * Get image URL for a category and filename
 * @param category Storage category
 * @param filename Image filename
 * @returns Full URL to the image
 */
export function getImageUrl(category: string, filename: string): string {
    return `${BACKEND_URL}/${category}/${filename}`;
}

/**
 * List all images in a category
 * @param category Storage category
 * @returns Array of image objects with filename and url
 */
export async function listImages(category: string): Promise<Array<{ filename: string; url: string; subfolder?: string; mtime: number }>> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/images/${category}`);
        
        if (!response.ok) {
            throw new Error(`List failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.images || [];
    } catch (error) {
        console.error('Error listing images:', error);
        throw error;
    }
}

/**
 * Check if backend server is running
 * @returns true if server is healthy
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Convert a data URL to a Blob
 * @param dataUrl Data URL string
 * @returns Blob object
 */
export function dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}
/**
 * Save JSON data to the server
 * @param filename Filename (e.g., 'history.json')
 * @param data JSON data to save
 */
export async function saveData(filename: string, data: any): Promise<void> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/data/${filename}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Save data failed: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    }
}

/**
 * Load JSON data from the server
 * @param filename Filename (e.g., 'history.json')
 * @returns JSON data or null if not found
 */
export async function loadData(filename: string): Promise<any | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/data/${filename}`);
        
        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`Load data failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error loading data:', error);
        return null;
    }
}

/**
 * Delete JSON data from the server
 * @param filename Filename (e.g., 'history.json')
 */
export async function deleteData(filename: string): Promise<void> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/data/${filename}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Delete data failed: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting data:', error);
        throw error;
    }
}
