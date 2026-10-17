import mongoose from 'mongoose'
import Course from '../course/course.model.js'
import Enrollment from './enrollment.model.js'

export const MAX_ENROLLMENT = 50

export const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

// Progress of one enrollment against the course's CURRENT lessons.
// (Lessons the teacher deleted later are ignored automatically.)
export const calcProgress = (course, enrollment) => {
  const lessons = course?.lessons || []
  const done = new Set((enrollment?.completedLessons || []).map(String))
  const completedLessonIds = lessons.map((l) => String(l._id)).filter((id) => done.has(id))
  const total = lessons.length
  const percent = total ? Math.round((completedLessonIds.length / total) * 100) : 0
  return { total, done: completedLessonIds.length, percent, completedLessonIds }
}

// Creates the enrollment and keeps Course.enrolledStudents in sync
// (the teacher pages still read that array).
export const enrollStudent = async (course, studentId) => {
  try {
    await Enrollment.create({ student: studentId, course: course._id })
  } catch (err) {
    if (err.code === 11000) return { created: false }
    throw err
  }
  await Course.updateOne({ _id: course._id }, { $addToSet: { enrolledStudents: studentId } })
  return { created: true }
}

// Runs once at startup. Anyone who was already in Course.enrolledStudents
// (enrolled before this feature existed) gets an Enrollment document.
export const backfillEnrollments = async () => {
  try {
    await Enrollment.init() // make sure the unique index exists
    const courses = await Course.find({ 'enrolledStudents.0': { $exists: true } }).select(
      'enrolledStudents createdAt'
    )
    const ops = []
    for (const c of courses) {
      for (const studentId of c.enrolledStudents) {
        ops.push({
          updateOne: {
            filter: { student: studentId, course: c._id },
            update: {
              $setOnInsert: {
                student: studentId,
                course: c._id,
                completedLessons: [],
                enrolledAt: c.createdAt || new Date(),
                lastAccessedAt: c.createdAt || new Date(),
              },
            },
            upsert: true,
          },
        })
      }
    }
    if (ops.length) {
      const res = await Enrollment.bulkWrite(ops, { ordered: false })
      if (res.upsertedCount) console.log(`Backfilled ${res.upsertedCount} enrollment(s)`)
    }
  } catch (err) {
    console.error('Enrollment backfill failed:', err.message)
  }
}
