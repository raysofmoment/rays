import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Users, Mail, Shield, CheckCircle, XCircle, MoreVertical, Search, User as UserIcon, History, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import CRMModal from './CRMModal';

interface TeamManagementProps {
  user: User;
  role: string | null;
}

const TeamManagement: React.FC<TeamManagementProps> = ({ user, role }) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'clients'>('team');
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setAllUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const team = allUsers.filter(u => ['admin', 'photographer', 'editor', 'other'].includes(u.role));
  const clients = allUsers.filter(u => u.role === 'client');

  const updateRole = async (userId: string, newRole: string) => {
    if (role !== 'admin') return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Management</h1>
          <p className="text-gray-500 mt-1">Manage your photography team and client relationships.</p>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'team' ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
        >
          Team Members
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'clients' ? 'bg-black text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
        >
          Client CRM
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'team' ? 'team members' : 'clients'}...`}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{activeTab === 'team' ? 'Member' : 'Client'}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{activeTab === 'team' ? 'Role' : 'Joined'}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(activeTab === 'team' ? team : clients).map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900">{member.displayName || 'Anonymous'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                  <td className="px-6 py-4">
                    {activeTab === 'team' ? (
                      <div className="flex items-center space-x-2">
                        <Shield className={`w-4 h-4 ${member.role === 'admin' ? 'text-red-500' : 'text-blue-500'}`} />
                        <span className="text-sm font-medium capitalize">{member.role}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {activeTab === 'clients' && (
                        <button
                          onClick={() => setSelectedClientId(member.uid)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View CRM Profile"
                        >
                          <History className="w-5 h-5" />
                        </button>
                      )}
                      {role === 'admin' && member.uid !== user.uid && (
                        <select
                          onChange={(e) => updateRole(member.id, e.target.value)}
                          value={member.role}
                          className="text-xs border border-gray-200 rounded p-1"
                        >
                          <option value="client">Client</option>
                          <option value="photographer">Photographer</option>
                          <option value="editor">Editor</option>
                          <option value="other">Other</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                      <button className="p-2 text-gray-400 hover:text-black">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClientId && (
        <CRMModal
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default TeamManagement;
