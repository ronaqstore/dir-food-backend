'use strict';

const fs = require('fs');
const path = require('path');
const { Reporter } = require('./lib/reporter.cjs');
const { walkTree } = require('./lib/walkTree.cjs');

const r = new Reporter('Multi-Tenant restaurantId Audit', { emoji: '🏢' });
const srcRoot = path.join(__dirname, '../../src');

const TENANT_MODULES = [
  'delivery-areas',
  'menu-categories',
  'menu-items',
  'order-intents',
  'restaurant-hours',
  'restaurants',
  'uploads',
];

const DTO_TENANT_RE =
  /^\s*(readonly\s+|public\s+|private\s+|protected\s+)?(restaurantId|shopId)\s*[?!]?\s*:/;

if (fs.existsSync(srcRoot)) {
  walkTree(srcRoot, (absPath, relPathRaw) => {
    if (!/\.ts$/.test(absPath)) return;
    const relPath = relPathRaw.split(path.sep).join('/');
    const isTenant = TENANT_MODULES.some((m) =>
      relPath.startsWith(`src/${m}/`),
    );
    if (!isTenant) return;
    if (!relPath.includes('/dto/')) return;
    if (/response-|query\.filter|list-.*query/i.test(path.basename(relPath))) {
      return;
    }

    const lines = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (
        DTO_TENANT_RE.test(line) ||
        /@IsUUID\(.*\)\s*\n?\s*(restaurantId|shopId)/i.test(line)
      ) {
        r.addViolation(
          relPath,
          idx + 1,
          'Forbidden `restaurantId` on request DTO — tenancy comes from JWT (`req.user.restaurantId`) only',
          {
            fix: 'Remove restaurantId from body/query DTOs. Read restaurantId from AuthUser context.',
          },
        );
      }
      if (
        /\b(restaurantId|shopId)\b/.test(line) &&
        /@(ApiProperty|IsUUID|IsString|IsNotEmpty)/.test(line)
      ) {
        r.addViolation(
          relPath,
          idx + 1,
          'Forbidden validated `restaurantId` field on tenant DTO',
        );
      }
    });
  });
}

r.finish({
  fixTip:
    'Never accept restaurantId from clients. Filter every Prisma query with JWT restaurantId.',
});
