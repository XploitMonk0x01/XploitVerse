import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CourseCatalog } from '../../pages/courses/CourseCatalog';
import { ModuleDetail } from '../../pages/courses/ModuleDetail';
import { TaskDetail } from '../../pages/courses/TaskDetail';
import { courseService, moduleService, taskService, userService, flagService } from '../../services';

// Mock course, module, task, and user services
vi.mock('../../services', async () => {
  const actual = await vi.importActual('../../services');
  return {
    ...actual,
    courseService: {
      getAll: vi.fn(),
      getBySlug: vi.fn(),
    },
    moduleService: {
      getById: vi.fn(),
    },
    taskService: {
      getById: vi.fn(),
    },
    userService: {
      updateProfile: vi.fn(),
      getMyProgress: vi.fn(),
    },
    flagService: {
      submit: vi.fn(),
    },
  };
});

describe('Tier 1: Courses, Modules & Tasks Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 14: Course Catalog & Filtering (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 14: Course Catalog & Filtering', () => {
    const mockCourses = [
      {
        id: 1,
        title: 'Linux Fundamentals for Hackers',
        slug: 'linux-fundamentals',
        description: 'Master bash scripting, permissions, and privilege escalation.',
        difficulty: 'Easy',
        tags: ['linux', 'bash', 'os'],
        modulesCount: 5,
        tasksCount: 20,
      },
      {
        id: 2,
        title: 'Web Application Exploitation',
        slug: 'web-app-exploitation',
        description: 'SQLi, XSS, CSRF, and modern API vulnerabilities.',
        difficulty: 'Medium',
        tags: ['web', 'owasp', 'sqli'],
        modulesCount: 8,
        tasksCount: 35,
      },
      {
        id: 3,
        title: 'Advanced Binary Exploitation',
        slug: 'binary-exploitation',
        description: 'ROP chains, heap spraying, and kernel exploitation.',
        difficulty: 'Hard',
        tags: ['pwn', 'assembly', 'c'],
        modulesCount: 4,
        tasksCount: 15,
      },
    ];

    it('TEST-CRS-CAT-001: fetches all courses and renders mission cards with titles', async () => {
      (courseService.getAll as vi.Mock).mockResolvedValue({ courses: mockCourses });

      render(
        <MemoryRouter initialEntries={['/courses']}>
          <CourseCatalog />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Linux Fundamentals for Hackers')).toBeInTheDocument();
      });

      expect(screen.getByText('Web Application Exploitation')).toBeInTheDocument();
      expect(screen.getByText('Advanced Binary Exploitation')).toBeInTheDocument();
      expect(courseService.getAll).toHaveBeenCalledTimes(1);
    });

    it('TEST-CRS-CAT-002: filters courses by difficulty when button is clicked', async () => {
      (courseService.getAll as vi.Mock).mockResolvedValue({ courses: mockCourses });

      render(
        <MemoryRouter initialEntries={['/courses']}>
          <CourseCatalog />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Linux Fundamentals for Hackers')).toBeInTheDocument();
      });

      // Click "Easy" filter
      const easyBtn = screen.getByRole('button', { name: /^Easy$/i });
      fireEvent.click(easyBtn);

      expect(screen.getByText('Linux Fundamentals for Hackers')).toBeInTheDocument();
      expect(screen.queryByText('Web Application Exploitation')).not.toBeInTheDocument();
      expect(screen.queryByText('Advanced Binary Exploitation')).not.toBeInTheDocument();

      // Click "Hard" filter
      const hardBtn = screen.getByRole('button', { name: /^Hard$/i });
      fireEvent.click(hardBtn);

      expect(screen.queryByText('Linux Fundamentals for Hackers')).not.toBeInTheDocument();
      expect(screen.getByText('Advanced Binary Exploitation')).toBeInTheDocument();
    });

    it('TEST-CRS-CAT-003: filters courses by search query across title and tags', async () => {
      (courseService.getAll as vi.Mock).mockResolvedValue({ courses: mockCourses });

      render(
        <MemoryRouter initialEntries={['/courses']}>
          <CourseCatalog />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Linux Fundamentals for Hackers')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by title, tag/i);
      fireEvent.change(searchInput, { target: { value: 'owasp' } });

      expect(screen.queryByText('Linux Fundamentals for Hackers')).not.toBeInTheDocument();
      expect(screen.getByText('Web Application Exploitation')).toBeInTheDocument();
      expect(screen.queryByText('Advanced Binary Exploitation')).not.toBeInTheDocument();
    });

    it('TEST-CRS-CAT-004: displays empty state when search matches zero courses', async () => {
      (courseService.getAll as vi.Mock).mockResolvedValue({ courses: mockCourses });

      render(
        <MemoryRouter initialEntries={['/courses']}>
          <CourseCatalog />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Linux Fundamentals for Hackers')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by title, tag/i);
      fireEvent.change(searchInput, { target: { value: 'non_existent_exploit_term_xyz' } });

      expect(screen.getByText(/NO_MATCHING_MISSIONS/i)).toBeInTheDocument();
    });

    it('TEST-CRS-CAT-005: courseService.getBySlug contract retrieves course detail model', async () => {
      const detailCourse = {
        id: 2,
        title: 'Web Application Exploitation',
        slug: 'web-app-exploitation',
        description: 'In-depth web hacking.',
        difficulty: 'Medium',
        modules: [
          { id: 10, title: 'SQL Injection Deep Dive', orderIndex: 1, tasksCount: 5 },
          { id: 11, title: 'Cross-Site Scripting (XSS)', orderIndex: 2, tasksCount: 4 },
        ],
      };

      (courseService.getBySlug as vi.Mock).mockResolvedValue({ course: detailCourse });

      const res = await courseService.getBySlug('web-app-exploitation');
      expect(res.course.id).toBe(2);
      expect(res.course.slug).toBe('web-app-exploitation');
      expect(res.course.modules).toHaveLength(2);
      expect(res.course.modules[0].title).toBe('SQL Injection Deep Dive');
    });

    it('TEST-CRS-CAT-006: displays error banner when course loading fails', async () => {
      (courseService.getAll as vi.Mock).mockRejectedValue(new Error('Network disconnected'));

      render(
        <MemoryRouter initialEntries={['/courses']}>
          <CourseCatalog />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Network disconnected/i)).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 15: Module Detail View (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 15: Module Detail View', () => {
    const mockModule = {
      id: 42,
      courseId: 2,
      title: 'SQL Injection Fundamentals',
      description: 'Understanding union-based and boolean-blind SQL injection.',
      orderIndex: 1,
    };

    const mockTasks = [
      {
        id: 101,
        moduleId: 42,
        title: 'Basic Authentication Bypass',
        type: 'flag',
        points: 50,
        orderIndex: 1,
      },
      {
        id: 102,
        moduleId: 42,
        title: 'Extracting Table Schemas',
        type: 'flag',
        points: 100,
        orderIndex: 2,
      },
    ];

    it('TEST-CRS-MOD-001: fetches and renders module title and its associated tasks', async () => {
      (moduleService.getById as vi.Mock).mockResolvedValue({
        module: mockModule,
        tasks: mockTasks,
      });

      render(
        <MemoryRouter initialEntries={['/modules/42']}>
          <Routes>
            <Route path="/modules/:id" element={<ModuleDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('SQL Injection Fundamentals')).toBeInTheDocument();
      });

      expect(screen.getByText('Basic Authentication Bypass')).toBeInTheDocument();
      expect(screen.getByText('Extracting Table Schemas')).toBeInTheDocument();
      expect(screen.getByText('+50 PTS')).toBeInTheDocument();
      expect(screen.getByText('+100 PTS')).toBeInTheDocument();
    });

    it('TEST-CRS-MOD-002: renders back navigation link returning to missions catalog', async () => {
      (moduleService.getById as vi.Mock).mockResolvedValue({
        module: mockModule,
        tasks: mockTasks,
      });

      render(
        <MemoryRouter initialEntries={['/modules/42']}>
          <Routes>
            <Route path="/modules/:id" element={<ModuleDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('SQL Injection Fundamentals')).toBeInTheDocument();
      });

      const backLink = screen.getByRole('link', { name: /BACK_TO_MISSION/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/courses');
    });

    it('TEST-CRS-MOD-003: renders EmptyState when module has zero tasks', async () => {
      (moduleService.getById as vi.Mock).mockResolvedValue({
        module: mockModule,
        tasks: [],
      });

      render(
        <MemoryRouter initialEntries={['/modules/42']}>
          <Routes>
            <Route path="/modules/:id" element={<ModuleDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('SQL Injection Fundamentals')).toBeInTheDocument();
      });

      expect(screen.getByText(/No individual tasks registered/i)).toBeInTheDocument();
    });

    it('TEST-CRS-MOD-004: displays error message when module fetch fails', async () => {
      (moduleService.getById as vi.Mock).mockRejectedValue(new Error('Module not found'));

      render(
        <MemoryRouter initialEntries={['/modules/999']}>
          <Routes>
            <Route path="/modules/:id" element={<ModuleDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Module not found/i)).toBeInTheDocument();
      });
    });

    it('TEST-CRS-MOD-005: module displays accumulated total points header badge', async () => {
      (moduleService.getById as vi.Mock).mockResolvedValue({
        module: mockModule,
        tasks: mockTasks,
      });

      render(
        <MemoryRouter initialEntries={['/modules/42']}>
          <Routes>
            <Route path="/modules/:id" element={<ModuleDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/\+150 PTS/i)).toBeInTheDocument();
      });
    });

    it('TEST-CRS-MOD-006: task items link directly to their corresponding task detail routes', async () => {
      (moduleService.getById as vi.Mock).mockResolvedValue({
        module: mockModule,
        tasks: mockTasks,
      });

      render(
        <MemoryRouter initialEntries={['/modules/42']}>
          <Routes>
            <Route path="/modules/:id" element={<ModuleDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Basic Authentication Bypass')).toBeInTheDocument();
      });

      const taskLink = screen.getByRole('link', { name: /Basic Authentication Bypass/i });
      expect(taskLink).toHaveAttribute('href', '/tasks/101');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Feature 16: Task Description Alignment & Operational Briefing (>=5 tests)
  // ═══════════════════════════════════════════════════════════════════════
  describe('Feature 16: Task Description Alignment', () => {
    const mockTask = {
      id: 501,
      moduleId: 42,
      title: 'Bypass Admin Authentication',
      type: 'flag',
      points: 75,
      prompt: 'Inject SQL into the username input to bypass authentication.',
      bodyMarkdown: '### Step 1\nInspect the login form.\n### Step 2\nSubmit payload: admin\' OR 1=1--',
    };

    it('TEST-CRS-TSK-001: fetches and renders task objective title, points, and prompt', async () => {
      (taskService.getById as vi.Mock).mockResolvedValue({ task: mockTask });
      (userService.getMyProgress as vi.Mock).mockResolvedValue({ progress: [] });

      render(
        <MemoryRouter initialEntries={['/tasks/501']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bypass Admin Authentication')).toBeInTheDocument();
      });

      expect(screen.getByText('[ OBJECTIVE // TASK_#501 ]')).toBeInTheDocument();
      expect(screen.getByText('+75 PTS')).toBeInTheDocument();
      expect(screen.getByText(/Inject SQL into the username input/i)).toBeInTheDocument();
    });

    it('TEST-CRS-TSK-002: renders body markdown under OPERATIONAL_INSTRUCTIONS', async () => {
      (taskService.getById as vi.Mock).mockResolvedValue({ task: mockTask });
      (userService.getMyProgress as vi.Mock).mockResolvedValue({ progress: [] });

      render(
        <MemoryRouter initialEntries={['/tasks/501']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/OPERATIONAL_INSTRUCTIONS/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Step 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Submit payload: admin' OR 1=1--/i)).toBeInTheDocument();
    });

    it('TEST-CRS-TSK-003: renders flag submission console for flag-type challenge tasks', async () => {
      (taskService.getById as vi.Mock).mockResolvedValue({ task: mockTask });
      (userService.getMyProgress as vi.Mock).mockResolvedValue({ progress: [] });

      render(
        <MemoryRouter initialEntries={['/tasks/501']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/SUBMIT_SECURITY_FLAG/i)).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/XPLOIT{.*}/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /TRANSMIT_FLAG/i })).toBeInTheDocument();
    });

    it('TEST-CRS-TSK-004: displays solved status banner when task is already accomplished in user progress', async () => {
      (taskService.getById as vi.Mock).mockResolvedValue({ task: mockTask });
      (userService.getMyProgress as vi.Mock).mockResolvedValue({
        progress: [
          {
            taskId: '501',
            completedAt: '2026-09-15T12:00:00Z',
            pointsEarned: 75,
          },
        ],
      });

      render(
        <MemoryRouter initialEntries={['/tasks/501']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/OBJECTIVE_ACCOMPLISHED/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/SOLVED ON/i)).toBeInTheDocument();
      expect(screen.getByText(/AWARDED \+75 CREDITS/i)).toBeInTheDocument();
      // Flag submission form is hidden when already solved
      expect(screen.queryByPlaceholderText(/XPLOIT{.*}/i)).not.toBeInTheDocument();
    });

    it('TEST-CRS-TSK-005: handles non-existent task ID by rendering TASK_NOT_FOUND', async () => {
      (taskService.getById as vi.Mock).mockResolvedValue({ task: null });
      (userService.getMyProgress as vi.Mock).mockResolvedValue({ progress: [] });

      render(
        <MemoryRouter initialEntries={['/tasks/9999']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/TASK_NOT_FOUND/i)).toBeInTheDocument();
      });
    });

    it('TEST-CRS-TSK-006: renders back navigation link to courses catalog', async () => {
      (taskService.getById as vi.Mock).mockResolvedValue({ task: mockTask });
      (userService.getMyProgress as vi.Mock).mockResolvedValue({ progress: [] });

      render(
        <MemoryRouter initialEntries={['/tasks/501']}>
          <Routes>
            <Route path="/tasks/:id" element={<TaskDetail />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Bypass Admin Authentication')).toBeInTheDocument();
      });

      const backLink = screen.getByRole('link', { name: /BACK_TO_MISSIONS/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/courses');
    });
  });
});
