const fs = require('fs')
const path = require('path')

function loadConfigFromFile() {
  const configPath = path.join(__dirname, 'config.json')

  if (!fs.existsSync(configPath)) {
    throw new Error('Config file not found')
  }

  const raw = fs.readFileSync(configPath)
  return JSON.parse(raw)
}

function loadConfigFromEnv() {
  return {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    mode: process.env.MODE,
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : undefined
  }
}

function loadConfigFromCLI() {
  const args = process.argv.slice(2)
  const config = {}
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      if (key === 'port') config.port = Number(value)
      if (key === 'mode') config.mode = value
      if (key === 'allowedOrigins') config.allowedOrigins = value.split(',')
    }
  })
  
  return config
}

function validateConfig(config) {
  if (!config.port || isNaN(config.port)) {
    throw new Error('Port is required and must be a number')
  }

  if (config.port < 1 || config.port > 65535) {
    throw new Error('Port must be between 1 and 65535')
  }

  if (!config.mode || !['dev', 'prod'].includes(config.mode)) {
    throw new Error('Mode must be dev or prod')
  }

  if (!Array.isArray(config.allowedOrigins)) {
    throw new Error('allowedOrigins must be an array')
  }
}

module.exports = {
  loadConfigFromFile,
  loadConfigFromEnv,
  loadConfigFromCLI,
  validateConfig
}