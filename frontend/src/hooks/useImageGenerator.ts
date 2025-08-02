import { useCallback, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import type { GeneratedImage } from '../types';
import toast from 'react-hot-toast';

export function useImageGenerator() {
  const { state, setGenerating, addImage, setError, setConnectionStatus, setImages } = useApp();

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const images = await storageService.getImages();
        setImages(images);
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };
    loadHistory();
  }, [setImages]);

  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      setConnectionStatus('checking');
      try {
        const health = await apiService.checkHealth();
        const status = await apiService.checkStatus();
        
        if (health.status === 'healthy' && status.model_loaded) {
          setConnectionStatus('connected');
        } else if (health.status === 'healthy' && !status.model_loaded) {
          setConnectionStatus('connected');
          const message = status.message || 'Backend is connected but models are still loading.';
          toast(message, {
            icon: '⚠️',
            duration: 5000,
          });
        } else {
          setConnectionStatus('disconnected');
        }
      } catch {
        setConnectionStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    // Listen for API endpoint changes
    const handleApiChange = () => {
      checkConnection();
    };
    window.addEventListener('api-endpoint-changed', handleApiChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('api-endpoint-changed', handleApiChange);
    };
  }, [setConnectionStatus]);

  const generateImage = useCallback(async () => {
    // Validate prompt
    const prompt = state.currentParameters.prompt.trim();
    if (!prompt) {
      toast.error('Please enter a prompt');
      return;
    }
    
    if (prompt.length > 1000) {
      toast.error('Prompt is too long. Please keep it under 1000 characters.');
      return;
    }

    // Validate connection
    if (state.connectionStatus === 'disconnected') {
      toast.error('Backend is disconnected. Please check your connection.');
      return;
    }
    
    // Validate parameters
    const { width, height, steps, cfgScale } = state.currentParameters;
    
    if (width < 512 || width > 2048 || height < 512 || height > 2048) {
      toast.error('Image dimensions must be between 512 and 2048 pixels.');
      return;
    }
    
    if (steps < 20 || steps > 50) {
      toast.error('Steps must be between 20 and 50.');
      return;
    }
    
    if (cfgScale < 1 || cfgScale > 10) {
      toast.error('CFG Scale must be between 1 and 10.');
      return;
    }

    setGenerating(true);
    setError(null);

    const toastId = toast.loading('Generating your image...');

    try {
      const response = await apiService.generateImage(state.currentParameters);

      if (!response.success || !response.image) {
        throw new Error(response.error || 'Failed to generate image');
      }

      // Create full image URL
      const imageUrl = response.image.startsWith('data:') 
        ? response.image 
        : `data:image/png;base64,${response.image}`;

      const generatedImage: GeneratedImage = {
        id: crypto.randomUUID(),
        prompt: prompt,  // Use the trimmed prompt
        parameters: { ...state.currentParameters, prompt },  // Ensure trimmed prompt is saved
        imageUrl,
        timestamp: Date.now(),
        duration: response.duration,
      };

      // Add to state and save to storage
      addImage(generatedImage);
      await storageService.saveImage(generatedImage);

      toast.success('Image generated successfully!', { id: toastId });
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setGenerating(false);
    }
  }, [state.currentParameters, state.connectionStatus, setGenerating, setError, addImage]);

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [generateImage]);

  // Listen for generate events
  useEffect(() => {
    const handleGenerate = () => generateImage();
    window.addEventListener('generate', handleGenerate);
    return () => window.removeEventListener('generate', handleGenerate);
  }, [generateImage]);

  const retryConnection = useCallback(() => {
    window.dispatchEvent(new Event('api-endpoint-changed'));
  }, []);

  return {
    generateImage,
    isGenerating: state.isGenerating,
    connectionStatus: state.connectionStatus,
    error: state.error,
    retryConnection,
  };
}