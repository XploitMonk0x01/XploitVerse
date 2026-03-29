import { useEffect, useState } from 'react';
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
    ADMIN: 'text-error bg-error/10 border-error/40',
    INSTRUCTOR: 'text-info bg-info/10 border-info/40',
    STUDENT: 'text-success bg-success/10 border-success/40',
};

const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="bg-surface border border-border p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.22)]">
        <div className="flex items-center gap-2 mb-5 border-b border-border pb-3">
            <Icon className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-mono font-bold tracking-[0.16em] text-ink uppercase">{title}</h2>
        </div>
        {children}
    </div>
);

const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-mono font-bold tracking-[0.12em] text-muted uppercase">{label}</label>
        {children}
    </div>
);

const inputCls =
    'w-full bg-surface border border-border px-4 py-2.5 text-ink text-sm font-mono placeholder:text-muted focus:outline-none focus:border-border-focus focus:bg-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:border-dashed';

/* ─── component ─────────────────────────────────────────────── */
const Profile = () => {
    const { user, updateUser } = useAuth();

    /* --- profile form --- */
    const [profileForm, setProfileForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
    });
    const [profileSaving, setProfileSaving] = useState(false);

    useEffect(() => {
        setProfileForm({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
        });
    }, [user?.firstName, user?.lastName]);

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
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwForm.newPassword)) {
            setPwError('Password must include lowercase, uppercase, and a number.');
            return;
        }

        try {
            setPwSaving(true);
            const { data } = await authService.updatePassword({
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
                confirmNewPassword: pwForm.confirmPassword,
            });

            if (data?.data?.token) {
                localStorage.setItem('token', data.data.token);
            }

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono">

            {/* ── Page header ── */}
            <div className="mb-8 border-b border-dashed border-border pb-6">
                <h1 className="text-3xl font-display font-bold text-ink uppercase tracking-wide">
                    Operator <span className="text-accent">Profile</span>
                </h1>
                <p className="text-xs text-muted uppercase tracking-[0.2em] mt-2">
                    Identity matrix, security credentials, and account telemetry.
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">

                {/* ── LEFT: Avatar card ── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Avatar */}
                    <div className="bg-surface border border-border p-6 flex flex-col items-center text-center shadow-[4px_4px_0px_rgba(0,0,0,0.22)]">
                        <div className="w-24 h-24 bg-paper border border-border flex items-center justify-center mb-4 shadow-[3px_3px_0px_rgba(255,69,0,0.15)]">
                            <span className="text-3xl font-display font-bold text-accent">{initials}</span>
                        </div>
                        <h2 className="text-xl font-display font-bold text-ink uppercase tracking-wide">{user?.username}</h2>
                        <p className="text-muted text-xs mt-1 tracking-widest uppercase">{user?.email}</p>
                        <span className={`mt-4 px-3 py-1 border text-xs font-mono font-bold tracking-widest ${roleBadge[user?.role] || roleBadge.STUDENT}`}>
                            {user?.role}
                        </span>
                    </div>

                    {/* Account stats */}
                    <SectionCard title="Account Info" icon={Shield}>
                        <div className="space-y-3">

                            <div className="flex items-center justify-between text-sm border border-border bg-paper px-3 py-2">
                                <span className="flex items-center gap-2 text-muted uppercase tracking-wider text-xs">
                                    <Mail className="w-4 h-4" /> Email
                                </span>
                                <span className={`flex items-center gap-1 font-bold tracking-wider text-xs uppercase ${user?.isEmailVerified ? 'text-success' : 'text-warning'}`}>
                                    <CheckCircle className="w-3.5 h-3.5" /> {user?.isEmailVerified ? 'Verified' : 'Pending'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-sm border border-border bg-paper px-3 py-2">
                                <span className="flex items-center gap-2 text-muted uppercase tracking-wider text-xs">
                                    <Calendar className="w-4 h-4" /> Joined
                                </span>
                                <span className="text-ink text-xs font-bold tracking-wide">{joinedDate}</span>
                            </div>

                            <div className="flex items-center justify-between text-sm border border-border bg-paper px-3 py-2">
                                <span className="flex items-center gap-2 text-muted uppercase tracking-wider text-xs">
                                    <Clock className="w-4 h-4" /> Lab Time
                                </span>
                                <span className="text-ink text-xs font-bold tracking-wide">{user?.totalLabTime || 0} min</span>
                            </div>

                            <div className="flex items-center justify-between text-sm border border-border bg-paper px-3 py-2">
                                <span className="flex items-center gap-2 text-muted uppercase tracking-wider text-xs">
                                    <DollarSign className="w-4 h-4" /> Total Spent
                                </span>
                                <span className="text-ink text-xs font-bold tracking-wide">
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
                                    className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover border border-accent hover:border-accent-hover disabled:opacity-60 disabled:cursor-not-allowed text-paper font-mono font-bold text-xs uppercase tracking-widest transition-colors shadow-[3px_3px_0px_rgba(255,69,0,0.18)]"
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
                                <div className="flex items-center gap-2 p-3 bg-error/10 border border-error text-error text-xs font-mono font-bold tracking-wider uppercase">
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
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
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

                            <p className="text-xs text-muted tracking-wide uppercase">
                                Password must be 8+ chars with uppercase, lowercase, and number.
                            </p>

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={pwSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 border border-border bg-paper hover:bg-surface disabled:opacity-60 disabled:cursor-not-allowed text-ink font-mono font-bold text-xs uppercase tracking-widest transition-colors"
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
