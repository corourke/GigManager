import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OutboxItem {
  id?: number;
  type: 'INVENTORY_SCAN' | 'INVENTORY_CLEAR' | 'INVENTORY_NOTE_UPDATE' | 'ASSET_STATUS_UPDATE' | 'BIO_ENROLL' | 'STAFF_ASSIGNMENT_UPDATE';
  payload: any;
  timestamp: number;
  attempts: number;
}

interface GigWranglerDB extends DBSchema {
  gigs: {
    key: string;
    value: any;
    indexes: { 'by-date': string };
  };
  packing_lists: {
    key: string;
    value: any;
  };
  outbox: {
    key: number;
    value: OutboxItem;
    indexes: { 'by-timestamp': number };
  };
  staff_assignments: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'gig-manager-mobile';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<GigWranglerDB>>;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<GigWranglerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const gigStore = db.createObjectStore('gigs', { keyPath: 'id' });
          gigStore.createIndex('by-date', 'start');
          db.createObjectStore('packing_lists', { keyPath: 'gig_id' });
          const outboxStore = db.createObjectStore('outbox', {
            keyPath: 'id',
            autoIncrement: true,
          });
          outboxStore.createIndex('by-timestamp', 'timestamp');
        }
        if (oldVersion < 2 && transaction) {
          const hasGigStore = Array.from(transaction.objectStoreNames).includes('gigs');
          if (hasGigStore) {
            const gigStore = transaction.objectStore('gigs');
            if (gigStore.indexNames.contains('by-date')) {
              gigStore.deleteIndex('by-date');
            }
            gigStore.createIndex('by-date', 'start');
          }
        }
        if (oldVersion < 3) {
          db.createObjectStore('staff_assignments', { keyPath: 'assignment.id' });
        }
      },
    });
  }
  return dbPromise;
};

export const idbStore = {
  async putGig(gig: any) {
    const db = await getDB();
    return db.put('gigs', gig);
  },
  async putGigs(gigs: any[]) {
    const db = await getDB();
    const tx = db.transaction('gigs', 'readwrite');
    await Promise.all([...gigs.map(gig => tx.store.put(gig)), tx.done]);
  },
  async getGigs() {
    const db = await getDB();
    return db.getAllFromIndex('gigs', 'by-date');
  },
  async clearGigs() {
    const db = await getDB();
    return db.clear('gigs');
  },

  async putPackingList(gigId: string, data: any) {
    const db = await getDB();
    return db.put('packing_lists', { gig_id: gigId, ...data });
  },
  async getPackingList(gigId: string) {
    const db = await getDB();
    return db.get('packing_lists', gigId);
  },

  async addToOutbox(item: Omit<OutboxItem, 'id' | 'timestamp' | 'attempts'>) {
    const db = await getDB();
    return db.add('outbox', {
      ...item,
      timestamp: Date.now(),
      attempts: 0,
    });
  },
  async getOutbox() {
    const db = await getDB();
    return db.getAllFromIndex('outbox', 'by-timestamp');
  },
  async removeFromOutbox(id: number) {
    const db = await getDB();
    return db.delete('outbox', id);
  },
  async updateOutboxItem(item: OutboxItem) {
    const db = await getDB();
    return db.put('outbox', item);
  },

  async putStaffAssignments(assignments: any[]) {
    const db = await getDB();
    const tx = db.transaction('staff_assignments', 'readwrite');
    await tx.store.clear();
    await Promise.all([...assignments.map(a => tx.store.put(a)), tx.done]);
  },
  async getStaffAssignments() {
    const db = await getDB();
    return db.getAll('staff_assignments');
  },
  async clearStaffAssignments() {
    const db = await getDB();
    return db.clear('staff_assignments');
  },
};
