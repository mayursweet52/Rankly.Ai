const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /api/jobs/ingest/greenhouse
 * Auto-Fetch Engine: Ingests all active jobs from Greenhouse Public Board API into SQLite/Prisma DB
 */
router.post('/ingest/greenhouse', async (req, res) => {
  const { companyName, boardSlug } = req.body;

  if (!companyName || !boardSlug) {
    return res.status(400).json({ success: false, error: 'companyName and boardSlug are required.' });
  }

  try {
    // 1. Company को खोजो या नया बनाओ (Idempotent)
    let company = await prisma.company.findFirst({
      where: {
        OR: [
          { atsBoardSlug: boardSlug },
          { name: companyName }
        ]
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: { 
          name: companyName, 
          atsPlatform: 'greenhouse', 
          atsBoardSlug: boardSlug, 
          isRegistered: false 
        }
      });
    }

    // 2. Greenhouse की Public API से लाइव जॉब्स खींचो
    const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs`);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Greenhouse API returned status ${response.status} for board slug "${boardSlug}".`
      });
    }

    const data = await response.json();

    if (!data.jobs || data.jobs.length === 0) {
      return res.status(404).json({ success: false, message: "No jobs found for this board slug!" });
    }

    // 3. डेटा को Prisma के फॉर्मेट में सेट करो
    const jobsToInsert = data.jobs.map(job => ({
      companyId: company.id,
      jobTitle: job.title,
      department: (job.departments && job.departments[0]?.name) || null,
      location: job.location?.name || 'Remote',
      externalApplyUrl: job.absolute_url,
      ranklyApplicationSlug: `${boardSlug}-${job.id}`, // Unique ID
      status: 'active'
    }));

    // 4. Bulk Upsert: एक साथ सारी जॉब्स सेव करो (Fast Performance & SQLite/PostgreSQL Compatible)
    await prisma.$transaction(
      jobsToInsert.map(job =>
        prisma.companyJob.upsert({
          where: { ranklyApplicationSlug: job.ranklyApplicationSlug },
          update: {
            jobTitle: job.jobTitle,
            department: job.department,
            location: job.location,
            externalApplyUrl: job.externalApplyUrl,
            status: 'active'
          },
          create: job
        })
      )
    );

    const totalCompanyJobsInDb = await prisma.companyJob.count({
      where: { companyId: company.id }
    });

    res.json({ 
      success: true, 
      message: `${jobsToInsert.length} jobs successfully fetched and saved for ${companyName}!`,
      company: {
        id: company.id,
        name: company.name,
        atsPlatform: company.atsPlatform,
        atsBoardSlug: company.atsBoardSlug
      },
      jobsFetched: jobsToInsert.length,
      jobsSaved: jobsToInsert.length,
      totalCompanyJobsInDb
    });

  } catch (error) {
    console.error("Ingestion Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to fetch jobs" });
  }
});

/**
 * GET /api/jobs
 * Lists ingested jobs with company metadata & filtering
 */
router.get('/', async (req, res) => {
  try {
    const { search, location, limit = 50 } = req.query;
    const where = { status: 'active' };

    if (search) {
      where.jobTitle = { contains: String(search) };
    }
    if (location) {
      where.location = { contains: String(location) };
    }

    const jobs = await prisma.companyJob.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, atsPlatform: true, atsBoardSlug: true }
        }
      },
      take: Math.min(parseInt(limit, 10) || 50, 200),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.companyJob.count({ where });

    res.json({ 
      success: true, 
      total, 
      count: jobs.length, 
      jobs 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
