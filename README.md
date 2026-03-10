# SITRAI - Sistema Inteligente de Tráfico

**SITRAI** (Sistema Inteligente de Tráfico • Reglas de Integridad Automatizadas) es una solución avanzada de gestión vial diseñada para priorizar la seguridad del peatón y la fluidez de vehículos de emergencia mediante un motor de inferencia proactivo.

## 🚀 Características Principales

- **Detección Dual de Peatones**: Sensores diferenciados para peatones en acera (PA) y calzada (PC), permitiendo respuestas preventivas o críticas según el riesgo.
- **Prioridad de Emergencia**: Detección de ambulancias (E) que garantiza vía libre inmediata sin comprometer la seguridad peatonal.
- **Análisis de Velocidad**: Sensor de alta velocidad (H) para evitar frenados bruscos y alertar a los peatones sobre vehículos en aproximación rápida.
- **Gestión de Congestión**: Optimización del flujo vehicular (C) cuando se detecta alta densidad de tráfico.
- **Protocolo de Integridad (S)**: Monitoreo constante del hardware que activa un modo de control manual en caso de fallo técnico.

## 🧠 Motor de Inferencia

El sistema utiliza un grafo de decisión priorizado:
1.  **P0 (Crítico)**: Peatón en calzada -> Semáforo en rojo y alarma activa.
2.  **P1 (Alerta)**: Vehículo rápido + Peatón esperando -> Alarma preventiva.
3.  **P2 (Fluidez)**: Vehículo rápido -> Mantiene verde para seguridad cinética.
4.  **P3 (Emergencia)**: Ambulancia -> Prioridad de paso.
5.  **P4 (Peatonal)**: Peatón en acera -> Ciclo de cruce seguro.

## 🛠️ Tecnologías

- **Fronend**: React + Vite
- **Estilos**: Tailwind CSS (Lucide Icons)
- **Lógica de Audio**: Web Audio API para señales sonoras dinámicas.

---
Desarrollado con un enfoque en la ética de la automatización y la protección de la vida.
