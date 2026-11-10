// ============================================================
// Clixhora HRMS — Canonical organisation catalogue
//
// Single source of truth for department slugs and designation names.
// Pages must never hardcode their own copies of these lists — import
// them from here so that Employees, Dashboard, Attendance and Payslips
// all map names identically.
// ============================================================

export interface DepartmentDef {
  /** Stable slug, used as the key everywhere in the UI and in demo storage. */
  slug: string;
  /** Human readable name shown in every module. */
  name: string;
  description?: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  { slug: 'marketing',   name: 'Marketing Team',   description: 'Performance marketing, ads and content' },
  { slug: 'production',  name: 'Production Team',  description: 'Video, photography and creative production' },
  { slug: 'software',    name: 'Software Team',    description: 'Engineering, design and QA' },
  { slug: 'telecalling', name: 'Telecalling Team', description: 'Inbound and outbound calling' },
  { slug: 'sales',       name: 'Sales Team',       description: 'Online and offline sales' },
];

export const DESIGNATIONS: Record<string, string[]> = {
  marketing: [
    'Meta Ads Specialist', 'Google Ads Specialist', 'Performance Marketing Specialist',
    'Digital Marketing Executive', 'SEO Specialist', 'Social Media Manager',
    'Content Creator', 'Content Writer', 'Script Writer', 'Email Marketing Specialist',
    'Marketing Manager',
  ],
  production: [
    'Video Editor', 'Senior Video Editor', 'Photographer', 'Videographer',
    'Graphic Designer', 'Motion Graphics Designer', 'Creative Director',
    'Production Coordinator', 'Production Manager',
  ],
  software: [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Web Developer',
    'Software Developer', 'UI/UX Designer', 'QA Engineer', 'DevOps Engineer',
    'Mobile App Developer', 'Technical Lead', 'Software Team Lead',
  ],
  telecalling: ['Telecaller', 'Senior Telecaller', 'Telecalling Team Lead', 'Telecalling Manager'],
  sales: [
    'Online Sales Executive', 'Offline Sales Executive', 'Sales Executive',
    'Sales Representative', 'Business Development Executive', 'Sales Team Lead', 'Sales Manager',
  ],
};

/** slug -> display name */
export const DEPARTMENT_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.slug, d.name]),
);

/** display name (lowercase) -> slug */
export const DEPARTMENT_SLUG_BY_NAME: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map(d => [d.name.toLowerCase(), d.slug]),
);

export const departmentName = (slugOrName?: string | null): string => {
  if (!slugOrName) return '';
  if (DEPARTMENT_NAME_BY_SLUG[slugOrName]) return DEPARTMENT_NAME_BY_SLUG[slugOrName];
  const byName = DEPARTMENT_SLUG_BY_NAME[slugOrName.toLowerCase()];
  return byName ? DEPARTMENT_NAME_BY_SLUG[byName] : slugOrName;
};

export const departmentSlug = (slugOrName?: string | null): string => {
  if (!slugOrName) return '';
  if (DEPARTMENT_NAME_BY_SLUG[slugOrName]) return slugOrName;
  return DEPARTMENT_SLUG_BY_NAME[slugOrName.toLowerCase()] ?? slugOrName;
};

export const designationName = (designation?: string | null): string => {
  if (!designation) return '';
  // Designations are stored by name; keep the name verbatim.
  return designation;
};

export const departmentOptions = () =>
  DEPARTMENTS.map(d => ({ value: d.slug, label: d.name }));

export const designationOptions = (departmentSlugValue: string) =>
  (DESIGNATIONS[departmentSlugValue] ?? []).map(d => ({ value: d, label: d }));
