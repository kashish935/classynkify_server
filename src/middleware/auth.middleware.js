import jwt from 'jsonwebtoken'

export const protect = (req, res, next) => {
  const header = req.headers.authorization

  if (!header) {
    return res.status(401).json({ message: 'No token provided' })
  }

  // Accepts both "Bearer <token>" and the bare token
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim()

  if (!token) {
    return res.status(401).json({ message: 'No token provided' })
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}