"""
AWS Autopsy — Seed Fake S3 Data

Creates realistic (but entirely fake) sensitive data files that simulate
what was stored in Capital One's S3 buckets. These files are the target
of the data exfiltration phase.

All data is completely fabricated for educational purposes.
"""

import os
import json
import random


S3_ROOT = "/opt/s3data"


def create_dir(path):
    os.makedirs(path, exist_ok=True)


def write_file(path, content):
    with open(path, "w") as f:
        f.write(content)


def seed_sensitive_bucket():
    """Create fake customer PII data in the capitalone-sensitive bucket."""
    bucket = os.path.join(S3_ROOT, "capitalone-sensitive")
    create_dir(bucket)

    # ── Customer Records ────────────────────────────────────────────────
    customers_dir = os.path.join(bucket, "customer-records")
    create_dir(customers_dir)

    fake_customers = []
    first_names = ["James", "Maria", "Robert", "Jennifer", "Michael",
                   "Sarah", "David", "Emily", "Daniel", "Rachel"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones",
                  "Garcia", "Miller", "Davis", "Wilson", "Taylor"]

    for i in range(20):
        customer = {
            "customer_id": f"CUST-{10000 + i}",
            "name": f"{random.choice(first_names)} {random.choice(last_names)}",
            "ssn": f"***-**-{random.randint(1000, 9999)}",
            "dob": f"19{random.randint(60, 99)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "email": f"customer{i}@example.com",
            "phone": f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}",
            "credit_score": random.randint(580, 850),
            "account_balance": round(random.uniform(100, 50000), 2)
        }
        fake_customers.append(customer)

    write_file(
        os.path.join(customers_dir, "us_customers_2019.json"),
        json.dumps(fake_customers[:10], indent=2)
    )
    write_file(
        os.path.join(customers_dir, "ca_customers_2019.json"),
        json.dumps(fake_customers[10:], indent=2)
    )

    # ── Credit Card Applications ────────────────────────────────────────
    apps_dir = os.path.join(bucket, "credit-applications")
    create_dir(apps_dir)

    applications = []
    for i in range(15):
        app = {
            "application_id": f"APP-{20000 + i}",
            "applicant": f"{random.choice(first_names)} {random.choice(last_names)}",
            "ssn_hash": f"sha256:{os.urandom(16).hex()}",
            "requested_limit": random.choice([5000, 10000, 15000, 25000, 50000]),
            "annual_income": random.randint(30000, 200000),
            "employment_status": random.choice(["employed", "self-employed", "retired"]),
            "status": random.choice(["approved", "denied", "pending"]),
            "applied_date": f"2019-{random.randint(1,3):02d}-{random.randint(1,28):02d}"
        }
        applications.append(app)

    write_file(
        os.path.join(apps_dir, "applications_q1_2019.json"),
        json.dumps(applications, indent=2)
    )

    # ── Bank Account Numbers ────────────────────────────────────────────
    accounts_dir = os.path.join(bucket, "bank-accounts")
    create_dir(accounts_dir)

    accounts = []
    for i in range(10):
        account = {
            "account_number": f"****{random.randint(1000, 9999)}",
            "routing_number": f"0{random.randint(10000000, 99999999)}",
            "account_type": random.choice(["checking", "savings", "credit"]),
            "holder": f"{random.choice(first_names)} {random.choice(last_names)}",
            "balance": round(random.uniform(500, 100000), 2)
        }
        accounts.append(account)

    write_file(
        os.path.join(accounts_dir, "linked_accounts.json"),
        json.dumps(accounts, indent=2)
    )

    # ── Exfiltration Flag ───────────────────────────────────────────────
    write_file(
        os.path.join(bucket, ".flag_exfil.txt"),
        "FLAG{xv_aws_autopsy_data_exfiltrated}\n"
    )

    # ── README inside the bucket ────────────────────────────────────────
    write_file(
        os.path.join(bucket, "README.txt"),
        (
            "=== CONFIDENTIAL — CapitalOne Internal ===\n"
            "\n"
            "This S3 bucket contains sensitive customer data.\n"
            "Access restricted to authorized services only.\n"
            "\n"
            "Contents:\n"
            "  customer-records/   — Customer PII (US & Canada)\n"
            "  credit-applications/ — Credit card application data\n"
            "  bank-accounts/      — Linked bank account details\n"
            "\n"
            "Data classification: HIGHLY CONFIDENTIAL\n"
            "Retention policy: 7 years\n"
            "Last audit: 2019-01-15\n"
            "\n"
            "If you found this data through unauthorized means,\n"
            "you have successfully simulated the Capital One breach.\n"
            "Congratulations — now learn how to prevent it!\n"
        )
    )


def seed_configs_bucket():
    """Create WAF configuration files in the capitalone-configs bucket."""
    bucket = os.path.join(S3_ROOT, "capitalone-configs")
    create_dir(bucket)

    # WAF rules
    waf_dir = os.path.join(bucket, "waf-rules")
    create_dir(waf_dir)

    write_file(
        os.path.join(waf_dir, "modsec_rules.conf"),
        (
            "# ModSecurity WAF Rules - CapitalOne\n"
            "# WARNING: SSRF protection rules are DISABLED\n"
            "\n"
            "SecRule REQUEST_URI \"@contains /admin\" \"id:1001,deny,status:403\"\n"
            "SecRule REQUEST_HEADERS:Content-Type \"text/xml\" \"id:1002,deny,status:403\"\n"
            "\n"
            "# TODO: Add SSRF protection (SEC-4820)\n"
            "# SecRule ARGS:url \"@rx ^https?://(169\\.254|10\\.|172\\.(1[6-9]|2|3[01])|192\\.168)\" \\\n"
            "#   \"id:1003,deny,status:403,msg:'SSRF attempt blocked'\"\n"
        )
    )

    write_file(
        os.path.join(waf_dir, "ip_allowlist.txt"),
        (
            "# Allowed internal IPs\n"
            "10.0.0.0/8\n"
            "172.16.0.0/12\n"
            "192.168.0.0/16\n"
            "# WARNING: 169.254.169.254 is NOT blocked!\n"
        )
    )

    # Deployment config
    write_file(
        os.path.join(bucket, "deploy_config.json"),
        json.dumps({
            "environment": "production",
            "region": "us-east-1",
            "instance_type": "t2.medium",
            "imds_version": "v1",
            "notes": "CRITICAL: Migrate to IMDSv2 — see SEC-4821",
            "iam_role": "CapitalOne-WAF-Role",
            "s3_access": [
                "s3://capitalone-sensitive/*",
                "s3://capitalone-configs/*"
            ]
        }, indent=2)
    )


def seed_credential_flag():
    """Place the credentials-stolen flag."""
    flag_dir = os.path.join(S3_ROOT)
    create_dir(flag_dir)
    write_file(
        os.path.join(flag_dir, ".flag_creds.txt"),
        "FLAG{xv_aws_autopsy_creds_stolen}\n"
    )


if __name__ == "__main__":
    print("[*] Seeding fake S3 data...")
    seed_sensitive_bucket()
    seed_configs_bucket()
    seed_credential_flag()
    print("[+] S3 data seeded successfully!")
    print(f"    Bucket: capitalone-sensitive ({S3_ROOT}/capitalone-sensitive/)")
    print(f"    Bucket: capitalone-configs ({S3_ROOT}/capitalone-configs/)")
