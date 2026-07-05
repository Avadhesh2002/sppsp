/**
 * SPPS Student Import Script
 * 
 * Usage: node scripts/importStudents.js <path-to-csv>
 * Example: node scripts/importStudents.js C:/Users/Tripathi-Ji/Downloads/students.csv
 * 
 * Default password for all students: Student@123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');
const bcrypt   = require('bcryptjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

// Convert Excel class names to SPPS format
const mapClass = (raw) => {
  if (!raw) return null;
  const c = raw.toString().trim().toUpperCase();
  const map = {
    'NUR': 'Nursery', 'NURSERY': 'Nursery',
    'LKG': 'LKG',
    'UKG': 'UKG',
    'I': '1', '1': '1',
    'II': '2', '2': '2',
    'III': '3', '3': '3',
    'IV': '4', '4': '4',
    'V': '5', '5': '5',
    'VI': '6', '6': '6',
    'VII': '7', '7': '7',
    'VIII': '8', '8': '8',
    'IX': '9', '9': '9',
    'X': '10', '10': '10',
    'XI': '11', '11': '11',
    'XII': '12', '12': '12',
  };
  return map[c] || null;
};

// Parse date from DD/MM/YYYY format
const parseDate = (raw) => {
  if (!raw || raw.toString().trim() === '') return null;
  const parts = raw.toString().trim().split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
};

// Clean phone numbers (keep only digits, max 10)
const cleanPhone = (raw) => {
  if (!raw) return '';
  const digits = raw.toString().replace(/\D/g, '');
  if (digits === '0000000000' || digits.length === 0) return '';
  return digits.slice(-10); // take last 10 digits
};

// Map gender
const mapGender = (raw) => {
  if (!raw) return 'Male';
  const g = raw.toString().toLowerCase().trim();
  if (g === 'female' || g === 'f') return 'Female';
  if (g === 'other') return 'Other';
  return 'Male';
};

// Map category
const mapCategory = (raw) => {
  if (!raw) return 'General';
  const c = raw.toString().trim();
  const valid = ['General', 'OBC', 'SC', 'ST', 'Minority', 'Other'];
  const match = valid.find(v => v.toLowerCase() === c.toLowerCase());
  return match || 'General';
};

// Simple CSV parser (handles quoted fields with commas inside)
const parseCSV = (content) => {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const result = [];

  // Parse one line into fields
  const parseLine = (line) => {
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] || '';
    });
    result.push(row);
  }
  return result;
};

// ── Main ─────────────────────────────────────────────────────────────────────
const main = async () => {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('❌ Please provide CSV file path');
    console.error('   Usage: node scripts/importStudents.js C:/path/to/students.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected:', mongoose.connection.host);

  const Student = require('../models/Student');
  const Settings = require('../models/Settings');

  // Get current academic year
  const settings = await Settings.findOne();
  const academicYear = settings?.currentAcademicYear || '2025-26';
  console.log(`📅 Academic Year: ${academicYear}`);

  // Hash default password once
  const DEFAULT_PASSWORD = 'Student@123';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  // Read and parse CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  console.log(`📄 Total rows in CSV: ${rows.length}`);

  let success = 0, skipped = 0, errors = 0;
  const skipLog = [];
  const errorLog = [];

  for (const row of rows) {
    // Get Admission No
    const admNo = (row['AdmissionNo'] || row['Admission No'] || row['admissionno'] || '').toString().trim();
    const name  = (row['StudentName'] || row['Student Name'] || '').toString().trim();

    if (!admNo || !name) {
      skipped++;
      skipLog.push(`SKIP: Empty name or admission no`);
      continue;
    }

    // Map class
    const rawClass = (row['ClassName'] || row['Class'] || '').toString().trim();
    const mappedClass = mapClass(rawClass);
    if (!mappedClass) {
      skipped++;
      skipLog.push(`SKIP [${admNo}] ${name}: Unknown class "${rawClass}"`);
      continue;
    }

    // Check duplicate UID
    const existing = await Student.findOne({ UID: admNo });
    if (existing) {
      skipped++;
      skipLog.push(`SKIP [${admNo}] ${name}: UID already exists`);
      continue;
    }

    // Build student object
    const fatherMobile = cleanPhone(row['PrimaryMobileNo'] || row['FatherMobile'] || '');
    const motherMobile = cleanPhone(row['MotherMobile'] || row['SecondaryMobileNo'] || '');
    const whatsapp     = cleanPhone(row['WhatsAppNumber'] || '');
    const phone        = cleanPhone(row['PrimaryMobileNo'] || '');

    const admissionType = (row['StudentType'] || 'Old').toString().trim() === 'New' ? 'New' : 'Old';

    const address = [
      row['ResidentalAddress'] || row['PermanentAddress'] || '',
    ].filter(Boolean).join(', ').trim() || 'Not provided';

    const pincode = (row['ResidentalPincode'] || row['PermanentPincode'] || '211013').toString().trim().replace(/\D/g, '').slice(0, 6).padEnd(6, '0');

    const studentData = {
      name,
      UID: admNo,
      password: hashedPassword,
      class: mappedClass,
      section: (row['SectionName'] || 'A').toString().trim() || 'A',
      gender: mapGender(row['Gender']),
      dateOfBirth: parseDate(row['DOB']),
      category: mapCategory(row['StudentCategory']),
      address,
      pincode: /^\d{6}$/.test(pincode) ? pincode : '211013',
      fatherName: (row['FatherOrGuardianName'] || '').toString().trim(),
      fatherMobile: fatherMobile.length === 10 ? fatherMobile : '',
      fatherOccupation: (row['FatherOrGuardianOccupation'] || '').toString().trim(),
      fatherQualification: (row['FatherOrGuardianQualification'] || '').toString().trim(),
      motherName: (row['MotherName'] || '').toString().trim(),
      motherMobile: motherMobile.length === 10 ? motherMobile : '',
      motherOccupation: (row['MotherOccupation'] || '').toString().trim(),
      parentEmail: (row['Email'] || '').toString().trim().toLowerCase() || `${admNo}@spps.school`,
      whatsappNumber: whatsapp.length === 10 ? whatsapp : '',
      aadharNumber: (row['StudentAadharNumber'] || '').toString().trim().replace(/\D/g, '').slice(0, 12),
      penNumber: (row['PENNumber'] || '').toString().trim().replace(/\D/g, '').slice(0, 12),
      admissionType,
      academicYear,
      accountStatus: 'active',
      admissionDate: parseDate(row['AdmissionDate'] || row['DOJ']) || new Date(),
    };

    try {
      await Student.create(studentData);
      success++;
      if (success % 10 === 0) process.stdout.write(`\r✅ Imported: ${success}`);
    } catch (err) {
      errors++;
      errorLog.push(`ERROR [${admNo}] ${name}: ${err.message}`);
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════');
  console.log(`  ✅ Imported successfully : ${success}`);
  console.log(`  ⏭️  Skipped (duplicate/invalid) : ${skipped}`);
  console.log(`  ❌ Errors               : ${errors}`);
  console.log('═══════════════════════════════════════');
  console.log(`  🔑 Default Password: ${DEFAULT_PASSWORD}`);
  console.log(`  📅 Academic Year: ${academicYear}`);

  if (skipLog.length > 0) {
    console.log('\n📋 Skip Log:');
    skipLog.slice(0, 20).forEach(l => console.log('  ' + l));
    if (skipLog.length > 20) console.log(`  ... and ${skipLog.length - 20} more`);
  }

  if (errorLog.length > 0) {
    console.log('\n🔴 Error Log:');
    errorLog.forEach(l => console.log('  ' + l));
  }

  // Save logs to file
  const logContent = [
    `Import run at: ${new Date().toLocaleString()}`,
    `Total: ${rows.length}, Imported: ${success}, Skipped: ${skipped}, Errors: ${errors}`,
    '',
    '--- SKIPPED ---',
    ...skipLog,
    '',
    '--- ERRORS ---',
    ...errorLog,
  ].join('\n');

  const logPath = path.join(__dirname, 'import_log.txt');
  fs.writeFileSync(logPath, logContent);
  console.log(`\n📝 Full log saved to: ${logPath}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done!');
  process.exit(0);
};

main().catch(err => {
  console.error('❌ Fatal Error:', err.message);
  process.exit(1);
});
