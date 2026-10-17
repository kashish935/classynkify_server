import mongoose from 'mongoose'

// One document per (assignment, student)
const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null }, // null for general assignments
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    submittedAt: { type: Date, default: Date.now },

    // Filled in when the teacher grades it
    grade: { type: Number, default: null },
    feedback: { type: String, default: '' },
    gradedAt: { type: Date },
  },
  { timestamps: true }
)

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true })
submissionSchema.index({ student: 1 })

export default mongoose.model('Submission', submissionSchema)
