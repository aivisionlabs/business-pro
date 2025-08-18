import { businessCaseService, plantMasterService } from './firestore';
import plantMasterData from '@/data/plant-master.json';
import { BusinessCase, PlantMaster } from '@/lib/types';

export async function migratePlantMasterData() {
  console.log('Starting plant master data migration...');

  try {
    for (const plant of plantMasterData) {
      await plantMasterService.create(plant as PlantMaster);
      console.log(`Migrated plant: ${plant.plant}`);
    }
    console.log('Plant master migration completed successfully!');
  } catch (error) {
    console.error('Error migrating plant master data:', error);
    throw error;
  }
}

export async function migrateBusinessCaseData(businessCase: BusinessCase) {
  console.log(`Starting business case migration: ${businessCase.name}`);

  try {
    // Remove the existing ID and let Firestore generate a new one
    const { id, ...businessCaseData } = businessCase;

    // Create the business case
    const newId = await businessCaseService.create(businessCaseData);
    console.log(`Business case migrated with new ID: ${newId}`);

    return newId;
  } catch (error) {
    console.error('Error migrating business case:', error);
    throw error;
  }
}

export async function migrateAllExistingData() {
  console.log('Starting complete data migration...');

  try {
    // First migrate plant master data
    // await migratePlantMasterData();

    // Then migrate business cases (you can add this when ready)
    const businessCases = await loadBusinessCasesFromJson();
    for (const businessCase of businessCases) {
      await migrateBusinessCaseData(businessCase);
    }

    console.log('All data migration completed successfully!');
  } catch (error) {
    console.error('Error during data migration:', error);
    throw error;
  }
}

// Helper function to load business cases from JSON files
export async function loadBusinessCasesFromJson(): Promise<BusinessCase[]> {
  const response = await fetch('/data/scenarios/nzMTAzBmzRwEkSrUG8_M7.json');
  const data = await response.json();
  return [data];
}
