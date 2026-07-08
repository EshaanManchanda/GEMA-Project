/**
 * AdminEditEventPage Test Suite
 *
 * Lightweight integration tests verifying:
 * a) Description flows through BasicInfoTab to formData in create mode.
 * b) Edit mode loads existing event description into the editor.
 *
 * Heavy dependencies (TipTapEditor, API calls, React Query, child tabs)
 * are mocked.
 */
import { render, screen, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock react-router-dom
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}));

// ---------------------------------------------------------------------------
// Mock React Query
// ---------------------------------------------------------------------------
const mockInvalidateQueries = jest.fn(() => Promise.resolve());
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// ---------------------------------------------------------------------------
// Mock API services
// ---------------------------------------------------------------------------
const mockGetEventById = jest.fn();
const mockGetAllCategories = jest.fn((..._args: any[]) => Promise.resolve([]));
const mockGetVendorsList = jest.fn((..._args: any[]) =>
  Promise.resolve({ data: { vendors: [] } }),
);
const mockGetTeachingEventTeachers = jest.fn((..._args: any[]) =>
  Promise.resolve({ data: { teachers: [] } }),
);

jest.mock('../../../services/api/adminAPI', () => ({
  __esModule: true,
  default: {
    getEventById: (...args: any[]) => mockGetEventById(...args),
    createEvent: jest.fn(() =>
      Promise.resolve({ data: { event: { id: 'new123' } } }),
    ),
    updateEvent: jest.fn(() => Promise.resolve({ data: {} })),
    getVendorsList: (...args: any[]) => mockGetVendorsList(...args),
    getTeachingEventTeachers: (...args: any[]) =>
      mockGetTeachingEventTeachers(...args),
  },
}));

jest.mock('../../../services/api/categoriesAPI', () => ({
  __esModule: true,
  default: {
    getAllCategories: (...args: any[]) => mockGetAllCategories(...args),
  },
}));

jest.mock('../../../services/api/uploadAPI', () => ({
  __esModule: true,
  UploadAPI: {
    uploadBookingAttachment: jest.fn(() =>
      Promise.resolve({ data: {} }),
    ),
  },
}));

// ---------------------------------------------------------------------------
// Mock child tab components — render stubs with data-testid
// ---------------------------------------------------------------------------

// Track the onInputChange handler that BasicInfoTab receives so tests can
// simulate typing. The real BasicInfoTab lazy-loads TipTapEditor; we replace
// it with a simple textarea that exercises the same onChange contract.
let capturedOnInputChange: ((e: any) => void) | null = null;

jest.mock('../../../components/admin/BasicInfoTab', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedOnInputChange = props.onInputChange;
    return (
      <div data-testid="basic-info-tab">
        <textarea
          data-testid="mock-description-editor"
          value={props.formData?.description ?? ''}
          onChange={(e) => {
            // Replicate what the real BasicInfoTab does: synthesize an event
            if (props.onInputChange) {
              props.onInputChange({
                target: { name: 'description', value: e.target.value },
              });
            }
          }}
        />
      </div>
    );
  },
}));

jest.mock('../../../components/admin/SchedulePricingTab', () => ({
  __esModule: true,
  default: () => <div data-testid="schedule-tab" />,
}));

jest.mock('../../../components/admin/AdvancedTab', () => ({
  __esModule: true,
  default: () => <div data-testid="advanced-tab" />,
}));

jest.mock('../../../components/admin/ReviewsTab', () => ({
  __esModule: true,
  default: () => <div data-testid="reviews-tab" />,
}));

jest.mock('../../../components/admin/CertificateTypesTab', () => ({
  __esModule: true,
  default: () => <div data-testid="certificates-tab" />,
}));

jest.mock('@/components/registration/FormBuilder', () => ({
  __esModule: true,
  default: () => <div data-testid="form-builder" />,
}));

jest.mock('@/components/common/PrivatePageSEO', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/common/PastEventMemoriesEditor', () => ({
  __esModule: true,
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Mock UI components
// ---------------------------------------------------------------------------
jest.mock('../../../components/ui/Badge', () => ({
  __esModule: true,
  default: ({ children }: any) => <span>{children}</span>,
}));

// lucide-react icons
jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get(_target, name) {
        if (typeof name !== 'string') return undefined;
        const IconComponent = (props: any) => (
          <span data-testid={`icon-${name}`} {...props} />
        );
        IconComponent.displayName = name as string;
        return IconComponent;
      },
    },
  );
});

// logger
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// queryKeys
jest.mock('@/hooks/queries/queryKeys', () => ({
  eventsKeys: { all: ['events'] },
  adminKeys: { events: { all: () => ['admin', 'events'] } },
}));

// mediaSlice type
jest.mock('@/store/slices/mediaSlice', () => ({
  __esModule: true,
}));

// event type
jest.mock('@/types/event', () => ({
  __esModule: true,
}));

// ---------------------------------------------------------------------------
// Import component under test
// ---------------------------------------------------------------------------
import AdminEditEventPage from '../AdminEditEventPage';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AdminEditEventPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    capturedOnInputChange = null;
    mockGetAllCategories.mockResolvedValue([]);
    mockGetVendorsList.mockResolvedValue({ data: { vendors: [] } });
    mockGetTeachingEventTeachers.mockResolvedValue({
      data: { teachers: [] },
    });
  });

  // -----------------------------------------------------------------------
  // a) Description flows through BasicInfoTab in create mode
  // -----------------------------------------------------------------------
  describe('create mode — description flow', () => {
    it('passes description to BasicInfoTab and updates formData via onChange', async () => {
      // No id = create mode
      mockParams = {};

      await act(async () => {
        render(<AdminEditEventPage />);
      });

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-tab')).toBeInTheDocument();
      });

      // Initially the description should be empty
      const textarea = screen.getByTestId(
        'mock-description-editor',
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe('');

      // Simulate typing a description via the mocked BasicInfoTab
      await act(async () => {
        // Use the captured onInputChange to simulate what BasicInfoTab does
        if (capturedOnInputChange) {
          capturedOnInputChange({
            target: { name: 'description', value: '<p>New event description</p>' },
          });
        }
      });

      // The textarea should now reflect the updated description
      await waitFor(() => {
        const updatedTextarea = screen.getByTestId(
          'mock-description-editor',
        ) as HTMLTextAreaElement;
        expect(updatedTextarea.value).toBe('<p>New event description</p>');
      });
    });
  });

  // -----------------------------------------------------------------------
  // b) Edit mode loads existing event description
  // -----------------------------------------------------------------------
  describe('edit mode — loads existing event', () => {
    it('populates description from fetched event data', async () => {
      mockParams = { id: 'abc123' };

      mockGetEventById.mockResolvedValue({
        data: {
          event: {
            title: 'Test Event',
            description: '<p>Existing</p>',
            shortDescription: 'Short desc',
            category: 'Sports',
            type: 'Event',
            venueType: 'Indoor',
            tags: ['test'],
            images: [],
            status: 'published',
            isApproved: true,
            isFeatured: false,
            isActive: true,
            dateSchedule: [
              {
                startDate: '2024-06-01',
                endDate: '2024-06-02',
                availableSeats: 100,
                price: 50,
              },
            ],
            location: {
              country: 'AE',
              city: 'Dubai',
              address: '123 Street',
            },
            seoMeta: { title: '', description: '', keywords: [] },
            faqs: [],
          },
        },
      });

      await act(async () => {
        render(<AdminEditEventPage />);
      });

      // Wait for the BasicInfoTab to appear (loading finished)
      await waitFor(() => {
        expect(screen.getByTestId('basic-info-tab')).toBeInTheDocument();
      });

      // The mock BasicInfoTab captures formData.description — verify it
      // through the rendered textarea
      const textarea = screen.getByTestId(
        'mock-description-editor',
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe('<p>Existing</p>');

      // Also verify that getEventById was called with the correct id
      expect(mockGetEventById).toHaveBeenCalledWith('abc123');
    });
  });
});
