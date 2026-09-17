#!/usr/bin/env python3
"""
Build all XploitVerse lab challenge Docker images.
Run from the XploitVerse root directory.
"""

import subprocess
import sys
import os

LABS = [
    ("challenges/sqli-lab",     "xploitverse/sqli-lab:latest"),
    ("challenges/web-basic",    "xploitverse/web-basic:latest"),
    ("challenges/reverse-shell","xploitverse/reverse-shell:latest"),
    ("challenges/owasp-juice",  "xploitverse/owasp-juice:latest"),
    ("challenges/privesc-linux","xploitverse/privesc-linux:latest"),
    ("challenges/network-recon","xploitverse/network-recon:latest"),
    ("challenges/boot2root",    "xploitverse/boot2root:latest"),
    ("challenges/privesc-basic","xploitverse/privesc-basic:latest"),
    ("challenges/recon-basic",  "xploitverse/recon-basic:latest"),
    ("challenges/linux-basics", "xploitverse/linux-basics:latest"),
    ("challenges/crypto-basics","xploitverse/crypto-basics:latest"),
    ("challenges/aws-autopsy",  "xploitverse/aws-autopsy:latest"),
]

root = os.path.dirname(os.path.abspath(__file__))

results = []
for context, tag in LABS:
    ctx_path = os.path.join(root, context)
    if not os.path.exists(ctx_path):
        print(f"\n  [SKIP] {tag} — directory not found: {ctx_path}")
        results.append((tag, "SKIPPED"))
        continue

    print(f"\n{'='*60}")
    print(f"  Building: {tag}")
    print(f"  Context : {context}")
    print(f"{'='*60}")

    ret = subprocess.run(
        ["docker", "build", "-t", tag, ctx_path],
        check=False
    )
    if ret.returncode == 0:
        print(f"  [OK] {tag} built successfully!")
        results.append((tag, "OK"))
    else:
        print(f"  [FAIL] {tag} build failed with exit code {ret.returncode}")
        results.append((tag, "FAILED"))

print(f"\n{'='*60}")
print(f"  BUILD SUMMARY")
print(f"{'='*60}")
for tag, status in results:
    icon = "[OK]" if status == "OK" else ("[SKIP]" if status == "SKIPPED" else "[FAIL]")
    print(f"  {icon}  {tag}")

failed = [t for t, s in results if s == "FAILED"]
if failed:
    print(f"\n  {len(failed)} image(s) failed to build!")
    sys.exit(1)
else:
    print(f"\n  All {len([t for t,s in results if s=='OK'])} images built successfully!")
