function Header() {
  return (
    <header className="app-header">

      <div className="header-content">

        <div>
          <h1>
            Event Sync Service
          </h1>

          <p className="header-subtitle">
            CRM & Calendar Reconciliation
          </p>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>

          <span>
            Reconciliation Engine
          </span>
        </div>

      </div>

    </header>
  );
}

export default Header;