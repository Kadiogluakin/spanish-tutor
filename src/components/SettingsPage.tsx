'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  age?: number;
  native_language?: string;
  learning_goals?: string;
  interests?: string;
  occupation?: string;
  location?: string;
  level_cefr?: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'progress'>('profile');
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    age: '',
    native_language: '',
    learning_goals: '',
    interests: '',
    occupation: '',
    location: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [resetForm, setResetForm] = useState({
    confirmationText: ''
  });

  const [messages, setMessages] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setProfileForm({
          name: data.user.name || '',
          age: data.user.age?.toString() || '',
          native_language: data.user.native_language || '',
          learning_goals: data.user.learning_goals || '',
          interests: data.user.interests || '',
          occupation: data.user.occupation || '',
          location: data.user.location || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    setMessages(null);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileForm,
          age: profileForm.age ? parseInt(profileForm.age) : null
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setProfile(prev => ({ ...prev!, ...data.profile }));
        setMessages({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessages({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessages({ type: 'error', text: 'Error updating profile' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessages({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    setMessages(null);
    
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setMessages({ type: 'success', text: 'Password updated successfully!' });
      } else {
        setMessages({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessages({ type: 'error', text: 'Error updating password' });
    } finally {
      setSaving(false);
    }
  };

  const resetProgress = async () => {
    setSaving(true);
    setMessages(null);
    
    try {
      const response = await fetch('/api/reset-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationText: resetForm.confirmationText
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResetForm({ confirmationText: '' });
        setMessages({ type: 'success', text: 'Progress reset successfully! Your learning journey starts fresh.' });
        // Refresh profile to show updated level
        fetchProfile();
      } else {
        setMessages({ type: 'error', text: data.error || 'Failed to reset progress' });
      }
    } catch (error) {
      setMessages({ type: 'error', text: 'Error resetting progress' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h1>
        <p className="text-gray-600">Manage your profile, security, and learning progress</p>
      </div>

      {/* Messages */}
      {messages && (
        <div className={`mb-6 p-4 rounded-lg ${
          messages.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {messages.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          👤 Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'security'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🔒 Security
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'progress'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📊 Progress
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
          <p className="text-gray-600 mb-6">
            This information helps Profesora Elena personalize your learning experience.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                value={profileForm.age}
                onChange={(e) => setProfileForm(prev => ({ ...prev, age: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your age"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Native Language</label>
              <select
                value={profileForm.native_language}
                onChange={(e) => setProfileForm(prev => ({ ...prev, native_language: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select your native language</option>
                <option value="English">English</option>
                <option value="Mandarin">Mandarin</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Arabic">Arabic</option>
                <option value="Russian">Russian</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
              <input
                type="text"
                value={profileForm.occupation}
                onChange={(e) => setProfileForm(prev => ({ ...prev, occupation: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your occupation"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="City, Country"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interests/Hobbies</label>
              <input
                type="text"
                value={profileForm.interests}
                onChange={(e) => setProfileForm(prev => ({ ...prev, interests: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Music, travel, cooking..."
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Learning Goals</label>
            <textarea
              value={profileForm.learning_goals}
              onChange={(e) => setProfileForm(prev => ({ ...prev, learning_goals: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Why are you learning Spanish? What are your goals?"
            />
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={updateProfile}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
          <p className="text-gray-600 mb-6">
            Update your password to keep your account secure.
          </p>
          
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="At least 6 characters"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={changePassword}
              disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Current Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Progress</h2>
            <div className="flex items-center gap-4">
              <div className="text-3xl">📊</div>
              <div>
                <div className="text-lg font-medium">CEFR Level: {profile?.level_cefr || 'A1'}</div>
                <div className="text-gray-600">Your current Spanish proficiency level</div>
              </div>
            </div>
          </div>

          {/* Reset Progress */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-4">⚠️ Reset Learning Progress</h2>
            <p className="text-red-800 mb-4">
              This will permanently delete all your learning progress, including:
            </p>
            <ul className="text-red-700 mb-6 space-y-1 list-disc list-inside">
              <li>All completed lessons and session history</li>
              <li>Vocabulary progress and SRS reviews</li>
              <li>Homework submissions and grades</li>
              <li>Error logs and skill progress</li>
              <li>Your CEFR level will reset to A1</li>
            </ul>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-red-700 mb-2">
                Type "RESET MY PROGRESS" to confirm
              </label>
              <input
                type="text"
                value={resetForm.confirmationText}
                onChange={(e) => setResetForm(prev => ({ ...prev, confirmationText: e.target.value }))}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                placeholder="RESET MY PROGRESS"
              />
              
              <button
                onClick={resetProgress}
                disabled={saving || resetForm.confirmationText !== 'RESET MY PROGRESS'}
                className="w-full px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Resetting...' : 'Reset All Progress'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}