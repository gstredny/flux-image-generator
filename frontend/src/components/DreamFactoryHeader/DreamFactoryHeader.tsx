import { useEffect, useState } from 'react';
import { cn } from '../../utils/cn';

interface DreamFactoryHeaderProps {
  connectionStatus: 'connected' | 'disconnected' | 'checking';
}

export function DreamFactoryHeader({ connectionStatus }: DreamFactoryHeaderProps) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Generate floating sparkles
  useEffect(() => {
    const generateSparkle = () => {
      const newSparkle = {
        id: Date.now() + Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
      };
      setSparkles(prev => [...prev.slice(-20), newSparkle]);
    };

    const interval = setInterval(generateSparkle, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden">
      {/* Dreamy gradient background - Rich blue to green */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-teal-600 to-emerald-600 opacity-90" />
      
      {/* Animated background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-transparent to-teal-900/20 animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>

      {/* Floating sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        {sparkles.map(sparkle => (
          <div
            key={sparkle.id}
            className="absolute animate-float-up"
            style={{
              left: `${sparkle.x}%`,
              bottom: `${sparkle.y}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          >
            <span className="text-yellow-300/60 text-sm animate-twinkle">✨</span>
          </div>
        ))}
      </div>

      {/* Glassmorphism container */}
      <div className="relative backdrop-blur-md bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 shadow-2xl">
        <div className="px-4 py-6 sm:px-6 sm:py-8 md:py-10">
          {/* Main title with animations */}
          <div className="text-center space-y-2">
            <h1 className="relative inline-block">
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black">
                <span className="inline-block animate-twinkle-slow">🌟</span>
                <span className="inline-block ml-2 text-white drop-shadow-2xl">
                  GEORGE'S DREAM FACTORY
                </span>
                <span className="inline-block ml-2 animate-glow">🏭</span>
              </span>
            </h1>
            
            {/* Tagline */}
            <p className="text-base sm:text-lg md:text-xl text-white/90 font-light italic tracking-wider drop-shadow-lg animate-fade-in">
              Where Dreams Become Images
            </p>
          </div>

          {/* Status and version info */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-sm">
            {/* Connection status */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all duration-300",
              connectionStatus === 'connected' && "bg-green-500/20 border border-green-400/30",
              connectionStatus === 'disconnected' && "bg-red-500/20 border border-red-400/30",
              connectionStatus === 'checking' && "bg-yellow-500/20 border border-yellow-400/30"
            )}>
              <span className={cn(
                "inline-block w-2 h-2 rounded-full",
                connectionStatus === 'connected' && "bg-green-400 animate-pulse",
                connectionStatus === 'disconnected' && "bg-red-400",
                connectionStatus === 'checking' && "bg-yellow-400 animate-pulse"
              )} />
              <span className="text-white/90 font-medium">
                {connectionStatus === 'connected' && "Dreams Ready"}
                {connectionStatus === 'disconnected' && "Factory Offline"}
                {connectionStatus === 'checking' && "Connecting..."}
              </span>
            </div>

            {/* Version info */}
            <div className="text-white/70 text-xs sm:text-sm">
              v1.0 | Powered by FLUX Krea
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}