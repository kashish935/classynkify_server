import express from 'express'
import { protect, requireRole } from '../../middleware/auth.middleware.js'
import { generate, submit, history } from './quiz.controller.js'

const router = express.Router()

// Mounted at /api/student/quiz in app.js
router.post('/generate', protect, requireRole('student'), generate)
router.get('/history', protect, requireRole('student'), history)
router.post('/:id/submit', protect, requireRole('student'), submit)

export default router