/** SIM_MODE: las mismas salidas, sin llamar al modelo. La demo nunca se cae. */
export const canned = {
  'Investigar mercado': `5 hallazgos:
1. El café frío crece ~18% anual en CDMX (fuente: prensa del sector cafetero, 2025).
2. Público principal 24–38 años, oficina híbrida, consumo entre 15:00 y 18:00.
3. Roma y Condesa concentran ~40 cafeterías de especialidad (por confirmar el censo exacto).
4. Precio esperado por vaso: $55–$75.
5. El envase retornable aparece como diferenciador sin explotar.
Supuse que: el lanzamiento es en tienda física más reparto.`,
  'Analizar competencia': `Tabla comparativa · 3 competidores
| Marca | Precio | Propuesta | Canal |
|---|---|---|---|
| Cielito Querido | $48 | "mexicano y rápido" | tienda |
| Blend Station | $72 | especialidad | tienda + app |
| Starbucks | $79 | marca global | masivo |
Hueco detectado: $58–$62 con envase retornable. Precios por confirmar en punto de venta.`,
  'Redactar campaña': `Mensaje principal: «Tu tarde, en frío.»
Variantes para redes:
1. «El bajón de las 5 tiene solución fría.»
2. «Cold brew de barrio, no de cadena.»
3. «Frío, cerca y a $59.»
Tono cercano, español de México, sin anglicismos.`,
  'Plan de ventas': `Precio de lanzamiento: $59 por vaso.
Meta semanal: 420 vasos (60 por día).
Canales: mostrador 60%, reparto 25%, activaciones de barrio 15%.
Presupuesto $20,000 → $9,000 producción · $7,000 pauta local · $4,000 activaciones.`,
};

export const cannedFinal = `# Plan de lanzamiento · Café Frío (Roma y Condesa)

## 🔎 Investigación
La categoría crece ~18% anual en CDMX. Público de 24 a 38 años con pico de consumo entre las 15:00 y las 18:00.

## 🎨 Marketing
Mensaje principal: «Tu tarde, en frío.», con tres variantes para redes en tono cercano.

## 💰 Ventas
Precio $59 por vaso, meta de 420 vasos por semana y presupuesto de $20,000 repartido 45/35/20 entre producción, pauta y activaciones.

## Por confirmar
- Precios de la competencia en punto de venta.
- Censo exacto de cafeterías de especialidad en la zona.
- Permisos para activaciones de barrio.`;

export const cannedFor = (title) =>
  canned[title] || `Resultado de "${title}" (modo simulación). Supuse que: el pedido sigue el plano del proyecto.`;
