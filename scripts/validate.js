/**
 * Validate all JSON files in the knowledge base.
 * Checks: valid JSON, required fields, cross-references.
 *
 * Usage: node scripts/validate.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

let errors = 0;
let warnings = 0;

function check(condition, message, level = 'error') {
  if (!condition) {
    if (level === 'error') {
      console.error(`  ERROR: ${message}`);
      errors++;
    } else {
      console.warn(`  WARN: ${message}`);
      warnings++;
    }
  }
}

function loadAndValidate(filePath) {
  const fullPath = path.join(dataDir, filePath);
  console.log(`\nValidating ${filePath}...`);

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);
    console.log(`  OK: Valid JSON (${content.length} bytes)`);
    return data;
  } catch (e) {
    console.error(`  ERROR: Invalid JSON - ${e.message}`);
    errors++;
    return null;
  }
}

// --- Validate each file ---

const org = loadAndValidate('entities/organization.json');
if (org) {
  check(org.name, 'organization.json missing name');
  check(org.stats, 'organization.json missing stats');
  check(org.addresses, 'organization.json missing addresses');
  check(org.website, 'organization.json missing website');
}

const contacts = loadAndValidate('entities/contacts.json');
if (contacts) {
  check(contacts.contacts?.length > 0, 'contacts.json has no contacts');
  for (const c of contacts.contacts) {
    check(c.id, `contact missing id: ${JSON.stringify(c).slice(0, 50)}`);
    check(c.name, `contact ${c.id} missing name`);
    check(c.purpose, `contact ${c.id} missing purpose`);
    check(c.phone || c.email, `contact ${c.id} has no phone or email`, 'warn');
  }
  const defaultRoute = contacts.contacts.find(c => c.is_default_route);
  check(defaultRoute, 'No default route contact defined', 'warn');
}

const regions = loadAndValidate('entities/service-regions.json');
if (regions) {
  check(regions.regions?.length === 6, `Expected 6 regions, got ${regions.regions?.length}`);
  for (const r of regions.regions) {
    check(r.id, `region missing id`);
    check(r.contractor?.name, `region ${r.id} missing contractor name`);
    check(r.contractor?.phone, `region ${r.id} missing contractor phone`);
  }
  check(regions.city_to_region_mapping, 'Missing city-to-region mapping');
}

const programs = loadAndValidate('entities/programs.json');
if (programs) {
  check(programs.programs?.length >= 7, `Expected 7+ programs, got ${programs.programs?.length}`);
  for (const p of programs.programs) {
    check(p.id, `program missing id`);
    check(p.name, `program ${p.id} missing name`);
    check(p.description, `program ${p.id} missing description`);
    check(p.keywords?.length > 0, `program ${p.id} missing keywords`, 'warn');
  }
}

const policies = loadAndValidate('entities/policies.json');
if (policies) {
  check(policies.fares, 'policies.json missing fares');
  check(policies.booking, 'policies.json missing booking');
  check(policies.pickup, 'policies.json missing pickup');
  check(policies.no_show, 'policies.json missing no_show');
  check(policies.eligibility, 'policies.json missing eligibility');
  check(policies.holiday_schedule, 'policies.json missing holiday_schedule');
}

const people = loadAndValidate('entities/people.json');
if (people) {
  check(people.board_of_directors?.members?.length > 0, 'people.json missing board members');
  check(people.tpac?.members?.length > 0, 'people.json missing TPAC members');
  check(people.cac?.members?.length > 0, 'people.json missing CAC members');
}

const meetings = loadAndValidate('entities/meetings.json');
if (meetings) {
  check(meetings.meetings?.length >= 3, `Expected 3+ meeting types, got ${meetings.meetings?.length}`);
}

const memberAgencies = loadAndValidate('entities/member-agencies.json');
if (memberAgencies) {
  const total = (memberAgencies.transit_authorities?.length || 0) + (memberAgencies.cities?.length || 0);
  check(total >= 40, `Expected 40+ member agencies, got ${total}`);
}

const transitResources = loadAndValidate('entities/transit-resources.json');
if (transitResources) {
  check(transitResources.mobility_management, 'transit-resources.json missing mobility_management');
  check(transitResources.neighboring_county_paratransit, 'transit-resources.json missing neighboring counties');
  check(transitResources.designated_stands, 'transit-resources.json missing designated stands');
}

const faqs = loadAndValidate('content/faqs.json');
if (faqs) {
  check(faqs.faqs?.length >= 50, `Expected 50+ FAQs, got ${faqs.faqs?.length}`);
  for (const faq of faqs.faqs) {
    check(faq.id, `FAQ missing id`);
    check(faq.question, `FAQ ${faq.id} missing question`);
    check(faq.answer, `FAQ ${faq.id} missing answer`);
    check(faq.spoken_answer, `FAQ ${faq.id} missing spoken_answer`, 'warn');
  }
}

const intents = loadAndValidate('routing/intent-map.json');
if (intents) {
  check(intents.intents?.length >= 20, `Expected 20+ intents, got ${intents.intents?.length}`);
  check(intents.fallback, 'intent-map.json missing fallback');
  for (const intent of intents.intents) {
    check(intent.id, `intent missing id`);
    check(intent.patterns?.length > 0, `intent ${intent.id} has no patterns`);
    check(intent.spoken_response, `intent ${intent.id} missing spoken_response`);
  }
}

const escalation = loadAndValidate('routing/escalation-rules.json');
if (escalation) {
  check(escalation.escalation_triggers?.length >= 5, `Expected 5+ escalation triggers`);
}

// --- Cross-reference checks ---
console.log('\nCross-reference checks...');

if (intents && contacts) {
  const contactIds = new Set(contacts.contacts.map(c => c.id));
  for (const intent of intents.intents) {
    if (intent.transfer_to) {
      check(contactIds.has(intent.transfer_to),
        `Intent ${intent.id} transfers to unknown contact: ${intent.transfer_to}`);
    }
  }
}

// --- Summary ---
console.log(`\n${'='.repeat(50)}`);
console.log(`Validation complete: ${errors} errors, ${warnings} warnings`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log('All checks passed!');
}
