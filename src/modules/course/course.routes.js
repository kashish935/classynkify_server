import express from 'express'
import { protect } from '../../middleware/auth.middleware.js'
import {
  getAllCourses,
  getEnrolledCourses,
  enrollCourse,
} from './course.controller.js'

const router = express.Router()

// GET  /api/student/courses           → all published courses
router.get('/',          protect, getAllCourses)

// GET  /api/student/courses/enrolled  → courses student is enrolled in
// ⚠️  Must be defined BEFORE /:courseId to avoid route conflict
router.get('/enrolled',  protect, getEnrolledCourses)

// POST /api/student/courses/:courseId/enroll
router.post('/:courseId/enroll', protect, enrollCourse)

export default router