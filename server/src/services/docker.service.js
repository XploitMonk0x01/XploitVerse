import Docker from 'dockerode'

// ── Docker client ─────────────────────────────────────────────────────
let docker = null
let _dockerAvailable = false

/**
 * Initialize the Dockerode client.
 * On Windows: connects via named pipe tcp (Docker Desktop exposes TCP on 2375).
 * On Linux/Mac: connects via unix socket /var/run/docker.sock.
 * Falls back gracefully — all methods check _dockerAvailable before calling API.
 */
const initDocker = async () => {
    try {
        // Try the default socket path first; works on Linux/macOS and WSL2
        docker = new Docker()
        await docker.ping()       // throws if daemon unreachable
        _dockerAvailable = true
        console.log('🐳 Docker daemon connected')
    } catch {
        try {
            // Fallback: Docker Desktop on Windows exposes TCP on localhost:2375
            docker = new Docker({ host: 'localhost', port: 2375 })
            await docker.ping()
            _dockerAvailable = true
            console.log('🐳 Docker daemon connected (TCP fallback)')
        } catch (err) {
            _dockerAvailable = false
            console.warn('⚠️  Docker unavailable – labs will use simulation mode:', err.message)
        }
    }
}

export const isDockerAvailable = () => _dockerAvailable

// ── Image management ─────────────────────────────────────────────────

/**
 * Ensure image is present locally. Pulls if missing.
 * Used before starting a container so the user doesn't wait for a pull during session.
 */
export const ensureImage = async (image) => {
    if (!_dockerAvailable) return
    try {
        await docker.getImage(image).inspect()
    } catch {
        console.log(`📦 Pulling image: ${image}`)
        await new Promise((resolve, reject) => {
            docker.pull(image, (err, stream) => {
                if (err) return reject(err)
                docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve()))
            })
        })
        console.log(`✅ Image pulled: ${image}`)
    }
}

// ── Container lifecycle ─────────────────────────────────────────────

/**
 * Build a unique container name for a session.
 */
const containerName = (sessionId) => `xv-lab-${sessionId}`

/**
 * Start a lab container.
 * Returns the container ID, or null if Docker is unavailable.
 */
export const startContainer = async (sessionId, image) => {
    if (!_dockerAvailable) return null

    await ensureImage(image)

    const container = await docker.createContainer({
        Image: image,
        name: containerName(sessionId),
        // Interactive TTY so exec sessions get a proper terminal
        Tty: true,
        OpenStdin: true,
        AttachStdin: true,
        // Resource constraints — keep lab containers lightweight
        HostConfig: {
            Memory: 256 * 1024 * 1024,         // 256 MB
            MemorySwap: 384 * 1024 * 1024,      // 384 MB (includes swap)
            NanoCpus: 500_000_000,             // 0.5 vCPU
            AutoRemove: false,                  // we remove manually on stop
            NetworkMode: 'bridge',
            // Security: drop all capabilities, only add back what labs need
            CapDrop: ['ALL'],
            CapAdd: ['CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE'],
        },
    })

    await container.start()
    return container.id
}

/**
 * Open a docker exec bash session on the container and return the raw stream.
 * The stream is bidirectional: write input, read output.
 */
export const execShell = async (containerId, cols = 80, rows = 24) => {
    if (!_dockerAvailable) return null

    const container = docker.getContainer(containerId)

    const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Env: [`TERM=xterm-256color`, `COLUMNS=${cols}`, `LINES=${rows}`],
    })

    const stream = await exec.start({ hijack: true, stdin: true })
    return { exec, stream }
}

/**
 * Resize a running exec's terminal.
 */
export const resizeExec = async (exec, cols, rows) => {
    try {
        await exec.resize({ w: cols, h: rows })
    } catch {
        // Ignore resize errors (exec may have ended)
    }
}

/**
 * Stop and remove a lab container.
 */
export const stopContainer = async (sessionId) => {
    if (!_dockerAvailable) return

    try {
        const container = docker.getContainer(containerName(sessionId))
        const info = await container.inspect()
        if (info.State.Running) {
            await container.stop({ t: 5 })  // 5-second grace period
        }
        await container.remove({ force: true })
        console.log(`🗑️  Container ${containerName(sessionId)} removed`)
    } catch (err) {
        if (!err.message.includes('No such container')) {
            console.error(`Error stopping container:`, err.message)
        }
    }
}

// ── Init on module load ──────────────────────────────────────────────
await initDocker()

export default {
    isDockerAvailable,
    ensureImage,
    startContainer,
    execShell,
    resizeExec,
    stopContainer,
}
