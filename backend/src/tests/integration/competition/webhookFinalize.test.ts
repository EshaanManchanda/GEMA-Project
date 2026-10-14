/**
 * A parent who pays and closes the tab before Stripe redirects back must
 * still get their entry: checkout.session.completed finalizes it. Browser
 * finalize and webhook may both arrive; the entry is activated (and the
 * confirmation sent) exactly once.
 */
import { Types } from "mongoose";
import CompetitionSubmission from "../../../models/CompetitionSubmission";
import { PaymentService } from "../../../services/payment.service";
import { emailService } from "../../../services/email.service";
import { finalizeSubmission } from "../../../controllers/competition.controller";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";

jest.mock("../../../services/email.service", () => {
  const svc: any = { sendEmail: jest.fn(), sendCompetitionSubmissionEmail: jest.fn() };
  return { __esModule: true, default: svc, emailService: svc, sendEmail: svc.sendEmail };
});
jest.mock("../../../config/firebase", () => ({ initializeFirebase: jest.fn() }));
const retrieveSession = jest.fn();
jest.mock("../../../config/stripe", () => ({
  ...jest.requireActual("../../../config/stripe"),
  stripe: { checkout: { sessions: { retrieve: (...a: unknown[]) => retrieveSession(...a) } } },
}));
jest.mock("../../../config/redis", () => ({ __esModule: true, default: null, redisClient: null }));

beforeAll(connectTestDB);
beforeEach(() => {
  (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
  (emailService.sendCompetitionSubmissionEmail as jest.Mock).mockResolvedValue(undefined);
});
afterEach(clearTestDB);
afterAll(closeTestDB);

async function draft() {
  const _id = new Types.ObjectId();
  await CompetitionSubmission.collection.insertOne({
    _id,
    paymentStatus: "pending",
    checkoutSessionId: "cs_paid",
    participant: { parentEmail: "parent@example.com", parentName: "Pat Parent", studentFullName: "Kid Artist", grade: "5" },
    artwork: { title: "Robot Garden" },
  });
  return _id;
}

const completed = (submissionId: Types.ObjectId) =>
  ({
    id: `evt_${new Types.ObjectId()}`,
    type: "checkout.session.completed",
    data: { object: { id: "cs_paid", mode: "payment", payment_status: "paid", metadata: { submissionId: String(submissionId) } } },
  }) as any;

const browserFinalize = (submissionId: Types.ObjectId) =>
  new Promise<void>((resolve) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(() => resolve()) };
    finalizeSubmission({ body: { submissionId: String(submissionId), sessionId: "cs_paid" } } as any, res as any, () => resolve());
  });

it("the webhook finalizes a paid entry when the browser never came back", async () => {
  const id = await draft();

  await PaymentService.processWebhookEvent(completed(id));

  expect((await CompetitionSubmission.findById(id).lean())?.paymentStatus).toBe("paid");
  expect(emailService.sendCompetitionSubmissionEmail).toHaveBeenCalledTimes(1);
});

it("webhook + browser finalize confirm only once", async () => {
  const id = await draft();
  retrieveSession.mockResolvedValue({ id: "cs_paid", payment_status: "paid", metadata: { submissionId: String(id) } });

  await PaymentService.processWebhookEvent(completed(id));
  await browserFinalize(id);

  expect(emailService.sendCompetitionSubmissionEmail).toHaveBeenCalledTimes(1);
});

it("ignores an unpaid session", async () => {
  const id = await draft();
  const evt = completed(id);
  evt.data.object.payment_status = "unpaid";

  await PaymentService.processWebhookEvent(evt);

  expect((await CompetitionSubmission.findById(id).lean())?.paymentStatus).toBe("pending");
});
