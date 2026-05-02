import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-shell">
          <section className="control-band">
            <h1>Dashboard could not load</h1>
            <p className="error-message">{this.state.error.message}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
