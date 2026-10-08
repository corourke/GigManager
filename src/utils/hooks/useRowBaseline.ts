import { useMemo, useRef } from 'react';

/**
 * The rows an autosaving gig section loaded or last saved (issue #92). A save
 * passes `ids()` to its service, which deletes only those the user removed,
 * never a row someone else added after the section loaded.
 *
 * Also remembers the database id a save gave each new row, keyed by the
 * row's client-side id, so a save queued before that id was written back to
 * the form updates the row instead of inserting it again.
 */
export function useRowBaseline() {
  const idsRef = useRef<string[]>([]);
  const insertedRef = useRef(new Map<string, string>());

  return useMemo(() => ({
    /** The rows just loaded from the database become the baseline. */
    loaded(ids: string[]) {
      idsRef.current = ids;
      insertedRef.current = new Map();
    },
    /** Ids of the rows loaded or last saved. */
    ids: () => idsRef.current,
    /** The database id an earlier save gave the row with this client-side id. */
    insertedId: (clientId: string) => insertedRef.current.get(clientId),
    /** After a save: each saved row's client-side id and database id. What it saved becomes the baseline. */
    saved(rows: Array<[clientId: string, dbId: string | undefined]>) {
      idsRef.current = rows.flatMap(([, dbId]) => (dbId ? [dbId] : []));
      for (const [clientId, dbId] of rows) {
        if (dbId && clientId !== dbId) insertedRef.current.set(clientId, dbId);
      }
    },
  }), []);
}
