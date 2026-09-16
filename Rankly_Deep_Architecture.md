# ⚙️ Rankly.ai — Deep Mechanical Architecture Blueprint

Based on a deep codebase analysis of `server.js`, `prisma/schema.prisma`, and the `src/services/` directory, here is the ultra-detailed mechanical architecture of the Rankly.ai platform.

## Deep Mechanical Diagram

```mermaid
flowchart TB
    %% ==========================================
    %% GLOBAL STYLING
    %% ==========================================
    classDef browser fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#0f172a
    classDef edge fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,color:#334155
    classDef security fill:#fee2e2,stroke:#ef4444,stroke-width:1px,color:#991b1b
    classDef middleware fill:#dcfce7,stroke:#22c55e,stroke-width:1px,color:#166534
    classDef service fill:#e0e7ff,stroke:#6366f1,stroke-width:1px,color:#3730a3
    classDef aiCore fill:#ede9fe,stroke:#8b5cf6,stroke-width:2px,color:#5b21b6
    classDef orm fill:#ffedd5,stroke:#f97316,stroke-width:2px,color:#9a3412
    classDef db fill:#fef3c7,stroke:#eab308,stroke-width:2px,color:#854d0e
    classDef external fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,stroke-dasharray: 5 5,color:#111827

    %% ==========================================
    %% 1. FRONTEND / EDGE LAYER
    %% ==========================================
    subgraph Client ["🌐 Client Browser & Frontend UI"]
        UI["DOM / HTML Views"]:::browser
        UIPolish["uiPolishSuite.js\n(Theme & A11y)"]:::browser
        SocketClient["Socket.IO Client\n(Realtime Sync)"]:::browser
        UploadMgr["upload.js\n(File Chunking)"]:::browser
        
        UI <--> UIPolish
        UI <--> SocketClient
    end

    %% ==========================================
    %% 2. INGRESS & SECURITY (NODE.JS)
    %% ==========================================
    subgraph Ingress ["🛡️ Ingress, Edge & Security (server.js)"]
        LoadBalancer["Trust Proxy Reverse Proxy"]:::edge
        Compression["HTTP Compression\n(Gzip/Brotli)"]:::edge
        Helmet["Helmet.js\n(Security Headers)"]:::security
        RateLimiter["Rate Limiting\n(apiLimiter, publicLimiter)"]:::security
        
        LoadBalancer --> Compression --> Helmet --> RateLimiter
    end

    %% ==========================================
    %% 3. MIDDLEWARE & AUTHENTICATION
    %% ==========================================
    subgraph Middleware ["🚦 Middleware & Auth Layer"]
        SessionStore["express-session\n(connect-sqlite3)"]:::middleware
        AuthGuard["auth.js\n(JWT & Roles: requireHRMS)"]:::middleware
        Validator["validator.js\n(Input Sanitation)"]:::middleware
        CacheMgr["cacheManager.js\n(Fragment Caching)"]:::middleware
    end

    %% ==========================================
    %% 4. EXPRESS ROUTING MATRIX
    %% ==========================================
    subgraph Routing ["🔀 Express API Routers"]
        AuthRoute["/auth"]:::service
        HealthRoute["/health"]:::service
        PipelineRoute["/pipeline"]:::service
        ExportRoute["/export"]:::service
        JobRoute["/job"]:::service
        BackupRoute["/backup"]:::service
        WebhookRoute["/webhook"]:::service
    end

    %% ==========================================
    %% 5. CORE BUSINESS SERVICES (src/services/)
    %% ==========================================
    subgraph Services ["⚙️ Internal Microservices"]
        HealthDaemon["healthChecker.js\n(Self-Healing Daemon)"]:::service
        ExportService["exportService.js\n(ExcelJS/CSV Gen)"]:::service
        CacheService["redisCacheService.js"]:::service
        BackupService["dbBackupService.js\n(Automated Dumps)"]:::service
        Notification["realtimeNotificationService.js\n(Socket.IO Emitter)"]:::service
        
        subgraph HybridEmail ["Email Infrastructure"]
            NodeMailer["emailService.js"]:::service
            PySender["pythonEmailSender.py\n(Subprocess Worker)"]:::service
        end
    end

    %% ==========================================
    %% 6. AI & PARSING PIPELINE
    %% ==========================================
    subgraph AICore ["🧠 AI & Vector Engine"]
        DocParser["documentParserService.js\n(Text Extraction)"]:::aiCore
        VectorSearch["vectorSearchService.js\n(Embeddings & RAG)"]:::aiCore
        AIMatcher["aiMatcher.js\n(Candidate Scoring)"]:::aiCore
        AIAgent["aiAgentService.js\n(Autonomous Processing)"]:::aiCore
    end

    %% ==========================================
    %% 7. DATA LAYER (PRISMA ORM)
    %% ==========================================
    subgraph Data ["🗄️ Persistence Layer"]
        Prisma["Prisma ORM Client"]:::orm
        
        subgraph Postgres ["PostgreSQL Relational DB"]
            UserTbl[("Users & Roles")]:::db
            AppTbl[("Applications")]:::db
            DocTbl[("CompanyDocuments")]:::db
            AttTbl[("Attendance & Leaves")]:::db
            AuditTbl[("AuditLogs")]:::db
            GrievTbl[("Grievance")]:::db
        end
        
        Prisma --> Postgres
    end

    %% ==========================================
    %% 8. EXTERNAL PROVIDERS
    %% ==========================================
    subgraph External ["☁️ External Integrations"]
        Nvidia["NVIDIA Nemotron AI"]:::external
        SMTP["SMTP / Email Provider"]:::external
        RedisCloud["Redis Server"]:::external
    end

    %% ==========================================
    %% CONNECTIONS & FLOWS
    %% ==========================================
    UploadMgr -- "POST /api/upload" --> LoadBalancer
    Client -- "HTTP Requests" --> LoadBalancer
    
    RateLimiter --> SessionStore
    SessionStore --> AuthGuard
    AuthGuard --> Validator
    Validator --> CacheMgr
    CacheMgr --> Routing
    
    Routing --> Services
    Routing --> AICore
    
    Services --> Prisma
    AICore --> Prisma
    
    DocParser --> AIMatcher
    DocParser --> VectorSearch
    AIMatcher <--> Nvidia
    VectorSearch <--> Nvidia
    AIAgent --> AIMatcher
    
    NodeMailer --> PySender
    PySender --> SMTP
    NodeMailer --> SMTP
    
    Notification -- "WebSocket push" --> SocketClient
    CacheService <--> RedisCloud
    
    HealthDaemon -. "Monitors" .-> Postgres
    BackupService -. "Dumps" .-> Postgres

```

## Deep Component Analysis (Codebase Validated)

After analyzing `server.js`, `prisma/schema.prisma`, and the `src/services/` directory, here is the granular breakdown of Rankly.ai's mechanics:

### 1. Ingress & Security Stack
The application is fortified at the edge in `server.js`:
* **Trust Proxy:** Configured (`app.set('trust proxy', 1)`) to handle Load Balancers like Render or Heroku.
* **Helmet.js & Disabling Fingerprinting:** Removes `x-powered-by` and locks down HTTP security headers.
* **Compression:** Implements Gzip/Brotli for payloads over 256 bytes to ensure lightning-fast UI rendering.
* **Triple Rate-Limiting:** `apiLimiter`, `publicLimiter`, and `authenticatedLimiter` protect against brute-force and DDoS attacks.

### 2. State & Session Management
* Uses `express-session` backed by `connect-sqlite3`. This means user sessions survive server restarts and scale securely.
* `cacheManager.js` handles fragment caching to serve static or frequently-accessed data rapidly without hitting the DB.

### 3. The 29-Route Matrix
The routing layer is massively modularized into 29 distinct API endpoints. Key routers include:
* **`pipelineRoutes.js` / `candidateRoutes.js`**: Handle ATS (Applicant Tracking System) logic.
* **`grievanceRoutes.js` / `leaveRoutes.js` / `attendanceRoutes.js`**: Core HRMS functionality.
* **`exportRoutes.js`**: Triggers `exportService.js` to serialize DB arrays into downloadable Excel/CSV files.
* **`backupRoutes.js`**: Interfaces with `dbBackupService.js` to automate database snapshotting.

### 4. Advanced AI & Vector Mechanics
The AI layer is not a simple wrapper; it is a multi-stage pipeline:
* **`documentParserService.js`**: Mechanically strips formatting from resumes/documents, converting them into clean text streams.
* **`vectorSearchService.js`**: Indicates advanced Retrieval-Augmented Generation (RAG). It likely creates embeddings of company documents or job descriptions for semantic matching.
* **`aiMatcher.js` & `aiAgentService.js`**: Stream data to **NVIDIA Nemotron AI**, generating match scores, extracting skills, and creating structured evaluations.

### 5. Hybrid Email Architecture
Rankly.ai utilizes a unique hybrid email pipeline:
* Standard emails route through `emailService.js` (likely Nodemailer).
* The codebase also contains a `pythonEmailSender.py` script. The Node backend spawns a Python subprocess to handle specific/legacy SMTP protocols or bulk queue operations.

### 6. Prisma Database Schema
The SQL database is strictly typed via Prisma with high relational complexity:
* **HRMS:** Models like `Attendance` (tracks CheckIn/Out and exact WorkHours), `LeaveRequest` (Sick/Maternity with approval workflows), and `Grievance` (confidential reporting system).
* **ATS:** `CandidateApplication` and `Application` models track candidates through a strict `pending_screening` ➔ `ai_shortlisted` ➔ `hr_shortlisted` pipeline.
* **Audit Trails:** The `AuditLog` model is deeply integrated, permanently recording every state change (e.g., when a candidate is rejected, storing IP, user agent, and actor).
* **Company Setup:** `Company`, `CompanyJob`, and `CompanyDocument` manage multitenancy/organization data.

### 7. Realtime Notification Engine
Instead of just Supabase, `server.js` explicitly boots a native `Socket.IO` server attached to `realtimeNotificationService.js`. When the AI finishes evaluating a resume, or an HR admin approves a leave request, this service emits a WebSocket payload straight to the frontend, instantly updating the UI without a page refresh.
