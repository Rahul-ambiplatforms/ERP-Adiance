import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import connectDB from './config/connectDB.js';
import userRouter from './route/user.route.js';
import categoryRouter from './route/category.route.js';
import uploadRouter from './route/upload.router.js';
import subCategoryRouter from './route/subCategory.route.js';
import productRouter from './route/product.route.js';
import outProductRouter from './route/outproduct.route.js';
import damageProductRouter from './route/damageproduct.route.js';
import readyCameraRouter from './route/readycamera.route.js';
import adminPanelRouter from './route/adminpanel.route.js'; // Import admin panel routes
import deliveryRouter from './route/delivery.routes.js'; // Add import for delivery router

const app = express();

// Middlewares
app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev')); // Use 'dev' to make the logs concise
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Port
const PORT = process.env.PORT || 8080;

// Test endpoint
app.get('/', (req, res) => {
  res.json({
    message: `Server is running on port ${PORT}`,
  });
});

// Routes
app.use('/api/user', userRouter);
app.use('/api/category', categoryRouter);
app.use('/api/file', uploadRouter);
app.use('/api/subcategory', subCategoryRouter);
app.use('/api/product', productRouter); // Product route is correctly configured here
app.use('/api/outproduct', outProductRouter);
app.use('/api/damageproduct', damageProductRouter);
app.use('/api/readycamera', readyCameraRouter);
app.use('/api/adminpanel', adminPanelRouter); // Add admin panel routes
app.use('/api/delivery', deliveryRouter);

// Connect to the database and start the server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
