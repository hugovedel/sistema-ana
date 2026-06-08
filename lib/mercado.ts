export async function obtenerDatosAccion(ticker: string) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    };

    // Obtener quote
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`;
    const res = await fetch(quoteUrl, { headers });
    const data = await res.json();

    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close?.filter(Boolean) as number[];
    const volumes = result.indicators?.quote?.[0]?.volume?.filter(Boolean) as number[];

    if (!closes || closes.length < 50) return null;

    // SMA 20 y 50
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const sma50 = closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50;

    // RSI 14
    const cambios = closes.slice(-15).map((p: number, i: number, arr: number[]) => i === 0 ? 0 : p - arr[i - 1]);
    const ganancias = cambios.map((c: number) => c > 0 ? c : 0);
    const perdidas = cambios.map((c: number) => c < 0 ? Math.abs(c) : 0);
    const avgGanancia = ganancias.slice(1).reduce((a: number, b: number) => a + b, 0) / 14;
    const avgPerdida = perdidas.slice(1).reduce((a: number, b: number) => a + b, 0) / 14;
    const rs = avgGanancia / (avgPerdida || 1);
    const rsi = 100 - (100 / (1 + rs));

    // MACD
    const ema = (data: number[], period: number): number => {
      const k = 2 / (period + 1);
      return data.reduce((prev: number, curr: number, i: number) => i === 0 ? curr : curr * k + prev * (1 - k));
    };
    const ema12 = ema(closes.slice(-26), 12);
    const ema26 = ema(closes.slice(-26), 26);
    const macd = ema12 - ema26;

    // Volumen
    const volumenPromedio = volumes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const volumenHoy = volumes[volumes.length - 1];
    const volumenRelativo = volumenHoy / volumenPromedio;

    // Tendencia
    const precioActual = closes[closes.length - 1];
    const precio5d = closes[closes.length - 6];
    const tendencia = precioActual > precio5d ? 'ALZA' : 'BAJA';

    // Cambio del dia
    const precioAnterior = closes[closes.length - 2];
    const cambioDia = ((precioActual - precioAnterior) / precioAnterior) * 100;

    return {
      ticker,
      nombre: meta.longName || meta.shortName || ticker,
      precioActual: parseFloat(precioActual.toFixed(4)),
      cambioDia: parseFloat(cambioDia.toFixed(2)),
      volumen: volumenHoy,
      volumenRelativo: parseFloat(volumenRelativo.toFixed(2)),
      sma20: parseFloat(sma20.toFixed(4)),
      sma50: parseFloat(sma50.toFixed(4)),
      rsi: parseFloat(rsi.toFixed(2)),
      macd: parseFloat(macd.toFixed(4)),
      tendencia,
      max52s: meta.fiftyTwoWeekHigh,
      min52s: meta.fiftyTwoWeekLow,
      sector: meta.sector || 'N/A'
    };
  } catch (e) {
    console.error(`Error obteniendo datos de ${ticker}:`, e);
    return null;
  }
}

export async function obtenerSentimientoMercado() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    };

    const [spyRes, vixRes] = await Promise.all([
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=5d', { headers }),
      fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=5d', { headers })
    ]);

    const spyData = await spyRes.json();
    const vixData = await vixRes.json();

    const spyCloses = spyData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) as number[];
    const vixCloses = vixData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) as number[];

    if (!spyCloses || !vixCloses) return { spy: 0, vix: 20, sentimiento: 'NEUTRAL' };

    const spyActual = spyCloses[spyCloses.length - 1];
    const spyAnterior = spyCloses[spyCloses.length - 2];
    const cambiSPY = ((spyActual - spyAnterior) / spyAnterior) * 100;
    const nivelVIX = vixCloses[vixCloses.length - 1];

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
