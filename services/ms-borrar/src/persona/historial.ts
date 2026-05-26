export function tieneHistorial(tipos: string[]): boolean {
  return tipos.some((t) => t !== 'CREATE');
}
