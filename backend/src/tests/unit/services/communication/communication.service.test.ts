import { config } from "../../../../config/env";
import {
  CommunicationChannel,
  CommunicationCategory,
  CommunicationStatus,
} from "../../../../models/index";
import { sanitizeToE164 } from "../../../../utils/phoneValidation";
import { resolveTemplate } from "../../../../services/communication/template.service";
import { runCommunicationJob } from "../../../../services/communication/deliver.service";
import {
  dispatch,
  retryLog,
  CommunicationJobType,
} from "../../../../services/communication/communication.service";
import CommunicationLog from "../../../../models/CommunicationLog";

jest.mock("../../../../models/CommunicationLog", () => {
  const actual = jest.requireActual("../../../../models/CommunicationLog");
  return {
    __esModule: true,
    ...actual,
    default: {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findById: jest.fn(),
    },
  };
});
jest.mock("../../../../config/queue", () => ({
  __esModule: true,
  communicationQueue: null,
}));
jest.mock("../../../../utils/phoneValidation");
jest.mock("../../../../services/communication/template.service");
jest.mock("../../../../services/communication/deliver.service");
jest.mock("../../../../config/logger");

// Raw require (not `import * as`) — TS's `__importStar` interop helper
// wraps namespace imports in a read-only object, which would make the
// mutation below (`queueConfig.communicationQueue = ...`) throw. The mock
// factory above returns a plain, mutable object; requiring it directly
// gives us that same mutable reference, matching what the production code
// (a named `import { communicationQueue }`) reads at call time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const queueConfig = require("../../../../config/queue");

const mockedFindOne = CommunicationLog.findOne as jest.Mock;
const mockedFindOneAndUpdate = CommunicationLog.findOneAndUpdate as jest.Mock;
const mockedFindById = CommunicationLog.findById as jest.Mock;
const mockedSanitize = sanitizeToE164 as jest.Mock;
const mockedResolveTemplate = resolveTemplate as jest.Mock;
const mockedRunCommunicationJob = runCommunicationJob as jest.Mock;

function baseInput() {
  return {
    jobType: CommunicationJobType.WHATSAPP_TEMPLATE,
    channel: CommunicationChannel.WHATSAPP,
    category: CommunicationCategory.TRANSACTIONAL,
    templateKey: "booking_confirmation",
    to: "0555 123 4567",
    vars: { name: "Ada" },
  };
}

describe("communication.service — dispatch()", () => {
  const originalNodeEnv = config.nodeEnv;
  const originalDisableRedis = process.env.DISABLE_REDIS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedFindOne.mockResolvedValue(null); // no in-flight/duplicate by default
    mockedSanitize.mockReturnValue("+15551234567");
    mockedResolveTemplate.mockResolvedValue({
      template: { providerTemplateName: "booking_confirmation_v1" },
      rendered: "Hi Ada, your booking is confirmed.",
    });
    queueConfig.communicationQueue = null;
  });

  afterEach(() => {
    config.nodeEnv = originalNodeEnv;
    if (originalDisableRedis === undefined) delete process.env.DISABLE_REDIS;
    else process.env.DISABLE_REDIS = originalDisableRedis;
  });

  it("flips the QUEUED log to FAILED/QUEUE_ENQUEUE_FAILED and rethrows when queue.add() fails", async () => {
    const logDoc: any = {
      _id: "log-1",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedFindOneAndUpdate.mockResolvedValue(logDoc);
    queueConfig.communicationQueue = {
      add: jest
        .fn()
        .mockRejectedValue(
          new Error("WRONGPASS invalid username-password pair"),
        ),
    };

    await expect(dispatch(baseInput())).rejects.toThrow(
      "WRONGPASS invalid username-password pair",
    );

    expect(logDoc.status).toBe(CommunicationStatus.FAILED);
    expect(logDoc.errorCode).toBe("QUEUE_ENQUEUE_FAILED");
    expect(logDoc.save).toHaveBeenCalled();
  });

  it("enqueues and returns the QUEUED log when the queue is healthy", async () => {
    const logDoc: any = { _id: "log-1", save: jest.fn() };
    mockedFindOneAndUpdate.mockResolvedValue(logDoc);
    const add = jest.fn().mockResolvedValue(undefined);
    queueConfig.communicationQueue = { add };

    const result = await dispatch(baseInput());

    expect(add).toHaveBeenCalled();
    expect(result).toBe(logDoc);
    expect(mockedRunCommunicationJob).not.toHaveBeenCalled();
  });

  it("sends inline when the queue is null AND DISABLE_REDIS=true AND NODE_ENV=test", async () => {
    process.env.DISABLE_REDIS = "true";
    config.nodeEnv = "test";
    const logDoc: any = { _id: "log-1", status: CommunicationStatus.QUEUED };
    mockedFindOneAndUpdate.mockResolvedValue(logDoc);
    mockedRunCommunicationJob.mockResolvedValue({
      success: true,
      status: CommunicationStatus.SENT,
    });
    mockedFindById.mockResolvedValue({
      ...logDoc,
      status: CommunicationStatus.SENT,
    });

    const result = await dispatch(baseInput());

    expect(mockedRunCommunicationJob).toHaveBeenCalledWith(
      expect.objectContaining({ logId: "log-1" }),
      expect.objectContaining({ allowThrowOnRetryable: false }),
    );
    expect(result.status).toBe(CommunicationStatus.SENT);
  });

  it("fails clearly with QUEUE_DISABLED (no inline send) when NODE_ENV=production, even with DISABLE_REDIS=true", async () => {
    process.env.DISABLE_REDIS = "true";
    config.nodeEnv = "production";
    const queuedDoc: any = { _id: "log-1" };
    const failedDoc: any = {
      _id: "log-1",
      status: CommunicationStatus.FAILED,
      errorCode: "QUEUE_DISABLED",
    };
    mockedFindOneAndUpdate
      .mockResolvedValueOnce(queuedDoc) // initial QUEUED upsert
      .mockResolvedValueOnce(failedDoc); // failLog()'s upsert

    const result = await dispatch(baseInput());

    expect(mockedRunCommunicationJob).not.toHaveBeenCalled();
    expect(result.errorCode).toBe("QUEUE_DISABLED");
  });

  it("does not send inline when NODE_ENV=development but DISABLE_REDIS is not 'true'", async () => {
    delete process.env.DISABLE_REDIS;
    config.nodeEnv = "development";
    const queuedDoc: any = { _id: "log-1" };
    const failedDoc: any = {
      _id: "log-1",
      status: CommunicationStatus.FAILED,
      errorCode: "QUEUE_DISABLED",
    };
    mockedFindOneAndUpdate
      .mockResolvedValueOnce(queuedDoc)
      .mockResolvedValueOnce(failedDoc);

    const result = await dispatch(baseInput());

    expect(mockedRunCommunicationJob).not.toHaveBeenCalled();
    expect(result.errorCode).toBe("QUEUE_DISABLED");
  });
});

describe("communication.service — retryLog()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queueConfig.communicationQueue = null;
  });

  it("refuses to retry a log that is not currently FAILED", async () => {
    mockedFindById.mockResolvedValue({
      _id: "log-1",
      status: CommunicationStatus.QUEUED,
    });

    await expect(retryLog("log-1")).rejects.toThrow(
      /only a failed log can be retried/,
    );
  });

  it("refuses to retry a non-retryable error code", async () => {
    mockedFindById.mockResolvedValue({
      _id: "log-1",
      status: CommunicationStatus.FAILED,
      errorCode: "CONFIGURATION_ERROR",
    });

    await expect(retryLog("log-1")).rejects.toThrow(/cannot retry/);
  });

  it("retries inline once when the queue is disabled and inline delivery is allowed", async () => {
    process.env.DISABLE_REDIS = "true";
    config.nodeEnv = "test";
    const logDoc: any = {
      _id: "log-1",
      status: CommunicationStatus.FAILED,
      errorCode: "PROVIDER_ERROR",
      retryCount: 1,
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockedFindById.mockResolvedValueOnce(logDoc).mockResolvedValueOnce({
      ...logDoc,
      status: CommunicationStatus.SENT,
    });
    mockedRunCommunicationJob.mockResolvedValue({
      success: true,
      status: CommunicationStatus.SENT,
    });

    const result = await retryLog("log-1");

    expect(mockedRunCommunicationJob).toHaveBeenCalled();
    expect(result.status).toBe(CommunicationStatus.SENT);
    delete process.env.DISABLE_REDIS;
  });
});
