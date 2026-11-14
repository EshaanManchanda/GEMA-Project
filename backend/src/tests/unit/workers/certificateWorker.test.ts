/**
 * The API imports renderCertificate / buildCertEmailHtml from workers/certificate.worker.ts. That module used
 * to start a BullMQ Worker as a side effect of being imported, so the web server ran its own, unthrottled
 * certificate consumer next to gema-worker. On a full Redis its job fetch failed with a non-connection error,
 * which BullMQ retries with no delay: a busy loop inside the API process (pm2 had to SIGKILL it) and a stack
 * trace per iteration in the error log. Only the worker process may consume the queue.
 */
import fs from "fs";
import path from "path";

const mockWorkerCtor = jest.fn();
let mockQueuesEnabled = true;

jest.mock("bullmq", () => ({
  Job: class {},
  Worker: function (this: unknown, ...args: unknown[]) {
    mockWorkerCtor(...args);
    return { on: jest.fn(), close: jest.fn() };
  },
}));
jest.mock("../../../config/queue", () => ({
  QUEUE_NAMES: { CERTIFICATE_GENERATION: "certificate-generation" },
  bullMQConnection: {},
  QUEUE_PREFIX: "test",
  get areQueuesEnabled() {
    return mockQueuesEnabled;
  },
}));
jest.mock("../../../config/workerTuning", () => ({
  WORKER_TUNING: { CERTIFICATE_GENERATION: { CONCURRENCY: 1 } },
}));
jest.mock("../../../config/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock("../../../models/Certificate", () => ({
  __esModule: true,
  default: {},
  Template: {},
  AuditLog: {},
  CertificateRequest: {},
}));
jest.mock("../../../models/index", () => ({
  CommunicationChannel: {},
  CommunicationCategory: {},
  NotificationTemplateKey: {},
}));
jest.mock("../../../services/email.service", () => ({ emailService: {} }));
jest.mock("../../../services/media.service", () => ({
  MediaService: class {},
}));
jest.mock("../../../services/communication/communication.service", () => ({
  dispatch: jest.fn(),
  CommunicationJobType: {},
}));
jest.mock("../../../utils/emailAttachment.util", () => ({
  downloadFileAsAttachment: jest.fn(),
  safePdfFilename: jest.fn(),
}));

const load = () => {
  let mod: typeof import("../../../workers/certificate.worker");
  jest.isolateModules(() => {
    // a fresh copy of the module per call (isolateModules needs require); each test checks import-time effects
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("../../../workers/certificate.worker");
  });
  return mod!;
};

beforeEach(() => {
  mockWorkerCtor.mockClear();
  mockQueuesEnabled = true;
});

describe("workers/certificate.worker module", () => {
  it("does not start a Worker just by being imported (the API imports it)", () => {
    load();
    expect(mockWorkerCtor).not.toHaveBeenCalled();
  });

  it("still exports what the API uses", () => {
    const mod = load();
    expect(typeof mod.renderCertificate).toBe("function");
    expect(typeof mod.buildCertEmailHtml).toBe("function");
  });

  it("createCertificateWorker starts exactly one Worker on the certificate queue, once per process", () => {
    const mod = load();
    const first = mod.createCertificateWorker();
    const second = mod.createCertificateWorker();
    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(mockWorkerCtor).toHaveBeenCalledTimes(1);
    expect(mockWorkerCtor.mock.calls[0][0]).toBe("certificate-generation");
  });

  it("starts nothing when queues are disabled", () => {
    mockQueuesEnabled = false;
    const mod = load();
    expect(mod.createCertificateWorker()).toBeNull();
    expect(mockWorkerCtor).not.toHaveBeenCalled();
  });
});

describe("who may start workers", () => {
  const srcDir = path.resolve(__dirname, "../../..");
  const read = (rel: string) => fs.readFileSync(path.join(srcDir, rel), "utf8");

  it("workers/run.ts (the worker process) is what starts the certificate worker", () => {
    const run = read("workers/run.ts");
    expect(run).toMatch(/createCertificateWorker\(\)/);
    expect(run).not.toMatch(/import\s+certificateWorker\b/);
  });

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          ["tests", "workers", "scripts", "node_modules"].includes(entry.name)
        )
          continue;
        walk(full, out);
      } else if (entry.name.endsWith(".ts")) out.push(full);
    }
    return out;
  };

  it("API code only type-imports worker modules, except certificate.worker, which is import-safe", () => {
    const valueImports: string[] = [];
    for (const file of walk(srcDir)) {
      const text = fs.readFileSync(file, "utf8");
      const re =
        /^\s*(?:import\s+(?!type\b)[^;]*?from\s+|(?:const|let|var)\s+[^=]*=\s*require\()["'][./]+\/workers\/([\w.-]+)["']/gm;
      for (const m of text.matchAll(re))
        valueImports.push(`${path.relative(srcDir, file)} -> ${m[1]}`);
    }
    const offenders = valueImports.filter(
      (v) => !v.endsWith("-> certificate.worker"),
    );
    expect(offenders).toEqual([]);
  });
});
