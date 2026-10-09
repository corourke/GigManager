import { Component, type ReactNode } from 'react';
import { Button } from '../components/ui/button';
import { isChunkLoadError } from './isChunkLoadError';

interface State {
  error: Error | null;
}

/**
 * Wraps the lazy-loaded routes. A failed chunk load shows a reload prompt;
 * any other error is rethrown to the app's top-level error boundary.
 */
export class ChunkLoadBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!isChunkLoadError(error)) throw error;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        <p className="text-sm text-muted-foreground max-w-sm">
          This screen couldn't load. Check your connection and reload.
        </p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </div>
    );
  }
}
