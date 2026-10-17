import Course from '../course/course.model.js'

const sendError = (res, err) => {
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'Course not found' })
  }
  return res.status(500).json({ message: err.message })
}

const findOwnCourse = (req) =>
  Course.findOne({ _id: req.params.id, teacher: req.user.id })

const respondWithCourse = async (res, course, status = 200) => {
  await course.populate('enrolledStudents', 'name email')
  res.status(status).json({ course })
}

export const createCourse = async (req, res) => {
  try {
    const { title, description, subject, category, grade, language } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' })
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' })
    }

    const tags = [
      ...new Set([grade, language].filter(Boolean).map((t) => String(t).trim())),
    ]

    const course = await Course.create({
      title: title.trim(),
      description: description.trim(),
      teacher: req.user.id,
      thumbnail: req.file ? `/uploads/${req.file.filename}` : '',
      category: String(category || subject || 'other').trim(),
      tags,
      price: 0,
      isFree: true,
      isPublished: false,
    })

    res.status(201).json({ message: 'Course created successfully', course })
  } catch (err) {
    sendError(res, err)
  }
}

export const getTeacherCourses = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user.id }).sort({ createdAt: -1 })
    res.status(200).json({ courses })
  } catch (err) {
    sendError(res, err)
  }
}

export const getCourseById = async (req, res) => {
  try {
    const course = await findOwnCourse(req)
    if (!course) return res.status(404).json({ message: 'Course not found' })
    await respondWithCourse(res, course)
  } catch (err) {
    sendError(res, err)
  }
}

export const updateCourseStatus = async (req, res) => {
  try {
    const course = await findOwnCourse(req)
    if (!course) return res.status(404).json({ message: 'Course not found' })
    course.isPublished = Boolean(req.body.isPublished)
    await course.save()
    await respondWithCourse(res, course)
  } catch (err) {
    sendError(res, err)
  }
}

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      teacher: req.user.id,
    })
    if (!course) return res.status(404).json({ message: 'Course not found' })
    res.status(200).json({ message: 'Course deleted successfully' })
  } catch (err) {
    sendError(res, err)
  }
}

export const addLesson = async (req, res) => {
  try {
    const course = await findOwnCourse(req)
    if (!course) return res.status(404).json({ message: 'Course not found' })

    const { title, description, videoUrl, duration } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Lecture title is required' })
    }
    if (!videoUrl || !/^https?:\/\//i.test(videoUrl.trim())) {
      return res.status(400).json({ message: 'A valid video URL (starting with http) is required' })
    }

    course.lessons.push({
      title: title.trim(),
      description: (description || '').trim(),
      videoUrl: videoUrl.trim(),
      duration: Number(duration) > 0 ? Number(duration) : 0,
      order: course.lessons.length + 1,
    })
    await course.save()
    await respondWithCourse(res, course, 201)
  } catch (err) {
    sendError(res, err)
  }
}

export const deleteLesson = async (req, res) => {
  try {
    const course = await findOwnCourse(req)
    if (!course) return res.status(404).json({ message: 'Course not found' })

    const lesson = course.lessons.id(req.params.lessonId)
    if (!lesson) return res.status(404).json({ message: 'Lecture not found' })

    course.lessons.pull(req.params.lessonId)
    await course.save()
    await respondWithCourse(res, course)
  } catch (err) {
    sendError(res, err)
  }
}