import React, { useCallback, useState } from 'react';
import { XERParser } from './lib/xer-parser';
import { useProjectStore } from './store/useProjectStore';
import WBSNavigation from './components/dashboard/WBSNavigation';
import ActivityGrid from './components/dashboard/ActivityGrid';
import GanttChart from './components/dashboard/GanttChart';
import { useFilteredActivities } from './hooks/useFilteredActivities';
import './App.css';

function App() {
  const loadProject = useProjectStore(state => state.loadProject);
  const projectData = useProjectStore(state => state.projectData);
  const fileName = useProjectStore(state => state.fileName);

  const filteredActivities = useFilteredActivities();

  const [activeTab, setActiveTab] = useState<'activities' | 'gantt'>('activities');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xer')) {
      alert('Please upload a valid .xer file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.readAsText(file, 'ISO-8859-1');

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        alert('File appears to be empty. Please check your file and try again.');
        event.target.value = '';
        return;
      }

      try {
        const parser = new XERParser(content);
        const data = parser.parse();
        loadProject(data, file.name);
        event.target.value = '';
      } catch (err) {
        console.error("Parsing failed", err);
        alert('Failed to parse XER file. Please ensure it\'s a valid Primavera P6 export file.');
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
      event.target.value = '';
    };
  }, [loadProject]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-container">
              <h1 className="app-title">Primavera Prodigy</h1>
            </div>
          </div>
          
          {projectData && (
            <div className="activity-counter">
              Showing <span className="count">{filteredActivities.length}</span>
              <span className="separator">/</span>
              <span className="total">{projectData.activities.length}</span>
            </div>
          )}
        </div>
      </header>

      {!projectData ? (
        /* Upload Screen */
        <main className="upload-screen">
          <div className="upload-container">
            <div className="upload-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="upload-title">Upload Your Schedule</h2>
            <p className="upload-description">
              Primavera P6 <span className="file-type">.xer</span> files supported
            </p>

            <label className="upload-button-label">
              <input
                type="file"
                accept=".xer"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <span className="upload-button">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Choose File
              </span>
            </label>
            
            <p className="upload-security">Secure • Fast • Private</p>
          </div>
        </main>
      ) : (
        /* Dashboard */
        <main className="dashboard-container">
          <div className="dashboard-content">
            {/* Sidebar */}
            <aside className="sidebar">
              <WBSNavigation />
            </aside>

            {/* Main Panel */}
            <div className="main-panel">
              {/* Panel Header */}
              <div className="panel-header">
                <div className="panel-title-section">
                  <div>
                    <h2 className="panel-title">{fileName}</h2>
                  </div>
                </div>
                <div className="panel-badge">
                  {filteredActivities.length} Activities
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs-container">
                <button
                  onClick={() => setActiveTab('activities')}
                  className={`tab-button ${activeTab === 'activities' ? 'active' : ''}`}
                >
                  <span className="tab-icon">📋</span>
                  <span>Activities</span>
                </button>
                <button
                  onClick={() => setActiveTab('gantt')}
                  className={`tab-button ${activeTab === 'gantt' ? 'active' : ''}`}
                >
                  <span className="tab-icon">📊</span>
                  <span>Gantt Chart</span>
                </button>
              </div>

              {/* Content */}
              <div className="content-area">
                <div className="content-scroll">
                  {activeTab === 'activities' && <ActivityGrid />}
                  {activeTab === 'gantt' && <GanttChart />}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;