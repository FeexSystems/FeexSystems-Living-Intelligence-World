import { useCallback } from 'react';









export const useErrorHandler = (options = {}) => {
  const handleError = useCallback(
    async (error, additionalContext) => {
      const { context, tags, shouldRethrow = false, onError } = options;

      if (onError) {
        onError(error);
      }

      console.error('[Error Handler]:', error, {
        ...context,
        ...tags,
        ...additionalContext,
      });

      if (shouldRethrow) {
        throw error;
      }
    },
    [options]
  );

  return handleError;
};
