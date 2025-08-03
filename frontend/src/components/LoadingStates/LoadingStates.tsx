import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingStatesProps {
  state: 'connecting' | 'loading-models' | 'generating';
  className?: string;
  progress?: number;
  message?: string;
}

export function LoadingStates({ state, className, progress, message }: LoadingStatesProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-4", className)}>
      <div className="relative">
        {state === 'generating' ? (
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
        ) : (
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        )}
      </div>
      
      <div className="text-center space-y-2">
        {state === 'connecting' && (
          <>
            <p className="text-lg font-medium">Connecting to AI backend...</p>
            <p className="text-sm text-muted-foreground">
              Establishing connection with Google Colab
            </p>
          </>
        )}
        
        {state === 'loading-models' && (
          <>
            <p className="text-lg font-medium">
              {message || 'AI models are loading...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {progress !== undefined ? (
                <>Loading progress: {progress}%</>
              ) : (
                'This may take a moment. The models are being initialized.'
              )}
            </p>
            {message?.includes('T5-XXL') && (
              <p className="text-xs text-muted-foreground mt-1">
                Loading Google's T5-XXL (11B parameters) for enhanced text understanding
              </p>
            )}
          </>
        )}
        
        {state === 'generating' && (
          <>
            <p className="text-lg font-medium">Creating your masterpiece...</p>
            <p className="text-sm text-muted-foreground">
              AI is working on your image. This usually takes 20-30 seconds.
            </p>
          </>
        )}
      </div>
      
      {/* Progress indicator */}
      {(state === 'generating' || (state === 'loading-models' && progress !== undefined)) && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            {progress !== undefined ? (
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            ) : (
              <div className="h-full bg-primary rounded-full animate-progress" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}