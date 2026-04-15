import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, Clock, ArrowRight, Camera, Users, Award, Star, Search, Plus, Trash2, Edit2, Phone, Mail, X, Save, FileText, Globe, Check, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { notifyAdmins } from '../services/notificationService';
import { toast } from 'sonner';
import Captcha from './Captcha';
import ConfirmModal from './ConfirmModal';

interface JobApplication {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  designation: string;
  portfolioUrl?: string;
  createdAt: string;
}

interface CareersProps {
  user: any;
  role: string | null;
}

const Careers: React.FC<CareersProps> = ({ user, role }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof JobApplication; direction: 'asc' | 'desc' } | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [acceptingApplication, setAcceptingApplication] = useState<JobApplication | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    designation: '',
    portfolioUrl: ''
  });

  const [acceptFormData, setAcceptFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    designation: '',
    workAssigned: 'New Hire',
    portfolioUrl: '',
    role: 'other' as 'photographer' | 'editor' | 'admin' | 'other'
  });

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'jobApplications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JobApplication[];
      setApplications(appData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'jobApplications');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleOpenApplyModal = (jobTitle: string) => {
    setSelectedJob(jobTitle);
    setFormData({
      name: user?.displayName || '',
      email: user?.email || '',
      phoneNumber: '',
      designation: jobTitle,
      portfolioUrl: ''
    });
    setIsApplyModalOpen(true);
  };

  const handleOpenAdminModal = (application?: JobApplication) => {
    if (application) {
      setEditingApplication(application);
      setFormData({
        name: application.name,
        email: application.email,
        phoneNumber: application.phoneNumber,
        designation: application.designation,
        portfolioUrl: application.portfolioUrl || ''
      });
    } else {
      setEditingApplication(null);
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        designation: '',
        portfolioUrl: ''
      });
    }
    setIsAdminModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsApplyModalOpen(false);
    setIsAdminModalOpen(false);
    setIsAcceptModalOpen(false);
    setEditingApplication(null);
    setAcceptingApplication(null);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptchaVerified) {
      toast.error('Please complete the security verification');
      return;
    }
    try {
      await addDoc(collection(db, 'jobApplications'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      
      await notifyAdmins(
        'New Job Application',
        `${formData.name} applied for the position of ${formData.designation}.`,
        'info',
        '/careers'
      );

      toast.success('Application submitted successfully!');
      handleCloseModals();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jobApplications');
      toast.error('Failed to submit application');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApplication) {
        await updateDoc(doc(db, 'jobApplications', editingApplication.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success('Application updated');
      } else {
        await addDoc(collection(db, 'jobApplications'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        toast.success('Application added');
      }
      handleCloseModals();
    } catch (error) {
      handleFirestoreError(error, editingApplication ? OperationType.UPDATE : OperationType.CREATE, 'jobApplications');
      toast.error('Failed to save application');
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'jobApplications', itemToDelete));
      toast.success('Application deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'jobApplications');
      toast.error('Failed to delete application');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleAccept = (app: JobApplication) => {
    setAcceptingApplication(app);
    
    // Map designation to a valid role for the modal
    let initialRole: 'photographer' | 'editor' | 'admin' | 'other' = 'other';
    const designation = app.designation.toLowerCase();
    if (designation.includes('photographer')) initialRole = 'photographer';
    else if (designation.includes('editor') || designation.includes('retoucher')) initialRole = 'editor';
    else if (designation.includes('admin')) initialRole = 'admin';
    else if (designation.includes('vlog') || designation.includes('content creator')) initialRole = 'editor'; // Vlogger usually involves editing

    setAcceptFormData({
      name: app.name,
      email: app.email,
      phoneNumber: app.phoneNumber,
      designation: app.designation,
      workAssigned: 'New Hire',
      portfolioUrl: app.portfolioUrl || '',
      role: initialRole
    });
    setIsAcceptModalOpen(true);
  };

  const confirmAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptingApplication) return;
    
    try {
      setLoading(true);
      
      // 1. Add to Employees collection
      await addDoc(collection(db, 'employees'), {
        name: acceptFormData.name,
        designation: acceptFormData.designation,
        email: acceptFormData.email,
        phoneNumber: acceptFormData.phoneNumber,
        workAssigned: acceptFormData.workAssigned,
        portfolioUrl: acceptFormData.portfolioUrl,
        photoURL: '', // Default empty
        createdAt: new Date().toISOString()
      });

      // 2. Try to update user role if they already have an account
      const userQuery = query(collection(db, 'users'), where('email', '==', acceptFormData.email));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        
        // Update User Role
        await updateDoc(doc(db, 'users', userId), {
          role: acceptFormData.role,
          updatedAt: new Date().toISOString()
        });

        // Add/Update TeamMember details
        try {
          const teamMemberRef = doc(db, 'teamMembers', userId);
          const teamMemberSnap = await getDoc(teamMemberRef);
          
          const teamMemberData = {
            uid: userId,
            specialization: acceptFormData.designation,
            bio: `Joined as ${acceptFormData.designation}`,
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
        } catch (tmError) {
          console.error('Error updating team member details:', tmError);
        }

        toast.success(`${acceptFormData.name}'s user role updated to ${acceptFormData.role} and added to team.`);
      } else {
        toast.info(`${acceptFormData.name} does not have a user account yet. They have been added to the Employee List.`);
      }

      // 3. Delete the application
      await deleteDoc(doc(db, 'jobApplications', acceptingApplication.id));
      
      toast.success(`${acceptFormData.name} has been accepted and added to the team!`);
      handleCloseModals();
    } catch (error) {
      console.error('Error accepting application:', error);
      handleFirestoreError(error, OperationType.WRITE, 'employees/users/teamMembers');
      toast.error('Failed to accept application');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aValue = (a[key] || '').toString().toLowerCase();
    const bValue = (b[key] || '').toString().toLowerCase();
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof JobApplication) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const jobs = [
    {
      title: "Vlogger & Content Creator",
      location: "Berhampore, West Bengal",
      type: "Full-time / Contract",
      description: "Create engaging behind-the-scenes content, vlogs, and social media shorts to showcase our creative process and event highlights."
    },
    {
      title: "Lead Wedding Photographer",
      location: "Berhampore, West Bengal",
      type: "Full-time",
      description: "We're looking for an experienced wedding photographer with a keen eye for storytelling and emotional moments."
    },
    {
      title: "Videographer & Cinematographer",
      location: "Berhampore, West Bengal",
      type: "Full-time",
      description: "Capture cinematic wedding films and event highlights with high-end production value and storytelling."
    },
    {
      title: "Video Editor",
      location: "Remote / Hybrid",
      type: "Full-time",
      description: "Craft compelling stories from raw footage, specializing in wedding highlights and cinematic films."
    },
    {
      title: "Photo Editor & Retoucher",
      location: "Remote / Hybrid",
      type: "Full-time",
      description: "Join our post-production team to bring our captures to life with professional editing and retouching."
    },
    {
      title: "Drone Pilot",
      location: "Berhampore, West Bengal",
      type: "Contract",
      description: "Provide breathtaking aerial perspectives for our outdoor events and cinematic productions."
    },
    {
      title: "Makeup Artist",
      location: "Berhampore, West Bengal",
      type: "Part-time / Contract",
      description: "Join our bridal team to provide professional makeup services for our clients' special moments."
    },
    {
      title: "Decorators",
      location: "Berhampore, West Bengal",
      type: "Contract",
      description: "Help us create stunning visual environments for our studio shoots and event setups."
    },
    {
      title: "Catering",
      location: "Berhampore, West Bengal",
      type: "Contract",
      description: "Join our event management team to provide exceptional culinary experiences for our high-end productions."
    },
    {
      title: "Other",
      location: "Berhampore, West Bengal",
      type: "Freelance",
      description: "Other creative or event-related services. We are always looking for talented individuals to join our network."
    },
    {
      title: "Event Photography Assistant",
      location: "Berhampore, West Bengal",
      type: "Part-time / Contract",
      description: "Perfect for aspiring photographers looking to gain experience in high-end event coverage."
    },
    {
      title: "Social Media Manager",
      location: "Remote",
      type: "Full-time",
      description: "Help us share our stories with the world across Instagram, TikTok, and Pinterest."
    },
    {
      title: "Other Creative Roles",
      location: "Flexible",
      type: "Full-time / Part-time",
      description: "Have a unique skill that fits our creative studio? We're always open to meeting talented people across various disciplines."
    }
  ];

  return (
    <div className="py-24 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Join Our Creative Team</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">We're always looking for passionate storytellers, visual artists, and creative minds to join the Rays of Moment family.</p>
        </div>

        {/* Culture Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {[
            { icon: <Camera className="w-8 h-8 text-black" />, title: "State-of-the-art Gear", desc: "We provide the latest equipment and technology to help you do your best work." },
            { icon: <Users className="w-8 h-8 text-black" />, title: "Collaborative Culture", desc: "Work alongside a diverse team of award-winning photographers and artists." },
            { icon: <Award className="w-8 h-8 text-black" />, title: "Career Growth", desc: "Regular workshops, mentorship, and opportunities to lead high-profile projects." }
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 p-8 rounded-3xl text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Open Positions</h2>
          {jobs.map((job, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-black transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{job.title}</h3>
                    <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">{job.type}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 max-w-3xl">{job.description}</p>
                </div>
                <button 
                  onClick={() => handleOpenApplyModal(job.title)}
                  className="bg-gray-50 text-black px-8 py-4 rounded-xl font-bold group-hover:bg-black group-hover:text-white transition-all flex items-center justify-center space-x-2"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {isAdmin && (
          <div className="mt-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Job Applications</h2>
                <p className="text-gray-500 mt-1">Review and manage received job applications.</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400 uppercase">Sort by:</span>
                  <select 
                    value={sortConfig?.key || 'createdAt'}
                    onChange={(e) => handleSort(e.target.value as any)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-black"
                  >
                    <option value="createdAt">Date</option>
                    <option value="name">Name</option>
                    <option value="designation">Designation</option>
                  </select>
                </div>
                <div className="relative flex-grow md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => handleOpenAdminModal()}
                  className="bg-black text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Data</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th 
                        className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-black transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Applicant</span>
                          {sortConfig?.key === 'name' && (
                            <span className="text-[10px]">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-black transition-colors"
                        onClick={() => handleSort('designation')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Designation</span>
                          {sortConfig?.key === 'designation' && (
                            <span className="text-[10px]">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Portfolio</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{app.name}</div>
                          <div className="text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">
                            {app.designation}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {app.portfolioUrl ? (
                            <a 
                              href={app.portfolioUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 px-3 py-1 bg-black text-white rounded-lg text-[10px] font-bold hover:bg-gray-800 transition-colors"
                            >
                              <Globe className="w-3 h-3" />
                              <span>View Portfolio</span>
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No link</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-3 h-3 mr-2 text-gray-400" />
                              {app.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-3 h-3 mr-2 text-gray-400" />
                              {app.phoneNumber}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleAccept(app)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Accept Application"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenAdminModal(app)}
                              className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedApplications.length === 0 && (
                <div className="text-center py-20">
                  <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">No applications found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-24 bg-gray-50 rounded-3xl p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Don't see a perfect fit?</h2>
            <p className="text-gray-500">Send us your portfolio anyway! We're always open to meeting talented people.</p>
          </div>
          <button 
            onClick={() => handleOpenApplyModal('General Application')}
            className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition-all"
          >
            Send Portfolio
          </button>
        </div>
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {isApplyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModals}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">Apply for {selectedJob}</h2>
                <button onClick={handleCloseModals} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="Your Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
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
                    required
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="Your Phone Number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Portfolio Link (Google Drive/Website)</label>
                  <input
                    required
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                
                <Captcha onVerify={setIsCaptchaVerified} className="bg-white" />

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!isCaptchaVerified}
                    className="w-full bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                  >
                    <span>Submit Application</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModals}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingApplication ? 'Edit Application' : 'Add Application Data'}</h2>
                <button onClick={handleCloseModals} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
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
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <input
                    required
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-black outline-none"
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
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-black text-white py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/20"
                  >
                    <Save className="w-5 h-5" />
                    <span>{editingApplication ? 'Update Application' : 'Save Application'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Accept Application Modal */}
      <AnimatePresence>
        {isAcceptModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModals}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50">
                <h2 className="text-xl font-bold text-green-900">Accept Application</h2>
                <button onClick={handleCloseModals} className="p-2 hover:bg-green-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-green-900" />
                </button>
              </div>

              <form onSubmit={confirmAccept} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Name</label>
                    <input
                      readOnly
                      type="text"
                      value={acceptFormData.name}
                      className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</label>
                    <input
                      readOnly
                      type="email"
                      value={acceptFormData.email}
                      className="w-full px-4 py-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Designation</label>
                  <input
                    required
                    type="text"
                    value={acceptFormData.designation}
                    onChange={(e) => setAcceptFormData({ ...acceptFormData, designation: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assign Initial Work</label>
                  <input
                    required
                    type="text"
                    value={acceptFormData.workAssigned}
                    onChange={(e) => setAcceptFormData({ ...acceptFormData, workAssigned: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Role</label>
                  <select
                    value={acceptFormData.role}
                    onChange={(e) => setAcceptFormData({ ...acceptFormData, role: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  >
                    <option value="photographer">Photographer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="other">Other</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1 italic">This will update the user's account role if they have already registered.</p>
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
                    <span>Confirm Acceptance & Onboard</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Application"
        message="Are you sure you want to delete this application? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Careers;

