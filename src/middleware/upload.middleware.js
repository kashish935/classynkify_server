import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// <server root>/uploads, the same folder app.js serves at /uploads
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads')

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB per image
const EXT_BY_MIME = { 'image/jpeg': '.jpg', 'image/png': '.png' }
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

class UploadError extends Error {}

// The mimetype comes from the browser and can be faked, so also check the real first bytes
const looksLikeImage = async (filePath) => {
  const handle = await fs.promises.open(filePath, 'r')
  try {
    const { buffer } = await handle.read(Buffer.alloc(8), 0, 8, 0)
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    return isJpeg || buffer.equals(PNG_SIGNATURE)
  } finally {
    await handle.close()
  }
}

// Deletes uploaded files by their public path (/uploads/...). Never throws.
export const removeUploads = async (publicPaths = []) => {
  await Promise.all(
    publicPaths.map(async (p) => {
      try {
        const abs = path.resolve(UPLOAD_ROOT, String(p).replace(/^\/uploads\//, ''))
        if (!abs.startsWith(UPLOAD_ROOT + path.sep)) return // never delete outside uploads/
        await fs.promises.unlink(abs)
      } catch {
        /* already gone */
      }
    })
  )
}

// Reads up to `maxFiles` images from the form field "images".
// Puts their public paths on req.uploadedImages (e.g. /uploads/assignments/answers/ab12.jpg).
// If the request ends with an error status, the saved files are deleted again.
const imageUpload = (folder, maxFiles) => {
  const parser = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(UPLOAD_ROOT, folder)
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir))
      },
      // random name, extension decided by us (never the one the user sent)
      filename: (req, file, cb) =>
        cb(null, crypto.randomBytes(16).toString('hex') + EXT_BY_MIME[file.mimetype]),
    }),
    fileFilter: (req, file, cb) => {
      if (EXT_BY_MIME[file.mimetype]) return cb(null, true)
      cb(new UploadError('Only JPG or PNG images are allowed.'))
    },
    limits: { fileSize: MAX_FILE_SIZE, files: maxFiles, fields: 20 },
  }).array('images', maxFiles)

  return (req, res, next) => {
    parser(req, res, async (err) => {
      if (err) {
        // multer already removes files it had saved before the error
        const message =
          err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `You can upload up to ${maxFiles} images.`
          : err instanceof UploadError ? err.message
          : null
        if (message) return res.status(400).json({ message })
        console.error('Upload error:', err.message)
        return res.status(500).json({ message: 'Upload failed. Please try again.' })
      }

      const files = req.files || []
      const uploaded = files.map((f) => `/uploads/${folder}/${f.filename}`)

      // From here on, any failed response (validation, not allowed, server error) removes the files
      res.on('finish', () => {
        if (res.statusCode >= 400) removeUploads(uploaded)
      })

      try {
        for (const f of files) {
          if (!(await looksLikeImage(f.path))) {
            return res.status(400).json({ message: 'One of the files is not a real JPG or PNG image.' })
          }
        }
      } catch (e) {
        console.error('Upload check error:', e.message)
        return res.status(500).json({ message: 'Upload failed. Please try again.' })
      }

      req.uploadedImages = uploaded
      next()
    })
  }
}

export const uploadQuestionImages = imageUpload('assignments/questions', 10) // teacher
export const uploadAnswerImages = imageUpload('assignments/answers', 5)      // student