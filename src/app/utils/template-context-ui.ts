import { BuilderSidebarSection } from '../services/form.services';

/** null = available in every department */
const SECTION_DEPARTMENTS: Record<BuilderSidebarSection, string[] | null> = {
  template: null,
  fields: null,
  data: ['Accounts', 'A/V', 'Design', 'Digital Ads', 'Media', 'Organic Social', 'SEO'],
  rules: null,
  list: null,
};

const DEFAULT_EXPANDED: Record<BuilderSidebarSection, boolean | ((dept: string) => boolean)> = {
  template: false,
  fields: true,
  data: (dept) => dept !== '',
  rules: true,
  list: false,
};

export function isSidebarSectionRelevant(
  section: BuilderSidebarSection,
  department: string
): boolean {
  const allowed = SECTION_DEPARTMENTS[section];
  if (!allowed) return true;
  if (department === '') return false;
  return allowed.includes(department);
}

export function getDefaultExpandedSections(department: string): Set<BuilderSidebarSection> {
  const expanded = new Set<BuilderSidebarSection>();

  (Object.keys(SECTION_DEPARTMENTS) as BuilderSidebarSection[]).forEach((section) => {
    if (!isSidebarSectionRelevant(section, department)) return;

    const rule = DEFAULT_EXPANDED[section];
    const shouldExpand = typeof rule === 'function' ? rule(department) : rule;
    if (shouldExpand) expanded.add(section);
  });

  if (expanded.size === 0) {
    expanded.add('fields');
  }

  return expanded;
}

export function getSectionUnavailableHint(
  section: BuilderSidebarSection,
  department: string
): string | null {
  if (isSidebarSectionRelevant(section, department)) return null;

  const label = department || 'Task';
  switch (section) {
    case 'rules':
      return `Rules are not used in ${label} templates. Switch department to configure automations.`;
    case 'data':
      return `Data connections are not available for ${label}.`;
    default:
      return `Not available in ${label}.`;
  }
}

export type FieldSettingsGroupId = 'general' | 'data' | 'advanced';

const FIELD_GROUP_DEPARTMENTS: Record<FieldSettingsGroupId, string[] | null> = {
  general: null,
  data: ['Accounts', 'A/V', 'Design', 'Digital Ads', 'Media', 'Organic Social', 'SEO'],
  advanced: null,
};

export function isFieldSettingsGroupRelevant(
  group: FieldSettingsGroupId,
  department: string
): boolean {
  const allowed = FIELD_GROUP_DEPARTMENTS[group];
  if (allowed && !allowed.includes(department)) return false;
  return true;
}

export function getDefaultExpandedFieldGroups(department: string): Set<FieldSettingsGroupId> {
  const expanded = new Set<FieldSettingsGroupId>(['general']);

  if (isFieldSettingsGroupRelevant('data', department)) {
    if (department === 'Digital Ads' || department === 'Design') expanded.add('data');
  }

  return expanded;
}
