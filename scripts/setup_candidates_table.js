require('dotenv').config();
const db = require('../src/config/pgDatabase');

async function setupCandidates() {
  console.log('🔄 Creating candidates table in Supabase PostgreSQL...');

  const ddl = `
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      target_role VARCHAR(255),
      score INT DEFAULT 0,
      stage VARCHAR(50) DEFAULT 'applied' CHECK (stage IN ('applied', 'ai_screened', 'hm_review', 'interview', 'offered', 'rejected')),
      fit_verdict VARCHAR(100) DEFAULT 'Potential Fit',
      matched_skills JSONB DEFAULT '[]'::jsonb,
      missing_skills JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    GRANT ALL ON candidates TO anon, authenticated, service_role, postgres;
    GRANT USAGE, SELECT ON SEQUENCE candidates_id_seq TO anon, authenticated, service_role, postgres;

    NOTIFY pgrst, 'reload schema';
  `;

  await db.query(ddl);
  console.log('✅ candidates table created successfully in Supabase.');

  // Check if candidates has rows, if not insert sample live candidates
  const count = await db.query('SELECT COUNT(*) FROM candidates;');
  if (parseInt(count.rows[0].count, 10) === 0) {
    const insertCandidates = `
      INSERT INTO candidates (name, email, phone, target_role, score, stage, fit_verdict, matched_skills, missing_skills)
      VALUES 
      ('Vikram Malhotra', 'vikram.m@gmail.com', '+91-9876543210', 'Senior Full Stack Engineer', 92, 'offered', 'Strong Fit', '["React", "Node.js", "TypeScript", "PostgreSQL", "Docker", "AWS"]'::jsonb, '["Kubernetes"]'::jsonb),
      ('Neha Sengupta', 'neha.s@outlook.com', '+91-9876543211', 'Lead AI Engineer', 88, 'interview', 'Strong Fit', '["Python", "PyTorch", "LangChain", "FastAPI", "Vector DB"]'::jsonb, '["C++"]'::jsonb),
      ('Arjun Kapoor', 'arjun.k@techmail.io', '+91-9876543212', 'DevOps & Cloud Specialist', 79, 'hm_review', 'Moderate Fit', '["Terraform", "CI/CD", "Linux", "Docker"]'::jsonb, '["GCP", "Ansible"]'::jsonb),
      ('Sneha Rao', 'sneha.rao@gmail.com', '+91-9876543213', 'Product Designer (UI/UX)', 85, 'interview', 'Strong Fit', '["Figma", "Design Systems", "Prototyping", "User Research"]'::jsonb, '["Motion Design"]'::jsonb),
      ('Karan Mehta', 'karan.mehta@yahoo.com', '+91-9876543214', 'Junior Frontend Developer', 64, 'ai_screened', 'Potential Fit', '["JavaScript", "HTML5", "CSS3", "React"]'::jsonb, '["TypeScript", "Redux", "Testing"]'::jsonb),
      ('Pooja Verma', 'pooja.verma@gmail.com', '+91-9876543215', 'Backend Engineer', 55, 'rejected', 'Not a Fit', '["Java", "Spring Boot"]'::jsonb, '["Node.js", "PostgreSQL", "Microservices"]'::jsonb);
    `;
    await db.query(insertCandidates);
    console.log('✅ Seeded 6 candidate records in Supabase PostgreSQL.');
  }

  process.exit(0);
}

setupCandidates().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
