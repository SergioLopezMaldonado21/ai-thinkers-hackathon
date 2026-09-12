# Mockups — MiniOficina

Tres páginas **autocontenidas**: se abren de doble clic en cualquier navegador, sin `npm`, sin
servidor y sin internet (salvo las tipografías, que caen a la fuente del sistema si no hay red).
Son la referencia visual del producto y el plan B para grabar el video si el build falla.

| Archivo | Qué es | Para qué sirve |
|---|---|---|
| `prototipo-dashboards.html` | Las 5 pantallas navegables dentro del armazón: Lobby (§6.1), Oficina en vivo (§6.2), Creador de agentes (§6.3), Plano (§6.4) y Panel generativo (§6.5, ⌘K) | Recorrer el producto completo y ver el contrato de cada callback |
| `creador-agentes.html` | Sólo §6.3 a pantalla completa | Enseñar la personalización del agente sin distracciones |
| `mascota-agent-spirits.html` | Hoja de personaje: 6 variantes de agente, expresiones, estados, tamaños, laboratorio 🎲 y los 64 combos | Referencia de la mascota para quien dibuje o extienda piezas |

## Cómo leerlos

Todo arranca con el seed del SPEC (§16): proyecto ☕ *Lanzamiento Café Frío*, 3 áreas y 6 agentes.
Ninguna pantalla abre vacía.

- En **Oficina**, el botón *Poner a trabajar* corre la simulación completa del pedido: el papel viaja
  de mesa en mesa, los agentes cambian de estado, sube la experiencia y cae el entregable. Eso es
  teatro del prototipo — en la app real esos eventos los manda el motor por SSE.
- En las demás pantallas, cada acción que en la app tocaría el store abre un recuadro oscuro con el
  **objeto exacto** que recibiría el callback (`onSave`, `onRun`, `onSubmit`…). Ese recuadro es el
  contrato contra el que se programa la integración.
- En **Laboratorio 🎲** de la hoja de mascota, cada combinación imprime el objeto listo para pegar
  en `seed.ts`.

## Qué NO son

No son la app. No tienen build, ni estado compartido, ni backend. El código real de esas pantallas
son componentes de React con la misma estética y la misma frontera (props adentro, callbacks afuera);
si el equipo los quiere, están listos para entrar al proyecto cuando se decida dónde vive el front.
