with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
'''  companyDocuments CompanyDocument[]
  onboardingTemplates OnboardingTemplate[]
  grievances       Grievance[]
  applications     CandidateApplication[]
  notifications    Notification[]''',
'''  companyDocuments CompanyDocument[]
  grievances       Grievance[]
  applications     CandidateApplication[]
  notifications    Notification[]'''
)

with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed schema")
