import Papa from 'papaparse';
import * as XLSX from '@e965/xlsx';
import { createClient } from '@/lib/supabase/client';

export const MAX_ATTENDEE_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE = 20 * 1024 * 1024;
export const MAX_ATTENDEE_IMPORT_ROWS = 5000;
export const MAX_ATTENDEE_IMPORT_COLUMNS = 100;

function hasZip64ExtraField(view: DataView, offset: number, length: number): boolean {
  const end = offset + length;
  let cursor = offset;

  while (cursor < end) {
    if (cursor + 4 > end) throw new Error('Invalid Excel archive.');
    const fieldId = view.getUint16(cursor, true);
    const fieldLength = view.getUint16(cursor + 2, true);
    if (cursor + 4 + fieldLength > end) throw new Error('Invalid Excel archive.');
    if (fieldId === 0x0001) return true;
    cursor += 4 + fieldLength;
  }

  return false;
}

function getXlsxUncompressedSize(file: Uint8Array): number {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const minimumEndRecordOffset = Math.max(0, file.byteLength - 22 - 0xffff);
  let endRecordOffset = -1;

  for (let offset = file.byteLength - 22; offset >= minimumEndRecordOffset; offset -= 1) {
    if (view.getUint32(offset, true) !== 0x06054b50) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + 22 + commentLength === file.byteLength) {
      endRecordOffset = offset;
      break;
    }
  }

  if (endRecordOffset < 0) throw new Error('Invalid Excel archive.');

  const diskNumber = view.getUint16(endRecordOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(endRecordOffset + 6, true);
  const entriesOnDisk = view.getUint16(endRecordOffset + 8, true);
  const entryCount = view.getUint16(endRecordOffset + 10, true);
  const centralDirectorySize = view.getUint32(endRecordOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(endRecordOffset + 16, true);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error('Multi-disk Excel archives are not supported.');
  }
  if (entryCount > 256) throw new Error('Excel archives may contain at most 256 entries.');

  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (centralDirectoryEnd > endRecordOffset || centralDirectoryEnd > file.byteLength) {
    throw new Error('Invalid Excel archive.');
  }

  let offset = centralDirectoryOffset;
  let totalUncompressedSize = 0;

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (offset + 46 > centralDirectoryEnd || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('Invalid Excel archive.');
    }

    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraFieldLength = view.getUint16(offset + 30, true);
    const fileCommentLength = view.getUint16(offset + 32, true);
    const diskStart = view.getUint16(offset + 34, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nextEntryOffset = offset + 46 + fileNameLength + extraFieldLength + fileCommentLength;

    if (
      compressedSize === 0xffffffff
      || uncompressedSize === 0xffffffff
      || diskStart !== 0
      || localHeaderOffset + 30 > centralDirectoryOffset
      || nextEntryOffset > centralDirectoryEnd
      || view.getUint32(localHeaderOffset, true) !== 0x04034b50
    ) {
      throw new Error('Invalid or unsupported Excel archive entry.');
    }

    const localFlags = view.getUint16(localHeaderOffset + 6, true);
    const localCompressionMethod = view.getUint16(localHeaderOffset + 8, true);
    const localCompressedSize = view.getUint32(localHeaderOffset + 18, true);
    const localUncompressedSize = view.getUint32(localHeaderOffset + 22, true);
    const localFileNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraFieldLength = view.getUint16(localHeaderOffset + 28, true);
    const localDataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
    if (localDataOffset + localCompressedSize > centralDirectoryOffset) {
      throw new Error('Invalid Excel archive entry.');
    }
    if ((localFlags & 0x0008) !== 0) {
      throw new Error('Streamed Excel archive entries are not supported.');
    }
    if (localUncompressedSize > MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE) {
      throw new Error('Excel file expands beyond the 20MB processing limit.');
    }
    if (
      localCompressedSize === 0xffffffff
      || localUncompressedSize === 0xffffffff
      || localCompressedSize !== compressedSize
      || localUncompressedSize !== uncompressedSize
      || localCompressionMethod !== view.getUint16(offset + 10, true)
      || hasZip64ExtraField(view, offset + 46 + fileNameLength, extraFieldLength)
      || hasZip64ExtraField(view, localHeaderOffset + 30 + localFileNameLength, localExtraFieldLength)
    ) {
      throw new Error('Invalid Excel archive size metadata.');
    }

    totalUncompressedSize += uncompressedSize;
    if (totalUncompressedSize > MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE) {
      throw new Error('Excel file expands beyond the 20MB processing limit.');
    }
    offset = nextEntryOffset;
  }

  return totalUncompressedSize;
}

export interface ImportedAttendeeRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
  distance_category_id?: string;
  distance_category_name?: string;
  gender?: string;
  date_of_birth?: string;
  age?: number;
  t_shirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  city?: string;
  medical_notes?: string;
  _originalRowIndex: number;
}

export type AttendeeImportInputRow = Record<string, unknown>;
export type WalkathonDistanceCategory = { id: string; name: string };

export interface AttendeeImportPreview {
  rows: ImportedAttendeeRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: { row: number; reason: string }[];
}

export interface AttendeeImportResult {
  success: boolean;
  metrics: {
    total_rows: number;
    imported_count: number;
    existing_count: number;
    duplicate_count: number;
    error_count: number;
  };
  errors: { first_name: string; email: string; error: string }[];
}

export type FieldMapping = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  organization: string;
  job_title: string;
  distance_category_id?: string;
  gender?: string;
  date_of_birth?: string;
  age?: string;
  t_shirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  city?: string;
  medical_notes?: string;
};

export const attendeeImportService = {
  /**
   * Parse a file into raw JSON objects.
   */
  async parseFile(file: File): Promise<Record<string, unknown>[]> {
    if (file.size > MAX_ATTENDEE_IMPORT_FILE_SIZE) {
      throw new Error('File size must be less than 5MB.');
    }

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      const content = await file.text();
      return new Promise((resolve, reject) => {
        Papa.parse<Record<string, unknown>>(content, {
          header: true,
          skipEmptyLines: true,
          preview: MAX_ATTENDEE_IMPORT_ROWS + 2,
          complete: (results) => {
            if (results.data.length > MAX_ATTENDEE_IMPORT_ROWS || results.meta.cursor < content.length) {
              reject(new Error(`Import files may contain at most ${MAX_ATTENDEE_IMPORT_ROWS} rows.`));
              return;
            }
            if (results.meta.fields && results.meta.fields.length > MAX_ATTENDEE_IMPORT_COLUMNS) {
              reject(new Error(`Import files may contain at most ${MAX_ATTENDEE_IMPORT_COLUMNS} columns.`));
              return;
            }
            resolve(results.data);
          },
          error: (error: Error) => {
            reject(error);
          }
        });
      });
    }
    if (ext !== 'xlsx') {
      throw new Error('Unsupported file format. Please upload .csv or .xlsx.');
    }

    const fileData = new Uint8Array(await file.arrayBuffer());
    const signature = fileData;
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) {
      throw new Error('Invalid Excel file.');
    }
    getXlsxUncompressedSize(fileData);

    const workbook = XLSX.read(fileData, {
      type: 'array',
      sheetRows: MAX_ATTENDEE_IMPORT_ROWS + 2,
    });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('The Excel file does not contain a worksheet.');
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) throw new Error('The Excel file does not contain a readable worksheet.');
    const fullRange = worksheet['!fullref'] || worksheet['!ref'];
    if (!fullRange) throw new Error('The Excel file does not contain any worksheet data.');
    const range = XLSX.utils.decode_range(fullRange);
    if (range.e.r - range.s.r > MAX_ATTENDEE_IMPORT_ROWS) {
      throw new Error(`Import files may contain at most ${MAX_ATTENDEE_IMPORT_ROWS} rows.`);
    }
    if (range.e.c - range.s.c + 1 > MAX_ATTENDEE_IMPORT_COLUMNS) {
      throw new Error(`Import files may contain at most ${MAX_ATTENDEE_IMPORT_COLUMNS} columns.`);
    }

    return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  },

  /**
   * Apply column mapping to raw JSON objects to produce normalized rows,
   * while validating and detecting duplicates.
   */
  processMapping(
    rawRows: AttendeeImportInputRow[],
    mapping: FieldMapping,
    isWalkathon: boolean = false,
    distanceCategories: WalkathonDistanceCategory[] = [],
  ): AttendeeImportPreview {
    const rows: ImportedAttendeeRow[] = [];
    const errors: { row: number; reason: string }[] = [];
    const seenEmails = new Set<string>();
    
    let validRows = 0;
    let duplicateRows = 0;

    rawRows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      
      
      // Extract mapped fields
      const email = String(rawRow[mapping.email] || '').trim().toLowerCase();
      const firstName = String(rawRow[mapping.first_name] || '').trim();
      const lastName = String(rawRow[mapping.last_name] || '').trim();
      const phone = String(rawRow[mapping.phone] || '').trim();
      const organization = String(rawRow[mapping.organization] || '').trim();
      const jobTitle = String(rawRow[mapping.job_title] || '').trim();
      
      let distanceCategoryId = '';
      let distanceCategoryName = '';
      let gender = '';
      let dateOfBirth = '';
      let age: number | undefined;
      let tShirtSize = '';
      let emergencyContactName = '';
      let emergencyContactPhone = '';
      let city = '';
      let medicalNotes = '';

      if (isWalkathon) {
        const rawDistance = String(mapping.distance_category_id && rawRow[mapping.distance_category_id] ? rawRow[mapping.distance_category_id] : '').trim().toLowerCase();
        if (rawDistance) {
            const matchedCategory = distanceCategories.find(c => String(c.name).toLowerCase() === rawDistance || String(c.name).toLowerCase().replace(/\s+/g, '') === rawDistance.replace(/\s+/g, ''));
            if (matchedCategory) {
                distanceCategoryId = matchedCategory.id;
                distanceCategoryName = matchedCategory.name;
            } else {
                errors.push({ row: rowNum, reason: `Distance category "${String(rawRow[mapping.distance_category_id || ''])}" is not configured for this event.` });
                return;
            }
        } else {
             errors.push({ row: rowNum, reason: 'Distance category is required for Walkathon.' });
             return;
        }

        const rawGender = String(mapping.gender && rawRow[mapping.gender] ? rawRow[mapping.gender] : '').trim().toLowerCase();
        if (rawGender) {
            if (['m', 'male'].includes(rawGender)) gender = 'Male';
            else if (['f', 'female'].includes(rawGender)) gender = 'Female';
            else if (rawGender === 'other') gender = 'Other';
            else if (['prefer not to say', 'prefer_not_to_say', 'pnts'].includes(rawGender)) gender = 'Prefer not to say';
            else {
                errors.push({ row: rowNum, reason: 'Gender must be Male, Female, Other, or Prefer not to say.' });
                return;
            }
        } else {
            errors.push({ row: rowNum, reason: 'Gender is required for Walkathon.' });
            return;
        }

        const rawTShirt = String(mapping.t_shirt_size && rawRow[mapping.t_shirt_size] ? rawRow[mapping.t_shirt_size] : '').trim().toLowerCase();
        if (rawTShirt) {
            const sizeMap: Record<string, string> = {
                'xs': 'XS', 'extra small': 'XS',
                's': 'S', 'small': 'S',
                'm': 'M', 'medium': 'M',
                'l': 'L', 'large': 'L',
                'xl': 'XL', 'extra large': 'XL',
                'xxl': 'XXL', '2xl': 'XXL',
                'xxxl': 'XXXL', '3xl': 'XXXL'
            };
            if (sizeMap[rawTShirt]) {
                tShirtSize = sizeMap[rawTShirt];
            } else {
                errors.push({ row: rowNum, reason: 'Unsupported T-shirt size.' });
                return;
            }
        } else {
            errors.push({ row: rowNum, reason: 'T-shirt size is required for Walkathon.' });
            return;
        }

        emergencyContactName = String(mapping.emergency_contact_name && rawRow[mapping.emergency_contact_name] ? rawRow[mapping.emergency_contact_name] : '').trim();
        emergencyContactPhone = String(mapping.emergency_contact_phone && rawRow[mapping.emergency_contact_phone] ? rawRow[mapping.emergency_contact_phone] : '').trim();
        
        if (!emergencyContactName) {
            errors.push({ row: rowNum, reason: 'Emergency contact name is required for Walkathon.' });
            return;
        }
        if (!emergencyContactPhone) {
            errors.push({ row: rowNum, reason: 'Emergency contact phone is required for Walkathon.' });
            return;
        }

        dateOfBirth = String(mapping.date_of_birth && rawRow[mapping.date_of_birth] ? rawRow[mapping.date_of_birth] : '').trim();
        const rawAge = String(mapping.age && rawRow[mapping.age] ? rawRow[mapping.age] : '').trim();
        if (rawAge && !isNaN(Number(rawAge))) {
            age = Number(rawAge);
        }
        if (!dateOfBirth && !age) {
             errors.push({ row: rowNum, reason: 'Age or DOB is required for Walkathon.' });
             return;
        }

        city = String(mapping.city && rawRow[mapping.city] ? rawRow[mapping.city] : '').trim();
        medicalNotes = String(mapping.medical_notes && rawRow[mapping.medical_notes] ? rawRow[mapping.medical_notes] : '').trim();
      }

      if (!email || !firstName) {
        errors.push({ row: rowNum, reason: !email ? 'Missing email address' : 'Missing first name' });
        return;
      }
      
      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, reason: 'Invalid email address format' });
        return;
      }

      if (seenEmails.has(email)) {
        duplicateRows++;
        return;
      }

      seenEmails.add(email);
      validRows++;
      
      const importedRow: ImportedAttendeeRow = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        organization,
        job_title: jobTitle,
        _originalRowIndex: rowNum
      };

      if (isWalkathon) {
          importedRow.distance_category_id = distanceCategoryId;
          importedRow.distance_category_name = distanceCategoryName;
          importedRow.gender = gender;
          importedRow.t_shirt_size = tShirtSize;
          importedRow.emergency_contact_name = emergencyContactName;
          importedRow.emergency_contact_phone = emergencyContactPhone;
          if (dateOfBirth) importedRow.date_of_birth = dateOfBirth;
          if (age) importedRow.age = age;
          if (city) importedRow.city = city;
          if (medicalNotes) importedRow.medical_notes = medicalNotes;
      }

      rows.push(importedRow);
    });

    return {
      rows,
      totalRows: rawRows.length,
      validRows,
      invalidRows: errors.length,
      duplicateRows,
      errors
    };
  },

  /**
   * Execute the import by calling the Supabase RPC.
   */
  async executeImport(
    workspaceId: string, 
    eventId: string, 
    fileName: string, 
    rows: ImportedAttendeeRow[]
  ): Promise<AttendeeImportResult> {
    const supabase = createClient();
    
    // Remove temporary internal fields before sending to RPC
    const cleanRows = rows.map(r => {
      const { _originalRowIndex, ...cleanRow } = r;
      return cleanRow;
    });

    const { data, error } = await supabase.rpc('import_attendees', {
      p_workspace_id: workspaceId,
      p_event_id: eventId,
      p_file_name: fileName,
      p_rows: cleanRows
    });

    if (error) {
      throw error;
    }

    return data as AttendeeImportResult;
  }
};
