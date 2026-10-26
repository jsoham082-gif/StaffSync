
import { useEffect, useState } from "react";

const API_ROOT = "http://localhost:5000/api";
const API_URL = `${API_ROOT}/employees`;
import "./App.css";

const initialEmployees = [
  {
    id: 1,
    name: "Aarav Sharma",
    email: "aarav@staffsync.com",
    phone: "9876543210",
    department: "Engineering",
    role: "Frontend Developer",
    salary: 45000,
    status: "Active",
    joined: "2026-01-15",
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "priya@staffsync.com",
    phone: "9876543211",
    department: "Human Resources",
    role: "HR Executive",
    salary: 38000,
    status: "Active",
    joined: "2026-02-10",
  },
  {
    id: 3,
    name: "Rahul Verma",
    email: "rahul@staffsync.com",
    phone: "9876543212",
    department: "Finance",
    role: "Accountant",
    salary: 40000,
    status: "On Leave",
    joined: "2025-11-20",
  },
  {
    id: 4,
    name: "Ananya Singh",
    email: "ananya@staffsync.com",
    phone: "9876543213",
    department: "Design",
    role: "UI/UX Designer",
    salary: 42000,
    status: "Active",
    joined: "2026-03-05",
  },
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  department: "Engineering",
  role: "",
  salary: "",
  status: "Active",
  joined: new Date().toISOString().slice(0, 10),
};

const menuItems = [
  { name: "Dashboard", icon: "▦" },
  { name: "Employees", icon: "♟" },
  { name: "Attendance", icon: "◷" },
  { name: "Leave Requests", icon: "▤" },
  { name: "Payroll", icon: "₹" },
  { name: "Settings", icon: "⚙" },
];

function App() {
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [apiError, setApiError] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollAllowances, setPayrollAllowances] = useState("0");
  const [payrollDeductions, setPayrollDeductions] = useState("0");
  const [settings, setSettings] = useState({
    companyName: "StaffSync", adminName: "Admin", currency: "INR",
    departments: ["Engineering", "Human Resources", "Finance", "Design", "Marketing", "Sales", "Operations"],
    casualLeaveDays: 12, sickLeaveDays: 10, annualLeaveDays: 15,
    emailNotifications: true, attendanceReminders: true
  });
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "", type: "Casual Leave", startDate: "", endDate: "", reason: ""
  });
  const [leaveMessage, setLeaveMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [moduleMessage, setModuleMessage] = useState("");

  async function loadEmployees() {
    try {
      setApiError("");
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Could not load employees from the server.");
      const data = await response.json();
      setEmployees(data.map((employee) => ({
        ...employee,
        id: employee._id || employee.id,
        phone: employee.phone || "",
        joined: employee.joined || "",
      })));
    } catch (error) {
      setApiError("Cannot connect to the backend. Make sure the Server is running on port 5000.");
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function loadAttendance() {
    try {
      const response = await fetch(`${API_ROOT}/attendance?date=${new Date().toISOString().slice(0, 10)}`);
      if (!response.ok) throw new Error("Unable to load attendance.");
      setAttendance(await response.json());
    } catch (error) { setModuleMessage(error.message); }
  }

  async function loadLeaves() {
    try {
      const response = await fetch(`${API_ROOT}/leaves`);
      if (!response.ok) throw new Error("Unable to load leave requests.");
      setLeaveRequests(await response.json());
    } catch (error) { setModuleMessage(error.message); }
  }

  async function loadPayroll() {
    try {
      const response = await fetch(`${API_ROOT}/payroll?month=${payrollMonth}`);
      if (!response.ok) throw new Error("Unable to load payroll.");
      setPayrollRecords(await response.json());
    } catch (error) { setModuleMessage(error.message); }
  }

  async function loadSettings() {
    try {
      const response = await fetch(`${API_ROOT}/settings`);
      if (!response.ok) throw new Error("Unable to load settings.");
      setSettings(await response.json());
    } catch (error) { setModuleMessage(error.message); }
  }

  useEffect(() => {
    loadEmployees();
    loadAttendance();
    loadLeaves();
    loadSettings();
  }, []);

  useEffect(() => {
    loadPayroll();
  }, [payrollMonth]);

  const activeCount = employees.filter(
    (employee) => employee.status === "Active"
  ).length;

  const leaveCount = employees.filter(
    (employee) => employee.status === "On Leave"
  ).length;

  const filteredEmployees = employees.filter((employee) => {
    const query = search.toLowerCase();

    const matchesSearch =
      employee.name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.department.toLowerCase().includes(query) ||
      employee.role.toLowerCase().includes(query);

    const matchesFilter =
      filter === "All" || employee.status === filter;

    return matchesSearch && matchesFilter;
  });

  function openAddForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
    setModalOpen(true);
  }

  function openEditForm(employee) {
    setEditingId(employee.id);
    setForm({ ...emptyForm, ...employee, salary: String(employee.salary ?? ""), joined: employee.joined || "" });
    setMessage("");
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = form.email.trim().toLowerCase();
    const duplicate = employees.some(
      (employee) =>
        employee.email.toLowerCase() === normalizedEmail &&
        employee.id !== editingId
    );

    if (duplicate) {
      setMessage("An employee with this email already exists.");
      return;
    }

    const employeeData = {
      name: form.name.trim(),
      email: normalizedEmail,
      phone: form.phone.trim(),
      department: form.department,
      role: form.role.trim(),
      salary: Number(form.salary),
      status: form.status,
      joined: form.joined,
    };

    try {
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeData),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not save the employee.");
      }
      await loadEmployees();
      setModalOpen(false);
      setMessage("");
      setEditingId(null);
      setForm({ ...emptyForm });
    } catch (error) {
      setMessage(error.message || "Could not save the employee. Check the backend.");
    }
  }

  async function deleteEmployee(id) {
    const employee = employees.find((item) => item.id === id);
    if (!employee || !window.confirm(`Delete ${employee.name}'s employee record?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not delete employee.");
      await loadEmployees();
    } catch (error) {
      setApiError(error.message || "Could not delete employee.");
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function renderDashboard() {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back! Here is your workforce overview.</p>
          </div>
          <button className="primary-button" onClick={openAddForm}>
            + Add Employee
          </button>
        </div>

        <div className="stats-grid">
          <StatCard icon="♟" label="Total Employees" value={employees.length} tone="purple" />
          <StatCard icon="✓" label="Active Employees" value={activeCount} tone="green" />
          <StatCard icon="◷" label="On Leave" value={leaveCount} tone="orange" />
          <StatCard icon="▤" label="Departments" value={new Set(employees.map((e) => e.department)).size} tone="blue" />
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Employees</h2>
              <p>Your latest employee records</p>
            </div>
            <button className="text-button" onClick={() => setPage("Employees")}>
              View all →
            </button>
          </div>
          {renderEmployeeTable(employees.slice(-4).reverse())}
        </section>
      </>
    );
  }


  function renderEmployeeTable(list) {
    if (list.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">♟</div>
          <h3>No employees found</h3>
          <p>Try changing your search or add a new employee.</p>
          <button className="primary-button" onClick={openAddForm}>
            + Add Employee
          </button>
        </div>
      );
    }

    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>DEPARTMENT</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>SALARY / MONTH</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {list.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="employee-cell">
                    <div className="avatar">
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="employee-info">
                      <strong>{employee.name}</strong>
                      <span>{employee.email}</span>
                    </div>
                  </div>
                </td>
                <td>{employee.department}</td>
                <td>{employee.role}</td>
                <td>
                  <span
                    className={`status-badge ${
                      employee.status === "Active" ? "active" : "leave"
                    }`}
                  >
                    {employee.status}
                  </span>
                </td>
                <td>₹{Number(employee.salary).toLocaleString("en-IN")}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="icon-button"
                      title="Edit employee"
                      onClick={() => openEditForm(employee)}
                    >
                      ✎
                    </button>
                    <button
                      className="icon-button delete-button"
                      title="Delete employee"
                      onClick={() => deleteEmployee(employee.id)}
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderEmployees() {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Employees</h1>
            <p>Manage your team, employee details and records.</p>
          </div>
          <button className="primary-button" onClick={openAddForm}>
            + Add Employee
          </button>
        </div>

        <section className="panel">
          <div className="employee-toolbar">
            <div>
              <h2>All Employees</h2>
              <p>{filteredEmployees.length} employee records</p>
            </div>
            <div className="toolbar-controls">
              <input
                className="search-input"
                type="search"
                placeholder="Search name, email, role..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="filter-select"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>
          {renderEmployeeTable(filteredEmployees)}
        </section>
      </>
    );
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  async function markAttendance(employeeId, status, existingRecord = null) {
    try {
      const payload = {
        employeeId,
        date: todayKey,
        status,
        checkIn: existingRecord?.checkIn || (status === "Present" ? new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""),
        checkOut: existingRecord?.checkOut || "",
        notes: existingRecord?.notes || ""
      };
      const response = await fetch(`${API_ROOT}/attendance`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save attendance.");
      setModuleMessage("Attendance saved to MongoDB.");
      await loadAttendance();
    } catch (error) { setModuleMessage(error.message); }
  }

  async function checkOutAttendance(employeeId, record) {
    try {
      const response = await fetch(`${API_ROOT}/attendance`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId, date: todayKey, status: "Present",
          checkIn: record?.checkIn || "",
          checkOut: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          notes: record?.notes || ""
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not save check-out.");
      setModuleMessage("Check-out time saved.");
      await loadAttendance();
    } catch (error) { setModuleMessage(error.message); }
  }

  async function submitLeaveRequest(event) {
    event.preventDefault();
    setLeaveMessage("");
    if (leaveForm.endDate < leaveForm.startDate) {
      setLeaveMessage("End date cannot be earlier than start date.");
      return;
    }
    try {
      const response = await fetch(`${API_ROOT}/leaves`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leaveForm, reason: leaveForm.reason.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not submit leave request.");
      setLeaveForm({ employeeId: "", type: "Casual Leave", startDate: "", endDate: "", reason: "" });
      setLeaveMessage("Leave request submitted and saved to MongoDB.");
      await loadLeaves();
    } catch (error) { setLeaveMessage(error.message); }
  }

  async function updateLeaveStatus(id, status) {
    try {
      const response = await fetch(`${API_ROOT}/leaves/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update leave request.");
      await loadLeaves();
    } catch (error) { setModuleMessage(error.message); }
  }

  async function generatePayroll(event) {
    event.preventDefault();
    try {
      const response = await fetch(`${API_ROOT}/payroll/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: payrollMonth,
          allowances: Number(payrollAllowances) || 0,
          deductions: Number(payrollDeductions) || 0
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not generate payroll.");
      setModuleMessage(result.message || "Payroll generated.");
      await loadPayroll();
    } catch (error) { setModuleMessage(error.message); }
  }

  async function updatePayrollStatus(id, status) {
    try {
      const response = await fetch(`${API_ROOT}/payroll/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update payroll status.");
      await loadPayroll();
    } catch (error) { setModuleMessage(error.message); }
  }

  function renderAttendance() {
    const recordsByEmployee = Object.fromEntries(
      attendance.map((record) => [record.employeeId?._id || record.employeeId, record])
    );
    const presentCount = attendance.filter((record) => record.status === "Present").length;
    const absentCount = attendance.filter((record) => record.status === "Absent").length;
    return (
      <>
        <div className="page-heading"><div><h1>Attendance</h1><p>Record attendance and check-in/check-out times for {todayKey}.</p></div></div>
        <div className="stats-grid">
          <StatCard icon="✓" label="Present Today" value={presentCount} tone="green" />
          <StatCard icon="×" label="Absent Today" value={absentCount} tone="orange" />
          <StatCard icon="♟" label="Total Employees" value={employees.length} tone="purple" />
          <StatCard icon="◷" label="Not Marked" value={Math.max(0, employees.length - attendance.length)} tone="blue" />
        </div>
        {moduleMessage && <p className="success-message">{moduleMessage}</p>}
        <section className="panel">
          <div className="panel-heading"><div><h2>Daily Attendance</h2><p>Records are saved in MongoDB.</p></div></div>
          {employees.length === 0 ? <div className="empty-state"><h3>No employees to mark</h3><p>Add employees first.</p></div> : (
            <div className="table-wrapper"><table><thead><tr><th>EMPLOYEE</th><th>DEPARTMENT</th><th>STATUS</th><th>CHECK IN</th><th>CHECK OUT</th><th>ACTIONS</th></tr></thead>
              <tbody>{employees.map((employee) => {
                const record = recordsByEmployee[employee.id];
                const status = record?.status || "Not Marked";
                return <tr key={employee.id}>
                  <td><div className="employee-cell"><div className="avatar">{employee.name.charAt(0).toUpperCase()}</div><div className="employee-info"><strong>{employee.name}</strong><span>{employee.email}</span></div></div></td>
                  <td>{employee.department}</td>
                  <td><span className={`status-badge ${status === "Present" ? "active" : status === "Absent" ? "leave" : ""}`}>{status}</span></td>
                  <td>{record?.checkIn || "—"}</td><td>{record?.checkOut || "—"}</td>
                  <td><div className="action-buttons">
                    <button className="primary-button" type="button" onClick={() => markAttendance(employee.id, "Present", record)}>Present / Check in</button>
                    <button className="secondary-button" type="button" onClick={() => checkOutAttendance(employee.id, record)}>Check out</button>
                    <button className="secondary-button" type="button" onClick={() => markAttendance(employee.id, "Absent", record)}>Absent</button>
                  </div></td>
                </tr>;
              })}</tbody></table></div>
          )}
        </section>
      </>
    );
  }

  function renderLeaveRequests() {
    return (
      <>
        <div className="page-heading"><div><h1>Leave Requests</h1><p>Submit leave requests and review their status.</p></div></div>
        <section className="panel">
          <div className="panel-heading"><div><h2>Apply for Leave</h2><p>Complete the form below to create a request.</p></div></div>
          <form onSubmit={submitLeaveRequest}>
            <div className="form-grid">
              <label>Employee *<select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({...leaveForm, employeeId: e.target.value})} required><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
              <label>Leave Type *<select value={leaveForm.type} onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}><option>Casual Leave</option><option>Sick Leave</option><option>Annual Leave</option><option>Unpaid Leave</option></select></label>
              <label>Start Date *<input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})} required /></label>
              <label>End Date *<input type="date" value={leaveForm.endDate} min={leaveForm.startDate || undefined} onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})} required /></label>
              <label>Reason *<input value={leaveForm.reason} onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})} placeholder="Brief reason for leave" required /></label>
            </div>
            {leaveMessage && <p className={leaveMessage.includes("submitted") ? "success-message" : "form-error"}>{leaveMessage}</p>}
            <div className="modal-actions"><button type="submit" className="primary-button">Submit Request</button></div>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>All Requests</h2><p>{leaveRequests.length} request(s)</p></div></div>
          {leaveRequests.length === 0 ? <div className="empty-state"><h3>No leave requests yet</h3><p>Submitted requests will appear here.</p></div> : (
            <div className="table-wrapper"><table><thead><tr><th>EMPLOYEE</th><th>TYPE</th><th>DATES</th><th>REASON</th><th>STATUS</th><th>REVIEW</th></tr></thead><tbody>
              {leaveRequests.map((request) => <tr key={request._id || request.id}><td><strong>{request.employeeName}</strong><br /><span>{request.department}</span></td><td>{request.type}</td><td>{request.startDate}<br />to {request.endDate}</td><td>{request.reason}</td><td><span className={`status-badge ${request.status === "Approved" ? "active" : "leave"}`}>{request.status}</span></td><td>{request.status === "Pending" ? <div className="action-buttons"><button className="primary-button" onClick={() => updateLeaveStatus(request._id || request.id, "Approved")}>Approve</button><button className="secondary-button" onClick={() => updateLeaveStatus(request._id || request.id, "Rejected")}>Reject</button></div> : "Reviewed"}</td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </>
    );
  }

  function renderPayroll() {
    const totalPayroll = payrollRecords.reduce((sum, record) => sum + (Number(record.grossSalary) || 0), 0);
    const netPayroll = payrollRecords.reduce((sum, record) => sum + (Number(record.netSalary) || 0), 0);
    const currencySymbol = settings.currency === "USD" ? "$" : settings.currency === "EUR" ? "€" : "₹";
    async function processRecord(id) { await updatePayrollStatus(id, "Processed"); }
    return (
      <>
        <div className="page-heading"><div><h1>Payroll</h1><p>Generate monthly salary records and track processing status.</p></div></div>
        <div className="stats-grid">
          <StatCard icon="₹" label="Gross Payroll" value={`${currencySymbol}${totalPayroll.toLocaleString("en-IN")}`} tone="purple" />
          <StatCard icon="✓" label="Net Payroll" value={`${currencySymbol}${netPayroll.toLocaleString("en-IN")}`} tone="green" />
          <StatCard icon="♟" label="Payroll Records" value={payrollRecords.length} tone="blue" />
          <StatCard icon="◷" label="Pending" value={payrollRecords.filter((r) => r.status !== "Processed").length} tone="orange" />
        </div>
        {moduleMessage && <p className="success-message">{moduleMessage}</p>}
        <section className="panel">
          <div className="panel-heading"><div><h2>Generate Payroll</h2><p>Calculates records for all active employees and saves them in MongoDB.</p></div></div>
          <form onSubmit={generatePayroll}>
            <div className="form-grid">
              <label>Payroll Month *<input type="month" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} required /></label>
              <label>Allowance per employee<input type="number" min="0" value={payrollAllowances} onChange={(e) => setPayrollAllowances(e.target.value)} /></label>
              <label>Deduction per employee<input type="number" min="0" value={payrollDeductions} onChange={(e) => setPayrollDeductions(e.target.value)} /></label>
            </div>
            <div className="modal-actions"><button className="primary-button" type="submit">Generate Payroll</button></div>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Salary Register</h2><p>{payrollRecords.length} record(s) for {payrollMonth}. This does not transfer money.</p></div></div>
          {payrollRecords.length === 0 ? <div className="empty-state"><h3>No payroll generated for this month</h3><p>Use Generate Payroll above to create records.</p></div> : (
            <div className="table-wrapper"><table><thead><tr><th>EMPLOYEE</th><th>MONTH</th><th>BASIC</th><th>ALLOWANCES</th><th>DEDUCTIONS</th><th>NET SALARY</th><th>STATUS</th><th>ACTION</th></tr></thead>
              <tbody>{payrollRecords.map((record) => <tr key={record._id}><td><strong>{record.employeeName}</strong></td><td>{record.month}</td><td>{currencySymbol}{Number(record.basicSalary).toLocaleString("en-IN")}</td><td>{currencySymbol}{Number(record.allowances).toLocaleString("en-IN")}</td><td>{currencySymbol}{Number(record.deductions).toLocaleString("en-IN")}</td><td>{currencySymbol}{Number(record.netSalary).toLocaleString("en-IN")}</td><td><span className={`status-badge ${record.status === "Processed" ? "active" : "leave"}`}>{record.status}</span></td><td>{record.status !== "Processed" ? <button className="primary-button" onClick={() => processRecord(record._id)}>Mark Processed</button> : "Complete"}</td></tr>)}</tbody>
            </table></div>
          )}
        </section>
      </>
    );
  }

  function renderSettings() {
    async function saveSettings(event) {
      event.preventDefault();
      setSettingsMessage("");
      try {
        const response = await fetch(`${API_ROOT}/settings`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not save settings.");
        setSettings(result);
        setSettingsMessage("Settings saved to MongoDB successfully.");
      } catch (error) { setSettingsMessage(error.message); }
    }
    return (
      <>
        <div className="page-heading"><div><h1>Settings</h1><p>Configure your workspace and HR policies.</p></div></div>
        <section className="panel"><div className="panel-heading"><div><h2>Workspace Settings</h2><p>These settings are stored in MongoDB.</p></div></div>
          <form onSubmit={saveSettings}><div className="form-grid">
            <label>Company Name<input value={settings.companyName || ""} onChange={(e) => setSettings({...settings, companyName: e.target.value})} required /></label>
            <label>Administrator Name<input value={settings.adminName || ""} onChange={(e) => setSettings({...settings, adminName: e.target.value})} required /></label>
            <label>Currency<select value={settings.currency || "INR"} onChange={(e) => setSettings({...settings, currency: e.target.value})}><option value="INR">Indian Rupee (INR ₹)</option><option value="USD">US Dollar (USD $)</option><option value="EUR">Euro (EUR €)</option></select></label>
            <label>Casual leave days/year<input type="number" min="0" value={settings.casualLeaveDays ?? 12} onChange={(e) => setSettings({...settings, casualLeaveDays: Number(e.target.value)})} /></label>
            <label>Sick leave days/year<input type="number" min="0" value={settings.sickLeaveDays ?? 10} onChange={(e) => setSettings({...settings, sickLeaveDays: Number(e.target.value)})} /></label>
            <label>Annual leave days/year<input type="number" min="0" value={settings.annualLeaveDays ?? 15} onChange={(e) => setSettings({...settings, annualLeaveDays: Number(e.target.value)})} /></label>
            <label className="settings-checkbox"><input type="checkbox" checked={Boolean(settings.emailNotifications)} onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} /> Enable email notification preference</label>
            <label className="settings-checkbox"><input type="checkbox" checked={Boolean(settings.attendanceReminders)} onChange={(e) => setSettings({...settings, attendanceReminders: e.target.checked})} /> Enable attendance reminder preference</label>
          </div>
          {settingsMessage && <p className={settingsMessage.includes("successfully") ? "success-message" : "form-error"}>{settingsMessage}</p>}
          <div className="modal-actions"><button className="primary-button" type="submit">Save Settings</button></div>
          </form>
        </section>
        <section className="panel"><div className="panel-heading"><div><h2>About StaffSync</h2><p>MERN-stack human resource management system.</p></div></div><p>Employee, attendance, leave, payroll and workspace settings records are stored through the backend API in MongoDB.</p></section>
      </>
    );
  }

  function renderOtherPage() {
    return (
      <section className="panel coming-soon">
        <div className="empty-icon">✦</div>
        <h2>{page}</h2>
        <p>
          This section is ready for the next development stage.
          We are currently building the Employees module first.
        </p>
        <button
          className="secondary-button"
          onClick={() => setPage("Employees")}
        >
          Go to Employees
        </button>
      </section>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <h2>StaffSync</h2>
            <span>WORKFORCE MANAGEMENT</span>
          </div>
        </div>

        <div className="menu-label">MAIN MENU</div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? "selected" : ""}`}
              onClick={() => setPage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {item.name === "Leave Requests" && leaveCount > 0 && (
                <span className="menu-count">{leaveCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-avatar">AD</div>
          <div>
            <strong>Admin</strong>
            <span>Administrator</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{page}</strong>
          </div>
          <div className="topbar-user">
            <span>{new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}</span>
            <div className="admin-avatar">AD</div>
          </div>
        </header>

        <div className="content-area">
          {apiError && <p className="form-error">{apiError}</p>}
          {loadingEmployees && <p>Loading employee records...</p>}
          {!loadingEmployees && page === "Dashboard" && renderDashboard()}
          {!loadingEmployees && page === "Employees" && renderEmployees()}
          {page === "Attendance" && renderAttendance()}
{page === "Leave Requests" && renderLeaveRequests()}
{page === "Payroll" && renderPayroll()}
{page === "Settings" && renderSettings()}
        </div>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <section className="employee-modal">
            <div className="modal-heading">
              <div>
                <h2>{editingId !== null ? "Edit Employee" : "Add Employee"}</h2>
                <p>Enter the employee's details below.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Full Name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter full name"
                    required
                  />
                </label>

                <label>
                  Email Address *
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="name@company.com"
                    required
                  />
                </label>

                <label>
                  Phone Number *
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField}
                    placeholder="Enter phone number"
                    pattern="[0-9+\-\s()]{7,20}"
                    required
                  />
                </label>

                <label>
                  Department *
                  <select
                    name="department"
                    value={form.department}
                    onChange={updateField}
                    required
                  >
                    <option>Engineering</option>
                    <option>Human Resources</option>
                    <option>Finance</option>
                    <option>Design</option>
                    <option>Marketing</option>
                    <option>Sales</option>
                    <option>Operations</option>
                  </select>
                </label>

                <label>
                  Job Title *
                  <input
                    name="role"
                    value={form.role}
                    onChange={updateField}
                    placeholder="e.g. Software Developer"
                    required
                  />
                </label>

                <label>
                  Monthly Salary (₹) *
                  <input
                    name="salary"
                    type="number"
                    min="0"
                    step="1"
                    value={form.salary}
                    onChange={updateField}
                    placeholder="Enter monthly salary"
                    required
                  />
                </label>

                <label>
                  Joining Date *
                  <input
                    name="joined"
                    type="date"
                    value={form.joined}
                    onChange={updateField}
                    required
                  />
                </label>

                <label>
                  Employment Status *
                  <select
                    name="status"
                    value={form.status}
                    onChange={updateField}
                    required
                  >
                    <option>Active</option>
                    <option>On Leave</option>
                  </select>
                </label>
              </div>

              {message && <p className="form-error">{message}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId !== null ? "Save Changes" : "Add Employee"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <p>{label}</p>
      <div className="stat-value">{value}</div>
      <span className="stat-caption">Current overview</span>
      
    </article>
  );
}

export default App;
