const express = require('express')
const {
  loadConfigFromFile,
  loadConfigFromEnv,
  loadConfigFromCLI,
  validateConfig
} = require('./config')


const fileConfig = loadConfigFromFile()
const envConfig = loadConfigFromEnv()
const cliConfig = loadConfigFromCLI()
const rateLimitMap = new Map()

function removeUndefined(obj) {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

// Объединяем, фильтруя undefined
const config = {
  ...fileConfig,
  ...removeUndefined(envConfig),
  ...removeUndefined(cliConfig)
}


validateConfig(config)

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress
  const now = Date.now()

  const limit = config.rateLimit?.max || 5
  const windowMs = config.rateLimit?.windowMs || 60000

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, [])
  }

  const timestamps = rateLimitMap.get(ip)

  
  const filtered = timestamps.filter(ts => now - ts < windowMs)

  filtered.push(now)
  rateLimitMap.set(ip, filtered)

  if (filtered.length > limit) {
    return res.status(429).send('Too Many Requests')
  }

  next()
}

const securityHeaders = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'no-store')

  next()
}

const checkOrigin = (req, res, next) => {
  const origin = req.headers.origin

  if (!origin) {
    return next()
  }

  if (!config.allowedOrigins.includes(origin)) {
    return res.status(403).send('Forbidden: origin not allowed')
  }

  next()
}

const app = express()
app.use(checkOrigin)
app.use(rateLimiter)
app.use(securityHeaders)

const logger = (req, res, next) => {
  if (config.mode === 'dev') {
    console.log(`[DEV LOG] ${req.method} ${req.url}`)
  }

  next()
}

app.use(logger)

app.use((err, req, res, next) => {
  console.error(err)

  if (config.mode === 'dev') {
    return res.status(500).json({
      message: err.message,
      stack: err.stack
    })
  }

  return res.status(500).json({
    message: 'Internal Server Error'
  })
})

app.get('/', (req, res) => {
  res.send('Flower shop API is running 🌸')
})

app.get('/flowers', (req, res) => {
  res.json([
    { id: 1, name: 'Rose', price: 10 },
    { id: 2, name: 'Tulip', price: 7 }
  ])
})

app.listen(config.port, () => {
  console.log(`Server started on port ${config.port}`)
  console.log(`Mode: ${config.mode || 'default'}`)
})