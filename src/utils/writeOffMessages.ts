// #242: the app has no "found" action, so a locked-year write-off says what to do instead.
// The DB's undo_write_off refusal (migration 20261018000000) still says "Record the equipment
// as found instead"; the service swaps it for this wording.
export const WRITE_OFF_LOCKED_MESSAGE =
  'This write-off is in a filed tax year, so it can\'t be undone. If the equipment turns up, add it again as new equipment.';

/** True for undo_write_off's locked-year refusal: SQLSTATE 42501 and "tax year is locked" in the text. */
export function isLockedYearUndoError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return /tax year is locked/i.test(e?.message ?? '') && (e?.code === undefined || e.code === '42501');
}
