import {
  CommunicationLog,
  CommunicationChannel,
  CommunicationStatus,
} from "../../../../models/index";
import {
  runCommunicationJob,
  CommunicationJobData,
} from "../../../../services/communication/deliver.service";
import { getWhatsAppProvider } from "../../../../services/communication/providers/whatsapp.provider";
import { CommunicationJobType } from "../../../../services/communication/communication.service";

jest.mock("../../../../models/CommunicationLog", () => {
  const actual = jest.requireActual("../../../../models/CommunicationLog");
  return {
    __esModule: true,
    ...actual,
    default: { findById: jest.fn() },
  };
});
jest.mock("../../../../services/communication/providers/whatsapp.provider");
jest.mock("../../../../config/logger");

const mockedFindById = CommunicationLog.findById as jest.Mock;
const mockedGetWhatsAppProvider = getWhatsAppProvider as jest.Mock;

function makeJob(
  overrides: Partial<CommunicationJobData> = {},
): CommunicationJobData {
  return {
    logId: "log-1",
    jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
    to: "+15551234567",
    templateKey: "booking_confirmation",
    providerTemplateName: "booking_confirmation_v1",
    languageCode: "en",
    vars: { name: "Ada" },
    ...overrides,
  };
}

interface MockLogDoc {
  _id: string;
  status: CommunicationStatus;
  channel: CommunicationChannel;
  retryCount: number;
  save: jest.Mock;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
  failedAt?: Date;
  sentAt?: Date;
}

function makeLogDoc(overrides: Partial<MockLogDoc> = {}): MockLogDoc {
  return {
    _id: "log-1",
    status: CommunicationStatus.QUEUED,
    channel: CommunicationChannel.WHATSAPP,
    retryCount: 0,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("deliver.service — runCommunicationJob", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks the log SENT on a successful provider send", async () => {
    const log = makeLogDoc();
    mockedFindById.mockResolvedValue(log);
    mockedGetWhatsAppProvider.mockReturnValue({
      name: "TestProvider",
      sendTemplate: jest.fn().mockResolvedValue({
        success: true,
        providerMessageId: "wamid.123",
      }),
    });

    const result = await runCommunicationJob(makeJob());

    expect(result.success).toBe(true);
    expect(result.status).toBe(CommunicationStatus.SENT);
    expect(log.status).toBe(CommunicationStatus.SENT);
    expect(log.save).toHaveBeenCalled();
  });

  it("inline mode (allowThrowOnRetryable=false): retryable failure marks FAILED, does not throw", async () => {
    const log = makeLogDoc();
    mockedFindById.mockResolvedValue(log);
    mockedGetWhatsAppProvider.mockReturnValue({
      name: "TestProvider",
      sendTemplate: jest.fn().mockResolvedValue({
        success: false,
        errorCode: "HTTP_503",
        errorMessage: "upstream unavailable",
        isRetryable: true,
      }),
    });

    const result = await runCommunicationJob(makeJob(), {
      allowThrowOnRetryable: false,
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(log.status).toBe(CommunicationStatus.FAILED);
  });

  it("inline mode: non-retryable failure marks FAILED", async () => {
    const log = makeLogDoc();
    mockedFindById.mockResolvedValue(log);
    mockedGetWhatsAppProvider.mockReturnValue({
      name: "TestProvider",
      sendTemplate: jest.fn().mockResolvedValue({
        success: false,
        errorCode: "TEMPLATE_MISSING",
        errorMessage: "template not found on provider",
        isRetryable: false,
      }),
    });

    const result = await runCommunicationJob(makeJob(), {
      allowThrowOnRetryable: false,
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(false);
    expect(log.status).toBe(CommunicationStatus.FAILED);
    expect(log.errorCode).toBe("TEMPLATE_MISSING");
  });

  it("worker mode (allowThrowOnRetryable=true, default): retryable failure throws so BullMQ retries", async () => {
    const log = makeLogDoc();
    mockedFindById.mockResolvedValue(log);
    mockedGetWhatsAppProvider.mockReturnValue({
      name: "TestProvider",
      sendTemplate: jest.fn().mockResolvedValue({
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: "timeout",
        isRetryable: true,
      }),
    });

    await expect(runCommunicationJob(makeJob())).rejects.toThrow("timeout");
    // Retry count bumped and persisted before the throw, but status left
    // for BullMQ's own retry bookkeeping — not forced to FAILED here.
    expect(log.retryCount).toBe(1);
  });

  it("is idempotent: never re-sends a log already SENT/DELIVERED/READ", async () => {
    const log = makeLogDoc({
      status: CommunicationStatus.SENT,
      providerMessageId: "wamid.already-sent",
    });
    mockedFindById.mockResolvedValue(log);
    const sendTemplate = jest.fn();
    mockedGetWhatsAppProvider.mockReturnValue({
      name: "TestProvider",
      sendTemplate,
    });

    const result = await runCommunicationJob(makeJob());

    expect(sendTemplate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.status).toBe(CommunicationStatus.SENT);
    expect(result.providerMessageId).toBe("wamid.already-sent");
    expect(log.save).not.toHaveBeenCalled();
  });

  it("treats a provider timeout as a retryable PROVIDER_TIMEOUT failure", async () => {
    const log = makeLogDoc();
    mockedFindById.mockResolvedValue(log);
    mockedGetWhatsAppProvider.mockReturnValue({
      name: "SlowProvider",
      sendTemplate: jest.fn(
        () => new Promise(() => {}), // never resolves
      ),
    });

    const result = await runCommunicationJob(makeJob(), {
      allowThrowOnRetryable: false,
      timeoutMs: 20,
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("PROVIDER_TIMEOUT");
    expect(result.retryable).toBe(true);
  });

  it("returns a non-retryable failure when the log cannot be found", async () => {
    mockedFindById.mockResolvedValue(null);

    const result = await runCommunicationJob(makeJob());

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("LOG_NOT_FOUND");
    expect(result.retryable).toBe(false);
  });
});
