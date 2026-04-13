variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for Terraform-managed resources."
  type        = string
  default     = "xploitverse"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Two public subnet CIDR blocks."
  type        = list(string)
  default     = ["10.42.0.0/24", "10.42.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Two private subnet CIDR blocks."
  type        = list(string)
  default     = ["10.42.10.0/24", "10.42.11.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type for the application host."
  type        = string
  default     = "t3.large"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB for the app host."
  type        = number
  default     = 60
}

variable "ssh_cidr_blocks" {
  description = "CIDR ranges allowed to access SSH. Keep empty when using SSM only."
  type        = list(string)
  default     = []
}

variable "key_name" {
  description = "Optional EC2 key pair name."
  type        = string
  default     = null
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
  default     = "xploitverse"
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
  default     = "xploitverse"
}

variable "db_password" {
  description = "PostgreSQL master password."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "jwt_secret" {
  description = "JWT secret passed to the backend environment."
  type        = string
  sensitive   = true
}

variable "client_url" {
  description = "Public frontend URL used by backend CORS."
  type        = string
  default     = "http://localhost"
}

variable "app_repo_url" {
  description = "Optional git repository URL to clone onto the EC2 host."
  type        = string
  default     = ""
}

variable "app_branch" {
  description = "Git branch to checkout on the EC2 host when app_repo_url is set."
  type        = string
  default     = "main"
}

variable "tags" {
  description = "Additional tags applied to all resources."
  type        = map(string)
  default     = {}
}
