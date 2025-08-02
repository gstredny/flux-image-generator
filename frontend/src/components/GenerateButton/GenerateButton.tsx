import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface GenerateButtonProps {
  onClick: () => void;
}

export function GenerateButton({ onClick }: GenerateButtonProps) {
  const { state } = useApp();
  const isDisabled = state.isGenerating || !state.currentParameters.prompt.trim();

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      size="lg"
      className={cn(
        "w-full h-14 text-base font-semibold",
        "bg-gradient-to-r from-primary to-primary-600",
        "hover:from-primary/90 hover:to-primary-600/90",
        "disabled:from-primary/50 disabled:to-primary-600/50",
        "transition-all duration-300",
        "touch-manipulation", // Improve mobile touch response
        state.isGenerating && "animate-pulse"
      )}
    >
      {state.isGenerating ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Image
        </>
      )}
    </Button>
  );
}