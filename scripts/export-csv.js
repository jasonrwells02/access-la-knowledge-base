/**
 * Export FAQs to CSV format.
 * Useful for spreadsheets, Airtable, or manual review.
 *
 * Usage: node scripts/export-csv.js > exports/faqs.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const faqs = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'content', 'faqs.json'), 'utf-8')
);

function escapeCsv(str) {
  if (!str) return '';
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Header
process.stdout.write('id,category,question,answer,spoken_answer\n');

// Rows
for (const faq of faqs.faqs) {
  const row = [
    escapeCsv(faq.id),
    escapeCsv(faq.category),
    escapeCsv(faq.question),
    escapeCsv(faq.answer),
    escapeCsv(faq.spoken_answer)
  ].join(',');
  process.stdout.write(row + '\n');
}

process.stderr.write(`Exported ${faqs.faqs.length} FAQ entries to CSV\n`);
