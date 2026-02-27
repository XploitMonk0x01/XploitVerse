package services

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"math/rand"
	"os/exec"
	"strings"
	"time"
)

// DockerService manages lab containers via the docker CLI.
// If the docker binary is unavailable or the daemon is unreachable it falls
// back to a harmless mock mode so the rest of the application works without
// Docker installed (e.g. on developer laptops or CI runners).
type DockerService struct {
	available bool
}

// NewDockerService probes the Docker daemon and returns a DockerService.
func NewDockerService() *DockerService {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "info", "--format", "{{.ID}}")
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️  Docker unavailable (%v) — running in mock mode", err)
		return &DockerService{available: false}
	}

	log.Println("✅ Docker daemon connected")
	return &DockerService{available: true}
}

// Available reports whether a real Docker daemon is reachable.
func (d *DockerService) Available() bool {
	return d.available
}

// SpawnContainer pulls (if necessary) and starts a lab container via the
// docker CLI. Returns the container ID and its bridge IP.
// In mock mode it returns fake values so callers continue to work.
func (d *DockerService) SpawnContainer(
	ctx context.Context,
	labImage string,
	containerName string,
	memMB int64,
	_ int64, // cpuShares reserved for future use
) (containerID, ip string, err error) {
	if !d.available {
		mockID := fmt.Sprintf("mock_%s", containerName)
		mockIP := fmt.Sprintf("172.20.%d.%d", rand.Intn(254)+1, rand.Intn(254)+1)
		log.Printf("🔧 [Docker Mock] spawn name=%s image=%s → ip=%s", containerName, labImage, mockIP)
		return mockID, mockIP, nil
	}

	// Pull the image quietly (--quiet suppresses progress bars)
	pullArgs := []string{"pull", "--quiet", labImage}
	pullCmd := exec.CommandContext(ctx, "docker", pullArgs...)
	if out, pullErr := pullCmd.CombinedOutput(); pullErr != nil {
		return "", "", fmt.Errorf("docker pull %s: %w\n%s", labImage, pullErr, out)
	}

	// Run the container detached with memory limit and unique name
	runArgs := []string{
		"run", "-d",
		"--name", containerName,
		fmt.Sprintf("--memory=%dm", memMB),
		"--network", "bridge",
		labImage,
	}
	var stdout, stderr bytes.Buffer
	runCmd := exec.CommandContext(ctx, "docker", runArgs...)
	runCmd.Stdout = &stdout
	runCmd.Stderr = &stderr
	if err := runCmd.Run(); err != nil {
		return "", "", fmt.Errorf("docker run: %w\n%s", err, stderr.String())
	}
	cID := strings.TrimSpace(stdout.String())

	// Get bridge IP
	bridgeIP, _ := containerIPFromID(ctx, cID)
	return cID, bridgeIP, nil
}

// StopContainer stops and removes a container by ID via the docker CLI.
// Safe to call with an empty or mock ID.
func (d *DockerService) StopContainer(ctx context.Context, containerID string) error {
	if !d.available || containerID == "" || strings.HasPrefix(containerID, "mock_") {
		log.Printf("🔧 [Docker Mock] stop id=%s", containerID)
		return nil
	}

	// docker rm -f handles both running and stopped containers in one call
	out, err := exec.CommandContext(ctx, "docker", "rm", "-f", containerID).CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker rm -f %s: %w\n%s", containerID, err, out)
	}
	return nil
}

// ContainerIP returns the current bridge IP of a running container.
func (d *DockerService) ContainerIP(ctx context.Context, containerID string) (string, error) {
	if !d.available || containerID == "" || strings.HasPrefix(containerID, "mock_") {
		return "", nil
	}
	return containerIPFromID(ctx, containerID)
}

// containerIPFromID queries the docker CLI for the bridge network IP.
func containerIPFromID(ctx context.Context, containerID string) (string, error) {
	out, err := exec.CommandContext(
		ctx, "docker", "inspect",
		"--format", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}",
		containerID,
	).Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}
