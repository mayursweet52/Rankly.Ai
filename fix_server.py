with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Add require
content = content.replace(
    "const organizationRoutes = require('./src/routes/organizationRoutes');",
    "const organizationRoutes = require('./src/routes/organizationRoutes');\nconst tenantRoutes = require('./src/routes/tenantRoutes');\nconst tenantMiddleware = require('./src/middleware/tenantMiddleware');"
)

# Add middleware globally before routes
content = content.replace(
    "app.use(requestLogger);",
    "app.use(requestLogger);\n\n// Enterprise Tenant Routing Middleware\napp.use(tenantMiddleware);"
)

# Add route mount
content = content.replace(
    "app.use('/api/organization', organizationRoutes);",
    "app.use('/api/organization', organizationRoutes);\napp.use('/api/tenant', tenantRoutes);"
)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated server.js with Tenant Router")
