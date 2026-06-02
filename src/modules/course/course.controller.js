import Course from './course.model.js'

// ─── GET /api/student/courses ─────────────────────────────
// Browse all published courses
export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate('teacher', 'name email')
      .select('-lessons')          // don't send lesson content on listing
      .sort({ createdAt: -1 })

    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── GET /api/student/courses/enrolled ────────────────────
// Courses the logged-in student is already enrolled in
export const getEnrolledCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      enrolledStudents: req.user._id,
      isPublished: true,
    })
      .populate('teacher', 'name')
      .sort({ createdAt: -1 })

    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ─── POST /api/student/courses/:courseId/enroll ───────────
// Enroll logged-in student into a course
export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    const studentId = req.user._id

    const course = await Course.findById(courseId)
    if (!course)            return res.status(404).json({ message: 'Course not found' })
    if (!course.isPublished) return res.status(400).json({ message: 'Course is not available' })

    const alreadyEnrolled = course.enrolledStudents.some(
      (id) => id.toString() === studentId.toString()
    )
    if (alreadyEnrolled)   return res.status(400).json({ message: 'Already enrolled in this course' })

    course.enrolledStudents.push(studentId)
    await course.save()

    res.json({ message: 'Enrolled successfully', courseId: course._id })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}