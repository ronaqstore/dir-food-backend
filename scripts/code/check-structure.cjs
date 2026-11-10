'use strict';

const fs = require('fs');
const path = require('path');
const { Reporter } = require('./lib/reporter.cjs');

const r = new Reporter('NestJS Project Structure Audit', { emoji: '📂' });
const SRC_DIR = path.join(__dirname, '../../src');

const ALLOWED_TOP_LEVEL_DIRS = new Set([
  'app-configuration',
  'audit',
  'auth',
  'common',
  'delivery-areas',
  'generated',
  'menu-categories',
  'menu-items',
  'order-intents',
  'platform-admin',
  'prisma',
  'public-catalog',
  'restaurant-hours',
  'restaurants',
  'uploads',
]);

const ALLOWED_ROOT_FILES = new Set([
  'main.ts',
  'app.module.ts',
  'app.controller.ts',
  'app.service.ts',
  'app.controller.spec.ts',
  'app.service.spec.ts',
]);

if (!fs.existsSync(SRC_DIR)) {
  r.addViolation('src/', 0, "Source directory 'src/' does not exist!");
} else {
  for (const entry of fs.readdirSync(SRC_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ALLOWED_TOP_LEVEL_DIRS.has(entry.name)) {
        r.addViolation(
          `src/${entry.name}`,
          0,
          `Unknown top-level directory 'src/${entry.name}'. Add it to ALLOWED_TOP_LEVEL_DIRS if intentional.`,
        );
      }
    } else if (entry.isFile() && !ALLOWED_ROOT_FILES.has(entry.name)) {
      r.addViolation(
        `src/${entry.name}`,
        0,
        `Loose file 'src/${entry.name}' is not allowed at src/ root. Put it in a Nest module folder.`,
      );
    }
  }
}

r.finish({
  fixTip:
    'Nest modules live as kebab-case folders under src/ with controllers/, services/, dto/, and *.module.ts.',
});
