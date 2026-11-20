require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seed() {
  console.log('--- Starting Pakistan Medicines & Pharmacy Demo Data Seeding ---');

  // Find user and tenant
  const user = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' },
    include: { tenant: { include: { branches: true } } }
  });

  if (!user) {
    console.error('Error: admin@demo.com user not found. Please run seed.cjs first.');
    return;
  }

  const tenant = user.tenant;
  const tenantId = tenant.id;
  const branch = tenant.branches[0] || (await prisma.branch.findFirst({ where: { tenantId } }));
  const branchId = branch.id;
  const cashierId = user.id;

  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);
  console.log(`Using Branch: ${branch.name} (${branchId})`);

  // 1. Categories
  console.log('Seeding Categories...');
  const categoryDefs = [
    'Antibiotics & Antimicrobials',
    'Analgesics, Antipyretics & NSAIDs',
    'Gastrointestinal & Anti-Ulcerants',
    'Respiratory, Cough & Cold',
    'Cardiovascular & Anti-Hypertensives',
    'Anti-Diabetic',
    'Anti-Allergic & Antihistamines',
    'Vitamins & Dietary Supplements',
    'First Aid & Topical'
  ];

  const categoryMap = {};
  for (const catName of categoryDefs) {
    let cat = await prisma.category.findFirst({ where: { tenantId, name: catName } });
    if (!cat) {
      cat = await prisma.category.create({
        data: { tenantId, name: catName }
      });
    }
    categoryMap[catName] = cat.id;
  }

  // 2. Suppliers
  console.log('Seeding Suppliers...');
  const supplierDefs = [
    {
      name: 'Muller & Phipps Pakistan (Pvt) Ltd',
      ntn: '0712345-6',
      contactPerson: 'Khurram Shahzad',
      phone: '+92-21-35689000',
      email: 'orders@mulphico.pk',
      address: 'Plot 15, Sector 12-B, Korangi Industrial Area, Karachi',
      paymentTerms: 30,
      leadDays: 3
    },
    {
      name: 'Premier Agencies',
      ntn: '1428956-2',
      contactPerson: 'Zubair Ansari',
      phone: '+92-42-37582200',
      email: 'sales@premieragencies.com.pk',
      address: 'Pharma Distribution Zone, Multan Road, Lahore',
      paymentTerms: 15,
      leadDays: 2
    },
    {
      name: 'Lucky Distributors',
      ntn: '2890123-4',
      contactPerson: 'Imran Bashir',
      phone: '+92-51-4433221',
      email: 'info@luckydist.com.pk',
      address: 'I-9 Industrial Area, Islamabad',
      paymentTerms: 21,
      leadDays: 4
    }
  ];

  const supplierMap = {};
  for (const sup of supplierDefs) {
    let s = await prisma.supplier.findFirst({ where: { tenantId, name: sup.name } });
    if (!s) {
      s = await prisma.supplier.create({
        data: { tenantId, ...sup }
      });
    }
    supplierMap[sup.name] = s.id;
  }

  // 3. Customers
  console.log('Seeding Customers...');
  const customerDefs = [
    {
      name: 'Walk-in Customer',
      phone: '+92-300-0000000',
      email: 'walkin@customer.com',
      gender: 'other',
      loyaltyTier: 'none',
      loyaltyPoints: 0,
      walletBalance: 0
    },
    {
      name: 'Tariq Mehmood',
      phone: '+92-300-1122334',
      email: 'tariq.mehmood@gmail.com',
      gender: 'male',
      address: 'House 42, Block 5, Gulshan-e-Iqbal, Karachi',
      loyaltyTier: 'gold',
      loyaltyPoints: 340,
      walletBalance: 1500
    },
    {
      name: 'Dr. Ayesha Khan',
      phone: '+92-321-4455667',
      email: 'ayesha.khan@akuh.edu',
      gender: 'female',
      address: 'Apartment 7B, Creek Vista, DHA Phase 8, Karachi',
      loyaltyTier: 'platinum',
      loyaltyPoints: 780,
      walletBalance: 3200
    },
    {
      name: 'Mohammad Usman',
      phone: '+92-333-8899001',
      email: 'usman.ali@yahoo.com',
      gender: 'male',
      address: 'Street 14, F-8/2, Islamabad',
      loyaltyTier: 'silver',
      loyaltyPoints: 95,
      walletBalance: 400
    }
  ];

  const customerMap = {};
  for (const cust of customerDefs) {
    let c = await prisma.customer.findFirst({ where: { tenantId, phone: cust.phone } });
    if (!c) {
      c = await prisma.customer.create({
        data: { tenantId, ...cust }
      });
    }
    customerMap[cust.name] = c.id;
  }

  // 4. Doctors
  console.log('Seeding Doctors...');
  const doctorDefs = [
    {
      name: 'Dr. Farhan Ahmed',
      pmdcNumber: '12458-S',
      specialization: 'General Physician / Internal Medicine',
      clinicName: 'Aga Khan University Hospital',
      phone: '+92-21-34861000'
    },
    {
      name: 'Dr. Sadia Malik',
      pmdcNumber: '34901-P',
      specialization: 'Consultant Cardiologist',
      clinicName: 'National Institute of Cardiovascular Diseases',
      phone: '+92-21-99201271'
    }
  ];

  const doctorMap = {};
  for (const doc of doctorDefs) {
    let d = await prisma.doctor.findFirst({ where: { tenantId, name: doc.name } });
    if (!d) {
      d = await prisma.doctor.create({
        data: { tenantId, ...doc }
      });
    }
    doctorMap[doc.name] = d.id;
  }

  // 5. Pakistani Medicines (Products, Batches, StockLevels)
  console.log('Seeding Medicines (Products, Batches, Stock)...');
  const now = new Date();
  const daysFromNow = (days) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const medicineDefs = [
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Panadol 500mg Tablets',
      genericName: 'Paracetamol',
      brandName: 'Panadol',
      manufacturer: 'GSK Pakistan',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 200,
      unitOfMeasure: 'pcs',
      barcodes: ['896400010001', '8964000100018'],
      costPrice: 520.00,
      salePrice: 650.00,
      taxRate: 0,
      reorderPoint: 20,
      maxStock: 150,
      batch: {
        number: 'PND-2024-01',
        expiryDate: daysFromNow(540),
        qtyReceived: 100,
        currentStock: 85,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Panadol Extra Tablets',
      genericName: 'Paracetamol 500mg + Caffeine 65mg',
      brandName: 'Panadol Extra',
      manufacturer: 'GSK Pakistan',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 100,
      unitOfMeasure: 'pcs',
      barcodes: ['896400010002', '8964000100025'],
      costPrice: 340.00,
      salePrice: 420.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 100,
      batch: {
        number: 'PE-2024-03',
        expiryDate: daysFromNow(620),
        qtyReceived: 60,
        currentStock: 48,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Antibiotics & Antimicrobials',
      name: 'Augmentin 625mg Tablets',
      genericName: 'Amoxicillin + Clavulanic Acid',
      brandName: 'Augmentin',
      manufacturer: 'GSK Pakistan',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 10,
      unitOfMeasure: 'strips',
      barcodes: ['896400010003', '8964000100032'],
      costPrice: 310.00,
      salePrice: 380.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 80,
      batch: {
        number: 'AUG-24-99',
        expiryDate: daysFromNow(420),
        qtyReceived: 50,
        currentStock: 32,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Antibiotics & Antimicrobials',
      name: 'Augmentin 1g Tablets',
      genericName: 'Amoxicillin 875mg + Clavulanic Acid 125mg',
      brandName: 'Augmentin 1g',
      manufacturer: 'GSK Pakistan',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 14,
      unitOfMeasure: 'strips',
      barcodes: ['896400010004'],
      costPrice: 470.00,
      salePrice: 580.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 50,
      batch: {
        number: 'AUG1G-24-12',
        expiryDate: daysFromNow(380),
        qtyReceived: 30,
        currentStock: 18,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Gastrointestinal & Anti-Ulcerants',
      name: 'Risek 20mg Capsules',
      genericName: 'Omeprazole',
      brandName: 'Risek',
      manufacturer: 'Getz Pharma',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 14,
      unitOfMeasure: 'strips',
      barcodes: ['896400020001'],
      costPrice: 255.00,
      salePrice: 320.00,
      taxRate: 0,
      reorderPoint: 20,
      maxStock: 120,
      batch: {
        number: 'RSK20-88',
        expiryDate: daysFromNow(490),
        qtyReceived: 80,
        currentStock: 62,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Gastrointestinal & Anti-Ulcerants',
      name: 'Risek 40mg Capsules',
      genericName: 'Omeprazole',
      brandName: 'Risek',
      manufacturer: 'Getz Pharma',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 14,
      unitOfMeasure: 'strips',
      barcodes: ['896400020002'],
      costPrice: 410.00,
      salePrice: 510.00,
      taxRate: 0,
      reorderPoint: 12,
      maxStock: 80,
      batch: {
        number: 'RSK40-19',
        expiryDate: daysFromNow(510),
        qtyReceived: 50,
        currentStock: 35,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Brufen 400mg Tablets',
      genericName: 'Ibuprofen',
      brandName: 'Brufen',
      manufacturer: 'Abbott Laboratories',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 30,
      unitOfMeasure: 'pcs',
      barcodes: ['896400030001'],
      costPrice: 165.00,
      salePrice: 210.00,
      taxRate: 0,
      reorderPoint: 20,
      maxStock: 100,
      batch: {
        number: 'BRU-400-01',
        expiryDate: daysFromNow(580),
        qtyReceived: 90,
        currentStock: 74,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Brufen DS Syrup 120ml',
      genericName: 'Ibuprofen 200mg/5ml',
      brandName: 'Brufen DS',
      manufacturer: 'Abbott Laboratories',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 1,
      unitOfMeasure: 'bottles',
      barcodes: ['896400030002'],
      costPrice: 115.00,
      salePrice: 145.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 60,
      batch: {
        number: 'BRU-SYR-NEAR',
        // Expiring in 45 days -> will trigger NEAR-EXPIRY alert!
        expiryDate: daysFromNow(45),
        qtyReceived: 30,
        currentStock: 12,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Disprin 300mg Soluble Tablets',
      genericName: 'Aspirin',
      brandName: 'Disprin',
      manufacturer: 'Reckitt Benckiser',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 30,
      unitOfMeasure: 'strips',
      barcodes: ['896400040001'],
      costPrice: 95.00,
      salePrice: 120.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 100,
      batch: {
        number: 'DSP-300-88',
        expiryDate: daysFromNow(400),
        qtyReceived: 60,
        currentStock: 52,
        supplier: 'Lucky Distributors'
      }
    },
    {
      category: 'Antibiotics & Antimicrobials',
      name: 'Flagyl 400mg Tablets',
      genericName: 'Metronidazole',
      brandName: 'Flagyl',
      manufacturer: 'Sanofi-Aventis',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 200,
      unitOfMeasure: 'pcs',
      barcodes: ['896400050001'],
      costPrice: 690.00,
      salePrice: 850.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 50,
      batch: {
        number: 'FLG-400-22',
        expiryDate: daysFromNow(600),
        qtyReceived: 30,
        currentStock: 22,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Respiratory, Cough & Cold',
      name: 'Arinac Forte Tablets',
      genericName: 'Ibuprofen 400mg + Pseudoephedrine HCl 60mg',
      brandName: 'Arinac Forte',
      manufacturer: 'Abbott Laboratories',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 100,
      unitOfMeasure: 'pcs',
      barcodes: ['896400030003'],
      costPrice: 540.00,
      salePrice: 680.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 80,
      batch: {
        number: 'ARF-24-09',
        expiryDate: daysFromNow(480),
        qtyReceived: 50,
        currentStock: 38,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Anti-Allergic & Antihistamines',
      name: 'Softin 10mg Tablets',
      genericName: 'Loratadine',
      brandName: 'Softin',
      manufacturer: 'Searle Company Ltd',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 10,
      unitOfMeasure: 'strips',
      barcodes: ['896400060001'],
      costPrice: 125.00,
      salePrice: 160.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 60,
      batch: {
        number: 'SFT-10-NEAR',
        // Expiring in 65 days -> will trigger NEAR-EXPIRY alert!
        expiryDate: daysFromNow(65),
        qtyReceived: 40,
        currentStock: 19,
        supplier: 'Lucky Distributors'
      }
    },
    {
      category: 'Gastrointestinal & Anti-Ulcerants',
      name: 'Gravinate 50mg Tablets',
      genericName: 'Dimenhydrinate',
      brandName: 'Gravinate',
      manufacturer: 'Searle Company Ltd',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 100,
      unitOfMeasure: 'pcs',
      barcodes: ['896400060002'],
      costPrice: 310.00,
      salePrice: 390.00,
      taxRate: 0,
      reorderPoint: 12,
      maxStock: 70,
      batch: {
        number: 'GRV-50-11',
        expiryDate: daysFromNow(550),
        qtyReceived: 40,
        currentStock: 31,
        supplier: 'Lucky Distributors'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Ponstan 500mg Tablets',
      genericName: 'Mefenamic Acid',
      brandName: 'Ponstan',
      manufacturer: 'Pfizer Pakistan',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 200,
      unitOfMeasure: 'pcs',
      barcodes: ['896400070001'],
      costPrice: 1020.00,
      salePrice: 1250.00,
      taxRate: 0,
      reorderPoint: 8,
      maxStock: 40,
      batch: {
        number: 'PON-500-02',
        expiryDate: daysFromNow(650),
        qtyReceived: 25,
        currentStock: 16,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Antibiotics & Antimicrobials',
      name: 'Klaricid 250mg Tablets',
      genericName: 'Clarithromycin',
      brandName: 'Klaricid',
      manufacturer: 'Abbott Laboratories',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 10,
      unitOfMeasure: 'strips',
      barcodes: ['896400030004'],
      costPrice: 610.00,
      salePrice: 750.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 50,
      batch: {
        number: 'KLR-250-LOW',
        expiryDate: daysFromNow(450),
        qtyReceived: 30,
        // Only 3 left! Below reorderPoint 10 -> LOW STOCK ALERT demo!
        currentStock: 3,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Antibiotics & Antimicrobials',
      name: 'Leflox 500mg Tablets',
      genericName: 'Levofloxacin',
      brandName: 'Leflox',
      manufacturer: 'Getz Pharma',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 10,
      unitOfMeasure: 'strips',
      barcodes: ['896400020003'],
      costPrice: 390.00,
      salePrice: 480.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 40,
      batch: {
        number: 'LFX-500-LOW',
        expiryDate: daysFromNow(500),
        qtyReceived: 25,
        // Only 2 left! Below reorderPoint 10 -> LOW STOCK ALERT demo!
        currentStock: 2,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Anti-Diabetic',
      name: 'Glucophage 500mg Tablets',
      genericName: 'Metformin HCl',
      brandName: 'Glucophage',
      manufacturer: 'Merck / Martin Dow',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 50,
      unitOfMeasure: 'strips',
      barcodes: ['896400080001'],
      costPrice: 220.00,
      salePrice: 280.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 80,
      batch: {
        number: 'GLU-500-09',
        expiryDate: daysFromNow(580),
        qtyReceived: 60,
        currentStock: 46,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Cardiovascular & Anti-Hypertensives',
      name: 'Tenormin 50mg Tablets',
      genericName: 'Atenolol',
      brandName: 'Tenormin',
      manufacturer: 'Atco Laboratories',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 28,
      unitOfMeasure: 'strips',
      barcodes: ['896400090001'],
      costPrice: 245.00,
      salePrice: 310.00,
      taxRate: 0,
      reorderPoint: 12,
      maxStock: 60,
      batch: {
        number: 'TEN-50-31',
        expiryDate: daysFromNow(460),
        qtyReceived: 40,
        currentStock: 29,
        supplier: 'Lucky Distributors'
      }
    },
    {
      category: 'Cardiovascular & Anti-Hypertensives',
      name: 'Lipiget 20mg Tablets',
      genericName: 'Atorvastatin',
      brandName: 'Lipiget',
      manufacturer: 'Getz Pharma',
      drugSchedule: 'Schedule H',
      isControlled: false,
      isRxOnly: true,
      packSize: 10,
      unitOfMeasure: 'strips',
      barcodes: ['896400020004'],
      costPrice: 335.00,
      salePrice: 420.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 50,
      batch: {
        number: 'LIP-20-55',
        expiryDate: daysFromNow(520),
        qtyReceived: 40,
        currentStock: 33,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Calpol 120mg/5ml Suspension 60ml',
      genericName: 'Paracetamol 120mg/5ml',
      brandName: 'Calpol',
      manufacturer: 'GSK Pakistan',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 1,
      unitOfMeasure: 'bottles',
      barcodes: ['896400010005'],
      costPrice: 85.00,
      salePrice: 110.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 100,
      batch: {
        number: 'CLP-SYR-89',
        expiryDate: daysFromNow(410),
        qtyReceived: 60,
        currentStock: 48,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Respiratory, Cough & Cold',
      name: 'Sancos Cough Syrup 120ml',
      genericName: 'Dextromethorphan + Chlorpheniramine',
      brandName: 'Sancos',
      manufacturer: 'Sanofi-Aventis',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 1,
      unitOfMeasure: 'bottles',
      barcodes: ['896400050002'],
      costPrice: 105.00,
      salePrice: 135.00,
      taxRate: 0,
      reorderPoint: 12,
      maxStock: 70,
      batch: {
        number: 'SNC-120-04',
        expiryDate: daysFromNow(470),
        qtyReceived: 50,
        currentStock: 36,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    },
    {
      category: 'Vitamins & Dietary Supplements',
      name: 'CaC 1000 Plus Effervescent Tablets',
      genericName: 'Calcium Lactate + Vitamin C & D',
      brandName: 'CaC 1000 Plus',
      manufacturer: 'GSK Consumer Healthcare',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 10,
      unitOfMeasure: 'tubes',
      barcodes: ['896400010006'],
      costPrice: 275.00,
      salePrice: 340.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 80,
      batch: {
        number: 'CAC-1000-21',
        expiryDate: daysFromNow(630),
        qtyReceived: 50,
        currentStock: 42,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Vitamins & Dietary Supplements',
      name: 'Surbex Z Tablets',
      genericName: 'Zinc + Vitamin B-Complex + Vitamin C',
      brandName: 'Surbex Z',
      manufacturer: 'Abbott Laboratories',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 30,
      unitOfMeasure: 'pcs',
      barcodes: ['896400030005'],
      costPrice: 395.00,
      salePrice: 495.00,
      taxRate: 0,
      reorderPoint: 15,
      maxStock: 90,
      batch: {
        number: 'SRB-Z-66',
        expiryDate: daysFromNow(590),
        qtyReceived: 60,
        currentStock: 51,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'First Aid & Topical',
      name: 'Polyfax Skin Ointment 20g',
      genericName: 'Polymyxin B Sulphate + Bacitracin Zinc',
      brandName: 'Polyfax',
      manufacturer: 'GSK Pakistan',
      drugSchedule: 'OTC',
      isControlled: false,
      isRxOnly: false,
      packSize: 1,
      unitOfMeasure: 'tubes',
      barcodes: ['896400010007'],
      costPrice: 98.00,
      salePrice: 125.00,
      taxRate: 0,
      reorderPoint: 20,
      maxStock: 100,
      batch: {
        number: 'PLX-SKN-13',
        expiryDate: daysFromNow(510),
        qtyReceived: 70,
        currentStock: 58,
        supplier: 'Premier Agencies'
      }
    },
    {
      category: 'Analgesics, Antipyretics & NSAIDs',
      name: 'Xanax 0.5mg Tablets',
      genericName: 'Alprazolam',
      brandName: 'Xanax',
      manufacturer: 'Pfizer Pakistan',
      drugSchedule: 'Schedule X',
      isControlled: true,
      isRxOnly: true,
      packSize: 30,
      unitOfMeasure: 'strips',
      barcodes: ['896400070002'],
      costPrice: 285.00,
      salePrice: 360.00,
      taxRate: 0,
      reorderPoint: 10,
      maxStock: 30,
      batch: {
        number: 'XNX-05-01',
        expiryDate: daysFromNow(550),
        qtyReceived: 20,
        currentStock: 14,
        supplier: 'Muller & Phipps Pakistan (Pvt) Ltd'
      }
    }
  ];

  const createdProducts = [];
  const createdBatches = [];

  for (const med of medicineDefs) {
    const categoryId = categoryMap[med.category];
    let product = await prisma.product.findFirst({
      where: { tenantId, name: med.name }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId,
          categoryId,
          name: med.name,
          genericName: med.genericName,
          brandName: med.brandName,
          manufacturer: med.manufacturer,
          drugSchedule: med.drugSchedule,
          isControlled: med.isControlled,
          isRxOnly: med.isRxOnly,
          packSize: med.packSize,
          unitOfMeasure: med.unitOfMeasure,
          barcodes: med.barcodes,
          costPrice: med.costPrice,
          salePrice: med.salePrice,
          taxRate: med.taxRate,
          reorderPoint: med.reorderPoint,
          maxStock: med.maxStock,
          isActive: true
        }
      });
    }

    createdProducts.push(product);

    // Batch
    const supId = supplierMap[med.batch.supplier];
    let batch = await prisma.batch.findFirst({
      where: { tenantId, productId: product.id, batchNumber: med.batch.number }
    });

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          tenantId,
          productId: product.id,
          supplierId: supId,
          batchNumber: med.batch.number,
          expiryDate: med.batch.expiryDate,
          qtyReceived: med.batch.qtyReceived,
          costPerUnit: med.costPrice
        }
      });
    }

    createdBatches.push(batch);

    // Stock Level
    let stock = await prisma.stockLevel.findFirst({
      where: { tenantId, productId: product.id, batchId: batch.id, branchId }
    });

    if (!stock) {
      stock = await prisma.stockLevel.create({
        data: {
          tenantId,
          productId: product.id,
          batchId: batch.id,
          branchId,
          quantity: med.batch.currentStock
        }
      });
    } else {
      await prisma.stockLevel.update({
        where: { id: stock.id },
        data: { quantity: med.batch.currentStock }
      });
    }
  }

  // 6. Seed Realistic Sales (Today and Past Days)
  console.log('Seeding Completed Sales...');
  const salesCount = await prisma.sale.count({ where: { tenantId } });

  if (salesCount === 0) {
    const saleSamples = [
      {
        daysAgo: 0, // Today
        hoursAgo: 2,
        customerName: 'Tariq Mehmood',
        items: [
          { name: 'Panadol 500mg Tablets', qty: 2 },
          { name: 'Risek 20mg Capsules', qty: 1 },
          { name: 'Arinac Forte Tablets', qty: 1 }
        ],
        paymentMethod: 'cash'
      },
      {
        daysAgo: 0, // Today
        hoursAgo: 1,
        customerName: 'Dr. Ayesha Khan',
        items: [
          { name: 'Augmentin 625mg Tablets', qty: 2 },
          { name: 'CaC 1000 Plus Effervescent Tablets', qty: 2 },
          { name: 'Surbex Z Tablets', qty: 1 }
        ],
        paymentMethod: 'card'
      },
      {
        daysAgo: 0, // Today
        hoursAgo: 0.5,
        customerName: 'Walk-in Customer',
        items: [
          { name: 'Disprin 300mg Soluble Tablets', qty: 3 },
          { name: 'Brufen 400mg Tablets', qty: 1 }
        ],
        paymentMethod: 'cash'
      },
      {
        daysAgo: 1, // Yesterday
        hoursAgo: 24,
        customerName: 'Mohammad Usman',
        items: [
          { name: 'Glucophage 500mg Tablets', qty: 2 },
          { name: 'Lipiget 20mg Tablets', qty: 2 },
          { name: 'Panadol Extra Tablets', qty: 1 }
        ],
        paymentMethod: 'cash'
      },
      {
        daysAgo: 2,
        hoursAgo: 48,
        customerName: 'Walk-in Customer',
        items: [
          { name: 'Calpol 120mg/5ml Suspension 60ml', qty: 2 },
          { name: 'Sancos Cough Syrup 120ml', qty: 1 },
          { name: 'Polyfax Skin Ointment 20g', qty: 1 }
        ],
        paymentMethod: 'cash'
      },
      {
        daysAgo: 3,
        hoursAgo: 72,
        customerName: 'Tariq Mehmood',
        items: [
          { name: 'Augmentin 1g Tablets', qty: 1 },
          { name: 'Risek 40mg Capsules', qty: 1 },
          { name: 'Flagyl 400mg Tablets', qty: 1 }
        ],
        paymentMethod: 'card'
      }
    ];

    let invoiceCounter = 1001;
    for (const sample of saleSamples) {
      const saleDate = new Date(now.getTime() - (sample.daysAgo * 86400000 + sample.hoursAgo * 3600000));
      const customerId = customerMap[sample.customerName] || null;

      let subtotal = 0;
      const preparedItems = [];

      for (const item of sample.items) {
        const prod = createdProducts.find(p => p.name === item.name);
        if (!prod) continue;
        const batch = createdBatches.find(b => b.productId === prod.id);
        const unitPrice = Number(prod.salePrice);
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;

        preparedItems.push({
          productId: prod.id,
          batchId: batch ? batch.id : null,
          quantity: item.qty,
          unitPrice,
          discount: 0,
          taxAmount: 0,
          lineTotal
        });
      }

      const total = subtotal;
      const invoiceNumber = `INV-${invoiceCounter++}`;
      const clientId = randomUUID();

      await prisma.sale.create({
        data: {
          tenantId,
          branchId,
          clientId,
          invoiceNumber,
          fbrSyncStatus: 'success',
          fbrInvoiceNumber: `FBR-PK-${invoiceNumber}`,
          customerId,
          cashierId,
          saleDate,
          subtotal,
          discountAmount: 0,
          taxAmount: 0,
          total,
          payments: [{ method: sample.paymentMethod, amount: total }],
          status: 'completed',
          items: {
            create: preparedItems
          }
        }
      });
    }
    console.log(`Created ${saleSamples.length} demo sales with items.`);
  } else {
    console.log(`Sales already exist (${salesCount} records). Skipping sales seed.`);
  }

  // 7. Seed Pending Purchase Orders
  console.log('Seeding Sample Purchase Orders...');
  const poCount = await prisma.purchaseOrder.count({ where: { tenantId } });
  if (poCount === 0) {
    const supplierId = Object.values(supplierMap)[0];
    const poNumber = 'PO-2024-001';
    await prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId,
        branchId,
        poNumber,
        status: 'sent',
        expectedDate: daysFromNow(3),
        createdById: cashierId,
        notes: 'Monthly restocking order for antibiotics and analgesics'
      }
    });
    console.log('Created 1 pending purchase order.');
  }

  console.log('----------------------------------------------------');
  console.log('✅ Pakistan Pharmacy Demo Data Seed Complete!');
  console.log(`Total Products: ${medicineDefs.length}`);
  console.log('Includes:');
  console.log(' - Popular Pakistani brands (Panadol, Augmentin, Risek, Brufen, Disprin, etc.)');
  console.log(' - 2 Low stock medicines (Klaricid, Leflox) for low-stock alert testing');
  console.log(' - 2 Near-expiry medicines (Brufen Syrup, Softin) for expiry alert testing');
  console.log(' - Active sales for Today and this week with real revenue and transaction stats');
  console.log(' - Categories, Suppliers, Customers, Doctors');
  console.log('----------------------------------------------------');
}

seed()
  .catch(err => {
    console.error('Seed error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
