-- Register Real Vulnerable Labs (xss-labs, vulnlab, ssrf-lab, tiredful-api, vulnerable-app)

DO $$
DECLARE
    r_id BIGINT;
    a_id BIGINT;
    m_id BIGINT;
BEGIN

    -- 1. XSS Labs
    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES (
        'xss-labs',
        'XSS Labs: Cross-Site Scripting Suite',
        'Comprehensive multi-level interactive Cross-Site Scripting training lab covering Reflected, Stored, and DOM-based XSS vectors with real browser execution.',
        'Easy',
        true
    )
    ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description, difficulty = EXCLUDED.difficulty
    RETURNING id INTO r_id;

    INSERT INTO assets (name, docker_image, exposed_ports_json, type, is_active)
    VALUES (
        'XSS Labs Target',
        'xploitverse/xss-labs:latest',
        '["80/tcp"]'::jsonb,
        'target',
        true
    )
    RETURNING id INTO a_id;

    INSERT INTO modules (room_id, title, order_no)
    VALUES (r_id, 'Client-Side Exploitation', 1)
    RETURNING id INTO m_id;

    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, points, flag_hash, order_no)
    VALUES (
        r_id,
        m_id,
        a_id,
        'Master XSS Injection Vectors',
        'flag',
        'string',
        'Exploit the live XSS lab target using your browser or terminal. Find and submit the secret flag.',
        'Navigate through the interactive XSS testbeds, bypass filters, and locate the master security flag.',
        100,
        '68067581fc65ec8cd5494b1c3b9f3e036c98264c36ba6f274ccdf378f51c43a5',
        1
    );

    -- 2. VulnLab
    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES (
        'vulnlab',
        'VulnLab: OWASP Multi-Vulnerability Suite',
        'Feature-complete vulnerable web environment by Yavuzlar featuring SQL Injection, Command Execution, LFI/RFI, and Authentication bypass on PHP/MariaDB.',
        'Medium',
        true
    )
    ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description, difficulty = EXCLUDED.difficulty
    RETURNING id INTO r_id;

    INSERT INTO assets (name, docker_image, exposed_ports_json, type, is_active)
    VALUES (
        'VulnLab Target',
        'xploitverse/vulnlab:latest',
        '["80/tcp"]'::jsonb,
        'target',
        true
    )
    RETURNING id INTO a_id;

    INSERT INTO modules (room_id, title, order_no)
    VALUES (r_id, 'OWASP Exploitation', 1)
    RETURNING id INTO m_id;

    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, points, flag_hash, order_no)
    VALUES (
        r_id,
        m_id,
        a_id,
        'Exploit Yavuzlar VulnLab',
        'flag',
        'string',
        'Interact with the live VulnLab web application. Exploit vulnerabilities to gain access and extract the root flag.',
        'Exploit the vulnerable web services, dump database credentials or gain remote execution to retrieve the root flag.',
        150,
        'd8c524d23203460cf257980e61c0f6e03a8e3bcbca3e757c50a7b21604725f23',
        1
    );

    -- 3. SSRF Lab
    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES (
        'ssrf-lab',
        'SSRF Vulnerable Lab: Server-Side Request Forgery',
        'Hands-on lab exploring SSRF vectors including local file disclosure, remote host connect, DNS spoofing, and HTML-to-PDF SSRF.',
        'Medium',
        true
    )
    ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description, difficulty = EXCLUDED.difficulty
    RETURNING id INTO r_id;

    INSERT INTO assets (name, docker_image, exposed_ports_json, type, is_active)
    VALUES (
        'SSRF Lab Target',
        'xploitverse/ssrf-lab:latest',
        '["80/tcp"]'::jsonb,
        'target',
        true
    )
    RETURNING id INTO a_id;

    INSERT INTO modules (room_id, title, order_no)
    VALUES (r_id, 'SSRF Vectors & Bypasses', 1)
    RETURNING id INTO m_id;

    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, points, flag_hash, order_no)
    VALUES (
        r_id,
        m_id,
        a_id,
        'SSRF Exploitation & Internal Pivot',
        'flag',
        'string',
        'Access the live SSRF lab web application. Perform SSRF attacks to read internal files or pivot inside the network.',
        'Bypass IP blacklists and use SSRF vectors to access restricted server-side files and capture the flag.',
        150,
        '87b221de98eab9be5670228a6c4dd5fb8cc7d9b111bf65b8c869372a794fce4d',
        1
    );

    -- 4. Tiredful API
    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES (
        'tiredful-api',
        'Tiredful API: Broken REST API Security',
        'Intentionally vulnerable REST API lab designed with Django REST Framework covering IDOR, Broken Object Level Authorization, and JWT flaws.',
        'Medium',
        true
    )
    ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description, difficulty = EXCLUDED.difficulty
    RETURNING id INTO r_id;

    INSERT INTO assets (name, docker_image, exposed_ports_json, type, is_active)
    VALUES (
        'Tiredful API Target',
        'xploitverse/tiredful-api:latest',
        '["8000/tcp"]'::jsonb,
        'target',
        true
    )
    RETURNING id INTO a_id;

    INSERT INTO modules (room_id, title, order_no)
    VALUES (r_id, 'API Security Testing', 1)
    RETURNING id INTO m_id;

    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, points, flag_hash, order_no)
    VALUES (
        r_id,
        m_id,
        a_id,
        'Crack REST API Authentication & IDOR',
        'flag',
        'string',
        'Test the Django REST API endpoints for authentication flaws and parameter tampering.',
        'Analyze API endpoints, abuse JWT tokens or authorization flaws, and uncover the secret flag.',
        150,
        '9f70b0af34bdbb07e2428f6ef79903a450961e78aa5530c76be503e2e00ce2af',
        1
    );

    -- 5. OWASP VulnerableApp
    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES (
        'vulnerable-app',
        'OWASP VulnerableApp: Enterprise Web & API Suite',
        'Production-grade enterprise vulnerable application showcasing full OWASP Top 10 vulnerabilities, Spring Boot backend, and rich UI.',
        'Hard',
        true
    )
    ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title, description = EXCLUDED.description, difficulty = EXCLUDED.difficulty
    RETURNING id INTO r_id;

    INSERT INTO assets (name, docker_image, exposed_ports_json, type, is_active)
    VALUES (
        'OWASP VulnerableApp Target',
        'xploitverse/vulnerable-app:latest',
        '["80/tcp", "9090/tcp"]'::jsonb,
        'target',
        true
    )
    RETURNING id INTO a_id;

    INSERT INTO modules (room_id, title, order_no)
    VALUES (r_id, 'Enterprise OWASP Challenges', 1)
    RETURNING id INTO m_id;

    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, points, flag_hash, order_no)
    VALUES (
        r_id,
        m_id,
        a_id,
        'Pwn OWASP VulnerableApp',
        'flag',
        'string',
        'Explore the rich enterprise application interface. Exploit complex vulnerabilities to capture the flag.',
        'Leverage complex injection chains in the modern enterprise app to compromise system files and capture the flag.',
        200,
        'b3b9609a86c4375fc80aab487429f62fe88d75a589c9412f6e0d97ef02fba259',
        1
    );

END $$;
