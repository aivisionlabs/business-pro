import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';
import { BusinessCase, Sku, PlantMaster } from '@/lib/types';

// Collection names
const COLLECTIONS = {
  BUSINESS_CASES: 'businessCases',
  SKUS: 'skus',
  PLANT_MASTER: 'plantMaster',
} as const;

// Business Cases Service
export class BusinessCaseService {
  private collection = COLLECTIONS.BUSINESS_CASES;

  async create(businessCase: Omit<BusinessCase, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString();
    const docData = {
      ...businessCase,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, this.collection), docData);
    return docRef.id;
  }

  async getById(id: string): Promise<BusinessCase | null> {
    const docRef = doc(db, this.collection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BusinessCase;
    }
    return null;
  }

  async getAll(): Promise<BusinessCase[]> {
    const q = query(
      collection(db, this.collection),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BusinessCase[];
  }

  async update(id: string, updates: Partial<BusinessCase>): Promise<void> {
    const docRef = doc(db, this.collection, id);
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updateData);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collection, id);
    await deleteDoc(docRef);
  }

  async searchByName(name: string): Promise<BusinessCase[]> {
    const q = query(
      collection(db, this.collection),
      where('name', '>=', name),
      where('name', '<=', name + '\uf8ff'),
      orderBy('name'),
      limit(20)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BusinessCase[];
  }
}

// SKUs Service
export class SkuService {
  private collection = COLLECTIONS.SKUS;

  async create(sku: Omit<Sku, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, this.collection), sku);
    return docRef.id;
  }

  async getById(id: string): Promise<Sku | null> {
    const docRef = doc(db, this.collection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Sku;
    }
    return null;
  }

  async getByBusinessCaseId(businessCaseId: string): Promise<Sku[]> {
    const q = query(
      collection(db, this.collection),
      where('businessCaseId', '==', businessCaseId),
      orderBy('name')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sku[];
  }

  async update(id: string, updates: Partial<Sku>): Promise<void> {
    const docRef = doc(db, this.collection, id);
    await updateDoc(docRef, updates);
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, this.collection, id);
    await deleteDoc(docRef);
  }

  async deleteByBusinessCaseId(businessCaseId: string): Promise<void> {
    const skus = await this.getByBusinessCaseId(businessCaseId);
    const batch = writeBatch(db);

    skus.forEach(sku => {
      const docRef = doc(db, this.collection, sku.id);
      batch.delete(docRef);
    });

    await batch.commit();
  }
}

// Plant Master Service
export class PlantMasterService {
  private collection = COLLECTIONS.PLANT_MASTER;

  async getAll(): Promise<PlantMaster[]> {
    const querySnapshot = await getDocs(collection(db, this.collection));
    return querySnapshot.docs.map(doc => doc.data() as PlantMaster);
  }

  async getByPlant(plant: string): Promise<PlantMaster | null> {
    const q = query(
      collection(db, this.collection),
      where('plant', '==', plant),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as PlantMaster;
    }
    return null;
  }

  async create(plantMaster: PlantMaster): Promise<void> {
    await addDoc(collection(db, this.collection), plantMaster);
  }

  async update(plant: string, updates: Partial<PlantMaster>): Promise<void> {
    const q = query(
      collection(db, this.collection),
      where('plant', '==', plant),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docRef = doc(db, this.collection, querySnapshot.docs[0].id);
      await updateDoc(docRef, updates);
    }
  }

  async delete(plant: string): Promise<void> {
    const q = query(
      collection(db, this.collection),
      where('plant', '==', plant),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docRef = doc(db, this.collection, querySnapshot.docs[0].id);
      await deleteDoc(docRef);
    }
  }
}

// Export service instances
export const businessCaseService = new BusinessCaseService();
export const skuService = new SkuService();
export const plantMasterService = new PlantMasterService();

// Utility function to migrate existing data
export async function migrateExistingData() {
  // This function can be used to migrate existing JSON data to Firestore
  // You can call this once during setup
  console.log('Migration function ready - implement as needed');
}
