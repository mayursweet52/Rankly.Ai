with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('tenantCode String @unique @default(uuid())', 'tenantCode String? @unique @default(uuid())')

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
