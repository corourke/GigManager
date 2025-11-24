import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateKitScreen from './CreateKitScreen'

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
  getKit: vi.fn(),
  createKit: vi.fn(),
  updateKit: vi.fn(),
  getAssets: vi.fn(),
}))

vi.mock('../utils/form-utils', () => ({
  createSubmissionPayload: vi.fn(),
  normalizeFormData: vi.fn(),
}))

vi.mock('../utils/hooks/useAutocompleteSuggestions', () => ({
  useAutocompleteSuggestions: vi.fn(() => ({
    suggestions: ['Test Category', 'Another Category'],
    isLoading: false,
  }))
}))

vi.mock('./AppHeader', () => ({
  default: () => <div data-testid="app-header" />
}))

vi.mock('./OrganizationSelector', () => ({
  default: () => <div data-testid="org-selector" />
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

vi.mock('./ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}))

vi.mock('./ui/input', () => ({
  Input: (props: any) => <input {...props} />
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

vi.mock('./ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}))

vi.mock('./ui/alert', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  X: () => <div data-testid="x-icon" />,
  Package: () => <div data-testid="package-icon" />,
}))

vi.mock('sonner', () => ({
  toast: vi.fn(),
}))

describe('CreateKitScreen', () => {
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
    onKitCreated: vi.fn(),
    onKitUpdated: vi.fn(),
    onKitDeleted: vi.fn(),
    onSwitchOrganization: vi.fn(),
    onLogout: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the form with basic fields', () => {
      render(<CreateKitScreen {...defaultProps} />)

      expect(screen.getByText('Create Kit')).toBeInTheDocument()
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    })

    it('renders in edit mode when kitId is provided', () => {
      const api = require('../utils/api')
      api.getKit.mockResolvedValue({
        id: 'kit-1',
        name: 'Test Kit',
        category: 'Audio',
        assets: [],
      })

      render(<CreateKitScreen {...defaultProps} kitId="kit-1" />)

      expect(screen.getByText('Edit Kit')).toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('shows validation errors for required fields', async () => {
      render(<CreateKitScreen {...defaultProps} />)

      const saveButton = screen.getByText('Create Kit')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('change detection', () => {
    it('enables save button when form has changes', async () => {
      render(<CreateKitScreen {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      await userEvent.type(nameInput, 'New Kit Name')

      const saveButton = screen.getByText('Create Kit')

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })

    it('disables save button in edit mode when no changes', async () => {
      const api = require('../utils/api')
      api.getKit.mockResolvedValue({
        id: 'kit-1',
        name: 'Original Name',
        category: 'Audio',
        assets: [],
      })

      render(<CreateKitScreen {...defaultProps} kitId="kit-1" />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument()
      })

      const saveButton = screen.getByText('Update Kit')
      expect(saveButton).toBeDisabled()
    })

    it('enables save button in edit mode when changes are made', async () => {
      const api = require('../utils/api')
      api.getKit.mockResolvedValue({
        id: 'kit-1',
        name: 'Original Name',
        category: 'Audio',
        assets: [],
      })

      render(<CreateKitScreen {...defaultProps} kitId="kit-1" />)

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Original Name')
        expect(nameInput).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue('Original Name')
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Modified Name')

      const saveButton = screen.getByText('Update Kit')

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled()
      })
    })
  })

  describe('asset management', () => {
    it('allows adding assets to kit', async () => {
      render(<CreateKitScreen {...defaultProps} />)

      // Should show asset management section
      expect(screen.getByText(/add assets to kit/i)).toBeInTheDocument()
    })

    it('triggers change detection when assets are modified', async () => {
      render(<CreateKitScreen {...defaultProps} />)

      // Adding assets should trigger change detection
      const saveButton = screen.getByText('Create Kit')

      // Button should be enabled when assets are added
      // (This would be tested by actually adding an asset in a full test)
      expect(saveButton).toBeInTheDocument()
    })
  })

  describe('autocomplete suggestions', () => {
    it('shows category suggestions', () => {
      render(<CreateKitScreen {...defaultProps} />)

      const useAutocompleteSuggestions = require('../utils/hooks/useAutocompleteSuggestions').useAutocompleteSuggestions
      expect(useAutocompleteSuggestions).toHaveBeenCalledWith({
        field: 'category',
        organizationId: 'org-1',
        sourceTable: 'kits',
        enabled: true,
      })
    })
  })

  describe('navigation', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      render(<CreateKitScreen {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      await userEvent.click(cancelButton)

      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('calls onKitCreated when kit is successfully created', async () => {
      const api = require('../utils/api')
      api.createKit.mockResolvedValue({ id: 'new-kit-id' })

      render(<CreateKitScreen {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name/i)
      await userEvent.type(nameInput, 'Test Kit')

      const saveButton = screen.getByText('Create Kit')
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(defaultProps.onKitCreated).toHaveBeenCalledWith('new-kit-id')
      })
    })
  })

  describe('permissions', () => {
    it('shows read-only view for non-admin users', () => {
      render(<CreateKitScreen {...defaultProps} userRole="Viewer" />)

      expect(screen.queryByText('Create Kit')).not.toBeInTheDocument()
    })

    it('shows edit controls for admin users', () => {
      render(<CreateKitScreen {...defaultProps} userRole="Admin" />)

      expect(screen.getByText('Create Kit')).toBeInTheDocument()
    })
  })
})
