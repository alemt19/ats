export const STATUS_ORDER = ['applied', 'pre_screening', 'hired', 'rejected'] as const;
export type ApplicationStatus = (typeof STATUS_ORDER)[number];

export const STATUS_LABELS: Record<string, string> = {
  applied: 'Postulados',
  pre_screening: 'Preseleccionados',
  hired: 'Contratados',
  rejected: 'Rechazados',
};

export function normalizeStatus(status: string): string {
  return status === 'contacted' ? 'pre_screening' : status;
}
