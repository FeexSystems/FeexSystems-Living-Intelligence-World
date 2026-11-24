import React from 'react';
import AssetErrorBoundary from './AssetErrorBoundary';
import FeexLiveCaptureView from './FeexLiveCaptureView';

export default function FeexLiveCaptureRoute() {
  return (
    <AssetErrorBoundary
      label="FeexLiveCaptureView"
      resetKeys={[import.meta.env.VITE_FEEX_PLACEHOLDER]}
      fallback={({ error, reset }) => (
        <div className="feex-route-error" role="alert">
          <h2>Live Capture Unavailable</h2>
          <p>{error?.message || 'Could not initialize the live capture view.'}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={reset}>
              Reload View
            </button>
          </div>
        </div>
      )}
    >
      <FeexLiveCaptureView />
    </AssetErrorBoundary>
  );
}
