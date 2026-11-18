const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSetup = require('./config/swagger');
const apiRoutes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const allowedOrigins = require('./config/origins');
const requireTrustedOrigin = require('./middlewares/requireTrustedOrigin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      }
    }
  })
);

app.use(express.json());
app.use(cookieParser());
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  next();
});
app.use('/api', requireTrustedOrigin);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor del taller automotriz funcionando correctamente.'
  });
});

app.use('/api', apiRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSetup));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Swagger disponible en http://localhost:${PORT}/api-docs`);
});
