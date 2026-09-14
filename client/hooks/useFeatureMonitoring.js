import { useEffect, useRef } from 'react';









export const useFeatureMonitoring = (featureName, _options = {}) => {
  const metrics = useRef({
    startTime: Date.now(),
    interactionCount: 0,
    errorCount: 0
  });

  useEffect(() => {
    metrics.current.loadTime = Date.now() - metrics.current.startTime;
  }, [featureName]);

  const trackInteraction = (_interactionName) => {
    metrics.current.interactionCount++;
    metrics.current.lastInteraction = Date.now();
    return () => {};
  };

  const trackError = (error) => {
    metrics.current.errorCount++;
    console.error(`[Feature Error in ${featureName}]:`, error);
  };

  return {
    trackInteraction,
    trackError,
    getMetrics: () => ({ ...metrics.current })
  };
};
