import { useState, useEffect, useCallback } from 'react';

export const useFetchData = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFunction();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchData();
  }, [...dependencies, fetchData]);

  return { data, loading, error, refetch: fetchData };
};

export const fetchWithLoadingStates = async (fetchFunction, setData, setLoading, setError) => {
  setLoading(true);
  setError(null);
  try {
    const result = await fetchFunction();
    setData(result);
    return result;
  } catch (err) {
    setError(err.message || 'An error occurred while fetching data');
    return null;
  } finally {
    setLoading(false);
  }
};

export const fetchParallel = async (fetchFunctions) => {
  try {
    return await Promise.all(fetchFunctions.map(fn => fn()));
  } catch (error) {
    console.error('Error fetching data in parallel:', error);
    throw error;
  }
}; 