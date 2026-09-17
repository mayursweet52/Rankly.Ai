with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Update User model
import re
user_match = re.search(r'(model User \{.*?^\})', content, re.MULTILINE | re.DOTALL)
if user_match:
    user_block = user_match.group(1)
    new_user_block = user_block.replace(
        '  updatedAt DateTime @updatedAt\n\n  // Geofencing Defaults',
        '  updatedAt DateTime @updatedAt\n\n  // Security & IAM\n  lastLoginIp    String?\n  lastLoginDevice String?\n\n  // Geofencing Defaults'
    )
    content = content.replace(user_block, new_user_block)

org_match = re.search(r'(model Organization \{.*?^\})', content, re.MULTILINE | re.DOTALL)
if org_match:
    org_block = org_match.group(1)
    new_org_block = org_block.replace(
        '  updatedAt DateTime @updatedAt\n\n  // Geofencing Defaults',
        '  updatedAt DateTime @updatedAt\n\n  // Security & IAM\n  isIpRestrictionEnabled Boolean @default(false)\n  allowedIps             String? // Comma separated list of IPs\n\n  // Geofencing Defaults'
    )
    content = content.replace(org_block, new_org_block)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated schema with IAM fields")
