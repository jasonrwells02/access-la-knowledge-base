/**
 * Export knowledge base to an Obsidian vault with wikilinks for graph view.
 * Each entity becomes a markdown note. [[wikilinks]] create graph edges.
 *
 * Usage: node scripts/export-obsidian.js
 * Output: obsidian-vault/ directory ready to open in Obsidian
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
const vaultDir = path.join(__dirname, '..', 'obsidian-vault');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filePath), 'utf-8'));
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sanitize(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
}

function writeNote(subdir, filename, content) {
  const dir = path.join(vaultDir, subdir);
  mkdirp(dir);
  fs.writeFileSync(path.join(dir, `${sanitize(filename)}.md`), content);
}

// Clean and recreate vault
if (fs.existsSync(vaultDir)) {
  fs.rmSync(vaultDir, { recursive: true });
}
mkdirp(vaultDir);

// Load all data
const org = loadJson('entities/organization.json');
const contacts = loadJson('entities/contacts.json');
const regions = loadJson('entities/service-regions.json');
const programs = loadJson('entities/programs.json');
const policies = loadJson('entities/policies.json');
const people = loadJson('entities/people.json');
const meetings = loadJson('entities/meetings.json');
const memberAgencies = loadJson('entities/member-agencies.json');
const transit = loadJson('entities/transit-resources.json');
const faqs = loadJson('content/faqs.json');
const intents = loadJson('routing/intent-map.json');
const escalation = loadJson('routing/escalation-rules.json');

// ============================================================
// HOME / INDEX
// ============================================================
writeNote('', 'Access Services Knowledge Base', `---
tags: [home, index]
---
# Access Services Knowledge Base

> ${org.description}

## Organization
- [[Access Services]]

## Contact Directory
${contacts.contacts.filter(c => !c.external).map(c => `- [[${c.name}]]`).join('\n')}

## Service Regions
${regions.regions.map(r => `- [[${r.name}]]`).join('\n')}

## Programs
${programs.programs.map(p => `- [[${p.name}]]`).join('\n')}

## Policies
- [[Fares]]
- [[Booking and Reservations]]
- [[Pickup and Arrival]]
- [[No-Show Policy]]
- [[Cancellation Policy]]
- [[Mobility Devices]]
- [[Companions and PCAs]]
- [[Code of Conduct]]
- [[Complaints Process]]
- [[Eligibility Process]]
- [[Holiday Schedule]]

## Governance
- [[Board of Directors]]
- [[Community Advisory Committee]]
- [[Transportation Professionals Advisory Committee]]

## Transit Resources
- [[Mobility Management]]
- [[Neighboring County Paratransit]]
- [[Designated Stands]]
- [[Free Fare Participating Operators]]

## FAQs by Category
${[...new Set(faqs.faqs.map(f => f.category))].map(c => `- [[FAQs - ${c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' ')}]]`).join('\n')}
`);

// ============================================================
// ORGANIZATION
// ============================================================
writeNote('Organization', 'Access Services', `---
tags: [organization, ctsa, paratransit]
type: organization
---
# Access Services (ASI)

**${org.role}** for ${org.jurisdiction}

${org.description}

## Key Stats
| Metric | Value |
|---|---|
| Service Area | ${org.stats.service_area_sq_miles.toLocaleString()} square miles |
| Registered Riders | ${org.stats.registered_riders.toLocaleString()} |
| Annual Trips | ${org.stats.annual_trips.toLocaleString()} |
| Member Agencies | ${org.stats.member_agencies} |
| Service Regions | ${org.stats.service_regions} |
| Fixed-Route Operators | ${org.stats.fixed_route_operators} |

## Service Coverage
${org.service_coverage.primary}. ${org.service_coverage.extensions}.

## Service Hours
- Regular: ${org.service_hours.regular}
- Limited: ${org.service_hours.limited}

## Funding
${org.funding_sources.map(f => `- **${f.name}**: ${f.type}`).join('\n')}

## Fleet
- Vehicle types: ${org.fleet.vehicle_types.join(', ')}
- ${org.fleet.ownership}

## Addresses
- **Mailing:** ${org.addresses.mailing.street}, ${org.addresses.mailing.city}, ${org.addresses.mailing.state} ${org.addresses.mailing.zip}
- **Physical:** ${org.addresses.physical.street}, ${org.addresses.physical.city}, ${org.addresses.physical.state} ${org.addresses.physical.zip}

## Online Portals
| Portal | URL |
|---|---|
| Main Website | ${org.website} |
| Rider360 | ${org.portals.rider360} |
| Online Booking | ${org.portals.booking} |
| Eligibility | ${org.portals.eligibility} |
| Careers | ${org.portals.careers} |

## CTSA Functions
${org.ctsa_functions.activities.map(a => `- ${a}`).join('\n')}

## Regulatory Compliance
${org.regulatory_compliance.map(r => `- ${r}`).join('\n')}

## Governance
- [[Board of Directors]] (${org.governance.board_size} members)

## Service Regions
${regions.regions.map(r => `- [[${r.name}]]`).join('\n')}

## Programs
${programs.programs.map(p => `- [[${p.name}]]`).join('\n')}

## Key Contacts
${contacts.contacts.filter(c => !c.external).slice(0, 8).map(c => `- [[${c.name}]]`).join('\n')}
`);

// ============================================================
// CONTACTS
// ============================================================
for (const contact of contacts.contacts) {
  const tags = ['contact'];
  if (contact.external) tags.push('external');
  if (contact.is_default_route) tags.push('default-route');

  // Find which intents route to this contact
  const routedIntents = intents.intents.filter(i => i.transfer_to === contact.id);

  writeNote('Contacts', contact.name, `---
tags: [${tags.join(', ')}]
type: contact
phone: "${contact.phone || ''}"
hours: "${contact.hours || ''}"
---
# ${contact.name}

${contact.phone ? `**Phone:** ${contact.phone}` : ''}${contact.phone_option ? ` (${contact.phone_option})` : ''}
${contact.email ? `**Email:** ${contact.email}` : ''}
${contact.hours ? `**Hours:** ${contact.hours}` : ''}
${contact.tdd ? `**TDD:** ${contact.tdd}` : ''}
${contact.fax ? `**Fax:** ${contact.fax}` : ''}
${contact.method ? `**Method:** ${contact.method}` : ''}

## Purpose
${contact.purpose}

${contact.staff ? `**Staff:** ${contact.staff}` : ''}
${contact.note ? `> ${contact.note}` : ''}
${contact.phone_menu ? `\n## Phone Menu\n${Object.entries(contact.phone_menu).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}` : ''}
${contact.capabilities ? `\n## Capabilities\n${contact.capabilities.map(c => `- ${c}`).join('\n')}` : ''}
${contact.cannot_help_with ? `\n## Cannot Help With\n${contact.cannot_help_with.map(c => `- ${c}`).join('\n')}` : ''}
${routedIntents.length > 0 ? `\n## Caller Intents Routed Here\n${routedIntents.map(i => `- **${i.id}**: ${i.patterns.slice(0, 3).join(', ')}...`).join('\n')}` : ''}

## Related
- [[Access Services]]
`);
}

// ============================================================
// SERVICE REGIONS
// ============================================================
for (const region of regions.regions) {
  const cities = regions.city_to_region_mapping?.[region.id] || [];

  writeNote('Regions', region.name, `---
tags: [region, service-region]
type: region
contractor: "${region.contractor.name}"
base_city: "${region.base_city}"
---
# ${region.name}

**Base City:** ${region.base_city}
**Contractor:** ${region.contractor.name}
**Contractor Phone:** ${region.contractor.phone}
${region.contractor.careers ? `**Careers:** ${region.contractor.careers}` : ''}
${region.fare !== null && region.fare !== undefined ? `**Fare:** $${region.fare.toFixed(2)} (${region.fare_note})` : `**Fare:** Standard Access fares`}

${region.reservation_hours ? `## Reservation Hours\n${region.reservation_hours}` : ''}
${region.service_hours ? `\n## Service Hours\n${region.service_hours}` : ''}
${region.holiday_hours ? `\n## Holiday Hours\n${region.holiday_hours}` : ''}
${region.payment_note ? `\n> **Note:** ${region.payment_note}` : ''}

${region.transfer_point ? `## Transfer Point\n**${region.transfer_point.name}**\n${region.transfer_point.address}\n- Weekday windows: ${region.transfer_point.weekday_windows.join(', ')}\n- Weekend windows: ${region.transfer_point.weekend_windows.join(', ')}` : ''}
${region.transfer_points ? `## Transfer Points\n${region.transfer_points.map(t => `- **${t.name}**: ${t.address}`).join('\n')}` : ''}

## Cities Served
${cities.length > 0 ? cities.join(', ') : 'See city-to-region mapping'}

## Online Reservations
${region.online_reservations || 'Via Rider360 web portal and WMR app'}

## Related
- [[Access Services]]
- [[Reservations]]
- [[Fares]]
${region.fare !== null && region.fare !== undefined ? '- [[Holiday Schedule]]' : ''}
`);
}

// ============================================================
// PROGRAMS
// ============================================================
for (const program of programs.programs) {
  let contactLinks = '';
  if (program.contact?.name) contactLinks += `- Contact: ${program.contact.name}\n`;
  if (program.provider?.name) contactLinks += `- Provider: ${program.provider.name}\n`;

  writeNote('Programs', program.name, `---
tags: [program, ${program.keywords?.join(', ') || ''}]
type: program
---
# ${program.name}

${program.description}

## Eligibility
${typeof program.eligibility === 'string' ? program.eligibility : Array.isArray(program.eligibility) ? program.eligibility.map(e => `- ${e}`).join('\n') : JSON.stringify(program.eligibility)}

${program.benefits ? `## Benefits\n${program.benefits.map(b => `- ${b}`).join('\n')}` : ''}
${program.how_to_request ? `## How to Request\n${(Array.isArray(program.how_to_request) ? program.how_to_request : [program.how_to_request]).map(h => `- ${h}`).join('\n')}` : ''}
${program.scope ? `## Scope\n- Distance: ${program.scope.distance}\n- Driver must maintain visual contact with vehicle\n- Max dwell time: ${program.scope.max_dwell_time}` : ''}
${program.limitations ? `## Limitations\n${program.limitations.map(l => `- ${l}`).join('\n')}` : ''}
${program.skills_taught ? `## Skills Taught\n${program.skills_taught.map(s => `- ${s}`).join('\n')}` : ''}
${program.denial_criteria ? `## Denial Criteria\n${program.denial_criteria.map(d => `- ${d}`).join('\n')}` : ''}
${program.participating_operators_list ? `## Participating Operators (${program.participating_operators})\n| Operator | Phone | PCA Charged |\n|---|---|---|\n${program.participating_operators_list.map(o => `| ${o.name} | ${o.phone} | ${o.pca_charged ? 'Yes' : 'No'} |`).join('\n')}` : ''}
${program.metrolink_free_segments ? `## Metrolink Free Segments\n${program.metrolink_free_segments.map(s => `- ${s}`).join('\n')}` : ''}
${program.duration ? `## Duration\n${program.duration}` : ''}

**Fare:** ${program.fare !== undefined ? (typeof program.fare === 'number' ? '$' + program.fare.toFixed(2) : program.fare) : 'Standard Access fare'}

${program.contact ? `## Contact\n- **Phone:** ${program.contact.phone || ''}\n${program.contact.staff ? `- **Staff:** ${program.contact.staff}` : ''}\n${program.contact.email ? `- **Email:** ${program.contact.email}` : ''}` : ''}
${program.provider ? `## Provider\n- **${program.provider.name}**\n- Phone: ${program.provider.phone || ''}\n- Email: ${program.provider.email || ''}` : ''}
${program.registration ? `## Registration\n- Processing: ${program.registration.processing_time || 'Varies'}` : ''}

## Related
- [[Access Services]]
- [[Fares]]
- [[Customer Service]]
`);
}

// ============================================================
// POLICIES
// ============================================================
writeNote('Policies', 'Fares', `---
tags: [policy, fares, pricing]
type: policy
---
# Fares

## Standard One-Way Fares
| Trip Distance | Fare |
|---|---|
| Under 20 miles | $${policies.fares.standard.under_20_miles.amount} |
| 20+ miles | $${policies.fares.standard.over_20_miles.amount} |
| Santa Clarita / Antelope Valley | $${policies.fares.standard.santa_clarita_antelope_valley.amount} |

## Special Fares
| Rider Type | Fare |
|---|---|
| Personal Care Attendant (PCA) | Free |
| Guest | Same as rider |
| Children under 6 | Free (on parent's lap) |
| Children 6+ | Pay regular fare |
| Service Animals | Free |

## Payment Methods
${policies.fares.payment_methods.map(m => `- **${m.method}**: ${m.note}`).join('\n')}

## Coupon Books
| Type | Price | Contains | Use |
|---|---|---|---|
| Base Fare | $${policies.fares.coupon_books.base_fare.price} | ${policies.fares.coupon_books.base_fare.contains} | Standard trips |
| Plus Zone | $${policies.fares.coupon_books.plus_zone.price} | ${policies.fares.coupon_books.plus_zone.contains} | ${policies.fares.coupon_books.plus_zone.use} |
| Flex | $${policies.fares.coupon_books.flex.price} | ${policies.fares.coupon_books.flex.contains} | ${policies.fares.coupon_books.flex.use} |

### Purchase Options
${policies.fares.coupon_books.purchase_options.map(o => `- **${o.method}:** ${o.instructions}`).join('\n')}

## Related
- [[Access Services]]
- [[Booking and Reservations]]
- [[Customer Service]]
- [[Free Fare Program]]
${regions.regions.map(r => `- [[${r.name}]]`).join('\n')}
`);

writeNote('Policies', 'Booking and Reservations', `---
tags: [policy, booking, reservations]
type: policy
---
# Booking and Reservations

## Advance Booking
- **Minimum:** ${policies.booking.advance_booking.minimum}
- **Maximum:** ${policies.booking.advance_booking.maximum}
- **Same-day:** ${policies.booking.advance_booking.same_day}

## Reservation Hours
- **General:** ${policies.booking.reservation_hours.general}
- **Santa Clarita / Antelope Valley:** ${policies.booking.reservation_hours.santa_clarita_antelope_valley}

## Required Information
${policies.booking.required_info.map(i => `- ${i}`).join('\n')}

## One-Hour Window
${policies.booking.one_hour_window}

## Online Booking
- Portal: ${policies.booking.online_booking.portal}
- Regions: ${policies.booking.online_booking.regions.join(', ')}
- Northern Region: ${policies.booking.online_booking.northern_region}

## Return Trips
> ${policies.booking.return_trips}

## Standing Orders
${policies.booking.standing_orders.description}
- **Minimum commitment:** ${policies.booking.standing_orders.minimum_commitment}
- **Advance request:** ${policies.booking.standing_orders.advance_request}
- **Schedule types:** ${policies.booking.standing_orders.schedule_types.join(', ')}

## Related
- [[Reservations]]
- [[Fares]]
- [[No-Show Policy]]
- [[Cancellation Policy]]
- [[Pickup and Arrival]]
`);

writeNote('Policies', 'Pickup and Arrival', `---
tags: [policy, pickup, arrival]
type: policy
---
# Pickup and Arrival

## On-Time Window
- **Window:** ${policies.pickup.on_time_window.minutes} minutes
- ${policies.pickup.on_time_window.description}

## Driver Wait Time
- **Wait:** ${policies.pickup.driver_wait_time.minutes} minutes
- ${policies.pickup.driver_wait_time.description}

## Call-Outs
${policies.pickup.call_outs.description}
> ${policies.pickup.call_outs.note}

## Vehicle Recognition
${policies.pickup.vehicle_recognition}

## ETA Requests
${policies.pickup.eta_requests}

## Where's My Ride
${policies.pickup.wheres_my_ride.description}
- Platforms: ${policies.pickup.wheres_my_ride.platforms.join(', ')}
- Hotline: ${policies.pickup.wheres_my_ride.hotline}

## Missed Trip
${policies.pickup.missed_trip}

## Curb-to-Curb Service
${policies.pickup.curb_to_curb.description}
- ${policies.pickup.curb_to_curb.rider_responsibility}

## Related
- [[No-Show Policy]]
- [[Operations Monitoring Center (OMC)]]
- [[Beyond the Curb (BTC)]]
- [[Booking and Reservations]]
`);

writeNote('Policies', 'No-Show Policy', `---
tags: [policy, no-show, suspension]
type: policy
---
# No-Show Policy

## Definition
A no-show is recorded when:
${policies.no_show.definition.map(d => `- ${d}`).join('\n')}

## NOT a No-Show
${policies.no_show.not_a_no_show.map(n => `- ${n}`).join('\n')}

## Threshold
- **Count:** ${policies.no_show.threshold.count}+ no-shows in a ${policies.no_show.threshold.period}
- **Percentage:** Must exceed ${policies.no_show.threshold.percentage}% of total trips

## Consequences
- **Warning:** ${policies.no_show.consequences.warning}
- **First suspension:** ${policies.no_show.consequences.first_suspension}
- **Subsequent:** ${policies.no_show.consequences.subsequent_suspensions}
- **Clearance:** ${policies.no_show.consequences.clearance}

## Appeal
${policies.no_show.appeal}

## Prevention Tips
${policies.no_show.prevention_tips.map(t => `- ${t}`).join('\n')}

## Related
- [[Cancellation Policy]]
- [[Pickup and Arrival]]
- [[Customer Service]]
- [[Booking and Reservations]]
`);

writeNote('Policies', 'Cancellation Policy', `---
tags: [policy, cancellation]
type: policy
---
# Cancellation Policy

- **Advance required:** ${policies.cancellation.advance_required}
- **How to cancel:** ${policies.cancellation.how_to_cancel}
- **Late cancellation:** ${policies.cancellation.late_cancellation}
- **Drop-off/pickup:** ${policies.cancellation.drop_off_pickup}

## Related
- [[No-Show Policy]]
- [[Reservations]]
- [[Booking and Reservations]]
`);

writeNote('Policies', 'Mobility Devices', `---
tags: [policy, wheelchair, scooter, mobility-device]
type: policy
---
# Mobility Devices

| Specification | Limit |
|---|---|
| Max Width | ${policies.mobility_devices.max_width_inches} inches |
| Max Length | ${policies.mobility_devices.max_length_inches} inches |
| Max Weight | ${policies.mobility_devices.max_weight_lbs} lbs (rider + device) |

- **Standard:** ${policies.mobility_devices.standard}
- **Securement:** ${policies.mobility_devices.securement}
- **Device users:** ${policies.mobility_devices.device_users}
- **Non-device users:** ${policies.mobility_devices.non_device_users}

> ${policies.mobility_devices.device_change_notice}

## Related
- [[Reasonable Modification]]
- [[Customer Service]]
- [[Pickup and Arrival]]
`);

writeNote('Policies', 'Companions and PCAs', `---
tags: [policy, pca, companion, guest]
type: policy
---
# Companions and PCAs

## Personal Care Attendant (PCA)
- **Fare:** ${policies.companions.pca.fare}
- ${policies.companions.pca.requirements}
- **How to add:** ${policies.companions.pca.how_to_add}
- **Finding an aide:** ${policies.companions.pca.finding_aide}

## Guests
- **Fare:** ${policies.companions.guests.fare}
- ${policies.companions.guests.limit}

## Children
- **Under 6:** ${policies.companions.children.under_6}
- **Age 7+:** ${policies.companions.children.age_7_plus}
- **Car seat:** ${policies.companions.children.car_seat_required}

## Related
- [[Fares]]
- [[Booking and Reservations]]
- [[Parents with Disabilities Program (PWD)]]
`);

writeNote('Policies', 'Code of Conduct', `---
tags: [policy, conduct, rules]
type: policy
---
# Code of Conduct

## Required Behaviors
${policies.code_of_conduct.required_behaviors.map(b => `- ${b}`).join('\n')}

## Prohibited
${policies.code_of_conduct.prohibited.map(p => `- ${p}`).join('\n')}

## Consequences
${policies.code_of_conduct.consequences}

## California Penal Codes
| Code | Offense | Penalty |
|---|---|---|
| 241.3 | ${policies.code_of_conduct.penal_codes['241.3']} | Up to $10,000 + 5 years |
| 243.3 | ${policies.code_of_conduct.penal_codes['243.3']} | Up to $10,000 + 5 years |
| 245.2 | ${policies.code_of_conduct.penal_codes['245.2']} | Up to $10,000 + 5 years |

> ${policies.code_of_conduct.involuntary_behavior_exception}

**Video/Audio:** ${policies.code_of_conduct.video_audio_recording}

## Related
- [[Complaints Process]]
- [[Customer Service]]
`);

writeNote('Policies', 'Complaints Process', `---
tags: [policy, complaints, feedback]
type: policy
---
# Complaints Process

## How to File
- **Phone:** ${policies.complaints.how_to_file.phone}
- **TDD:** ${policies.complaints.how_to_file.tdd}
- **Email:** ${policies.complaints.how_to_file.email}
- **Mail:** ${policies.complaints.how_to_file.mail}
- **Web:** ${policies.complaints.how_to_file.web}

## Required Information
${policies.complaints.required_information.map(i => `- ${i}`).join('\n')}

## Response Timeline
**${policies.complaints.response_timeline}**

## Rider360 Tracking
${policies.complaints.rider360_tracking}

## Federal Escalation
- **Agency:** ${policies.complaints.federal_escalation.agency}
- **Phone:** ${policies.complaints.federal_escalation.phone}

> ${policies.complaints.retaliation_protection}

## Related
- [[Customer Service]]
- [[ADA Coordinator]]
- [[Code of Conduct]]
- [[Title VI]]
`);

writeNote('Policies', 'Eligibility Process', `---
tags: [policy, eligibility, application]
type: policy
---
# Eligibility Process

## Basis
${policies.eligibility.basis}

## Categories
${policies.eligibility.categories.map(c => `- **${c.type}:** ${c.description}`).join('\n')}

## 4-Step Process

### Step 1: ${policies.eligibility.process.step_1.name}
${policies.eligibility.process.step_1.action}

### Step 2: ${policies.eligibility.process.step_2.name}
${policies.eligibility.process.step_2.options.map(o => `- ${o}`).join('\n')}

### Step 3: ${policies.eligibility.process.step_3.name}
- Phone: ${policies.eligibility.process.step_3.phone}
- ${policies.eligibility.process.step_3.languages}
- Duration: ${policies.eligibility.process.step_3.duration}
- **Bring:** ${policies.eligibility.process.step_3.bring.join(', ')}

### Step 4: ${policies.eligibility.process.step_4.name}
${policies.eligibility.process.step_4.timeline}

## Renewal
${policies.eligibility.renewal.notice}

## Appeal
- Deadline: ${policies.eligibility.appeal.deadline}
- ${policies.eligibility.appeal.how}

## ID Card
- ${policies.eligibility.id_card.description}
- **Accepted alternate IDs:** ${policies.eligibility.id_card.accepted_ids.join(', ')}

> ${policies.eligibility.id_card.fraud_warning}

## Related
- [[Customer Service]]
- [[Eligibility Evaluation Scheduling]]
- [[Visitor Program]]
`);

writeNote('Policies', 'Holiday Schedule', `---
tags: [policy, holidays, schedule]
type: policy
---
# Holiday Schedule

## Observed Holidays
${policies.holiday_schedule.holidays.map(h => `- ${h}`).join('\n')}

> ${policies.holiday_schedule.note}

## Santa Clarita
- **Sunday schedule:** ${policies.holiday_schedule.santa_clarita_holidays.sunday_schedule.join(', ')}
- **No service:** ${policies.holiday_schedule.santa_clarita_holidays.no_service.join(', ')}

## Antelope Valley
- **No service:** ${policies.holiday_schedule.antelope_valley_no_service.join(', ')}

## Related
- [[Santa Clarita]]
- [[Antelope Valley]]
- [[Booking and Reservations]]
`);

// ============================================================
// PEOPLE / GOVERNANCE
// ============================================================
writeNote('Governance', 'Board of Directors', `---
tags: [governance, board]
type: committee
schedule: "${people.board_of_directors.meeting_schedule}"
---
# Board of Directors

**Schedule:** ${people.board_of_directors.meeting_schedule}, ${people.board_of_directors.meeting_format}
**Location:** ${people.board_of_directors.meeting_location}
**Meetings per year:** ${people.board_of_directors.meetings_per_year}

## Members
| Name | Role | Representing |
|---|---|---|
${people.board_of_directors.members.map(m => `| ${m.name} | ${m.role} | ${m.representing} |`).join('\n')}

## Related
- [[Access Services]]
- [[Community Advisory Committee]]
- [[Transportation Professionals Advisory Committee]]
`);

writeNote('Governance', 'Community Advisory Committee', `---
tags: [governance, cac, advisory]
type: committee
schedule: "${people.cac.meeting_schedule}"
---
# Community Advisory Committee (CAC)

**Purpose:** ${people.cac.purpose}
**Schedule:** ${people.cac.meeting_schedule}, ${people.cac.meeting_time}
**Format:** ${people.cac.meeting_format}
**Location:** ${people.cac.meeting_location}

## Leadership
- **Chair:** ${people.cac.chair.name}
- **Vice Chair:** ${people.cac.vice_chair.name}${people.cac.vice_chair.affiliation ? ` (${people.cac.vice_chair.affiliation})` : ''}

## Members
${people.cac.members.map(m => `- ${m.name}${m.affiliation ? ` (${m.affiliation})` : ''}`).join('\n')}

## How to Apply
${Object.entries(people.cac.how_to_apply.submit_via).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

## Related
- [[Access Services]]
- [[Board of Directors]]
- [[Customer Service]]
`);

writeNote('Governance', 'Transportation Professionals Advisory Committee', `---
tags: [governance, tpac, advisory]
type: committee
schedule: "${people.tpac.meeting_schedule}"
---
# Transportation Professionals Advisory Committee (TPAC)

**Purpose:** ${people.tpac.purpose}
**Schedule:** ${people.tpac.meeting_schedule}, ${people.tpac.meeting_time}
**Location:** ${people.tpac.meeting_location}

## Leadership
- **Chair:** ${people.tpac.chair.name} (${people.tpac.chair.agency})
- **Vice Chair:** ${people.tpac.vice_chair.name} (${people.tpac.vice_chair.agency})

## Members
| Name | Agency |
|---|---|
${people.tpac.members.map(m => `| ${m.name} | ${m.agency} |`).join('\n')}

## Related
- [[Access Services]]
- [[Board of Directors]]
- [[Member Agencies]]
`);

// ============================================================
// MEMBER AGENCIES
// ============================================================
writeNote('Governance', 'Member Agencies', `---
tags: [governance, member-agencies]
type: reference
---
# Member Agencies (${memberAgencies.total_count})

${memberAgencies.geographic_coverage}

## Transit Authorities (${memberAgencies.transit_authorities.length})
${memberAgencies.transit_authorities.map(a => `- ${a.name}`).join('\n')}

## Cities (${memberAgencies.cities.length})
${memberAgencies.cities.map(a => `- ${a.name}`).join('\n')}

## Related
- [[Access Services]]
- [[Transportation Professionals Advisory Committee]]
- [[Free Fare Participating Operators]]
`);

// ============================================================
// TRANSIT RESOURCES
// ============================================================
writeNote('Transit Resources', 'Mobility Management', `---
tags: [transit, referral, mobility-management]
type: service
---
# Mobility Management

${transit.mobility_management.description}

- **Phone:** ${transit.mobility_management.phone}
- **TDD:** ${transit.mobility_management.tdd}
- **Email:** ${transit.mobility_management.email}
- **Hours:** ${transit.mobility_management.hours}

## Related
- [[Access Services]]
- [[Free Fare Program]]
- [[Neighboring County Paratransit]]
`);

writeNote('Transit Resources', 'Neighboring County Paratransit', `---
tags: [transit, neighboring-county, paratransit]
type: reference
---
# Neighboring County Paratransit

${transit.neighboring_county_paratransit.description}

${transit.neighboring_county_paratransit.counties.map(county => `## ${county.county}\n${county.services.map(s => `- **${s.name}:** ${s.phone || 'See website'}${s.website ? ` (${s.website})` : ''}`).join('\n')}`).join('\n\n')}

## Related
- [[Access Services]]
- [[Visitor Program]]
- [[Mobility Management]]
`);

writeNote('Transit Resources', 'Designated Stands', `---
tags: [transit, stands, locations]
type: reference
---
# Designated Stands

${transit.designated_stands.description}

**Total locations:** ${transit.designated_stands.total_count}

## Educational Institutions
${transit.designated_stands.categories.educational_institutions.map(s => `- ${s}`).join('\n')}

## Medical Facilities
${transit.designated_stands.categories.medical_facilities.map(s => `- ${s}`).join('\n')}

## Transportation Hubs
${transit.designated_stands.categories.transportation_hubs.map(s => `- ${s}`).join('\n')}

## Entertainment Venues
${transit.designated_stands.categories.entertainment_venues.map(s => `- ${s}`).join('\n')}

> ${transit.designated_stands.note}

## Related
- [[Access Services]]
- [[Booking and Reservations]]
`);

writeNote('Transit Resources', 'Free Fare Participating Operators', `---
tags: [transit, free-fare, operators]
type: reference
---
# Free Fare Participating Operators

Access riders can ride these fixed-route systems for free using their green Access ID card.

See [[Free Fare Program]] for full program details.

## Operators
| Operator | Phone | PCA Charged |
|---|---|---|
${programs.programs.find(p => p.id === 'free-fare')?.participating_operators_list?.map(o => `| ${o.name} | ${o.phone} | ${o.pca_charged ? 'Yes' : 'No'} |`).join('\n') || 'See Free Fare Program'}

## Related
- [[Free Fare Program]]
- [[Fares]]
- [[Member Agencies]]
`);

// ============================================================
// FAQs (grouped by category)
// ============================================================
const faqsByCategory = {};
for (const faq of faqs.faqs) {
  const cat = faq.category;
  if (!faqsByCategory[cat]) faqsByCategory[cat] = [];
  faqsByCategory[cat].push(faq);
}

for (const [category, items] of Object.entries(faqsByCategory)) {
  const title = category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');

  // Find related policy/program links
  const relatedLinks = new Set(['[[Access Services]]']);
  for (const faq of items) {
    if (faq.category === 'eligibility') relatedLinks.add('[[Eligibility Process]]');
    if (faq.category === 'booking') relatedLinks.add('[[Booking and Reservations]]');
    if (faq.category === 'fares') relatedLinks.add('[[Fares]]');
    if (faq.category === 'pickup') relatedLinks.add('[[Pickup and Arrival]]');
    if (faq.category === 'no-show') relatedLinks.add('[[No-Show Policy]]');
    if (faq.category === 'cancellation') relatedLinks.add('[[Cancellation Policy]]');
    if (faq.category === 'companions') relatedLinks.add('[[Companions and PCAs]]');
    if (faq.category === 'mobility-devices') relatedLinks.add('[[Mobility Devices]]');
    if (faq.category === 'complaints') relatedLinks.add('[[Complaints Process]]');
    if (faq.category === 'visitor') relatedLinks.add('[[Visitor Program]]');
    if (faq.category === 'programs') relatedLinks.add('[[Access to Work (ATW)]]');
    if (faq.category === 'technology') relatedLinks.add('[[Pickup and Arrival]]');
    if (faq.category === 'regions') relatedLinks.add('[[Reservations]]');
    if (faq.category === 'holidays') relatedLinks.add('[[Holiday Schedule]]');
    if (faq.category === 'transit-options') relatedLinks.add('[[Mobility Management]]');
    if (faq.category === 'neighboring-counties') relatedLinks.add('[[Neighboring County Paratransit]]');
    if (faq.category === 'stands') relatedLinks.add('[[Designated Stands]]');
  }

  writeNote('FAQs', `FAQs - ${title}`, `---
tags: [faq, ${category}]
type: faq
---
# FAQs: ${title}

${items.map(faq => `## ${faq.question}\n${faq.answer}\n`).join('\n')}

## Related
${[...relatedLinks].map(l => `- ${l}`).join('\n')}
`);
}

// ============================================================
// OBSIDIAN CONFIG (minimal, enables graph view)
// ============================================================
const obsidianDir = path.join(vaultDir, '.obsidian');
mkdirp(obsidianDir);

fs.writeFileSync(path.join(obsidianDir, 'app.json'), JSON.stringify({
  "showLineNumber": true,
  "strictLineBreaks": false,
  "readableLineLength": true
}, null, 2));

fs.writeFileSync(path.join(obsidianDir, 'graph.json'), JSON.stringify({
  "collapse-filter": false,
  "search": "",
  "showTags": true,
  "showAttachments": false,
  "hideUnresolved": false,
  "showOrphans": true,
  "collapse-color-groups": false,
  "colorGroups": [
    { "query": "tag:#contact", "color": { "a": 1, "rgb": 3447003 } },
    { "query": "tag:#region", "color": { "a": 1, "rgb": 16744448 } },
    { "query": "tag:#program", "color": { "a": 1, "rgb": 6737151 } },
    { "query": "tag:#policy", "color": { "a": 1, "rgb": 16776960 } },
    { "query": "tag:#governance", "color": { "a": 1, "rgb": 16711935 } },
    { "query": "tag:#faq", "color": { "a": 1, "rgb": 65535 } },
    { "query": "tag:#transit", "color": { "a": 1, "rgb": 65280 } }
  ],
  "collapse-display": false,
  "showArrow": true,
  "textFadeMultiplier": 0,
  "nodeSizeMultiplier": 1,
  "lineSizeMultiplier": 1,
  "collapse-forces": true,
  "centerStrength": 0.518713248970312,
  "repelStrength": 10,
  "linkStrength": 1,
  "linkDistance": 250,
  "scale": 0.5,
  "close": true
}, null, 2));

fs.writeFileSync(path.join(obsidianDir, 'appearance.json'), JSON.stringify({
  "baseFontSize": 16,
  "theme": "obsidian"
}, null, 2));

// ============================================================
// SUMMARY
// ============================================================
const noteCount = { total: 0 };
function countFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== '.obsidian') {
      countFiles(path.join(dir, entry.name));
    } else if (entry.name.endsWith('.md')) {
      noteCount.total++;
    }
  }
}
countFiles(vaultDir);

console.log(`Obsidian vault generated at: ${vaultDir}`);
console.log(`Total notes: ${noteCount.total}`);
console.log(`\nOpen in Obsidian: File > Open Vault > select the obsidian-vault folder`);
console.log(`Then press Ctrl+G (or Cmd+G on Mac) to open Graph View`);
console.log(`\nColor groups preconfigured:`);
console.log(`  Blue    = Contacts`);
console.log(`  Orange  = Regions`);
console.log(`  Purple  = Programs`);
console.log(`  Yellow  = Policies`);
console.log(`  Pink    = Governance`);
console.log(`  Cyan    = FAQs`);
console.log(`  Green   = Transit Resources`);
