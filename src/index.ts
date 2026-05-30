import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
import "dotenv/config";
import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createStream } from "rotating-file-stream";

//routes
import enquiryRoutes from "./routes/enquiry.router";
import otpRoutes from "./routes/otp.router";
import blogRoutes from "./routes/blog.router";

const app = express();

// ✅ Setup logs dir using process.cwd() — no __dirname issues
const logsDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });

const accessLogStream = createStream("access.log", {
  interval: "1d",
  size: "10M",
  path: logsDir,
  compress: "gzip",
});

// ✅ Morgan MUST be first — before routes, cors, body-parser
app.use(morgan("dev")); // console
// app.use(morgan("combined", { stream: accessLogStream })); // file

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use("/api/files", express.static(path.join(process.cwd(), "public")));
app.use("/api/uploads", express.static("uploads"));

const corsConfig = {
  origin: function (origin: any, callback: any) {
    const allowedOrigins = process.env.CORS?.split(",");
    if (allowedOrigins!.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      throw new Error("Not allowed by CORS");
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsConfig));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    status: 429,
    error: "Too many requests. Please try again in 10 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

// app.use("/api/enquiry", enquiryRoutes);
app.use("/api/otp", loginLimiter, otpRoutes);
app.use("/api/blog", blogRoutes);

app.get("/", (req, res) => {
  return res.status(200).json({ message: "Welcome" });
});

app.use((req, res, next) => {
  const error: any = new Error("Route not found.");
  error.status = 404;
  next(error);
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  return res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error", status: false });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  // console.log(`Logs writing to: ${logsDir}`);
});
