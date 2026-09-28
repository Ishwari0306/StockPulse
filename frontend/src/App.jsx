import React, { useState, useEffect } from 'react'

function App() {
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(response => response.json())
      .then(data => setHealthStatus(data))
      .catch(error => {
        console.error('Error fetching health status:', error);
        setHealthStatus({ success: false, error: 'Failed to connect to backend' });
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>StockPulse</h1>
        <p>AI-assisted inventory and dynamic-pricing engine</p>
        
        <div>
          <h2>System Health Check</h2>
          {healthStatus ? (
            <p>Status: {healthStatus.success ? '✅ Healthy' : '❌ Unhealthy'}</p>
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </header>
    </div>
  )
}

export default App