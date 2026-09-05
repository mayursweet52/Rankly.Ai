const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const candidatesData = [
  {
    name: 'Aditya Verma',
    email: 'aditya.verma@techlabs.io',
    phone: '+91 98765 11223',
    targetRole: 'Senior Full Stack Engineer',
    score: 96,
    skillsScore: 98,
    experienceScore: 95,
    toolsScore: 97,
    educationScore: 92,
    fitVerdict: 'Optimal Fit',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['TypeScript', 'React 19', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Redis', 'GraphQL']),
    missingSkills: JSON.stringify(['Go', 'Rust']),
    recommendations: JSON.stringify(['Immediate candidate for Technical Interview Round 1.', 'High architectural synergy with our modern stack.']),
    summary: 'Exceptional 7+ years track record scaling full-stack distributed web applications in high-throughput production environments. Complete alignment with TypeScript, React 19, Node.js microservices, and automated CI/CD pipelines. Exhibits exemplary code craftsmanship, system design rigor, and team mentorship capability.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Exceptional 7+ years track record scaling full-stack distributed web applications in high-throughput production environments.',
        'Complete alignment with TypeScript, React 19, Node.js microservices, and automated CI/CD pipelines.',
        'Exhibits exemplary code craftsmanship, system design rigor, and proven team mentorship capability.'
      ],
      coreStrengths: [
        'Expert-level TypeScript, Next.js, and Node.js microservice architecture with low latency benchmarks',
        'Production mastery of PostgreSQL indexing, Redis caching, and Docker containerization',
        'Led cross-functional migration to AWS serverless reducing operational latencies by 42%'
      ],
      potentialRisks: [
        'Limited exposure to Go or Rust for ultra-low latency compute kernels',
        'High compensation baseline expected in line with top 5th percentile benchmarks'
      ],
      interviewQuestions: [
        {
          question: 'How would you design an event-driven distributed system in Node.js to guarantee exactly-once processing with high availability during sudden traffic surges?',
          signalHint: 'Evaluates idempotent consumer patterns, dead-letter queues, and distributed locking with Redis/Kafka.'
        },
        {
          question: 'In a React SPA experiencing significant frame drops under large data tables, how do you profile and eliminate re-renders without breaking state encapsulation?',
          signalHint: 'Evaluates virtualization techniques, memoization boundaries, and selective component tree subscriptions.'
        }
      ]
    })
  },
  {
    name: 'Pooja Sharma',
    email: 'pooja.sharma@aimatrix.org',
    phone: '+91 98765 22334',
    targetRole: 'Lead AI / Machine Learning Engineer',
    score: 93,
    skillsScore: 96,
    experienceScore: 92,
    toolsScore: 94,
    educationScore: 90,
    fitVerdict: 'Optimal Fit',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['Python', 'PyTorch', 'Transformer Models', 'LangChain', 'Vector DB', 'FastAPI', 'RAG', 'LoRA']),
    missingSkills: JSON.stringify(['C++', 'Triton Inference Server']),
    recommendations: JSON.stringify(['Schedule technical deep-dive on agentic orchestration.', 'Top candidate for GenAI platform lead role.']),
    summary: 'Strong GenAI and LLM fine-tuning specialist with 5+ years shipping production AI workflows using Transformer Models, PyTorch, and LangChain. Demonstrates robust understanding of semantic search, vector databases (Pinecone/Milvus), and low-latency inference caching. Proven capability translating ambiguous enterprise requirements into scalable agentic pipelines.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Strong GenAI and LLM fine-tuning specialist with 5+ years shipping production AI workflows using Transformer Models, PyTorch, and LangChain.',
        'Demonstrates robust understanding of semantic search, vector databases (Pinecone/Milvus), and low-latency inference caching.',
        'Proven capability translating ambiguous enterprise requirements into scalable agentic pipelines.'
      ],
      coreStrengths: [
        'Deep expertise fine-tuning LLMs with LoRA/QLoRA and prompt engineering frameworks',
        'Hands-on vector search optimization with hybrid BM25 + dense embedding ranking',
        'Built autonomous RAG agent processing 100k+ customer queries daily with 98.4% accuracy'
      ],
      potentialRisks: [
        'Primarily focused on Python ecosystem; limited frontend UI implementation skills',
        'Recent projects were greenfield; less experience refactoring monolithic legacy codebases'
      ],
      interviewQuestions: [
        {
          question: 'Walk through how you mitigate hallucinations in multi-step RAG systems when ingesting heterogeneous PDF/DOCX documents.',
          signalHint: 'Chunking strategies, semantic similarity thresholds, cross-encoder re-ranking, and citation verification.'
        },
        {
          question: 'How do you optimize LLM inference throughput and memory footprints on multi-GPU clusters when serving concurrent requests?',
          signalHint: 'vLLM, PagedAttention, KV-cache quantization, and speculative decoding.'
        }
      ]
    })
  },
  {
    name: 'Rohan Deshmukh',
    email: 'rohan.d@cloudscale.net',
    phone: '+91 98765 33445',
    targetRole: 'Cloud DevOps & Site Reliability Engineer',
    score: 89,
    skillsScore: 91,
    experienceScore: 88,
    toolsScore: 92,
    educationScore: 85,
    fitVerdict: 'Strong Fit',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['Kubernetes', 'Terraform', 'AWS EKS', 'Docker', 'CI/CD', 'Prometheus', 'ArgoCD', 'Linux']),
    missingSkills: JSON.stringify(['GCP', 'Ansible']),
    recommendations: JSON.stringify(['Schedule SRE architecture round.', 'Excellent culture match for infrastructure resilience team.']),
    summary: 'Seasoned Infrastructure & SRE engineer with deep expertise in Kubernetes orchestration, Terraform IaC, and zero-downtime blue-green deployments. High architectural rigor with robust monitoring (Prometheus/Grafana) and automated failover pipelines. Proven ability to maintain 99.99% system availability during critical production events.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Seasoned Infrastructure & SRE engineer with deep expertise in Kubernetes orchestration, Terraform IaC, and zero-downtime blue-green deployments.',
        'High architectural rigor with robust monitoring (Prometheus/Grafana) and automated failover pipelines.',
        'Proven ability to maintain 99.99% system availability during critical production events.'
      ],
      coreStrengths: [
        'Multi-cloud infrastructure management (AWS EKS, GCP GKE) using declarative Terraform',
        'Robust CI/CD pipeline automation with GitHub Actions and ArgoCD GitOps',
        'Hands-on incident response experience reducing MTTR from 45 minutes to 7 minutes'
      ],
      potentialRisks: [
        'Moderate application-layer debugging experience in non-Python/Bash languages',
        'Has primarily operated in enterprise environments with predefined security frameworks'
      ],
      interviewQuestions: [
        {
          question: 'Explain how you would architect a zero-downtime rolling update across a Kubernetes cluster during a major database schema migration.',
          signalHint: 'Expand-and-contract pattern, blue-green ingress routing, and health check probe tuning.'
        },
        {
          question: 'How do you prevent cascading failures in microservice architectures during upstream dependency degradation?',
          signalHint: 'Circuit breakers, exponential backoff with jitter, rate limiting, and graceful degradation.'
        }
      ]
    })
  },
  {
    name: 'Sneha Iyer',
    email: 'sneha.iyer@creatives.design',
    phone: '+91 98765 44556',
    targetRole: 'Staff Product Designer (UI/UX)',
    score: 86,
    skillsScore: 90,
    experienceScore: 85,
    toolsScore: 88,
    educationScore: 82,
    fitVerdict: 'Strong Fit',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['Figma', 'Design Systems', 'User Research', 'Prototyping', 'WCAG Accessibility', 'Wireframing']),
    missingSkills: JSON.stringify(['Direct HTML/CSS Coding', 'Framer']),
    recommendations: JSON.stringify(['Portfolio walkthrough recommended.', 'Strong fit for candidate and recruiter experience overhaul.']),
    summary: 'Design system champion with 6+ years creating cohesive, accessible, and high-conversion B2B SaaS interfaces. Masterful in Figma component libraries, responsive design tokens, and user journey telemetry. Seamlessly bridges design and frontend engineering with clean design specifications.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Design system champion with 6+ years creating cohesive, accessible, and high-conversion B2B SaaS interfaces.',
        'Masterful in Figma component libraries, responsive design tokens, and user journey telemetry.',
        'Seamlessly bridges design and frontend engineering with clean design specifications.'
      ],
      coreStrengths: [
        'Established multi-brand Design System adopted across 14 internal product suites',
        'Strong user research methodology combining qualitative usability testing with Mixpanel analytics',
        'Deep compliance knowledge of WCAG 2.1 AA accessibility standards'
      ],
      potentialRisks: [
        'Prefers Figma-to-code collaboration over writing HTML/Tailwind CSS directly',
        'Requires clear product roadmaps to maximize velocity'
      ],
      interviewQuestions: [
        {
          question: 'How do you evaluate and resolve conflicting usability feedback between internal executive stakeholders and real end-user analytics?',
          signalHint: 'Data-driven decision frameworks, A/B testing validation, and user empathy vs executive intuition balance.'
        },
        {
          question: 'Describe your process for structuring an enterprise design system token hierarchy to support instant dark mode and white-label theming.',
          signalHint: 'Global, semantic, and component-level tokens, contrast ratios, and developer handoff tooling.'
        }
      ]
    })
  },
  {
    name: 'Vikram Sengupta',
    email: 'vikram.s@datanet.in',
    phone: '+91 98765 55667',
    targetRole: 'Senior Backend Systems Engineer',
    score: 78,
    skillsScore: 82,
    experienceScore: 78,
    toolsScore: 76,
    educationScore: 80,
    fitVerdict: 'Moderate Fit',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['Go', 'Python', 'PostgreSQL', 'gRPC', 'REST APIs', 'SQL Optimization']),
    missingSkills: JSON.stringify(['Kafka', 'RabbitMQ', 'Distributed Caching']),
    recommendations: JSON.stringify(['Assess message broker fundamentals in technical round.', 'Good candidate for backend API services.']),
    summary: 'Solid backend developer with good fundamentals in Go, Python, and relational database schema design. Capable of building scalable REST and gRPC endpoints with automated unit test coverage. Would benefit from deeper exposure to distributed caching and message queue patterns.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Solid backend developer with good fundamentals in Go, Python, and relational database schema design.',
        'Capable of building scalable REST and gRPC endpoints with automated unit test coverage.',
        'Would benefit from deeper exposure to distributed caching and message queue patterns.'
      ],
      coreStrengths: [
        'Clean idiomatic Go and Python code with high test coverage (>85%)',
        'Strong relational modeling and query optimization with PostgreSQL',
        'Experience building gRPC microservices with Protobuf contracts'
      ],
      potentialRisks: [
        'Limited experience with high-scale asynchronous messaging (Kafka/RabbitMQ)',
        'Has not previously led system architecture decisions independently'
      ],
      interviewQuestions: [
        {
          question: 'How do you detect and resolve slow queries and index bloat in PostgreSQL under heavy write loads?',
          signalHint: 'EXPLAIN ANALYZE, vacuuming strategies, partial indexes, and connection pooling.'
        },
        {
          question: 'When would you choose gRPC over REST/GraphQL for service-to-service communication?',
          signalHint: 'Binary serialization, multiplexing with HTTP/2, streaming capabilities, and latency comparisons.'
        }
      ]
    })
  },
  {
    name: 'Kavita Nair',
    email: 'kavita.nair@frontendhub.dev',
    phone: '+91 98765 66778',
    targetRole: 'Junior Frontend Developer',
    score: 64,
    skillsScore: 68,
    experienceScore: 60,
    toolsScore: 65,
    educationScore: 75,
    fitVerdict: 'Potential Fit',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['JavaScript', 'React', 'HTML5', 'CSS3', 'Tailwind CSS']),
    missingSkills: JSON.stringify(['TypeScript', 'Next.js', 'Redux', 'Unit Testing (Jest/Cypress)']),
    recommendations: JSON.stringify(['Pair with senior engineer for onboarding.', 'High potential for growth with active mentorship.']),
    summary: 'Promising junior engineer with 1.5 years experience in React and JavaScript. Quick learner with good eye for UI layouts and CSS animations. Needs guidance on complex state management (Redux Toolkit/Zustand) and asynchronous error handling.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Promising junior engineer with 1.5 years experience in React and JavaScript.',
        'Quick learner with good eye for UI layouts and CSS animations.',
        'Needs guidance on complex state management (Redux Toolkit/Zustand) and asynchronous error handling.'
      ],
      coreStrengths: [
        'Enthusiastic and agile learner with solid modern JavaScript (ES6+) foundation',
        'Good implementation of responsive Tailwind CSS and semantic HTML',
        'Active participant in code reviews and agile sprints'
      ],
      potentialRisks: [
        'Lacks experience with large-scale production architecture and performance optimization',
        'Requires senior mentorship for complex business logic'
      ],
      interviewQuestions: [
        {
          question: 'Explain the difference between useEffect, useMemo, and useCallback with practical examples.',
          signalHint: 'React rendering lifecycle, closure traps, and memoization necessity.'
        },
        {
          question: 'How do you handle loading, error, and empty states gracefully across a multi-component dashboard?',
          signalHint: 'Error boundaries, state lifting, and UI state machines.'
        }
      ]
    })
  },
  {
    name: 'Aman Khan',
    email: 'aman.khan@gradmail.com',
    phone: '+91 98765 77889',
    targetRole: 'Associate Software Developer',
    score: 48,
    skillsScore: 50,
    experienceScore: 45,
    toolsScore: 48,
    educationScore: 65,
    fitVerdict: 'Needs Development',
    stage: 'ai_screened',
    matchedSkills: JSON.stringify(['Python', 'C++', 'Basic SQL', 'Git']),
    missingSkills: JSON.stringify(['React', 'Node.js', 'Cloud Platforms', 'CI/CD', 'Microservices', 'System Design']),
    recommendations: JSON.stringify(['Suggest Skill Gap upskilling courses.', 'Consider for entry-level internship or trainee cohort.']),
    summary: 'Entry-level candidate with basic academic coding projects. Missing key enterprise requirements including production framework experience, cloud deployment, and automated testing. Recommended for internship or foundational upskilling before full engineering roles.',
    aiCheatSheet: JSON.stringify({
      summaryLines: [
        'Entry-level candidate with basic academic coding projects.',
        'Missing key enterprise requirements including production framework experience, cloud deployment, and automated testing.',
        'Recommended for internship or foundational upskilling before full engineering roles.'
      ],
      coreStrengths: [
        'Basic algorithmic problem solving in Python and C++',
        'High enthusiasm for technology and willingness to learn'
      ],
      potentialRisks: [
        'No prior experience with commercial software deployments or cloud environments',
        'Significant skill gap compared to role prerequisites'
      ],
      interviewQuestions: [
        {
          question: 'Explain how HTTP requests and responses work when a user enters a URL in a browser.',
          signalHint: 'DNS resolution, TCP handshake, HTTP methods, and status codes.'
        },
        {
          question: 'What is Git rebase versus Git merge, and when should each be used?',
          signalHint: 'Commit history linear preservation vs merge commits.'
        }
      ]
    })
  }
];

async function seed() {
  console.log('🌱 Seeding HR candidates and evaluation records with AI Cheat Sheets...');

  for (const c of candidatesData) {
    const evalId = crypto.randomUUID();
    const candId = crypto.randomUUID();

    // 1. Create Evaluation record
    await prisma.evaluation.create({
      data: {
        id: evalId,
        candidateName: c.name,
        candidateEmail: c.email,
        candidatePhone: c.phone,
        targetRole: c.targetRole,
        matchScore: c.score,
        skillsScore: c.skillsScore,
        experienceScore: c.experienceScore,
        toolsScore: c.toolsScore,
        educationScore: c.educationScore,
        fitVerdict: c.fitVerdict,
        summary: c.summary,
        matchedSkills: c.matchedSkills,
        missingSkills: c.missingSkills,
        recommendations: c.recommendations,
        pipelineStage: c.stage,
        status: 'screened',
        hmNotes: c.aiCheatSheet
      }
    });

    // 2. Create Candidate record
    await prisma.candidate.create({
      data: {
        id: candId,
        name: c.name,
        email: c.email,
        phone: c.phone,
        targetRole: c.targetRole,
        score: c.score,
        skillsScore: c.skillsScore,
        experienceScore: c.experienceScore,
        toolsScore: c.toolsScore,
        educationScore: c.educationScore,
        fitVerdict: c.fitVerdict,
        stage: c.stage,
        summary: c.summary,
        matchedSkills: c.matchedSkills,
        missingSkills: c.missingSkills,
        recommendations: c.recommendations,
        notes: c.aiCheatSheet,
        evaluationId: evalId
      }
    });

    console.log(`✅ Seeded: ${c.name} (${c.score}% Match, ${c.targetRole})`);
  }

  console.log('🎉 Seeding complete! All candidates ready in AI-Sorted Queue.');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
