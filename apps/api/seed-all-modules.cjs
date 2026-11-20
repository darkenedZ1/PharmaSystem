require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function seedAll() {
  console.log('====================================================');
  console.log('   Populating Comprehensive Mock Data Across All Modules');
  console.log('====================================================');

  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: { contains: 'demo' } },
    include: { branches: true, users: true }
  });

  if (!tenant) {
    console.error('No tenant found. Run seed.cjs first.');
    return;
  }

  const tenantId = tenant.id;
  const branch = tenant.branches[0];
  const branchId = branch.id;
  const userId = tenant.users[0]?.id || randomUUID();

  console.log(`Tenant: ${tenant.name} (${tenantId})`);
  console.log(`Branch: ${branch.name} (${branchId})`);

  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 86400000);
  const daysAhead = (d) => new Date(now.getTime() + d * 86400000);

  // ─────────────────────────────────────────────────────────────
  // 1. CHART OF ACCOUNTS & BANK ACCOUNTS & JOURNAL ENTRIES
  // ─────────────────────────────────────────────────────────────
  console.log('[1/9] Seeding Chart of Accounts, Bank Accounts & Ledger...');
  const defaultAccounts = [
    { code: '1000', name: 'Cash in Hand', accountType: 'asset' },
    { code: '1100', name: 'Meezan Bank - Main Account', accountType: 'asset' },
    { code: '1200', name: 'Accounts Receivable', accountType: 'asset' },
    { code: '1300', name: 'Pharmacy Medicine Inventory', accountType: 'asset' },
    { code: '2000', name: 'Accounts Payable (Distributors)', accountType: 'liability' },
    { code: '2100', name: 'FBR Sales Tax Payable', accountType: 'liability' },
    { code: '3000', name: 'Owner Equity & Capital', accountType: 'equity' },
    { code: '4000', name: 'Medicine Sales Revenue', accountType: 'revenue' },
    { code: '4100', name: 'Home Delivery Income', accountType: 'revenue' },
    { code: '5000', name: 'Cost of Goods Sold (COGS)', accountType: 'expense' },
    { code: '5100', name: 'Pharmacist & Staff Salaries', accountType: 'expense' },
    { code: '5200', name: 'Pharmacy Store Rent', accountType: 'expense' },
    { code: '5300', name: 'Electricity & Utilities', accountType: 'expense' },
  ];

  const accountMap = {};
  for (const acc of defaultAccounts) {
    let a = await prisma.account.findUnique({
      where: { tenantId_code: { tenantId, code: acc.code } }
    });
    if (!a) {
      a = await prisma.account.create({
        data: { tenantId, ...acc, isSystem: true, isActive: true }
      });
    }
    accountMap[acc.code] = a.id;
  }

  // Bank Account
  const bankAcc = await prisma.bankAccount.findFirst({ where: { tenantId } });
  if (!bankAcc) {
    await prisma.bankAccount.create({
      data: {
        tenantId,
        accountId: accountMap['1100'],
        bankName: 'Meezan Bank Ltd',
        accountTitle: 'Demo Pharmacy (Pvt) Ltd',
        accountNumber: '0102-0100456789',
        iban: 'PK65MEZN0001020100456789',
        branchCode: '0102',
        openingBalance: 1250000.00,
        isActive: true,
      }
    });
  }

  // Balanced Journal Entries
  const journalCount = await prisma.journalEntry.count({ where: { tenantId } });
  if (journalCount === 0) {
    const journals = [
      {
        description: 'Initial Business Capital Investment',
        date: daysAgo(30),
        lines: [
          { accountId: accountMap['1100'], debit: 1200000, credit: 0, narration: 'Capital deposited into Meezan Bank' },
          { accountId: accountMap['3000'], debit: 0, credit: 1200000, narration: 'Founder equity contribution' },
        ]
      },
      {
        description: 'Bulk Stock Procurement from Muller & Phipps',
        date: daysAgo(20),
        lines: [
          { accountId: accountMap['1300'], debit: 250000, credit: 0, narration: 'Stock purchased under PO-2024-001' },
          { accountId: accountMap['2000'], debit: 0, credit: 250000, narration: 'Payable to Muller & Phipps' },
        ]
      },
      {
        description: 'Distributor Invoice Settlement',
        date: daysAgo(10),
        lines: [
          { accountId: accountMap['2000'], debit: 150000, credit: 0, narration: 'Partial payment to Muller & Phipps' },
          { accountId: accountMap['1100'], debit: 0, credit: 150000, narration: 'Paid via Meezan Bank transfer' },
        ]
      },
      {
        description: 'Monthly Pharmacy Retail Sales Summary',
        date: daysAgo(5),
        lines: [
          { accountId: accountMap['1000'], debit: 185000, credit: 0, narration: 'Cash collected from OTC & Rx sales' },
          { accountId: accountMap['4000'], debit: 0, credit: 185000, narration: 'Retail medicine sales revenue' },
        ]
      },
      {
        description: 'Commercial Pharmacy Rent for November',
        date: daysAgo(2),
        lines: [
          { accountId: accountMap['5200'], debit: 75000, credit: 0, narration: 'Main street pharmacy branch rent' },
          { accountId: accountMap['1100'], debit: 0, credit: 75000, narration: 'Direct transfer to landlord' },
        ]
      },
    ];

    for (const j of journals) {
      await prisma.journalEntry.create({
        data: {
          tenantId,
          description: j.description,
          entryDate: j.date,
          createdById: userId,
          isPosted: true,
          lines: {
            create: j.lines
          }
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. EMPLOYEES, ATTENDANCE, LEAVES & PAYROLL
  // ─────────────────────────────────────────────────────────────
  console.log('[2/9] Seeding Employees, Attendance, Leaves & Payroll...');
  const employeesData = [
    {
      name: 'Dr. Hamza Malik, PharmD',
      designation: 'Chief Pharmacist / In-Charge',
      department: 'Pharmacy',
      phone: '+92-300-4455661',
      email: 'hamza.malik@pharmacy.com',
      dateOfJoining: new Date('2024-01-15'),
      basicSalary: 110000,
      bankName: 'Meezan Bank',
      bankAccount: '0102-0199228833',
      eobi: true,
      sessi: true,
      salaryComponents: { houseRent: 35000, medical: 15000, conveyance: 10000 }
    },
    {
      name: 'Bilal Qureshi',
      designation: 'Assistant Pharmacist',
      department: 'Pharmacy',
      phone: '+92-321-5566772',
      email: 'bilal.q@pharmacy.com',
      dateOfJoining: new Date('2024-03-01'),
      basicSalary: 65000,
      bankName: 'Habib Bank Ltd',
      bankAccount: '1234-5678901234',
      eobi: true,
      sessi: true,
      salaryComponents: { houseRent: 20000, medical: 8000, conveyance: 7000 }
    },
    {
      name: 'Zainab Bibi',
      designation: 'Counter Cashier & Billing',
      department: 'Front Counter',
      phone: '+92-333-6677883',
      email: 'zainab.b@pharmacy.com',
      dateOfJoining: new Date('2024-06-10'),
      basicSalary: 45000,
      bankName: 'Bank Alfalah',
      bankAccount: '5566-7788990011',
      eobi: true,
      sessi: false,
      salaryComponents: { houseRent: 14000, medical: 6000, conveyance: 5000 }
    },
    {
      name: 'Rizwan Abbasi',
      designation: 'Inventory & Store Officer',
      department: 'Warehouse',
      phone: '+92-345-7788994',
      email: 'rizwan.a@pharmacy.com',
      dateOfJoining: new Date('2024-04-20'),
      basicSalary: 50000,
      bankName: 'MCB Bank',
      bankAccount: '0987-6543210987',
      eobi: true,
      sessi: true,
      salaryComponents: { houseRent: 15000, medical: 7000, conveyance: 6000 }
    },
    {
      name: 'Kamran Shah',
      designation: 'Express Delivery Rider',
      department: 'Logistics',
      phone: '+92-312-8899005',
      email: 'kamran.rider@pharmacy.com',
      dateOfJoining: new Date('2024-07-01'),
      basicSalary: 38000,
      bankName: 'Easypaisa / Telenor Bank',
      bankAccount: '0312-8899005',
      eobi: false,
      sessi: false,
      salaryComponents: { fuelAllowance: 12000, phoneAllowance: 2000 }
    }
  ];

  const seededEmployees = [];
  for (const emp of employeesData) {
    let e = await prisma.employee.findFirst({
      where: { tenantId, phone: emp.phone }
    });
    if (!e) {
      e = await prisma.employee.create({
        data: {
          tenantId,
          branchId,
          ...emp,
          isActive: true
        }
      });
    }
    seededEmployees.push(e);
  }

  // Attendance Records for the past 5 days
  for (const emp of seededEmployees) {
    for (let d = 1; d <= 5; d++) {
      const attDate = daysAgo(d);
      const attDateMidnight = new Date(attDate.getFullYear(), attDate.getMonth(), attDate.getDate());
      const existingAtt = await prisma.attendanceRecord.findFirst({
        where: { tenantId, employeeId: emp.id, date: attDateMidnight }
      });
      if (!existingAtt) {
        const inTime = new Date(attDateMidnight.getTime() + (8 * 3600 + Math.floor(Math.random() * 45) * 60) * 1000);
        const outTime = new Date(attDateMidnight.getTime() + (17 * 3600 + Math.floor(Math.random() * 30) * 60) * 1000);
        await prisma.attendanceRecord.create({
          data: {
            tenantId,
            employeeId: emp.id,
            branchId,
            date: attDateMidnight,
            checkIn: inTime,
            checkOut: outTime,
            source: 'biometric',
            isAbsent: false,
            isLeave: false,
            overtimeMinutes: d === 2 ? 45 : 0
          }
        });
      }
    }
  }

  // Leave Applications & Balances
  for (const emp of seededEmployees) {
    for (const lt of ['annual', 'sick', 'casual']) {
      const existingBal = await prisma.leaveBalance.findFirst({
        where: { tenantId, employeeId: emp.id, leaveType: lt, year: 2026 }
      });
      if (!existingBal) {
        await prisma.leaveBalance.create({
          data: {
            tenantId,
            employeeId: emp.id,
            leaveType: lt,
            year: 2026,
            entitled: lt === 'annual' ? 14 : lt === 'sick' ? 10 : 8,
            taken: lt === 'sick' ? 2 : 1,
            remaining: lt === 'annual' ? 13 : lt === 'sick' ? 8 : 7,
          }
        });
      }
    }
  }

  const leaveCount = await prisma.leaveApplication.count({ where: { tenantId } });
  if (leaveCount === 0 && seededEmployees.length >= 2) {
    await prisma.leaveApplication.create({
      data: {
        tenantId,
        employeeId: seededEmployees[1].id, // Bilal
        leaveType: 'annual',
        fromDate: daysAgo(7),
        toDate: daysAgo(5),
        days: 3,
        reason: 'Family visit to Abbottabad',
        status: 'approved',
        approvedById: userId,
        approvedAt: daysAgo(8)
      }
    });

    await prisma.leaveApplication.create({
      data: {
        tenantId,
        employeeId: seededEmployees[2].id, // Zainab
        leaveType: 'sick',
        fromDate: daysAhead(1),
        toDate: daysAhead(2),
        days: 2,
        reason: 'Seasonal viral fever and medical rest',
        status: 'pending'
      }
    });
  }

  // Payroll Run for October
  const payrollCount = await prisma.payrollRun.count({ where: { tenantId } });
  if (payrollCount === 0) {
    const run = await prisma.payrollRun.create({
      data: {
        tenantId,
        month: 10,
        year: 2026,
        status: 'approved',
        processedById: userId,
        approvedById: userId,
        paidAt: daysAgo(15)
      }
    });

    for (const emp of seededEmployees) {
      const basic = Number(emp.basicSalary);
      const tax = Math.round(basic > 100000 ? basic * 0.08 : basic > 50000 ? basic * 0.03 : 0);
      const eobi = emp.eobi ? 1200 : 0;
      const net = basic - tax - eobi;

      await prisma.payrollItem.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          workingDays: 30,
          presentDays: 30,
          grossPay: basic,
          deductions: { incomeTax: tax, eobi },
          allowances: emp.salaryComponents || {},
          netPay: net,
          isPaid: true,
          bankTransferRef: `FT-${randomUUID().slice(0, 8).toUpperCase()}`
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PURCHASING, PURCHASE ORDERS & GOODS RECEIVED NOTES (GRN)
  // ─────────────────────────────────────────────────────────────
  console.log('[3/9] Seeding Purchase Orders & GRNs...');
  const suppliers = await prisma.supplier.findMany({ where: { tenantId } });
  const products = await prisma.product.findMany({ where: { tenantId } });

  const existingPOs = await prisma.purchaseOrder.findMany({ where: { tenantId } });
  if (existingPOs.length <= 1 && suppliers.length >= 2 && products.length >= 4) {
    // PO 1: Received with GRN
    const po1 = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId,
        supplierId: suppliers[0].id,
        poNumber: 'PO-2024-002',
        status: 'received',
        expectedDate: daysAgo(5),
        approvedById: userId,
        createdById: userId,
        notes: 'Priority antibiotics restock',
        items: {
          create: [
            { productId: products[0].id, qtyOrdered: 50, qtyReceived: 50, unitCost: Number(products[0].costPrice), lineTotal: Number(products[0].costPrice) * 50 },
            { productId: products[1].id, qtyOrdered: 40, qtyReceived: 40, unitCost: Number(products[1].costPrice), lineTotal: Number(products[1].costPrice) * 40 },
          ]
        }
      }
    });

    // GRN for PO 1
    await prisma.grn.create({
      data: {
        tenantId,
        branchId,
        poId: po1.id,
        supplierId: suppliers[0].id,
        supplierInvoiceNumber: 'INV-MP-98442',
        receivedDate: daysAgo(4),
        receivedById: userId,
        status: 'posted',
        notes: 'All items verified in good condition with tamper-evident seals intact',
        items: {
          create: [
            { productId: products[0].id, qtyReceived: 50, costPerUnit: Number(products[0].costPrice) },
            { productId: products[1].id, qtyReceived: 40, costPerUnit: Number(products[1].costPrice) },
          ]
        }
      }
    });

    // PO 2: Sent / Partial
    await prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId,
        supplierId: suppliers[1].id,
        poNumber: 'PO-2024-003',
        status: 'partial',
        expectedDate: daysAhead(2),
        approvedById: userId,
        createdById: userId,
        notes: 'Monthly analgesics and vitamins order',
        items: {
          create: [
            { productId: products[2].id, qtyOrdered: 60, qtyReceived: 30, unitCost: Number(products[2].costPrice), lineTotal: Number(products[2].costPrice) * 60 },
            { productId: products[3].id, qtyOrdered: 30, qtyReceived: 10, unitCost: Number(products[3].costPrice), lineTotal: Number(products[3].costPrice) * 30 },
          ]
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. PRESCRIPTIONS & CONTROLLED SUBSTANCES LOG
  // ─────────────────────────────────────────────────────────────
  console.log('[4/9] Seeding Prescriptions & Controlled Substance Logs...');
  const customers = await prisma.customer.findMany({ where: { tenantId } });
  const doctors = await prisma.doctor.findMany({ where: { tenantId } });

  const rxCount = await prisma.prescription.count({ where: { tenantId } });
  if (rxCount === 0 && customers.length >= 3 && doctors.length >= 2 && products.length >= 5) {
    const panadol = products.find(p => p.name.includes('Panadol')) || products[0];
    const augmentin = products.find(p => p.name.includes('Augmentin')) || products[1];
    const risek = products.find(p => p.name.includes('Risek')) || products[2];
    const xanax = products.find(p => p.name.includes('Xanax')) || products[3];

    // Prescription 1: Filled
    await prisma.prescription.create({
      data: {
        tenantId,
        branchId,
        customerId: customers[1].id, // Tariq Mehmood
        doctorId: doctors[0].id, // Dr. Farhan Ahmed
        issueDate: daysAgo(3),
        expiryDate: daysAhead(27),
        diagnosis: 'Acute bacterial pharyngitis & gastric acidity',
        status: 'filled',
        createdById: userId,
        notes: 'Follow up in 7 days if fever persists',
        items: {
          create: [
            { productId: augmentin.id, qtyPrescribed: 10, qtyDispensed: 10, instructions: '1 tablet BID for 5 days after food' },
            { productId: risek.id, qtyPrescribed: 14, qtyDispensed: 14, instructions: '1 capsule daily before breakfast' },
          ]
        }
      }
    });

    // Prescription 2: Partial
    await prisma.prescription.create({
      data: {
        tenantId,
        branchId,
        customerId: customers[2].id, // Dr. Ayesha
        doctorId: doctors[1].id, // Dr. Sadia Malik
        issueDate: daysAgo(1),
        expiryDate: daysAhead(29),
        diagnosis: 'Post-operative pain management & fever',
        status: 'partial',
        createdById: userId,
        notes: 'Patient took 1 strip initially',
        items: {
          create: [
            { productId: panadol.id, qtyPrescribed: 20, qtyDispensed: 10, instructions: '2 tablets SOS for fever/pain (max 8 daily)' },
          ]
        }
      }
    });

    // Prescription 3: Controlled Schedule X (Xanax)
    const rx3 = await prisma.prescription.create({
      data: {
        tenantId,
        branchId,
        customerId: customers[3].id, // Usman
        doctorId: doctors[0].id,
        issueDate: daysAgo(2),
        expiryDate: daysAhead(12),
        diagnosis: 'Generalized anxiety disorder & acute insomnia',
        status: 'filled',
        createdById: userId,
        notes: 'Strict Schedule-X control dispensing. CNIC copy collected.',
        items: {
          create: [
            { productId: xanax.id, qtyPrescribed: 14, qtyDispensed: 14, instructions: '0.5mg at bedtime. Do not drive.', isControlled: true },
          ]
        }
      }
    });

    // Controlled Substance Log entry
    await prisma.controlledSubstanceLog.create({
      data: {
        tenantId,
        productId: xanax.id,
        customerId: customers[3].id,
        customerCnic: '37405-1122334-5',
        doctorId: doctors[0].id,
        doctorPmdc: doctors[0].pmdcNumber || '12458-S',
        prescriptionId: rx3.id,
        quantity: 14,
        dispensedById: userId,
        dispensedAt: daysAgo(2),
        notes: 'Verified original physician stamp & patient biometric identity'
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DRUG INTERACTIONS & DRUG SAFETY ENGINE
  // ─────────────────────────────────────────────────────────────
  console.log('[5/9] Seeding Drug Interactions & Safety Engine...');
  const interactionsCount = await prisma.drugInteraction.count();
  if (interactionsCount === 0) {
    const interactions = [
      {
        drugAAtc: 'B01AC06', // Aspirin
        drugBAtc: 'M01AE01', // Ibuprofen
        severity: 'major',
        description: 'Concurrent use of Ibuprofen and Aspirin significantly increases risk of GI ulceration and blunts irreversible platelet inhibition by low-dose aspirin.',
        mechanism: 'Competitive binding to COX-1 enzyme in platelets.',
        management: 'Take Aspirin at least 30 minutes before or 8 hours after immediate-release Ibuprofen.',
        source: 'DRAP Clinical Practice Guidelines & DrugBank'
      },
      {
        drugAAtc: 'A02BC01', // Omeprazole
        drugBAtc: 'B01AC04', // Clopidogrel
        severity: 'major',
        description: 'Omeprazole inhibits CYP2C19, decreasing active metabolite formation of Clopidogrel and increasing cardiovascular event risks.',
        mechanism: 'CYP2C19 competitive inhibition.',
        management: 'Consider Pantoprazole or Rabeprazole as safer alternatives if PPI is indicated.',
        source: 'FDA Drug Safety Communication'
      },
      {
        drugAAtc: 'J01FA09', // Clarithromycin
        drugBAtc: 'C10AA05', // Atorvastatin
        severity: 'major',
        description: 'Clarithromycin strongly inhibits CYP3A4, causing 3- to 4-fold elevation in Atorvastatin plasma concentration and increased rhabdomyolysis risk.',
        mechanism: 'Hepatic CYP3A4 inhibition.',
        management: 'Suspend Atorvastatin during Clarithromycin antibiotic course.',
        source: 'American Heart Association Guidelines'
      },
      {
        drugAAtc: 'J01XD01', // Metronidazole
        drugBAtc: 'V03AK01', // Alcohol / Ethanol
        severity: 'contraindicated',
        description: 'Disulfiram-like adverse reaction with severe nausea, profuse vomiting, flushing, tachycardia, and hypotension.',
        mechanism: 'Inhibition of alcohol aldehyde dehydrogenase enzyme.',
        management: 'Avoid all alcoholic beverages and ethanol-containing syrups during and for 48 hours after therapy.',
        source: 'DRAP Safety Warning'
      }
    ];

    for (const inter of interactions) {
      await prisma.drugInteraction.create({ data: inter });
    }
  }

  // Pending Drugs for Drug Sync Staging
  const pendingCount = await prisma.pendingDrug.count();
  if (pendingCount === 0) {
    const pendingCatalog = [
      {
        source: 'openfda',
        externalId: '0781-1852-01',
        name: 'Amoxicillin 500mg Capsules',
        genericName: 'Amoxicillin Trihydrate',
        brandName: 'Amoxil',
        manufacturer: 'Sandoz Inc',
        drugSchedule: 'Schedule H',
        isRxOnly: true,
        dosageForm: 'Capsule',
        route: 'Oral',
        pharmClass: 'Penicillin-class Antibacterial',
        status: 'pending'
      },
      {
        source: 'openfda',
        externalId: '50090-0925-0',
        name: 'Metformin HCl 850mg Tablets',
        genericName: 'Metformin Hydrochloride',
        brandName: 'Glucophage XR',
        manufacturer: 'A-S Medication Solutions',
        drugSchedule: 'Schedule H',
        isRxOnly: true,
        dosageForm: 'Tablet, Extended Release',
        route: 'Oral',
        pharmClass: 'Biguanide Antidiabetic',
        status: 'pending'
      },
      {
        source: 'openfda',
        externalId: '43598-752-30',
        name: 'Atorvastatin Calcium 40mg Tablets',
        genericName: 'Atorvastatin Calcium',
        brandName: 'Lipitor',
        manufacturer: 'Dr. Reddys Laboratories',
        drugSchedule: 'Schedule H',
        isRxOnly: true,
        dosageForm: 'Tablet',
        route: 'Oral',
        pharmClass: 'HMG-CoA Reductase Inhibitor',
        status: 'approved'
      },
    ];

    for (const pd of pendingCatalog) {
      await prisma.pendingDrug.create({ data: pd });
    }

    await prisma.drugSyncLog.create({
      data: {
        source: 'openfda',
        status: 'completed',
        newFound: 3,
        updated: 1,
        startedAt: daysAgo(1),
        completedAt: daysAgo(1),
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. LOYALTY PROGRAM & TRANSACTIONS
  // ─────────────────────────────────────────────────────────────
  console.log('[6/9] Seeding Loyalty Program & Customer Transactions...');
  let prog = await prisma.loyaltyProgram.findFirst({ where: { tenantId } });
  if (!prog) {
    prog = await prisma.loyaltyProgram.create({
      data: {
        tenantId,
        pointsPerRupee: 0.05,
        rupeePerPoint: 1.0,
        pointsExpireDays: 365,
        tierThresholds: { silver: 100, gold: 300, platinum: 600 },
        isActive: true,
      }
    });
  }

  const loyaltyTxCount = await prisma.loyaltyTransaction.count({ where: { tenantId } });
  if (loyaltyTxCount === 0 && customers.length >= 3) {
    const sales = await prisma.sale.findMany({ where: { tenantId }, take: 3 });

    await prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId: customers[1].id,
        saleId: sales[0]?.id || null,
        type: 'earn',
        points: 45,
        balanceAfter: 340,
        notes: 'Points earned on INV-1001'
      }
    });

    await prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId: customers[2].id,
        saleId: sales[1]?.id || null,
        type: 'earn',
        points: 95,
        balanceAfter: 780,
        notes: 'Points earned on INV-1002'
      }
    });

    await prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId: customers[1].id,
        type: 'redeem',
        points: 20,
        balanceAfter: 320,
        notes: 'Redeemed at counter for PKR 20 discount'
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. DELIVERY RIDERS & DELIVERY ORDERS
  // ─────────────────────────────────────────────────────────────
  console.log('[7/9] Seeding Delivery Riders & Home Delivery Orders...');
  let rider = await prisma.deliveryRider.findFirst({ where: { tenantId } });
  if (!rider) {
    rider = await prisma.deliveryRider.create({
      data: {
        tenantId,
        name: 'Kamran Shah',
        phone: '+92-312-8899005',
        vehicleType: 'bike',
        isActive: true
      }
    });

    await prisma.deliveryRider.create({
      data: {
        tenantId,
        name: 'Asad Ullah Khan',
        phone: '+92-321-7788990',
        vehicleType: 'bike',
        isActive: true
      }
    });
  }

  const deliveryOrderCount = await prisma.deliveryOrder.count({ where: { tenantId } });
  if (deliveryOrderCount === 0 && customers.length >= 2) {
    const sales = await prisma.sale.findMany({ where: { tenantId }, take: 2 });
    if (sales.length >= 2) {
      await prisma.deliveryOrder.create({
        data: {
          tenantId,
          saleId: sales[0].id,
          customerId: customers[1].id,
          riderId: rider.id,
          status: 'dispatched',
          deliveryCharge: 150.00,
          dispatchedAt: daysAgo(0.1),
          address: {
            line1: 'House 42, Block 5, Gulshan-e-Iqbal',
            city: 'Karachi',
            phone: '+92-300-1122334',
            instructions: 'Ring bell on 1st floor'
          },
          notes: 'Temperature-sensitive Augmentin delivery'
        }
      });

      await prisma.deliveryOrder.create({
        data: {
          tenantId,
          saleId: sales[1].id,
          customerId: customers[2].id,
          riderId: rider.id,
          status: 'delivered',
          deliveryCharge: 200.00,
          dispatchedAt: daysAgo(1),
          deliveredAt: daysAgo(0.9),
          address: {
            line1: 'Apartment 7B, Creek Vista, DHA Phase 8',
            city: 'Karachi',
            phone: '+92-321-4455667',
            instructions: 'Leave at security reception with guard'
          },
          notes: 'Delivered and verified by customer'
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. NOTIFICATION TEMPLATES & SENT LOGS
  // ─────────────────────────────────────────────────────────────
  console.log('[8/9] Seeding WhatsApp & SMS Notification Templates & Logs...');
  const notifTemplates = [
    {
      key: 'sale_receipt',
      channel: 'whatsapp',
      subject: 'Demo Pharmacy Invoice',
      body: 'Dear {{customer_name}}, thank you for purchasing from Demo Pharmacy! Your receipt for {{invoice_number}} of PKR {{total}} is ready. Stay healthy!'
    },
    {
      key: 'prescription_ready',
      channel: 'whatsapp',
      subject: 'Prescription Ready for Pickup',
      body: 'Assalam-o-Alaikum {{customer_name}}, your prescription #{{rx_number}} has been prepared by our licensed pharmacist and is ready for pickup or home delivery.'
    },
    {
      key: 'refill_reminder',
      channel: 'sms',
      subject: 'Medication Refill Reminder',
      body: 'Dear {{customer_name}}, your monthly medication {{medicine_name}} will run out in 3 days. Reply YES to order delivery from Demo Pharmacy.'
    },
    {
      key: 'delivery_dispatched',
      channel: 'sms',
      subject: 'Order Out for Delivery',
      body: 'Your pharmacy delivery for Invoice {{invoice_number}} is out with rider {{rider_name}} ({{rider_phone}}). Estimated arrival: 30 mins.'
    }
  ];

  for (const t of notifTemplates) {
    const existingT = await prisma.notificationTemplate.findUnique({
      where: { tenantId_key_channel: { tenantId, key: t.key, channel: t.channel } }
    });
    if (!existingT) {
      await prisma.notificationTemplate.create({
        data: { tenantId, ...t, isActive: true }
      });
    }
  }

  const notifLogCount = await prisma.notificationLog.count({ where: { tenantId } });
  if (notifLogCount === 0 && customers.length >= 3) {
    const logs = [
      {
        recipientType: 'customer',
        recipientId: customers[1].id,
        channel: 'whatsapp',
        templateKey: 'sale_receipt',
        payload: { recipient: customers[1].phone, body: 'Dear Tariq Mehmood, your invoice INV-1001 for PKR 2,300 has been sent.', customer_name: 'Tariq Mehmood' },
        status: 'delivered',
        sentAt: daysAgo(0.5),
        deliveredAt: daysAgo(0.5),
      },
      {
        recipientType: 'customer',
        recipientId: customers[2].id,
        channel: 'whatsapp',
        templateKey: 'prescription_ready',
        payload: { recipient: customers[2].phone, body: 'Assalam-o-Alaikum Dr. Ayesha, your prescription #RX-2024-1002 is ready.', customer_name: 'Dr. Ayesha Khan' },
        status: 'delivered',
        sentAt: daysAgo(1),
        deliveredAt: daysAgo(1),
      },
      {
        recipientType: 'customer',
        recipientId: customers[3].id,
        channel: 'sms',
        templateKey: 'refill_reminder',
        payload: { recipient: customers[3].phone, body: 'Dear Mohammad Usman, your refill is due in 3 days.', customer_name: 'Mohammad Usman' },
        status: 'delivered',
        sentAt: daysAgo(2),
        deliveredAt: daysAgo(2),
      },
    ];

    for (const l of logs) {
      await prisma.notificationLog.create({
        data: { tenantId, ...l }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 9. FBR QUEUE ITEMS
  // ─────────────────────────────────────────────────────────────
  console.log('[9/9] Checking FBR Queue Records...');
  const sales = await prisma.sale.findMany({ where: { tenantId } });
  for (const s of sales) {
    const existingQueue = await prisma.fbrSyncQueue.findFirst({
      where: { tenantId, saleId: s.id }
    });
    if (!existingQueue) {
      await prisma.fbrSyncQueue.create({
        data: {
          tenantId,
          saleId: s.id,
          status: 'success',
          attempts: 1,
          syncedAt: s.saleDate,
          payload: { invoiceNumber: s.invoiceNumber, total: Number(s.total) },
          fbrResponse: { InvoiceNumber: s.fbrInvoiceNumber || `FBR-${s.invoiceNumber}`, Status: 'Verified' }
        }
      });
    }
  }

  console.log('====================================================');
  console.log('✅ ALL MODULES SEEDED WITH RICH PAKISTAN PHARMACY MOCKS!');
  console.log('====================================================');
}

seedAll()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
