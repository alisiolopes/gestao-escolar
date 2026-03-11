import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3f4f6"
        }}>
          <div style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "16px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
          }}>
            <h2>O sistema encontrou um erro</h2>
            <p>Tente recarregar a página.</p>

            <button
              onClick={this.handleReload}
              style={{
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;