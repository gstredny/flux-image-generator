import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useApp } from '../../contexts/AppContext';
import { ImageUtils } from '../../services/imageUtils';
import { storageService } from '../../services/storage';
import { Download, Trash2, Maximize2, Copy, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';

export function ImageGallery() {
  const { state, removeImage } = useApp();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showMetadata, setShowMetadata] = useState<string | null>(null);

  const handleDownload = (imageUrl: string, prompt: string) => {
    const filename = ImageUtils.generateFilename(prompt);
    ImageUtils.downloadImage(imageUrl, filename);
    toast.success('Image downloaded successfully');
  };

  const handleCopy = async (imageUrl: string) => {
    try {
      await ImageUtils.copyToClipboard(imageUrl);
      toast.success('Image copied to clipboard');
    } catch {
      toast.error('Failed to copy image. Your browser may not support this feature.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this image?')) {
      removeImage(id);
      await storageService.deleteImage(id);
      toast.success('Image deleted');
    }
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const currentIndex = selectedImageIndex;
    const totalImages = state.generatedImages.length;
    
    if (direction === 'prev') {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : totalImages - 1;
      setSelectedImageIndex(newIndex);
      setSelectedImage(state.generatedImages[newIndex].imageUrl);
    } else {
      const newIndex = currentIndex < totalImages - 1 ? currentIndex + 1 : 0;
      setSelectedImageIndex(newIndex);
      setSelectedImage(state.generatedImages[newIndex].imageUrl);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateImage('next'),
    onSwipedRight: () => navigateImage('prev'),
    trackMouse: true,
  });

  if (state.generatedImages.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">Your generated images will appear here</p>
        <p className="text-sm mt-2">Enter a prompt and click Generate to create your first image</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.generatedImages.map((image) => (
          <div
            key={image.id}
            className="group relative bg-secondary/20 rounded-lg overflow-hidden"
          >
            {/* Image */}
            <div className="aspect-square relative">
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => {
                  const index = state.generatedImages.findIndex(img => img.id === image.id);
                  setSelectedImageIndex(index);
                  setSelectedImage(image.imageUrl);
                }}
                loading="lazy"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                  onClick={() => {
                    const index = state.generatedImages.findIndex(img => img.id === image.id);
                    setSelectedImageIndex(index);
                    setSelectedImage(image.imageUrl);
                  }}
                  title="View full size"
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                  onClick={() => handleDownload(image.imageUrl, image.prompt)}
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                  onClick={() => handleCopy(image.imageUrl)}
                  title="Copy to clipboard"
                >
                  <Copy className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10"
                  onClick={() => setShowMetadata(showMetadata === image.id ? null : image.id)}
                  title="Show details"
                >
                  <Info className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-10 w-10"
                  onClick={() => handleDelete(image.id)}
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Prompt preview */}
            <div className="p-3">
              <p className="text-sm text-foreground line-clamp-2">{image.prompt}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(image.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Metadata panel */}
            {showMetadata === image.id && (
              <div className="absolute inset-x-0 bottom-0 bg-background border-t border-border p-3 space-y-2">
                <p className="text-xs font-medium">Generation Details</p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p>Steps: {image.parameters.steps}</p>
                  <p>CFG Scale: {image.parameters.cfgScale}</p>
                  <p>Seed: {image.parameters.seed}</p>
                  <p>Size: {image.parameters.width}x{image.parameters.height}</p>
                  {image.duration && <p>Generation time: {(image.duration / 1000).toFixed(1)}s</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full-screen preview modal with swipe support */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-full max-h-full" {...swipeHandlers}>
            <img
              src={selectedImage}
              alt="Full size preview"
              className="max-w-full max-h-[90vh] object-contain select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
            
            {/* Navigation arrows for desktop */}
            {state.generatedImages.length > 1 && (
              <>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('prev');
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage('next');
                  }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            
            {/* Top controls */}
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  const currentImage = state.generatedImages[selectedImageIndex];
                  handleDownload(currentImage.imageUrl, currentImage.prompt);
                }}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Image counter */}
            {state.generatedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {state.generatedImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}