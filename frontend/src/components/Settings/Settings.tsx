import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { apiService } from '../../services/api';
import { storageService } from '../../services/storage';
import { X, Wifi, WifiOff, RefreshCw, Download, Upload, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { isValidUrl, detectUrlIssues, sanitizeUrl } from '../../utils/validation';
import toast from 'react-hot-toast';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [apiUrl, setApiUrl] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    // Load saved API URL
    const preferences = storageService.getPreferences();
    setApiUrl(preferences.apiEndpoint);
  }, []);


  const handleSaveUrl = () => {
    const trimmedUrl = sanitizeUrl(apiUrl);
    
    // Check for URL issues
    const urlIssue = detectUrlIssues(apiUrl);
    if (urlIssue) {
      toast.error(urlIssue);
      return;
    }
    
    if (!isValidUrl(trimmedUrl)) {
      toast.error('Please enter a valid URL (e.g., https://abc123.ngrok.io)');
      return;
    }

    apiService.updateApiEndpoint(trimmedUrl);
    const preferences = storageService.getPreferences();
    storageService.savePreferences({
      ...preferences,
      apiEndpoint: trimmedUrl,
    });
    
    toast.success('API endpoint updated successfully');
    
    // Trigger a connection check
    window.dispatchEvent(new Event('api-endpoint-changed'));
  };

  const handleTestConnection = async () => {
    const trimmedUrl = sanitizeUrl(apiUrl);
    
    // Check for URL issues
    const urlIssue = detectUrlIssues(apiUrl);
    if (urlIssue) {
      toast.error(urlIssue);
      return;
    }
    
    if (!isValidUrl(trimmedUrl)) {
      toast.error('Please enter a valid URL first');
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);
    
    // Debug logging
    console.log('Testing connection to:', trimmedUrl);

    try {
      console.log('Checking health endpoint...');
      const health = await apiService.checkHealth();
      console.log('Health response:', health);
      
      console.log('Checking status endpoint...');
      const status = await apiService.checkStatus();
      console.log('Status response:', status);
      
      if (health.status === 'healthy' && status.model_loaded) {
        setConnectionTestResult('success');
        toast.success('Connection successful! Backend is ready.');
      } else if (health.status === 'healthy' && !status.model_loaded) {
        setConnectionTestResult('success');
        const message = status.message || 'Connected, but models are still loading. Please wait 2-3 minutes.';
        toast(message, {
          icon: '⚠️',
          duration: 5000,
        });
      } else {
        setConnectionTestResult('error');
        toast.error('Connection failed. Please check your backend.');
      }
    } catch {
      setConnectionTestResult('error');
      toast.error('Unable to connect to backend. Please check the URL and try again.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all generated images?')) {
      await storageService.clearHistory();
      window.location.reload();
    }
  };

  const handleExportSettings = () => {
    const preferences = storageService.getPreferences();
    const data = JSON.stringify(preferences, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flux-krea-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully');
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        storageService.savePreferences(settings);
        setApiUrl(settings.apiEndpoint || '');
        toast.success('Settings imported successfully');
      } catch {
        toast.error('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* API Endpoint Configuration */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Backend URL (Kaggle/Colab)
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                onBlur={(e) => setApiUrl(sanitizeUrl(e.target.value))}
                placeholder="https://abc123.ngrok.io"
                className={cn(
                  "w-full px-3 py-2 rounded-md",
                  "bg-background border border-input",
                  "text-sm text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the ngrok URL from your Kaggle or Google Colab notebook
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveUrl}
                className="flex-1"
                disabled={!apiUrl || !isValidUrl(sanitizeUrl(apiUrl))}
              >
                Save URL
              </Button>
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={!apiUrl || isTestingConnection}
                className="flex-1"
              >
                {isTestingConnection ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    {connectionTestResult === 'success' ? (
                      <Wifi className="mr-2 h-4 w-4 text-green-500" />
                    ) : connectionTestResult === 'error' ? (
                      <WifiOff className="mr-2 h-4 w-4 text-red-500" />
                    ) : (
                      <Wifi className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Debug Section - Remove after fixing */}
          <div className="mt-4 p-3 bg-yellow-100/10 dark:bg-yellow-900/10 border border-yellow-200/20 rounded-md">
            <p className="text-xs font-medium mb-2">Debug Tools</p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const trimmedUrl = sanitizeUrl(apiUrl);
                console.log('Direct fetch test to:', `${trimmedUrl}/health`);
                try {
                  const response = await fetch(`${trimmedUrl}/health`);
                  const text = await response.text();
                  console.log('Direct fetch response:', response.status, text);
                  alert(`Status: ${response.status}\nResponse: ${text}`);
                } catch (error) {
                  console.error('Direct fetch error:', error);
                  alert(`Error: ${error}`);
                }
              }}
            >
              Test Direct Fetch
            </Button>
          </div>

          {/* Quick Style Presets */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Quick Style Presets</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = { cfgScale: 3.5, steps: 25 };
                  const prefs = storageService.getPreferences();
                  storageService.savePreferences({
                    ...prefs,
                    defaultParameters: { ...prefs.defaultParameters, ...params }
                  });
                  toast.success('Fast generation preset applied');
                }}
              >
                Fast (25 steps)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = { cfgScale: 4.5, steps: 30 };
                  const prefs = storageService.getPreferences();
                  storageService.savePreferences({
                    ...prefs,
                    defaultParameters: { ...prefs.defaultParameters, ...params }
                  });
                  toast.success('Balanced preset applied');
                }}
              >
                Balanced (30 steps)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = { cfgScale: 5.0, steps: 40 };
                  const prefs = storageService.getPreferences();
                  storageService.savePreferences({
                    ...prefs,
                    defaultParameters: { ...prefs.defaultParameters, ...params }
                  });
                  toast.success('Quality preset applied');
                }}
              >
                Quality (40 steps)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const params = { cfgScale: 7.0, steps: 50 };
                  const prefs = storageService.getPreferences();
                  storageService.savePreferences({
                    ...prefs,
                    defaultParameters: { ...prefs.defaultParameters, ...params }
                  });
                  toast.success('Ultra preset applied');
                }}
              >
                Ultra (50 steps)
              </Button>
            </div>
          </div>

          {/* Data Management */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Data Management</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleClearHistory}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Image History
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportSettings}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Settings
              </Button>
              <label className="w-full">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  type="button"
                  onClick={() => document.getElementById('import-settings')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import Settings
                </Button>
                <input
                  id="import-settings"
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* About */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>FLUX Krea Image Generator v1.0</p>
            <p>Connected to Kaggle/Colab backend</p>
          </div>
        </div>
      </div>
    </div>
  );
}