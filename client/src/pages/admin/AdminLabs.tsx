import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  Boxes,
  FileCode2,
  FilePlus2,
  FolderUp,
  Hammer,
  Plus,
  RefreshCw,
  Rocket,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { adminService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import type { AdminLab } from '../../types';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
  Select,
  Textarea,
} from '../../components/ui';

interface LabFileEntry {
  id: string;
  path: string;
  file?: File;
  content?: string;
}

interface LabFormState {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  category: string;
  dockerImage: string;
  ports: string;
  flag: string;
  points: string;
  hintPenalty: string;
  taskTitle: string;
  taskBody: string;
  taskPrompt: string;
  hints: string;
  buildNow: boolean;
}

const EMPTY_FORM: LabFormState = {
  title: '',
  slug: '',
  description: '',
  difficulty: 'Easy',
  category: 'Web Exploitation',
  dockerImage: '',
  ports: '22/tcp,80/tcp',
  flag: '',
  points: '100',
  hintPenalty: '25',
  taskTitle: 'Find the Flag',
  taskBody: '',
  taskPrompt: 'Submit the flag.',
  hints: '',
  buildNow: true,
};

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'].map((d) => ({ value: d, label: d }));

let fileSeq = 0;
const nextId = () => `f${Date.now()}_${fileSeq++}`;

/** Drops the leading folder name browsers prefix onto directory uploads. */
const stripTopFolder = (path: string): string => {
  const normalized = path.replace(/\\/g, '/').replace(/^\.\//, '');
  const idx = normalized.indexOf('/');
  if (idx === -1) return normalized;
  return normalized.slice(idx + 1);
};

const errorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return err instanceof Error && err.message ? err.message : fallback;
};

const AdminLabs = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('ADMIN');

  const [labs, setLabs] = useState<AdminLab[]>([]);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LabFormState>(EMPTY_FORM);
  const [dockerfile, setDockerfile] = useState('');
  const [files, setFiles] = useState<LabFileEntry[]>([]);
  const [validating, setValidating] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<AdminLab | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [buildingId, setBuildingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dockerfileInputRef = useRef<HTMLInputElement>(null);

  // `webkitdirectory` is not a typed React prop; set it imperatively.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const loadLabs = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await adminService.listLabs();
      setLabs(data.labs ?? []);
      setDockerAvailable(data.dockerAvailable);
    } catch (err) {
      setLoadError(errorMessage(err, 'Failed to load labs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLabs();
  }, [loadLabs]);

  const setField = <K extends keyof LabFormState>(key: K, value: LabFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setDockerfile('');
    setFiles([]);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const addUploadedFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const added: LabFileEntry[] = [];
    for (const file of Array.from(list)) {
      const raw = file.webkitRelativePath && file.webkitRelativePath.length > 0
        ? stripTopFolder(file.webkitRelativePath)
        : file.name;
      added.push({ id: nextId(), path: raw, file });
    }
    setFiles((prev) => [...prev, ...added]);
  };

  const addTextFile = () => {
    setFiles((prev) => [...prev, { id: nextId(), path: 'app/notes.txt', content: '' }]);
  };

  const updateFile = (id: string, patch: Partial<LabFileEntry>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const onDockerfileFile = async (list: FileList | null) => {
    const file = list?.[0];
    if (!file) return;
    const text = await file.text();
    setDockerfile(text);
    toast.success(`Loaded ${file.name}`);
  };

  const hasDockerfileFile = useMemo(
    () => files.some((f) => f.path.split('/').pop()?.toLowerCase() === 'dockerfile'),
    [files],
  );

  const validateDockerfile = async () => {
    if (!dockerfile.trim()) {
      toast.error('Paste a Dockerfile to validate');
      return;
    }
    setValidating(true);
    try {
      const result = await adminService.validateDockerfile(dockerfile);
      if (result.valid) {
        toast.success('Dockerfile looks good');
      } else {
        toast.error(result.issues.join(' • '));
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Validation failed'));
    } finally {
      setValidating(false);
    }
  };

  const submitCreate = async () => {
    if (!form.title.trim()) {
      toast.error('A lab title is required');
      return;
    }
    if (!dockerfile.trim() && !hasDockerfileFile) {
      toast.error('Provide a Dockerfile (paste it or upload one)');
      return;
    }

    const formData = new FormData();
    const metadata = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      difficulty: form.difficulty,
      category: form.category.trim(),
      dockerImage: form.dockerImage.trim(),
      ports: form.ports
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      flag: form.flag.trim(),
      points: Number.parseInt(form.points, 10) || 0,
      hintPenalty: Number.parseInt(form.hintPenalty, 10) || 0,
      taskTitle: form.taskTitle.trim(),
      taskBody: form.taskBody.trim(),
      taskPrompt: form.taskPrompt.trim(),
      hints: form.hints
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean),
      buildNow: form.buildNow,
    };
    formData.append('metadata', JSON.stringify(metadata));
    if (dockerfile.trim()) {
      formData.append('dockerfile', dockerfile);
    }
    // Browsers strip directory names from multipart filenames, so the relative
    // paths are sent separately and aligned by index with the file parts.
    const paths: string[] = [];
    for (const entry of files) {
      const path = entry.path.trim();
      if (!path) continue;
      if (entry.file) {
        formData.append('files', entry.file, path);
      } else {
        formData.append('files', new Blob([entry.content ?? ''], { type: 'text/plain' }), path);
      }
      paths.push(path);
    }
    if (paths.length > 0) {
      formData.append('paths', JSON.stringify(paths));
    }

    setSubmitting(true);
    try {
      const result = await adminService.createLab(formData);
      const slug = result.lab?.slug;
      if (result.buildStatus === 'failed' && result.buildError) {
        toast.error(`Lab created, but image build failed: ${result.buildError}`);
      } else {
        toast.success(`Lab "${result.lab?.title ?? slug}" is now live`);
      }
      setCreateOpen(false);
      resetForm();
      await loadLabs();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create lab'));
    } finally {
      setSubmitting(false);
    }
  };

  const rebuild = async (lab: AdminLab) => {
    setBuildingId(lab.id);
    try {
      await adminService.buildLab(lab.id);
      toast.success(`Rebuilt ${lab.title}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Docker build failed'));
    } finally {
      setBuildingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteLab(pendingDelete.id);
      toast.success(`Deleted ${pendingDelete.title}`);
      setPendingDelete(null);
      await loadLabs();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete lab'));
    } finally {
      setDeleting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-8">
        <Alert variant="error" title="Restricted">
          Lab authoring is limited to administrators.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 rounded-lg border border-border bg-bg-raised p-6 shadow-sm md:flex-row md:items-center sm:p-7">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-xs font-medium uppercase tracking-wider text-accent">Admin Panel</span>
            <Badge variant={dockerAvailable ? 'success' : 'warning'} className="ml-1">
              {dockerAvailable ? 'Docker online' : 'Docker mock mode'}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Challenge Lab Factory</h1>
          <p className="mt-1 max-w-2xl text-xs text-fg-muted sm:text-sm">
            Paste or upload a challenge Dockerfile, attach supporting files and folders, then publish it as a live
            Docker lab.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => void loadLabs()} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
            New Lab
          </Button>
        </div>
      </div>

      {!dockerAvailable && (
        <Alert variant="warning" title="Docker is not reachable">
          The API is running in mock mode, so uploaded labs are registered in the database but not compiled into
          images. Start the Docker daemon and rebuild a lab to publish a runnable container.
        </Alert>
      )}

      {loadError && (
        <Alert variant="error" title="Failed to load labs" dismissible onDismiss={() => setLoadError('')}>
          {loadError}
        </Alert>
      )}

      {/* Existing labs */}
      <div className="rounded-lg border border-border bg-bg-raised">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg">Registered Labs</h2>
          </div>
          <span className="font-mono text-xs text-fg-muted">{labs.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : labs.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-5 w-5" />}
            title="No labs yet"
            description="Create your first Docker challenge to see it here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                  <th className="px-6 py-3 font-medium">Lab</th>
                  <th className="px-4 py-3 font-medium">Difficulty</th>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {labs.map((lab) => (
                  <tr key={lab.id} className="transition-colors hover:bg-bg-overlay">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-fg">{lab.title}</div>
                      <div className="font-mono text-[10px] text-fg-muted">
                        /{lab.slug || lab.sourceRef.replace(/^challenges\//, '') || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={lab.difficulty === 'Hard' ? 'hard' : lab.difficulty === 'Medium' ? 'medium' : 'easy'}>
                        {lab.difficulty}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-fg-muted">{lab.dockerImage}</td>
                    <td className="px-4 py-3">
                      <Badge variant={lab.isActive ? 'success' : 'muted'} pulse>
                        {lab.isActive ? 'Live' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void rebuild(lab)}
                          isLoading={buildingId === lab.id}
                          disabled={buildingId === lab.id || !lab.buildContextPath}
                          title="Rebuild the Docker image"
                        >
                          <Hammer className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                          Build
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setPendingDelete(lab)}
                          aria-label={`Delete ${lab.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => (submitting ? undefined : setCreateOpen(false))}
        title="Publish a new Docker lab"
        description="Define the challenge, provide the Dockerfile and any supporting files, then deploy."
        size="full"
        closeOnOverlayClick={!submitting}
        closeOnEscape={!submitting}
      >
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          {/* Challenge details */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <FileCode2 className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} /> Challenge details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                required
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="SQL Injection Playground"
              />
              <Input
                label="Slug"
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                placeholder="auto-generated-from-title"
                hint="Lowercase letters, digits, dashes. Used for the lab directory and URL."
              />
              <Select
                label="Difficulty"
                options={DIFFICULTIES}
                value={form.difficulty}
                onChange={(e) => setField('difficulty', e.target.value)}
              />
              <Input
                label="Category"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                placeholder="Web Exploitation"
              />
              <Input
                label="Docker image tag"
                value={form.dockerImage}
                onChange={(e) => setField('dockerImage', e.target.value)}
                placeholder="xploitverse/<slug>:latest"
                mono
              />
              <Input
                label="Exposed ports"
                value={form.ports}
                onChange={(e) => setField('ports', e.target.value)}
                placeholder="22/tcp,80/tcp"
                hint="Comma separated. Defaults applied when empty."
                mono
              />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="What the challenge covers and what the student must exploit."
              rows={2}
            />
          </section>

          {/* Flag */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <ShieldAlert className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} /> Flag & scoring
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Flag"
                value={form.flag}
                onChange={(e) => setField('flag', e.target.value)}
                placeholder="FLAG{xv_my_lab}"
                hint="Auto-generated from the slug when empty."
                mono
              />
              <Input
                label="Points"
                type="number"
                value={form.points}
                onChange={(e) => setField('points', e.target.value)}
                mono
              />
              <Input
                label="Hint penalty"
                type="number"
                value={form.hintPenalty}
                onChange={(e) => setField('hintPenalty', e.target.value)}
                mono
              />
            </div>
            <Alert variant="info">
              The flag is written to <span className="font-mono">flag.txt</span> in the build context. Make sure your
              Dockerfile copies it into the image (e.g. <span className="font-mono">COPY flag.txt /flag.txt</span>).
            </Alert>
          </section>

          {/* Task */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Task & hints</h3>
            <Input
              label="Task title"
              value={form.taskTitle}
              onChange={(e) => setField('taskTitle', e.target.value)}
            />
            <Textarea
              label="Task body (markdown)"
              value={form.taskBody}
              onChange={(e) => setField('taskBody', e.target.value)}
              rows={3}
              mono
            />
            <Input
              label="Task prompt"
              value={form.taskPrompt}
              onChange={(e) => setField('taskPrompt', e.target.value)}
            />
            <Textarea
              label="Hints (one per line)"
              value={form.hints}
              onChange={(e) => setField('hints', e.target.value)}
              rows={3}
            />
          </section>

          {/* Dockerfile */}
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
              <FileCode2 className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} /> Dockerfile
            </h3>
            <Textarea
              label="Paste Dockerfile"
              value={dockerfile}
              onChange={(e) => setDockerfile(e.target.value)}
              rows={12}
              mono
              placeholder={'FROM ubuntu:22.04\nRUN apt-get update && apt-get install -y nginx\nCOPY flag.txt /flag.txt\nEXPOSE 80'}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => void validateDockerfile()} isLoading={validating}>
                Validate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => dockerfileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                Upload Dockerfile
              </Button>
              <input
                ref={dockerfileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  void onDockerfileFile(e.target.files);
                  e.target.value = '';
                }}
              />
              <span className="text-xs text-fg-subtle">
                A pasted Dockerfile is optional if a file named <span className="font-mono">Dockerfile</span> is attached
                below.
              </span>
            </div>
          </section>

          {/* Supporting files */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Supporting files & folders</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FilePlus2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  Add files
                </Button>
                <Button variant="secondary" size="sm" onClick={() => folderInputRef.current?.click()}>
                  <FolderUp className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  Add folder
                </Button>
                <Button variant="subtle" size="sm" onClick={addTextFile}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  New text file
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addUploadedFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addUploadedFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {files.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-fg-subtle">
                No supporting files attached. Upload individual files, a whole folder, or add an editable text file.
              </p>
            ) : (
              <div className="space-y-3">
                {files.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-border bg-bg-overlay p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={entry.path}
                        onChange={(e) => updateFile(entry.id, { path: e.target.value })}
                        placeholder="relative/path/to/file"
                        mono
                        aria-label="File path"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(entry.id)}
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                    {entry.file ? (
                      <p className="mt-2 font-mono text-[11px] text-fg-subtle">
                        Uploaded · {(entry.file.size / 1024).toFixed(1)} KB
                      </p>
                    ) : (
                      <Textarea
                        className="mt-2"
                        rows={4}
                        mono
                        value={entry.content ?? ''}
                        onChange={(e) => updateFile(entry.id, { content: e.target.value })}
                        placeholder="file contents"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Options */}
          <label className="flex items-center gap-3 rounded-md border border-border bg-bg-overlay p-3 text-sm text-fg">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={form.buildNow}
              onChange={(e) => setField('buildNow', e.target.checked)}
            />
            <span>
              Build the Docker image now
              <span className="ml-1 text-xs text-fg-subtle">(recommended — otherwise build it from the lab list)</span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
          <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submitCreate()} isLoading={submitting}>
            <Rocket className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Create & Publish
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => (deleting ? undefined : setPendingDelete(null))}
        onConfirm={() => void confirmDelete()}
        title="Delete lab"
        message={`This permanently removes "${pendingDelete?.title ?? ''}", its challenge files, sessions and progress. This cannot be undone.`}
        confirmText="Delete lab"
        isLoading={deleting}
      />
    </div>
  );
};

export default AdminLabs;
