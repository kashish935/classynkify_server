import * as quizService from './quiz.service.js'

// The JWT payload is put on req.user by the protect middleware.
// Accepts the common id field names so it works whichever one your login signs.
const getStudentId = (req) => req.user?.id || req.user?._id || req.user?.userId

const sendError = (res, err, fallback) => {
  if (err instanceof quizService.HttpError) {
    return res.status(err.status).json({ message: err.message })
  }
  console.error('Quiz error:', err.message)
  return res.status(500).json({ message: fallback })
}

export const generate = async (req, res) => {
  try {
    const studentId = getStudentId(req)
    if (!studentId) return res.status(401).json({ message: 'Invalid token' })

    const { courseId, topic, scope, difficulty, count } = req.body
    if (!courseId) return res.status(400).json({ message: 'Please choose a course.' })

    const quiz = await quizService.generateQuiz({ studentId, courseId, topic, scope, difficulty, count })
    res.status(201).json({ quiz: quizService.sanitizeQuiz(quiz) })
  } catch (err) {
    sendError(res, err, 'Could not generate the quiz. Please try again.')
  }
}

export const submit = async (req, res) => {
  try {
    const studentId = getStudentId(req)
    if (!studentId) return res.status(401).json({ message: 'Invalid token' })

    const result = await quizService.submitQuiz({
      studentId,
      quizId: req.params.id,
      answers: req.body.answers,
    })
    res.json(result)
  } catch (err) {
    sendError(res, err, 'Could not submit the quiz. Please try again.')
  }
}

export const history = async (req, res) => {
  try {
    const studentId = getStudentId(req)
    if (!studentId) return res.status(401).json({ message: 'Invalid token' })

    res.json({ history: await quizService.getHistory(studentId) })
  } catch (err) {
    sendError(res, err, 'Could not load quiz history.')
  }
}