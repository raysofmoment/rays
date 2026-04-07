import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Search, Trash2, Edit2, Phone, Mail, Briefcase, Globe, User, Users, X, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface Employee {
  id: string;
  name: string;
  designation: string;
  email: string;
  phoneNumber: string;
  workAssigned: string;
  portfolioUrl: string;
  photoURL: string;
  createdAt: string;
}

interface EmployeeListProps {
  userRole: string | null;
}

const EmployeeList: React.FC<EmployeeListProps> = ({ userRole }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [transferringEmployee, setTransferringEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    email: '',
    phoneNumber: '',
    workAssigned: '',
    portfolioUrl: '',
    photoURL: ''
  });

  const [transferFormData, setTransferFormData] = useState({
    role: 'other' as 'photographer' | 'editor' | 'admin' | 'other',
    specialization: '',
    bio: ''
  });

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const employeeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      setEmployees(employeeData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name,
        designation: employee.designation,
        email: employee.email,
        phoneNumber: employee.phoneNumber || '',
        workAssigned: employee.workAssigned || '',
        portfolioUrl: employee.portfolioUrl || '',
        photoURL: employee.photoURL || ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        designation: '',
        email: '',
        phoneNumber: '',
        workAssigned: '',
        portfolioUrl: '',
        photoURL: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsTransferModalOpen(false);
    setEditingEmployee(null);
    setTransferringEmployee(null);
  };

  const handleOpenTransferModal = (employee: Employee) => {
    setTransferringEmployee(employee);
    
    let initialRole: 'photographer' | 'editor' | 'admin' | 'other' = 'other';
    const designation = employee.designation.toLowerCase();
    if (designation.includes('photographer')) initialRole = 'photographer';
    else if (designation.includes('editor') || designation.includes('retoucher')) initialRole = 'editor';
    else if (designation.includes('admin')) initialRole = 'admin';

    setTransferFormData({
      role: initialRole,
      specialization: employee.designation,
      bio: `Joined as ${employee.designation}`
    });
    setIsTransferModalOpen(true);
  };

  const confirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringEmployee) return;

    try {
      setLoading(true);
      
      // Find user by email
      const userQuery = query(collection(db, 'users'), where('email', '==', transferringEmployee.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        
        // 1. Update User Role
        await updateDoc(doc(db, 'users', userId), {
          role: transferFormData.role,
          updatedAt: new Date().toISOString()
        });

        // 2. Add/Update TeamMember details
        const teamMemberRef = doc(db, 'teamMembers', userId);
        const teamMemberSnap = await getDoc(teamMemberRef);
        
        const teamMemberData = {
          uid: userId,
          specialization: transferFormData.specialization,
          bio: transferFormData.bio,
          availability: true,
          updatedAt: new Date().toISOString()
        };

        if (teamMemberSnap.exists()) {
          await updateDoc(teamMemberRef, teamMemberData);
        } else {
          await setDoc(teamMemberRef, {
            ...teamMemberData,
            createdAt: new Date().toISOString()
          });
        }

        toast.success(`${transferringEmployee.name} has been successfully transferred to the team!`);
        handleCloseModal();
      } else {
        toast.error(`${transferringEmployee.name} does not have a registered account with email ${transferringEmployee.email}. Please ask them to sign up first.`);
      }
    } catch (error) {
      console.error('Error transferring employee:', error);
      toast.error('Failed to transfer employee to team');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await updateDoc(doc(db, 'employees', editingEmployee.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success('Employee profile updated');
      } else {
        await addDoc(collection(db, 'employees'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        toast.success('Employee profile added');
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Failed to save employee profile');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this employee profile?')) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
      toast.success('Employee profile removed');
    } catch (error) {
      toast.error('Failed to remove employee profile');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee List</h1>
          <p className="text-gray-500 mt-1">Manage and view our photography team profiles.</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Profile</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((emp) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={emp.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-50">
                    {emp.photoURL ? (
                      <img src={emp.photoURL} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{emp.name}</h3>
                    <p className="text-sm font-medium text-gray-500">{emp.designation}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenTransferModal(emp)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Transfer to Team"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(emp)}
                      className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
                      title="Edit Profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="truncate">{emp.email}</span>
                </div>
                {emp.phoneNumber && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-3 text-gray-400" />
                    <span>{emp.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-start text-sm text-gray-600">
                  <Briefcase className="w-4 h-4 mr-3 mt-0.5 text-gray-400" />
                  <span>{emp.workAssigned || 'No work assigned'}</span>
                </div>
                {emp.portfolioUrl && (
                  <a
                    href={emp.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-black font-semibold hover:underline"
                  >
                    <Globe className="w-4 h-4 mr-3 text-gray-400" />
                    View Portfolio
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No employees found</h3>
          <p className="text-gray-500">Try adjusting your search or add a new profile.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingEmployee ? 'Edit Profile' : 'Add New Profile'}</h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Designation</label>
                    <input
                      required
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                      placeholder="e.g. Lead Photographer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Work Assigned</label>
                  <textarea
                    value={formData.workAssigned}
                    onChange={(e) => setFormData({ ...formData, workAssigned: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none resize-none"
                    rows={2}
                    placeholder="Describe current projects or responsibilities..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Portfolio URL</label>
                  <input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="https://portfolio.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Photo URL</label>
                  <input
                    type="url"
                    value={formData.photoURL}
                    onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="https://image-link.com"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingEmployee ? 'Update Profile' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {isTransferModalOpen && transferringEmployee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50">
                <h2 className="text-xl font-bold text-green-900">Transfer to Team</h2>
                <button onClick={handleCloseModal} className="p-2 hover:bg-green-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-green-900" />
                </button>
              </div>

              <form onSubmit={confirmTransfer} className="p-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl mb-4">
                  <p className="text-sm text-gray-600">Transferring <span className="font-bold text-black">{transferringEmployee.name}</span> to the active team. This will update their system permissions and profile.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Role</label>
                  <select
                    value={transferFormData.role}
                    onChange={(e) => setTransferFormData({ ...transferFormData, role: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  >
                    <option value="photographer">Photographer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Specialization</label>
                  <input
                    required
                    type="text"
                    value={transferFormData.specialization}
                    onChange={(e) => setTransferFormData({ ...transferFormData, specialization: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                    placeholder="e.g. Cinematic Videography"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Short Bio</label>
                  <textarea
                    required
                    value={transferFormData.bio}
                    onChange={(e) => setTransferFormData({ ...transferFormData, bio: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none resize-none"
                    rows={3}
                    placeholder="Brief introduction for the team page..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-5 h-5" />
                    )}
                    <span>Confirm Transfer</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeList;
