import mongoose from 'mongoose'

const lessonSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  videoUrl:    { type: String, default: '' },
  duration:    { type: Number, default: 0 }, // minutes
  order:       { type: Number, default: 0 },
})

const courseSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true },
    teacher:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    thumbnail:   { type: String, default: '' },
    category:    { type: String, default: 'General' },
    price:       { type: Number, default: 0 },
    isFree:      { type: Boolean, default: true },
    lessons:     [lessonSchema],
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isPublished: { type: Boolean, default: false },
    tags:        [String],
  },
  { timestamps: true }
)

export default mongoose.model('Course', courseSchema)