/**
 * The certificate email links to the PDF. When the PDF is a private local upload that link must be
 * signed (the recipient is not signed in when they open the email); Cloudinary links stay as they are.
 */
import { verifyUploadSignature } from "../../../utils/uploadAccess";

const mockFindById = jest.fn();
const mockBuildHtml = jest.fn();
const mockSendEmail = jest.fn();
const mockDownload = jest.fn();

jest.mock("../../../models/Certificate", () => ({
  __esModule: true,
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
    findByIdAndUpdate: async () => undefined,
  },
  CertificateStatus: {},
  Template: {},
  SerialCounter: {},
  AuditLog: { create: async () => undefined },
  CertificateRequest: {},
}));
jest.mock("../../../models/Student", () => ({ __esModule: true, default: {} }));
jest.mock("../../../config/queue", () => ({ certificateQueue: {} }));
jest.mock("../../../config/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("../../../services/email.service", () => ({
  emailService: { sendEmail: (...a: unknown[]) => mockSendEmail(...a) },
}));
jest.mock("../../../workers/certificate.worker", () => ({
  buildCertEmailHtml: (...a: unknown[]) => mockBuildHtml(...a),
  renderCertificate: jest.fn(),
}));
jest.mock("../../../utils/emailAttachment.util", () => ({
  downloadFileAsAttachment: (...a: unknown[]) => mockDownload(...a),
  safePdfFilename: () => "Certificate.pdf",
}));

import { certificateService } from "../../../modules/certificates/services/certificate.service";

const REL = "certificates/certificate-1-1.pdf";
const cert = (pdfUrl: string) => ({
  pdfUrl,
  serialNumber: "CERT-1",
  qrData: "qr",
  data: {},
  recipient: { name: "Kid A", email: "kid.a@example.com" },
  eventId: { title: "Robotics" },
});

beforeEach(() => {
  mockBuildHtml.mockReset().mockReturnValue("<html/>");
  mockSendEmail.mockReset().mockResolvedValue("smtp-id-1");
  mockDownload.mockReset().mockResolvedValue(null);
});

const linkSentFor = async (pdfUrl: string): Promise<string> => {
  mockFindById.mockReturnValue({ populate: async () => cert(pdfUrl) });
  await certificateService.sendCertificateEmail("507f1f77bcf86cd799439011");
  return mockBuildHtml.mock.calls[0][3] as string;
};

describe("certificate email link", () => {
  it("is signed for a private local upload, so a recipient who is not signed in can open it", async () => {
    const link = new URL(
      await linkSentFor(`https://api.kidrove.com/api/uploads/files/${REL}`),
    );
    expect(link.origin + link.pathname).toBe(
      `https://api.kidrove.com/api/uploads/files/${REL}`,
    );
    expect(
      verifyUploadSignature(
        REL,
        Number(link.searchParams.get("exp")),
        link.searchParams.get("sig") ?? "",
      ),
    ).toBe(true);
  });

  it("is left alone for a Cloudinary pdf", async () => {
    const cloudinary =
      "https://res.cloudinary.com/demo/raw/upload/v1/gema/certificates/a.pdf";
    expect(await linkSentFor(cloudinary)).toBe(cloudinary);
  });

  it("still attaches the file by the stored (unsigned) url; the downloader signs it itself", async () => {
    const stored = `https://api.kidrove.com/api/uploads/files/${REL}`;
    await linkSentFor(stored);
    expect(mockDownload.mock.calls[0][0]).toBe(stored);
  });
});
