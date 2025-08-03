import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PromptInput } from './components/PromptInput';
import { ParameterControls } from './components/ParameterControls';
import { GenerateButton } from './components/GenerateButton';
import { ImageGallery } from './components/ImageGallery';
import { Settings } from './components/Settings';
import { LoadingStates } from './components/LoadingStates';
import { DreamFactoryHeader } from './components/DreamFactoryHeader';
import { BatchGenerator } from './components/BatchGenerator';
import { useImageGenerator } from './hooks/useImageGenerator';
import { useTheme } from './contexts/ThemeContext';
import { useApp } from './contexts/AppContext';
import { Sun, Moon, Laptop, Settings as SettingsIcon } from 'lucide-react';
import { Button } from './components/ui/button';
import { apiService } from './services/api';

function AppContent() {
  const { generateImage, connectionStatus } = useImageGenerator();
  const { theme, setTheme } = useTheme();
  const { state } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [modelStatus, setModelStatus] = useState<{
    progress?: number;
    message?: string;
  }>({});

  // Poll for model loading status
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const checkModelStatus = async () => {
        try {
          const status = await apiService.getExtendedStatus();
          setModelStatus({
            progress: status.progress,
            message: status.status
          });
          
          // Stop polling if model is loaded
          if (status.model_loaded) {
            return true;
          }
          return false;
        } catch (error) {
          console.error('Failed to get status:', error);
          return false;
        }
      };

      // Check immediately
      checkModelStatus();

      // Then poll every 2 seconds until loaded
      const interval = setInterval(async () => {
        const isLoaded = await checkModelStatus();
        if (isLoaded) {
          clearInterval(interval);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [connectionStatus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Dream Factory Header */}
      <DreamFactoryHeader connectionStatus={connectionStatus} />
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        {/* Settings and Theme Controls */}
        <div className="mb-6 flex justify-end items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-10 w-10"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={theme === 'light' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme('light')}
            >
              <Sun className="h-4 w-4" />
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme('dark')}
            >
              <Moon className="h-4 w-4" />
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme('system')}
            >
              <Laptop className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <PromptInput />
              <ParameterControls />
              <div className="space-y-3">
                <GenerateButton onClick={generateImage} />
                <BatchGenerator />
              </div>
            </div>
          </div>

          {/* Right Panel - Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6 min-h-[600px]">
              <h2 className="text-xl font-semibold mb-4">Generated Images</h2>
              {connectionStatus === 'checking' ? (
                <LoadingStates state="connecting" />
              ) : connectionStatus === 'connected' && modelStatus.progress !== undefined && modelStatus.progress < 100 ? (
                <LoadingStates 
                  state="loading-models" 
                  progress={modelStatus.progress}
                  message={modelStatus.message}
                />
              ) : state.isGenerating ? (
                <LoadingStates state="generating" />
              ) : (
                <ImageGallery />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
        <Toaster
          position="top-center"
          toastOptions={{
            className: 'bg-background text-foreground border border-border',
            duration: 4000,
            style: {
              marginTop: '60px', // Account for header
            },
          }}
        />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;