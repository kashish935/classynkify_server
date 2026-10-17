import express from 'express'
import { protect, requireRole } from '../../middleware/auth.middleware.js'
import {
  listTeacherAssignments,
  createAssignment,
  setAssignmentStatus,
  deleteAssignment,
  gradeSubmission,
  listStudentAssignments,
  submitAssignment,
  listStudentGrades,
} from './assignment.controller.js'

// Mounted at /api/teacher
export const teacherAssignmentRoutes = express.Router()
teacherAssignmentRoutes.use('/assignments', protect, requireRole('teacher'))
teacherAssignmentRoutes.get('/assignments', listTeacherAssignments)
teacherAssignmentRoutes.post('/assignments', createAssignment)
teacherAssignmentRoutes.patch('/assignments/:id/status', setAssignmentStatus)
teacherAssignmentRoutes.delete('/assignments/:id', deleteAssignment)
teacherAssignmentRoutes.put('/assignments/:id/submissions/:submissionId/grade', gradeSubmission)

// Mounted at /api/student
export const studentAssignmentRoutes = express.Router()
studentAssignmentRoutes.use(['/assignments', '/grades'], protect, requireRole('student'))
studentAssignmentRoutes.get('/assignments', listStudentAssignments)
studentAssignmentRoutes.post('/assignments/:id/submit', submitAssignment)
studentAssignmentRoutes.get('/grades', listStudentGrades)
