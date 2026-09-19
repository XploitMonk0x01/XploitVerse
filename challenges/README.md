# XploitVerse CTF & Web Security Labs

Docker-based production lab environments for offensive security training and penetration testing.

## Labs & Vulnerable Environments

| Directory | Difficulty | Category | Target Image | Description | Standard Flag |
|---|---|---|---|---|---|
| `xss-labs` | Easy | Web | `xploitverse/xss-labs:latest` | 40-level client-side XSS suite with live DOM execution | `FLAG{xv_xss_labs_mastered}` |
| `vulnlab` | Medium | Web | `xploitverse/vulnlab:latest` | Yavuzlar multi-vuln suite (SQLi, RCE, LFI/RFI) on PHP/MariaDB | `FLAG{xv_vulnlab_root_compromised}` |
| `ssrf-lab` | Medium | Web | `xploitverse/ssrf-lab:latest` | IndiShell SSRF lab (file disclosure, DNS spoofing/rebinding, PDF SSRF) | `FLAG{xv_ssrf_vulnerable_lab_flag}` |
| `tiredful-api` | Medium | API | `xploitverse/tiredful-api:latest` | Intentionally broken REST API (Django REST Framework, IDOR, JWT flaws) | `FLAG{xv_tiredful_api_token_cracked}` |
| `vulnerable-app` | Hard | Web / Enterprise | `xploitverse/vulnerable-app:latest` | OWASP VulnerableApp Spring Boot full top-10 enterprise testbed | `FLAG{xv_owasp_vulnerableapp_pwned}` |
| `web-basic` | Easy | Web | `xploitverse/web-basic:latest` | Command injection & directory traversal in Flask | `FLAG{xv_web_basic_command_injection_2024}` |
| `sqli-lab` | Medium | Web | `xploitverse/sqli-lab:latest` | Advanced SQL injection training target | `FLAG{xv_sqli_database_compromised}` |
| `owasp-juice` | Medium | Web | `xploitverse/owasp-juice:latest` | OWASP Juice Shop simulated challenge environment | `FLAG{xv_owasp_ssrf_internal_access}` |
| `aws-autopsy` | Hard | Cloud Security | `xploitverse/aws-autopsy:latest` | Capital One SSRF → IAM credential theft → S3 exfil | `FLAG{xv_aws_autopsy_root_pwned}` |
| `privesc-basic` | Medium | Privilege Escalation | `xploitverse/privesc-basic:latest` | SUID binaries, sudo misconfig, writable cron | `FLAG{xv_privesc_basic_root_pwned}` |
| `recon-basic` | Easy | Reconnaissance | `xploitverse/recon-basic:latest` | Port scanning & hidden service discovery | `FLAG{xv_recon_basic_discovery}` |

## Building Images

```bash
docker build -t xploitverse/xss-labs:latest ./challenges/xss-labs/
docker build -t xploitverse/vulnlab:latest ./challenges/vulnlab/
docker build -t xploitverse/ssrf-lab:latest ./challenges/ssrf-lab/
docker build -t xploitverse/tiredful-api:latest ./challenges/tiredful-api/
docker build -t xploitverse/vulnerable-app:latest ./challenges/vulnerable-app/
docker build -t xploitverse/aws-autopsy:latest ./challenges/aws-autopsy/
docker build -t xploitverse/web-basic:latest ./challenges/web-basic/
```

## Running Locally

```bash
# Start a challenge container with dynamic host port mapping (-P)
docker run -d -P --name test-lab xploitverse/xss-labs:latest

# Check the mapped port for browser access
docker port test-lab

# Connect to container shell
docker exec -it test-lab /bin/sh
```

## Flag Standard

Every challenge contains a canonical flag in `flag.txt` in the root of the challenge folder and inside `/flag.txt` in the container.
Format: `FLAG{xv_<lab_name>}`
SHA-256 hash of this string is stored in the PostgreSQL database table `tasks.flag_hash`.
