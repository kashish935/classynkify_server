import mongoose from 'mongoose'

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // A real course, OR null for a general assignment ("Other") labelled by courseName
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    courseName: { type: String, trim: true, default: '' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Deadline instant (end of the chosen due date, India time)
    dueDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true, min: 1, default: 100 },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  { timestamps: true }
)

export default mongoose.model('Assignment', assignmentSchema)
