// Llama a /api/diagnosticar. Si ya existe un diagnóstico de hoy para ese tema,
// pregunta antes de repetirlo (repetir reemplaza el anterior y puede sesgar la medición).
export async function pedirDiagnostico(
  token: string,
  cuerpo: { tema?: string; ticker?: string }
): Promise<{ ok: boolean; data: any }> {
  const enviar = (extra: object) =>
    fetch('/api/diagnosticar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...cuerpo, ...extra })
    });

  let r = await enviar({});
  let data = await r.json();

  if (r.status === 409 && data.yaExiste) {
    const repetir = window.confirm(
      `Ya hay un diagnóstico de hoy para ${data.titulo}.\n\nRepetirlo reemplaza el anterior y puede sesgar la medición. ¿Repetir de todos modos?`
    );
    if (!repetir) {
      return { ok: false, data: { error: 'Ya diagnosticado hoy (no se repitió)' } };
    }
    r = await enviar({ forzar: true });
    data = await r.json();
  }

  return { ok: r.ok && !data.error, data };
}
