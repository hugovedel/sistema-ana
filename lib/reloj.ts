// Reloj del mercado de EE.UU. en hora de Chicago. Abre 8:30am, cierra 3:00pm (CT).
// No considera feriados.
const APERTURA = 8.5 * 3600;
const CIERRE = 15 * 3600;

export interface EstadoMercado {
  abierto: boolean;
  segundos: number; // para cerrar (si abierto) o para abrir (si cerrado)
}

export function estadoMercado(ahora: Date = new Date()): EstadoMercado {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(ahora);

  const get = (tipo: string) => partes.find(p => p.type === tipo)?.value || '';
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dia = dias.indexOf(get('weekday'));
  const t = parseInt(get('hour')) * 3600 + parseInt(get('minute')) * 60 + parseInt(get('second'));
  const habil = dia >= 1 && dia <= 5;

  if (habil && t >= APERTURA && t < CIERRE) {
    return { abierto: true, segundos: CIERRE - t };
  }
  if (habil && t < APERTURA) {
    return { abierto: false, segundos: APERTURA - t };
  }
  for (let d = 1; d <= 7; d++) {
    const siguiente = (dia + d) % 7;
    if (siguiente >= 1 && siguiente <= 5) {
      return { abierto: false, segundos: d * 86400 - t + APERTURA };
    }
  }
  return { abierto: false, segundos: 0 };
}

export function formatearCuenta(segundos: number): string {
  const d = Math.floor(segundos / 86400);
  const h = Math.floor((segundos % 86400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return d > 0 ? `${d}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function fechaChicago(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
