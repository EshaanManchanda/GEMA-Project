import {
  NotificationTemplate,
  INotificationTemplate,
} from "../../models/index";
import { AppError } from "../../middleware/index";

export interface ResolvedTemplate {
  template: INotificationTemplate;
  /** Rendered text with {{variable}} placeholders substituted — for logs/preview, not for the actual provider template call (which sends structured variables). */
  rendered: string;
}

/**
 * Resolve a template by key/channel/language, validate that every
 * `requiredVariables` entry is present in `vars`, and produce a human-readable
 * rendered snapshot for CommunicationLog.templateSnapshot / admin preview.
 *
 * Throws AppError (400) on missing/disabled template or missing variables —
 * dispatch() must catch this and log a `failed` CommunicationLog without
 * ever calling the provider.
 */
export async function resolveTemplate(
  key: string,
  channel: string,
  vars: Record<string, string | number>,
  languageCode = "en",
): Promise<ResolvedTemplate> {
  const template = await NotificationTemplate.findOne({
    key,
    channel,
    languageCode,
  });

  if (!template) {
    throw new AppError(
      `No ${channel} template found for key "${key}" (${languageCode})`,
      400,
    );
  }

  if (!template.isEnabled) {
    throw new AppError(`Template "${key}" is disabled`, 400);
  }

  const missing = template.requiredVariables.filter(
    (name) => vars[name] === undefined || vars[name] === null,
  );
  if (missing.length > 0) {
    throw new AppError(
      `Template "${key}" is missing required variable(s): ${missing.join(", ")}`,
      400,
    );
  }

  return {
    template,
    rendered: template.bodyText
      ? interpolate(template.bodyText, vars)
      : `(no local copy on file for "${key}" — check the approved template on Cunnekt's dashboard)`,
  };
}

/** Preview: same resolution/validation as dispatch, without sending anything. */
export async function previewTemplate(
  key: string,
  channel: string,
  vars: Record<string, string | number>,
  languageCode = "en",
): Promise<ResolvedTemplate> {
  return resolveTemplate(key, channel, vars, languageCode);
}

function interpolate(
  text: string,
  vars: Record<string, string | number>,
): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}
