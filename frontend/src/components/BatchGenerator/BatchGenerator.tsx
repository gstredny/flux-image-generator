import React, { useState } from 'react';
import { Button } from '../ui/button';
import { apiService } from '../../services/api';
import { useApp } from '../../contexts/AppContext';
import type { GeneratedImage } from '../../types';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';

interface BatchPrompt {
  id: string;
  text: string;
}

interface BatchProgress {
  requestId: string;
  prompt: string;
  progress: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

export const BatchGenerator: React.FC = () => {
  const { state: { currentParameters }, addImage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [prompts, setPrompts] = useState<BatchPrompt[]>([
    { id: '1', text: '' }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([]);

  const addPrompt = () => {
    if (prompts.length < 4) {
      setPrompts([...prompts, { id: Date.now().toString(), text: '' }]);
    }
  };

  const removePrompt = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  const updatePrompt = (id: string, text: string) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, text } : p));
  };

  const handleBatchGenerate = async () => {
    const validPrompts = prompts.filter(p => p.text.trim()).map(p => p.text);
    
    if (validPrompts.length === 0) {
      return;
    }

    setIsGenerating(true);
    setBatchProgress([]);

    try {
      // Start batch generation
      const response = await apiService.generateBatch(validPrompts, {
        steps: currentParameters.steps,
        cfgScale: currentParameters.cfgScale,
        width: currentParameters.width,
        height: currentParameters.height,
        seed: -1
      });

      if (!response.success || !response.request_ids) {
        throw new Error(response.error || 'Failed to start batch generation');
      }

      // Initialize progress tracking
      const initialProgress: BatchProgress[] = response.request_ids.map((id, index) => ({
        requestId: id,
        prompt: validPrompts[index],
        progress: 0,
        status: 'queued' as const
      }));
      setBatchProgress(initialProgress);

      // Poll for completion
      for (let i = 0; i < response.request_ids.length; i++) {
        const requestId = response.request_ids[i];
        const prompt = validPrompts[i];

        // Poll this request
        pollRequest(requestId, prompt, i);
      }
    } catch (error) {
      console.error('Batch generation error:', error);
      setIsGenerating(false);
    }
  };

  const pollRequest = async (requestId: string, prompt: string, index: number) => {
    try {
      const result = await apiService.pollForCompletion(
        requestId,
        (progress) => {
          setBatchProgress(prev => prev.map((p, i) => 
            i === index ? { ...p, progress, status: 'processing' } : p
          ));
        }
      );

      // Generation completed
      if (result.images && result.images[0]) {
        const imageUrl = result.images[0];
        
        // Update progress
        setBatchProgress(prev => prev.map((p, i) => 
          i === index ? { 
            ...p, 
            progress: 100, 
            status: 'completed',
            imageUrl 
          } : p
        ));

        // Add to gallery
        const newImage: GeneratedImage = {
          id: `batch-${Date.now()}-${index}`,
          prompt,
          parameters: {
            ...currentParameters,
            seed: result.seed
          },
          imageUrl,
          timestamp: Date.now(),
          duration: result.duration
        };
        addImage(newImage);
      }
    } catch (error) {
      // Handle error
      setBatchProgress(prev => prev.map((p, i) => 
        i === index ? { 
          ...p, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Generation failed'
        } : p
      ));
    } finally {
      // Check if all are done
      setBatchProgress(prev => {
        const allDone = prev.every(p => p.status === 'completed' || p.status === 'failed');
        if (allDone) {
          setIsGenerating(false);
        }
        return prev;
      });
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="flex items-center space-x-2"
      >
        <Sparkles className="w-4 h-4" />
        <span>Batch Mode</span>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Batch Generation</h2>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={prompt.id} className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prompt {index + 1}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prompt.text}
                    onChange={(e) => updatePrompt(prompt.id, e.target.value)}
                    placeholder="Enter your prompt..."
                    className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    disabled={isGenerating}
                  />
                  {prompts.length > 1 && (
                    <Button
                      onClick={() => removePrompt(prompt.id)}
                      variant="ghost"
                      size="icon"
                      disabled={isGenerating}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {prompts.length < 4 && (
            <Button
              onClick={addPrompt}
              variant="outline"
              className="w-full"
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Prompt
            </Button>
          )}

          {batchProgress.length > 0 && (
            <div className="space-y-2 mt-4">
              <h3 className="font-semibold">Progress</h3>
              {batchProgress.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate flex-1">{item.prompt}</span>
                    <span className="ml-2">
                      {item.status === 'completed' ? '✅' : 
                       item.status === 'failed' ? '❌' :
                       item.status === 'processing' ? '🎨' : '⏳'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        item.status === 'failed' ? 'bg-red-500' :
                        item.status === 'completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="text-xs text-red-500">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleBatchGenerate}
            disabled={isGenerating || prompts.every(p => !p.text.trim())}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Batch
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};