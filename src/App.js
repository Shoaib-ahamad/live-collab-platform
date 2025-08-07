import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Collab from './components/Collab';

function App() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [projectId, setProjectId] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserName(userDocSnap.data().name);
        }
        setUser(user);
      } else {
        setUser(null);
        setUserName('');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleNavigateToCollab = (id) => {
    setProjectId(id);
    setView('collab');
  };

  const handleNavigateToDashboard = () => {
    setProjectId(null);
    setView('dashboard');
  };

  const handleLogout = () => {
    signOut(auth).catch((error) => console.error("Logout Error:", error));
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md flex-shrink-0 flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <h1 className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={handleNavigateToDashboard}>Live Collab</h1>
        </div>
        <nav className="mt-5 flex-grow">
          <a href="#" onClick={handleNavigateToDashboard} className={`flex items-center mt-4 py-2 px-6 ${view === 'dashboard' ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            Dashboard
          </a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm p-2 flex justify-between items-center border-b dark:border-gray-700">
            <div className="px-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as <span className="font-semibold">{userName || user.email}</span></p>
            </div>
            <div className="flex items-center space-x-4 px-4">
                <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    {theme === 'light' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    )}
                </button>
                <button onClick={handleLogout} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-600 transition-colors">
                    Logout
                </button>
            </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
            {view === 'dashboard' && <Dashboard user={user} userName={userName} onOpenProject={handleNavigateToCollab} />}
            {view === 'collab' && <Collab projectId={projectId} onBackToDashboard={handleNavigateToDashboard} />}
        </div>
      </main>
    </div>
  );
}

export default App;
