# XploitVerse CTF Challenges

Docker-based lab environments for cybersecurity training.

## Challenges

| Directory       | Difficulty | Category             | Description                                      |
| --------------- | ---------- | -------------------- | ------------------------------------------------ |
| `web-basic`     | Easy       | Web Exploitation     | Command injection & directory traversal in Flask |
| `privesc-basic` | Medium     | Privilege Escalation | SUID binaries, sudo misconfig, writable cron     |
| `recon-basic`   | Easy       | Reconnaissance       | Port scanning & hidden service discovery         |

## Building Images

```bash
# Build all challenges
docker build -t xv-web-basic      ./web-basic/
docker build -t xv-privesc-basic  ./privesc-basic/
docker build -t xv-recon-basic    ./recon-basic/

# Or build a single challenge
docker build -t xv-web-basic ./web-basic/
```

## Running Locally (for testing)

```bash
# Start a challenge container
docker run -d --name test-lab --memory=512m xv-web-basic

# Connect to the container shell
docker exec -it test-lab /bin/bash

# Stop and remove
docker rm -f test-lab
```

## Adding New Challenges

1. Create a new directory under `challenges/`
2. Add a `Dockerfile` with the `xploitverse=lab` label
3. Place flag files inside (format: `FLAG{xv_<name>_2024}`)
4. Update the `Lab` document in MongoDB with the `dockerImage` field pointing to your image
5. Build and push the image

## Image Naming Convention

`xv-<category>-<name>` — e.g., `xv-web-basic`, `xv-privesc-basic`
