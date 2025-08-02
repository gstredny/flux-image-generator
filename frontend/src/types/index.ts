/**
 * Parameters for image generation
 */
export interface GenerationParameters {
  /** The text prompt describing the desired image */
  prompt: string;
  /** Number of denoising steps (20-50, default: 30) */
  steps: number;
  /** Classifier-free guidance scale (1.0-10.0, default: 4.0) */
  cfgScale: number;
  /** Random seed for reproducibility (-1 for random) */
  seed: number;
  /** Image width in pixels (512-2048) */
  width: number;
  /** Image height in pixels (512-2048) */
  height: number;
}

/**
 * Represents a generated image with metadata
 */
export interface GeneratedImage {
  /** Unique identifier for the image */
  id: string;
  /** The prompt used to generate the image */
  prompt: string;
  /** Full parameters used for generation */
  parameters: GenerationParameters;
  /** Data URL of the generated image (base64) */
  imageUrl: string;
  /** Unix timestamp when the image was generated */
  timestamp: number;
  /** Time taken to generate the image in seconds */
  duration?: number;
}

/**
 * Response from the image generation API
 */
export interface ApiResponse {
  /** Whether the generation was successful */
  success: boolean;
  /** Base64 encoded image data (with or without data URL prefix) */
  image?: string;
  /** The prompt that was used */
  prompt?: string;
  /** Parameters returned by the backend */
  parameters?: {
    width: number;
    height: number;
    guidance: number;
    num_steps: number;
    seed: number;
  };
  /** Error message if generation failed */
  error?: string;
  /** Server-side generation duration in seconds */
  duration?: number;
}

/**
 * Health check response from the API
 */
export interface HealthResponse {
  /** Current health status of the API */
  status: "healthy" | "unhealthy";
  /** Model identifier being used */
  model?: string;
  /** API version */
  version?: string;
}

/**
 * User preferences stored in localStorage
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: "light" | "dark" | "system";
  /** Custom API endpoint URL */
  apiEndpoint: string;
  /** Default parameters for new generations */
  defaultParameters: Partial<GenerationParameters>;
  /** Whether keyboard shortcuts are enabled */
  keyboardShortcutsEnabled: boolean;
}

/**
 * Status response from the API /status endpoint
 */
export interface StatusResponse {
  /** Current status of the server */
  status: string;
  /** Whether the model is loaded and ready */
  model_loaded: boolean;
  /** Alternative field for model loading status */
  models_loaded?: boolean;
  /** Whether models are currently loading */
  models_loading?: boolean;
  /** Optional status message */
  message?: string;
  /** Device being used (cuda/cpu) */
  device?: string;
  /** Model identifier */
  model?: string;
}