with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

import re
org_match = re.search(r'(model Organization \{.*?^\})', content, re.MULTILINE | re.DOTALL)
if org_match:
    org_block = org_match.group(1)
    new_org_block = org_block.replace(
        '  allowedDomains         String? // Comma separated list of domains (Zero-Trust)',
        '  allowedDomains         String? // Comma separated list of domains (Zero-Trust)\n  isUnderLockdown        Boolean @default(false) // DEFCON 1 Kill Switch\n  lockdownExpiresAt      DateTime? // 2-hour jam timer'
    )
    content = content.replace(org_block, new_org_block)
    with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
        f.write(content)
