import mongoose from 'mongoose'

// One document per (student, course). This is the source of truth for
// "which student is enrolled in which course" and how far they have got.
const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    // _ids of the lessons (inside Course.lessons) the student has finished
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
    lastLesson: { type: mongoose.Schema.Types.ObjectId },

    enrolledAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

// A student can only be enrolled once per course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true })
enrollmentSchema.index({ course: 1 })

export default mongoose.model('Enrollment', enrollmentSchema)
