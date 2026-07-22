import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

authRouter.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  const existing = await db.get('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = nanoid();
  const passwordHash = bcrypt.hashSync(password, 10);
  await db.run('INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)', [
    id,
    email,
    passwordHash,
    name,
  ]);

  res.status(201).json({ token: signToken(id), user: { id, email, name } });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user.id), user: { id: user.id, email: user.email, name: user.name } });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
