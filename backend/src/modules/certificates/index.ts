export { default as CertificateTemplate, CertificateType } from "./certificate-template.model";
export type { ICertificateTemplate } from "./certificate-template.model";

export { default as CertificateRecord, CertificateStatus } from "./certificate-record.model";
export type { ICertificateRecord } from "./certificate-record.model";

export { default as CertificateBatch, BatchStatus } from "./certificate-batch.model";
export type { ICertificateBatch } from "./certificate-batch.model";

export { default as CertificateVerificationLog } from "./certificate-verification-log.model";
export type { ICertificateVerificationLog } from "./certificate-verification-log.model";

export { certificateService } from "./certificates.service";
export type { CreateTemplateInput, GenerateCertificateInput, GenerateBatchInput } from "./certificates.service";

export { default as certificatesRoutes } from "./certificates.routes";
