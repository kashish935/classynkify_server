import express from 'express'
import multer  from 'multer'
import path    from 'path'
import { fileURLToPath } from 'url'
import { protect } from '../../middleware/auth.middleware.js'
import {
  createCourse,
  getTeacherCourses,
  getTeacherStudents,
  getStudentById,
  getStudentCourses,
  getStudentAssignments,
  getTeacherNotifications,
} from './teacher.controller.js'

// Resolve absolute path to uploads/ at server root
const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const uploadPath = path.join(__dirname, '../../../uploads')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

const router = express.Router()

// ── Courses ───────────────────────────────────────────────────────────────────
router.get('/courses',              protect, getTeacherCourses)
router.post('/courses',             protect, upload.single('thumbnail'), createCourse)

// ── Students ──────────────────────────────────────────────────────────────────
router.get('/students',                             protect, getTeacherStudents)
router.get('/students/:studentId',                  protect, getStudentById)
router.get('/students/:studentId/courses',          protect, getStudentCourses)
router.get('/students/:studentId/assignments',      protect, getStudentAssignments)

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications',        protect, getTeacherNotifications)

export default router