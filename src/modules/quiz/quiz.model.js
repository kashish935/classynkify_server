import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  question:     { type: String, required: true },
  options:      { type: [String], required: true },          // always 4
  correctIndex: { type: Number, required: true, min: 0, max: 3 }, // never sent to the client before submit
  explanation:  { type: String, default: '' },
})

// One document per generated quiz. A quiz can be submitted once;
// taking another quiz means generating a new one.
const quizSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    topic:      { type: String, default: '' },
    scope:      { type: String, enum: ['all', 'completed'], default: 'all' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

    questions: [questionSchema],

    status:      { type: String, enum: ['pending', 'submitted'], default: 'pending' },
    answers:     { type: [Number], default: [] }, // chosen option per question, -1 = unanswered
    score:       { type: Number },
    submittedAt: { type: Date },
  },
  { timestamps: true }
)

quizSchema.index({ student: 1, createdAt: -1 })

export default mongoose.model('Quiz', quizSchema)