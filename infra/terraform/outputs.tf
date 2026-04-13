output "app_public_ip" {
  description = "Public IP address of the EC2 app host."
  value       = aws_instance.app.public_ip
}

output "app_public_dns" {
  description = "Public DNS name of the EC2 app host."
  value       = aws_instance.app.public_dns
}

output "postgres_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint."
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "ssm_instance_id" {
  description = "Instance ID for SSM Session Manager access."
  value       = aws_instance.app.id
}
