import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') })

import Lab from '../models/Lab.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('seed-labs')

const labs = [
  {
    title: 'Basic SQL Injection',
    description:
      'Learn to identify and exploit SQL injection vulnerabilities in web applications. Practice with various injection techniques including UNION-based, blind, and time-based attacks.',
    difficulty: 'Easy',
    category: 'Red Team',
    estimatedDuration: 45,
    objectives: [
      'Understand SQL injection fundamentals',
      'Identify vulnerable input fields',
      'Extract database information',
      'Bypass authentication mechanisms',
    ],
    tools: ['Burp Suite', 'SQLMap', 'Browser DevTools'],
    tags: ['sql', 'injection', 'web', 'owasp', 'beginner'],
    environmentConfig: {
      instanceType: 't2.micro',
      ports: [80, 443, 3306],
    },
  },
  {
    title: 'Linux Privilege Escalation',
    description:
      'Master the art of escalating privileges on Linux systems. Explore SUID binaries, kernel exploits, cron jobs, and misconfigurations to gain root access.',
    difficulty: 'Medium',
    category: 'Red Team',
    estimatedDuration: 90,
    objectives: [
      'Enumerate Linux systems for weaknesses',
      'Exploit SUID/SGID binaries',
      'Leverage cron job misconfigurations',
      'Understand kernel exploitation basics',
    ],
    tools: ['LinPEAS', 'GTFOBins', 'pspy', 'Linux Exploit Suggester'],
    tags: ['linux', 'privesc', 'enumeration', 'root', 'intermediate'],
    environmentConfig: {
      instanceType: 't2.small',
      ports: [22, 80],
    },
  },
  {
    title: 'Network Traffic Analysis',
    description:
      'Develop skills in analyzing network traffic to detect malicious activities. Use Wireshark and tcpdump to identify attacks, exfiltration, and suspicious patterns.',
    difficulty: 'Medium',
    category: 'Blue Team',
    estimatedDuration: 60,
    objectives: [
      'Capture and analyze network packets',
      'Identify common attack patterns',
      'Detect data exfiltration attempts',
      'Create detection signatures',
    ],
    tools: ['Wireshark', 'tcpdump', 'NetworkMiner', 'Zeek'],
    tags: ['network', 'analysis', 'defense', 'wireshark', 'packets'],
    environmentConfig: {
      instanceType: 't2.micro',
      ports: [22],
    },
  },
  {
    title: 'Web Application XSS Attacks',
    description:
      'Explore Cross-Site Scripting vulnerabilities in modern web applications. Learn reflected, stored, and DOM-based XSS techniques and how to bypass filters.',
    difficulty: 'Easy',
    category: 'Red Team',
    estimatedDuration: 40,
    objectives: [
      'Understand XSS attack vectors',
      'Exploit reflected XSS vulnerabilities',
      'Chain XSS with other attacks',
      'Bypass common XSS filters',
    ],
    tools: ['Burp Suite', 'XSS Hunter', 'Browser DevTools'],
    tags: ['xss', 'web', 'javascript', 'owasp', 'beginner'],
    environmentConfig: {
      instanceType: 't2.micro',
      ports: [80, 443],
    },
  },
  {
    title: 'Active Directory Exploitation',
    description:
      'Learn to attack and compromise Windows Active Directory environments. From initial foothold to domain admin through various attack paths.',
    difficulty: 'Hard',
    category: 'Red Team',
    estimatedDuration: 120,
    objectives: [
      'Enumerate Active Directory',
      'Exploit Kerberos vulnerabilities',
      'Perform lateral movement',
      'Achieve domain dominance',
    ],
    tools: ['BloodHound', 'Mimikatz', 'Impacket', 'CrackMapExec'],
    tags: ['windows', 'ad', 'kerberos', 'domain', 'advanced'],
    environmentConfig: {
      instanceType: 't2.medium',
      ports: [22, 445, 389, 88, 3389],
    },
  },
  {
    title: 'Incident Response Fundamentals',
    description:
      'Practice real-world incident response procedures. Investigate a compromised system, collect evidence, and document findings following industry best practices.',
    difficulty: 'Medium',
    category: 'Blue Team',
    estimatedDuration: 75,
    objectives: [
      'Follow IR procedures',
      'Collect and preserve evidence',
      'Analyze system artifacts',
      'Write incident reports',
    ],
    tools: ['Autopsy', 'Volatility', 'KAPE', 'Timeline Explorer'],
    tags: ['dfir', 'forensics', 'incident', 'defense', 'investigation'],
    environmentConfig: {
      instanceType: 't2.small',
      ports: [22, 3389],
    },
  },
]

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/xploitverse'
    log.info('Connecting to MongoDB')

    await mongoose.connect(mongoUri)
    log.info('Connected to MongoDB')

    // Clear existing labs (optional - comment out to preserve existing)
    log.info('Clearing existing labs')
    await Lab.deleteMany({})

    // Insert new labs
    log.info('Seeding labs')
    const createdLabs = await Lab.insertMany(labs)

    log.info({ count: createdLabs.length }, 'Successfully seeded labs')
    createdLabs.forEach((lab, index) => {
      log.info(
        {
          index: index + 1,
          title: lab.title,
          difficulty: lab.difficulty,
          category: lab.category,
        },
        'Seeded lab',
      )
    })

    // Disconnect
    await mongoose.disconnect()
    log.info('Disconnected from MongoDB')
    log.info('Seeding complete')

    process.exit(0)
  } catch (error) {
    log.error({ err: error }, 'Seeding failed')
    process.exit(1)
  }
}

// Run the seeder
seedDatabase()
