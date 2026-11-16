// Calendario MANUAL de eventos que mueven el mercado de noche.
// El veto es una regla en código: NO lo deciden las IAs.
// IMPORTANTE: las fechas deben revisarse en las fuentes oficiales (bls.gov, federalreserve.gov,
// relaciones con inversionistas de cada empresa). Hugo debe mantener esta lista al día.
// Horas en horario de Chicago (CT). Los datos de BLS salen 8:30 ET = 7:30 CT.

export interface EventoMacro {
  fecha: string;            // YYYY-MM-DD (Chicago)
  hora: string;             // HH:MM (Chicago)
  nombre: string;
  impacto: 'alto' | 'aviso'; // alto = veto (no operar); aviso = solo advertencia
  temas: string[] | 'todos'; // ids de tema afectados
  tickers?: string[];        // para el modo acción
}

export const EVENTOS: EventoMacro[] = [
  { fecha: '2026-11-17', hora: '15:20', nombre: 'Resultados Nvidia (después del cierre)', impacto: 'alto', temas: ['semis', 'nasdaq'], tickers: ['NVDA'] },
  { fecha: '2026-12-04', hora: '07:30', nombre: 'Empleo (NFP, BLS)', impacto: 'alto', temas: 'todos' },
  { fecha: '2026-12-09', hora: '13:00', nombre: 'Decisión de la Fed (FOMC)', impacto: 'aviso', temas: 'todos' },
  { fecha: '2026-12-09', hora: '15:30', nombre: 'Resultados Broadcom (después del cierre)', impacto: 'alto', temas: ['semis', 'nasdaq'], tickers: ['AVGO'] },
  { fecha: '2026-12-10', hora: '07:30', nombre: 'Inflación CPI (BLS)', impacto: 'alto', temas: 'todos' },
  { fecha: '2026-12-15', hora: '07:30', nombre: 'Precios al productor PPI (BLS)', impacto: 'aviso', temas: 'todos' },
  { fecha: '2027-01-08', hora: '07:30', nombre: 'Empleo (NFP, BLS)', impacto: 'alto', temas: 'todos' },
  { fecha: '2027-01-13', hora: '07:30', nombre: 'Inflación CPI (BLS)', impacto: 'alto', temas: 'todos' },
  { fecha: '2027-01-14', hora: '07:30', nombre: 'Precios al productor PPI (BLS)', impacto: 'aviso', temas: 'todos' }
];

function partesChicago(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  const g = (t: string) => p.find(x => x.type === t)?.value || '';
  const hora = g('hour') === '24' ? '00' : g('hour');
  return { fecha: `${g('year')}-${g('month')}-${g('day')}`, hora: `${hora}:${g('minute')}` };
}

// Próxima apertura (8:30 CT) de un día hábil (sin festivos: se asume que no los hay).
function proximaApertura(ahora: Date): string {
  let { fecha, hora } = partesChicago(ahora);
  const cursor = new Date(`${fecha}T12:00:00Z`);
  // Si ya pasó la apertura de hoy (o hoy no es hábil) se avanza al siguiente día hábil.
  const dow = (x: Date) => x.getUTCDay();
  let avanzar = hora >= '08:30' || dow(cursor) === 0 || dow(cursor) === 6;
  while (avanzar || dow(cursor) === 0 || dow(cursor) === 6) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    avanzar = false;
  }
  return `${cursor.toISOString().slice(0, 10)} 08:30`;
}

export interface ResultadoVeto {
  vetos: EventoMacro[];
  avisos: EventoMacro[];
  hasta: string;
}

// Eventos entre AHORA y la próxima apertura que afectan a este tema/ticker.
export function eventosEnVentana(ahora: Date, idTema: string, esAccion: boolean): ResultadoVeto {
  const p = partesChicago(ahora);
  const desde = `${p.fecha} ${p.hora}`;
  const hasta = proximaApertura(ahora);
  const vetos: EventoMacro[] = [];
  const avisos: EventoMacro[] = [];
  for (const e of EVENTOS) {
    const cuando = `${e.fecha} ${e.hora}`;
    if (cuando < desde || cuando > hasta) continue;
    const afecta = e.temas === 'todos' || (esAccion ? !!e.tickers?.includes(idTema) : e.temas.includes(idTema));
    if (!afecta) continue;
    (e.impacto === 'alto' ? vetos : avisos).push(e);
  }
  return { vetos, avisos, hasta };
}
