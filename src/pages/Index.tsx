import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, User, Ambulance, Car, Settings, Activity, ShieldCheck, Info, Volume2, VolumeX, ChevronDown, ArrowRight, Cpu, Zap, CheckCircle2 } from 'lucide-react';

const Index = () => {
  // Estados de los Sensores (Entradas)
  const [S, setS] = useState(true);
  const [PA, setPA] = useState(false); // Peatón en Acera
  const [PC, setPC] = useState(false); // Peatón en Calzada
  const [E, setE] = useState(false);
  const [C, setC] = useState(false);
  const [H, setH] = useState(false); // Vehículo a alta velocidad/cerca
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [inferenceOpen, setInferenceOpen] = useState(false);

  const inferenceRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al expadir con timeout mejorado
  useEffect(() => {
    if (inferenceOpen && inferenceRef.current) {
      setTimeout(() => {
        inferenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300); // Dar tiempo a la animación de expansión
    }
  }, [inferenceOpen]);

  // Estados de los Actuadores (Salidas)
  const [outputs, setOutputs] = useState({
    V: 1, // Semáforo (0: Rojo, 1: Verde) - AHORA VERDE POR DEFECTO
    A: 0, // Alarma
    I: 0, // Infracción
    M: 0, // Modo Manual
    status: 'S0 (Operación Normal)'
  })  // Referencias para el audio persistente (Loop)
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const lastSpokenType = useRef<string | null>(null);

  // Función de voz sintetizada
  const speak = (text: string) => {
    if (!soundEnabled) return;
    // Cancelar cualquier mensaje anterior para que el nuevo sea inmediato
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1; // Un poco más rápido para urgencia
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Manejador de Audio Dinámico (Patrones de Alarma y Voz)
  useEffect(() => {
    const isHardwareFailure = !S;
    const isEmergencyRisk = E && (PC || PA); // Ambulancia + cualquier peatón activa sirena/voz
    const isHighRisk = H && (PC || PA);
    const isCritical = isHardwareFailure || isEmergencyRisk;

    let pulseInterval: any;

    if (outputs.A === 1 && soundEnabled) {
      if (!audioCtx.current) {
        // @ts-ignore
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioCtx.current!;
      if (ctx.state === 'suspended') ctx.resume();

      // LÓGICA DE VOZ (Se dispara una vez al detectar el estado)
      if (isHighRisk && lastSpokenType.current !== 'high-risk') {
        speak("¡Peligro! Vehículo acercándose. ¡Deténgase!");
        lastSpokenType.current = 'high-risk';
      } else if (isCritical && lastSpokenType.current !== 'critical') {
        speak(isHardwareFailure ? "¡ALERTA DE SEGURIDAD! Falla crítica en la integridad del sistema detectada." : "Prioridad de emergencia. Despeje la vía.");
        lastSpokenType.current = 'critical';
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Tipo de onda: sawtooth para mayor agresividad en alertas de seguridad y riesgo
      oscillator.type = (isHighRisk || isHardwareFailure) ? 'sawtooth' : (isEmergencyRisk ? 'triangle' : 'sine');
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Frecuencia: Alertas de seguridad a 1200Hz (muy agudo)
      const baseFreq = (isHighRisk || isHardwareFailure) ? 1200 : (isEmergencyRisk ? 660 : 440);
      oscillator.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);

      oscillator.start();
      oscillatorRef.current = oscillator;
      gainRef.current = gainNode;

      if (isHighRisk) {
        // ALARMA DE PARADA (Pausada: 500ms)
        pulseInterval = setInterval(() => {
          if (oscillatorRef.current && ctx) {
            const now = ctx.currentTime;
            gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          }
        }, 500);
      } else if (isHardwareFailure) {
        // SONIDO DE ALERTA DE SEGURIDAD (Pausado: 800ms)
        let toggle = false;
        pulseInterval = setInterval(() => {
          if (oscillatorRef.current && ctx) {
            const now = ctx.currentTime;
            const nextFreq = toggle ? 1200 : 800;
            oscillator.frequency.exponentialRampToValueAtTime(nextFreq, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.1); 
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            toggle = !toggle;
          }
        }, 800); 
      } else if (isEmergencyRisk) {
        // Sirena de dos tonos (Ajustada: 800ms)
        let toggle = false;
        pulseInterval = setInterval(() => {
          if (oscillatorRef.current && ctx) {
            const now = ctx.currentTime;
            const nextFreq = toggle ? 660 : 440;
            oscillator.frequency.exponentialRampToValueAtTime(nextFreq, now + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.1);
            toggle = !toggle;
          }
        }, 800);
      } else {
        // Pulso suave
        pulseInterval = setInterval(() => {
          if (oscillatorRef.current && ctx) {
            const now = ctx.currentTime;
            gainNode.gain.linearRampToValueAtTime(0.03, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0.001, now + 0.4);
          }
        }, 800);
      }
    } else {
      lastSpokenType.current = null;
      // Detener sonido
      if (oscillatorRef.current) {
// ...
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) { }
        oscillatorRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
    }

    return () => {
      if (pulseInterval) clearInterval(pulseInterval);
      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
        } catch (e) { }
        oscillatorRef.current = null;
      }
    };
  }, [outputs.A, S, PC, soundEnabled]);

  // Lógica del Sistema
  useEffect(() => {
    let newV = 1; // Default: Verde (Vía Principal)
    let newA = 0;
    let newI = 0;
    let newM = 0;
    let statusLabel = 'S0 (Operación Normal)';

    if (!S) {
      newM = 1;
      newA = 1;
      newV = 0;
      statusLabel = 'S3 (Fallo de Hardware)';
    } else {
      newM = 0;

      if (E) {
        // Rama Emergencia del diagrama
        if (PC) {
          newV = 0;
          newA = 1;
          statusLabel = 'S1-W (¡PELIGRO! Emergencia + Peatón en Calzada)';
        } else if (PA) {
          newV = 1; // Prioridad ambulancia sobre peatón en acera
          newA = 1; // ALERTA: Avisar al peatón de la ambulancia
          statusLabel = 'S1-A (ADVERTENCIA: Ambulancia + Peatón en Acera)';
        } else {
          newV = 1;
          newA = 0;
          statusLabel = 'S1 (Emergencia en curso)';
        }
      } else {
        // Rama Sin Emergencia
        if (PC) {
          // Peatón en calzada
          newV = 0;
          // ALARMA DINÁMICA: Solo si hay vehículo cerca (H)
          newA = H ? 1 : 0;
          statusLabel = H ? 'S2-C (RIESGO VITAL: Carro + Peatón)' : 'S2-C (Peatón en Calzada - Cruce Seguro)';
        } 
        else if (PA) {
          // Peatón en acera
          if (H) {
            newV = 1; // Prioridad vehículo rápido para evitar frenadas bruscas
            newA = 1; // Alarma para alertar al peatón
            statusLabel = 'S2-H (ADVERTENCIA: Vehículo Rápido - Peatón en Acera)';
          } else {
            newV = 0; // Peatón puede cruzar si no hay riesgo inminente
            newA = 0;
            statusLabel = 'S2-A (Cruce: Peatón en Acera)';
          }
        }
        else if (C) {
          // Congestión
          newV = 1;
          newA = 0;
          statusLabel = 'S0 (Flujo: Congestión Detectada)';
        } else {
          // Estado Normal
          newV = 1;
          newA = 0;
          statusLabel = 'S0 (Reposo / Ciclo Normal)';
        }
      }
    }

    setOutputs({ V: newV, A: newA, I: newI, M: newM, status: statusLabel });
  }, [S, PA, PC, E, C, H, soundEnabled]);

  const SensorToggle = ({ label, sublabel, value, onChange, icon: Icon, color }: { label: string, sublabel?: string, value: boolean, onChange: (v: boolean) => void, icon: any, color: string }) => (
    <div
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border-2 ${value ? `${color} border-current shadow-lg scale-[1.02]` : 'bg-white border-slate-100 hover:border-slate-300 grayscale-[0.5]'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${value ? 'bg-white/20' : 'bg-slate-100'}`}>
          <Icon size={24} className={value ? 'text-white' : 'text-slate-400'} />
        </div>
        <div>
          <span className={`block font-black uppercase tracking-tight text-xs ${value ? 'text-white' : 'text-slate-600'}`}>{label}</span>
          {sublabel && <span className={`block text-[9px] uppercase font-bold opacity-60 ${value ? 'text-white' : 'text-slate-400'}`}>{sublabel}</span>}
        </div>
      </div>
      <div className={`w-10 h-5 rounded-full relative transition-colors ${value ? 'bg-white/40' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${value ? 'left-5' : 'left-1'}`} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-6 lg:p-10 font-sans text-slate-800">
      <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8 mt-4">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600" />
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100 group-hover:rotate-6 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tighter">SITRAI <span className="text-indigo-600"></span></h1>
            </div>
            <p className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] leading-relaxed opacity-80 px-1">
              Sistema Inteligente de Tráfico • Reglas de Integridad Automatizadas
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-center ${soundEnabled ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
            >
              {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
            <div className="flex items-center gap-3 bg-slate-900 px-6 py-4 rounded-2xl shadow-xl border border-slate-800 min-w-[200px]">
              <div className={`w-3 h-3 rounded-full ${S ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
              <span key={outputs.status} className="anim-fade font-black text-xs text-white uppercase tracking-wider">{outputs.status}</span>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">

          {/* Panel de Sensores */}
          <section className="xl:col-span-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 px-1">
                <Settings size={14} className="text-indigo-500" /> Matriz de Sensores
              </h2>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-black px-2 py-0.5 rounded-md uppercase">Inputs</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <SensorToggle label="S: Hardware" sublabel="Integridad del Sistema" value={S} onChange={setS} icon={ShieldCheck} color="bg-emerald-500 text-white" />
              <SensorToggle label="PA: Peatón Acera" sublabel="Detección preventiva" value={PA} onChange={setPA} icon={User} color="bg-amber-500 text-white" />
              <SensorToggle label="PC: Peatón Calzada" sublabel="Riesgo crítico" value={PC} onChange={setPC} icon={AlertTriangle} color="bg-red-600 text-white" />
              <SensorToggle label="H: Alta Velocidad" sublabel="Inminencia de paso" value={H} onChange={setH} icon={Zap} color="bg-orange-500 text-white" />
              <SensorToggle label="E: Ambulancia" sublabel="Vehículo Emergencia" value={E} onChange={setE} icon={Ambulance} color="bg-indigo-600 text-white" />
              <SensorToggle label="C: Congestión" sublabel="Flujo Vehicular Alto" value={C} onChange={setC} icon={Car} color="bg-slate-700 text-white" />
            </div>
          </section>

          {/* Panel de Control y Salidas */}
          <section className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">

            {/* Visualizador Semáforo */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl border-[6px] border-slate-800 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              <div className="w-24 h-64 sm:w-28 sm:h-72 bg-slate-950 rounded-[3rem] p-4 flex flex-col justify-between items-center border-4 border-slate-800 relative z-10">
                {/* LUZ ROJA */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-500 relative ${outputs.V === 0 ? 'bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.8)]' : 'bg-red-950/30'}`}>
                  {outputs.V === 0 && <div className="absolute inset-0 rounded-full animate-pulse bg-red-400/20" />}
                </div>
                {/* LUZ AMBAR (Inactiva en este sistema simple) */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900/50 border border-white/5" />
                {/* LUZ VERDE */}
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-500 relative ${outputs.V === 1 ? 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.8)]' : 'bg-emerald-950/30'}`}>
                  {outputs.V === 1 && <div className="absolute inset-0 rounded-full animate-pulse bg-emerald-400/20" />}
                </div>
              </div>
              <div className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] relative z-10 border-2 transition-colors ${outputs.V === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {outputs.V === 1 ? 'Flujo Vehicular: PASO' : 'Flujo Vehicular: ALTO'}
              </div>
            </div>

            {/* Contenedor de Actuadores Secundarios */}
            <div className="flex flex-col gap-4">
              <ActuatorCard
                active={outputs.A}
                icon={<AlertTriangle size={24} />}
                title="Alarma Sonora"
                desc={outputs.A ? '¡PELIGRO: CRUCE CRÍTICO!' : 'Sistema en Silencio'}
                color="red"
              />
              <ActuatorCard
                active={outputs.M}
                icon={<Settings size={24} />}
                title="Modo de Control"
                desc={outputs.M ? 'Control Manual (FALLA S)' : 'Interferencia Inteligente'}
                color="amber"
              />
              <div className="bg-white border-2 border-slate-100 p-6 rounded-3xl shadow-sm flex items-center gap-5 group transition-all hover:shadow-md">
                <div className={`p-4 rounded-2xl shrink-0 transition-all ${(outputs.V === 1 && (PA || PC)) || (H && PA) ? 'bg-indigo-600 text-white animate-bounce shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-300'}`}>
                  <Activity size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs uppercase text-slate-400 mb-1 tracking-wider">Cumplimiento Ético</h3>
                  <p className="font-bold text-slate-900 uppercase text-xs leading-tight">
                    {PC ? '¡FRENO DE EMERGENCIA!' : (H && PA ? '¡ALERTA PREVENTIVA!' : 'Operación Ética Nominal')}
                  </p>
                </div>
              </div>

              {/* Nueva Info Card */}
              <div className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white shadow-lg shadow-indigo-200">
                <div className="flex gap-4 items-start">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest mb-2">Protocolo Activo</h4>
                    <p className="text-[11px] font-medium opacity-90 leading-relaxed italic">
                      {outputs.M === 1
                        ? 'Protocolo de Emergencia por falla técnica en sensores principales.'
                        : (PC ? 'Detención Inmediata: Presencia de vida en calzada vehicular.' : (E ? 'Prioridad Médica: Habilitando canal rápido para emergencias.' : 'Optimización de red: Vía principal activa.'))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Inferencia lógica activa - Diseño Expandido */}
        <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity size={100} />
          </div>
          <div className="flex items-start gap-5 relative z-10">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shrink-0 shadow-sm">
              <Cpu size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 mb-2">Motor de Inferencia Proactivo</h4>
              <p key={`${S}-${PA}-${PC}-${E}-${C}-${H}`} className="anim-fade text-slate-900 text-sm sm:text-base leading-[1.6] font-bold italic">
                {outputs.M === 1
                  ? '⚠️ BLOQUEO DE SEGURIDAD: Falla técnica crítica. Protocolo de detención activa.'
                  : E ? (PC ? '🚨 EMERGENCIA CRÍTICA: Peatón en calzada durante paso de ambulancia. ¡DETENCIÓN TOTAL!' : (PA ? '🚑 PRIORIDAD AMBULANCIA: Peatón en acera. Semáforo en VERDE con ALARMA activa para advertencia.' : '🚑 VIA LIBRE: Prioridad a vehículo de emergencia concedida.'))
                  : PC ? (H ? '🛑 RIESGO VITAL: Carro y Peatón en calzada. ¡ALARMA ACTIVA!' : '🚶 PEATÓN EN CALZADA: Semáforo a ROJO. Alarma desactivada por ausencia de riesgo vehicular.')
                  : PA ? (H ? '⚠️ PRIORIDAD VEHICULAR: Carro veloz detectado. Semáforo en VERDE. Alarma activa para advertir al peatón.' : '⏳ CRUCE SEGURO: Peatón esperando. Semáforo a ROJO.')
                  : C ? '🏎️ OPTIMIZACIÓN: Congestión detectada. Flujo constante habilitado.'
                  : '✅ CICLO NOMINAL: Vía principal activa en Verde.'}
              </p>
            </div>
          </div>
        </div>

        {/* Card colapsable — Flujo de Inferencia Actualizado */}
        <div ref={inferenceRef} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden scroll-mt-10">
          <button
            onClick={() => setInferenceOpen(!inferenceOpen)}
            className="w-full flex items-center justify-between px-6 py-6 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${inferenceOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <ArrowRight size={20} className={inferenceOpen ? 'rotate-90 transition-transform' : 'transition-transform'} />
              </div>
              <div>
                <h3 className={`font-black text-xl uppercase tracking-tight ${inferenceOpen ? 'text-indigo-600' : 'text-slate-700'}`}>Raciocinio del Sistema</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Traza de ejecución lógica paso a paso</p>
              </div>
            </div>
            <div className={`p-2 rounded-full border border-slate-200 bg-white transition-transform duration-300 ${inferenceOpen ? 'rotate-180' : ''}`}>
              <ChevronDown size={20} className="text-slate-400" />
            </div>
          </button>

          <div className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${inferenceOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden bg-slate-50/50">
              <div className="px-6 py-8 space-y-8">

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {['Inputs', 'Validación S', 'Priorización', 'Decisión V/A', 'Acción'].map((step, i, arr) => (
                    <React.Fragment key={step}>
                      <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm text-slate-600">{step}</span>
                      {i < arr.length - 1 && <ArrowRight size={14} className="opacity-30" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                  {/* Paso 1 */}
                  <InferenceStep number="01" title="Dataset de Sensores" icon={<Zap size={14} />} color="bg-white border-sky-100 text-sky-900">
                    <div className="space-y-2">
                      {[
                        { var: 'S', desc: 'Hardware OK', val: S },
                        { var: 'H', desc: 'Alta Velocidad', val: H },
                        { var: 'PA', desc: 'Peatón Acera', val: PA },
                        { var: 'PC', desc: 'Peatón Calzada', val: PC },
                        { var: 'E', desc: 'Emergencia', val: E },
                      ].map(s => (
                        <div key={s.var} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded flex items-center justify-center font-black text-[10px] ${s.val ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-400'}`}>{s.var}</span>
                            <span className="text-[10px] font-bold text-slate-700 uppercase">{s.desc}</span>
                          </div>
                          <span className={`font-black text-[9px] ${s.val ? 'text-sky-600' : 'text-slate-300'}`}>{s.val ? '1' : '0'}</span>
                        </div>
                      ))}
                    </div>
                  </InferenceStep>

                  {/* Paso 2 */}
                  <InferenceStep number="02" title="Lógica de Seguridad" icon={<ShieldCheck size={14} />} color="bg-white border-amber-100 text-amber-900">
                    <p className="text-[10px] font-bold text-slate-700 uppercase mb-3">Integridad del Hardware:</p>
                    <div className="font-mono text-[10px] p-3 rounded-lg bg-slate-900 text-emerald-400 mb-4 flex items-center justify-center">
                      M = NOT S
                    </div>
                    <div className={`p-4 rounded-xl text-center flex flex-col items-center gap-1 ${S ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {S ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                      <span className="font-black text-[10px] uppercase">{S ? 'Hardware Íntegro' : 'Fallo de Sistema'}</span>
                    </div>
                  </InferenceStep>

                  {/* Paso 3 */}
                  <InferenceStep number="03" title="Grafo de Decisión" icon={<Activity size={14} />} color="bg-white border-violet-100 text-violet-900">
                    <div className="space-y-2">
                      {[
                        { priority: 'P0', rule: 'PC → RED + ALARM', active: PC },
                        { priority: 'P1', rule: 'H + PA → GREEN + ALARM', active: H && PA && !PC },
                        { priority: 'P2', rule: 'H → GREEN', active: H && !PC && !PA },
                        { priority: 'P3', rule: 'E + PA → GREEN + ALARM', active: E && PA && !PC && !H },
                        { priority: 'P4', rule: 'E → GREEN', active: E && !PA && !PC && !H },
                        { priority: 'P5', rule: 'PA → RED', active: PA && !E && !PC && !H },
                      ].map(r => (
                        <div key={r.priority} className={`flex items-center gap-2 p-2 rounded-lg border text-[9px] font-black transition-all ${r.active ? 'bg-violet-800 border-violet-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 opacity-60'}`}>
                          <span className="w-5 h-5 flex items-center justify-center bg-black/20 rounded">{r.priority}</span>
                          <span>{r.rule}</span>
                          {r.active && <CheckCircle2 size={12} className="ml-auto" />}
                        </div>
                      ))}
                    </div>
                  </InferenceStep>

                  {/* Paso 4 */}
                  <InferenceStep number="04" title="Vector de Salida" icon={<Info size={14} />} color="bg-white border-rose-100 text-rose-900">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { var: 'V', label: outputs.V === 1 ? 'GREEN' : 'RED', active: outputs.V === 1 },
                        { var: 'A', label: (outputs.A === 1 || (H && PC)) ? 'ALARM' : 'OFF', active: outputs.A === 1 || (H && PC) },
                        { var: 'M', label: outputs.M === 1 ? 'MANUAL' : 'AUTO', active: outputs.M === 1 },
                        { var: 'I', label: (PA || PC) && outputs.V === 1 ? 'INT' : 'OK', active: (PA || PC) && outputs.V === 1 },
                      ].map(o => (
                        <div key={o.var} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-500 mb-1">{o.var}</span>
                          <span className={`text-[10px] font-black ${o.active ? 'text-rose-700' : 'text-slate-400'}`}>{o.label}</span>
                        </div>
                      ))}
                    </div>
                  </InferenceStep>

                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const ActuatorCard = ({ active, icon, title, desc, color }: { active: any, icon: any, title: string, desc: string, color: 'red' | 'amber' | 'indigo' }) => {
  const colors: Record<string, string> = {
    red: 'bg-red-50 border-red-200 text-red-700 icon-bg-red-500',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 icon-bg-amber-500',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700 icon-bg-indigo-500'
  };

  const current = colors[color] || colors.red;

  return (
    <div className={`p-5 rounded-3xl border-2 transition-all flex items-center gap-5 ${active ? current.split(' icon-bg-')[0] : 'bg-white border-slate-100 opacity-60'}`}>
      <div className={`p-4 rounded-2xl shrink-0 transition-all ${active ? (color === 'red' ? 'bg-red-500' : 'bg-amber-500') + ' text-white shadow-lg' : 'bg-slate-50 text-slate-200'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-black text-sm uppercase tracking-wider mb-1">{title}</h3>
        <p className="text-[10px] font-bold opacity-60 uppercase truncate tracking-tight">{desc}</p>
      </div>
    </div>
  );
};

const InferenceStep = ({ number, title, icon, color, children, className = '' }: { number: string, title: string, icon: any, color: string, children: React.ReactNode, className?: string }) => (
  <div className={`border-2 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${color} ${className}`}>
    <div className="flex items-center gap-2 mb-4">
      <span className="font-black text-[10px] opacity-40 uppercase tracking-widest">Etapa {number}</span>
      <div className="h-px flex-1 bg-current opacity-10" />
      <span className="flex items-center gap-1.5 font-black text-xs uppercase tracking-tight">{icon} {title}</span>
    </div>
    {children}
  </div>
);

export default Index;