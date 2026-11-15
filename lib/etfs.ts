export interface Tema {
  id: string;
  nombre: string;
  alcista: string;
  inverso: string;
  apalancamiento: number;
}

export const TEMAS: Tema[] = [
  { id: 'nasdaq', nombre: 'Nasdaq 100', alcista: 'TQQQ', inverso: 'SQQQ', apalancamiento: 3 },
  { id: 'semis', nombre: 'Semiconductores', alcista: 'SOXL', inverso: 'SOXS', apalancamiento: 3 },
  { id: 'sp500', nombre: 'S&P 500', alcista: 'UPRO', inverso: 'SPXU', apalancamiento: 3 },
  { id: 'smallcaps', nombre: 'Small caps (Russell 2000)', alcista: 'TNA', inverso: 'TZA', apalancamiento: 3 },
  { id: 'biotech', nombre: 'Biotecnología', alcista: 'LABU', inverso: 'LABD', apalancamiento: 3 }
];

export const TODOS_LOS_ETFS: string[] = TEMAS.flatMap(t => [t.alcista, t.inverso]);

export function buscarTema(id: string): Tema | undefined {
  return TEMAS.find(t => t.id === id);
}

// Umbral de acierto (%) = apalancamiento / 3. 3x -> 1%, 1x (acciones) -> 0.33%.
// Es una constante editable: una ganancia menor a esto se considera ruido.
export function umbralAcierto(apalancamiento: number): number {
  return apalancamiento / 3;
}
