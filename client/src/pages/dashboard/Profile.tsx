import type { FormEvent } from 'react';
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
  CheckCircle2,
  Calendar,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { FadeIn } from '../../components/ui/motion';
import { ActivityHeatmap } from '../../components/profile/ActivityHeatmap';
import type { ActivityDay } from '../../types';

const roleBadge: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/30' },
  INSTRUCTOR: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  STUDENT: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30' },
};

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

  /* --- activity year graph --- */
  const [activityDays, setActivityDays] = useState<ActivityDay[] | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    // Fetched once: the graph only changes when a lab runs or a task is solved,
    // so there is nothing to poll within a session.
    let cancelled = false;
    userService
      .getMyActivity()
      .then((res) => {
        if (!cancelled) setActivityDays(res?.days || []);
      })
      .catch(() => {
        // A backend without the route degrades to the empty state, not an error.
        if (!cancelled) setActivityDays([]);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── handlers ── */
  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      const response = await userService.updateProfile(profileForm);
      updateUser(response.data);
      toast.success('Profile updated successfully!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileSaveVoid = (e: FormEvent) => {
    void handleProfileSave(e);
  };

  const handlePasswordSave = async (e: FormEvent) => {
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
      toast.success('Password updated successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      setPwError(msg);
      toast.error(msg);
    } finally {
      setPwSaving(false);
    }
  };

  const handlePasswordSaveVoid = (e: FormEvent) => {
    void handlePasswordSave(e);
  };

  const toggle = (key: 'current' | 'new' | 'confirm') => setShowPw((p) => ({ ...p, [key]: !p[key] }));

  /* ── avatar initials ── */
  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.username?.[0] || 'U').toUpperCase();

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  const roleStyle = user?.role && roleBadge[user.role] ? roleBadge[user.role] : roleBadge.STUDENT;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const passStrength = getPasswordStrength(pwForm.newPassword);

  const strengthTone =
    passStrength >= 75 ? 'text-accent' : passStrength >= 50 ? 'text-warn' : 'text-danger';
  const strengthBar =
    passStrength >= 75 ? 'bg-accent' : passStrength >= 50 ? 'bg-warn' : 'bg-danger';
  const strengthLabel =
    passStrength >= 75 ? 'Secure' : passStrength >= 50 ? 'Moderate' : 'Vulnerable';

  const inputClass =
    'w-full rounded-md border border-border bg-bg-base px-3.5 py-2 text-sm text-fg transition-colors placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30';

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Page Header ── */}
      <FadeIn>
        <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm sm:p-7">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-accent">
              Account
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            Profile &amp; security
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-fg-muted sm:text-sm">
            Manage your account details, password, and security settings.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── LEFT: Profile Summary Card ── */}
        <div className="space-y-6 lg:col-span-1">
          <FadeIn>
            <div className="flex flex-col items-center rounded-lg border border-border bg-bg-raised p-6 text-center shadow-sm">
              <div className="relative mb-3">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-accent/40 bg-bg-overlay text-2xl font-semibold text-accent">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded bg-accent text-accent-fg shadow-sm">
                  <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
                </div>
              </div>

              <h2 className="text-lg font-semibold tracking-tight text-fg">{user?.username}</h2>
              <p className="mt-0.5 font-mono text-xs text-fg-muted">{user?.email}</p>

              <div className="mt-3 flex items-center gap-2">
                <span className={`rounded border px-2.5 py-0.5 font-mono text-[11px] font-medium ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                  {user?.role || 'STUDENT'}
                </span>
                <span className="rounded border border-accent/20 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
                  Verified
                </span>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="space-y-4 rounded-lg border border-border bg-bg-raised p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  <h3 className="text-xs font-medium uppercase tracking-wider text-fg">
                    Status
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-2.5">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <Mail className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} /> Email Status
                  </span>
                  <span className="flex items-center gap-1 font-medium text-accent">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Verified
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-2.5">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <Calendar className="h-3.5 w-3.5 text-fg-muted" strokeWidth={1.75} /> Member Since
                  </span>
                  <span className="font-medium text-fg">{joinedDate}</span>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-2.5">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <Clock className="h-3.5 w-3.5 text-fg-muted" strokeWidth={1.75} /> Total Lab Time
                  </span>
                  <span className="font-semibold text-fg">{user?.totalLabTime || 0} min</span>
                </div>

                <div className="flex items-center justify-between rounded-md border border-border bg-bg-overlay p-2.5">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <DollarSign className="h-3.5 w-3.5 text-fg-muted" strokeWidth={1.75} /> Runtime Spent
                  </span>
                  <span className="font-semibold text-accent">
                    ${(user?.totalSpent || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ── RIGHT: Edit Profile & Password Form ── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Edit Profile */}
          <FadeIn>
            <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/20 bg-accent/10">
                    <User className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">
                      Personal Information
                    </h2>
                    <p className="text-xs text-fg-muted">Update your name and contact details</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSaveVoid} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-fg-muted">First Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Alex"
                      value={profileForm.firstName}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, firstName: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-fg-muted">Last Name</label>
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="e.g. Vance"
                      value={profileForm.lastName}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-fg-muted">Username</label>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
                        <Lock className="h-2.5 w-2.5" strokeWidth={1.75} /> Read-only
                      </span>
                    </div>
                    <input
                      type="text"
                      className="w-full cursor-not-allowed rounded-md border border-border bg-bg-overlay px-3.5 py-2 text-sm text-fg-muted opacity-75"
                      value={user?.username || ''}
                      disabled
                      title="Username cannot be changed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-fg-muted">Email Address</label>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
                        <Lock className="h-2.5 w-2.5" strokeWidth={1.75} /> Read-only
                      </span>
                    </div>
                    <input
                      type="email"
                      className="w-full cursor-not-allowed rounded-md border border-border bg-bg-overlay px-3.5 py-2 text-sm text-fg-muted opacity-75"
                      value={user?.email || ''}
                      disabled
                      title="Email cannot be changed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={profileSaving}
                    iconLeft={<Save className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  >
                    {profileSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </div>
          </FadeIn>

          {/* Change Password */}
          <FadeIn>
            <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/20 bg-accent/10">
                    <KeyRound className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">
                      Change Password
                    </h2>
                    <p className="text-xs text-fg-muted">Update the password used to sign in</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePasswordSaveVoid} className="space-y-4">
                {pwError && (
                  <div
                    className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-xs font-medium text-danger"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{pwError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-muted">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPw.current ? 'text' : 'password'}
                      className={`${inputClass} pr-10`}
                      placeholder="••••••••"
                      value={pwForm.currentPassword}
                      onChange={(e) =>
                        setPwForm((p) => ({ ...p, currentPassword: e.target.value }))
                      }
                      required
                    />
                    <button
                      type="button"
                      onClick={() => toggle('current')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted transition-colors hover:text-fg"
                      aria-label="Toggle password visibility"
                    >
                      {showPw.current ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-fg-muted">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw.new ? 'text' : 'password'}
                        className={`${inputClass} pr-10`}
                        placeholder="Min. 8 characters"
                        value={pwForm.newPassword}
                        onChange={(e) =>
                          setPwForm((p) => ({ ...p, newPassword: e.target.value }))
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => toggle('new')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted transition-colors hover:text-fg"
                        aria-label="Toggle password visibility"
                      >
                        {showPw.new ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-fg-muted">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPw.confirm ? 'text' : 'password'}
                        className={`${inputClass} pr-10`}
                        placeholder="Re-enter password"
                        value={pwForm.confirmPassword}
                        onChange={(e) =>
                          setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => toggle('confirm')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted transition-colors hover:text-fg"
                        aria-label="Toggle password visibility"
                      >
                        {showPw.confirm ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password strength meter */}
                {pwForm.newPassword && (
                  <div className="space-y-1.5 rounded-md border border-border bg-bg-overlay p-3">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="text-fg-muted">Password strength</span>
                      <span className={strengthTone}>{strengthLabel}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${strengthBar}`}
                        style={{ width: `${passStrength}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={pwSaving}
                    iconLeft={<ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}
                  >
                    {pwSaving ? 'Updating…' : 'Update password'}
                  </Button>
                </div>
              </form>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ── Yearly activity / streak chart ── */}
      <FadeIn>
        <ActivityHeatmap days={activityDays} loading={activityLoading} />
      </FadeIn>
    </div>
  );
};

export default Profile;
