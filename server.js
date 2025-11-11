import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { connectDB } from './src/config/db.js';
import userRoutes from './src/routes/userRoutes.js';
import providerRoutes from './src/routes/providerRoutes.js';
import uploadRoutes from "./routes/uploadRoutes.js";
const app = express();

// --- Security / parsers
app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors()
);

app.use(morgan('dev'));

// --- DB
await connectDB();

// --- Routes

app.use("/api/upload", uploadRoutes);
app.get('/', (_req, res) => res.json({ ok: true, service: 'Osta API' }));
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);

// --- Start
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Osta API listening on :${PORT}`);
});
