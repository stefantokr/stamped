import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4">☕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Sorry about that! Please refresh to try again.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            className="bg-amber-500 text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform shadow-md"
          >
            Refresh App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
