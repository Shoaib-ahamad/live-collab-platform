import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc, deleteDoc } from 'firebase/firestore';

const UserProfile = ({ user, userName }) => {
    if (!user) return null;
    const initial = userName ? userName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8 flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-3xl font-bold flex-shrink-0">
                {initial}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{userName || 'User'}</h2>
                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
        </div>
    );
};

const ShareModal = ({ projectId, onClose, show }) => {
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleInvite = async (e) => {
    e.preventDefault();
    setFeedback('Inviting user...');
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setFeedback('Error: User with that email not found.');
        return;
      }
      
      const userToInviteDoc = querySnapshot.docs[0];
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, {
        members: arrayUnion(userToInviteDoc.id)
      });

      setFeedback(`Successfully invited ${email}!`);
      setEmail('');

    } catch (error) {
      setFeedback('An error occurred. Please try again.');
      console.error("Error inviting user:", error);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Share Project</h3>
        <form onSubmit={handleInvite}>
          <label htmlFor="share-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invite user by email:</label>
          <input type="email" id="share-email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm" />
          {feedback && <p className="text-sm mt-2">{feedback}</p>}
          <div className="mt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold px-4 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
            <button type="submit" className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700">Invite</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const Dashboard = ({ user, userName, onOpenProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingProjectId, setSharingProjectId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchProjects = async () => {
      setLoading(true);
      const q = query(collection(db, "projects"), where("members", "array-contains", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const userProjects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(userProjects);
      setLoading(false);
    };

    const unsubscribe = auth.onAuthStateChanged(user => user && fetchProjects());
    return () => unsubscribe();
  }, []);

  const handleCreateProject = async () => {
    const projectName = prompt("Enter project name:");
    if (!projectName) return;
    const organizationId = prompt("Enter an Organization ID (this will act as a password):");
    if (!organizationId) return;

    if (auth.currentUser) {
        const newProject = {
            name: projectName,
            organizationId: organizationId,
            ownerId: auth.currentUser.uid,
            ownerEmail: auth.currentUser.email,
            members: [auth.currentUser.uid],
            code: `// Welcome to ${projectName}!\n`,
            createdAt: serverTimestamp(),
            presentUsers: []
        };
        const docRef = await addDoc(collection(db, "projects"), newProject);
        setProjects(prevProjects => [...prevProjects, { id: docRef.id, ...newProject }]);
    }
  };

  const handleOpenProjectWithPassword = async (projectId) => {
    const enteredOrgId = prompt("Please enter the Organization ID to access this project:");
    if (!enteredOrgId) return;

    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists() && projectSnap.data().organizationId === enteredOrgId) {
        onOpenProject(projectId);
    } else {
        alert("Incorrect Organization ID or project not found.");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
        await deleteDoc(doc(db, "projects", projectId));
        setProjects(projects.filter(p => p.id !== projectId));
    }
  };

  const handleRenameProject = async (projectId, currentName) => {
    const newName = prompt("Enter new project name:", currentName);
    if (newName && newName !== currentName) {
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, { name: newName });
        setProjects(projects.map(p => p.id === projectId ? { ...p, name: newName } : p));
    }
  };
  
  const handleOpenShareModal = (projectId) => {
    setSharingProjectId(projectId);
    setIsShareModalOpen(true);
  };

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="p-8">Loading projects...</div>;

  return (
    <>
      <ShareModal show={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} projectId={sharingProjectId} />
      <div className="p-8 h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <UserProfile user={user} userName={userName} />
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Your Projects</h2>
            <button onClick={handleCreateProject} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span>Create New Project</span>
            </button>
          </div>
          <div className="mb-6">
            <input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <div key={project.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Owner: {project.ownerEmail}</p>
                    {project.ownerId === auth.currentUser?.uid && (<p className="text-gray-500 text-xs mt-1">Org ID: {project.organizationId}</p>)}
                  </div>
                  <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-between items-center">
                    <button onClick={() => handleOpenProjectWithPassword(project.id)} className="text-blue-600 dark:text-blue-400 font-semibold">Open</button>
                    {project.ownerId === auth.currentUser?.uid && (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleRenameProject(project.id, project.name)} title="Rename" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
                        <button onClick={() => handleOpenShareModal(project.id)} title="Share" className="text-gray-400 hover:text-green-600 dark:hover:text-green-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>
                        <button onClick={() => handleDeleteProject(project.id)} title="Delete" className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (<p className="text-gray-500 dark:text-gray-400 col-span-full text-center">No projects found.</p>)}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
