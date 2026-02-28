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

const (
	// labNetwork is the dedicated Docker network for lab containers.
	labNetwork = "xploitverse-labs"
	// labLabel is applied to every lab container for easy identification.
	labLabel = "xploitverse=lab"
)

// DockerService manages lab containers via the docker CLI.
// If the docker binary is unavailable or the daemon is unreachable it falls
// back to a harmless mock mode so the rest of the application works without
// Docker installed (e.g. on developer laptops or CI runners).
type DockerService struct {
	available bool
}

// NewDockerService probes the Docker daemon, ensures the lab network exists,
// and returns a ready-to-use DockerService.
func NewDockerService() *DockerService {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", "info", "--format", "{{.ID}}")
	if err := cmd.Run(); err != nil {
		log.Printf("⚠️  Docker unavailable (%v) — running in mock mode", err)
		return &DockerService{available: false}
	}

	log.Println("✅ Docker daemon connected")

	ds := &DockerService{available: true}
	if err := ds.ensureNetwork(ctx); err != nil {
		log.Printf("⚠️  Failed to create lab network: %v — falling back to bridge", err)
	}
	return ds
}

// Available reports whether a real Docker daemon is reachable.
func (d *DockerService) Available() bool {
	return d.available
}

// ensureNetwork creates the dedicated lab network if it doesn't already exist.
func (d *DockerService) ensureNetwork(ctx context.Context) error {
	// Check if network already exists
	out, err := exec.CommandContext(ctx, "docker", "network", "ls",
		"--filter", fmt.Sprintf("name=^%s$", labNetwork),
		"--format", "{{.Name}}",
	).Output()
	if err == nil && strings.TrimSpace(string(out)) == labNetwork {
		log.Printf("🌐 Lab network '%s' already exists", labNetwork)
		return nil
	}

	// Create the network with a specific subnet
	createArgs := []string{
		"network", "create",
		"--driver", "bridge",
		"--subnet", "172.30.0.0/16",
		"--label", labLabel,
		labNetwork,
	}
	createOut, createErr := exec.CommandContext(ctx, "docker", createArgs...).CombinedOutput()
	if createErr != nil {
		return fmt.Errorf("docker network create: %w\n%s", createErr, createOut)
	}
	log.Printf("🌐 Created lab network '%s' (172.30.0.0/16)", labNetwork)
	return nil
}

// SpawnContainer pulls (if necessary) and starts a hardened lab container via
// the docker CLI. Returns the container ID and its lab-network IP.
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
		mockIP := fmt.Sprintf("172.30.%d.%d", rand.Intn(254)+1, rand.Intn(254)+1)
		log.Printf("🔧 [Docker Mock] spawn name=%s image=%s → ip=%s", containerName, labImage, mockIP)
		return mockID, mockIP, nil
	}

	// Pull the image quietly (--quiet suppresses progress bars)
	pullArgs := []string{"pull", "--quiet", labImage}
	pullCmd := exec.CommandContext(ctx, "docker", pullArgs...)
	if out, pullErr := pullCmd.CombinedOutput(); pullErr != nil {
		return "", "", fmt.Errorf("docker pull %s: %w\n%s", labImage, pullErr, out)
	}

	// Determine which network to use. Prefer lab network; fall back to bridge.
	network := labNetwork
	if !d.networkExists(ctx, labNetwork) {
		network = "bridge"
	}

	// Run the container detached with security hardening
	runArgs := []string{
		"run", "-d",
		"--name", containerName,
		// ── Resource limits ──
		fmt.Sprintf("--memory=%dm", memMB),
		"--pids-limit", "100",
		// ── Security hardening ──
		"--cap-drop", "ALL",
		"--cap-add", "CHOWN",
		"--cap-add", "SETUID",
		"--cap-add", "SETGID",
		"--cap-add", "DAC_OVERRIDE",
		"--cap-add", "NET_BIND_SERVICE",
		"--security-opt", "no-new-privileges",
		"--read-only=false",
		// ── Networking ──
		"--network", network,
		// ── Labels for tracking ──
		"--label", labLabel,
		"--label", fmt.Sprintf("xploitverse.container=%s", containerName),
		// ── Image ──
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

	// Get container IP on the chosen network
	containerIP, _ := containerIPFromID(ctx, cID)
	log.Printf("🐳 Container started: id=%s name=%s image=%s ip=%s network=%s",
		cID[:12], containerName, labImage, containerIP, network)
	return cID, containerIP, nil
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
	log.Printf("🐳 Container removed: id=%s", containerID)
	return nil
}

// ContainerIP returns the current IP of a running container.
func (d *DockerService) ContainerIP(ctx context.Context, containerID string) (string, error) {
	if !d.available || containerID == "" || strings.HasPrefix(containerID, "mock_") {
		return "", nil
	}
	return containerIPFromID(ctx, containerID)
}

// IsRunning returns true if the container exists and is in a running state.
func (d *DockerService) IsRunning(ctx context.Context, containerID string) bool {
	if !d.available || containerID == "" || strings.HasPrefix(containerID, "mock_") {
		return strings.HasPrefix(containerID, "mock_")
	}
	out, err := exec.CommandContext(ctx, "docker", "inspect",
		"--format", "{{.State.Running}}",
		containerID,
	).Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "true"
}

// ListLabContainers returns the IDs of all containers bearing the xploitverse
// lab label.
func (d *DockerService) ListLabContainers(ctx context.Context) ([]string, error) {
	if !d.available {
		return nil, nil
	}
	out, err := exec.CommandContext(ctx, "docker", "ps", "-aq",
		"--filter", fmt.Sprintf("label=%s", labLabel),
	).Output()
	if err != nil {
		return nil, fmt.Errorf("docker ps: %w", err)
	}
	raw := strings.TrimSpace(string(out))
	if raw == "" {
		return nil, nil
	}
	return strings.Split(raw, "\n"), nil
}

// CleanupOrphanedContainers removes lab containers whose IDs are not in the
// activeIDs set.  This is useful for reconciling Docker state with MongoDB
// after unclean shutdowns.
func (d *DockerService) CleanupOrphanedContainers(ctx context.Context, activeIDs map[string]bool) (int, error) {
	if !d.available {
		return 0, nil
	}
	all, err := d.ListLabContainers(ctx)
	if err != nil {
		return 0, err
	}
	removed := 0
	for _, id := range all {
		if !activeIDs[id] && !activeIDs[strings.TrimSpace(id)] {
			log.Printf("🧹 Cleaning up orphaned container: %s", id)
			_ = d.StopContainer(ctx, id)
			removed++
		}
	}
	if removed > 0 {
		log.Printf("🧹 Removed %d orphaned lab containers", removed)
	}
	return removed, nil
}

// networkExists checks if a Docker network exists.
func (d *DockerService) networkExists(ctx context.Context, name string) bool {
	out, err := exec.CommandContext(ctx, "docker", "network", "ls",
		"--filter", fmt.Sprintf("name=^%s$", name),
		"--format", "{{.Name}}",
	).Output()
	return err == nil && strings.TrimSpace(string(out)) == name
}

// containerIPFromID queries the docker CLI for the network IP.
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
