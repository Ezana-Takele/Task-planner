import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px", color: "#f87171", background: "#09090b", minHeight: "100vh", fontFamily: "sans-serif" }}>
          <h2 style={{ color: "#ffffff" }}>An error occurred while loading the application:</h2>
          <pre style={{ background: "#18181b", padding: "16px", borderRadius: "8px", color: "#fca5a5", overflow: "auto" }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ background: "#18181b", padding: "16px", borderRadius: "8px", color: "#a1a1aa", overflow: "auto", fontSize: "12px", marginTop: "12px" }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ marginTop: "20px", padding: "10px 20px", background: "#38bdf8", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
          >
            Clear Local Storage & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);