import Enrollment from '../enrollment/enrollment.model.js'
import { calcProgress } from '../enrollment/enrollment.service.js'
import { courseCard } from '../course/course.controller.js'
import { loadStudentAssignments } from '../assignment/assignment.service.js'

const userId = (req) => req.user.id

const loadEnrollments = (studentId) =>
  Enrollment.find({ student: studentId })
    .populate({ path: 'course', populate: { path: 'teacher', select: 'name' } })
    .sort({ lastAccessedAt: -1 })
    .lean()

// ─── GET /api/student/dashboard ───────────────────────────
export const getDashboard = async (req, res) => {
  try {
    const enrollments = (await loadEnrollments(userId(req))).filter(
      (e) => e.course && e.course.isPublished
    )

    let completedLessons = 0
    let coursesCompleted = 0
    let coursesInProgress = 0

    const enrolledCourses = enrollments.map((e) => {
      const p = calcProgress(e.course, e)
      completedLessons += p.done
      if (p.total > 0 && p.done === p.total) coursesCompleted += 1
      else if (p.done > 0) coursesInProgress += 1
      return courseCard(e.course, e)
    })

    const assignments = await loadStudentAssignments(userId(req))
    const pendingAssignments = assignments.filter((a) => a.status === 'pending').length
    const graded = assignments.filter((a) => a.status === 'graded')
    const avgGrade = graded.length
      ? Math.round(graded.reduce((sum, a) => sum + (a.grade / a.totalMarks) * 100, 0) / graded.length)
      : null

    res.json({
      enrolledCourses,
      stats: {
        enrolled: enrolledCourses.length,
        completedLessons,
        coursesCompleted,
        coursesInProgress,
        pendingAssignments,
        avgGrade, // percentage, or null when nothing is graded yet
      },
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── GET /api/student/notifications ───────────────────────
// Built from real events: enrollments, new lessons, finished courses.
// (Read/unread is remembered by the frontend.)
export const getNotifications = async (req, res) => {
  try {
    const enrollments = (await loadEnrollments(userId(req))).filter((e) => e.course)
    const items = []

    for (const e of enrollments) {
      const course = e.course

      items.push({
        id: `enroll-${e._id}`,
        type: 'course',
        icon: '🎓',
        title: 'Enrolled successfully',
        message: `You enrolled in "${course.title}".`,
        link: `/student/courses/${course._id}`,
        createdAt: e.enrolledAt,
      })

      // Lesson _ids are Mongo ObjectIds, so they carry their creation time
      for (const l of course.lessons || []) {
        const added = l._id.getTimestamp()
        if (added > new Date(e.enrolledAt)) {
          items.push({
            id: `lesson-${l._id}`,
            type: 'course',
            icon: '📚',
            title: 'New lesson available',
            message: `"${l.title}" was added to ${course.title}.`,
            link: `/student/courses/${course._id}`,
            createdAt: added,
          })
        }
      }

      if (e.completedAt) {
        items.push({
          id: `done-${e._id}`,
          type: 'grade',
          icon: '🏆',
          title: 'Course completed',
          message: `You finished "${course.title}". Great work!`,
          link: `/student/courses/${course._id}`,
          createdAt: e.completedAt,
        })
      }
    }

    // Assignments: newly posted, and graded
    const assignments = await loadStudentAssignments(userId(req))
    const enrolledAt = new Map(enrollments.map((e) => [String(e.course._id), new Date(e.enrolledAt)]))
    const firstEnrolled = new Date(Math.min(...enrollments.map((e) => new Date(e.enrolledAt))))
    for (const a of assignments) {
      if (new Date(a.createdAt) > (enrolledAt.get(String(a.courseId)) || firstEnrolled)) {
        items.push({
          id: `assignment-${a._id}`,
          type: 'assignment',
          icon: '📋',
          title: 'New assignment',
          message: `"${a.title}" was posted in ${a.course}.`,
          link: '/student/assignments',
          createdAt: a.createdAt,
        })
      }
      if (a.status === 'graded') {
        items.push({
          id: `graded-${a._id}`,
          type: 'grade',
          icon: '🎯',
          title: 'Grade posted',
          message: `You scored ${a.grade}/${a.totalMarks} on "${a.title}".`,
          link: '/student/grades',
          createdAt: a.gradedAt || a.submittedAt,
        })
      }
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json({ notifications: items.slice(0, 20) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
