// IndexedDB helper for persisting student photos reliably without localStorage quota limits

const DB_NAME = 'ClassroomHelperDB';
const DB_VERSION = 1;
const STORE_NAME = 'student_photos';

export interface StoredPhoto {
  id: string;
  name: string;
  photoUrl: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Load all stored photos from IndexedDB
export async function loadStoredPhotos(): Promise<StoredPhoto[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as StoredPhoto[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load photos from IndexedDB:', error);
    return [];
  }
}

// Save or replace all photos
export async function saveAllPhotosToDB(photos: StoredPhoto[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing records first
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        let count = 0;
        if (photos.length === 0) {
          resolve();
          return;
        }

        photos.forEach((photo) => {
          const putRequest = store.put(photo);
          putRequest.onsuccess = () => {
            count++;
            if (count === photos.length) {
              resolve();
            }
          };
          putRequest.onerror = () => {
            reject(putRequest.error);
          };
        });
      };

      clearRequest.onerror = () => {
        reject(clearRequest.error);
      };
    });
  } catch (error) {
    console.error('Failed to save photos to IndexedDB:', error);
  }
}

// Client-side image compression so photos load instantly and take minimal storage
export function compressImage(file: File, maxWidth = 640, maxHeight = 640, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for photography with great compression ratio
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => {
        reject(new Error('Image failed to load for compression'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
}
