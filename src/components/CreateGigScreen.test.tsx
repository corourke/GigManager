import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateGigScreen from './CreateGigScreen'

// Mock all dependencies
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } }
      })
    }
  }))
}))

vi.mock('../utils/api', () => ({
  getGig: vi.fn(),
  createGig: vi.fn(),
  updateGig: vi.fn(),
  getKits: vi.fn(),
  getStaffRoles: vi.fn(),
}))

vi.mock('../utils/form-utils', () => ({
  createSubmissionPayload: vi.fn(),
  normalizeFormData: vi.fn(),
}))

vi.mock('./AppHeader', () => ({
  default: () => <div data-testid="app-header" />
}))

vi.mock('./OrganizationSelector', () => ({
  default: () => <div data-testid="org-selector" />
}))

vi.mock('./UserSelector', () => ({
  default: () => <div data-testid="user-selector" />
}))

vi.mock('./TagsInput', () => ({
  default: ({ value, onChange }: any) => (
    <input
      data-testid="tags-input"
      value={value?.join(',') || ''}
      onChange={(e) => onChange(e.target.value.split(',').filter(Boolean))}
    />
  )
}))

vi.mock('./MarkdownEditor', () => ({
  default: ({ value, onChange }: any) => (
    <textarea
      data-testid="notes-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}))

vi.mock('./ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

vi.mock('./ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

vi.mock('./ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />
}))

vi.mock('./ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select">
      <select value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

vi.mock('./ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('./ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button value={value}>{children}</button>,
}))

vi.mock('./ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>
}))

vi.mock('./ui/alert', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('./ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}))

vi.mock('./ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />
}))

vi.mock('./ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>
}))

vi.mock('./ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  )
}))

vi.mock('./ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />
}))

vi.mock('./ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('./ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('./ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Users: () => <div data-testid="users-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  X: () => <div data-testid="x-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Save: () => <div data-testid="save-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Building2: () => <div data-testid="building-icon" />,
  Package: () => <div data-testid="package-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  Search: () => <div data-testid="search-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
}))

vi.mock('date-fns', () => ({
  format: vi.fn((date) => date.toISOString()),
  parse: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

describe('CreateGigScreen', () => {
  const mockOrganization = {
    id: 'org-1',
    name: 'Test Organization',
    type: 'Production' as any,
  }

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
  }

  const defaultProps = {
    organization: mockOrganization,
    user: mockUser,
    userRole: 'Admin' as any,
    onCancel: vi.fn(),
    onGigCreated: vi.fn(),
    onGigUpdated: vi.fn(),
    onGigDeleted: vi.fn(),
    onSwitchOrganization: vi.fn(),
    onLogout: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the form with basic fields', () => {
      render(<CreateGigScreen {...defaultProps} />)

      expect(screen.getByText('Create Gig')).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    })

    it('renders in edit mode when gigId is provided', () => {
      const api = require('../utils/api')
      api.getGig.mockResolvedValue({
        id: 'gig-1',
        title: 'Test Gig',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T12:00:00Z',
        status: 'Booked',
        notes: 'Test notes',
        amount_paid: 1000,
      })

      render(<CreateGigScreen {...defaultProps} gigId="gig-1" />)

      expect(screen.getByText('Edit Gig')).toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('shows validation errors for required fields', async () => {
      render(<CreateGigScreen {...defaultProps} />)

      const saveButton = screen.getByText('Create Gig')
      await userEvent.click(saveButton)

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      })
    })

    it('validates date ranges', async () => {
      render(<CreateGigScreen {...defaultProps} />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Gig')

      // Set end date before start date
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)

      await userEvent.type(startDateInput, '2025-01-02')
      await userEvent.type(endDateInput, '2025-01-01')

      const saveButton = screen.getByText('Create Gig')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
      })
    })
  })

  describe('change detection', () => {
    it('enables save button when form has changes', async () => {
      render(<CreateGigScreen {...defaultProps} />)

      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'New Gig Title')

      const saveButton = screen.getByText('Create Gig')

      // Button should be enabled when there are changes
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('disables save button in edit mode when no changes', async () => {
      const api = require('../utils/api')
      api.getGig.mockResolvedValue({
        id: 'gig-1',
        title: 'Original Title',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T12:00:00Z',
        status: 'Booked',
        notes: 'Original notes',
      })

      render(<CreateGigScreen {...defaultProps} gigId="gig-1" />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Update Gig')

      // Button should be disabled when no changes from original
      expect(saveButton).toBeDisabled()
    })

    it('enables save button in edit mode when changes are made', async () => {
      const api = require('../utils/api')
      api.getGig.mockResolvedValue({
        id: 'gig-1',
        title: 'Original Title',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T12:00:00Z',
        status: 'Booked',
        notes: 'Original notes',
      })

      render(<CreateGigScreen {...defaultProps} gigId="gig-1" />)

      await waitFor(() => {
        const titleInput = screen.getByDisplayValue('Original Title')
        expect(titleInput).toBeInTheDocument()
      })

      const titleInput = screen.getByDisplayValue('Original Title')
      await userEvent.clear(titleInput)
      await userEvent.type(titleInput, 'Modified Title')

      const saveButton = screen.getByText('Update Gig')

      // Button should be enabled when changes are made
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })
  })

  describe('staff slots management', () => {
    it('allows adding staff slots', async () => {
      render(<CreateGigScreen {...defaultProps} />)

      // Find staff slots section and add a slot
      const addSlotButton = screen.getByText(/add staff slot/i)
      await userEvent.click(addSlotButton)

      // Should show staff slot form
      expect(screen.getByText(/staff role/i)).toBeInTheDocument()
    })

    it('triggers change detection when staff slots are modified', async () => {
      render(<CreateGigScreen {...defaultProps} />)

      // Add a staff slot
      const addSlotButton = screen.getByText(/add staff slot/i)
      await userEvent.click(addSlotButton)

      // Button should be enabled due to staff slot changes
      const saveButton = screen.getByText('Create Gig')
      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })
  })

  describe('navigation', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<CreateGigScreen {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('calls onGigCreated when gig is successfully created', async () => {
      const api = require('../utils/api')
      api.createGig.mockResolvedValue({ id: 'new-gig-id' })

      render(<CreateGigScreen {...defaultProps} />)

      // Fill required fields
      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Gig')

      // Mock start/end dates
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)
      await userEvent.type(startDateInput, '2025-01-01T10:00')
      await userEvent.type(endDateInput, '2025-01-01T12:00')

      const saveButton = screen.getByText('Create Gig')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(defaultProps.onGigCreated).toHaveBeenCalledWith('new-gig-id')
      })
    })
  })

  describe('error handling', () => {
    it('shows error when gig creation fails', async () => {
      const api = require('../utils/api')
      api.createGig.mockRejectedValue(new Error('Creation failed'))

      render(<CreateGigScreen {...defaultProps} />)

      // Fill required fields
      const titleInput = screen.getByLabelText(/title/i)
      await userEvent.type(titleInput, 'Test Gig')

      const saveButton = screen.getByText('Create Gig')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('permissions', () => {
    it('shows read-only view for non-admin users', () => {
      render(<CreateGigScreen {...defaultProps} userRole="Viewer" />)

      // Save button should not be present for viewers
      expect(screen.queryByText('Create Gig')).not.toBeInTheDocument()
    })

    it('shows edit controls for admin users', () => {
      render(<CreateGigScreen {...defaultProps} userRole="Admin" />)

      expect(screen.getByText('Create Gig')).toBeInTheDocument()
    })
  })
})
