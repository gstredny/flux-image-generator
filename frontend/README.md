# FLUX Krea Frontend

Modern React TypeScript application for AI image generation with FLUX models.

## Quick Start

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Radix UI** - Headless components
- **Axios** - HTTP client
- **Zustand** - State management
- **React Hot Toast** - Notifications

## Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── PromptInput/ # Prompt input component
│   ├── ParameterControls/ # Generation parameters
│   ├── GenerateButton/ # Generate action
│   └── ImageGallery/ # Image display
├── services/        # API and utility services
│   ├── api.ts      # API client with retry logic
│   ├── storage.ts  # Local storage & IndexedDB
│   └── imageUtils.ts # Image processing
├── hooks/          # Custom React hooks
├── contexts/       # React contexts
├── types/          # TypeScript types
├── utils/          # Utility functions
└── App.tsx         # Main component
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
VITE_API_ENDPOINT=http://localhost:7860
```

### Customization

Edit `src/utils/constants.ts`:

```typescript
export const DEFAULT_PARAMETERS = {
  steps: 30,
  cfgScale: 4.0,
  seed: -1,
  width: 1024,
  height: 1024,
};

export const RESOLUTIONS = [
  { label: "Square (1024x1024)", width: 1024, height: 1024 },
  // Add more resolutions
];
```

## Features

### Core Features
- 🎨 Text-to-image generation
- 🎛️ Parameter controls (steps, CFG, seed, resolution)
- 🌓 Dark/light theme
- 📱 Mobile responsive
- ⌨️ Keyboard shortcuts
- 🔄 Automatic retry logic
- 💾 Local history storage
- 📤 Export/import history

### Advanced Features
- WebSocket support for progress
- Image optimization
- PWA support
- Offline mode
- Batch generation

## Development

### Code Style

We use ESLint and Prettier:

```bash
npm run lint
npm run format
```

### Component Development

```tsx
// Example component structure
import { useState } from 'react';
import { cn } from '@/utils/cn';

interface MyComponentProps {
  className?: string;
}

export function MyComponent({ className }: MyComponentProps) {
  const [state, setState] = useState();
  
  return (
    <div className={cn("base-classes", className)}>
      {/* Component content */}
    </div>
  );
}
```

### Adding New Features

1. Create component in `src/components/`
2. Add types to `src/types/`
3. Update services if needed
4. Add to App.tsx

## Testing

```bash
npm run test
npm run test:coverage
```

## Performance

- Lazy load images
- Use React.memo for expensive components
- Implement virtual scrolling for large galleries
- Optimize bundle size with code splitting

## Building

### Production Build

```bash
npm run build
```

Output in `dist/` directory.

### Docker Build

```bash
docker build -t flux-krea-frontend .
docker run -p 80:80 flux-krea-frontend
```

## Deployment

### Vercel

```bash
npm i -g vercel
vercel --prod
```

### Netlify

Drop `dist/` folder on Netlify dashboard.

### Static Hosting

Serve `dist/` folder with any static server.

## Troubleshooting

### Common Issues

**Blank page**: Check browser console and `.env` configuration

**API errors**: Verify backend is running and CORS is configured

**Build errors**: Clear node_modules and reinstall

```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Run tests and lint
5. Submit PR

## License

MIT License - see LICENSE file