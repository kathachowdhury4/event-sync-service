import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
return ( <aside className="sidebar">

```
  <div className="sidebar-header">

    <div className="logo">
      ES
    </div>

    <div>
      <div className="app-title">
        Event Sync
      </div>

      <div className="app-subtitle">
        Meeting Platform
      </div>
    </div>

  </div>

  <nav className="sidebar-nav">

    {/* =================================================
        WORKSPACE
    ================================================= */}

    <div className="menu-section">

      <div className="section-title">
        WORKSPACE
      </div>

      {/* Dashboard */}

      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ⌂
        </span>

        <span>
          Dashboard
        </span>
      </NavLink>


      {/* All Meetings */}

      <NavLink
        to="/meetings"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ▣
        </span>

        <span>
          All Meetings
        </span>
      </NavLink>


      {/* Reconciliation */}

      <NavLink
        to="/reconciliation"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ↔
        </span>

        <span>
          Reconciliation
        </span>
      </NavLink>


      {/* Review Queue */}

      <NavLink
        to="/review-queue"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ◉
        </span>

        <span>
          Review Queue
        </span>
      </NavLink>


      {/* Duplicate Explorer */}

      <NavLink
        to="/duplicates"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ◇
        </span>

        <span>
          Duplicate Explorer
        </span>
      </NavLink>


      {/* Conflicts */}

      <NavLink
        to="/conflicts"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          !
        </span>

        <span>
          Conflicts
        </span>
      </NavLink>


      {/* Validation */}

      <NavLink
        to="/validation"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ✓
        </span>

        <span>
          Validation
        </span>
      </NavLink>


      {/* Summary */}

      <NavLink
        to="/summary"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ▥
        </span>

        <span>
          Summary
        </span>
      </NavLink>

    </div>


    {/* =================================================
        SYSTEM
    ================================================= */}

    <div className="menu-section">

      <div className="section-title">
        SYSTEM
      </div>


      {/* API Health */}

      <NavLink
        to="/api-health"
        className={({ isActive }) =>
          `menu-item ${isActive ? "active" : ""}`
        }
      >
        <span className="menu-icon">
          ●
        </span>

        <span>
          API Health
        </span>
      </NavLink>


      {/* Swagger / API Documentation */}

      <a
        href="http://localhost:8000/docs"
        target="_blank"
        rel="noreferrer"
        className="menu-item"
      >
        <span className="menu-icon">
          ?
        </span>

        <span>
          API Documentation
        </span>
      </a>

    </div>

  </nav>


  {/* =================================================
      FOOTER
  ================================================= */}

  <div className="sidebar-footer">

    <div className="backend-status">

      <span className="status-dot"></span>

      <div>

        <div className="status-title">
          Backend Connected
        </div>

        <div className="status-url">
          localhost:8000
        </div>

      </div>

    </div>

  </div>

</aside>


);
}

export default Sidebar;
