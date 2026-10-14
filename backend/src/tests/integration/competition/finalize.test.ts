/**
 * Competition entry fee: a paid Checkout Session must only finalize the
 * submission it was created for.
 */
import { Types } from "mongoose";
import CompetitionSubmission from "../../../models/CompetitionSubmission";
import { finalizeSubmission } from "../../../controllers/competition.controller";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../services/email.service", () => ({ emailService: {} }));
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
const retrieveSession = jest.fn();
jest.mock("../../../config/stripe", () => ({
  ...jest.requireActual("../../../config/stripe"),
  stripe: { checkout: { sessions: { retrieve: (...a: unknown[]) => retrieveSession(...a) } } },
}));

beforeAll(connectTestDB);
afterEach(async () => {
  await clearTestDB();
});
afterAll(closeTestDB);

// catchAsync doesn't return its promise, so resolve when the handler answers.
const call = (body: Record<string, string>) =>
  new Promise<{ next: jest.Mock }>((resolve) => {
    const next = jest.fn(() => resolve({ next }));
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(() => resolve({ next })) };
    finalizeSubmission({ body } as any, res as any, next);
  });

it("rejects a paid session that was created for a different submission", async () => {
  const draftId = new Types.ObjectId();
  // Raw insert: only the payment fields matter here.
  await CompetitionSubmission.collection.insertOne({ _id: draftId, paymentStatus: "pending", participant: {}, artwork: {} });
  retrieveSession.mockResolvedValue({
    id: "cs_paid_elsewhere",
    payment_status: "paid",
    metadata: { submissionId: String(new Types.ObjectId()) },
  } as any);

  const { next } = await call({ submissionId: String(draftId), sessionId: "cs_paid_elsewhere" });

  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  expect((await CompetitionSubmission.findById(draftId).lean())?.paymentStatus).toBe("pending");
});
