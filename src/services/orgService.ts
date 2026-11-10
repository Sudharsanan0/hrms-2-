// ============================================================
// Clixhora HRMS — Organisation resolver
//
// Maps the UI-facing department slug / designation name onto the ids that
// are actually stored in the database, so that every module writes and
// reads the same values.
// ============================================================

import { ServiceError } from '../lib/errors';
import { DEPARTMENTS, DESIGNATIONS, departmentName as canonicalDepartmentName, departmentSlug as canonicalSlug } from '../lib/org';
import { dataSourceMode, supabase } from '../lib/supabase';

export interface ResolvedRef {
  /** Value stored in `employees.department_id` / `employees.designation_id`. */
  id: string;
  /** Canonical display name. */
  name: string;
}

const slugFor = (nameOrSlug: string): string => canonicalSlug(nameOrSlug) || nameOrSlug;

export class OrgService {
  private departmentCache = new Map<string, ResolvedRef>();
  private designationCache = new Map<string, ResolvedRef>();

  /** Resolve a department by slug or name. */
  async resolveDepartment(ref: string): Promise<ResolvedRef> {
    const slug = slugFor(ref);
    const name = canonicalDepartmentName(ref) || ref;

    const cached = this.departmentCache.get(slug);
    if (cached) return cached;

    if (dataSourceMode === 'supabase') {
      const { data, error } = await supabase
        .from('departments' as any)
        .select('id, name, slug')
        .or(`slug.eq.${slug},name.ilike.${name}`);
      if (!error && data && data.length) {
        const row = data[0];
        const resolved: ResolvedRef = { id: String(row.id), name: String(row.name ?? name) };
        this.departmentCache.set(slug, resolved);
        return resolved;
      }
      if (error) {
        console.warn('[orgService] department lookup failed:', error.message);
      }
    }

    // Fallback: use the slug itself as the id (works with text columns and demo mode).
    const fallback: ResolvedRef = { id: slug, name };
    this.departmentCache.set(slug, fallback);
    return fallback;
  }

  /** Resolve a designation by name (optionally scoped to a department). */
  async resolveDesignation(ref: string, departmentRef?: string): Promise<ResolvedRef> {
    const name = ref?.trim() || '';
    if (!name) throw new ServiceError('validation', 'A designation is required.');

    const dept = departmentRef ? await this.resolveDepartment(departmentRef) : undefined;
    const cacheKey = dept ? `${dept.id}::${name}` : `::${name}`;
    const cached = this.designationCache.get(cacheKey);
    if (cached) return cached;

    if (dataSourceMode === 'supabase') {
      let query = supabase.from('designations' as any).select('id, name, department_id').ilike('name', name);
      if (dept) query = query.eq('department_id', dept.id);
      const { data, error } = await query.limit(1);
      if (!error && data && data.length) {
        const resolved: ResolvedRef = { id: String(data[0].id), name: String(data[0].name ?? name) };
        this.designationCache.set(cacheKey, resolved);
        return resolved;
      }
      if (error) console.warn('[orgService] designation lookup failed:', error.message);
    }

    const fallback: ResolvedRef = { id: name, name };
    this.designationCache.set(cacheKey, fallback);
    return fallback;
  }

  /** All departments (database first, canonical catalogue as fallback). */
  async listDepartments(): Promise<ResolvedRef[]> {
    if (dataSourceMode === 'supabase') {
      const { data, error } = await supabase.from('departments' as any).select('id, name');
      if (!error && data && data.length) {
        return data.map((row: any) => ({ id: String(row.id), name: String(row.name) }));
      }
    }
    return DEPARTMENTS.map(d => ({ id: d.slug, name: d.name }));
  }

  /** Designations for a department (canonical catalogue in demo mode). */
  async listDesignations(departmentRef?: string): Promise<ResolvedRef[]> {
    if (dataSourceMode === 'supabase' && departmentRef) {
      const dept = await this.resolveDepartment(departmentRef);
      const { data, error } = await supabase
        .from('designations' as any)
        .select('id, name')
        .eq('department_id', dept.id);
      if (!error && data && data.length) {
        return data.map((row: any) => ({ id: String(row.id), name: String(row.name) }));
      }
    }
    const slug = departmentRef ? slugFor(departmentRef) : '';
    return (DESIGNATIONS[slug] ?? []).map(name => ({ id: name, name }));
  }

  resetCaches(): void {
    this.departmentCache.clear();
    this.designationCache.clear();
  }
}

export const orgService = new OrgService();
