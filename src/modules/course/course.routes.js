import express from 'express'
import { protect, requireRole } from '../../middleware/auth.middleware.js'
import {
  getAllCourses,
  getEnrolledCourses,
  enrollCourse,
  getCoursePlayer,
  setLessonComplete,
} from './course.controller.js'

const router = express.Router()

router.use(protect, requireRole('student'))

// GET  /api/student/courses           → all published courses
router.get('/', getAllCourses)

// GET  /api/student/courses/enrolled  → courses student is enrolled in
// ⚠️  Must be defined BEFORE /:courseId to avoid route conflict
router.get('/enrolled', getEnrolledCourses)

// POST /api/student/courses/:courseId/enroll
router.post('/:courseId/enroll', enrollCourse)

// POST /api/student/courses/:courseId/lessons/:lessonId/complete
router.post('/:courseId/lessons/:lessonId/complete', setLessonComplete)

// GET  /api/student/courses/:courseId → course + lessons + my progress
router.get('/:courseId', getCoursePlayer)

export default router
