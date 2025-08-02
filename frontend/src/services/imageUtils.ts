export class ImageUtils {
  // Convert base64 to blob
  static base64ToBlob(base64: string, contentType = 'image/png'): Blob {
    const byteCharacters = atob(base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ''));
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  // Convert blob to base64
  static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Download image
  static downloadImage(base64: string, filename: string): void {
    const blob = this.base64ToBlob(base64);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  // Copy image to clipboard
  static async copyToClipboard(base64: string): Promise<void> {
    try {
      const blob = this.base64ToBlob(base64);
      
      if ('ClipboardItem' in window) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
      } else {
        throw new Error('Clipboard API not supported');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw new Error('Failed to copy image to clipboard');
    }
  }

  // Compress image for thumbnails
  static async createThumbnail(
    base64: string,
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  }

  // Get image dimensions from base64
  static getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  }

  // Generate unique filename
  static generateFilename(prompt: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cleanPrompt = prompt
      .substring(0, 50)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    return `flux_krea_${cleanPrompt}_${timestamp}.png`;
  }

  // Check if WebP is supported
  static isWebPSupported(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
}