# Graph Report - Rankly.ai  (2026-09-06)

## Corpus Check
- 136 files · ~150,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 947 nodes · 1436 edges · 89 communities (60 shown, 20 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 202 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 80
- Community 81
- Community 82

## God Nodes (most connected - your core abstractions)
1. `express` - 22 edges
2. `axios` - 14 edges
3. `recordAuthFailure()` - 13 edges
4. `optionalAuth()` - 13 edges
5. `isAuthenticated()` - 13 edges
6. `sendSystemEmail()` - 12 edges
7. `failAuth()` - 11 edges
8. `executeAiInference()` - 11 edges
9. `resetAuthFailure()` - 10 edges
10. `formatCandidate()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `runTest()` --calls--> `processInternalDocument()`  [EXTRACTED]
  scripts/test-document-engine.js → src/services/aiService.js
- `runTest()` --calls--> `extractDocumentText()`  [EXTRACTED]
  scripts/test-document-engine.js → src/services/documentParserService.js
- `register()` --calls--> `sendVerificationLinkEmail()`  [EXTRACTED]
  src/controllers/authController.js → src/services/emailService.js
- `resendLink()` --calls--> `sendVerificationLinkEmail()`  [EXTRACTED]
  src/controllers/authController.js → src/services/emailService.js
- `resendOtp()` --calls--> `sendOTPEmail()`  [EXTRACTED]
  src/controllers/authController.js → src/services/emailService.js

## Import Cycles
- None detected.

## Communities (89 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (42): bcrypt, companyResetPassword(), crypto, failAuth(), forgotPassword(), formatUserResponse(), { generateOtp, generateReferralCode }, getAppBaseUrl() (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (46): aiAgentRoutes, allowedOrigins, analyticsRoutes, { apiLimiter, publicLimiter, authenticatedLimiter }, app, applicationDbRoutes, attendanceRoutes, authRoutes (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (36): exceljs, @prisma/client, candidatesData, crypto, prisma, { PrismaClient }, { PrismaClient }, aiAgentService (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (39): express-rate-limit, nodemailer, fs, getDiagnostics(), getSecurityThreats(), handleApproveFix(), handleRejectFix(), healthChecker (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (35): PATTERNS, validate(), validateField(), validateObject(), { aiLimiter }, chatController, express, { optionalAuth } (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (27): mammoth, pdf-parse, axios, { extractDocumentText }, fs, http, path, { processInternalDocument } (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (25): prisma, { sendRanklyEmail }, submitGrievance(), sendTestEmail(), bcrypt, createReferralCode(), crypto, { generateReferralCode } (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (26): jsonwebtoken, jwt, authController, { authLimiter, authBackoffLimiter }, axios, bcrypt, crypto, express (+18 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (30): dependencies, adm-zip, axios, bcryptjs, compression, connect-sqlite3, cors, dotenv (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (24): buildAiCheatSheet(), createCandidate(), deleteCandidate(), formatCandidate(), getAiCandidateQueue(), getCandidateAuditLogs(), getCandidateById(), getCandidateCheatSheet() (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): author, description, keywords, license, main, name, version, adm-zip (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (14): batchUploadHandler(), detectRoleHandler(), { extractTextFromDocument, extractCandidateInfoFromText }, fs, prisma, { screenResume, detectRole }, screenResumeHandler(), detectRole() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (15): prisma, requireHRMS(), requireRole(), verifyToken, authLimiter, employeeController, express, { isAuthenticated, requireHRMS, requireRole } (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (16): aiLimiter, apiLimiter(), authenticatedLimiter, publicLimiter, aiAgentController, express, { optionalAuth }, { publicLimiter, aiLimiter } (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (8): { 
  calculateAtsScoreWithJd, 
  generateCoverLetterAi, 
  calculateSkillGap,
  ROLE_BENCHMARKS 
}, CURATED_JOB_LISTINGS, { extractTextFromDocument }, fs, { 
  generateResumeDocx, 
  generateResumePdf, 
  generateCoverLetterDocx 
}, getSkillGapHandler(), prisma, calculateSkillGap()

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (12): assignSkill(), createSkill(), getEmployeeMarketplace(), prisma, recommendTrainingCourse(), skillMarketplaceService, assignSkillToEmployee(), formatSkillBundleToJson() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (13): authorizeRoles(), { aiLimiter }, analyticsController, { apiCacheMiddleware }, { authorizeRoles }, express, { optionalAuth, isAuthenticated, requireHRMS }, router (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (12): escapeHtml(), renderAiTalentReport(), renderAtsResults(), renderCandidatePipeline(), renderCandidateProfile(), renderJobListings(), renderPolicySummary(), renderProfileSkillChips() (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (11): multer, allowedExtensions, allowedMimes, crypto, fs, maxFileSizeMB, multer, path (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (12): ollama, generateCoverLetterHandler(), axios, { evaluateResumeRuleBased, safeJsonParse }, executeAiInference(), generateCoverLetterAi(), { getCircuitBreaker }, groqBreaker (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (6): ALLOWED_TRANSITIONS, db, isValidStatus(), isValidTransition(), updateApplicationStatus(), VALID_STATUSES

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (10): docx, pdf-lib, exportCoverLetterHandler(), exportResumeHandler(), cleanText(), { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle }, generateCoverLetterDocx(), generateResumeDocx() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (5): puppeteer-core, puppeteer, axios, puppeteer, puppeteer

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (9): FIGMA_ACCESS_TOKEN, FIGMA_API_KEY, npx, figma-developer-mcp, @magicuidesign/mcp, @nexus2520/figma-mcp-server, figma, figma-developer (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (5): pg, { pool }, tables, db, { Pool }

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (8): axios, bcrypt, http, prisma, req, runSuite(), supabase, server

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (4): breakers, CircuitBreaker, getAllCircuitStatuses(), getCircuitBreaker()

### Community 28 - "Community 28"
Cohesion: 0.39
Nodes (6): escapeHtml(), escapeJsStr(), loadRecentAuditBanner(), renderAiCandidateQueue(), renderAuditLogsTable(), renderCheatSheetContent()

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, $schema

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (6): @supabase/supabase-js, db, supabase, { createClient }, supabaseKey, supabaseUrl

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (7): autoSeedTestingUsers(), axios, bcrypt, fs, path, prisma, runE2ETests()

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (6): db, generateAiPerformanceReport(), { generatePerformanceInsights }, prisma, supabase, generatePerformanceInsights()

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (7): apiCacheMiddleware(), crypto, fragmentCache, fs, invalidateFragmentCache(), pageCache, serveCachedHtml()

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (4): axios, axios, prisma, axios

### Community 35 - "Community 35"
Cohesion: 0.25
Nodes (7): passport, passport-facebook, passport-google-oauth20, bcrypt, crypto, passport, prisma

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (7): { execSync }, fs, icoPath, path, pngPath, rootDir, targetBat

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): { authorizeRoles }, documentController, express, { optionalAuth, isAuthenticated, requireHRMS, requireRole }, { publicLimiter, aiLimiter }, router, upload

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (7): scripts, build, dev, prisma:generate, prisma:migrate, prisma:studio, start

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): axios, http, req, runTest(), supabase

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): fs, http, makeRequest(), path, runTests()

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (4): { chatCareerCounselor }, prisma, sendMessage(), chatCareerCounselor()

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (6): optionalAuth(), express, { optionalAuth }, { publicLimiter }, router, skillMarketplaceController

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (5): { authorizeRoles }, db, express, { optionalAuth, isAuthenticated }, router

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (4): employeeController, express, router, verifyToken

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (5): { authorizeRoles }, db, express, { optionalAuth, isAuthenticated }, router

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (6): { aiLimiter }, express, { optionalAuth, isAuthenticated }, resumeController, router, upload

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): EvaluationSchema, mongoose, OrganizationSchema, ReferralCodeSchema, UserSchema

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (3): fetchTodayAttendance(), startClock(), updatePunchUI()

### Community 49 - "Community 49"
Cohesion: 0.60
Nodes (5): getInitials(), handleFiles(), isAllowedFile(), renderCandidate(), renderCandidates()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (4): express, db, express, router

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (4): { exec }, fs, logFile, path

### Community 52 - "Community 52"
Cohesion: 0.33
Nodes (5): isAuthenticated(), appService, express, { isAuthenticated }, router

### Community 53 - "Community 53"
Cohesion: 0.40
Nodes (4): bcrypt, mongoose, UserSchema, bcryptjs

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (3): axios, path, puppeteer

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (3): axios, path, puppeteer

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (3): db, fs, path

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (5): checkAtsScoreHandler(), uploadApplicationHandler(), calculateAtsScoreWithJd(), executeDeterministicAtsMatch(), extractTextFromDocument()

### Community 58 - "Community 58"
Cohesion: 0.50
Nodes (4): devDependencies, docx, nodemon, prisma

### Community 59 - "Community 59"
Cohesion: 0.83
Nodes (3): ask_nvidia_nemotron(), evaluate_candidate_nemotron(), tool

## Knowledge Gaps
- **446 isolated node(s):** `SidebarToggleIconProps`, `SidebarToggleIconProps`, `bcrypt`, `crypto`, `{ generateOtp, generateReferralCode }` (+441 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 564 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Community 50` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 37`, `Community 7`, `Community 10`, `Community 43`, `Community 12`, `Community 13`, `Community 44`, `Community 45`, `Community 16`, `Community 46`, `Community 42`, `Community 52`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `axios` connect `Community 34` to `Community 64`, `Community 2`, `Community 5`, `Community 39`, `Community 7`, `Community 10`, `Community 19`, `Community 55`, `Community 22`, `Community 54`, `Community 26`, `Community 31`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 8` to `Community 10`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `SidebarToggleIconProps`, `SidebarToggleIconProps`, `bcrypt` to the rest of the system?**
  _446 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07764876632801161 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05735430157261795 - nodes in this community are weakly interconnected._