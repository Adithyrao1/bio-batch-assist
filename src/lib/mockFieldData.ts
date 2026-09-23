export interface FieldLocation {
  id: string;
  name: string;
  type: 'Company Farm' | 'Contract Farm';
  totalPlots: number;
}

export interface Farmer {
  id: string;
  name: string;
  village: string;
  phone: string;
  qualityScore: number; // 0 to 10
  seedsTakenKg: number;
  harvestReturnedKg: number;
}

export interface SeedLot {
  id: string;
  stage: 'Breeder' | 'Foundation' | 'Certified' | 'Commercial';
  parentLotId: string | null;
  varietyCode: string;
  quantityKg: number;
  year: number;
  locationId?: string; // where it is currently, or farmerId
  farmerId?: string;
  status: 'In Field' | 'Harvested' | 'Dispatched';
}

export const mockLocations: FieldLocation[] = [
  { id: "L-001", name: "Ajbapur", type: "Company Farm", totalPlots: 12 },
  { id: "L-002", name: "Rupapur", type: "Company Farm", totalPlots: 8 },
  { id: "L-003", name: "Hariawan", type: "Contract Farm", totalPlots: 15 },
  { id: "L-004", name: "Loni", type: "Contract Farm", totalPlots: 10 },
];

export const mockFarmers: Farmer[] = [
  { id: "F-101", name: "Ram Singh", village: "Sitapur", phone: "+91 9876543210", qualityScore: 8.5, seedsTakenKg: 150, harvestReturnedKg: 3500 },
  { id: "F-102", name: "Krishna Kumar", village: "Lakhimpur", phone: "+91 9876543211", qualityScore: 9.2, seedsTakenKg: 200, harvestReturnedKg: 5200 },
  { id: "F-103", name: "Suresh Patel", village: "Hardoi", phone: "+91 9876543212", qualityScore: 7.8, seedsTakenKg: 100, harvestReturnedKg: 2100 },
  { id: "F-104", name: "Amit Verma", village: "Shahjahanpur", phone: "+91 9876543213", qualityScore: 9.0, seedsTakenKg: 300, harvestReturnedKg: 8500 },
];

export const mockSeedLots: SeedLot[] = [
  { id: "BR-2026-001", stage: "Breeder", parentLotId: "TC-2026-045", varietyCode: "SC-001", quantityKg: 50, year: 2026, locationId: "L-001", status: "Harvested" },
  { id: "FD-2027-101", stage: "Foundation", parentLotId: "BR-2026-001", varietyCode: "SC-001", quantityKg: 1200, year: 2027, farmerId: "F-101", status: "Harvested" },
  { id: "FD-2027-102", stage: "Foundation", parentLotId: "BR-2026-001", varietyCode: "SC-001", quantityKg: 1500, year: 2027, farmerId: "F-102", status: "Harvested" },
  { id: "CT-2028-301", stage: "Certified", parentLotId: "FD-2027-101", varietyCode: "SC-001", quantityKg: 15000, year: 2028, farmerId: "F-104", status: "In Field" },
  { id: "CM-2029-501", stage: "Commercial", parentLotId: "CT-2028-301", varietyCode: "SC-001", quantityKg: 45000, year: 2029, locationId: "L-003", status: "Dispatched" },
];
