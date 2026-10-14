import Course from '../course/course.model.js'

// ── POST /api/teacher/courses ─────────────────────────────────────────────────
export const createCourse = async (req, res) => {
  try {
    // Accept both schema names (category) and legacy form names (subject/grade/duration/language)
    const { title, description, subject, grade, duration, language, category, price, isFree, tags } = req.body

    if (!title?.trim())       return res.status(400).json({ message: 'Course title is required.' })
    if (!description?.trim()) return res.status(400).json({ message: 'Please add a description.' })
    // FIX: removed   if (!subject)  and  if (!grade)  guards — neither field exists in courseSchema.
    // courseSchema uses 'category' (String, default 'General').  We accept either name from the form.

    // Map subject → category; pack grade/language into tags so no data is lost
    const resolvedCategory = (category || subject || 'General').trim()

    const baseTags = tags
      ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
      : []
    const extraTags = [grade, language].filter(Boolean).map(v => String(v).trim())
    const resolvedTags = [...new Set([...extraTags, ...baseTags])]

    const course = await Course.create({
      title:       title.trim(),
      description: description.trim(),
      teacher:     req.user._id,
      thumbnail:   req.file ? `/uploads/${req.file.filename}` : '',
      category:    resolvedCategory,                  // FIX: was 'subject' (not in schema)
      price:       price ? Number(price) : 0,
      isFree:      isFree === 'true' || isFree === true || !Number(price),
      tags:        resolvedTags,                      // FIX: was 'grade'/'duration'/'language' (not in schema)
      isPublished: false,
    })

    res.status(201).json({ message: 'Course created successfully', course })
  } catch (err) {
    console.error('createCourse error:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ── GET /api/teacher/courses ──────────────────────────────────────────────────
export const getTeacherCourses = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id })
      .sort({ createdAt: -1 })
    res.json({ courses })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ── GET /api/teacher/students ─────────────────────────────────────────────────
export const getTeacherStudents = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id })
      .populate('enrolledStudents', 'name email createdAt lastActive')

    const studentMap = new Map()
    for (const course of courses) {
      for (const student of course.enrolledStudents) {
        const id = student._id.toString()
        if (!studentMap.has(id)) {
          studentMap.set(id, { ...student.toObject(), enrolledCourses: [] })
        }
        studentMap.get(id).enrolledCourses.push({ _id: course._id, title: course.title })
      }
    }

    res.json([...studentMap.values()])
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ── GET /api/teacher/students/:studentId ──────────────────────────────────────
export const getStudentById = async (req, res) => {
  try {
    const course = await Course.findOne({
      teacher:          req.user._id,
      enrolledStudents: req.params.studentId,
    }).populate('enrolledStudents', 'name email createdAt lastActive')

    if (!course) return res.status(404).json({ message: 'Student not found' })

    const student = course.enrolledStudents.find(
      s => s._id.toString() === req.params.studentId
    )
    if (!student) return res.status(404).json({ message: 'Student not found' })

    res.json(student)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ── GET /api/teacher/students/:studentId/courses ──────────────────────────────
export const getStudentCourses = async (req, res) => {
  try {
    const courses = await Course.find({
      teacher:          req.user._id,
      enrolledStudents: req.params.studentId,
    }).select('title category tags')   // FIX: was 'title subject grade' — neither exists in schema

    const result = courses.map(c => ({
      _id:        c._id,
      title:      c.title,
      subject:    c.category  || 'General', // FIX: schema field is 'category'; was c.subject (undefined)
      gradeLevel: c.tags?.[0] || '—',       // FIX: grade packed into tags[0]; was c.grade (undefined)
      progress:   0,
    }))

    res.json(result)
  } catch (err) {
    console.error('getStudentCourses error:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ── GET /api/teacher/students/:studentId/assignments ──────────────────────────
export const getStudentAssignments = async (req, res) => {
  try {
    res.json([])
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// ── GET /api/teacher/notifications ───────────────────────────────────────────
export const getTeacherNotifications = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id })
      .select('title enrolledStudents createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10)

    const notifications = courses.map(c => ({
      _id:       c._id,
      type:      'enrollment',
      message:   `${c.enrolledStudents.length} student${c.enrolledStudents.length !== 1 ? 's' : ''} enrolled in "${c.title}"`,
      link:      `/teacher/courses/${c._id}`,
      read:      false,
      createdAt: c.updatedAt || c.createdAt,
    }))

    res.json({ notifications, unreadCount: notifications.length })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}