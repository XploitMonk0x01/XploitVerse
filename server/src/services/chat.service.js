import Lab from '../models/Lab.js'
import LabSession from '../models/LabSession.js'
import config from '../config/index.js'
import { ApiError } from '../middleware/error.middleware.js'
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('chat')

const MOCK_RESPONSES = {
  sql_injection: [
    "I see you're working on SQL Injection! Have you tried using a basic payload like `' OR 1=1 --`? This can bypass simple authentication.",
    'Remember, SQL injection vulnerabilities often occur when user input is directly concatenated into SQL queries. Look for login forms or search functionality.',
    'Try using `UNION SELECT` to extract data from other tables. First, determine the number of columns with `ORDER BY` clauses.',
    "Tools like SQLMap can automate the exploitation process. Try: `sqlmap -u 'http://target/page?id=1' --dbs`",
    "Don't forget to check for blind SQL injection - sometimes the results aren't directly visible but can be inferred from response times.",
  ],
  xss: [
    "Cross-Site Scripting (XSS) requires finding input fields that reflect your data back. Try `<script>alert('XSS')</script>`",
    'If basic script tags are filtered, try alternatives like `<img src=x onerror=alert(1)>` or `<svg onload=alert(1)>`',
    'Check for stored XSS in comment sections, profile fields, or anywhere user content is displayed to others.',
    'DOM-based XSS occurs in client-side code. Check the JavaScript for dangerous sinks like `innerHTML` or `eval()`.',
    "Use Burp Suite's scanner to identify potential XSS injection points automatically.",
  ],
  privilege_escalation: [
    'For Linux privilege escalation, start with `sudo -l` to see what commands you can run as root.',
    'Check for SUID binaries with `find / -perm -4000 2>/dev/null`. These can often be exploited for root access.',
    'Look for credentials in config files, `.bash_history`, or environment variables.',
    'LinPEAS is an excellent enumeration script. Run it to discover potential privilege escalation vectors.',
    'Check for vulnerable kernel versions with `uname -a` and search for known exploits on exploit-db.',
  ],
  network: [
    'Start with reconnaissance! Use `nmap -sC -sV target` to discover services and versions.',
    'For network traffic analysis, use Wireshark filters like `http.request.method == POST` to find interesting traffic.',
    'Check for open ports that might have default credentials - databases, admin panels, etc.',
    'Use `netstat -tuln` to see what services are listening on the local machine.',
    'ARP spoofing with tools like arpspoof can help intercept traffic in a local network.',
  ],
  default: [
    "I'm your AI Mentor! I'm here to guide you through this cybersecurity challenge. What specific aspect are you stuck on?",
    'Remember the methodology: Reconnaissance -> Scanning -> Exploitation -> Post-Exploitation -> Reporting.',
    'Take notes as you go! Documentation is crucial in penetration testing.',
    'If you\'re stuck, try to think like the developer who built the vulnerable system. What mistakes might they have made?',
    "The 'OWASP Top 10' is a great reference for web application vulnerabilities. Review it for common attack vectors.",
  ],
}

const getLabContext = async (sessionId, labId) => {
  try {
    let lab = null

    if (labId) {
      lab = await Lab.findById(labId)
    } else if (sessionId) {
      const session = await LabSession.findById(sessionId).populate('lab')
      lab = session?.lab
    }

    if (lab) {
      return {
        labName: lab.title,
        category: lab.category,
        difficulty: lab.difficulty,
        objectives: lab.objectives,
        tools: lab.tools,
        description: lab.description,
      }
    }

    return null
  } catch (error) {
    log.error({ err: error.message }, 'Error fetching lab context')
    return null
  }
}

const generateSystemPrompt = (labContext) => {
  const basePrompt = `You are a Cybersecurity Mentor and ethical hacking instructor for XploitVerse, 
an interactive cybersecurity training platform. Your role is to guide students through hands-on 
security challenges while teaching them important concepts.

IMPORTANT RULES:
1. NEVER solve the challenge for the student - provide hints and guidance only
2. Explain concepts clearly and encourage learning
3. If they seem stuck, break down the problem into smaller steps
4. Emphasize ethical hacking principles and legal considerations
5. Suggest relevant tools and techniques without giving away the exact solution
6. Be encouraging and supportive`

  if (labContext) {
    return `${basePrompt}

CURRENT LAB CONTEXT:
- Lab Name: ${labContext.labName}
- Category: ${labContext.category}
- Difficulty: ${labContext.difficulty}
- Description: ${labContext.description}
${
  labContext.objectives
    ? `- Objectives:\n  ${labContext.objectives.join('\n  ')}`
    : ''
}
${labContext.tools ? `- Available Tools: ${labContext.tools.join(', ')}` : ''}

Tailor your responses to this specific lab challenge. Help the student understand the concepts 
while working through this ${labContext.category} exercise.`
  }

  return basePrompt
}

const getMockResponse = (labContext, userMessage) => {
  let category = 'default'

  if (labContext?.category) {
    const cat = labContext.category.toLowerCase()
    if (cat.includes('sql') || cat.includes('injection')) {
      category = 'sql_injection'
    } else if (cat.includes('xss') || cat.includes('cross-site')) {
      category = 'xss'
    } else if (cat.includes('privilege') || cat.includes('escalation')) {
      category = 'privilege_escalation'
    } else if (cat.includes('network') || cat.includes('traffic')) {
      category = 'network'
    }
  }

  const msg = userMessage.toLowerCase()
  if (msg.includes('sql') || msg.includes('injection') || msg.includes('database')) {
    category = 'sql_injection'
  } else if (msg.includes('xss') || msg.includes('script') || msg.includes('cross-site')) {
    category = 'xss'
  } else if (msg.includes('privilege') || msg.includes('root') || msg.includes('admin')) {
    category = 'privilege_escalation'
  } else if (msg.includes('nmap') || msg.includes('network') || msg.includes('port')) {
    category = 'network'
  }

  const responses = MOCK_RESPONSES[category]
  return responses[Math.floor(Math.random() * responses.length)]
}

const callOpenAI = async (systemPrompt, userMessage, conversationHistory) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.ai.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

const callAnthropic = async (systemPrompt, userMessage, conversationHistory) => {
  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.ai.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()
  return data.content[0].text
}

export const generateMentorResponse = async ({
  message,
  sessionId,
  labId,
  conversationHistory = [],
}) => {
  if (!message || message.trim().length === 0) {
    throw new ApiError('Message is required', 400)
  }

  const labContext = await getLabContext(sessionId, labId)
  const systemPrompt = generateSystemPrompt(labContext)

  let aiResponse
  let provider = 'mock'

  try {
    if (config.ai?.openaiKey) {
      aiResponse = await callOpenAI(systemPrompt, message, conversationHistory)
      provider = 'openai'
    } else if (config.ai?.anthropicKey) {
      aiResponse = await callAnthropic(systemPrompt, message, conversationHistory)
      provider = 'anthropic'
    } else {
      aiResponse = getMockResponse(labContext, message)
      provider = 'mock'
    }
  } catch (error) {
    log.error({ err: error.message }, 'AI API error')
    aiResponse = getMockResponse(labContext, message)
    provider = 'mock (fallback)'
  }

  return {
    response: aiResponse,
    provider,
    labContext,
  }
}

export const getMentorSuggestions = async ({ sessionId, labId }) => {
  const labContext = await getLabContext(sessionId, labId)

  const suggestions = [
    'What should I try first?',
    'Can you explain the vulnerability type?',
    'What tools should I use?',
    "I'm stuck, can you give me a hint?",
    'How do I approach this challenge?',
  ]

  if (labContext) {
    const categorySpecific = {
      'Red Team': [
        'How do I enumerate this target?',
        "What's the best exploitation technique?",
        'How can I maintain persistence?',
      ],
      'Blue Team': [
        'What indicators should I look for?',
        'How do I analyze this log file?',
        "What's the best detection strategy?",
      ],
    }

    const additional = categorySpecific[labContext.category] || []
    suggestions.push(...additional)
  }

  return {
    suggestions: suggestions.slice(0, 6),
    labContext,
  }
}

export default {
  generateMentorResponse,
  getMentorSuggestions,
}
