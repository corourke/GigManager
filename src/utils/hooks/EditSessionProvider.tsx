import type { ReactNode } from 'react';
import { EditSessionContext, type EditSession } from './editSession';

/** Puts the autosaving sections inside it into the given edit session (#12). */
export function EditSessionProvider({ session, children }: { session: EditSession; children?: ReactNode }) {
  return <EditSessionContext.Provider value={session.value}>{children}</EditSessionContext.Provider>;
}
