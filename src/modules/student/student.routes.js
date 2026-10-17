import express from 'express'
import { protect, requireRole } from '../../middleware/auth.middleware.js'
import { getDashboard, getNotifications } from './student.controller.js'

const router = express.Router()

router.get('/dashboard', protect, requireRole('student'), getDashboard)
router.get('/notifications', protect, requireRole('student'), getNotifications)

export default router
