import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { 
  GenerationParameters, 
  ApiResponse, 
  HealthResponse, 
  StatusResponse,
  BatchGenerateResponse,
  ProgressResponse,
  ModelInfo
} from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// Extend Axios config to include retry count and start time
interface AxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  retry?: number;
  startTime?: number;
}

/**
 * Service for handling all API communication with the backend.
 * Implements retry logic, error handling, and request/response logging.
 */
class ApiService {
  private client: AxiosInstance;
  private readonly retryCount = 3;
  private readonly retryDelay = 1000; // Start with 1 second

  constructor() {
    const baseURL = this.getApiEndpoint();
    
    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minute timeout for image generation
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        // Add timestamp for duration calculation
        // Add timestamp for duration calculation
        const configWithTime = config as AxiosRequestConfigWithRetry;
        configWithTime.startTime = Date.now();
        
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      error => {
        console.error('❌ Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for retry logic and logging
    this.client.interceptors.response.use(
      response => {
        console.log(`✅ Response from ${response.config.url}:`, {
          status: response.status,
          data: response.data,
          duration: `${Date.now() - ((response.config as AxiosRequestConfigWithRetry).startTime || 0)}ms`,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      this.handleError.bind(this)
    );
  }

  /**
   * Gets the API endpoint from localStorage, environment variable, or default.
   * Priority: localStorage > env variable > default localhost
   * @returns The API endpoint URL
   */
  private getApiEndpoint(): string {
    const stored = localStorage.getItem(STORAGE_KEYS.apiEndpoint);
    // Trim whitespace from stored value if it exists
    if (stored) {
      return stored.trim().replace(/\/+$/, '');
    }
    return import.meta.env.VITE_API_ENDPOINT || 'http://localhost:7860';
  }

  /**
   * Updates the API endpoint and stores it in localStorage.
   * @param endpoint - The new API endpoint URL
   */
  public updateApiEndpoint(endpoint: string): void {
    // Trim whitespace and remove trailing slashes
    const sanitizedEndpoint = endpoint.trim().replace(/\/+$/, '');
    
    console.log('🔧 Updating API endpoint:', {
      from: this.client.defaults.baseURL,
      to: sanitizedEndpoint
    });
    
    localStorage.setItem(STORAGE_KEYS.apiEndpoint, sanitizedEndpoint);
    this.client.defaults.baseURL = sanitizedEndpoint;
    // Ensure ngrok header is preserved
    this.client.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
  }

  /**
   * Handles axios errors with exponential backoff retry logic.
   * @param error - The axios error to handle
   * @returns Promise that either retries the request or rejects with the error
   */
  private async handleError(error: AxiosError): Promise<unknown> {
    const config = error.config as AxiosRequestConfigWithRetry;
    
    if (!config) {
      return Promise.reject(error);
    }
    
    if (!config.retry) {
      config.retry = 0;
    }

    if (config.retry >= this.retryCount) {
      return Promise.reject(error);
    }

    config.retry += 1;

    // Exponential backoff
    const delayMs = this.retryDelay * Math.pow(2, config.retry - 1);
    
    console.warn(`🔄 Retrying request (${config.retry}/${this.retryCount}) after ${delayMs}ms...`, {
      url: config.url,
      error: error.message
    });
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return this.client(config);
  }

  /**
   * Checks if the backend API is healthy and responsive.
   * @returns HealthResponse indicating server status
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await this.client.get<any>('/health');
      // Map the response to match our expected format
      const data = response.data;
      
      // Handle KREA backend format
      if (data.premium && data.model_loaded !== undefined) {
        return {
          status: data.model_loaded ? 'healthy' : 'unhealthy',
          model: data.model || 'FLUX.1-Krea-dev',
          version: data.version || '1.0.0' // Provide default version for KREA
        };
      }
      
      // Handle standard format
      return {
        status: (data.status === 'alive' || data.status === 'healthy') ? 'healthy' : 'unhealthy',
        model: data.model,
        version: data.version || '1.0.0' // Default version if not provided
      };
    } catch (error) {
      console.error('❌ Health check failed:', {
        error: error instanceof Error ? error.message : String(error),
        code: axios.isAxiosError(error) ? error.code : undefined,
        endpoint: this.client.defaults.baseURL
      });
      
      // Provide detailed error information
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.error('🔌 Connection refused. Make sure the backend is running on the specified endpoint.');
        } else if (error.code === 'ERR_NETWORK') {
          console.error('🌐 Network error. Check your internet connection and CORS settings.');
        }
      }
      
      return { status: 'unhealthy' };
    }
  }

  /**
   * Checks the model loading status on the backend.
   * @returns Status object with model loading information
   */
  async checkStatus(): Promise<{ status: string; model_loaded: boolean; message?: string }> {
    try {
      const response = await this.client.get<any>('/status');
      
      // Handle both model_loaded and models_loaded fields
      const data = response.data;
      
      // Handle KREA format
      if (data.premium) {
        return {
          status: data.status || 'ok',
          model_loaded: data.models_loaded ?? data.model_loaded ?? false,
          message: data.progress || data.message || (data.models_loading ? 'Models are loading...' : undefined)
        };
      }
      
      return {
        status: data.status || 'ok',
        model_loaded: data.model_loaded ?? data.models_loaded ?? false,
        message: data.message || (data.models_loading ? 'Models are loading...' : undefined)
      };
    } catch (error) {
      console.error('❌ Status check failed:', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: `${this.client.defaults.baseURL}/status`
      });
      return { status: 'error', model_loaded: false, message: 'Unable to check status' };
    }
  }

  /**
   * Generates an image based on the provided parameters.
   * @param parameters - The generation parameters including prompt, dimensions, etc.
   * @returns ApiResponse with the generated image or error information
   * @throws Error with user-friendly message if generation fails
   */
  async generateImage(parameters: GenerationParameters): Promise<ApiResponse> {
    try {
      const startTime = Date.now();
      
      // Log generation request
      console.log('🎨 Starting image generation:', {
        prompt: parameters.prompt.substring(0, 50) + '...',
        parameters: {
          width: parameters.width,
          height: parameters.height,
          steps: parameters.steps,
          cfgScale: parameters.cfgScale,
          seed: parameters.seed
        }
      });
      
      const response = await this.client.post<ApiResponse>('/generate', {
        prompt: parameters.prompt,
        width: parameters.width,
        height: parameters.height,
        cfg_guidance: parameters.cfgScale, // Map frontend cfgScale to backend cfg_guidance
        steps: parameters.steps,
        seed: parameters.seed === -1 ? Math.floor(Math.random() * 1000000) : parameters.seed,
      });

      const duration = Date.now() - startTime;
      
      return {
        ...response.data,
        duration,
      };
    } catch (error) {
      console.error('❌ Generation failed:', {
        error: error instanceof Error ? error.message : String(error),
        response: axios.isAxiosError(error) ? error.response?.data : undefined,
        status: axios.isAxiosError(error) ? error.response?.status : undefined
      });
      
      if (axios.isAxiosError(error)) {
        // Service unavailable - models loading
        if (error.response?.status === 503) {
          throw new Error('🔄 AI models are still loading. This usually takes 1-2 minutes on first start. Please wait and try again.');
        }
        
        // Bad request - invalid parameters
        if (error.response?.status === 400) {
          const details = error.response.data?.detail || error.response.data?.error || '';
          throw new Error(`❌ Invalid parameters: ${details}`);
        }
        
        // Server error
        if (error.response?.status === 500) {
          throw new Error('⚠️ Server error. The backend encountered an issue. Please check the logs.');
        }
        
        // Custom error from backend
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        
        // Connection errors
        if (error.code === 'ECONNABORTED') {
          throw new Error('⏱️ Request timed out after 2 minutes. The image might be too complex or the backend is overloaded.');
        }
        
        if (error.code === 'ERR_NETWORK') {
          throw new Error('🌐 Network error. Please check:\n• Backend is running\n• API endpoint is correct\n• No firewall blocking the connection');
        }
        
        if (error.code === 'ECONNREFUSED') {
          throw new Error('🔌 Connection refused. The backend server is not running at the specified endpoint.');
        }
      }
      
      // Generic error with more context
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate image: ${errorMsg}`);
    }
  }

  /**
   * Fetches the list of available models from the backend.
   * @returns Array of model names, or empty array if fetch fails
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get<{ models: string[] }>('/models');
      return response.data.models || [];
    } catch (error) {
      console.error('❌ Failed to fetch models:', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: `${this.client.defaults.baseURL}/models`
      });
      return [];
    }
  }

  /**
   * Generates multiple images in batch.
   * @param prompts - Array of prompts to generate
   * @param parameters - Generation parameters for all images
   * @returns BatchGenerateResponse with request IDs for tracking
   */
  async generateBatch(prompts: string[], parameters: Omit<GenerationParameters, 'prompt'>): Promise<BatchGenerateResponse> {
    try {
      console.log('🎨 Starting batch generation:', {
        count: prompts.length,
        parameters
      });

      const response = await this.client.post<BatchGenerateResponse>('/generate/batch', {
        prompts,
        steps: parameters.steps,
        cfg_guidance: parameters.cfgScale,
        width: parameters.width,
        height: parameters.height,
        negative_prompt: ''
      });

      return response.data;
    } catch (error) {
      console.error('❌ Batch generation failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 503) {
          throw new Error('🔄 Models are still loading. Please wait and try again.');
        }
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }
      
      throw new Error('Failed to start batch generation');
    }
  }

  /**
   * Checks the progress of a generation request.
   * @param requestId - The request ID to check
   * @returns ProgressResponse with current status and progress
   */
  async checkProgress(requestId: string): Promise<ProgressResponse> {
    try {
      const response = await this.client.get<ProgressResponse>(`/progress/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Progress check failed:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error('Request ID not found');
      }
      
      throw new Error('Failed to check progress');
    }
  }

  /**
   * Polls for generation completion with progress updates.
   * @param requestId - The request ID to poll
   * @param onProgress - Callback for progress updates
   * @param timeout - Maximum time to wait in milliseconds
   * @returns The completed result or throws an error
   */
  async pollForCompletion(
    requestId: string, 
    onProgress?: (progress: number) => void,
    timeout: number = 300000 // 5 minutes
  ): Promise<{ images: string[]; seed: number; duration: number }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const progress = await this.checkProgress(requestId);
      
      if (onProgress) {
        onProgress(progress.progress);
      }
      
      if (progress.status === 'completed' && progress.result) {
        return progress.result;
      }
      
      if (progress.status === 'failed') {
        throw new Error(progress.error || 'Generation failed');
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Generation timeout');
  }

  /**
   * Gets detailed model information including T5 and CLIP status.
   * @returns Array of ModelInfo objects
   */
  async getModelsInfo(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.get<{ models: ModelInfo[] }>('/models');
      return response.data.models || [];
    } catch (error) {
      console.error('❌ Failed to fetch model info:', error);
      return [];
    }
  }

  /**
   * Gets extended status with queue and progress information.
   * @returns Extended StatusResponse
   */
  async getExtendedStatus(): Promise<StatusResponse> {
    try {
      const response = await this.client.get<StatusResponse>('/status');
      return response.data;
    } catch (error) {
      console.error('❌ Extended status check failed:', error);
      return {
        status: 'error',
        model_loaded: false,
        progress: 0
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Extend axios config to include retry property
declare module 'axios' {
  export interface AxiosRequestConfig {
    retry?: number;
  }
}