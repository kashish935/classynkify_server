import Assignment from './assignment.model.js'
import Submission from './submission.model.js'
import Enrollment from '../enrollment/enrollment.model.js'
import Course from '../course/course.model.js'

// "2026-10-26" -> end of that day in India time (the app is used in IST).
// Anything else the browser sends (full ISO string) is used as is.
export const parseDueDate = (value) => {
  if (!value) return null
  const str = String(value).trim()
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str)
    ? new Date(`${str}T23:59:59.999+05:30`)
    : new Date(str)
  return Number.isNaN(d.getTime()) ? null : d
}

export const isOpenForSubmission = (assignment) =>
  assignment.status === 'active' && new Date(assignment.dueDate) >= new Date()

// pending | submitted | graded | overdue  (what the student sees)
export const studentStatus = (assignment, submission) => {
  if (submission) return submission.grade != null ? 'graded' : 'submitted'
  return isOpenForSubmission(assignment) ? 'pending' : 'overdue'
}

// Teachers of every course the student is enrolled in.
// (General "Other" assignments from these teachers are visible to the student.)
export const teacherIdsForStudent = async (studentId) => {
  const enrollments = await Enrollment.find({ student: studentId }).select('course').lean()
  const courses = await Course.find({ _id: { $in: enrollments.map((e) => e.course) } })
    .select('teacher')
    .lean()
  return {
    courseIds: courses.map((c) => c._id),
    teacherIds: [...new Set(courses.map((c) => String(c.teacher)))],
  }
}

// Every assignment the student can see, with their own status
export const loadStudentAssignments = async (studentId) => {
  const { courseIds, teacherIds } = await teacherIdsForStudent(studentId)
  if (!courseIds.length) return []

  const assignments = await Assignment.find({
    $or: [
      { course: { $in: courseIds } },
      { course: null, teacher: { $in: teacherIds } },
    ],
  })
    .populate('course', 'title')
    .sort({ dueDate: 1 })
    .lean()

  const submissions = await Submission.find({
    student: studentId,
    assignment: { $in: assignments.map((a) => a._id) },
  }).lean()
  const subByAssignment = new Map(submissions.map((s) => [String(s.assignment), s]))

  return assignments.map((a) => {
    const sub = subByAssignment.get(String(a._id))
    return {
      _id: a._id,
      title: a.title,
      description: a.description,
      course: a.course ? a.course.title : a.courseName || 'General',
      courseId: a.course ? a.course._id : null,
      dueDate: a.dueDate,
      totalMarks: a.totalMarks,
      status: studentStatus(a, sub),
      submittedAt: sub?.submittedAt || null,
      content: sub?.content || '',
      grade: sub && sub.grade != null ? sub.grade : null,
      feedback: sub?.feedback || '',
      gradedAt: sub?.gradedAt || null,
      createdAt: a.createdAt,
    }
  })
}
