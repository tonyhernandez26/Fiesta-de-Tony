import React, { useState, useEffect } from "react";
import {
  MapPin, Calendar, Clock, Users, CreditCard, Send, Check,
  X, Lock, Palmtree, Ticket, Copy, Plus, Minus, Sparkles
} from "lucide-react";

/* ======================================================
   EDITA AQUÍ los datos de tu fiesta, cuentas y precios
   ====================================================== */
const EVENT = {
  name: "Cumple + Despedida de Tony",
  date: "Sábado 22 de agosto, 2026",
  time: "Desde las 8:00 PM",
     location: "Kennedy Norte",
mapsLink: "https://www.google.com/maps?q=-2.156528,-79.902222",
    amenities: ["DJ en vivo", "Piscina", "Cóctel de bienvenida", "Seguridad privada", "Hamburguesas, hot dogs y cervezas a la venta", "Sorpresa especial durante la noche"],
    tickets: [
    { id: "dopamina", name: "Dopamina Pass", price: 10, desc: "1 cóctel de cortesía" },
  ],
  paypalLink: "https://www.paypal.me/tonyhernandez6",
  bank: {
    banco: "Banco Pichincha",
    tipo: "Cuenta de ahorros",
    numero: "2205483630",
    nombre: "Denilson Moran",
    cedula: "0804539930",
  },
  whatsapp: "593939819611", // sin + ni espacios
  hostPin: "2121731",
  capacity: 150,
};

const C = {
  night: "#0B2E2C",
  nightDeep: "#062120",
  papaya: "#FF6B35",
  coral: "#FF9A66",
  hibiscus: "#E6396B",
  sand: "#FDF3E0",
  sandDark: "#F3E2C4",
  palm: "#12463A",
  cream: "#FFF8ED",
};

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=DM+Sans:wght@400;500;700;900&family=Space+Mono:wght@400;700&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    .display { font-family: 'Anton', sans-serif; letter-spacing: 0.02em; }
    .mono { font-family: 'Space Mono', monospace; }
    .btn { transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    .btn:hover { transform: translateY(-2px); }
    .btn:active { transform: translateY(0); }
    .stub::before, .stub::after {
      content: ""; position: absolute; width: 24px; height: 24px; border-radius: 50%;
      background: ${C.cream}; top: 50%; transform: translateY(-50%);
    }
    .stub::before { left: -12px; }
    .stub::after { right: -12px; }
    input:focus, button:focus-visible { outline: 3px solid ${C.hibiscus}; outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) { .btn, .anim { transition: none !important; animation: none !important; } }
  `}</style>
);

function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `TH-${s}`;
}

/* ======================================================
   Almacenamiento compartido: usa /api/manifest (Vercel
   Function + base de datos) para que todos los invitados
   y el anfitrión vean la misma lista, en cualquier
   dispositivo. Si la API todavía no está conectada a una
   base de datos, funciona en modo local temporal.
   ====================================================== */
async function loadManifest() {
  try {
    const res = await fetch("/api/manifest");
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    try {
      const local = localStorage.getItem("tf_manifest_fallback");
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  }
}
async function saveManifest(list) {
  try {
    const res = await fetch("/api/manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(list),
    });
    if (!res.ok) throw new Error("bad response");
  } catch (e) {
    console.error("No se pudo guardar en el servidor, usando respaldo local", e);
    try {
      localStorage.setItem("tf_manifest_fallback", JSON.stringify(list));
    } catch {}
  }
}

export default function App() {
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(() => Object.fromEntries(EVENT.tickets.map(t => [t.id, 0])));
  const [buyer, setBuyer] = useState({ name: "", contact: "" });
  const [method, setMethod] = useState("paypal");
  const [reference, setReference] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [hostMode, setHostMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showPinBox, setShowPinBox] = useState(false);
  const [doorSearch, setDoorSearch] = useState("");
  const [trackCode, setTrackCode] = useState("");
  const [trackResult, setTrackResult] = useState(undefined); // undefined = sin buscar, null = no encontrado, obj = encontrado

  useEffect(() => {
    loadManifest().then(m => { setManifest(m); setLoading(false); });
  }, []);

  const total = EVENT.tickets.reduce((sum, t) => sum + t.price * (qty[t.id] || 0), 0);
  const totalTickets = Object.values(qty).reduce((a, b) => a + b, 0);

  const changeQty = (id, delta) => {
    setQty(q => {
      const currentTotal = Object.values(q).reduce((a, b) => a + b, 0);
      const room = EVENT.capacity - soldTickets - currentTotal;
      const next = Math.max(0, (q[id] || 0) + delta);
      if (delta > 0 && room <= 0) return q;
      return { ...q, [id]: Math.min(next, 20) };
    });
  };

  async function submitReservation(paidMethod, status) {
    if (totalTickets === 0) { setError("Elige al menos un boleto."); return; }
    if (totalTickets > spotsLeft) { setError(`Solo quedan ${spotsLeft} cupos disponibles.`); return; }
    if (!buyer.name.trim() || !buyer.contact.trim()) { setError("Escribe tu nombre y un contacto (WhatsApp o correo)."); return; }
    setError("");
    setSubmitting(true);
    const code = genCode();
    const entry = {
      code,
      name: buyer.name.trim(),
      contact: buyer.contact.trim(),
      tickets: EVENT.tickets.filter(t => qty[t.id] > 0).map(t => ({ name: t.name, qty: qty[t.id], price: t.price })),
      total,
      method: paidMethod,
      status,
      reference: reference.trim(),
      timestamp: new Date().toISOString(),
    };
    const current = await loadManifest();
    const updated = [...current, entry];
    await saveManifest(updated);
        setManifest(updated);
    setConfirmation(entry);
    setSubmitting(false);
    return entry;
  }
async function sendComprobanteYGuardar() {
    const entry = await submitReservation("Transferencia", "Pendiente de verificación");
    if (entry) {
      window.open(waLink(entry), "_blank");
    }
  }
  function waLink(entry) {
    const msg = `Hola! Soy ${entry?.name || buyer.name}, confirmo mi comprobante de pago para el ${EVENT.name}. Código de reserva: ${entry?.code || ""}. Referencia: ${entry?.reference || reference}`;
    return `https://wa.me/${EVENT.whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function checkPin() {
    if (pinInput === EVENT.hostPin) { setHostMode(true); setShowPinBox(false); setPinError(false); }
    else setPinError(true);
  }

  function trackMyReservation() {
    const code = trackCode.trim().toUpperCase();
    const found = manifest.find(m => m.code.toUpperCase() === code);
    setTrackResult(found || null);
  }

  async function updateStatus(code, newStatus) {
    const updated = manifest.map(m => m.code === code ? { ...m, status: newStatus } : m);
    setManifest(updated);
    await saveManifest(updated);
  }
  async function toggleCheckIn(code) {
    const updated = manifest.map(m => m.code === code ? { ...m, checkedIn: !m.checkedIn } : m);
    setManifest(updated);
    await saveManifest(updated);
  }
  async function removeEntry(code) {
    const updated = manifest.filter(m => m.code !== code);
    setManifest(updated);
    await saveManifest(updated);
  }

  const soldTickets = manifest.reduce((sum, m) => sum + m.tickets.reduce((a, t) => a + t.qty, 0), 0);
  const spotsLeft = Math.max(0, EVENT.capacity - soldTickets);
  const soldOut = spotsLeft === 0;

  const confirmedCount = manifest.filter(m => m.status === "Confirmado").reduce((s, m) => s + m.tickets.reduce((a, t) => a + t.qty, 0), 0);
  const firstNames = manifest.slice(-8).map(m => m.name.split(" ")[0]);

  return (
    <div style={{ background: C.cream, minHeight: "100vh" }}>
      {FONTS}

      {/* HERO */}
      <div style={{
        position: "relative", overflow: "hidden",
        background: `linear-gradient(180deg, ${C.coral} 0%, ${C.papaya} 32%, ${C.hibiscus} 60%, ${C.night} 100%)`,
        padding: "28px 20px 90px", color: C.cream,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <Palmtree size={22} /> <span className="mono" style={{ fontSize: 13, letterSpacing: 2 }}>BOARDING PASS · CUN</span>
          </div>
          <button onClick={() => setShowPinBox(true)} className="btn" style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)",
            color: C.cream, borderRadius: 999, padding: "6px 14px", fontSize: 12, display: "flex", gap: 6, alignItems: "center", cursor: "pointer",
          }}>
            <Lock size={13} /> Modo anfitrión
          </button>
        </div>

        <p className="mono" style={{ fontSize: 13, letterSpacing: 3, opacity: 0.85, marginBottom: 6 }}>
          DESTINO: UNA BUENA NOCHE — DRESS CODE: BLANCO
        </p>
        <h1 className="display" style={{ fontSize: "clamp(40px, 11vw, 80px)", lineHeight: 0.95, margin: "0 0 18px" }}>
          {EVENT.name}
        </h1>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", fontSize: 14, fontWeight: 500 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={16} /> {EVENT.date}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={16} /> {EVENT.time}</span>
          <a href={EVENT.mapsLink} target="_blank" rel="noreferrer" style={{ color: C.cream, display: "flex", alignItems: "center", gap: 6, textDecoration: "underline" }}>
            <MapPin size={16} /> {EVENT.location}
          </a>
        </div>

        {/* palm silhouette divider */}
        <svg viewBox="0 0 1440 120" style={{ position: "absolute", left: 0, right: 0, bottom: -2, width: "100%", height: 90 }} preserveAspectRatio="none">
          <path d="M0,60 C240,110 480,10 720,55 C960,100 1200,20 1440,60 L1440,120 L0,120 Z" fill={C.sand} />
        </svg>
      </div>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 720, margin: "-40px auto 0", padding: "0 16px 60px", position: "relative" }}>

        {/* AMENIDADES */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", margin: "0 0 22px" }}>
          {EVENT.amenities.map((a, i) => (
            <span key={i} className="mono" style={{
              background: "#fff", border: `1.5px solid ${C.night}`, borderRadius: 999,
              padding: "7px 14px", fontSize: 12, fontWeight: 700, color: C.night,
            }}>
              ✦ {a}
            </span>
          ))}
        </section>

        {/* SELECCIÓN DE BOLETOS */}
        <section style={{ background: C.night, borderRadius: 22, padding: 22, color: C.cream, boxShadow: "0 20px 40px rgba(11,46,44,0.25)", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Ticket size={20} color={C.papaya} />
            <h2 className="display" style={{ fontSize: 22, margin: 0 }}>ELIGE TUS BOLETOS</h2>
          </div>
          {soldOut && (
  <p className="mono" style={{ fontSize: 12, color: C.hibiscus, marginBottom: 14 }}>
    ¡CUPO AGOTADO!
  </p>
)}
{EVENT.tickets.map(t => (
            <div key={t.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px", marginBottom: 10,
            }}>
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>{t.name}</p>
                <p style={{ fontSize: 12, opacity: 0.7, margin: "2px 0 0", maxWidth: 260 }}>{t.desc}</p>
                <p className="mono" style={{ color: C.coral, margin: "6px 0 0", fontWeight: 700 }}>${t.price.toFixed(2)}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button aria-label={`Restar ${t.name}`} onClick={() => changeQty(t.id, -1)} className="btn" style={qtyBtnStyle}><Minus size={14} /></button>
                <span className="mono" style={{ width: 20, textAlign: "center" }}>{qty[t.id] || 0}</span>
                <button aria-label={`Sumar ${t.name}`} onClick={() => changeQty(t.id, 1)} className="btn" style={qtyBtnStyle}><Plus size={14} /></button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px dashed rgba(255,255,255,0.25)" }}>
            <span style={{ opacity: 0.8 }}>{totalTickets} boleto(s)</span>
            <span className="display" style={{ fontSize: 24, color: C.papaya }}>${total.toFixed(2)}</span>
          </div>
        </section>

        {/* DATOS + PAGO */}
        {soldOut && !confirmation ? (
          <section style={{ background: C.night, color: C.cream, borderRadius: 22, padding: 26, marginBottom: 22, textAlign: "center" }}>
            <h2 className="display" style={{ fontSize: 24, margin: "0 0 8px", color: C.papaya }}>¡CUPO AGOTADO!</h2>
            <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>Ya se vendieron los {EVENT.capacity} boletos disponibles para este vuelo a Cancún ✈️</p>
          </section>
        ) : !confirmation ? (
          <section className="stub" style={{ position: "relative", background: C.sand, border: `2px dashed ${C.palm}`, borderRadius: 22, padding: 22, marginBottom: 22 }}>
            <h2 className="display" style={{ fontSize: 22, margin: "0 0 14px", color: C.night }}>TUS DATOS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              <input placeholder="Nombre completo" value={buyer.name} onChange={e => setBuyer(b => ({ ...b, name: e.target.value }))} style={inputStyle} />
              <input placeholder="WhatsApp o correo" value={buyer.contact} onChange={e => setBuyer(b => ({ ...b, contact: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setMethod("paypal")} className="btn" style={tabStyle(method === "paypal")}>PayPal / Tarjeta</button>
              <button onClick={() => setMethod("transfer")} className="btn" style={tabStyle(method === "transfer")}>Transferencia</button>
            </div>

            {method === "paypal" ? (
              <div>
                <p style={{ fontSize: 13, color: C.palm, marginBottom: 12 }}>
                  Puedes pagar con tu cuenta PayPal o directamente con tarjeta de crédito/débito, sin necesidad de tener cuenta.
                </p>
                <a href={EVENT.paypalLink} target="_blank" rel="noreferrer" className="btn"
                  style={{ ...primaryBtnStyle, textDecoration: "none", display: "flex", justifyContent: "center", gap: 8 }}>
                  <CreditCard size={18} /> Pagar ${total.toFixed(2)} con PayPal
                </a>
                <button disabled={submitting} onClick={() => submitReservation("PayPal", "Pendiente de verificación")} className="btn"
                  style={{ ...secondaryBtnStyle, marginTop: 10 }}>
                  {submitting ? "Guardando..." : "Ya pagué, confirmar mi lugar"}
                </button>
                <p style={{ fontSize: 11, opacity: 0.6, marginTop: 6 }}>El anfitrión revisará el pago en PayPal antes de confirmar tu cupo.</p>
              </div>
            ) : (
              <div>
                <div style={{ background: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, fontSize: 13, lineHeight: 1.7 }}>
                  <strong>Banco:</strong> {EVENT.bank.banco}<br />
                  <strong>Tipo:</strong> {EVENT.bank.tipo}<br />
                  <strong>N° cuenta:</strong> <span className="mono">{EVENT.bank.numero}</span><br />
                  <strong>Nombre:</strong> {EVENT.bank.nombre}<br />
                  <strong>Cédula/RUC:</strong> {EVENT.bank.cedula}
                </div>
                                <input placeholder="N° de referencia o últimos dígitos del comprobante" value={reference} onChange={e => setReference(e.target.value)} style={inputStyle} />
                <button disabled={submitting} onClick={sendComprobanteYGuardar} className="btn" style={{ ...primaryBtnStyle, marginTop: 10, display: "flex", justifyContent: "center", gap: 6 }}>
                  <Send size={16} /> {submitting ? "Guardando..." : "Enviar comprobante y guardar mi reserva"}
                </button>
              </div>
            )}
            {error && <p style={{ color: C.hibiscus, fontSize: 13, marginTop: 10, fontWeight: 700 }}>{error}</p>}
          </section>
        ) : (
          <BoardingPass entry={confirmation} event={EVENT} onReset={() => {
            setConfirmation(null); setBuyer({ name: "", contact: "" }); setReference("");
            setQty(Object.fromEntries(EVENT.tickets.map(t => [t.id, 0])));
          }} />
        )}

        {/* CONSULTAR MI RESERVA */}
        <section style={{ background: "#fff", borderRadius: 22, padding: 22, boxShadow: "0 10px 24px rgba(11,46,44,0.08)", marginBottom: 22 }}>
          <h2 className="display" style={{ fontSize: 20, margin: "0 0 10px", color: C.night }}>¿YA RESERVASTE? CONSULTA TU ESTADO</h2>
          <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 12 }}>Escribe tu código (el que te apareció en tu boarding pass, ej. TH-AB12C) para ver si ya se confirmó tu pago.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="TH-XXXXX" value={trackCode} onChange={e => setTrackCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && trackMyReservation()} style={{ ...inputStyle, flex: 1 }} />
            <button onClick={trackMyReservation} className="btn" style={{ ...primaryBtnStyle, width: "auto", padding: "12px 20px" }}>Buscar</button>
          </div>
          {trackResult === null && <p style={{ color: C.hibiscus, fontSize: 13, marginTop: 10 }}>No encontramos ese código. Revisa que esté bien escrito.</p>}
          {trackResult && (
            <div style={{ marginTop: 14, background: C.sand, borderRadius: 14, padding: 14, fontSize: 13 }}>
              <p style={{ margin: "0 0 4px" }}><strong>{trackResult.name}</strong> · {trackResult.tickets.map(t => `${t.qty}x ${t.name}`).join(", ")}</p>
              <span style={{
                display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, marginTop: 4,
                background: trackResult.status === "Confirmado" ? "#DCF5E5" : "#FFF1D6",
                color: trackResult.status === "Confirmado" ? "#1B7A45" : "#946200",
              }}>{trackResult.status}</span>
              {trackResult.status !== "Confirmado" && (
                <p style={{ margin: "8px 0 0", opacity: 0.7 }}>Aún estamos verificando tu pago. Vuelve a consultar más tarde con este mismo código.</p>
              )}
            </div>
          )}
        </section>

       
      </div>

      {/* PIN MODAL */}
      {showPinBox && !hostMode && (
        <Modal onClose={() => setShowPinBox(false)}>
          <h3 className="display" style={{ margin: "0 0 12px", color: C.night }}>ACCESO ANFITRIÓN</h3>
          <input type="password" placeholder="PIN" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false); }}
            style={inputStyle} onKeyDown={e => e.key === "Enter" && checkPin()} />
          {pinError && <p style={{ color: C.hibiscus, fontSize: 13, marginTop: 6 }}>PIN incorrecto.</p>}
          <button onClick={checkPin} className="btn" style={{ ...primaryBtnStyle, marginTop: 12 }}>Entrar</button>
        </Modal>
      )}

      {/* HOST PANEL */}
      {hostMode && (
        <Modal onClose={() => setHostMode(false)} wide>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 className="display" style={{ margin: 0, color: C.night }}>MANIFIESTO COMPLETO</h3>
            <button onClick={() => setHostMode(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
          </div>
          <input
            placeholder="Buscar por código (ej. TH-AB12C) o nombre"
            value={doorSearch}
            onChange={e => setDoorSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: 14 }}
          />
          {manifest.length === 0 ? <p>Todavía no hay reservas.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "60vh", overflowY: "auto" }}>
              {manifest
                .filter(m => {
                  const q = doorSearch.trim().toLowerCase();
                  if (!q) return true;
                  return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
                })
                .map(m => (
                <div key={m.code} style={{
                  border: `1px solid ${m.checkedIn ? "#1B7A45" : "#eee"}`, borderRadius: 12, padding: 12, fontSize: 13,
                  background: m.checkedIn ? "#F2FBF5" : "#fff",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{m.name}</strong>
                    <span className="mono">{m.code}</span>
                  </div>
                  <p style={{ margin: "4px 0", opacity: 0.7 }}>{m.contact} · {m.method} · ${m.total.toFixed(2)}</p>
                  <p style={{ margin: "4px 0" }}>{m.tickets.map(t => `${t.qty}x ${t.name}`).join(", ")}</p>
                  {m.reference && <p style={{ margin: "4px 0", opacity: 0.7 }}>Ref: {m.reference}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: m.status === "Confirmado" ? "#DCF5E5" : "#FFF1D6",
                      color: m.status === "Confirmado" ? "#1B7A45" : "#946200",
                    }}>{m.status}</span>
                    {m.status !== "Confirmado" ? (
                      <button onClick={() => updateStatus(m.code, "Confirmado")} className="btn" style={miniBtnStyle}><Check size={13} /> Confirmar pago</button>
                    ) : (
                      <button onClick={() => updateStatus(m.code, "Pendiente de verificación")} className="btn" style={miniBtnStyle}>Marcar pendiente</button>
                    )}
                    <button onClick={() => toggleCheckIn(m.code)} className="btn" style={{
                      ...miniBtnStyle,
                      background: m.checkedIn ? "#1B7A45" : "transparent",
                      color: m.checkedIn ? "#fff" : C.night,
                      borderColor: "#1B7A45",
                    }}>
                      {m.checkedIn ? "✓ Ya ingresó" : "Marcar entrada"}
                    </button>
                    <button onClick={() => removeEntry(m.code)} className="btn" style={{ ...miniBtnStyle, color: C.hibiscus, borderColor: C.hibiscus }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function BoardingPass({ entry, event, onReset }) {
  return (
    <section className="stub" style={{
      position: "relative", background: C.night, color: C.cream, borderRadius: 22,
      padding: 22, marginBottom: 22, border: `2px dashed ${C.papaya}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Sparkles size={18} color={C.papaya} />
        <span className="mono" style={{ fontSize: 12, letterSpacing: 2, color: C.papaya }}>RESERVA GUARDADA</span>
      </div>
      <h3 className="display" style={{ fontSize: 26, margin: "0 0 10px" }}>{event.name}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, opacity: 0.8 }}>{event.date} · {event.location}</p>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
        <div>
          <p style={{ opacity: 0.6, margin: 0 }}>PASAJERO</p>
          <p style={{ margin: "2px 0 0", fontWeight: 700 }}>{entry.name}</p>
        </div>
        <div>
          <p style={{ opacity: 0.6, margin: 0 }}>CÓDIGO</p>
          <p className="mono" style={{ margin: "2px 0 0", fontWeight: 700 }}>{entry.code}</p>
        </div>
      </div>
      <p style={{ fontSize: 13, marginBottom: 6 }}>{entry.tickets.map(t => `${t.qty}x ${t.name}`).join(", ")} — ${entry.total.toFixed(2)}</p>
      <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16 }}>
        Estado: <strong>{entry.status}</strong>{entry.status !== "Confirmado" && " — el anfitrión verificará tu comprobante pronto."}
      </p>
      <div style={{ background: "#fff", borderRadius: 14, padding: 12, display: "inline-block", marginBottom: 16 }}>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(entry.code)}`}
          alt={`Código QR ${entry.code}`}
          width={140} height={140}
        />
      </div>
      <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>Muestra este código QR en la entrada.</p>
            <p style={{ fontSize: 12, color: C.papaya, fontWeight: 700, marginBottom: 16 }}>📌 Guarda este código: <span className="mono">{entry.code}</span> — más abajo en esta misma página puedes consultar si ya se confirmó tu pago.</p>
      <button onClick={onReset} className="btn" style={{ ...secondaryBtnStyle, borderColor: C.papaya, color: C.papaya }}>
        Hacer otra reserva
      </button>
    </section>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(6,33,32,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 20, padding: 22, width: "100%", maxWidth: wide ? 480 : 340,
      }}>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${C.sandDark}`,
  fontSize: 14, background: "#fff", color: C.night,
};
const primaryBtnStyle = {
  width: "100%", padding: "13px 16px", borderRadius: 999, border: "none",
  background: C.papaya, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const secondaryBtnStyle = {
  width: "100%", padding: "12px 16px", borderRadius: 999, border: `1.5px solid ${C.night}`,
  background: "transparent", color: C.night, fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const miniBtnStyle = {
  fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999,
  border: `1px solid ${C.night}`, background: "transparent", cursor: "pointer", display: "flex", gap: 4, alignItems: "center",
};
const qtyBtnStyle = {
  width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.4)",
  background: "rgba(255,255,255,0.1)", color: C.cream, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};
function tabStyle(active) {
  return {
    flex: 1, padding: "10px 12px", borderRadius: 999, border: `1.5px solid ${C.night}`,
    background: active ? C.night : "transparent", color: active ? C.cream : C.night,
    fontWeight: 700, fontSize: 13, cursor: "pointer",
  };
}
