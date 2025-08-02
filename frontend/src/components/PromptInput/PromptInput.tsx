import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { EXAMPLE_PROMPTS } from '../../utils/constants';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';

export function PromptInput() {
  const { state, updateParameters } = useApp();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rows, setRows] = useState(3);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newRows = Math.min(Math.max(3, Math.ceil(scrollHeight / 24)), 10);
      setRows(newRows);
    }
  }, [state.currentParameters.prompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateParameters({ prompt: e.target.value });
  };

  const handleSuggestionClick = (prompt: string) => {
    updateParameters({ prompt });
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      // This will be handled by the parent component that listens for the generate event
      const event = new CustomEvent('generate');
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="prompt" className="text-sm font-medium text-foreground">
            Prompt
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {state.currentParameters.prompt.length} characters
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="h-7 px-2"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Examples
              <ChevronDown
                className={cn(
                  "h-3 w-3 ml-1 transition-transform",
                  showSuggestions && "rotate-180"
                )}
              />
            </Button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          id="prompt"
          value={state.currentParameters.prompt}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          rows={rows}
          placeholder="Describe the image you want to create..."
          className={cn(
            "w-full px-4 py-3 rounded-lg",
            "bg-background border border-input",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "resize-none scrollbar-thin transition-all duration-200",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          disabled={state.isGenerating}
        />

        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50">
            <div className="bg-popover border border-border rounded-lg shadow-lg p-4 space-y-4 max-h-96 overflow-y-auto scrollbar-thin">
              {EXAMPLE_PROMPTS.map((category) => (
                <div key={category.category}>
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    {category.category}
                  </h4>
                  <div className="space-y-2">
                    {category.prompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(prompt)}
                        className={cn(
                          "w-full text-left p-3 rounded-md",
                          "bg-secondary/50 hover:bg-secondary",
                          "text-xs text-secondary-foreground",
                          "transition-colors duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-medium">Tip:</span> Be specific and descriptive. Include style, mood, lighting, and details for better results.
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl+Enter</kbd> to generate.
      </div>
    </div>
  );
}