package services

import "log"

// EC2Service provides methods for managing EC2 instances.
// This is a Phase 2+ stub — real AWS integration will be added later.
type EC2Service struct {
	AccessKeyID    string
	SecretAccessKey string
	Region         string
}

// NewEC2Service creates a new EC2 service.
func NewEC2Service(accessKeyID, secretAccessKey, region string) *EC2Service {
	return &EC2Service{
		AccessKeyID:    accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:         region,
	}
}

// LaunchInstance launches a new EC2 instance (stub).
func (s *EC2Service) LaunchInstance(instanceType, amiID string) (string, error) {
	log.Printf("🔧 [EC2 Stub] Would launch instance: type=%s, ami=%s", instanceType, amiID)
	return "i-mock-instance-id", nil
}

// TerminateInstance terminates an EC2 instance (stub).
func (s *EC2Service) TerminateInstance(instanceID string) error {
	log.Printf("🔧 [EC2 Stub] Would terminate instance: %s", instanceID)
	return nil
}

// GetInstanceStatus gets the status of an EC2 instance (stub).
func (s *EC2Service) GetInstanceStatus(instanceID string) (string, error) {
	log.Printf("🔧 [EC2 Stub] Would get status for instance: %s", instanceID)
	return "running", nil
}
