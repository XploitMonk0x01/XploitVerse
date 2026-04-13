# XploitVerse Terraform

This Terraform stack provisions AWS infrastructure that matches the current project shape:

- one EC2 application host for the Go backend, Vite-served frontend, and Docker-managed lab containers
- one RDS PostgreSQL instance
- one ElastiCache Redis node
- one VPC with public app networking and private data subnets

## Why EC2

The current backend starts challenge environments through the local Docker CLI. Because of that, ECS/Fargate would not be a drop-in fit yet. This stack keeps the app host on EC2 so the existing lab lifecycle model still works.

## Files

- `versions.tf`: Terraform and provider versions
- `variables.tf`: configurable inputs
- `main.tf`: core AWS resources
- `outputs.tf`: useful connection details
- `user_data.sh.tftpl`: host bootstrap for Docker, nginx, and backend env wiring
- `terraform.tfvars.example`: starter variable values

## Usage

1. Copy `terraform.tfvars.example` to `terraform.tfvars`.
2. Set at least `db_password`, `jwt_secret`, and `client_url`.
3. Optionally set `app_repo_url` if you want the EC2 host to clone the repo during bootstrap.
4. Run:

```bash
terraform init
terraform plan
terraform apply
```

## Notes

- The bootstrap script prepares the host and writes `/opt/xploitverse/backend/.env`, but it does not fully orchestrate the app runtime for you. That keeps Terraform focused on infrastructure rather than release automation.
- PostgreSQL and Redis stay private inside the VPC. The app host is the only resource allowed to reach them.
- SSH is disabled by default unless you set `ssh_cidr_blocks`. SSM is enabled on the instance role for shell access without opening port `22`.
- This stack intentionally omits NAT, ALB, Route53, ACM, and autoscaling to stay aligned with the current single-host runtime model. Those can be added later once the deployment model is containerized more cleanly.
