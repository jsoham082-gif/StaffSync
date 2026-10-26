const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: "" },
  department: { type: String, required: true, default: "Engineering" },
  role: { type: String, required: true },
  salary: { type: Number, default: 0 },
  status: { type: String, enum: ["Active", "On Leave"], default: "Active" },
  joined: { type: String, default: "" }
}, { timestamps: true });
const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ["Present", "Absent", "On Leave"], default: "Present" },
  checkIn: { type: String, default: "" },
  checkOut: { type: String, default: "" },
  notes: { type: String, default: "" }
}, { timestamps: true });
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

const leaveSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  employeeName: { type: String, required: true },
  department: { type: String, default: "" },
  type: { type: String, default: "Casual Leave" },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
}, { timestamps: true });
const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveSchema);

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "workspace" },
  companyName: { type: String, default: "StaffSync" },
  adminName: { type: String, default: "Admin" },
  currency: { type: String, default: "INR" },
  departments: { type: [String], default: ["Engineering", "Human Resources", "Finance", "Design", "Marketing", "Sales", "Operations"] },
  casualLeaveDays: { type: Number, default: 12 },
  sickLeaveDays: { type: Number, default: 10 },
  annualLeaveDays: { type: Number, default: 15 },
  emailNotifications: { type: Boolean, default: true },
  attendanceReminders: { type: Boolean, default: true }
}, { timestamps: true });
const WorkspaceSettings = mongoose.models.WorkspaceSettings || mongoose.model("WorkspaceSettings", settingsSchema);

const payrollSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  employeeName: { type: String, required: true },
  month: { type: String, required: true },
  basicSalary: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  status: { type: String, enum: ["Draft", "Processed"], default: "Draft" }
}, { timestamps: true });
payrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });
const Payroll = mongoose.models.Payroll || mongoose.model("Payroll", payrollSchema);

app.get("/", (_req, res) => res.send("StaffSync API is running."));
app.get("/api/health", (_req, res) => res.json({ ok: true, message: "StaffSync API is running" }));

// Employee CRUD
app.get("/api/employees", async (_req, res) => {
  try { res.json(await Employee.find().sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/employees", async (req, res) => {
  try { res.status(201).json(await Employee.create(req.body)); }
  catch (e) { res.status(e.code === 11000 ? 409 : 400).json({ message: e.code === 11000 ? "Email already exists." : e.message }); }
});
app.put("/api/employees/:id", async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Employee not found." });
    res.json(updated);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Employee not found." });
    await Promise.all([
      Attendance.deleteMany({ employeeId: deleted._id }),
      LeaveRequest.deleteMany({ employeeId: deleted._id }),
      Payroll.deleteMany({ employeeId: deleted._id })
    ]);
    res.json({ message: "Employee and related records deleted." });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Attendance
app.get("/api/attendance", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.employeeId) filter.employeeId = req.query.employeeId;
    res.json(await Attendance.find(filter).populate("employeeId", "name email department role").sort({ date: -1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/attendance", async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, notes } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date },
      { $set: { status, checkIn: checkIn || "", checkOut: checkOut || "", notes: notes || "" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Leave requests
app.get("/api/leaves", async (_req, res) => {
  try { res.json(await LeaveRequest.find().populate("employeeId", "name email department").sort({ createdAt: -1 })); }
  catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/leaves", async (req, res) => {
  try {
    if (req.body.endDate < req.body.startDate) return res.status(400).json({ message: "End date cannot be earlier than start date." });
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    const record = await LeaveRequest.create({
      employeeId: employee._id, employeeName: employee.name, department: employee.department,
      type: req.body.type, startDate: req.body.startDate, endDate: req.body.endDate, reason: req.body.reason
    });
    res.status(201).json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.patch("/api/leaves/:id", async (req, res) => {
  try {
    if (!["Approved", "Rejected", "Pending"].includes(req.body.status)) return res.status(400).json({ message: "Invalid leave status." });
    const record = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Leave request not found." });
    res.json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.delete("/api/leaves/:id", async (req, res) => {
  try {
    const record = await LeaveRequest.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Leave request not found." });
    res.json({ message: "Leave request deleted." });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Payroll register and monthly calculations
app.get("/api/payroll", async (req, res) => {
  try {
    const filter = req.query.month ? { month: req.query.month } : {};
    res.json(await Payroll.find(filter).sort({ month: -1, employeeName: 1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.post("/api/payroll/generate", async (req, res) => {
  try {
    const { month, allowances = 0, deductions = 0 } = req.body;
    if (!/^\d{4}-\d{2}$/.test(month || "")) return res.status(400).json({ message: "Month must use YYYY-MM format." });
    const employees = await Employee.find({ status: "Active" });
    const records = [];
    for (const employee of employees) {
      const basicSalary = Number(employee.salary) || 0;
      const extra = Number(allowances) || 0;
      const deduction = Number(deductions) || 0;
      const data = {
        employeeId: employee._id, employeeName: employee.name, month,
        basicSalary, allowances: extra, deductions: deduction,
        grossSalary: basicSalary + extra, netSalary: Math.max(0, basicSalary + extra - deduction)
      };
      const record = await Payroll.findOneAndUpdate(
        { employeeId: employee._id, month },
        { $set: data },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      records.push(record);
    }
    res.json({ message: `Generated payroll for ${records.length} active employees.`, records });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
app.patch("/api/payroll/:id", async (req, res) => {
  try {
    if (!["Draft", "Processed"].includes(req.body.status)) return res.status(400).json({ message: "Invalid payroll status." });
    const record = await Payroll.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Payroll record not found." });
    res.json(record);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Workspace settings
app.get("/api/settings", async (_req, res) => {
  try {
    let settings = await WorkspaceSettings.findOne({ key: "workspace" });
    if (!settings) settings = await WorkspaceSettings.create({ key: "workspace" });
    res.json(settings);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
app.put("/api/settings", async (req, res) => {
  try {
    const allowed = ["companyName", "adminName", "currency", "departments", "casualLeaveDays", "sickLeaveDays", "annualLeaveDays", "emailNotifications", "attendanceReminders"];
    const update = {};
    for (const key of allowed) if (req.body[key] !== undefined) update[key] = req.body[key];
    const settings = await WorkspaceSettings.findOneAndUpdate(
      { key: "workspace" }, { $set: update, $setOnInsert: { key: "workspace" } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch((error) => console.error("MongoDB connection failed:", error.message));
} else {
  console.error("Missing MONGO_URI (or MONGODB_URI) environment variable.");
}
app.listen(PORT, () => console.log(`StaffSync backend running on port ${PORT}`));
