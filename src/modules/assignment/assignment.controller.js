import Assignment from './assignment.model.js'
import Submission from './submission.model.js'
import Course from '../course/course.model.js'
import Enrollment from '../enrollment/enrollment.model.js'
import { isValidId } from '../enrollment/enrollment.service.js'
import {
  parseDueDate,
  isOpenForSubmission,
  loadStudentAssignments,
  teacherIdsForStudent,
} from './assignment.service.js'

const uid = (req) => req.user.id
const fail = (res, err) => res.status(500).json({ message: 'Server error', error: err.message })

/* ───────────────────────────── TEACHER ───────────────────────────── */

// Shape the teacher page expects: course {_id,title} + submissions[]
const teacherShape = (a, subs = []) => ({
  _id: a._id,
  title: a.title,
  description: a.description,
  course: a.course
    ? { _id: a.course._id, title: a.course.title }
    : { _id: 'other', title: a.courseName || 'General' },
  dueDate: a.dueDate,
  totalMarks: a.totalMarks,
  status: a.status,
  createdAt: a.createdAt,
  submissions: subs.map((s) => ({
    _id: s._id,
    student: { _id: s.student._id, name: s.student.name, email: s.student.email },
    submittedAt: s.submittedAt,
    content: s.content,
    grade: s.grade != null ? s.grade : null,
    feedback: s.feedback || '',
  })),
})

const findOwn = (req) =>
  isValidId(req.params.id)
    ? Assignment.findOne({ _id: req.params.id, teacher: uid(req) }).populate('course', 'title')
    : null

// GET /api/teacher/assignments
export const listTeacherAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacher: uid(req) })
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean()

    const subs = await Submission.find({ assignment: { $in: assignments.map((a) => a._id) } })
      .populate('student', 'name email')
      .sort({ submittedAt: -1 })
      .lean()

    const byAssignment = new Map()
    for (const s of subs) {
      if (!s.student) continue
      const key = String(s.assignment)
      if (!byAssignment.has(key)) byAssignment.set(key, [])
      byAssignment.get(key).push(s)
    }

    res.json({
      assignments: assignments.map((a) => teacherShape(a, byAssignment.get(String(a._id)) || [])),
    })
  } catch (err) {
    fail(res, err)
  }
}

// POST /api/teacher/assignments   { title, courseId, description, dueDate, totalMarks }
export const createAssignment = async (req, res) => {
  try {
    const { title, courseId, courseName, description, dueDate, totalMarks } = req.body

    if (!title?.trim()) return res.status(400).json({ message: 'Assignment title is required.' })
    if (!description?.trim()) return res.status(400).json({ message: 'Please add a description.' })

    // "other" = a general assignment labelled with a typed course name
    const isOther = courseId === 'other'
    if (isOther && !courseName?.trim()) {
      return res.status(400).json({ message: 'Please type the course name.' })
    }
    if (!isOther && !isValidId(courseId)) {
      return res.status(400).json({ message: 'Please select a course.' })
    }

    const due = parseDueDate(dueDate)
    if (!due) return res.status(400).json({ message: 'Please set a valid due date.' })

    const marks = totalMarks === undefined || totalMarks === '' ? 100 : Number(totalMarks)
    if (!Number.isFinite(marks) || marks < 1) {
      return res.status(400).json({ message: 'Total marks must be at least 1.' })
    }

    let course = null
    if (!isOther) {
      course = await Course.findOne({ _id: courseId, teacher: uid(req) }).select('title')
      if (!course) return res.status(404).json({ message: 'Course not found' })
    }

    const a = await Assignment.create({
      title: title.trim(),
      description: description.trim(),
      course: course ? course._id : null,
      courseName: isOther ? courseName.trim().slice(0, 80) : '',
      teacher: uid(req),
      dueDate: due,
      totalMarks: marks,
    })
    await a.populate('course', 'title')

    res.status(201).json({ assignment: teacherShape(a, []) })
  } catch (err) {
    fail(res, err)
  }
}

// PATCH /api/teacher/assignments/:id/status   { status: 'active' | 'closed' }
export const setAssignmentStatus = async (req, res) => {
  try {
    const a = await findOwn(req)
    if (!a) return res.status(404).json({ message: 'Assignment not found' })

    const { status } = req.body
    if (!['active', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be active or closed' })
    }
    a.status = status
    await a.save()
    res.json({ _id: a._id, status: a.status })
  } catch (err) {
    fail(res, err)
  }
}

// DELETE /api/teacher/assignments/:id
export const deleteAssignment = async (req, res) => {
  try {
    const a = await findOwn(req)
    if (!a) return res.status(404).json({ message: 'Assignment not found' })
    await Submission.deleteMany({ assignment: a._id })
    await a.deleteOne()
    res.json({ message: 'Assignment deleted' })
  } catch (err) {
    fail(res, err)
  }
}

// PUT /api/teacher/assignments/:id/submissions/:submissionId/grade   { grade, feedback }
export const gradeSubmission = async (req, res) => {
  try {
    const a = await findOwn(req)
    if (!a) return res.status(404).json({ message: 'Assignment not found' })
    if (!isValidId(req.params.submissionId)) {
      return res.status(404).json({ message: 'Submission not found' })
    }

    const grade = Number(req.body.grade)
    if (req.body.grade === '' || req.body.grade == null || !Number.isFinite(grade)) {
      return res.status(400).json({ message: 'Please enter a valid mark.' })
    }
    if (grade < 0 || grade > a.totalMarks) {
      return res.status(400).json({ message: `Marks must be between 0 and ${a.totalMarks}.` })
    }

    const sub = await Submission.findOneAndUpdate(
      { _id: req.params.submissionId, assignment: a._id },
      { $set: { grade, feedback: String(req.body.feedback || '').trim(), gradedAt: new Date() } },
      { new: true }
    ).lean()
    if (!sub) return res.status(404).json({ message: 'Submission not found' })

    res.json({ _id: sub._id, grade: sub.grade, feedback: sub.feedback })
  } catch (err) {
    fail(res, err)
  }
}

/* ───────────────────────────── STUDENT ───────────────────────────── */

// GET /api/student/assignments
export const listStudentAssignments = async (req, res) => {
  try {
    res.json({ assignments: await loadStudentAssignments(uid(req)) })
  } catch (err) {
    fail(res, err)
  }
}

// POST /api/student/assignments/:id/submit   { content }
export const submitAssignment = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(404).json({ message: 'Assignment not found' })

    const content = String(req.body.content || '').trim()
    if (!content) return res.status(400).json({ message: 'Please write your answer first.' })

    const a = await Assignment.findById(req.params.id)
    if (!a) return res.status(404).json({ message: 'Assignment not found' })

    // Course assignment → enrolled in that course.
    // General ("Other") assignment → enrolled in any course of that teacher.
    let allowed
    if (a.course) {
      allowed = await Enrollment.exists({ student: uid(req), course: a.course })
    } else {
      const { teacherIds } = await teacherIdsForStudent(uid(req))
      allowed = teacherIds.includes(String(a.teacher))
    }
    if (!allowed) return res.status(403).json({ message: 'This assignment is not available to you' })

    if (!isOpenForSubmission(a)) {
      return res.status(400).json({ message: 'This assignment is closed for submissions.' })
    }

    try {
      await Submission.create({ assignment: a._id, course: a.course || null, student: uid(req), content })
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'You have already submitted this assignment.' })
      }
      throw err
    }
    res.status(201).json({ message: 'Assignment submitted' })
  } catch (err) {
    fail(res, err)
  }
}

// GET /api/student/grades   (everything the student has submitted)
// score = percentage, marks/totalMarks = the raw numbers
export const listStudentGrades = async (req, res) => {
  try {
    const all = await loadStudentAssignments(uid(req))
    const grades = all
      .filter((a) => a.status === 'submitted' || a.status === 'graded')
      .sort((x, y) => new Date(y.submittedAt) - new Date(x.submittedAt))
      .map((a) => ({
        _id: a._id,
        assignmentTitle: a.title,
        course: a.course,
        submittedAt: a.submittedAt,
        marks: a.grade,
        totalMarks: a.totalMarks,
        score: a.grade != null ? Math.round((a.grade / a.totalMarks) * 100) : null,
        feedback: a.feedback,
      }))
    res.json({ grades })
  } catch (err) {
    fail(res, err)
  }
}
