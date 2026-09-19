const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedModules() {
  const modules = [
    { key: 'employee',    label: 'Employee Management',  icon: 'users',    sortOrder: 1 },
    { key: 'leave',       label: 'Leave Management',     icon: 'calendar', sortOrder: 2 },
    { key: 'attendance',  label: 'Time & Attendance',    icon: 'clock',    sortOrder: 3 },
    { key: 'performance', label: 'Performance',          icon: 'target',   sortOrder: 4 },
    { key: 'payroll',     label: 'Payroll',              icon: 'wallet',   sortOrder: 5 },
    { key: 'recruitment', label: 'Recruitment',          icon: 'briefcase',sortOrder: 6 },
    { key: 'reports',     label: 'Reports & Analytics',  icon: 'chart',    sortOrder: 7 },
  ];

  for (const mod of modules) {
    await prisma.module.upsert({
      where: { key: mod.key },
      update: mod,
      create: mod,
    });
  }

  console.log('✅ Modules seeded successfully');
}

seedModules()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
