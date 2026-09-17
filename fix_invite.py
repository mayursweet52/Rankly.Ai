with open('src/services/employeeService.js', 'r', encoding='utf-8') as f:
    content = f.read()

injection = '''
    });

    // 5.5 Link User Account & Send Invite
    try {
      const emailService = require('./emailService');
      
      // Ensure User exists for this employee
      let userAccount = await prisma.user.findUnique({
        where: { email: employee.workEmail }
      });
      
      if (!userAccount) {
        userAccount = await prisma.user.create({
          data: {
            email: employee.workEmail,
            firstName: employee.firstName,
            lastName: employee.lastName,
            role: 'employee',
            accountType: 'employee',
            organizationId: employee.organizationId,
            isEmailVerified: true // They are added by HR, pre-verified
          }
        });
        
        // Connect the Employee record to the User record
        await prisma.employee.update({
          where: { id: employee.id },
          data: { userId: userAccount.id }
        });

        // Send Welcome/Invitation Email
        const org = await prisma.organization.findUnique({ where: { id: employee.organizationId }});
        const orgName = org ? org.name : 'Your Company';
        // The invite URL goes to standard login which will trigger OTP
        const inviteUrl = process.env.BASE_URL || 'http://localhost:3000';
        await emailService.sendInvitationEmail(employee.workEmail, orgName, employee.designation, inviteUrl);
      } else {
        // If user existed but wasn't linked
        if (!employee.userId) {
          await prisma.employee.update({
            where: { id: employee.id },
            data: { userId: userAccount.id }
          });
        }
      }
    } catch (inviteErr) {
      console.error('Error in Employee User Linkage / Invitation:', inviteErr);
    }

    // 6. Upsert Bank Account Details'''

content = content.replace('    });\n\n    // 6. Upsert Bank Account Details', injection)

with open('src/services/employeeService.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected User Creation & Invitation logic")
