import mongoose from 'mongoose'

// One document per (assignment, student).
const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    course:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    student:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // The student sends text, photos, or both
    content: { type: String, default: '' },
    images:  { type: [String], default: [] }, // public paths like /uploads/assignments/answers/ab12.jpg

    submittedAt: { type: Date, default: Date.now },

    // Filled in by the teacher
    grade:    { type: Number, default: null },
    feedback: { type: String, default: '' },
    gradedAt: { type: Date },
  },
  { timestamps: true }
)

// A student can only submit once per assignment (the controller relies on error code 11000)
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true })
submissionSchema.index({ student: 1 })

export default mongoose.model('Submission', submissionSchema)