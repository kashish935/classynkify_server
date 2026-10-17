import Course from './course.model.js'
import Enrollment from '../enrollment/enrollment.model.js'
import {
  MAX_ENROLLMENT,
  calcProgress,
  enrollStudent,
  isValidId,
} from '../enrollment/enrollment.service.js'

const userId = (req) => req.user.id

// Card/list shape shared by browse, my-courses and dashboard.
// Never exposes other students' ids or lesson video URLs.
export const courseCard = (course, enrollment = null) => {
  const lessons = course.lessons || []
  const teacher = course.teacher && course.teacher._id ? course.teacher : null
  const card = {
    _id: course._id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail || '',
    category: course.category,
    tags: course.tags || [],
    price: course.price || 0,
    isFree: course.isFree,
    instructor: teacher ? teacher.name : 'Instructor',
    instructorId: teacher ? teacher._id : null,
    lessonCount: lessons.length,
    totalMinutes: lessons.reduce((sum, l) => sum + (l.duration || 0), 0),
    enrolledCount: (course.enrolledStudents || []).length,
    isEnrolled: Boolean(enrollment),
    createdAt: course.createdAt,
  }
  if (enrollment) {
    const p = calcProgress(course, enrollment)
    card.progress = p.percent
    card.completedLessons = p.done
    card.enrolledAt = enrollment.enrolledAt
    card.lastAccessedAt = enrollment.lastAccessedAt
    card.completedAt = enrollment.completedAt || null
  }
  return card
}

// ─── GET /api/student/courses ─────────────────────────────
// Browse all published courses (with "am I enrolled?" for this student)
export const getAllCourses = async (req, res) => {
  try {
    const [courses, enrollments] = await Promise.all([
      Course.find({ isPublished: true })
        .populate('teacher', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      Enrollment.find({ student: userId(req) }).lean(),
    ])
    const byCourse = new Map(enrollments.map((e) => [String(e.course), e]))

    res.json({ courses: courses.map((c) => courseCard(c, byCourse.get(String(c._id)))) })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── GET /api/student/courses/enrolled ────────────────────
// Courses the logged-in student is enrolled in, with progress
export const getEnrolledCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: userId(req) })
      .populate({ path: 'course', populate: { path: 'teacher', select: 'name' } })
      .sort({ lastAccessedAt: -1 })
      .lean()

    const courses = enrollments
      .filter((e) => e.course && e.course.isPublished)
      .map((e) => courseCard(e.course, e))

    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── POST /api/student/courses/:courseId/enroll ───────────
export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    if (!isValidId(courseId)) return res.status(404).json({ message: 'Course not found' })

    const course = await Course.findById(courseId)
    if (!course) return res.status(404).json({ message: 'Course not found' })
    if (!course.isPublished) return res.status(400).json({ message: 'Course is not available' })

    const already = await Enrollment.exists({ student: userId(req), course: course._id })
    if (already) return res.status(400).json({ message: 'Already enrolled in this course' })

    if (course.enrolledStudents.length >= MAX_ENROLLMENT) {
      return res.status(400).json({ message: 'This course is full' })
    }

    const { created } = await enrollStudent(course, userId(req))
    if (!created) return res.status(400).json({ message: 'Already enrolled in this course' })

    res.status(201).json({ message: 'Enrolled successfully', courseId: course._id })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── GET /api/student/courses/:courseId ───────────────────
// Full course (with lessons) for the player. Enrolled students only.
export const getCoursePlayer = async (req, res) => {
  try {
    const { courseId } = req.params
    if (!isValidId(courseId)) return res.status(404).json({ message: 'Course not found' })

    const course = await Course.findById(courseId).populate('teacher', 'name').lean()
    if (!course || !course.isPublished) {
      return res.status(404).json({ message: 'Course not found' })
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { student: userId(req), course: course._id },
      { $set: { lastAccessedAt: new Date() } },
      { new: true }
    ).lean()
    if (!enrollment) {
      return res.status(403).json({ message: 'Please enroll in this course first' })
    }

    const lessons = (course.lessons || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((l) => ({
        _id: l._id,
        title: l.title,
        description: l.description || '',
        videoUrl: l.videoUrl || '',
        duration: l.duration || 0,
        order: l.order || 0,
      }))

    const p = calcProgress(course, enrollment)

    res.json({
      course: {
        _id: course._id,
        title: course.title,
        description: course.description,
        instructor: course.teacher?.name || 'Instructor',
        category: course.category,
        lessons,
      },
      completedLessonIds: p.completedLessonIds,
      progress: p.percent,
      lastLessonId: enrollment.lastLesson || null,
    })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── POST /api/student/courses/:courseId/lessons/:lessonId/complete ───
// body: { completed: true | false }
export const setLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params
    if (!isValidId(courseId) || !isValidId(lessonId)) {
      return res.status(404).json({ message: 'Lesson not found' })
    }

    const course = await Course.findById(courseId).select('lessons isPublished').lean()
    if (!course) return res.status(404).json({ message: 'Course not found' })
    if (!course.lessons.some((l) => String(l._id) === lessonId)) {
      return res.status(404).json({ message: 'Lesson not found' })
    }

    const completed = req.body?.completed !== false // default: mark complete

    const update = {
      $set: { lastAccessedAt: new Date(), lastLesson: lessonId },
      ...(completed
        ? { $addToSet: { completedLessons: lessonId } }
        : { $pull: { completedLessons: lessonId } }),
    }

    let enrollment = await Enrollment.findOneAndUpdate(
      { student: userId(req), course: courseId },
      update,
      { new: true }
    ).lean()
    if (!enrollment) {
      return res.status(403).json({ message: 'Please enroll in this course first' })
    }

    const p = calcProgress(course, enrollment)

    // Stamp / clear the course-completed date
    const finished = p.total > 0 && p.done === p.total
    if (finished && !enrollment.completedAt) {
      await Enrollment.updateOne({ _id: enrollment._id }, { $set: { completedAt: new Date() } })
    } else if (!finished && enrollment.completedAt) {
      await Enrollment.updateOne({ _id: enrollment._id }, { $unset: { completedAt: 1 } })
    }

    res.json({ completedLessonIds: p.completedLessonIds, progress: p.percent, courseCompleted: finished })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
