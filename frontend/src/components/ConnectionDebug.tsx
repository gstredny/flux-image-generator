import { useState } from 'react';
import { Button } from './ui/button';
import { apiService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

export function ConnectionDebug() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runDebugTests = async () => {
    setIsLoading(true);
    setDebugInfo('Starting debug tests...\n\n');
    
    const apiUrl = localStorage.getItem(STORAGE_KEYS.apiEndpoint) || '';
    setDebugInfo(prev => prev + `API URL: ${apiUrl}\n\n`);

    // Test 1: Direct fetch to health endpoint
    try {
      setDebugInfo(prev => prev + '1. Testing direct fetch to /health...\n');
      const healthResponse = await fetch(`${apiUrl}/health`);
      const healthText = await healthResponse.text();
      setDebugInfo(prev => prev + `Response status: ${healthResponse.status}\n`);
      setDebugInfo(prev => prev + `Response text: ${healthText}\n\n`);
    } catch (error) {
      setDebugInfo(prev => prev + `Health fetch error: ${error}\n\n`);
    }

    // Test 2: Direct fetch to status endpoint
    try {
      setDebugInfo(prev => prev + '2. Testing direct fetch to /status...\n');
      const statusResponse = await fetch(`${apiUrl}/status`);
      const statusText = await statusResponse.text();
      setDebugInfo(prev => prev + `Response status: ${statusResponse.status}\n`);
      setDebugInfo(prev => prev + `Response text: ${statusText}\n\n`);
    } catch (error) {
      setDebugInfo(prev => prev + `Status fetch error: ${error}\n\n`);
    }

    // Test 3: API service health check
    try {
      setDebugInfo(prev => prev + '3. Testing API service health check...\n');
      const health = await apiService.checkHealth();
      setDebugInfo(prev => prev + `Health result: ${JSON.stringify(health, null, 2)}\n\n`);
    } catch (error) {
      setDebugInfo(prev => prev + `API service health error: ${error}\n\n`);
    }

    // Test 4: API service status check
    try {
      setDebugInfo(prev => prev + '4. Testing API service status check...\n');
      const status = await apiService.checkStatus();
      setDebugInfo(prev => prev + `Status result: ${JSON.stringify(status, null, 2)}\n\n`);
    } catch (error) {
      setDebugInfo(prev => prev + `API service status error: ${error}\n\n`);
    }

    setDebugInfo(prev => prev + 'Debug tests complete!');
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Connection Debug Tool</h3>
      <Button 
        onClick={runDebugTests} 
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? 'Running tests...' : 'Run Debug Tests'}
      </Button>
      
      {debugInfo && (
        <pre className="bg-black/10 dark:bg-white/10 p-3 rounded-md text-xs overflow-auto max-h-96">
          {debugInfo}
        </pre>
      )}
    </div>
  );
}