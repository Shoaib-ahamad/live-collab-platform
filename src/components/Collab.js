import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import { doc, onSnapshot, collection, addDoc, query, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc, where, getDocs, documentId, orderBy } from 'firebase/firestore';

const Collab = ({ projectId, onBackToDashboard }) => {
  const [project, setProject] = useState(null);
  const [code, setCode] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [presentUsers, setPresentUsers] = useState([]);
  const [saveStatus, setSaveStatus] = useState('Saved');
  const isUpdatingFromFirestore = useRef(false);

  const fetchPresentUsers = useCallback(async () => {
    if (!projectId) return;
    try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
            const userIds = projectSnap.data().presentUsers || [];
            if (userIds.length > 0) {
                const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', userIds));
                const usersSnapshot = await getDocs(usersQuery);
                const usersData = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setPresentUsers(usersData);
            } else {
                setPresentUsers([]);
            }
        }
    } catch (error) {
        console.error("Error fetching present users:", error);
    }
  }, [projectId]);


  useEffect(() => {
    if (!projectId || !auth.currentUser) return;

    let unsubscribes = [];

    const setupListeners = async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists() || !projectSnap.data().members.includes(auth.currentUser.uid)) {
            alert("Access Denied.");
            onBackToDashboard();
            return;
        }

        setProject(projectSnap.data());
        await updateDoc(projectRef, { presentUsers: arrayUnion(auth.currentUser.uid) });
        
        // Fetch initial user list
        fetchPresentUsers();

        const codeUnsub = onSnapshot(projectRef, (doc) => {
            isUpdatingFromFirestore.current = true;
            const remoteCode = doc.data().code || '';
            setCode(remoteCode);
            setSaveStatus('Saved');
            setTimeout(() => { isUpdatingFromFirestore.current = false; }, 0);
        }, (error) => console.error("Code listener error:", error));
        unsubscribes.push(codeUnsub);

        const chatQuery = query(collection(db, 'projects', projectId, 'chat'), orderBy('timestamp', 'asc'));
        const chatUnsub = onSnapshot(chatQuery, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChatMessages(messages);
        }, (error) => console.error("Chat listener error:", error));
        unsubscribes.push(chatUnsub);
      } catch (error) {
        console.error("Error setting up listeners:", error);
        alert("Could not connect to the project.");
        onBackToDashboard();
      }
    };

    setupListeners();

    return () => {
        unsubscribes.forEach(unsub => unsub());
        if (projectId && auth.currentUser) {
            const projectRef = doc(db, 'projects', projectId);
            updateDoc(projectRef, { presentUsers: arrayRemove(auth.currentUser.uid) });
        }
    };

  }, [projectId, onBackToDashboard, fetchPresentUsers]);

  const handleCodeChange = (e) => {
    setCode(e.target.value);
    setSaveStatus('Unsaved');
  };

  const handleSave = async () => {
    if (isUpdatingFromFirestore.current) return;
    setSaveStatus('Saving...');
    const projectRef = doc(db, 'projects', projectId);
    try {
        await updateDoc(projectRef, { code: code });
        setSaveStatus('Saved');
    } catch (error) {
        console.error("Error saving document:", error);
        setSaveStatus('Error');
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (chatInput.trim() === '' || !auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const senderName = userDoc.exists() ? userDoc.data().name : auth.currentUser.email.split('@')[0];

      await addDoc(collection(db, 'projects', projectId, 'chat'), {
        text: chatInput,
        senderId: auth.currentUser.uid,
        senderName: senderName,
        timestamp: serverTimestamp()
      });
      setChatInput('');
    } catch (error) {
      console.error("Error sending chat message:", error);
      alert("Could not send message.");
    }
  };

  if (!project) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading project...</div>;

  return (
    <div className="flex flex-col md:flex-row p-4 gap-4 h-full bg-gray-100 dark:bg-gray-900">
      {/* Left Column */}
      <div className="flex-grow md:w-1/2 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <span>{project.name}</span>
          </h2>
          <div className="flex items-center space-x-4">
            <span className={`text-sm font-medium ${saveStatus === 'Saved' ? 'text-green-500' : 'text-yellow-500'}`}>{saveStatus}</span>
            <button onClick={handleSave} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400" disabled={saveStatus !== 'Unsaved'}>Save</button>
            <button onClick={onBackToDashboard} className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">&larr; Back to Dashboard</button>
          </div>
        </div>
        <div className="flex-grow p-1">
            <textarea value={code} onChange={handleCodeChange} className="w-full h-full p-4 border-none resize-none focus:ring-0 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg" placeholder="// Start coding here..." />
        </div>
      </div>

      {/* Right Column */}
      <div className="md:w-1/2 flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 rounded-t-xl">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">Active Users ({presentUsers.length})</h3>
              <button onClick={fetchPresentUsers} title="Refresh Users" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M20 4h-5v5M4 20h5v-5" /></svg>
              </button>
          </div>
          <ul className="p-4 space-y-3">
            {presentUsers.map(user => (
              <li key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-base flex-shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{user.name} {user.id === auth.currentUser?.uid ? <span className="text-xs text-green-500">(You)</span> : ''}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col flex-grow border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 rounded-t-xl text-gray-800 dark:text-white">Live Chat</h3>
          <div className="flex-grow p-4 space-y-4 overflow-y-auto">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{msg.senderName}</span>
                <div className={`px-4 py-2 rounded-xl max-w-xs break-words shadow-sm ${msg.senderId === auth.currentUser?.uid ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-200 dark:border-gray-600 flex gap-3">
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-grow w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type a message..." />
            <button type="submit" className="bg-blue-600 text-white font-semibold p-2 rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Collab;
