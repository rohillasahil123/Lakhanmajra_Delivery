import { useCallback, useState } from 'react';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Custom hook for handling API calls with error management
 * Provides loading state, error state, and automatic error handling
 * Type must be specified when using the hook
 *
 * @example
 * const { data, loading, error, execute } = useApi<Category[]>();
 * useEffect(() => {
 *   execute(() => fetchCategories());
 * }, []);
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage message={error.message} />;
 * return <Content data={data} />;
 */
export function useApi<T extends unknown = never>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err: any) {
      const error: ApiError = {
        message: err?.message || 'An error occurred',
        code: err?.code,
        status: err?.status,
        details: err?.details,
      };
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setError = useCallback((error: ApiError) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setError,
  };
}

/**
 * Custom hook for handling multiple parallel API calls
 * Waits for all promises to resolve and handles errors gracefully
 *
 * @example
 * const { data, loading, error, executeAll } = useApiMultiple();
 * useEffect(() => {
 *   executeAll([fetchCategories(), fetchProducts(), fetchOffers()])
 *     .then(([categories, products, offers]) => {
 *       setCategories(categories);
 *       setProducts(products);
 *       setOffers(offers);
 *     });
 * }, []);
 */
export function useApiMultiple<T extends any[] = any[]>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const executeAll = useCallback(async (promises: Promise<any>[]) => {
    setState({ data: null, loading: true, error: null });
    try {
      const results = await Promise.all(promises);
      setState({ data: results as T, loading: false, error: null });
      return results as T;
    } catch (err: any) {
      const error: ApiError = {
        message: err?.message || 'One or more API calls failed',
        code: err?.code,
        status: err?.status,
        details: err?.details,
      };
      setState({ data: null, loading: false, error });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    executeAll,
    reset,
  };
}
