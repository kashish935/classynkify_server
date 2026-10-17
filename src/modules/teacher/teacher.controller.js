import Course from '../course/course.model.js'
import Enrollment from '../enrollment/enrollment.model.js'
import Assignment from '../assignment/assignment.model.js'
import Submission from '../assignment/submission.model.js'
import { calcProgress, isValidId } from '../enrollment/enrollment.service.js'

const teacherId = (req) => req.user.id

const serverError = (res, err) =>
  res.status(500).json({ message: 'Server error', error: err.message })

// Enrollments in this teacher's courses (student + course populated)
const loadTeacherEnrollments = async (req, extraFilter = {}) => {
  const courses = await Course.find({ teacher: teacherId(req) }).select(
    'title category tags lessons'
  )
  const courseMap = new Map(courses.map((c) => [String(c._id), c]))
  const enrollments = await Enrollment.find({
    course: { $in: courses.map((c) => c._id) },
    ...extraFilter,
  })
    .populate('student', 'name email createdAt')
    .lean()
  return { courseMap, enrollments: enrollments.filter((e) => e.student) }
}

// ── GET /api/teacher/students ─────────────────────────────────────────────────
// Every student enrolled in any of this teacher's courses
export const getTeacherStudents = async (req, res) => {
  try {
    const { courseMap, enrollments } = await loadTeacherEnrollments(req)

    const students = new Map()
    for (const e of enrollments) {
      const course = courseMap.get(String(e.course))
      if (!course) continue
      const id = String(e.student._id)

      if (!students.has(id)) {
        students.set(id, {
          _id: e.student._id,
          name: e.student.name,
          email: e.student.email,
          createdAt: e.student.createdAt,
          lastActive: e.lastAccessedAt,
          enrolledCourses: [],
          _percents: [],
        })
      }
      const s = students.get(id)
      s.enrolledCourses.push({ _id: course._id, title: course.title })
      s._percents.push(calcProgress(course, e).percent)
      if (e.lastAccessedAt && (!s.lastActive || e.lastAccessedAt > s.lastActive)) {
        s.lastActive = e.lastAccessedAt
      }
    }

    const result = [...students.values()].map(({ _percents, ...s }) => ({
      ...s,
      avgProgress: _percents.length
        ? Math.round(_percents.reduce((a, b) => a + b, 0) / _percents.length)
        : 0,
    }))

    res.json(result)
  } catch (err) {
    serverError(res, err)
  }
}

// ── GET /api/teacher/students/:studentId ──────────────────────────────────────
export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params
    if (!isValidId(studentId)) return res.status(404).json({ message: 'Student not found' })

    const { enrollments } = await loadTeacherEnrollments(req, { student: studentId })
    if (!enrollments.length) return res.status(404).json({ message: 'Student not found' })

    const student = enrollments[0].student
    const lastActive = enrollments
      .map((e) => e.lastAccessedAt)
      .filter(Boolean)
      .sort((a, b) => b - a)[0]

    res.json({
      _id: student._id,
      name: student.name,
      email: student.email,
      createdAt: student.createdAt,
      lastActive,
    })
  } catch (err) {
    serverError(res, err)
  }
}

// ── GET /api/teacher/students/:studentId/courses ──────────────────────────────
export const getStudentCourses = async (req, res) => {
  try {
    const { studentId } = req.params
    if (!isValidId(studentId)) return res.json([])

    const { courseMap, enrollments } = await loadTeacherEnrollments(req, { student: studentId })

    const result = enrollments
      .map((e) => {
        const course = courseMap.get(String(e.course))
        if (!course) return null
        const p = calcProgress(course, e)
        return {
          _id: course._id,
          title: course.title,
          subject: course.category || 'General',
          gradeLevel: course.tags?.[0] || '—',
          progress: p.percent,
          totalLectures: p.total,
          completedLectures: p.done,
          enrolledAt: e.enrolledAt,
        }
      })
      .filter(Boolean)

    res.json(result)
  } catch (err) {
    serverError(res, err)
  }
}

// ── GET /api/teacher/students/:studentId/assignments ──────────────────────────
// This teacher's assignments in the courses the student is enrolled in
export const getStudentAssignments = async (req, res) => {
  try {
    const { studentId } = req.params
    if (!isValidId(studentId)) return res.json([])

    const { enrollments } = await loadTeacherEnrollments(req, { student: studentId })
    if (!enrollments.length) return res.json([])

    // Course assignments for the student's courses + this teacher's general ones
    const assignments = await Assignment.find({
      teacher: teacherId(req),
      $or: [{ course: { $in: enrollments.map((e) => e.course) } }, { course: null }],
    })
      .populate('course', 'title')
      .sort({ dueDate: -1 })
      .lean()

    const subs = await Submission.find({
      student: studentId,
      assignment: { $in: assignments.map((a) => a._id) },
    }).lean()
    const subMap = new Map(subs.map((x) => [String(x.assignment), x]))

    res.json(
      assignments
        .map((a) => {
          const sub = subMap.get(String(a._id))
          return {
            _id: a._id,
            title: a.title,
            courseTitle: a.course ? a.course.title : a.courseName || 'General',
            dueDate: a.dueDate,
            totalMarks: a.totalMarks,
            submission: sub
              ? {
                  submittedAt: sub.submittedAt,
                  score: sub.grade != null ? sub.grade : null,
                  feedback: sub.feedback || '',
                }
              : null,
          }
        })
    )
  } catch (err) {
    serverError(res, err)
  }
}

// ── GET /api/teacher/notifications ───────────────────────────────────────────
// Latest enrollments and assignment submissions in this teacher's courses
export const getTeacherNotifications = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: teacherId(req) }).select('title')
    const courseIds = courses.map((c) => c._id)
    const myAssignmentIds = (await Assignment.find({ teacher: teacherId(req) }).select('_id').lean()).map((a) => a._id)

    const [enrollments, submissions] = await Promise.all([
      Enrollment.find({ course: { $in: courseIds } })
        .populate('student', 'name')
        .populate('course', 'title')
        .sort({ enrolledAt: -1 })
        .limit(10)
        .lean(),
      Submission.find({ assignment: { $in: myAssignmentIds } })
        .populate('student', 'name')
        .populate('assignment', 'title')
        .sort({ submittedAt: -1 })
        .limit(10)
        .lean(),
    ])

    const notifications = [
      ...enrollments
        .filter((e) => e.student && e.course)
        .map((e) => ({
          _id: e._id,
          type: 'enrollment',
          message: `${e.student.name} enrolled in "${e.course.title}"`,
          link: `/teacher/courses/${e.course._id}`,
          read: false,
          createdAt: e.enrolledAt,
        })),
      ...submissions
        .filter((x) => x.student && x.assignment)
        .map((x) => ({
          _id: x._id,
          type: 'submission',
          message: `${x.student.name} submitted "${x.assignment.title}"`,
          link: '/teacher/assignments',
          read: false,
          createdAt: x.submittedAt,
        })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)

    res.json({ notifications, unreadCount: notifications.length })
  } catch (err) {
    serverError(res, err)
  }
}
