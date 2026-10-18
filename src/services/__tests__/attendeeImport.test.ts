import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from '@e965/xlsx';
import {
  attendeeImportService,
  MAX_ATTENDEE_IMPORT_COLUMNS,
  MAX_ATTENDEE_IMPORT_FILE_SIZE,
  MAX_ATTENDEE_IMPORT_ROWS,
  MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE,
} from '../attendeeImport';

function makeWorkbookFile(rows: unknown[][], filename = 'attendees.xlsx'): File {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new File([buffer], filename);
}

describe('attendee import file parsing', () => {
  it('parses the first worksheet as field objects', async () => {
    const file = makeWorkbookFile([
      ['First name', 'Email', 'Notes'],
      ['Ada', 'ada@example.test', 'Event organizer'],
    ]);

    assert.deepEqual(await attendeeImportService.parseFile(file), [{
      'First name': 'Ada',
      Email: 'ada@example.test',
      Notes: 'Event organizer',
    }]);
  });

  it('parses CSV using the same field-object shape', async () => {
    const file = new File(['First name,Email\nAda,ada@example.test\n'], 'attendees.csv');

    assert.deepEqual(await attendeeImportService.parseFile(file), [{
      'First name': 'Ada',
      Email: 'ada@example.test',
    }]);
  });

  it('rejects unsupported formats and files over the byte limit', async () => {
    await assert.rejects(
      attendeeImportService.parseFile(new File(['data'], 'attendees.xls')),
      /Unsupported file format/,
    );
    await assert.rejects(
      attendeeImportService.parseFile(
        new File([new Uint8Array(MAX_ATTENDEE_IMPORT_FILE_SIZE + 1)], 'attendees.xlsx'),
      ),
      /less than 5MB/,
    );
  });

  it('rejects malformed and empty workbooks', async () => {
    await assert.rejects(
      attendeeImportService.parseFile(new File(['not an xlsx archive'], 'malformed.xlsx')),
      /Invalid Excel file/,
    );
    await assert.rejects(
      attendeeImportService.parseFile(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'truncated.xlsx')),
      /Invalid Excel archive/,
    );
    await assert.rejects(
      attendeeImportService.parseFile(makeWorkbookFile([])),
      /does not contain any worksheet data/,
    );
  });

  it('rejects archive expansion beyond the processing limit before parsing', async () => {
    const bytes = new Uint8Array(await makeWorkbookFile([['Name'], ['Ada']]).arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let centralDirectoryEntryOffset = -1;

    for (let offset = 0; offset + 46 <= bytes.length; offset += 1) {
      if (view.getUint32(offset, true) === 0x02014b50) {
        centralDirectoryEntryOffset = offset;
        break;
      }
    }

    assert.notEqual(centralDirectoryEntryOffset, -1);
    const localHeaderOffset = view.getUint32(centralDirectoryEntryOffset + 42, true);
    const oversizedArchive = bytes.slice();
    const oversizedView = new DataView(oversizedArchive.buffer);
    oversizedView.setUint32(
      centralDirectoryEntryOffset + 24,
      MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE + 1,
      true,
    );
    oversizedView.setUint32(
      localHeaderOffset + 22,
      MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE + 1,
      true,
    );
    const centralMismatch = bytes.slice();
    new DataView(centralMismatch.buffer).setUint32(
      centralDirectoryEntryOffset + 24,
      MAX_ATTENDEE_IMPORT_UNCOMPRESSED_SIZE + 1,
      true,
    );

    await assert.rejects(
      attendeeImportService.parseFile(new File([oversizedArchive], 'expanded.xlsx')),
      /expands beyond the 20MB processing limit/,
    );
    await assert.rejects(
      attendeeImportService.parseFile(new File([centralMismatch], 'mismatched-sizes.xlsx')),
      /Invalid Excel archive size metadata/,
    );
  });

  it('rejects streamed ZIP entries whose local size cannot be bounded', async () => {
    const bytes = new Uint8Array(await makeWorkbookFile([['Name'], ['Ada']]).arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let localHeaderOffset = -1;

    for (let offset = 0; offset + 46 <= bytes.length; offset += 1) {
      if (view.getUint32(offset, true) === 0x02014b50) {
        localHeaderOffset = view.getUint32(offset + 42, true);
        break;
      }
    }

    assert.notEqual(localHeaderOffset, -1);
    view.setUint16(localHeaderOffset + 6, view.getUint16(localHeaderOffset + 6, true) | 0x0008, true);
    await assert.rejects(
      attendeeImportService.parseFile(new File([bytes], 'streamed.xlsx')),
      /Streamed Excel archive entries are not supported/,
    );
  });

  it('rejects archives over the entry limit and ZIP64 size markers', async () => {
    const bytes = new Uint8Array(await makeWorkbookFile([['Name'], ['Ada']]).arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let endRecordOffset = -1;
    let centralDirectoryEntryOffset = -1;

    for (let offset = 0; offset + 22 <= bytes.length; offset += 1) {
      if (view.getUint32(offset, true) === 0x06054b50) {
        const commentLength = view.getUint16(offset + 20, true);
        if (offset + 22 + commentLength === bytes.length) {
          endRecordOffset = offset;
          break;
        }
      }
    }
    for (let offset = 0; offset + 46 <= bytes.length; offset += 1) {
      if (view.getUint32(offset, true) === 0x02014b50) {
        centralDirectoryEntryOffset = offset;
        break;
      }
    }

    assert.notEqual(endRecordOffset, -1);
    assert.notEqual(centralDirectoryEntryOffset, -1);

    const tooManyEntries = bytes.slice();
    const tooManyEntriesView = new DataView(tooManyEntries.buffer);
    tooManyEntriesView.setUint16(endRecordOffset + 8, 257, true);
    tooManyEntriesView.setUint16(endRecordOffset + 10, 257, true);

    const zip64Marker = bytes.slice();
    new DataView(zip64Marker.buffer).setUint32(centralDirectoryEntryOffset + 24, 0xffffffff, true);

    await assert.rejects(
      attendeeImportService.parseFile(new File([tooManyEntries], 'too-many-entries.xlsx')),
      /at most 256 entries/,
    );
    await assert.rejects(
      attendeeImportService.parseFile(new File([zip64Marker], 'zip64-marker.xlsx')),
      /Invalid or unsupported Excel archive entry/,
    );
  });

  it('rejects workbooks with more than the row or column limit', async () => {
    const tooManyRows = makeWorkbookFile([
      ['Name'],
      ...Array.from({ length: MAX_ATTENDEE_IMPORT_ROWS + 1 }, (_, row) => [`Attendee ${row}`]),
    ]);
    await assert.rejects(attendeeImportService.parseFile(tooManyRows), /at most 5000 rows/);

    const tooManyColumns = makeWorkbookFile([
      Array.from({ length: MAX_ATTENDEE_IMPORT_COLUMNS + 1 }, (_, index) => `Column ${index}`),
    ]);
    await assert.rejects(attendeeImportService.parseFile(tooManyColumns), /at most 100 columns/);
  });
});
