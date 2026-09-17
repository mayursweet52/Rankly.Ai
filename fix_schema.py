with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

# Organization model
import re

org_match = re.search(r'(model Organization \{.*?^\})', content, re.MULTILINE | re.DOTALL)
if org_match:
    org_block = org_match.group(1)
    new_org_block = org_block.replace(
        '  updatedAt DateTime @updatedAt\n}',
        '  updatedAt DateTime @updatedAt\n\n  // Geofencing Defaults\n  officeLatitude  Float?\n  officeLongitude Float?\n  geofenceRadius  Int?   @default(100) // in meters\n}'
    )
    content = content.replace(org_block, new_org_block)

att_match = re.search(r'(model Attendance \{.*?^\})', content, re.MULTILINE | re.DOTALL)
if att_match:
    att_block = att_match.group(1)
    new_att_block = att_block.replace(
        '  ipAddress  String?',
        '  ipAddress  String?\n\n  // Geofencing\n  latitude        Float?\n  longitude       Float?\n  isGeofenceValid Boolean @default(false)'
    )
    content = content.replace(att_block, new_att_block)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated correctly')
