// Performance monitoring for specific features
export const startFeatureTransaction = (
  name: string,
  options: { data?: Record<string, any>; tags?: Record<string, string> } = {}
) => {
  return {
    name,
    options,
    setStatus: (_status: string) => {},
    finish: () => {},
  };
};

// Error monitoring for specific features
export const monitorFeature = (featureName: string) => {
  return (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
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
export const errorFilter = (event: any) => {
  return event;
};

// Performance monitoring configuration
export const configurePerformanceMonitoring = () => {
  // Graceful no-op when Sentry browser tracing is not attached
};
