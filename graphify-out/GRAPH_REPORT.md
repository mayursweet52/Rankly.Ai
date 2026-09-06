# Graph Report - Rankly.ai  (2026-09-06)

## Corpus Check
- 195 files · ~674,495 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1368 nodes · 1848 edges · 145 communities (90 shown, 50 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 209 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40edd979`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- authController.js
- server.js
- database.js
- healthChecker.js
- userRoutes.js
- test-document-engine.js
- emailService.js
- authRoutes.js
- dependencies
- pipelineController.js
- package.json
- resumeController.js
- auth.js
- candidateRoutes.js
- candidateFeatureController.js
- Rankly.ai - One-Click Startup Guide
- analyticsRoutes.js
- candidateFeatures.js
- middleware/upload.js
- aiService.js
- applicationDbService.js
- leaveRoutes.js
- axios
- figma
- manifest.json
- pgDatabase.js
- RealtimeNotificationService
- CircuitBreaker
- hrCandidateQueue.js
- deploy
- supabaseClient.js
- documentController.js
- analyticsController.js
- cacheManager.js
- userController.js
- passport.js
- create-desktop-shortcut.js
- documentRoutes.js
- scripts
- notificationClient.js
- test-document-rbac-ui.js
- Rankly.ai - Complete Setup Overview
- skillMarketplaceController.js
- seed_hr_candidates.js
- jwtEmployeeRoutes.js
- 🎨 2. For Frontend Developers (UI Integration)
- express
- rateLimit.js
- attendanceLeave.js
- js/upload.js
- pgEmployeeRoutes.js
- guardian.js
- test-e2e-ai-pipeline.js
- test-integration.js
- test-complaints.js
- setup_candidates_table.js
- run_migration.js
- recordAuthFailure
- devDependencies
- ask_nvidia_nemotron
- healthRoutes.js
- setup_complaints_table.js
- setup_internal_documents_table.js
- test_applications_audit.js
- puppeteer-core
- capture_candidate_shots.js
- capture_screenshots.js
- test_authenticated_browser.js
- sendOTPEmail
- check_all_working.js
- test_full_system_audit.js
- attendanceRoutes.js
- query_db.js
- Supabase
- src/components/unlumen-ui/sidebar-toggle-icon.tsx
- errorHandler.js
- requestLogger.js
- optionalAuth
- fix_internal_docs_rls.js
- validateEnv.js
- employeeSchemas.js
- feedbackSchemas.js
- Changelog
- Changelog
- Writing Guidelines for Postgres References
- 3. 🚀 Core Functional Requirements
- 1. The 7 Golden Rules of Playwright Strict
- Huashu Design System & Neo-Minimalist Engineering Standard
- Section Definitions
- ELITE DEVELOPER SYSTEM INSTRUCTIONS (ANTIGRAVITY CORE)
- 2. The 5 Tenets of Exceptional Taste
- UI/UX Pro Max Architecture & Interaction Guide
- 🏗️ Technical Architecture – Rankly.ai
- 🎨 Design System & UI Specifications – Rankly.ai
- 🗺️ Implementation Phases & Roadmap – Rankly.ai
- 🔴 ABSOLUTE MANDATORY SYSTEM INSTRUCTION 🔴
- Supabase Postgres Best Practices
- Antigravity Agent Rules for Rankly.Ai
- Antigravity Agent Rules for Rankly.Ai
- Antigravity Agent Rules for Rankly.Ai
- Impeccable Craft & Frontend Engineering Standard
- Antigravity Agent Rules for Rankly.Ai
- Rankly.ai — Project Memory & Operational Directive
- Implementation Plan: Figma MCP Server Configuration
- .agents/rules/flutter-hot-reload.md
- rules/graphify.md
- advanced-full-text-search.md
- advanced-jsonb-indexing.md
- conn-idle-timeout.md
- conn-limits.md
- conn-pooling.md
- conn-prepared-statements.md
- data-batch-inserts.md
- data-n-plus-one.md
- data-pagination.md
- data-upsert.md
- lock-advisory.md
- lock-deadlock-prevention.md
- lock-short-transactions.md
- lock-skip-locked.md
- monitor-explain-analyze.md
- monitor-pg-stat-statements.md
- monitor-vacuum-analyze.md
- query-composite-indexes.md
- query-covering-indexes.md
- query-index-types.md
- query-missing-indexes.md
- query-partial-indexes.md
- schema-constraints.md
- schema-data-types.md
- schema-foreign-key-indexes.md
- schema-lowercase-identifiers.md
- schema-partitioning.md
- schema-primary-keys.md
- security-privileges.md
- security-rls-basics.md
- security-rls-performance.md
- _template.md
- workflows/graphify.md
- 🚀 Rankly.ai — Next-Gen Executive AI Screening & Candidate Management System

## God Nodes (most connected - your core abstractions)
1. `express` - 23 edges
2. `Rankly.ai - One-Click Startup Guide` - 14 edges
3. `axios` - 13 edges
4. `isAuthenticated()` - 13 edges
5. `optionalAuth()` - 13 edges
6. `recordAuthFailure()` - 13 edges
7. `Rankly.ai - Complete Setup Overview` - 13 edges
8. `sendSystemEmail()` - 12 edges
9. `🚀 Rankly.ai — Next-Gen Executive AI Screening & Candidate Management System` - 12 edges
10. `failAuth()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `runTest()` --calls--> `processInternalDocument()`  [EXTRACTED]
  scripts/test-document-engine.js → src/services/aiService.js
- `runTest()` --calls--> `extractDocumentText()`  [EXTRACTED]
  scripts/test-document-engine.js → src/services/documentParserService.js
- `getAgent()` --calls--> `getAgentById()`  [EXTRACTED]
  src/controllers/aiAgentController.js → src/services/aiAgentService.js
- `failAuth()` --calls--> `sendError()`  [EXTRACTED]
  src/controllers/authController.js → src/utils/apiResponse.js
- `register()` --calls--> `sendVerificationLinkEmail()`  [EXTRACTED]
  src/controllers/authController.js → src/services/emailService.js

## Import Cycles
- None detected.

## Communities (145 total, 50 thin omitted)

### Community 0 - "authController.js"
Cohesion: 0.10
Nodes (14): bcrypt, crypto, { generateOtp, generateReferralCode }, jwt, PERSONAL_EMAIL_DOMAINS, pgDb, prisma, { recordAuthFailure, resetAuthFailure } (+6 more)

### Community 1 - "server.js"
Cohesion: 0.04
Nodes (47): aiAgentRoutes, allowedOrigins, analyticsRoutes, { apiLimiter, publicLimiter, authenticatedLimiter }, app, applicationDbRoutes, attendanceRoutes, authRoutes (+39 more)

### Community 2 - "database.js"
Cohesion: 0.06
Nodes (36): pdf-lib, pgDb, prisma, axios, prisma, { PrismaClient }, aiAgentService, approveDraft() (+28 more)

### Community 3 - "healthChecker.js"
Cohesion: 0.08
Nodes (31): fs, getDiagnostics(), getSecurityThreats(), handleApproveFix(), handleRejectFix(), healthChecker, path, rollbackSnapshot() (+23 more)

### Community 4 - "userRoutes.js"
Cohesion: 0.07
Nodes (35): PATTERNS, validate(), validateField(), validateObject(), { aiLimiter }, chatController, express, { optionalAuth } (+27 more)

### Community 5 - "test-document-engine.js"
Cohesion: 0.12
Nodes (18): mammoth, pdf-parse, axios, { extractDocumentText }, fs, http, path, { processInternalDocument } (+10 more)

### Community 6 - "emailService.js"
Cohesion: 0.12
Nodes (19): nodemailer, getAppBaseUrl(), resendLink(), verifyForgotOtpAndSendLink(), prisma, { sendRanklyEmail }, submitGrievance(), sendTestEmail() (+11 more)

### Community 7 - "authRoutes.js"
Cohesion: 0.08
Nodes (26): jsonwebtoken, jwt, authController, { authLimiter, authBackoffLimiter }, axios, bcrypt, crypto, express (+18 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (30): dependencies, adm-zip, axios, bcryptjs, compression, connect-sqlite3, cors, dotenv (+22 more)

### Community 9 - "pipelineController.js"
Cohesion: 0.11
Nodes (33): uploadApplicationHandler(), createNotification(), getNotifications(), getUnreadCount(), getUserId(), markAllRead(), markAsRead(), prisma (+25 more)

### Community 10 - "package.json"
Cohesion: 0.10
Nodes (20): author, description, keywords, license, main, name, version, adm-zip (+12 more)

### Community 11 - "resumeController.js"
Cohesion: 0.15
Nodes (17): parseResumeHandler(), batchUploadHandler(), detectRoleHandler(), { extractTextFromDocument, extractCandidateInfoFromText }, fs, prisma, realtimeNotificationService, { screenResume, detectRole } (+9 more)

### Community 12 - "auth.js"
Cohesion: 0.10
Nodes (21): isAuthenticated(), prisma, requireHRMS(), requireRole(), verifyToken, authLimiter, appService, express (+13 more)

### Community 13 - "candidateRoutes.js"
Cohesion: 0.25
Nodes (7): { aiLimiter, apiLimiter }, candidateFeatureController, express, { optionalAuth }, pipelineController, router, upload

### Community 14 - "candidateFeatureController.js"
Cohesion: 0.10
Nodes (17): docx, { 
  calculateAtsScoreWithJd, 
  generateCoverLetterAi, 
  calculateSkillGap,
  ROLE_BENCHMARKS 
}, CURATED_JOB_LISTINGS, exportCoverLetterHandler(), exportResumeHandler(), { extractTextFromDocument }, fs, { 
  generateResumeDocx, 
  generateResumePdf, 
  generateCoverLetterDocx 
} (+9 more)

### Community 15 - "Rankly.ai - One-Click Startup Guide"
Cohesion: 0.06
Nodes (35): Accessing the Application, Adding Your Own Icon, Advanced: Create Windows Service, Changing App Name/Description, Configuration, Creating a Portable Version, Custom Icon Setup, **Design Your Own Icon** (+27 more)

### Community 16 - "analyticsRoutes.js"
Cohesion: 0.13
Nodes (14): runTests(), authorizeRoles(), { aiLimiter }, analyticsController, { apiCacheMiddleware }, { authorizeRoles }, express, { optionalAuth, isAuthenticated, requireHRMS } (+6 more)

### Community 17 - "candidateFeatures.js"
Cohesion: 0.20
Nodes (15): escapeHtml(), formatUrl(), handleLiveNotification(), initRealtimeNotificationClient(), renderAiTalentReport(), renderAtsResults(), renderCandidatePipeline(), renderCandidateProfile() (+7 more)

### Community 18 - "middleware/upload.js"
Cohesion: 0.15
Nodes (11): multer, allowedExtensions, allowedMimes, crypto, fs, maxFileSizeMB, multer, path (+3 more)

### Community 19 - "aiService.js"
Cohesion: 0.12
Nodes (18): checkAtsScoreHandler(), generateCoverLetterHandler(), { chatCareerCounselor }, prisma, sendMessage(), axios, calculateAtsScoreWithJd(), chatCareerCounselor() (+10 more)

### Community 20 - "applicationDbService.js"
Cohesion: 0.20
Nodes (6): ALLOWED_TRANSITIONS, db, isValidStatus(), isValidTransition(), updateApplicationStatus(), VALID_STATUSES

### Community 21 - "leaveRoutes.js"
Cohesion: 0.12
Nodes (13): exceljs, assert, ExcelJS, leaveRoutes, realtimeService, { authorizeRoles }, db, express (+5 more)

### Community 22 - "axios"
Cohesion: 0.40
Nodes (3): axios, axios, puppeteer

### Community 23 - "figma"
Cohesion: 0.29
Nodes (9): FIGMA_ACCESS_TOKEN, FIGMA_API_KEY, npx, figma-developer-mcp, @magicuidesign/mcp, @nexus2520/figma-mcp-server, figma, figma-developer (+1 more)

### Community 24 - "manifest.json"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 25 - "pgDatabase.js"
Cohesion: 0.22
Nodes (5): pg, { pool }, tables, db, { Pool }

### Community 27 - "CircuitBreaker"
Cohesion: 0.29
Nodes (4): breakers, CircuitBreaker, getAllCircuitStatuses(), getCircuitBreaker()

### Community 28 - "hrCandidateQueue.js"
Cohesion: 0.39
Nodes (6): escapeHtml(), escapeJsStr(), loadRecentAuditBanner(), renderAiCandidateQueue(), renderAuditLogsTable(), renderCheatSheetContent()

### Community 29 - "deploy"
Cohesion: 0.22
Nodes (8): build, builder, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType, $schema

### Community 30 - "supabaseClient.js"
Cohesion: 0.22
Nodes (6): @supabase/supabase-js, db, supabase, { createClient }, supabaseKey, supabaseUrl

### Community 31 - "documentController.js"
Cohesion: 0.13
Nodes (9): { extractDocumentText, formatFileSize }, path, prisma, processDocumentWithAi(), { processInternalDocument, summarizePolicyDocument }, summarizeDocumentWithAi(), supabase, processInternalDocument() (+1 more)

### Community 32 - "analyticsController.js"
Cohesion: 0.25
Nodes (6): db, generateAiPerformanceReport(), { generatePerformanceInsights }, prisma, supabase, generatePerformanceInsights()

### Community 33 - "cacheManager.js"
Cohesion: 0.22
Nodes (7): apiCacheMiddleware(), crypto, fragmentCache, fs, invalidateFragmentCache(), pageCache, serveCachedHtml()

### Community 34 - "userController.js"
Cohesion: 0.12
Nodes (9): bcrypt, createReferralCode(), crypto, { generateReferralCode }, inviteTeamMember(), prisma, { sendInvitationEmail }, sendInvitationEmail() (+1 more)

### Community 35 - "passport.js"
Cohesion: 0.25
Nodes (7): passport, passport-facebook, passport-google-oauth20, bcrypt, crypto, passport, prisma

### Community 36 - "create-desktop-shortcut.js"
Cohesion: 0.25
Nodes (7): { execSync }, fs, icoPath, path, pngPath, rootDir, targetBat

### Community 37 - "documentRoutes.js"
Cohesion: 0.25
Nodes (7): { authorizeRoles }, documentController, express, { optionalAuth, isAuthenticated, requireHRMS, requireRole }, { publicLimiter, aiLimiter }, router, upload

### Community 38 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, prisma:generate, prisma:migrate, prisma:studio, start

### Community 39 - "notificationClient.js"
Cohesion: 0.47
Nodes (3): fetchLatestAndToast(), fetchUnreadCount(), updateBadge()

### Community 40 - "test-document-rbac-ui.js"
Cohesion: 0.33
Nodes (5): fs, http, makeRequest(), path, runTests()

### Community 41 - "Rankly.ai - Complete Setup Overview"
Cohesion: 0.06
Nodes (32): 📱 Advanced Features, Before Production, Configuration & Tools, Default Setup, 🎯 Directory Structure After Setup, Documentation, External Resources, 📋 File Purpose Reference (+24 more)

### Community 42 - "skillMarketplaceController.js"
Cohesion: 0.18
Nodes (12): assignSkill(), createSkill(), getEmployeeMarketplace(), prisma, recommendTrainingCourse(), skillMarketplaceService, assignSkillToEmployee(), formatSkillBundleToJson() (+4 more)

### Community 43 - "seed_hr_candidates.js"
Cohesion: 0.18
Nodes (7): @prisma/client, prisma, { PrismaClient }, candidatesData, crypto, prisma, { PrismaClient }

### Community 44 - "jwtEmployeeRoutes.js"
Cohesion: 0.29
Nodes (4): employeeController, express, router, verifyToken

### Community 45 - "🎨 2. For Frontend Developers (UI Integration)"
Cohesion: 0.10
Nodes (19): 🌐 1. Server & Environment Endpoints, 🎨 2. For Frontend Developers (UI Integration), 🤖 3. For AI & Agent Developers (AI Engine & Recommendations), 🏥 4. Health & Status Checks, A. Direct Supabase Query (Python Example), A. Employee Directory & HRMS, B. AI Agent API Endpoints, B. ATS Candidate Pipeline & Screening (+11 more)

### Community 46 - "express"
Cohesion: 0.11
Nodes (16): express, aiLimiter, aiAgentController, express, { optionalAuth }, { publicLimiter, aiLimiter }, router, express (+8 more)

### Community 47 - "rateLimit.js"
Cohesion: 0.25
Nodes (12): authBackoffLimiter(), calculateBackoffDelay(), checkKeyRestriction(), failureStore, getAccountIdentifier(), getClientIp(), getConfig(), apiLimiter() (+4 more)

### Community 48 - "attendanceLeave.js"
Cohesion: 0.40
Nodes (3): fetchTodayAttendance(), startClock(), updatePunchUI()

### Community 49 - "js/upload.js"
Cohesion: 0.48
Nodes (5): getInitials(), handleFiles(), isAllowedFile(), renderCandidate(), renderCandidates()

### Community 50 - "pgEmployeeRoutes.js"
Cohesion: 0.40
Nodes (3): db, express, router

### Community 51 - "guardian.js"
Cohesion: 0.33
Nodes (4): { exec }, fs, logFile, path

### Community 52 - "test-e2e-ai-pipeline.js"
Cohesion: 0.22
Nodes (8): bcryptjs, autoSeedTestingUsers(), axios, bcrypt, fs, path, prisma, runE2ETests()

### Community 53 - "test-integration.js"
Cohesion: 0.25
Nodes (7): axios, bcrypt, http, prisma, req, runSuite(), supabase

### Community 54 - "test-complaints.js"
Cohesion: 0.29
Nodes (6): axios, http, req, runTest(), supabase, server

### Community 56 - "run_migration.js"
Cohesion: 0.40
Nodes (3): db, fs, path

### Community 57 - "recordAuthFailure"
Cohesion: 0.36
Nodes (11): companyResetPassword(), failAuth(), formatUserResponse(), getMe(), login(), register(), resetPassword(), verifyCompanyReferral() (+3 more)

### Community 58 - "devDependencies"
Cohesion: 0.50
Nodes (4): devDependencies, docx, nodemon, prisma

### Community 59 - "ask_nvidia_nemotron"
Cohesion: 0.83
Nodes (3): ask_nvidia_nemotron(), evaluate_candidate_nemotron(), tool

### Community 60 - "healthRoutes.js"
Cohesion: 0.22
Nodes (7): express-rate-limit, express, healthController, healthTriggerLimiter, { optionalAuth }, rateLimit, router

### Community 64 - "puppeteer-core"
Cohesion: 0.29
Nodes (3): puppeteer-core, puppeteer, puppeteer

### Community 65 - "capture_candidate_shots.js"
Cohesion: 0.40
Nodes (3): axios, path, puppeteer

### Community 66 - "capture_screenshots.js"
Cohesion: 0.40
Nodes (3): axios, path, puppeteer

### Community 68 - "sendOTPEmail"
Cohesion: 0.36
Nodes (8): checkEmailAvailability(), findExistingUserByEmail(), forgotPassword(), resendOtp(), sendOtp(), validateEmailAddress(), sendOTPEmail(), generateOtp()

### Community 70 - "test_full_system_audit.js"
Cohesion: 0.50
Nodes (3): http, makeRequest(), runFullAudit()

### Community 71 - "attendanceRoutes.js"
Cohesion: 0.25
Nodes (6): { authorizeRoles }, db, express, { optionalAuth, isAuthenticated }, realtimeNotificationService, router

### Community 73 - "Supabase"
Cohesion: 0.11
Nodes (15): Fix suggestion, Source, What happened, Skill Feedback, Steps, Core Principles, Debugging, Making and Committing Schema Changes (+7 more)

### Community 77 - "optionalAuth"
Cohesion: 0.29
Nodes (6): optionalAuth(), express, { optionalAuth }, { publicLimiter }, router, skillMarketplaceController

### Community 89 - "Changelog"
Cohesion: 0.12
Nodes (16): [1.2.0](https://github.com/supabase/agent-skills/compare/v1.1.1...v1.2.0) (2026-06-02), [1.3.0](https://github.com/supabase/agent-skills/compare/v1.2.0...v1.3.0) (2026-06-05), [1.4.0](https://github.com/supabase/agent-skills/compare/v1.3.0...v1.4.0) (2026-07-10), [1.5.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.4.0...supabase-postgres-best-practices-v1.5.0) (2026-07-30), [1.6.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.5.0...supabase-postgres-best-practices-v1.6.0) (2026-07-30), Bug Fixes, Bug Fixes, Bug Fixes (+8 more)

### Community 90 - "Changelog"
Cohesion: 0.12
Nodes (15): [0.1.3](https://github.com/supabase/agent-skills/compare/v0.1.2...v0.1.3) (2026-06-02), [0.1.4](https://github.com/supabase/agent-skills/compare/v0.1.3...v0.1.4) (2026-06-05), [0.1.5](https://github.com/supabase/agent-skills/compare/v0.1.4...v0.1.5) (2026-07-10), [0.1.6](https://github.com/supabase/agent-skills/compare/v0.1.5...supabase-v0.1.6) (2026-07-30), [0.1.7](https://github.com/supabase/agent-skills/compare/v0.1.6...supabase-v0.1.7) (2026-08-12), Bug Fixes, Bug Fixes, Bug Fixes (+7 more)

### Community 91 - "Writing Guidelines for Postgres References"
Cohesion: 0.12
Nodes (15): 1. Concrete Transformation Patterns, 2. Error-First Structure, 3. Quantified Impact, 4. Self-Contained Examples, 5. Semantic Naming, Code Example Standards, Comments, Impact Level Guidelines (+7 more)

### Community 92 - "3. 🚀 Core Functional Requirements"
Cohesion: 0.17
Nodes (11): 1. 🎯 Executive Summary & Vision, 2. 👥 User Personas & Role Matrix, 3.1 Authentication & User Lifecycle, 3.2 Multi-Metric ATS Resume Screening Engine, 3.3 Aceternity Gooey Candidate Search & Filtering, 3.4 Talent Pipeline (Kanban Board), 3.5 AI Resume Builder & Blueprint Studio, 3.6 Interactive AI Chatbot & Career Advisory (+3 more)

### Community 93 - "1. The 7 Golden Rules of Playwright Strict"
Cohesion: 0.18
Nodes (10): 1. The 7 Golden Rules of Playwright Strict, 1. User-Facing Locators Over Brittle Selectors, 2. Auto-Waiting & Web-First Assertions, 2. Playwright Strict Execution Checklist, 3. Strict Actionability & Navigation Guards, 4. Deterministic Network Mocking & Interception, 5. Multi-Device & Mobile Viewport Rigor, 6. Visual Regression with Strict Thresholds (+2 more)

### Community 94 - "Huashu Design System & Neo-Minimalist Engineering Standard"
Cohesion: 0.20
Nodes (9): 1. Core Visual Pillars, 1. The Huashu Hero Card, 2. Color Tokens & Palette, 3. Implementation Patterns, 4. Quality Rules, A. Surface & Material Physics, B. High-Density Dashboard Typography, C. Kinetic Motion & Spring Physics (+1 more)

### Community 95 - "Section Definitions"
Cohesion: 0.20
Nodes (9): 1. Query Performance (query), 2. Connection Management (conn), 3. Security & RLS (security), 4. Schema Design (schema), 5. Concurrency & Locking (lock), 6. Data Access Patterns (data), 7. Monitoring & Diagnostics (monitor), 8. Advanced Features (advanced) (+1 more)

### Community 97 - "ELITE DEVELOPER SYSTEM INSTRUCTIONS (ANTIGRAVITY CORE)"
Cohesion: 0.20
Nodes (9): 1. CORE IDENTITY & MINDSET, 2. ABSOLUTE SCOPE CONTROL (THE GOLDEN RULE), 3. OUTPUT & FORMATTING STANDARDS, 4. UI/UX & DESIGN CONSTRAINTS, 5. LOGIC & STATE MANAGEMENT, 6. ERROR HANDLING & DEBUGGING, 7. COMMENTS & DOCUMENTATION, ELITE DEVELOPER SYSTEM INSTRUCTIONS (ANTIGRAVITY CORE) (+1 more)

### Community 98 - "2. The 5 Tenets of Exceptional Taste"
Cohesion: 0.22
Nodes (8): 1. The Anti-Patterns of Low Taste (What to Avoid), 2. The 5 Tenets of Exceptional Taste, A. Intentional Negative Space, B. Curated Color Temperature & Harmony, C. Typographic Soul & Editorial Contrast, D. Bespoke Details & Micro-Delight, E. Material Restraint, Taste: Curated Visual Direction & Anti-Generic Aesthetics

### Community 99 - "UI/UX Pro Max Architecture & Interaction Guide"
Cohesion: 0.22
Nodes (8): 1. Ergonomics & Cognitive Load Optimization, 2. Design System Architecture, 3. Responsive Breakpoints & Device Targets, 4. Interaction States & Micro-Feedback Matrix, 5. Performance & Zero-Lag Guarantees, A. The 8-Point Spatial Grid, B. Typography Scale & Hierarchy, UI/UX Pro Max Architecture & Interaction Guide

### Community 100 - "🏗️ Technical Architecture – Rankly.ai"
Cohesion: 0.25
Nodes (7): 1. 📐 System Architecture Diagram, 2.1 ORM & Database Engine, 2.2 Core Prisma Models, 2. 🗄️ Database & Data Layer, 3. 🤖 AI Multi-Provider Fallback Cascade Engine, 4. 🌐 Frontend Architecture, 🏗️ Technical Architecture – Rankly.ai

### Community 101 - "🎨 Design System & UI Specifications – Rankly.ai"
Cohesion: 0.25
Nodes (7): 1.1 Light Theme (Cohere Signature Minimalist), 1.2 Dark Theme (Pure Matte Black Obsidian), 1. 🌈 Color Palette, 2. 🪨 3D Pebbles Layer (Login Screen), 3. 🛸 Floating Dock Navigation (Dark Mode), 4. 💧 Aceternity Gooey Candidate Search, 🎨 Design System & UI Specifications – Rankly.ai

### Community 102 - "🗺️ Implementation Phases & Roadmap – Rankly.ai"
Cohesion: 0.25
Nodes (7): 🗺️ Implementation Phases & Roadmap – Rankly.ai, ✅ Phase 1: Authentication, Access Control & Dual-Track Roles, ✅ Phase 2: Multi-Metric ATS Resume Screening Engine, ✅ Phase 3: Talent Pipeline (Kanban) & Candidate Tracking, ✅ Phase 4: AI Career Advisory & Resume Blueprint Studio, ✅ Phase 5: Modern UI/UX, Design System & Theming, 🔮 Phase 6: Upcoming Enterprise Extensions (Future Roadmap)

### Community 104 - "🔴 ABSOLUTE MANDATORY SYSTEM INSTRUCTION 🔴"
Cohesion: 0.33
Nodes (5): 🔴 ABSOLUTE MANDATORY SYSTEM INSTRUCTION 🔴, 🧠 AGENT BEHAVIOR & EFFICIENCY (STRICT), 🛠️ CODING STYLE & QUALITY (STRICT), ⚙️ CONFIGURATION LIMITS (STRICT), 🏗️ PROJECT ARCHITECTURE (STRICT)

### Community 105 - "Supabase Postgres Best Practices"
Cohesion: 0.33
Nodes (5): How to Use, References, Rule Categories by Priority, Supabase Postgres Best Practices, When to Apply

### Community 107 - "Antigravity Agent Rules for Rankly.Ai"
Cohesion: 0.50
Nodes (3): Antigravity Agent Rules for Rankly.Ai, Automatic Git Pull on Every Interaction (MANDATORY USER RULE), Automatic Git Push on Every Update (MANDATORY USER RULE)

### Community 108 - "Antigravity Agent Rules for Rankly.Ai"
Cohesion: 0.50
Nodes (3): Antigravity Agent Rules for Rankly.Ai, Automatic Git Pull on Every Interaction (MANDATORY USER RULE), Automatic Git Push on Every Update (MANDATORY USER RULE)

### Community 109 - "Antigravity Agent Rules for Rankly.Ai"
Cohesion: 0.50
Nodes (3): Antigravity Agent Rules for Rankly.Ai, Automatic Git Pull on Every Interaction (MANDATORY USER RULE), Automatic Git Push on Every Update (MANDATORY USER RULE)

### Community 110 - "Impeccable Craft & Frontend Engineering Standard"
Cohesion: 0.50
Nodes (3): 1. The 10 Principles of Impeccable Craft, 2. Impeccable Verification Checklist, Impeccable Craft & Frontend Engineering Standard

### Community 111 - "Antigravity Agent Rules for Rankly.Ai"
Cohesion: 0.50
Nodes (3): Antigravity Agent Rules for Rankly.Ai, Automatic Git Pull on Every Interaction (MANDATORY USER RULE), Automatic Git Push on Every Update (MANDATORY USER RULE)

### Community 112 - "Rankly.ai — Project Memory & Operational Directive"
Cohesion: 0.50
Nodes (3): Architecture Stack, Core Directives, Rankly.ai — Project Memory & Operational Directive

### Community 113 - "Implementation Plan: Figma MCP Server Configuration"
Cohesion: 0.50
Nodes (3): Implementation Plan: Figma MCP Server Configuration, Objective, Step-by-Step Execution

### Community 155 - "🚀 Rankly.ai — Next-Gen Executive AI Screening & Candidate Management System"
Cohesion: 0.06
Nodes (31): 1. Authentication & Security, 1. Candidate Portal & Live Application Tracker, 2. Candidate & Document Upload, ⏱️ 2-Minute Live Demo Walkthrough, 2. Multi-Tiered AI Screening (NVIDIA Nemotron 70B), 3. HR Recruiter AI Queue & Decisioning Engine, 3. HR Recruiter & Decisioning, 4. Enterprise HRMS (Attendance & Smart Leave) (+23 more)

## Knowledge Gaps
- **698 isolated node(s):** `@magicuidesign/mcp`, `@nexus2520/figma-mcp-server`, `figma-developer-mcp`, `name`, `version` (+693 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 876 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **50 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `express` to `server.js`, `database.js`, `userRoutes.js`, `documentRoutes.js`, `attendanceRoutes.js`, `authRoutes.js`, `package.json`, `auth.js`, `candidateRoutes.js`, `jwtEmployeeRoutes.js`, `optionalAuth`, `analyticsRoutes.js`, `pgEmployeeRoutes.js`, `leaveRoutes.js`, `healthRoutes.js`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `@prisma/client` connect `seed_hr_candidates.js` to `pipelineController.js`, `package.json`, `database.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `@magicuidesign/mcp`, `@nexus2520/figma-mcp-server`, `figma-developer-mcp` to the rest of the system?**
  _698 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `authController.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09881422924901186 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `database.js` be split into smaller, more focused modules?**
  _Cohesion score 0.055272108843537414 - nodes in this community are weakly interconnected._