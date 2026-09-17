const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Onboarding Templates
exports.getTemplates = async (req, res) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
        return res.status(400).json({ success: false, message: 'Missing organizationId' });
    }
    const templates = await prisma.onboardingTemplate.findMany({
      where: { organizationId },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } }
    });
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create Template
exports.createTemplate = async (req, res) => {
    try {
        const { organizationId, name, description, tasks } = req.body;
        if (!organizationId || !name || !tasks) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const template = await prisma.onboardingTemplate.create({
            data: {
                organizationId,
                name,
                description,
                tasks: {
                    create: tasks.map((t, i) => ({
                        title: t.title,
                        description: t.description,
                        assignedRole: t.assignedRole,
                        orderIndex: i
                    }))
                }
            },
            include: { tasks: true }
        });
        return res.status(201).json({ success: true, data: template });
    } catch (error) {
        console.error('Error creating template:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Assign Onboarding to Employee
exports.assignOnboarding = async (req, res) => {
    try {
        const { employeeId, templateId } = req.body;
        if (!employeeId || !templateId) {
            return res.status(400).json({ success: false, message: 'Missing fields' });
        }

        // Fetch template
        const template = await prisma.onboardingTemplate.findUnique({
            where: { id: templateId },
            include: { tasks: { orderBy: { orderIndex: 'asc' } } }
        });

        if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

        // Check if employee already has onboarding
        const existing = await prisma.employeeOnboarding.findUnique({
            where: { employeeId }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Employee already has an active onboarding plan' });
        }

        // Create
        const onboarding = await prisma.employeeOnboarding.create({
            data: {
                employeeId,
                templateId,
                status: 'in_progress',
                progress: 0,
                tasks: {
                    create: template.tasks.map(t => ({
                        title: t.title,
                        description: t.description,
                        assignedRole: t.assignedRole,
                        orderIndex: t.orderIndex,
                        status: 'pending'
                    }))
                }
            },
            include: { tasks: { orderBy: { orderIndex: 'asc' } } }
        });

        return res.status(201).json({ success: true, data: onboarding });

    } catch (error) {
        console.error('Error assigning onboarding:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Get Employee Onboarding details
exports.getEmployeeOnboarding = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const onboarding = await prisma.employeeOnboarding.findUnique({
            where: { employeeId },
            include: { 
                tasks: { orderBy: { orderIndex: 'asc' } },
                template: true,
                employee: true
            }
        });
        if (!onboarding) return res.status(404).json({ success: false, message: 'Not found' });
        return res.status(200).json({ success: true, data: onboarding });
    } catch (error) {
        console.error('Error fetching employee onboarding:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Update Task Status
exports.updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body; // pending, completed, skipped

        if (!status) return res.status(400).json({ success: false, message: 'Status required' });

        const task = await prisma.employeeOnboardingTask.update({
            where: { id: taskId },
            data: { 
                status,
                completedAt: status === 'completed' ? new Date() : null
            }
        });

        // Recalculate progress
        const allTasks = await prisma.employeeOnboardingTask.findMany({
            where: { onboardingId: task.onboardingId }
        });

        const completedCount = allTasks.filter(t => t.status === 'completed' || t.status === 'skipped').length;
        const progress = Math.round((completedCount / allTasks.length) * 100);
        let onboardingStatus = progress === 100 ? 'completed' : 'in_progress';

        const updatedOnboarding = await prisma.employeeOnboarding.update({
            where: { id: task.onboardingId },
            data: { progress, status: onboardingStatus }
        });

        return res.status(200).json({ success: true, data: task, progress });
    } catch (error) {
        console.error('Error updating task:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Get All Active Onboardings
exports.getActiveOnboardings = async (req, res) => {
    try {
        const onboardings = await prisma.employeeOnboarding.findMany({
            include: { 
                employee: { select: { id: true, firstName: true, lastName: true, designation: true, employeeCode: true, department: true } },
                template: { select: { name: true } },
                tasks: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: onboardings });
    } catch (error) {
        console.error('Error fetching onboardings:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
}
