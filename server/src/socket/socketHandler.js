import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import LabSession, { LAB_STATUS } from '../models/LabSession.js'
import * as dockerService from '../services/docker.service.js'

// ── Session store ─────────────────────────────────────────────────────
/**
 * Map of sessionId → { stream, exec, userId }
 * Holds live exec streams so terminal-input can write to them.
 */
const ptySessions = new Map()

// ── Boot log simulation (fallback when Docker unavailable) ────────────
const BOOT_LOGS = [
  { type: 'system', message: '[    0.000000] Linux version 5.15.0-kali3-amd64' },
  { type: 'kernel', message: '[    0.300000] KERNEL: Initializing memory...' },
  { type: 'network', message: '[    0.700000] NET: Initializing network subsystem' },
  { type: 'network', message: '[    0.800000] eth0: Link is up - 1000 Mbps Full Duplex' },
  { type: 'service', message: '[    1.000000] Starting SSH daemon... [OK]' },
  { type: 'service', message: '[    1.200000] Starting Apache2 web server... [OK]' },
  { type: 'tool', message: '[    1.700000] ✓ Nmap 7.93 loaded' },
  { type: 'tool', message: '[    1.800000] ✓ Metasploit Framework 6.3.4 loaded' },
  { type: 'tool', message: '[    1.900000] ✓ SQLMap 1.7 loaded' },
  { type: 'ready', message: '══════════════════════════════════════════════' },
  { type: 'ready', message: '║   XPLOITVERSE LAB ENVIRONMENT READY       ║' },
  { type: 'ready', message: '══════════════════════════════════════════════' },
  { type: 'prompt', message: '' },
  { type: 'prompt', message: 'root@xploitverse:~# ' },
]

const MOCK_RESPONSES = {
  ls: 'Desktop  Documents  Downloads  exploit.py  notes.txt  tools',
  pwd: '/root',
  whoami: 'root',
  id: 'uid=0(root) gid=0(root) groups=0(root)',
  'nmap --version': 'Nmap version 7.93 ( https://nmap.org )',
  help: 'Available commands: ls, pwd, whoami, id, nmap, sqlmap, metasploit',
}

const streamBootLogs = (socket, sessionId, labInfo) => {
  let i = 0
  const logs = BOOT_LOGS.map((l) => ({
    ...l,
    message: l.message.replace('10.0.0.x', labInfo.publicIp || '10.0.0.42'),
  }))

  const iv = setInterval(() => {
    if (i < logs.length) {
      socket.emit('lab-log', { ...logs[i], timestamp: new Date().toISOString(), index: i })
      i++
    } else {
      clearInterval(iv)
      startMockActivity(socket, sessionId)
    }
  }, 400)

  return iv
}

const startMockActivity = (socket, sessionId) => {
  const ACTIVITY = [
    { type: 'network', message: '[NET] Packet captured: TCP 80 -> 45123 [ACK]' },
    { type: 'system', message: '[SYS] CPU usage: 23% | Memory: 512MB/2048MB' },
    { type: 'alert', message: '[!] Suspicious activity detected on port 443' },
  ]
  const iv = setInterval(() => {
    if (Math.random() < 0.3) {
      socket.emit('lab-log', {
        ...ACTIVITY[Math.floor(Math.random() * ACTIVITY.length)],
        timestamp: new Date().toISOString(),
        isActivity: true,
      })
    }
  }, 3000)

  const s = ptySessions.get(sessionId)
  if (s) s.activityInterval = iv
}

// ── Socket authentication ─────────────────────────────────────────────
const authenticateSocket = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) return next(new Error('Authentication required'))
    const decoded = jwt.verify(token, config.jwt.secret)
    socket.userId = decoded.id
    socket.user = decoded
    next()
  } catch (err) {
    next(new Error('Invalid token'))
  }
}

// ── Main handler ──────────────────────────────────────────────────────
export const initializeSocketHandlers = (io) => {
  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.userId})`)

    // ── join-lab ─────────────────────────────────────────────────────
    socket.on('join-lab', async (data) => {
      try {
        const { sessionId, cols = 80, rows = 24 } = data
        if (!sessionId) return socket.emit('error', { message: 'Session ID required' })

        // Wait up to 10 seconds for the async provisioning to complete
        let session = await waitForSession(sessionId, socket.userId)
        if (!session) {
          return socket.emit('error', { message: 'Session not found or unauthorized' })
        }

        const room = `lab-${sessionId}`
        socket.join(room)

        // Tear down any existing PTY for this session
        cleanupSession(sessionId)

        const containerId = session.metadata?.containerId
        const dockerMode = session.metadata?.dockerMode && dockerService.isDockerAvailable()

        if (dockerMode && containerId) {
          // ── Real docker exec PTY ──────────────────────────────────
          try {
            const { exec, stream } = await dockerService.execShell(containerId, cols, rows)

            // Pipe container output → socket
            stream.on('data', (chunk) => {
              socket.emit('terminal-output', { data: chunk.toString('utf-8') })
            })
            stream.on('error', (err) => {
              console.error('PTY stream error:', err.message)
            })
            stream.on('end', () => {
              socket.emit('terminal-output', { data: '\r\n[Session ended]\r\n' })
            })

            ptySessions.set(sessionId, { stream, exec, userId: socket.userId, activityInterval: null })

            // Announce initial welcome
            socket.emit('terminal-output', {
              data: `\r\n\x1b[32m[XploitVerse] Connected to lab: ${session.labName}\x1b[0m\r\n\r\n`,
            })
            socket.emit('lab-joined', {
              success: true,
              sessionId,
              labName: session.labName,
              dockerMode: true,
              message: 'Real container shell connected',
            })

            console.log(`🐳 PTY opened: session=${sessionId} container=${containerId.slice(0, 12)}`)
          } catch (ptyErr) {
            console.error('Failed to open PTY:', ptyErr.message)
            // Fall through to simulation mode
            fallbackSimulation(socket, sessionId, session)
          }
        } else {
          // ── Simulation mode ───────────────────────────────────────
          fallbackSimulation(socket, sessionId, session)
        }
      } catch (err) {
        console.error('join-lab error:', err)
        socket.emit('error', { message: 'Failed to join lab session' })
      }
    })

    // ── terminal-input ────────────────────────────────────────────────
    socket.on('terminal-input', (data) => {
      const { sessionId, input, command } = data
      const session = ptySessions.get(sessionId)

      if (!session) return

      if (session.stream && session.dockerMode !== false) {
        // Real mode: write raw input bytes to exec stream
        try {
          session.stream.write(input || command || '')
        } catch (e) {/* stream may be closed */ }
      } else {
        // Simulation mode: mock responses
        const cmd = (command || input || '').trim()
        socket.emit('lab-log', { type: 'input', message: `$ ${cmd}`, timestamp: new Date().toISOString() })
        setTimeout(() => {
          const response = MOCK_RESPONSES[cmd.toLowerCase()] || `Command '${cmd}' executed successfully`
          socket.emit('lab-log', { type: 'output', message: response, timestamp: new Date().toISOString() })
          socket.emit('lab-log', { type: 'prompt', message: 'root@xploitverse:~# ', timestamp: new Date().toISOString() })
        }, 200)
      }
    })

    // ── terminal-resize ───────────────────────────────────────────────
    socket.on('terminal-resize', async (data) => {
      const { sessionId, cols, rows } = data
      const session = ptySessions.get(sessionId)
      if (session?.exec) {
        await dockerService.resizeExec(session.exec, cols, rows)
      }
    })

    // ── leave-lab ─────────────────────────────────────────────────────
    socket.on('leave-lab', (data) => {
      const { sessionId } = data
      socket.leave(`lab-${sessionId}`)
      cleanupSession(sessionId)
      console.log(`📴 User ${socket.userId} left lab: ${sessionId}`)
    })

    // ── disconnect ────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`)
      for (const [sessionId, s] of ptySessions.entries()) {
        if (s.userId === socket.userId) cleanupSession(sessionId)
      }
    })
  })

  console.log('🔌 Socket.io handlers initialized')
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Poll until session reaches RUNNING state (provisioning is async).
 * Returns session or null after timeout.
 */
const waitForSession = async (sessionId, userId, maxWaitMs = 12000) => {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const s = await LabSession.findById(sessionId)
    if (!s || s.user.toString() !== userId) return null
    if (s.status === LAB_STATUS.RUNNING || s.status === LAB_STATUS.ERROR) return s
    await new Promise((r) => setTimeout(r, 500))
  }
  // Return whatever we have after timeout
  return LabSession.findOne({ _id: sessionId, user: userId })
}

/**
 * Start the simulation fallback (boot logs + mock commands).
 */
const fallbackSimulation = (socket, sessionId, session) => {
  const bootIv = streamBootLogs(socket, sessionId, {
    publicIp: session.publicIp,
    labName: session.labName,
  })
  ptySessions.set(sessionId, {
    stream: null,
    exec: null,
    userId: socket.userId,
    bootInterval: bootIv,
    activityInterval: null,
    dockerMode: false,
  })
  socket.emit('lab-joined', {
    success: true,
    sessionId,
    labName: session.labName,
    dockerMode: false,
    message: 'Connected to simulated lab environment',
  })
}

/**
 * Destroy stream + clear intervals for a session.
 */
const cleanupSession = (sessionId) => {
  const s = ptySessions.get(sessionId)
  if (!s) return
  try { s.stream?.destroy() } catch { }
  if (s.bootInterval) clearInterval(s.bootInterval)
  if (s.activityInterval) clearInterval(s.activityInterval)
  ptySessions.delete(sessionId)
}

export default { initializeSocketHandlers }
