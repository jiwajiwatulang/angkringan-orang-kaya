import { MODES, MODULES, PRESETS, SHARED_MODULES, WORKFLOWS, type ModeId, type ModuleId, type PresetId } from './registry';

type LegacyBusinessSettings = { businessType?: string; serviceMode?: string; serviceCategory?: string };

// Pure read-only interpretation: never rewrites settings, receipts, stock or sync data.
export function resolveLegacyIdentity({ businessType, serviceCategory }: LegacyBusinessSettings): {
  mode: ModeId | null; preset: PresetId | null;
} {
  switch (businessType) {
    case 'quick': return { mode: 'quick', preset: 'gerobak' };
    case 'warung': case 'kafe': case 'restoran':
      return { mode: 'food', preset: businessType };
    case 'service': return { mode: 'service', preset: serviceCategory === 'laundry' ? 'laundry' : 'jasaUmum' };
    case 'retail': return { mode: 'retail', preset: 'retail' };
    default: return { mode: null, preset: null };
  }
}

export function resolveLegacyBusiness({ businessType, serviceMode }: LegacyBusinessSettings) {
  // Keep these independent: quick service turns off tables, never the kitchen.
  return {
    tables: serviceMode !== 'quick' && businessType !== 'warung' && businessType !== 'retail' && businessType !== 'quick' && businessType !== 'service',
    kitchen: ['warung', 'restoran', 'kafe'].includes(businessType || 'warung'),
    retailAdd: businessType === 'retail',
  };
}

export function profileServiceMode(current: LegacyBusinessSettings, businessType: string): 'resto' | 'quick' {
  // Editing a name or phone must not reset an existing cafe's service preference.
  if (businessType === current.businessType) return current.serviceMode === 'quick' ? 'quick' : 'resto';
  return ['restoran', 'kafe'].includes(businessType) ? 'resto' : 'quick';
}

export function requiresEmptyTables(previous: LegacyBusinessSettings, next: LegacyBusinessSettings): boolean {
  return resolveLegacyBusiness(previous).tables && !resolveLegacyBusiness(next).tables
    || next.businessType === 'quick' && previous.businessType !== 'quick';
}

export function resolveBusinessModules(input: {
  mode: string;
  preset?: string;
  extraModules?: readonly string[];
}): readonly ModuleId[] {
  const mode = Object.hasOwn(MODES, input.mode) ? MODES[input.mode as ModeId] : undefined;
  if (!mode || mode.availability !== 'available') return [];

  const workflow = WORKFLOWS[mode.workflow];
  if (workflow.availability !== 'available') return [];

  const preset = input.preset && Object.hasOwn(PRESETS, input.preset) ? PRESETS[input.preset as PresetId] : undefined;
  if (input.preset !== undefined && (!preset || preset.mode !== input.mode || preset.availability !== 'available')) return [];

  const requested = new Set<ModuleId>([...SHARED_MODULES, ...workflow.modules, ...(preset?.modules ?? [])]);
  for (const id of input.extraModules ?? []) {
    if (Object.hasOwn(MODULES, id) && MODULES[id as ModuleId].availability === 'available') {
      requested.add(id as ModuleId);
    }
  }
  // Resolve prerequisites for mixed businesses independently of insertion order.
  const includeDependencies = (id: ModuleId) => {
    for (const dependency of MODULES[id].requires) {
      if (!requested.has(dependency)) {
        requested.add(dependency);
        includeDependencies(dependency);
      }
    }
  };
  for (const id of requested) includeDependencies(id);
  const enabled = new Set<ModuleId>();
  for (let changed = true; changed;) {
    changed = false;
    for (const id of requested) {
      const module = MODULES[id];
      if (enabled.has(id) || module.availability !== 'available') continue;
      if (module.requires.every(dependency => enabled.has(dependency))) {
        enabled.add(id);
        changed = true;
      }
    }
  }
  return [...requested].filter(id => enabled.has(id));
}
