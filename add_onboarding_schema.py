with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

models = '''
// ---------------------------------------------------------
// ONBOARDING & WORKFLOWS
// ---------------------------------------------------------

model OnboardingTemplate {
  id             String                   @id @default(uuid())
  name           String                   // e.g., "Standard Engineering Onboarding"
  description    String?
  organizationId String
  organization   Organization             @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  tasks          OnboardingTaskTemplate[]
  employeeRuns   EmployeeOnboarding[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OnboardingTaskTemplate {
  id           String             @id @default(uuid())
  templateId   String
  template     OnboardingTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  title        String
  description  String?
  assignedRole String?            // e.g., "IT", "HR", "Manager"
  orderIndex   Int                @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmployeeOnboarding {
  id           String               @id @default(uuid())
  employeeId   String               @unique
  employee     Employee             @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  templateId   String
  template     OnboardingTemplate   @relation(fields: [templateId], references: [id], onDelete: Restrict)
  status       String               @default("in_progress") // "in_progress", "completed"
  progress     Int                  @default(0) // Percentage 0-100
  tasks        EmployeeOnboardingTask[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmployeeOnboardingTask {
  id             String             @id @default(uuid())
  onboardingId   String
  onboarding     EmployeeOnboarding @relation(fields: [onboardingId], references: [id], onDelete: Cascade)
  title          String
  description    String?
  assignedRole   String?
  status         String             @default("pending") // "pending", "completed", "skipped"
  completedAt    DateTime?
  orderIndex     Int                @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
'''

# Add relation to Organization
content = content.replace(
    '  companyDocuments CompanyDocument[]',
    '  companyDocuments CompanyDocument[]\n  onboardingTemplates OnboardingTemplate[]'
)

# Add relation to Employee
content = content.replace(
    '  employeeReviews    PerformanceReview[] @relation("EmployeeReviews")',
    '  employeeReviews    PerformanceReview[] @relation("EmployeeReviews")\n  onboarding         EmployeeOnboarding?'
)

content += '\n' + models

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated schema")
