import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { GeneratedImage, GenerationParameters } from '../types';
import { DEFAULT_PARAMETERS } from '../utils/constants';

interface AppState {
  isGenerating: boolean;
  currentParameters: GenerationParameters;
  generatedImages: GeneratedImage[];
  connectionStatus: 'connected' | 'disconnected' | 'checking';
  error: string | null;
}

type AppAction =
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_PARAMETERS'; payload: Partial<GenerationParameters> }
  | { type: 'ADD_IMAGE'; payload: GeneratedImage }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' | 'checking' }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_IMAGES'; payload: GeneratedImage[] };

const initialState: AppState = {
  isGenerating: false,
  currentParameters: {
    prompt: '',
    ...DEFAULT_PARAMETERS,
  },
  generatedImages: [],
  connectionStatus: 'checking',
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload, error: null };
    
    case 'SET_PARAMETERS':
      return {
        ...state,
        currentParameters: { ...state.currentParameters, ...action.payload },
      };
    
    case 'ADD_IMAGE':
      return {
        ...state,
        generatedImages: [action.payload, ...state.generatedImages],
      };
    
    case 'REMOVE_IMAGE':
      return {
        ...state,
        generatedImages: state.generatedImages.filter(img => img.id !== action.payload),
      };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_IMAGES':
      return { ...state, generatedImages: action.payload };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  setGenerating: (generating: boolean) => void;
  updateParameters: (params: Partial<GenerationParameters>) => void;
  addImage: (image: GeneratedImage) => void;
  removeImage: (id: string) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'checking') => void;
  setError: (error: string | null) => void;
  setImages: (images: GeneratedImage[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setGenerating = useCallback((generating: boolean) => {
    dispatch({ type: 'SET_GENERATING', payload: generating });
  }, []);

  const updateParameters = useCallback((params: Partial<GenerationParameters>) => {
    dispatch({ type: 'SET_PARAMETERS', payload: params });
  }, []);

  const addImage = useCallback((image: GeneratedImage) => {
    dispatch({ type: 'ADD_IMAGE', payload: image });
  }, []);

  const removeImage = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_IMAGE', payload: id });
  }, []);

  const setConnectionStatus = useCallback((status: 'connected' | 'disconnected' | 'checking') => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const setImages = useCallback((images: GeneratedImage[]) => {
    dispatch({ type: 'SET_IMAGES', payload: images });
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        setGenerating,
        updateParameters,
        addImage,
        removeImage,
        setConnectionStatus,
        setError,
        setImages,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}