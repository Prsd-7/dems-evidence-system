import Sidebar from "./Sidebar"
import Navbar  from "./Navbar"

function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Navbar />
        <div style={{ padding: "28px 32px", flex: 1, overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default Layout