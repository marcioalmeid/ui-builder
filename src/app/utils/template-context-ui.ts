import { BuilderSidebarSection } from '../services/form.services';

/** null = available in every template context */
const SECTION_CONTEXTS: Record<BuilderSidebarSection, string[] | null> = {
  template: null,
  fields: null,
  data: ['general', 'advertising', 'print', 'social'],
  rules: ['advertising', 'general'],
};

const DEFAULT_EXPANDED: Record<BuilderSidebarSection, boolean | ((context: string) => boolean)> = {
  template: false,
  fields: true,
  data: (context) => context === 'advertising',
  rules: (context) => context === 'advertising',
};

export function isSidebarSectionRelevant(
  section: BuilderSidebarSection,
  context: string
): boolean {
  const allowed = SECTION_CONTEXTS[section];
  if (!allowed) return true;
  return allowed.includes(context);
}

export function getDefaultExpandedSections(context: string): Set<BuilderSidebarSection> {
  const expanded = new Set<BuilderSidebarSection>();

  (Object.keys(SECTION_CONTEXTS) as BuilderSidebarSection[]).forEach((section) => {
    if (!isSidebarSectionRelevant(section, context)) return;

    const rule = DEFAULT_EXPANDED[section];
    const shouldExpand = typeof rule === 'function' ? rule(context) : rule;
    if (shouldExpand) expanded.add(section);
  });

  if (expanded.size === 0) {
    expanded.add('fields');
  }

  return expanded;
}

export function getContextLabel(contextId: string): string {
  const labels: Record<string, string> = {
    general: 'General Task',
    advertising: 'Digital Advertising',
    print: 'Print Media',
    social: 'Social Media',
  };
  return labels[contextId] ?? contextId;
}

export function getSectionUnavailableHint(
  section: BuilderSidebarSection,
  context: string
): string | null {
  if (isSidebarSectionRelevant(section, context)) return null;

  switch (section) {
    case 'rules':
      return `Rules are not used in ${getContextLabel(context)} templates. Switch context to configure automations.`;
    case 'data':
      return `Data connections are not available for ${getContextLabel(context)}.`;
    default:
      return `Not available in ${getContextLabel(context)}.`;
  }
}

export type FieldSettingsGroupId = 'general' | 'data' | 'advanced';

const FIELD_GROUP_CONTEXTS: Record<FieldSettingsGroupId, string[] | null> = {
  general: null,
  data: ['general', 'advertising', 'print', 'social'],
  advanced: null,
};

export function isFieldSettingsGroupRelevant(
  group: FieldSettingsGroupId,
  context: string
): boolean {
  const allowed = FIELD_GROUP_CONTEXTS[group];
  if (allowed && !allowed.includes(context)) return false;
  return true;
}

export function getDefaultExpandedFieldGroups(context: string): Set<FieldSettingsGroupId> {
  const expanded = new Set<FieldSettingsGroupId>(['general']);

  if (isFieldSettingsGroupRelevant('data', context)) {
    if (context === 'advertising') expanded.add('data');
  }

  return expanded;
}
