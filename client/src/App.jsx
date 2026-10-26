
import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000/api/employees";
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

  useEffect(() => {
    loadEmployees();
  }, []);

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
          {!loadingEmployees && !["Dashboard", "Employees"].includes(page) && renderOtherPage()}
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
