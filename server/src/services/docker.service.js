import Docker from 'dockerode'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('docker')

// ── Docker client ─────────────────────────────────────────────────────
let docker = null
let _dockerAvailable = false

const connectDocker = async (options, label) => {
  docker = options ? new Docker(options) : new Docker()
  await docker.ping()
  _dockerAvailable = true
  log.info({ transport: label }, 'Docker daemon connected')
}

/**
 * Initialize the Dockerode client.
 * On Windows: connects via named pipe tcp (Docker Desktop exposes TCP on 2375).
 * On Linux/Mac: connects via unix socket /var/run/docker.sock.
 * Falls back gracefully — all methods check _dockerAvailable before calling API.
 */
const initDocker = async () => {
  try {
    // Try the default socket path first; works on Linux/macOS and WSL2
    await connectDocker(null, 'default')
  } catch {
    try {
      // Fallback: Docker Desktop named pipe on Windows
      await connectDocker({ socketPath: '//./pipe/docker_engine' }, 'npipe')
    } catch (err) {
      try {
        // Fallback: TCP if user exposed daemon on 2375
        await connectDocker({ host: '127.0.0.1', port: 2375 }, 'tcp:2375')
      } catch (tcpErr) {
        _dockerAvailable = false
        log.warn(
          { err: tcpErr.message || err.message },
          'Docker unavailable — labs will use simulation mode',
        )
      }
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
    log.info({ image }, 'Pulling image')
    await new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) return reject(err)
        docker.modem.followProgress(stream, (err) =>
          err ? reject(err) : resolve(),
        )
      })
    })
    log.info({ image }, 'Image pulled')
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
      Memory: 256 * 1024 * 1024, // 256 MB
      MemorySwap: 384 * 1024 * 1024, // 384 MB (includes swap)
      NanoCpus: 500_000_000, // 0.5 vCPU
      AutoRemove: false, // we remove manually on stop
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
  const shellCandidates = [['/bin/bash'], ['/bin/sh']]

  for (const cmd of shellCandidates) {
    try {
      const exec = await container.exec({
        Cmd: cmd,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Env: [`TERM=xterm-256color`, `COLUMNS=${cols}`, `LINES=${rows}`],
      })

      const stream = await exec.start({ hijack: true, stdin: true })
      return { exec, stream }
    } catch {
      // Try next shell candidate.
    }
  }

  throw new Error('No interactive shell found in container')
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
      await container.stop({ t: 5 }) // 5-second grace period
    }
    await container.remove({ force: true })
    log.info({ container: containerName(sessionId) }, 'Container removed')
  } catch (err) {
    if (!err.message.includes('No such container')) {
      log.error({ err: err.message, sessionId }, 'Error stopping container')
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
