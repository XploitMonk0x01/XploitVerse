# TryHackMe-Style Platform (Go + React): Full System Design with Lab Content Pipeline

## 1. Goals, constraints, and stack

- Build a **TryHackMe-like training platform** for a **small number of users** (friends, classmates, lab evaluations).
- Use **React** on the frontend and **Go** on the backend.
- Keep infrastructure **simple and cheap** (single server or lab machine, but deployment details are intentionally out of scope here).
- Provide an **end-to-end functional system**: from an empty platform to fully working labs.
- Avoid unnecessary complexity in data storage: **one primary relational database (PostgreSQL)** is sufficient.

### Do you need a hybrid / polyglot DB?

No. For this project, a **single relational database (PostgreSQL)** is the right choice.

- Your data is mostly structured and relational: users, rooms, tasks, lab sessions, progress. This is exactly what relational databases are designed for.[web:72][web:78]
- Polyglot persistence (mixing SQL, NoSQL, search engines) is recommended only when you have very different workloads or very large scale; it introduces extra complexity, operational overhead, and consistency challenges.[web:71][web:73][web:79][web:83]
- Common best practice for web apps is to **start with one relational DB**, and only add specialized stores (search, analytics, blob storage) when real scalability or feature needs appear.[web:73][web:76]

So the design below assumes:

- **PostgreSQL** is your only durable database.
- **Redis** is an optional cache / job queue, not a second source of truth.

---

## 2. High-level architecture (conceptual)

Separate the logic into two conceptual planes, even if they run inside one Go binary in your first version:

- **Product Plane (App Plane)** – React SPA, Go REST API, PostgreSQL, optional Redis.
- **Lab Plane (Lab Orchestrator)** – Go logic that manages Docker-based lab environments.

```text
Users (browser)
  ↓
React SPA (UI)
  ↓
Go REST API
   ├─ PostgreSQL (main DB)
   ├─ Redis (optional cache / jobs)
   └─ Lab Orchestrator (Go + Docker SDK)
          ↓
        Docker Engine
          ├─ Target containers (vulnerable labs)
          └─ Optional attack containers (tooling)
```

The **Lab Orchestrator** is responsible for creating and destroying isolated Docker networks and containers for each lab session, while the **Product Plane** manages users, rooms, tasks, progress, and API endpoints.

---

## 3. Core domain model

### Main entities

- **User** – login identity and role (student, admin).
- **Room** – themed group of tasks (like a TryHackMe room).
- **Task** – individual question/challenge, optionally linked to a lab environment.
- **Asset** – definition of a vulnerable environment (Docker image + metadata, and source info such as Vulhub or SecGen).
- **LabSession** – a running instance of an Asset for a given user/task.
- **Progress** – completion state per user per task/room.

### Suggested schema (simplified)

- `users(id, email, password_hash, role, created_at)`
- `rooms(id, slug, title, description, difficulty, is_public, created_by, created_at)`
- `tasks(id, room_id, title, body_markdown, order_no, points, flag_type, flag_hash)`
- `assets(id, name, source_type, source_ref, docker_image, exposed_ports_json, env_json, type)`
  - `source_type` ∈ {`custom`, `vulnhub`, `vulhub`, `secgen`, `owasp-vulconhub`, `other`}.
  - `source_ref` is a URL or note (e.g., VulnHub URL, Git repo, SourceForge page).[web:99][web:105]
  - `docker_image` is the image name/tag if the environment is containerized.
  - `type` ∈ {`target`, `attack`}.
- `lab_sessions(id, user_id, room_id, task_id, status, started_at, expires_at,
                network_name, target_container_id, attack_container_id, connection_info_json)`
- `progress(id, user_id, room_id, task_id, state, started_at, completed_at, attempts)`

This schema keeps **Postgres** as the single source of truth while being flexible enough to record whether an Asset was built from Vulhub, OWASP Vulnerable Container Hub, SecGen, or other sources.[web:98][web:99][web:105][web:107]

---

## 4. Go + React responsibilities

### React SPA

- Render pages for login, room list, room detail, and task view.
- Call Go API endpoints for:
  - `POST /auth/login`, `POST /auth/register`.
  - `GET /rooms`, `GET /rooms/{id}`, `GET /rooms/{id}/tasks`.
  - `POST /tasks/{task_id}/lab-sessions` (start lab).
  - `GET /lab-sessions/{id}` (check lab status/connection info).
  - `POST /tasks/{task_id}/submit-flag`.

### Go backend (Product Plane)

- Implement REST API (using chi/gin/echo) and JWT/session handling.
- Store and query data in PostgreSQL.
- Implement business logic:
  - Validate permissions.
  - Enforce per-user lab limits.
  - Coordinate with Lab Orchestrator to start/stop labs.
  - Validate flags and update progress.

### Go Lab Orchestrator

- Can be a separate internal package or service.
- Talks to **Docker Engine** using the Go Docker SDK or HTTP API.
- For each lab session:
  - Create an isolated Docker **network**.
  - Start **target container** from `assets.docker_image` attached to that network.
  - Optionally start an **attack container** on the same network.
  - Return container IDs, network name, target IP/ports.
  - Stop/remove containers and network at TTL or on user request.

This separation allows you to reason about the system clearly: Product Plane is pure web app + DB; Lab Plane is pure environment orchestration.

---

## 5. Data Flow Diagrams (DFDs)

### 5.1 Context-level DFD (Level 0)

```text
           +----------------+
           |    Student     |
           +----------------+
                    |
                    | 1. Use web UI (login, rooms, start labs, submit flags)
                    v
             +------------------+
             |   React SPA      |
             +------------------+
                    |
                    | 2. REST/JSON API calls
                    v
             +------------------+
             |    Go Backend    |
             +------------------+
          /        |           \
         /         |            \
        v          v             v
+-------------+  +----------------+  +-----------------+
| PostgreSQL  |  | Lab Orchestr.  |  |  Redis (opt)    |
|  (single DB)|  |  (Go + Docker) |  |  cache/job data |
+-------------+  +----------------+  +-----------------+
                         |
                         | 3. Create nets/containers
                         v
                +--------------------+
                |   Docker Engine    |
                | (lab containers)   |
                +--------------------+
```

### 5.2 Level-1 DFD – Start Lab Session

```text
[Student]
   |
   | 1. Click "Start Lab" in browser
   v
[Process P1: React SPA]
   |
   | 2. POST /api/tasks/{task_id}/lab-sessions
   v
[Process P2: Go Backend]
   | 2a. Validate auth & per-user lab limit
   | 2b. Read Task & Asset from PostgreSQL
   v
[Data Store D1: PostgreSQL]
   | 3. Insert LabSession (status=PENDING)
   v
[Process P2: Go Backend]
   |
   | 4. Call Lab Orchestrator with lab_session_id + asset metadata
   v
[Process P3: Lab Orchestrator]
   | 5a. Create Docker network for this session
   | 5b. Start target container (and optional attack container)
   v
[External Store D2: Docker Engine]
   | 6. Return container IDs, IPs, ports
   v
[Process P3: Lab Orchestrator]
   |
   | 7. Return lab connection details to Backend
   v
[Process P2: Go Backend]
   | 8. Update LabSession (status=RUNNING, connection_info)
   v
[Data Store D1: PostgreSQL]
   |
   | 9. Respond to React with LabSession summary
   v
[Process P1: React SPA]
   |
   | 10. Display connection info to student
   v
[Student]
```

---

## 6. From empty platform to fully functional labs

When you first build the platform, there are **no labs**. This section shows how to fill it with labs that behave like TryHackMe: real vulnerable environments, attached to tasks, with flags.

### Lab sources you can use

1. **Custom Docker-based labs you write yourself** (best control, easiest to integrate).
2. **Dockerized vulnerable labs from existing projects**, for example:
   - **OWASP Vulnerable Container Hub (VULCONHUB)** – Dockerfiles and build files for many vulnerable container images, plus documentation.[web:98]
   - Docker images like **OWASP VulnerableApp** and other vulnerable apps published on Docker Hub.[web:106][web:111]
   - Other public vulnerable containers under the OWASP Docker Hub org.[web:111]
3. **VM-based labs (advanced)** from:
   - **VulnHub** – large collection of vulnerable-by-design VMs.[web:99]
   - Archives (SourceForge, etc.) that host older vulnerable VMs or software.
   - **SecGen** – framework for generating random vulnerable VMs via Vagrant.[web:89][web:105][web:107]

For your **Docker-based student platform**, focus on (1) and (2). Option (3) is great for ideas and offline practice, but integrating full VMs into your web platform requires a hypervisor, which is a bigger project.

---

## 7. Path 1: Custom Docker-based labs (recommended)

Guides for building CTF labs with Docker show how to create a single vulnerable machine from a Dockerfile and compose file; you adapt that into your platform.[web:92][web:95]

### 7.1 Design a scenario

Pick a simple scenario, for example:

- Vulnerable PHP login form with SQL injection.
- File upload → RCE.
- Misconfigured SSH server (weak password).

### 7.2 Build the vulnerable container

1. Create a `Dockerfile` using a base image (e.g., `php:apache`, `ubuntu`, `alpine`).
2. Copy your vulnerable app into the image and expose the appropriate port.
3. Example concept (not full code):

```dockerfile
FROM php:8.1-apache
COPY ./vulnapp/ /var/www/html/
RUN chown -R www-data:www-data /var/www/html
EXPOSE 80
```

4. Build image locally: `docker build -t mylab/sqli-basic:latest .`.
5. Run and test: `docker run -p 8080:80 mylab/sqli-basic:latest`.
6. Exploit it yourself and choose a flag (e.g., `THM{basic_sqli_1337}`) stored in a file or DB inside the app.

### 7.3 Register as an Asset

Create an `assets` record for this lab:

- `name = 'Basic SQLi Web Lab'`.
- `source_type = 'custom'`.
- `source_ref = 'internal Git repo or notes'`.
- `docker_image = 'mylab/sqli-basic:latest'`.
- `exposed_ports_json = ["80/tcp"]`.
- `type = 'target'`.

### 7.4 Create Room and Task

- `Room`:
  - `title = 'Intro to SQL Injection'`.
  - `description = 'Practice basic SQL injection against a vulnerable login page.'`.
- `Task`:
  - `title = 'Dump the users table and find the flag'`.
  - `body_markdown` = explanation, goals, hints.
  - `flag_type = 'string'` or `'regex'`.
  - `flag_hash` = hash of your chosen flag.
  - `asset_id` = ID of the `Basic SQLi Web Lab` asset.

### 7.5 Orchestration behavior

When a user clicks **Start Lab** for this task:

- Lab Orchestrator creates a Docker network for the session.
- Starts a container from `mylab/sqli-basic:latest` on that network.
- Returns IP and port (e.g., `10.5.0.2:80` or a mapped host port).
- Backend stores that info and React shows connection details.

Now you have a fully functional, self-contained lab tied to a TryHackMe-style room.

---

## 8. Path 2: Using existing Dockerized vulnerable labs

Instead of writing all labs yourself, you can integrate existing vulnerable containers.

### 8.1 OWASP Vulnerable Container Hub (VULCONHUB)

- **OWASP VULCONHUB** provides Dockerfiles and build files for many vulnerable container images, plus documentation about how to run them.[web:98][web:108]

Workflow:

1. Pick a container from VULCONHUB (e.g., a web app vulnerable to multiple OWASP Top 10 flaws).[web:98]
2. Follow its README to build and run it locally.
3. Exploit it manually and design the task around one or more vulnerabilities.
4. Add an `assets` record:
   - `source_type = 'owasp-vulconhub'`.
   - `source_ref = VULCONHUB URL`.
   - `docker_image = '<image-name>:tag'`.
   - `exposed_ports_json` according to README.
5. Create a `Room` and `Task` as before, linking the task to this asset.

### 8.2 Other OWASP / community images

- Projects like **OWASP VulnerableApp** ship as Docker images and cover many vulnerability types (SQLi, XSS, path traversal, file upload, etc.).[web:106]
- OWASP’s Docker Hub org hosts multiple vulnerable apps and training images you can reuse.[web:111]

Use the same pattern:

1. Identify the image (e.g., `sasanlabs/owasp-vulnerableapp`).[web:106]
2. Run locally using the documented `docker run` or `docker-compose up`.
3. Confirm exploitation path and choose a flag.
4. Register it as an `asset` and build tasks around it.

This approach lets you quickly seed your platform with high-quality, realistic labs without reinventing everything.

---

## 9. Path 3: VM-based labs (VulnHub, SecGen, SourceForge) – conceptual integration

VM-based labs are **conceptually important** but **not necessary for your first Docker-based MVP**.

### 9.1 VulnHub

**VulnHub** is a well-known repository of vulnerable-by-design VMs where you download an image (e.g., OVA) and run it in VirtualBox, VMware, or Proxmox.[web:99] Many guides show how to use these VMs to build a personal hacking lab.[web:88][web:109]

For your web platform:

- Use VulnHub VMs as **inspiration for your own Docker labs** (same vulnerabilities, but recreated in containers).
- Or treat them as **external exercises**: the room description links to a VulnHub URL and tells the student to run the VM locally; your platform only tracks progress/flags, not the VM lifecycle.

### 9.2 SecGen

**SecGen** is a framework to **generate random vulnerable VMs** using Vagrant, Puppet, and Ruby.[web:89][web:105][web:107]

- It can build complex, randomized penetration testing scenarios and CTF challenges.[web:89][web:102]
- Scenarios are described in XML and combined into VMs with specific vulnerabilities and services.[web:105]

For now, you can:

- Use SecGen-generated VMs for personal practice or small CTF events.
- Optionally reference them in your platform (room text describing how to use them) without full orchestration.

### 9.3 SourceForge and other archives

Old vulnerable VMs and software packages are sometimes hosted on **SourceForge** or similar archives, and are used in the same style as VulnHub images.[web:88]  

They fit into the same category as VulnHub and SecGen outputs:

- Great for **offline or manual labs**.
- Harder to automate inside your Docker-based student platform without adding a hypervisor.

If you later extend your architecture to support VMs (KVM/Proxmox), you could treat these images the same way you treat Docker images now: as Assets with extra metadata, and build a parallel **VM Orchestrator**.

---

## 10. Security and isolation basics for labs

Even in a student environment, you should apply basic Docker security guidance:

- Use **isolated bridge networks** per lab session so containers from different users cannot talk to each other.[web:92][web:95]
- Drop unnecessary Linux capabilities and avoid `--privileged` containers.[web:104]
- Be careful with port publishing: when you use `-p 8000:8000`, Docker exposes that port on all interfaces; when possible, bind to localhost if only local access is needed.[web:104]
- Keep host OS and Docker Engine up to date to reduce container escape risk.[web:104]
- Destroy containers and networks when labs expire rather than trying to "clean" compromised containers.

Following OWASP’s Docker Security Cheat Sheet helps ensure your lab infra is safe enough for student use.[web:104]

---

## 11. End-to-end flow summary (from zero labs to a THM-style room)

1. **Start with empty platform** – only Users, Rooms, Tasks, Assets tables exist; no assets yet.
2. **Pick a vulnerability scenario** – either design your own or choose an existing container from OWASP/VULCONHUB/Vulhub.
3. **Create or adapt a Dockerfile** – build a vulnerable app image; test locally using patterns from CTF-lab Docker tutorials.[web:92][web:95]
4. **Register as Asset** – record `docker_image`, ports, and `source_type`/`source_ref`.
5. **Create a Room + Task** – write content (description, hints, flag) and link the Task to this Asset.
6. **Ensure orchestrator works** – lab sessions start containers on isolated networks and return connection info to the UI.
7. **Student flow**:
   - Logs in, opens room, reads task.
   - Clicks **Start Lab**, waits for status `RUNNING`.
   - Attacks the container from their tools (Kali, etc.).
   - Submits flag; backend checks hash; progress updates.

Once you have that loop working for even **one lab**, your platform is fully functional in the same sense as a basic TryHackMe room. Everything else (more rooms, difficulty levels, hints, writeups, classroom features) is incremental.