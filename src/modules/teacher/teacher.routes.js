import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { protect } from '../../middleware/auth.middleware.js'
import {
  getTeacherStudents,
  getStudentById,
  getStudentCourses,
  getStudentAssignments,
  getTeacherNotifications,
} from './teacher.controller.js'
import {
  createCourse,
  getTeacherCourses,
  getCourseById,
  updateCourseStatus,
  deleteCourse,
  addLesson,
  deleteLesson,
} from './course.manage.controller.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// <server root>/uploads (served as /uploads by the app)
const uploadDir = path.join(__dirname, '../../../uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, `${unique}${path.extname(file.originalname)}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

const router = express.Router()

// Courses
router.get('/courses',                          protect, getTeacherCourses)
router.post('/courses',                         protect, upload.single('thumbnail'), createCourse)
router.get('/courses/:id',                      protect, getCourseById)
router.patch('/courses/:id/status',             protect, updateCourseStatus)
router.delete('/courses/:id',                   protect, deleteCourse)
router.post('/courses/:id/lessons',             protect, addLesson)
router.delete('/courses/:id/lessons/:lessonId', protect, deleteLesson)

// Students
router.get('/students',                         protect, getTeacherStudents)
router.get('/students/:studentId',              protect, getStudentById)
router.get('/students/:studentId/courses',      protect, getStudentCourses)
router.get('/students/:studentId/assignments',  protect, getStudentAssignments)

// Notifications
router.get('/notifications',                    protect, getTeacherNotifications)

export default router