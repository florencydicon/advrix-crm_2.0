-- 1. Create Roles ENUM
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN', 
    'PROJECT_MANAGER', 
    'SALES_REP', 
    'CONTENT_WRITER', 
    'GRAPHIC_DESIGNER', 
    'VIDEO_EDITOR', 
    'SOCIAL_MEDIA_MANAGER'
);

-- 2. Create Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role DEFAULT 'CONTENT_WRITER',
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    whatsapp_number TEXT,
    email TEXT,
    remarks TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Projects (Campaigns) Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    work_type TEXT NOT NULL,
    is_retainer BOOLEAN DEFAULT FALSE,
    total_payment INTEGER DEFAULT 0,
    advance_payment INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Awaiting Team Assignment',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create Tasks (Deliverables) Table for Auto-Generation
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, -- e.g., "Static Post 01"
    task_type TEXT NOT NULL, -- e.g., "Static Post", "Reel", "Video Edit"
    status TEXT NOT NULL DEFAULT 'Not Started',
    
    -- Content & WhatsApp Details (Text based tracking)
    content_text TEXT, 
    whatsapp_shared_version TEXT,
    client_feedback TEXT,
    post_url TEXT,
    
    -- Assigned Team
    assigned_writer UUID REFERENCES users(id),
    assigned_designer UUID REFERENCES users(id),
    assigned_editor UUID REFERENCES users(id),
    assigned_smm UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Indexes for Fast Searching
CREATE INDEX idx_clients_created_by ON clients(created_by);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);