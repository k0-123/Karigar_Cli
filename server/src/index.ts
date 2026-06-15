import express from 'express'
import { pool } from './pool'
import { chatHandler, healthHandler, metricsHandler } from './handler'

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? 'localhost'

const app = express()
app.use(express.json({ limit: '10mb' }))

// Routes
app.post('/v1/chat', chatHandler)
app.get('/health', healthHandler)
app.get('/metrics', metricsHandler)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  pool.stopHealthChecks()
  server.close(() => process.exit(0))
})

const configured = [
  process.env.COLAB_BASEURL,
  process.env.KAGGLE_BASEURL,
  process.env.ORACLE_BASEURL,
  process.env.LIGHTNING_CPU_BASEURL,
].filter(Boolean)

if (configured.length === 0) {
  console.warn('⚠  No worker URLs configured — nodes will use localhost fallbacks.')
  console.warn('   Set at least one: COLAB_BASEURL, KAGGLE_BASEURL, ORACLE_BASEURL')
} else {
  console.log(`✓  ${configured.length} provider(s) configured`)
}

const server = app.listen(PORT, HOST, () => {
  console.log(`Karigar server listening on http://${HOST}:${PORT}`)
  console.log(`POST /v1/chat — route requests to model fleet`)
  console.log(`GET  /health — health status of all nodes`)
  console.log(`GET  /metrics — performance metrics per node`)
  pool.startHealthChecks()
})
