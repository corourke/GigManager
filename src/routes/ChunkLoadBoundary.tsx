import { Component, type ReactNode } from 'react';
import { Button } from '../components/ui/button';
import { isChunkLoadError } from './isChunkLoadError';
import { canAutoRecover, clearCachesAndReload, markAutoRecoveryAttempted } from './chunkRecovery';

interface State {
  error: Error | null;
  /** Clearing the caches and reloading by itself (first chunk error this session). */
  recovering: boolean;
}

/**
 * Wraps the lazy-loaded routes. The first failed chunk load in a session
 * clears the service-worker caches and reloads by itself; if that doesn't fix
 * it, a reload prompt (doing the same repair) is shown. Any other error is
 * rethrown to the app's top-level error boundary.
 */
export class ChunkLoadBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, recovering: isChunkLoadError(error) && canAutoRecover() };
  }

  componentDidCatch(error: Error) {
    if (!this.state.recovering || !isChunkLoadError(error)) return;
    if (!markAutoRecoveryAttempted()) {
      this.setState({ recovering: false });
      return;
    }
    void clearCachesAndReload();
  }

  render() {
    const { error, recovering } = this.state;
    if (!error) return this.props.children;
    if (!isChunkLoadError(error)) throw error;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center">
        {recovering ? (
          <p className="text-sm text-muted-foreground max-w-sm">Updating the app…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground max-w-sm">
              This screen couldn't load. Check your connection and reload.
            </p>
            <Button onClick={() => void clearCachesAndReload()}>Reload</Button>
          </>
        )}
      </div>
    );
  }
}
