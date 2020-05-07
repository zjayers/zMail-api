// IMPORT MODULES
const path = require('path');
const express = require('express'); // express framework
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

// TODO Import Routes
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const authRouter = require('./routes/authRoutes');

// INIT EXPRESS FRAMEWORK
const app = express();
app.enable('trust proxy');

const whitelist = ['http://localhost:4200', 'http://example2.com'];
const corsOptions = {
  credentials: true, // This is important.
  origin: (origin, callback) => {
    if (whitelist.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
};

// Implement CORS
app.use(cors(corsOptions)); // Access-Control-Allow-Origin *

// SERVING STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// USE HELMET PACKAGE TO SET SECURITY HTTP HEADERS
app.use(helmet());

// *RATE LIMITER
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});

// ADD RATE LIMITER TO THE API ROUTE
app.use('/api', limiter);

// BODY PARSER - READ DATA FROM BODY INTO REQ.BODY
app.use(express.json({ limit: '10kb' })); // Limit body to 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Form Parser
app.use(cookieParser());

// DATA SANITIZATION AGAINST NOSQL QUERY INJECTION
app.use(mongoSanitize());

// DATA SANITIZATION AGAINST XSS ATTACKS
app.use(xssClean());

//* COMPRESSION FOR TEXT SENT TO CLIENTS
app.use(compression());

// INIT ROUTERS
app.use('/api/v1/auth', authRouter);

// ROUTE HANDLER FOR NON-EXISTENT ROUTES
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ADD GLOBAL ERROR HANDLER MIDDLEWARE
app.use(globalErrorHandler);

// EXPORT THIS MODULE
module.exports = app;
