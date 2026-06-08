import yahooFinance from 'yahoo-finance2';

export async function obtenerDatosAccion(ticker: string) {
  try {
    const quote = await yahooFinance.quote(ticker) as any;
    const historialRaw = await yahooFinance.historical(ticker, {
      period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      period2: new Date(),
      interval: '1d'
    });

    const historial = historialRaw as any[];
    if (!historial || historial.length < 50) return null;

    const precios = historial.map(d => d.close).filter(Boolean) as number[];
    const volumenes = historial.map(d => d.volume).filter(Boolean) as number[];

    // SMA 20 y 50
    const sma20 = precios.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = precios.slice(-50).reduce((a, b) => a + b, 0) / 50;

    // RSI 14
    const cambios = precios.slice(-15).map((p, i, arr) => i === 0 ? 0 : p - arr[i-1]);
    const ganancias = cambios.map(c => c > 0 ? c : 0);
    const perdidas = cambios.map(c => c < 0 ? Math.abs(c) : 0);
    const avgGanancia = ganancias.slice(1).reduce((a, b) => a + b, 0) / 14;
    const avgPerdida = perdidas.slice(1).reduce((a, b) => a + b, 0) / 14;
    const rs = avgGanancia / (avgPerdida || 1);
    const rsi = 100 - (100 / (1 + rs));

    // MACD
    const ema = (data: number[], period: number) => {
      const k = 2 / (period + 1);
      return data.reduce((prev, curr, i) => i === 0 ? curr : curr * k + prev * (1 - k));
    };
    const ema12 = ema(precios.slice(-26), 12);
    const ema26 = ema(precios.slice(-26), 26);
    const macd = ema12 - ema26;

    // Volumen promedio
    const volumenPromedio = volumenes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumenHoy = volumenes[volumenes.length - 1];
    const volumenRelativo = volumenHoy / volumenPromedio;

    // Tendencia
    const precioActual = precios[precios.length - 1];
    const precio5d = precios[precios.length - 6];
    const tendencia = precioActual > precio5d ? 'ALZA' : 'BAJA';

    // Cambio del dia
    const cambioDia = quote.regularMarketChangePercent || 0;

    return {
      ticker,
      nombre: quote.longName || ticker,
      precioActual: quote.regularMarketPrice || precioActual,
      cambioDia: parseFloat(cambioDia.toFixed(2)),
      volumen: volumenHoy,
      volumenRelativo: parseFloat(volumenRelativo.toFixed(2)),
      sma20: parseFloat(sma20.toFixed(4)),
      sma50: parseFloat(sma50.toFixed(4)),
      rsi: parseFloat(rsi.toFixed(2)),
      macd: parseFloat(macd.toFixed(4)),
      tendencia,
      max52s: quote.fiftyTwoWeekHigh,
      min52s: quote.fiftyTwoWeekLow,
      sector: quote.sector || 'N/A'
    };
  } catch (e) {
    console.error(`Error obteniendo datos de ${ticker}:`, e);
    return null;
  }
}

export async function obtenerSentimientoMercado() {
  try {
    const spy = await yahooFinance.quote('SPY') as any;
    const vix = await yahooFinance.quote('^VIX') as any;
    
    const cambiSPY = spy.regularMarketChangePercent || 0;
    const nivelVIX = vix.regularMarketPrice || 20;

    let sentimiento = 'NEUTRAL';
    if (cambiSPY > 0.5 && nivelVIX < 20) sentimiento = 'ALCISTA';
    if (cambiSPY < -0.5 || nivelVIX > 25) sentimiento = 'BAJISTA';
    if (nivelVIX > 30) sentimiento = 'MUY_BAJISTA';

    return {
      spy: parseFloat(cambiSPY.toFixed(2)),
      vix: parseFloat(nivelVIX.toFixed(2)),
      sentimiento
    };
  } catch (e) {
    return { spy: 0, vix: 20, sentimiento: 'NEUTRAL' };
  }
}
