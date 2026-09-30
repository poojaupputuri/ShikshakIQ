import { Component } from 'react';

export default class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('WebGL/Three.js error caught gracefully:', error.message || error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-0" style={{ background: '#0a0a0f' }} />
      );
    }
    return this.props.children;
  }
}
