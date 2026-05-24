import Dexie, { type Table } from 'dexie';

interface OfflineSale {
  id?: number;
  clientId: string;
  tenantId: string;
  branchId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  syncStatus: 'pending' | 'synced' | 'failed';
  attempts: number;
}

interface CachedProduct {
  id: string;
  tenantId: string;
  name: string;
  genericName?: string;
  barcodes: string[];
  salePrice: number;
  taxRate: number;
  unitOfMeasure: string;
  stockQty: number;
  updatedAt: Date;
}

class PharmacyOfflineDB extends Dexie {
  offlineSales!: Table<OfflineSale>;
  products!: Table<CachedProduct>;

  constructor() {
    super('PharmacyOfflineDB');
    this.version(1).stores({
      offlineSales: '++id, clientId, syncStatus, createdAt',
      products: 'id, tenantId, name, *barcodes',
    });
  }
}

export const offlineDb = new PharmacyOfflineDB();

export async function queueOfflineSale(
  tenantId: string,
  branchId: string,
  payload: Record<string, unknown>,
) {
  const clientId = crypto.randomUUID();
  await offlineDb.offlineSales.add({
    clientId,
    tenantId,
    branchId,
    payload: { ...payload, clientId },
    createdAt: new Date(),
    syncStatus: 'pending',
    attempts: 0,
  });
  return clientId;
}

export async function getPendingOfflineSales() {
  return offlineDb.offlineSales
    .where('syncStatus')
    .equals('pending')
    .toArray();
}

export async function markSaleSynced(clientId: string) {
  await offlineDb.offlineSales
    .where('clientId')
    .equals(clientId)
    .modify({ syncStatus: 'synced' });
}

export async function cacheProducts(products: CachedProduct[]) {
  await offlineDb.products.bulkPut(products);
}

export async function searchOfflineProducts(query: string, tenantId: string) {
  return offlineDb.products
    .where('tenantId')
    .equals(tenantId)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcodes.includes(query),
    )
    .limit(20)
    .toArray();
}
