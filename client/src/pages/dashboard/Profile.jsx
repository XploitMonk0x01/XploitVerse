import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService, authService } from '../../services';
import toast from 'react-hot-toast';
import {
    User,
    Mail,
    Lock,
    Shield,
    Clock,
    DollarSign,
    CheckCircle,
    Calendar,
    Loader2,
    Eye,
    EyeOff,
    Save,
    AlertCircle,
} from 'lucide-react';

/* ─── helpers ────────────────────────────────────────────────── */
const roleBadge = {
    ADMIN: 'bg-red-500/20 text-red-400 border border-red-500/30',
    INSTRUCTOR: 'bg-cyber-blue/10 text-cyber-blue border border-cyber-blue/30',
    STUDENT: 'bg-green-500/20 text-green-400 border border-green-500/30',
};

const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
            <Icon className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {children}
    </div>
);

const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-400">{label}</label>
        {children}
    </div>
);

const inputCls =
    'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500/60 focus:ring-1 focus:ring-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

/* ─── component ─────────────────────────────────────────────── */
const Profile = () => {
    const { user, updateUser } = useAuth();

    /* --- profile form --- */
    const [profileForm, setProfileForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
    });
    const [profileSaving, setProfileSaving] = useState(false);

    /* --- password form --- */
    const [pwForm, setPwForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPw, setShowPw] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState('');

    /* ── handlers ── */
    const handleProfileSave = async (e) => {
        e.preventDefault();
        try {
            setProfileSaving(true);
            const { data } = await userService.updateProfile(profileForm);
            updateUser(data.data?.user || profileForm);
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPwError('');

        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError('New passwords do not match.');
            return;
        }
        if (pwForm.newPassword.length < 8) {
            setPwError('New password must be at least 8 characters.');
            return;
        }

        try {
            setPwSaving(true);
            await authService.updatePassword({
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            toast.success('Password changed successfully!');
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to change password';
            setPwError(msg);
            toast.error(msg);
        } finally {
            setPwSaving(false);
        }
    };

    const toggle = (key) => setShowPw((p) => ({ ...p, [key]: !p[key] }));

    /* ── avatar initials ── */
    const initials =
        user?.firstName && user?.lastName
            ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
            : (user?.username?.[0] || 'U').toUpperCase();

    const joinedDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : 'N/A';

    /* ── render ── */
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* ── Page header ── */}
            <h1 className="text-3xl font-bold text-white mb-8">
                My <span className="text-green-400">Profile</span>
            </h1>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* ── LEFT: Avatar card ── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Avatar */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                            <span className="text-3xl font-bold text-green-400">{initials}</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white">{user?.username}</h2>
                        <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
                        <span className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${roleBadge[user?.role] || roleBadge.STUDENT}`}>
                            {user?.role}
                        </span>
                    </div>

                    {/* Account stats */}
                    <SectionCard title="Account Info" icon={Shield}>
                        <div className="space-y-3">

                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-gray-400">
                                    <Mail className="w-4 h-4" /> Email
                                </span>
                                <span className="flex items-center gap-1 text-green-400 font-medium">
                                    <CheckCircle className="w-3.5 h-3.5" /> Verified
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-gray-400">
                                    <Calendar className="w-4 h-4" /> Joined
                                </span>
                                <span className="text-gray-300">{joinedDate}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-gray-400">
                                    <Clock className="w-4 h-4" /> Lab Time
                                </span>
                                <span className="text-gray-300">{user?.totalLabTime || 0} min</span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 text-gray-400">
                                    <DollarSign className="w-4 h-4" /> Total Spent
                                </span>
                                <span className="text-gray-300">
                                    ${(user?.totalSpent || 0).toFixed(2)}
                                </span>
                            </div>

                        </div>
                    </SectionCard>
                </div>

                {/* ── RIGHT: Forms ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Edit Profile */}
                    <SectionCard title="Edit Profile" icon={User}>
                        <form onSubmit={handleProfileSave} className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="First Name">
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder="John"
                                        value={profileForm.firstName}
                                        onChange={(e) =>
                                            setProfileForm((p) => ({ ...p, firstName: e.target.value }))
                                        }
                                    />
                                </Field>
                                <Field label="Last Name">
                                    <input
                                        type="text"
                                        className={inputCls}
                                        placeholder="Doe"
                                        value={profileForm.lastName}
                                        onChange={(e) =>
                                            setProfileForm((p) => ({ ...p, lastName: e.target.value }))
                                        }
                                    />
                                </Field>
                            </div>

                            <Field label="Username">
                                <input
                                    type="text"
                                    className={inputCls}
                                    value={user?.username || ''}
                                    disabled
                                    title="Username cannot be changed"
                                />
                            </Field>

                            <Field label="Email">
                                <input
                                    type="email"
                                    className={inputCls}
                                    value={user?.email || ''}
                                    disabled
                                    title="Email cannot be changed"
                                />
                            </Field>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={profileSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-gray-900 font-semibold rounded-lg text-sm transition-colors"
                                >
                                    {profileSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {profileSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </SectionCard>

                    {/* Change Password */}
                    <SectionCard title="Change Password" icon={Lock}>
                        <form onSubmit={handlePasswordSave} className="space-y-4">

                            {pwError && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {pwError}
                                </div>
                            )}

                            {[
                                { key: 'current', field: 'currentPassword', label: 'Current Password' },
                                { key: 'new', field: 'newPassword', label: 'New Password' },
                                { key: 'confirm', field: 'confirmPassword', label: 'Confirm New Password' },
                            ].map(({ key, field, label }) => (
                                <Field key={key} label={label}>
                                    <div className="relative">
                                        <input
                                            type={showPw[key] ? 'text' : 'password'}
                                            className={`${inputCls} pr-10`}
                                            placeholder="••••••••"
                                            value={pwForm[field]}
                                            onChange={(e) =>
                                                setPwForm((p) => ({ ...p, [field]: e.target.value }))
                                            }
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggle(key)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPw[key] ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </Field>
                            ))}

                            <p className="text-xs text-gray-500">
                                Password must be at least 8 characters long.
                            </p>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={pwSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/50 text-white font-semibold rounded-lg text-sm transition-colors"
                                >
                                    {pwSaving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Lock className="w-4 h-4" />
                                    )}
                                    {pwSaving ? 'Updating…' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </SectionCard>

                </div>
            </div>
        </div>
    );
};

export default Profile;
