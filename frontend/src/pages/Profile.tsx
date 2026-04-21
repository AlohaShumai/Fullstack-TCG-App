import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ProfileData {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

function validateUsername(value: string): string {
  if (value.length < 3) return 'Must be at least 3 characters';
  if (value.length > 20) return 'Must be at most 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(value))
    return 'Only letters, numbers, and underscores allowed';
  return '';
}

export default function Profile() {
  const { logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit username modal
  const [showEditUsernameModal, setShowEditUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Notification
  const [notification, setNotification] = useState('');
  const [notifError, setNotifError] = useState(false);

  useEffect(() => {
    api
      .get('/users/me')
      .then((res) => setProfile(res.data))
      .catch(() => showNotification('Failed to load profile', true))
      .finally(() => setLoading(false));
  }, []);

  const showNotification = (msg: string, isError = false) => {
    setNotification(msg);
    setNotifError(isError);
    setTimeout(() => setNotification(''), isError ? 4000 : 2500);
  };

  const openEditUsernameModal = () => {
    setNewUsername(profile?.username ?? '');
    setUsernameError('');
    setShowEditUsernameModal(true);
  };

  const handleSaveUsername = async () => {
    const err = validateUsername(newUsername);
    if (err) {
      setUsernameError(err);
      return;
    }
    setSavingUsername(true);
    try {
      const res = await api.patch('/users/me', { username: newUsername });
      setProfile(res.data);
      updateUser({ username: newUsername });
      setShowEditUsernameModal(false);
      showNotification('Username updated!');
    } catch (e: any) {
      const msg = e.response?.data?.message ?? 'Failed to update username';
      setUsernameError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess(true);
      showNotification('Password updated!');
    } catch (e: any) {
      const msg = e.response?.data?.message ?? 'Failed to update password';
      setPasswordError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== profile?.username) return;
    setDeleting(true);
    try {
      await api.delete('/users/me');
      logout();
      navigate('/login');
    } catch {
      showNotification('Failed to delete account', true);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {notification && (
        <div
          className={`fixed bottom-6 left-1/2 text-white text-center py-3 px-5 rounded-full shadow-xl z-50 flex items-center gap-2 ${
            notifError ? 'bg-red-700' : 'bg-green-700'
          }`}
          style={{
            transform: 'translateX(-50%)',
            animation: 'bubblePop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          }}
        >
          <span>{notifError ? '✕' : '✓'}</span>
          <span>{notification}</span>
        </div>
      )}

      <div className="container mx-auto p-4 sm:p-8 max-w-2xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-8">
          Profile Settings
        </h2>

        {/* Account Info */}
        <section className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Account Info
          </h3>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Username</span>
              <span className="text-slate-100 font-medium">
                {profile?.username}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Email</span>
              <span className="text-slate-100">{profile?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Role</span>
              <span className="text-slate-300 capitalize text-sm">
                {profile?.role?.toLowerCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Member since</span>
              <span className="text-slate-300 text-sm">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          </div>
          <button
            onClick={openEditUsernameModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Edit Username
          </button>
        </section>

        {/* Change Password */}
        <section className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Change Password
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-lg">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-900/50 border border-green-700 text-green-300 text-sm p-3 rounded-lg">
                Password updated successfully.
              </div>
            )}
            <div>
              <label className="block text-slate-400 text-sm mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-semibold transition"
            >
              {savingPassword ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="bg-slate-800 rounded-lg p-6 border border-red-900/50 mb-6">
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            Danger Zone
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>
          <button
            onClick={() => {
              setDeleteConfirmText('');
              setShowDeleteModal(true);
            }}
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Delete My Account
          </button>
        </section>
      </div>

      {/* Edit Username Modal */}
      {showEditUsernameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-slate-100">
                Edit Username
              </h3>
              <button
                onClick={() => setShowEditUsernameModal(false)}
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">
                  New Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    setUsernameError(
                      e.target.value
                        ? validateUsername(e.target.value)
                        : '',
                    );
                  }}
                  className={`w-full p-3 rounded-lg bg-slate-700 text-slate-100 border focus:outline-none ${
                    usernameError
                      ? 'border-red-500'
                      : 'border-slate-600 focus:border-indigo-500'
                  }`}
                />
                {usernameError && (
                  <p className="text-red-400 text-sm mt-1">{usernameError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveUsername}
                  disabled={savingUsername || !!usernameError || !newUsername}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition"
                >
                  {savingUsername ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowEditUsernameModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-red-900/50 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold text-red-400">
                Delete Account
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm">
                This will permanently delete your account, all collections, and
                all decks. This action cannot be undone.
              </p>
              <div>
                <label className="block text-slate-400 text-sm mb-1">
                  Type{' '}
                  <span className="text-slate-100 font-mono">
                    {profile?.username}
                  </span>{' '}
                  to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={profile?.username}
                  className="w-full p-3 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 focus:border-red-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={
                    deleting || deleteConfirmText !== profile?.username
                  }
                  className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition"
                >
                  {deleting ? 'Deleting...' : 'Delete My Account'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-2 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
