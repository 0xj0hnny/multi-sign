/**
 * PDF Utilities for Document Signing
 * 
 * Provides PDF file handling and validation
 */

import { PDFData } from '../types/document';

/**
 * Validate if a file is a PDF
 */
export function validatePDF(file: File): boolean {
  // Check file extension
  const validExtensions = ['.pdf'];
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  // Check MIME type
  const validMimeTypes = ['application/pdf'];
  const hasValidMimeType = validMimeTypes.includes(file.type);

  return hasValidExtension && hasValidMimeType;
}

/**
 * Read PDF file and convert to base64
 */
export async function readPDFFile(file: File): Promise<PDFData> {
  if (!validatePDF(file)) {
    throw new Error('Invalid PDF file');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (data:application/pdf;base64,)
      const base64Data = base64.split(',')[1];

      resolve({
        base64: base64Data,
        filename: file.name,
        mimeType: file.type,
        size: file.size
      });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get PDF file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create download link for PDF
 */
export function createPDFDownloadLink(pdfData: PDFData): string {
  const blob = base64ToBlob(pdfData.base64, pdfData.mimeType);
  return URL.createObjectURL(blob);
}

/**
 * Convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Validate PDF file size (max 10MB for PoC)
 */
export function validatePDFSize(file: File, maxSizeMB: number = 10): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
}
