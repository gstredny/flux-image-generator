import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { RESOLUTIONS } from '../../utils/constants';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Dices, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ParameterControls() {
  const { state, updateParameters } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStepsChange = (value: number[]) => {
    const steps = Math.max(20, Math.min(50, value[0]));
    updateParameters({ steps });
  };

  const handleCfgChange = (value: number[]) => {
    const cfgScale = Math.max(1.0, Math.min(10.0, value[0]));
    updateParameters({ cfgScale });
  };

  const handleSeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty for random seed
    if (value === '') {
      updateParameters({ seed: -1 });
      return;
    }
    
    const seed = parseInt(value, 10);
    
    // Validate seed is a valid number and within reasonable bounds
    if (!isNaN(seed) && seed >= -1 && seed <= 999999999) {
      updateParameters({ seed });
    }
  };

  const handleRandomSeed = () => {
    updateParameters({ seed: -1 });
  };

  const handleResolutionChange = (value: string) => {
    const [width, height] = value.split('x').map(Number);
    updateParameters({ width, height });
  };

  const currentResolution = `${state.currentParameters.width}x${state.currentParameters.height}`;

  return (
    <div className="w-full space-y-6">
      <div className="space-y-4">
        {/* Steps Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Steps</label>
            <span className="text-sm text-muted-foreground">
              {state.currentParameters.steps}
            </span>
          </div>
          <Slider
            value={[state.currentParameters.steps]}
            onValueChange={handleStepsChange}
            min={20}
            max={50}
            step={1}
            disabled={state.isGenerating}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Higher values produce more refined results but take longer
          </p>
        </div>

        {/* CFG Scale Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">CFG Guidance Scale</label>
            <span className="text-sm text-muted-foreground">
              {state.currentParameters.cfgScale.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[state.currentParameters.cfgScale]}
            onValueChange={handleCfgChange}
            min={1.0}
            max={10.0}
            step={0.1}
            disabled={state.isGenerating}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Controls how closely the image follows the prompt (3.5-5.0 recommended)
          </p>
        </div>

        {/* Resolution Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Resolution</label>
          <Select
            value={currentResolution}
            onValueChange={handleResolutionChange}
            disabled={state.isGenerating}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTIONS.map((res) => (
                <SelectItem
                  key={`${res.width}x${res.height}`}
                  value={`${res.width}x${res.height}`}
                >
                  {res.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "w-full flex items-center justify-between",
            "text-sm font-medium text-foreground",
            "hover:text-primary transition-colors"
          )}
        >
          Advanced Settings
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Seed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Seed</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRandomSeed}
                  disabled={state.isGenerating}
                  className="h-7 px-2"
                >
                  <Dices className="h-3 w-3 mr-1" />
                  Random
                </Button>
              </div>
              <input
                type="number"
                value={state.currentParameters.seed === -1 ? '' : state.currentParameters.seed}
                onChange={handleSeedChange}
                placeholder="Random"
                min="0"
                max="999999999"
                disabled={state.isGenerating}
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-background border border-input",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
              <p className="text-xs text-muted-foreground">
                Use the same seed to reproduce results. Leave empty for random.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}