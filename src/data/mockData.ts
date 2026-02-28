export const mockContaminationMonitoring = [
  { id: "1", dateTime: "2026-02-25 09:00", area: "Inoculation Room A", platesExposed: 4, observationDateTime: "2026-02-26 09:00", colonyCount: 2, colonyType: "Fungal", actionTaken: "UV sterilization performed" },
  { id: "2", dateTime: "2026-02-24 14:00", area: "Growth Room 1", platesExposed: 6, observationDateTime: "2026-02-25 14:00", colonyCount: 0, colonyType: "None", actionTaken: "No action needed" },
  { id: "3", dateTime: "2026-02-23 10:00", area: "Media Prep Lab", platesExposed: 3, observationDateTime: "2026-02-24 10:00", colonyCount: 5, colonyType: "Bacterial", actionTaken: "Deep cleaning and fumigation" },
];

export const mockMediaPreparation = [
  { id: "1", batchNumber: "MB-2026-001", prepDate: "2026-02-20", quantity: "10L", bottlesPrepared: 50, preparedBy: "James Rivera", contaminationNotes: "None", bottlesIssued: 30, issuedDate: "2026-02-21", mediaType: "MS Medium" },
  { id: "2", batchNumber: "MB-2026-002", prepDate: "2026-02-22", quantity: "5L", bottlesPrepared: 25, preparedBy: "Maria Santos", contaminationNotes: "1 bottle contaminated", bottlesIssued: 20, issuedDate: "2026-02-23", mediaType: "B5 Medium" },
];

export const mockGrowthRoom = [
  { id: "1", varietyCode: "SC-001", ltdDate: "2026-02-15", planning: "Subculture cycle 3", openingBottles: 50, openingCultures: 200, issuedBottles: 10, issuedCultures: 40, receivedBottles: 15, receivedCultures: 60, contaminatedBottles: 2, contaminatedCultures: 8, closingBottles: 53, closingCultures: 212 },
  { id: "2", varietyCode: "SC-003", ltdDate: "2026-02-18", planning: "Multiplication phase", openingBottles: 30, openingCultures: 120, issuedBottles: 5, issuedCultures: 20, receivedBottles: 8, receivedCultures: 32, contaminatedBottles: 0, contaminatedCultures: 0, closingBottles: 33, closingCultures: 132 },
];

export const mockInoculationRoom = [
  { id: "1", variety: "SC-001", date: "2026-02-25", operator: "James Rivera", cultures: 40, bottles: 10, totalProduced: 50, remarks: "Good yield" },
  { id: "2", variety: "SC-002", date: "2026-02-24", operator: "Ana Lopez", cultures: 35, bottles: 8, totalProduced: 43, remarks: "Minor contamination in 2 bottles" },
];

export const mockChemicals = [
  { id: "1", name: "Sucrose", quantity: 5000, unit: "g", mfgDate: "2025-06-01", expiryDate: "2027-06-01", receivedDate: "2025-07-15", remainingStock: 3200 },
  { id: "2", name: "BAP (6-Benzylaminopurine)", quantity: 100, unit: "g", mfgDate: "2025-01-01", expiryDate: "2026-01-01", receivedDate: "2025-02-10", remainingStock: 15 },
  { id: "3", name: "Agar", quantity: 2000, unit: "g", mfgDate: "2025-09-01", expiryDate: "2027-09-01", receivedDate: "2025-10-05", remainingStock: 1800 },
  { id: "4", name: "NAA (1-Naphthaleneacetic acid)", quantity: 50, unit: "g", mfgDate: "2024-06-01", expiryDate: "2026-02-01", receivedDate: "2024-07-20", remainingStock: 5 },
];

export const mockContaminationReports = [
  { id: "1", varietyCode: "SC-001", source: "Fungus", typeDesc: "Aspergillus sp.", bottlesAffected: 5, operator: "James Rivera", date: "2026-02-20" },
  { id: "2", varietyCode: "SC-003", source: "Bacteria", typeDesc: "Bacillus sp.", bottlesAffected: 3, operator: "Ana Lopez", date: "2026-02-22" },
];

export const mockGreenhouse = [
  { id: "1", variety: "SC-001", batchNumber: "GH-001", transplantDate: "2026-01-15", operationDate: "2026-02-10", operationDesc: "Hardening", observationDate: "2026-02-20", findings: ["Healthy", "New Roots"], plantletsDied: 2, recordedBy: "Maria Santos" },
  { id: "2", variety: "SC-002", batchNumber: "GH-002", transplantDate: "2026-01-20", operationDate: "2026-02-12", operationDesc: "Misting adjustment", observationDate: "2026-02-22", findings: ["Wilting"], plantletsDied: 8, recordedBy: "James Rivera" },
];

export const mockUsers = [
  { id: "1", name: "Dr. Sarah Chen", username: "admin", role: "admin", status: "active" },
  { id: "2", name: "James Rivera", username: "tech", role: "technician", status: "active" },
  { id: "3", name: "Maria Santos", username: "viewer", role: "viewer", status: "active" },
  { id: "4", name: "Ana Lopez", username: "tech2", role: "technician", status: "inactive" },
];

export const mockAreas = ["Inoculation Room A", "Inoculation Room B", "Growth Room 1", "Growth Room 2", "Media Prep Lab", "Greenhouse"];
export const mockVarieties = ["SC-001", "SC-002", "SC-003", "SC-004", "SC-005"];
export const mockMediaTypes = ["MS Medium", "B5 Medium", "White's Medium", "N6 Medium"];
export const mockColonyTypes = ["Fungal", "Bacterial", "Yeast", "None"];
export const mockFindings = ["Healthy", "New Roots", "Wilting", "Yellowing", "Pest Damage", "Stunted Growth"];
