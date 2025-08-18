import { useState, useEffect, useCallback } from 'react';
import { businessCaseService, skuService, plantMasterService } from '@/lib/firebase/firestore';
import { BusinessCase, Sku, PlantMaster } from '@/lib/types';

// Hook for business cases
export function useBusinessCases() {
  const [businessCases, setBusinessCases] = useState<BusinessCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessCaseService.getAll();
      setBusinessCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch business cases');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBusinessCase = useCallback(async (businessCase: Omit<BusinessCase, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newId = await businessCaseService.create(businessCase);
      await fetchBusinessCases(); // Refresh the list
      return newId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business case');
      throw err;
    }
  }, [fetchBusinessCases]);

  const updateBusinessCase = useCallback(async (id: string, updates: Partial<BusinessCase>) => {
    try {
      await businessCaseService.update(id, updates);
      await fetchBusinessCases(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update business case');
      throw err;
    }
  }, [fetchBusinessCases]);

  const deleteBusinessCase = useCallback(async (id: string) => {
    try {
      await businessCaseService.delete(id);
      await fetchBusinessCases(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete business case');
      throw err;
    }
  }, [fetchBusinessCases]);

  useEffect(() => {
    fetchBusinessCases();
  }, [fetchBusinessCases]);

  return {
    businessCases,
    loading,
    error,
    refetch: fetchBusinessCases,
    createBusinessCase,
    updateBusinessCase,
    deleteBusinessCase,
  };
}

// Hook for a single business case
export function useBusinessCase(id: string) {
  const [businessCase, setBusinessCase] = useState<BusinessCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessCase = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await businessCaseService.getById(id);
      setBusinessCase(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch business case');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const updateBusinessCase = useCallback(async (updates: Partial<BusinessCase>) => {
    if (!id) return;

    try {
      await businessCaseService.update(id, updates);
      await fetchBusinessCase(); // Refresh the data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update business case');
      throw err;
    }
  }, [id, fetchBusinessCase]);

  useEffect(() => {
    fetchBusinessCase();
  }, [fetchBusinessCase]);

  return {
    businessCase,
    loading,
    error,
    refetch: fetchBusinessCase,
    updateBusinessCase,
  };
}

// Hook for SKUs
export function useSkus(businessCaseId: string) {
  const [skus, setSkus] = useState<Sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSkus = useCallback(async () => {
    if (!businessCaseId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await skuService.getByBusinessCaseId(businessCaseId);
      setSkus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SKUs');
    } finally {
      setLoading(false);
    }
  }, [businessCaseId]);

  const createSku = useCallback(async (sku: Omit<Sku, 'id'>) => {
    try {
      const newId = await skuService.create(sku);
      await fetchSkus(); // Refresh the list
      return newId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create SKU');
      throw err;
    }
  }, [fetchSkus]);

  const updateSku = useCallback(async (id: string, updates: Partial<Sku>) => {
    try {
      await skuService.update(id, updates);
      await fetchSkus(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update SKU');
      throw err;
    }
  }, [fetchSkus]);

  const deleteSku = useCallback(async (id: string) => {
    try {
      await skuService.delete(id);
      await fetchSkus(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SKU');
      throw err;
    }
  }, [fetchSkus]);

  useEffect(() => {
    fetchSkus();
  }, [fetchSkus]);

  return {
    skus,
    loading,
    error,
    refetch: fetchSkus,
    createSku,
    updateSku,
    deleteSku,
  };
}

// Hook for plant master data
export function usePlantMaster() {
  const [plants, setPlants] = useState<PlantMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plantMasterService.getAll();
      setPlants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plant master data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  return {
    plants,
    loading,
    error,
    refetch: fetchPlants,
  };
}
