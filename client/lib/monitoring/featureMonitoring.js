// Performance monitoring for specific features
export const startFeatureTransaction = (
  name,
  options = {}
) => {
  return {
    name,
    options,
    setStatus: (_status) => {},
    finish: () => {},
  };
};

// Error monitoring for specific features
export const monitorFeature = (featureName) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const transaction = startFeatureTransaction(featureName);

      try {
        const result = await originalMethod.apply(this, args);
        transaction.setStatus('ok');
        return result;
      } catch (error) {
        console.error(`[Feature Error in ${featureName}]:`, error);
        transaction.setStatus('error');
        throw error;
      } finally {
        transaction.finish();
      }
    };

    return descriptor;
  };
};

// Custom error filters
export const errorFilter = (event) => {
  return event;
};

// Performance monitoring configuration
export const configurePerformanceMonitoring = () => {
  // Graceful no-op when Sentry browser tracing is not attached
};
