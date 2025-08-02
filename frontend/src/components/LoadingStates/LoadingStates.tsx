import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingStatesProps {
  state: 'connecting' | 'loading-models' | 'generating';
  className?: string;
}

export function LoadingStates({ state, className }: LoadingStatesProps) {
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
            <p className="text-lg font-medium">AI models are loading...</p>
            <p className="text-sm text-muted-foreground">
              This may take a moment. The models are being initialized.
            </p>
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
      
      {/* Progress indicator for generating state */}
      {state === 'generating' && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-progress" />
          </div>
        </div>
      )}
    </div>
  );
}