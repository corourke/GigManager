import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./styles/globals.css";
import { AuthProvider } from "./contexts/AuthContext";

// Error monitoring — no-op unless VITE_SENTRY_DSN is set (dev/test unaffected)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: `gigwrangler@${__BUILD_TIMESTAMP__}`,
    sendDefaultPii: false,
  });
}

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. The team has been notified — please
          reload the page to continue.
        </p>
        <button
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Sentry.ErrorBoundary>
);
