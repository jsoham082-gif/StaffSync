
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);
app.use(express.json());

// Employee database model
const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    department: { type: String, default: "General" },
    role: { type: String, default: "Employee" },
    status: { type: String, default: "Active" },
    salary: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Employee = mongoose.models.Employee ||
  mongoose.model("Employee", employeeSchema);

// Welcome route
app.get("/", (req, res) => {
  res.send("Welcome to StaffSync Backend!");
});

// Health route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "StaffSync backend is running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Get all employees
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: "Could not fetch employees" });
  }
});

// Add an employee
app.post("/api/employees", async (req, res) => {
  try {
    const { name, email, department, role, status, salary } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Employee name and email are required",
      });
    }

    const employee = await Employee.create({
      name,
      email,
      department,
      role,
      status,
      salary,
    });

    res.status(201).json(employee);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    res.status(400).json({
      message: error.message || "Could not add employee",
    });
  }
});

// Update an employee
app.put("/api/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: "Could not update employee" });
  }
});

// Delete an employee
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Could not delete employee" });
  }
});

// Start server after connecting to MongoDB
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`StaffSync backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

startServer();
