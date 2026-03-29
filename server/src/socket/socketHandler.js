import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import LabSession from '../models/LabSession.js'

/**
 * Mock boot logs for the "Live Attack Simulation Environment"
 * These simulate a real Linux VM booting up with cybersecurity tools
 */
const BOOT_LOGS = [
  {
    type: 'system',
    message:
      '[    0.000000] Linux version 5.15.0-kali3-amd64 (Debian 5.15.15-1kali1)',
  },
  {
    type: 'system',
    message:
      '[    0.000001] Command line: BOOT_IMAGE=/boot/vmlinuz-5.15.0-kali3-amd64 root=/dev/sda1',
  },
  {
    type: 'system',
    message: '[    0.100000] Initializing cgroup subsys cpuset',
  },
  { type: 'system', message: '[    0.200000] Initializing cgroup subsys cpu' },
  { type: 'kernel', message: '[    0.300000] KERNEL: Initializing memory...' },
  {
    type: 'kernel',
    message: '[    0.400000] KERNEL: Mounting root filesystem...',
  },
  {
    type: 'system',
    message: '[    0.500000] Mounting /dev/sda1 on / type ext4 (rw,relatime)',
  },
  { type: 'system', message: '[    0.600000] Loading kernel modules...' },
  {
    type: 'network',
    message: '[    0.700000] NET: Initializing network subsystem',
  },
  {
    type: 'network',
    message: '[    0.800000] eth0: Link is up - 1000 Mbps Full Duplex',
  },
  { type: 'network', message: '[    0.900000] eth0: Assigned IP: 10.0.0.x/24' },
  { type: 'service', message: '[    1.000000] Starting SSH daemon...' },
  {
    type: 'service',
    message: '[    1.100000] [OK] SSH listening on 0.0.0.0:22',
  },
  { type: 'service', message: '[    1.200000] Starting Apache2 web server...' },
  {
    type: 'service',
    message: '[    1.300000] [OK] Apache2 listening on 0.0.0.0:80',
  },
  {
    type: 'service',
    message: '[    1.400000] Starting MySQL database server...',
  },
  {
    type: 'service',
    message: '[    1.500000] [OK] MySQL ready for connections on 3306',
  },
  { type: 'tool', message: '[    1.600000] Loading security tools...' },
  { type: 'tool', message: '[    1.700000] ✓ Nmap 7.93 loaded' },
  {
    type: 'tool',
    message: '[    1.800000] ✓ Metasploit Framework 6.3.4 loaded',
  },
  { type: 'tool', message: '[    1.900000] ✓ Burp Suite Community loaded' },
  { type: 'tool', message: '[    2.000000] ✓ SQLMap 1.7 loaded' },
  { type: 'tool', message: '[    2.100000] ✓ Wireshark 4.0.3 loaded' },
  { type: 'tool', message: '[    2.200000] ✓ John the Ripper 1.9.0 loaded' },
  { type: 'tool', message: '[    2.300000] ✓ Hashcat 6.2.6 loaded' },
  {
    type: 'ready',
    message:
      '[    2.400000] ═══════════════════════════════════════════════════',
  },
  {
    type: 'ready',
    message:
      '[    2.500000] ║  XPLOITVERSE LAB ENVIRONMENT READY              ║',
  },
  {
    type: 'ready',
    message:
      '[    2.600000] ║  Target: Vulnerable Web Application             ║',
  },
  {
    type: 'ready',
    message:
      '[    2.700000] ║  Your Mission: Find and exploit vulnerabilities║',
  },
  {
    type: 'ready',
    message:
      '[    2.800000] ═══════════════════════════════════════════════════',
  },
  { type: 'prompt', message: '' },
  { type: 'prompt', message: 'root@xploitverse:~# ' },
]

/**
 * Additional random activity logs to simulate live environment
 */
const ACTIVITY_LOGS = [
  {
    type: 'network',
    message: '[NET] Incoming connection attempt on port 22 from 192.168.1.105',
  },
  { type: 'network', message: '[NET] Packet captured: TCP 80 -> 45123 [ACK]' },
  { type: 'system', message: '[SYS] CPU usage: 23% | Memory: 512MB/2048MB' },
  { type: 'alert', message: '[!] Suspicious activity detected on port 443' },
  {
    type: 'network',
    message: '[NET] DNS query: vulnerable-app.local -> 10.0.0.50',
  },
  {
    type: 'system',
    message: '[SYS] Process spawned: /usr/bin/python3 (PID: 1337)',
  },
  { type: 'alert', message: '[!] Failed login attempt from 10.0.0.99' },
  { type: 'network', message: '[NET] HTTP GET /admin/login.php 200 OK' },
  { type: 'system', message: '[SYS] Disk I/O: Read 1.2MB/s | Write 0.5MB/s' },
  { type: 'tool', message: '[TOOL] Nmap scan initiated on 10.0.0.0/24' },
]

// Store active sessions and their intervals
const activeSessions = new Map()

/**
 * Authenticate socket connection using JWT
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication required'))
    }

    const decoded = jwt.verify(token, config.jwt.secret)
    socket.userId = decoded.id
    socket.user = decoded
    next()
  } catch (error) {
    console.error('Socket auth error:', error.message)
    next(new Error('Invalid token'))
  }
}

/**
 * Stream boot logs to a specific socket
 */
const streamBootLogs = (socket, sessionId, labInfo) => {
  let logIndex = 0

  // Customize some logs with actual session info
  const customizedLogs = BOOT_LOGS.map((log) => {
    let message = log.message
    if (message.includes('10.0.0.x')) {
      message = message.replace('10.0.0.x', labInfo.publicIp || '10.0.0.42')
    }
    if (message.includes('Vulnerable Web Application')) {
      message = message.replace(
        'Vulnerable Web Application',
        labInfo.labName || 'Training Lab',
      )
    }
    return { ...log, message }
  })

  const interval = setInterval(() => {
    if (logIndex < customizedLogs.length) {
      const log = customizedLogs[logIndex]
      socket.emit('lab-log', {
        ...log,
        timestamp: new Date().toISOString(),
        index: logIndex,
      })
      logIndex++
    } else {
      // Boot complete, start random activity logs
      clearInterval(interval)
      startActivityLogs(socket, sessionId)
    }
  }, 500)

  return interval
}

/**
 * Stream random activity logs after boot completes
 */
const startActivityLogs = (socket, sessionId) => {
  const interval = setInterval(() => {
    // Random chance to emit an activity log
    if (Math.random() < 0.3) {
      const log =
        ACTIVITY_LOGS[Math.floor(Math.random() * ACTIVITY_LOGS.length)]
      socket.emit('lab-log', {
        ...log,
        timestamp: new Date().toISOString(),
        isActivity: true,
      })
    }
  }, 3000)

  // Store the interval for cleanup
  const sessionData = activeSessions.get(sessionId)
  if (sessionData) {
    sessionData.activityInterval = interval
  }
}

/**
 * Initialize Socket.io handlers
 */
export const initializeSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket)

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.userId})`)

    // Join lab session room
    socket.on('join-lab', async (data) => {
      try {
        const { sessionId } = data

        if (!sessionId) {
          socket.emit('error', { message: 'Session ID is required' })
          return
        }

        // Verify the session belongs to this user
        const session = await LabSession.findById(sessionId)

        if (!session) {
          socket.emit('error', { message: 'Session not found' })
          return
        }

        if (session.user.toString() !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized access to session' })
          return
        }

        // Join the session room
        const room = `lab-${sessionId}`
        socket.join(room)

        console.log(`📡 User ${socket.userId} joined lab room: ${room}`)

        // Clean up any existing intervals for this session
        if (activeSessions.has(sessionId)) {
          const existing = activeSessions.get(sessionId)
          if (existing.bootInterval) clearInterval(existing.bootInterval)
          if (existing.activityInterval)
            clearInterval(existing.activityInterval)
        }

        // Start streaming boot logs
        const labInfo = {
          publicIp: session.publicIp,
          labName: session.labName,
        }

        const bootInterval = streamBootLogs(socket, sessionId, labInfo)

        activeSessions.set(sessionId, {
          socket,
          bootInterval,
          activityInterval: null,
          userId: socket.userId,
        })

        socket.emit('lab-joined', {
          success: true,
          sessionId,
          labName: session.labName,
          message: 'Connected to lab environment',
        })
      } catch (error) {
        console.error('Join lab error:', error)
        socket.emit('error', { message: 'Failed to join lab session' })
      }
    })

    // Handle command input (for future terminal implementation)
    socket.on('terminal-input', (data) => {
      const { sessionId, command } = data

      // Echo the command back (mock response)
      socket.emit('lab-log', {
        type: 'input',
        message: `$ ${command}`,
        timestamp: new Date().toISOString(),
      })

      // Simulate command response
      setTimeout(() => {
        const mockResponses = {
          ls: 'Desktop  Documents  Downloads  exploit.py  notes.txt  tools',
          pwd: '/root',
          whoami: 'root',
          id: 'uid=0(root) gid=0(root) groups=0(root)',
          'nmap --version': 'Nmap version 7.93 ( https://nmap.org )',
          help: 'Available commands: ls, pwd, whoami, id, nmap, sqlmap, metasploit',
        }

        const response =
          mockResponses[command.toLowerCase()] ||
          `Command '${command}' executed successfully`

        socket.emit('lab-log', {
          type: 'output',
          message: response,
          timestamp: new Date().toISOString(),
        })

        // Show prompt again
        socket.emit('lab-log', {
          type: 'prompt',
          message: 'root@xploitverse:~# ',
          timestamp: new Date().toISOString(),
        })
      }, 300)
    })

    // Leave lab session
    socket.on('leave-lab', (data) => {
      const { sessionId } = data
      const room = `lab-${sessionId}`

      socket.leave(room)

      // Clean up intervals
      if (activeSessions.has(sessionId)) {
        const sessionData = activeSessions.get(sessionId)
        if (sessionData.bootInterval) clearInterval(sessionData.bootInterval)
        if (sessionData.activityInterval)
          clearInterval(sessionData.activityInterval)
        activeSessions.delete(sessionId)
      }

      console.log(`📴 User ${socket.userId} left lab room: ${room}`)
    })

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (Reason: ${reason})`)

      // Clean up all sessions for this socket
      for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (sessionData.userId === socket.userId) {
          if (sessionData.bootInterval) clearInterval(sessionData.bootInterval)
          if (sessionData.activityInterval)
            clearInterval(sessionData.activityInterval)
          activeSessions.delete(sessionId)
        }
      }
    })
  })

  console.log('🔌 Socket.io handlers initialized')
}

export default { initializeSocketHandlers }
