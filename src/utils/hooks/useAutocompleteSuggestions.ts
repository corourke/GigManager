import { useState, useEffect, useMemo } from 'react';
import { getDistinctAssetValues, getDistinctKitValues } from '../api';
import { getSeedValues } from '../../config/autocompleteSeeds';

interface UseAutocompleteSuggestionsOptions {
  field: 'category' | 'sub_category' | 'type' | 'vendor';
  organizationId: string;
  sourceTable?: 'assets' | 'kits'; // Default: 'assets'
  filterByCategory?: string; // For sub_category filtering
  seedValues?: string[]; // Optional override, otherwise uses config
  enabled?: boolean; // Default: true
  formType?: 'asset' | 'kit'; // For seed value lookup, defaults based on sourceTable
}

/**
 * Hook for managing autocomplete suggestions from existing asset/kit data
 * Efficiently fetches distinct values using optimized queries
 * 
 * Usage:
 * const { suggestions, isLoading } = useAutocompleteSuggestions({
 *   field: 'category',
 *   organizationId: org.id,
 *   sourceTable: 'assets',
 * });
 */
export function useAutocompleteSuggestions({
  field,
  organizationId,
  sourceTable = 'assets',
  filterByCategory,
  seedValues,
  enabled = true,
  formType,
}: UseAutocompleteSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Determine formType from sourceTable if not provided
  const resolvedFormType = formType || (sourceTable === 'kits' ? 'kit' : 'asset');

  // Get seed values from config if not provided
  const resolvedSeedValues = useMemo(() => {
    if (seedValues !== undefined) {
      return seedValues;
    }
    return getSeedValues(resolvedFormType, field);
  }, [seedValues, resolvedFormType, field]);

  // Memoize the cache key to prevent unnecessary refetches
  const cacheKey = useMemo(
    () => `${organizationId}-${sourceTable}-${field}-${filterByCategory || 'all'}`,
    [organizationId, sourceTable, field, filterByCategory]
  );

  useEffect(() => {
    if (!enabled || !organizationId) {
      setSuggestions(resolvedSeedValues);
      return;
    }

    let cancelled = false;

    const loadSuggestions = async () => {
      setIsLoading(true);
      try {
        // Fetch distinct values from appropriate table
        const dbValues = sourceTable === 'kits'
          ? await getDistinctKitValues(organizationId, field as 'category')
          : await getDistinctAssetValues(organizationId, field, filterByCategory);

        // Merge with seed values, ensuring seed values appear first
        const seedSet = new Set(resolvedSeedValues.map(v => v.toLowerCase()));
        const fromDb = dbValues.filter(v => !seedSet.has(v.toLowerCase()));
        const merged = [...resolvedSeedValues, ...fromDb];

        if (!cancelled) {
          setSuggestions(merged);
        }
      } catch (error) {
        console.error(`Error loading ${field} suggestions:`, error);
        // On error, at least show seed values
        if (!cancelled) {
          setSuggestions(resolvedSeedValues);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [organizationId, sourceTable, field, filterByCategory, enabled, cacheKey, resolvedSeedValues]);

  return {
    suggestions,
    isLoading,
  };
}

