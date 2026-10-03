import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  discardQueuedInvoice,
  enqueueInvoice,
  listScanQueue,
  removeFromScanQueue,
  scanQueuedInvoice,
  type ScanQueueItem,
} from '../../../services/purchaseScanQueue.service';

/** Invoices scanned at once. */
export const SCAN_CONCURRENCY = 2;
/** How often to look for scans another tab is running. */
const POLL_MS = 15_000;
/** A scan that has said "scanning" this long has died (matches ai-scan). */
const STALE_SCAN_MS = 5 * 60 * 1000;

const isStale = (item: ScanQueueItem, now: number) =>
  item.status === 'scanning' && now - new Date(item.updated_at).getTime() > STALE_SCAN_MS;

/**
 * The org's invoice scan queue (10-01). Scans queued invoices in the background,
 * two at a time, while the Purchases page is open; anything not yet scanned
 * carries on the next time it's opened. Every Admin and Manager shares the queue.
 */
export function useScanQueue(organizationId: string, enabled: boolean) {
  const [items, setItems] = useState<ScanQueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(0);
  const inFlight = useRef(new Set<string>());

  const reload = useCallback(async () => {
    try {
      setItems(await listScanQueue(organizationId));
    } catch {
      // Reported by the service; keep what we have.
    } finally {
      setLoaded(true);
    }
  }, [organizationId]);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const patch = (id: string, change: Partial<ScanQueueItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i)));

  const scan = useCallback(async (item: ScanQueueItem) => {
    inFlight.current.add(item.id);
    patch(item.id, { status: 'scanning', error: null, updated_at: new Date().toISOString() });
    try {
      const data = await scanQueuedInvoice(item.id);
      patch(item.id, { status: 'ready', scanned_data: data, error: null });
    } catch (err: any) {
      // ai-scan recorded the failure on the row (or another tab has it); show the row as it is now.
      patch(item.id, { status: 'failed', error: err?.message || 'Scan failed' });
      await reload();
    } finally {
      inFlight.current.delete(item.id);
    }
  }, [reload]);

  // Start scans as slots free up.
  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    const free = SCAN_CONCURRENCY - inFlight.current.size;
    if (free <= 0) return;
    items
      .filter((i) => !inFlight.current.has(i.id) && (i.status === 'queued' || isStale(i, now)))
      .slice(0, free)
      .forEach(scan);
  }, [enabled, items, scan]);

  // Pick up scans running in another tab or on another device.
  const watching = items.some((i) => i.status === 'scanning' && !inFlight.current.has(i.id));
  useEffect(() => {
    if (!enabled || !watching) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, watching, reload]);

  const addFiles = useCallback(async (files: File[]) => {
    setUploading((n) => n + files.length);
    for (const file of files) {
      try {
        const item = await enqueueInvoice(organizationId, file);
        setItems((list) => [...list, item]);
      } catch (err: any) {
        toast.error(`${file.name}: ${err?.message || 'could not be added'}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }, [organizationId]);

  const retry = useCallback((item: ScanQueueItem) => patch(item.id, { status: 'queued', error: null }), []);

  const discard = useCallback(async (item: ScanQueueItem) => {
    setItems((list) => list.filter((i) => i.id !== item.id));
    try {
      await discardQueuedInvoice(item);
    } catch {
      await reload();
    }
  }, [reload]);

  /** The purchase was saved: take the invoice off the queue (its file stays, linked to the purchase). */
  const saved = useCallback(async (item: ScanQueueItem) => {
    setItems((list) => list.filter((i) => i.id !== item.id));
    try {
      await removeFromScanQueue(item.id);
    } catch {
      await reload();
    }
  }, [reload]);

  const count = (status: ScanQueueItem['status']) => items.filter((i) => i.status === status).length;
  return {
    items,
    loaded,
    uploading,
    counts: { ready: count('ready'), scanning: count('scanning'), queued: count('queued'), failed: count('failed') },
    addFiles,
    retry,
    discard,
    saved,
  };
}

export type ScanQueue = ReturnType<typeof useScanQueue>;
