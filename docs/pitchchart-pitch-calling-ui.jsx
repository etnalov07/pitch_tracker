import { useState, useEffect, useRef } from "react";

// PitchChart Design System tokens
const colors = {
  navy: "#0A1628",
  navyLight: "#132240",
  navyMid: "#1B2D4A",
  amber: "#F5A623",
  amberLight: "#FFC85C",
  amberDim: "#C4841A",
  chalk: "#F0EDE6",
  chalkDim: "#C8C3BA",
  strike: "#E63946",
  ball: "#3A86FF",
  hit: "#2EC4B6",
  out: "#8B8FA3",
  surface0: "#0D1B2A",
  surface1: "#132240",
  surface2: "#1A2C48",
  surface3: "#223755",
  textPrimary: "#F0EDE6",
  textSecondary: "#8B93A8",
  textMuted: "#5A6278",
  border: "#2A3A55",
  green: "#22C55E",
  red: "#EF4444",
};

// Pitch type configs
const pitchTypes = [
  { id: "FB", label: "Fastball", short: "FB", color: colors.strike },
  { id: "CB", label: "Curveball", short: "CB", color: colors.ball },
  { id: "CH", label: "Changeup", short: "CH", color: colors.hit },
  { id: "SL", label: "Slider", short: "SL", color: colors.amber },
  { id: "CT", label: "Cutter", short: "CT", color: "#A855F7" },
  { id: "2S", label: "2-Seam", short: "2S", color: "#F97316" },
];

// Zone labels for audio
const zoneLabels = {
  "0-0": "up and in",
  "1-0": "up middle",
  "2-0": "up and away",
  "0-1": "middle in",
  "1-1": "middle middle",
  "2-1": "middle away",
  "0-2": "down and in",
  "1-2": "down middle",
  "2-2": "down and away",
  // Waste pitches outside zone
  "W-high": "high",
  "W-low": "low",
  "W-in": "way inside",
  "W-out": "way outside",
  "W-high-in": "high and tight",
  "W-high-out": "high and away",
  "W-low-in": "low and in",
  "W-low-out": "low and away",
};

function BluetoothIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" />
    </svg>
  );
}

function SpeakerIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SendIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CheckIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Simulated earpiece audio visualization
function AudioWave({ active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: active ? colors.green : colors.textMuted,
            height: active ? `${8 + Math.sin((Date.now() / 200) + i * 1.2) * 6}px` : 4,
            transition: "height 0.1s, background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

export default function PitchCallingUI() {
  const [view, setView] = useState("overview"); // overview | coach | catcher | flow
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [btConnected, setBtConnected] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [changing, setChanging] = useState(false); // true when coach is changing a sent call
  const [sentCall, setSentCall] = useState(null); // { pitch, zone } of what was sent
  const [callHistory, setCallHistory] = useState([
    { pitch: "FB", zone: "1-1", time: "2:34", result: "strike" },
    { pitch: "CB", zone: "2-2", time: "2:12", result: "ball" },
    { pitch: "FB", zone: "0-0", time: "1:58", result: "foul" },
  ]);
  const [audioActive, setAudioActive] = useState(false);
  const [catcherMessage, setCatcherMessage] = useState("");
  const animRef = useRef(null);

  // Audio wave animation
  useEffect(() => {
    if (audioActive) {
      const interval = setInterval(() => {
        setAudioActive((prev) => prev);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [audioActive]);

  const doSend = (isResend = false, isChange = false) => {
    if (!selectedPitch || !selectedZone) return;
    setSending(true);
    setAudioActive(true);

    const pitchLabel = pitchTypes.find((p) => p.id === selectedPitch)?.label || selectedPitch;
    const zoneLabel = zoneLabels[selectedZone] || selectedZone;
    const prefix = isChange ? "Change... " : "";
    setCatcherMessage(`${prefix}${pitchLabel}, ${zoneLabel}`);

    setTimeout(() => {
      setSending(false);
      setSent(true);
      setChanging(false);
      setSentCall({ pitch: selectedPitch, zone: selectedZone });

      if (!isResend) {
        // Only add to history on new sends / changes, not resends
        setCallHistory((prev) => {
          // If changing, replace the most recent entry
          if (isChange && prev.length > 0) {
            return [
              { pitch: selectedPitch, zone: selectedZone, time: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }), result: null, changed: true },
              ...prev.slice(1),
            ];
          }
          return [
            { pitch: selectedPitch, zone: selectedZone, time: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }), result: null },
            ...prev,
          ];
        });
      }

      setTimeout(() => {
        setAudioActive(false);
      }, 1200);
    }, 600);
  };

  const handleSend = () => doSend(false, false);
  const handleResend = () => doSend(true, false);
  const handleChange = () => {
    // Go back to selection mode but keep current selections visible
    setSent(false);
    setChanging(true);
    setCatcherMessage("");
  };
  const handleChangeSend = () => doSend(false, true);

  const handleLogResult = (result) => {
    // Log the pitch result, finalize, and reset for next pitch
    setCallHistory((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], result };
      return updated;
    });
    setSent(false);
    setSentCall(null);
    setSelectedPitch(null);
    setSelectedZone(null);
    setCatcherMessage("");
    setChanging(false);
  };

  const resultOptions = [
    { id: "strike", label: "Strike", color: colors.strike },
    { id: "ball", label: "Ball", color: colors.ball },
    { id: "foul", label: "Foul", color: "#EAB308" },
    { id: "in_play", label: "In Play", color: colors.hit },
  ];

  const getPitchColor = (id) => pitchTypes.find((p) => p.id === id)?.color || colors.textMuted;

  // Tab styles
  const tabStyle = (active) => ({
    padding: "10px 20px",
    background: active ? colors.surface3 : "transparent",
    border: "none",
    borderBottom: active ? `2px solid ${colors.amber}` : "2px solid transparent",
    color: active ? colors.amber : colors.textSecondary,
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div style={{
      background: colors.surface0,
      minHeight: "100vh",
      fontFamily: "'Source Sans 3', sans-serif",
      color: colors.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        background: colors.navy,
        borderBottom: `1px solid ${colors.border}`,
        padding: "16px 24px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: colors.amber,
          }} />
          <h1 style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: colors.chalk,
            margin: 0,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
          }}>
            PitchChart
          </h1>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: colors.amber,
            background: `${colors.amber}15`,
            padding: "3px 8px",
            borderRadius: 4,
          }}>
            Pitch Calling
          </span>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "coach", label: "Coach View" },
            { id: "catcher", label: "Catcher Earpiece" },
            { id: "flow", label: "Full Flow" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={tabStyle(view === tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>

        {/* ===== OVERVIEW ===== */}
        {view === "overview" && (
          <div>
            <SectionHeader title="Pitch Calling Feature" subtitle="Coach-to-catcher communication via Bluetooth earpiece" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <InfoCard
                title="Coach Side"
                items={[
                  "Select pitch type (FB, CB, CH, SL, etc.)",
                  "Tap target zone on strike zone grid",
                  "Tap SEND — audio cue transmitted",
                  "Pitch call auto-logged to game chart",
                ]}
                accent={colors.amber}
              />
              <InfoCard
                title="Catcher Side"
                items={[
                  "Wears Bluetooth earpiece (receive-only)",
                  "Hears tone + spoken call",
                  'Example: [beep] "Fastball, down and away"',
                  "NFHS compliant — receiver only on catcher",
                ]}
                accent={colors.hit}
              />
            </div>

            <div style={{
              background: colors.surface1,
              borderRadius: 10,
              padding: 20,
              border: `1px solid ${colors.border}`,
              marginBottom: 24,
            }}>
              <h3 style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: colors.chalk,
                margin: "0 0 16px",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}>
                UI Workflow
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {[
                  { step: "1", label: "Select Pitch", desc: "Tap pitch type button" },
                  { step: "→", label: "" },
                  { step: "2", label: "Select Zone", desc: "Tap target on zone grid" },
                  { step: "→", label: "" },
                  { step: "3", label: "Send", desc: "Tap send (or auto-send)" },
                  { step: "→", label: "" },
                  { step: "4", label: "Catcher Hears", desc: "Audio via earpiece" },
                  { step: "→", label: "" },
                  { step: "5", label: "Log Result", desc: "After pitch is thrown" },
                ].map((item, i) =>
                  item.step === "→" ? (
                    <span key={i} style={{ color: colors.textMuted, fontSize: 18 }}>→</span>
                  ) : (
                    <div key={i} style={{
                      background: colors.surface2,
                      borderRadius: 8,
                      padding: "10px 14px",
                      border: `1px solid ${colors.border}`,
                      minWidth: 100,
                      textAlign: "center",
                    }}>
                      <div style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: colors.amber,
                      }}>{item.step}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.chalk, marginTop: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{item.desc}</div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div style={{
              background: colors.surface1,
              borderRadius: 10,
              padding: 20,
              border: `1px solid ${colors.border}`,
            }}>
              <h3 style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: colors.chalk,
                margin: "0 0 12px",
                textTransform: "uppercase",
              }}>
                Technical Notes
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Audio Route", value: "Standard A2DP Bluetooth (no custom BLE needed)" },
                  { label: "Latency", value: "~100-200ms via A2DP — acceptable between pitches" },
                  { label: "Library", value: "expo-speech or expo-av for audio cue generation" },
                  { label: "Hardware", value: "Any single-ear Bluetooth earpiece ($15-20)" },
                  { label: "NFHS Rule", value: "Receiver-only device permitted on catcher" },
                  { label: "Fallback", value: "Traditional signs if BT disconnects" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{
                      color: colors.amber,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      minWidth: 90,
                      flexShrink: 0,
                    }}>{item.label}</span>
                    <span style={{ color: colors.textSecondary }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== COACH VIEW ===== */}
        {view === "coach" && (
          <div>
            <SectionHeader title="Coach's Game Screen" subtitle="Interactive prototype — select pitch type, tap zone, send to catcher" />

            {/* BT Status Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: colors.surface1,
              borderRadius: 8,
              padding: "8px 14px",
              marginBottom: 16,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BluetoothIcon size={14} color={btConnected ? colors.green : colors.red} />
                <span style={{ fontSize: 12, color: btConnected ? colors.green : colors.red, fontWeight: 600 }}>
                  {btConnected ? "Earpiece Connected" : "Earpiece Disconnected"}
                </span>
              </div>
              <button
                onClick={() => setBtConnected(!btConnected)}
                style={{
                  background: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 4,
                  padding: "4px 10px",
                  color: colors.textSecondary,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "'Source Sans 3', sans-serif",
                }}
              >
                {btConnected ? "Disconnect" : "Connect"}
              </button>
            </div>

            {/* Game Context Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: colors.surface1,
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Inning</span>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: colors.chalk }}>TOP 3</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Count</span>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700 }}>
                    <span style={{ color: colors.ball }}>1</span>
                    <span style={{ color: colors.textMuted }}> - </span>
                    <span style={{ color: colors.strike }}>2</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Outs</span>
                  <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.amber }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.surface3, border: `1px solid ${colors.border}` }} />
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Batter</span>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 600, color: colors.chalk }}>#7 Rodriguez</div>
                <div style={{ fontSize: 11, color: colors.textSecondary }}>L / 1-2 today</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20 }}>
              {/* Left: Pitch Selection + Zone */}
              <div>
                {/* Pitch Type Buttons */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 8 }}>
                    ① Pitch Type
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {pitchTypes.map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => setSelectedPitch(pt.id)}
                        style={{
                          padding: "12px 8px",
                          borderRadius: 8,
                          border: selectedPitch === pt.id ? `2px solid ${pt.color}` : `1px solid ${colors.border}`,
                          background: selectedPitch === pt.id ? `${pt.color}20` : colors.surface2,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <span style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontSize: 20,
                          fontWeight: 700,
                          color: selectedPitch === pt.id ? pt.color : colors.chalk,
                        }}>{pt.short}</span>
                        <span style={{ fontSize: 10, color: colors.textSecondary }}>{pt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Strike Zone Grid */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 8 }}>
                    ② Target Zone
                  </label>
                  <div style={{ position: "relative", width: "100%", maxWidth: 320, margin: "0 auto" }}>
                    {/* Waste pitch zones outside the strike zone */}
                    <div style={{ position: "relative", padding: 28 }}>
                      {/* Corner waste zones */}
                      {[
                        { id: "W-high-in", top: 0, left: 0 },
                        { id: "W-high-out", top: 0, right: 0 },
                        { id: "W-low-in", bottom: 0, left: 0 },
                        { id: "W-low-out", bottom: 0, right: 0 },
                      ].map((wz) => (
                        <button
                          key={wz.id}
                          onClick={() => setSelectedZone(wz.id)}
                          style={{
                            position: "absolute",
                            ...wz,
                            width: 26,
                            height: 26,
                            borderRadius: 4,
                            border: selectedZone === wz.id ? `2px solid ${colors.amber}` : `1px dashed ${colors.border}`,
                            background: selectedZone === wz.id ? `${colors.amber}20` : "transparent",
                            cursor: "pointer",
                            fontSize: 8,
                            color: colors.textMuted,
                          }}
                        />
                      ))}
                      {/* Edge waste zones */}
                      {[
                        { id: "W-high", top: 0, left: "50%", transform: "translateX(-50%)" },
                        { id: "W-low", bottom: 0, left: "50%", transform: "translateX(-50%)" },
                        { id: "W-in", top: "50%", left: 0, transform: "translateY(-50%)" },
                        { id: "W-out", top: "50%", right: 0, transform: "translateY(-50%)" },
                      ].map((wz) => (
                        <button
                          key={wz.id}
                          onClick={() => setSelectedZone(wz.id)}
                          style={{
                            position: "absolute",
                            ...wz,
                            width: wz.id === "W-high" || wz.id === "W-low" ? 60 : 26,
                            height: wz.id === "W-in" || wz.id === "W-out" ? 60 : 26,
                            borderRadius: 4,
                            border: selectedZone === wz.id ? `2px solid ${colors.amber}` : `1px dashed ${colors.border}`,
                            background: selectedZone === wz.id ? `${colors.amber}20` : "transparent",
                            cursor: "pointer",
                            fontSize: 8,
                            color: colors.textMuted,
                          }}
                        />
                      ))}

                      {/* Strike zone 3x3 grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 3,
                        background: colors.surface1,
                        borderRadius: 6,
                        border: `2px solid ${colors.strike}60`,
                        padding: 3,
                      }}>
                        {[
                          "0-0", "1-0", "2-0",
                          "0-1", "1-1", "2-1",
                          "0-2", "1-2", "2-2",
                        ].map((zone) => (
                          <button
                            key={zone}
                            onClick={() => setSelectedZone(zone)}
                            style={{
                              width: "100%",
                              aspectRatio: "1",
                              minHeight: 56,
                              borderRadius: 4,
                              border: selectedZone === zone ? `2px solid ${selectedPitch ? getPitchColor(selectedPitch) : colors.amber}` : `1px solid ${colors.border}`,
                              background: selectedZone === zone
                                ? `${selectedPitch ? getPitchColor(selectedPitch) : colors.amber}30`
                                : colors.surface2,
                              cursor: "pointer",
                              transition: "all 0.12s",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {selectedZone === zone && selectedPitch && (
                              <span style={{
                                fontFamily: "'Oswald', sans-serif",
                                fontSize: 18,
                                fontWeight: 700,
                                color: getPitchColor(selectedPitch),
                              }}>
                                {selectedPitch}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Area */}
                <div style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
                  {sent && !sending ? (
                    /* POST-SEND STATE: Resend, Change, and Log Result */
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Sent confirmation banner */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "10px 16px",
                        borderRadius: 8,
                        background: `${colors.green}20`,
                        border: `1px solid ${colors.green}40`,
                      }}>
                        <CheckIcon size={16} color={colors.green} />
                        <span style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontSize: 14,
                          fontWeight: 600,
                          color: colors.green,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}>
                          Sent: {sentCall ? pitchTypes.find(p => p.id === sentCall.pitch)?.short : ""} — {sentCall ? (zoneLabels[sentCall.zone] || sentCall.zone) : ""}
                        </span>
                      </div>

                      {/* Resend + Change row */}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={handleResend}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "12px 16px",
                            borderRadius: 8,
                            border: `1px solid ${colors.amber}60`,
                            background: `${colors.amber}15`,
                            color: colors.amber,
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: 14,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <SpeakerIcon size={14} color={colors.amber} />
                          Resend
                        </button>
                        <button
                          onClick={handleChange}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "12px 16px",
                            borderRadius: 8,
                            border: `1px solid ${colors.border}`,
                            background: colors.surface2,
                            color: colors.textSecondary,
                            fontFamily: "'Oswald', sans-serif",
                            fontSize: 14,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          ↩ Change
                        </button>
                      </div>

                      {/* Log Result label */}
                      <label style={{
                        fontSize: 10,
                        color: colors.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                        display: "block",
                        marginTop: 4,
                        textAlign: "center",
                      }}>
                        ③ Log Pitch Result
                      </label>

                      {/* Result buttons */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                        {resultOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => handleLogResult(opt.id)}
                            style={{
                              padding: "10px 4px",
                              borderRadius: 8,
                              border: `1px solid ${opt.color}50`,
                              background: `${opt.color}15`,
                              cursor: "pointer",
                              transition: "all 0.12s",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <span style={{
                              fontFamily: "'Oswald', sans-serif",
                              fontSize: 13,
                              fontWeight: 700,
                              color: opt.color,
                              textTransform: "uppercase",
                            }}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* PRE-SEND STATE: Send button (or Change-Send if changing) */
                    <button
                      onClick={changing ? handleChangeSend : handleSend}
                      disabled={!selectedPitch || !selectedZone || sending || !btConnected}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "16px 24px",
                        borderRadius: 10,
                        border: changing ? `2px solid ${colors.amber}` : "none",
                        background: sending
                          ? colors.amberDim
                          : (selectedPitch && selectedZone && btConnected)
                            ? changing ? `${colors.amber}30` : colors.amber
                            : colors.surface3,
                        color: (selectedPitch && selectedZone && !changing) ? colors.navy : changing ? colors.amber : colors.textMuted,
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        cursor: (selectedPitch && selectedZone && btConnected && !sending) ? "pointer" : "default",
                        opacity: (!btConnected && selectedPitch && selectedZone) ? 0.5 : 1,
                        transition: "all 0.2s",
                      }}
                    >
                      {sending ? (
                        <>
                          <SpeakerIcon size={18} color={changing ? colors.amber : colors.navy} />
                          Sending{changing ? " Change" : ""}...
                        </>
                      ) : changing ? (
                        <>
                          <SendIcon size={16} color={(selectedPitch && selectedZone && btConnected) ? colors.amber : colors.textMuted} />
                          {!selectedPitch ? "Select Pitch Type" : !selectedZone ? "Select Target Zone" : "Send Change to Catcher"}
                        </>
                      ) : (
                        <>
                          <SendIcon size={16} color={(selectedPitch && selectedZone && btConnected) ? colors.navy : colors.textMuted} />
                          {!selectedPitch ? "Select Pitch Type" : !selectedZone ? "Select Target Zone" : !btConnected ? "Earpiece Disconnected" : "Send to Catcher"}
                        </>
                      )}
                    </button>
                  )}
                  {changing && !sending && (
                    <button
                      onClick={() => {
                        setChanging(false);
                        setSent(true);
                        if (sentCall) {
                          setSelectedPitch(sentCall.pitch);
                          setSelectedZone(sentCall.zone);
                        }
                      }}
                      style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "8px",
                        borderRadius: 6,
                        border: `1px solid ${colors.border}`,
                        background: "transparent",
                        color: colors.textMuted,
                        fontFamily: "'Source Sans 3', sans-serif",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Cancel Change
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Call History + Status */}
              <div>
                {/* Current Call Preview */}
                {(selectedPitch || selectedZone) && (
                  <div style={{
                    background: colors.surface1,
                    borderRadius: 8,
                    padding: 14,
                    border: `1px solid ${colors.border}`,
                    marginBottom: 12,
                  }}>
                    <label style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 6 }}>
                      Current Call
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {selectedPitch && (
                        <span style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontSize: 24,
                          fontWeight: 700,
                          color: getPitchColor(selectedPitch),
                        }}>
                          {selectedPitch}
                        </span>
                      )}
                      {selectedZone && (
                        <span style={{ fontSize: 13, color: colors.textSecondary }}>
                          {zoneLabels[selectedZone] || selectedZone}
                        </span>
                      )}
                    </div>
                    {selectedPitch && selectedZone && (
                      <div style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        background: colors.surface2,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}>
                        <SpeakerIcon size={12} color={colors.textMuted} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: colors.textSecondary,
                          fontStyle: "italic",
                        }}>
                          "{pitchTypes.find((p) => p.id === selectedPitch)?.label}, {zoneLabels[selectedZone]}"
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Call History */}
                <div style={{
                  background: colors.surface1,
                  borderRadius: 8,
                  padding: 14,
                  border: `1px solid ${colors.border}`,
                }}>
                  <label style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 10 }}>
                    Pitch Call History
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {callHistory.map((call, i) => {
                      const resultColor = call.result === "strike" ? colors.strike
                        : call.result === "ball" ? colors.ball
                        : call.result === "foul" ? "#EAB308"
                        : call.result === "in_play" ? colors.hit
                        : null;
                      return (
                        <div key={i} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 8px",
                          background: i === 0 && !call.result ? `${colors.surface2}` : "transparent",
                          borderRadius: 4,
                          borderLeft: i === 0 && !call.result ? `3px solid ${colors.amber}` : resultColor ? `3px solid ${resultColor}` : "3px solid transparent",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontFamily: "'Oswald', sans-serif",
                              fontSize: 14,
                              fontWeight: 700,
                              color: getPitchColor(call.pitch),
                            }}>{call.pitch}</span>
                            <span style={{ fontSize: 12, color: colors.textSecondary }}>
                              {zoneLabels[call.zone] || call.zone}
                            </span>
                            {call.changed && (
                              <span style={{ fontSize: 9, color: colors.amber, fontWeight: 600, textTransform: "uppercase" }}>chg</span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {call.result && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                padding: "2px 5px",
                                borderRadius: 3,
                                background: `${resultColor}20`,
                                color: resultColor,
                              }}>
                                {call.result === "in_play" ? "IP" : call.result}
                              </span>
                            )}
                            {!call.result && i === 0 && (
                              <span style={{
                                fontSize: 9,
                                fontWeight: 600,
                                color: colors.amber,
                                textTransform: "uppercase",
                              }}>
                                live
                              </span>
                            )}
                            <span style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 10,
                              color: colors.textMuted,
                            }}>{call.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Sequence */}
                <div style={{
                  background: colors.surface1,
                  borderRadius: 8,
                  padding: 14,
                  border: `1px solid ${colors.border}`,
                  marginTop: 12,
                }}>
                  <label style={{ fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "block", marginBottom: 8 }}>
                    Suggested Sequence
                  </label>
                  <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.6 }}>
                    <div>1-2 count, lefty → <span style={{ color: colors.strike, fontWeight: 600 }}>FB</span> up and in to set up</div>
                    <div>→ <span style={{ color: colors.ball, fontWeight: 600 }}>CB</span> down and away to finish</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== CATCHER EARPIECE VIEW ===== */}
        {view === "catcher" && (
          <div>
            <SectionHeader title="Catcher's Earpiece Experience" subtitle="What the catcher hears — simulated receive-only device" />

            <div style={{
              maxWidth: 360,
              margin: "0 auto",
              background: colors.surface1,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${colors.border}`,
              textAlign: "center",
            }}>
              {/* Earpiece visual */}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: colors.surface2,
                border: `2px solid ${btConnected ? colors.green : colors.red}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                position: "relative",
              }}>
                <BluetoothIcon size={28} color={btConnected ? colors.green : colors.red} />
                <div style={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: btConnected ? colors.green : colors.red,
                  border: `2px solid ${colors.surface1}`,
                }} />
              </div>

              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: btConnected ? colors.green : colors.red,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 24,
              }}>
                {btConnected ? "Connected — Listening" : "Disconnected"}
              </div>

              {/* Audio message display */}
              <div style={{
                background: colors.surface0,
                borderRadius: 10,
                padding: 24,
                marginBottom: 20,
                border: `1px solid ${colors.border}`,
                minHeight: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}>
                {catcherMessage ? (
                  <>
                    <AudioWave active={audioActive} />
                    <div style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontSize: 28,
                      fontWeight: 700,
                      color: colors.amber,
                      textTransform: "uppercase",
                    }}>
                      {catcherMessage}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>
                      Received {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                  </>
                ) : (
                  <div style={{ color: colors.textMuted, fontSize: 13, fontStyle: "italic" }}>
                    Waiting for pitch call...
                  </div>
                )}
              </div>

              {/* Simulate button */}
              <button
                onClick={() => {
                  const randomPitch = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
                  const zones = Object.keys(zoneLabels);
                  const randomZone = zones[Math.floor(Math.random() * zones.length)];
                  setAudioActive(true);
                  setCatcherMessage(`${randomPitch.label}, ${zoneLabels[randomZone]}`);
                  setTimeout(() => setAudioActive(false), 2000);
                }}
                style={{
                  padding: "12px 24px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.surface2,
                  color: colors.textSecondary,
                  fontFamily: "'Source Sans 3', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Simulate Incoming Call
              </button>

              <div style={{
                marginTop: 24,
                padding: 12,
                background: `${colors.amber}10`,
                borderRadius: 8,
                border: `1px solid ${colors.amber}30`,
              }}>
                <div style={{ fontSize: 11, color: colors.amber, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Audio Pattern
                </div>
                <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
                  [distinctive tone] → pause → spoken pitch call repeated twice
                  <br />
                  Example: 🔔 ... "Fastball, down and away ... Fastball, down and away"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== FULL FLOW ===== */}
        {view === "flow" && (
          <div>
            <SectionHeader title="End-to-End Flow" subtitle="Complete interaction from coach decision to catcher receiving the call" />

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                {
                  step: 1,
                  actor: "Coach",
                  action: "Reads Game State",
                  detail: "Count, outs, runners, batter history/tendencies — all visible on the PitchChart game screen. Coach decides what to throw.",
                  color: colors.amber,
                },
                {
                  step: 2,
                  actor: "Coach",
                  action: "Selects Pitch Type",
                  detail: "Taps one of 6 pitch type buttons (FB, CB, CH, SL, CT, 2S). Big 44px+ tap targets for dugout use with dirty hands.",
                  color: colors.amber,
                },
                {
                  step: 3,
                  actor: "Coach",
                  action: "Selects Target Zone",
                  detail: "Taps one of 9 strike zone quadrants, or 8 waste pitch zones outside the zone (high, low, in, out, corners).",
                  color: colors.amber,
                },
                {
                  step: 4,
                  actor: "App",
                  action: "Sends Audio via Bluetooth",
                  detail: "PitchChart generates an audio cue: distinctive tone + spoken call (e.g., 'Curveball, low and away'). Sent over standard A2DP Bluetooth to paired earpiece.",
                  color: colors.hit,
                },
                {
                  step: 5,
                  actor: "Catcher",
                  action: "Receives Call",
                  detail: "Hears the call through earpiece (~100-200ms latency). Call is repeated automatically for reliability. Catcher relays sign to pitcher.",
                  color: colors.ball,
                },
                {
                  step: 6,
                  actor: "Pitcher",
                  action: "Delivers Pitch",
                  detail: "Standard baseball from here — pitcher gets the sign from catcher, delivers the pitch.",
                  color: colors.textSecondary,
                },
                {
                  step: 7,
                  actor: "Coach",
                  action: "Logs Result",
                  detail: "After the pitch: coach taps the actual result (strike, ball, foul, in-play). If the pitch matched the call, it's auto-populated. If it missed, coach adjusts.",
                  color: colors.amber,
                },
                {
                  step: 8,
                  actor: "App",
                  action: "Updates Analytics",
                  detail: "Call vs. execution data is stored. Over time: which calls work best against which batters, pitch sequence effectiveness, catcher execution rate.",
                  color: colors.hit,
                },
              ].map((item) => (
                <div key={item.step} style={{
                  display: "flex",
                  gap: 16,
                  padding: 16,
                  background: colors.surface1,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `3px solid ${item.color}`,
                }}>
                  <div style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: item.color,
                    minWidth: 36,
                    textAlign: "center",
                  }}>{item.step}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: `${item.color}20`,
                        color: item.color,
                      }}>{item.actor}</span>
                      <span style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: 15,
                        fontWeight: 600,
                        color: colors.chalk,
                        textTransform: "uppercase",
                      }}>{item.action}</span>
                    </div>
                    <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Analytics Callout */}
            <div style={{
              marginTop: 24,
              background: `${colors.amber}10`,
              borderRadius: 10,
              padding: 20,
              border: `1px solid ${colors.amber}30`,
            }}>
              <h3 style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: colors.amber,
                margin: "0 0 8px",
                textTransform: "uppercase",
              }}>
                Analytics Unlocked by Pitch Calling
              </h3>
              <div style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.7 }}>
                Because the <strong style={{ color: colors.chalk }}>intended pitch</strong> is captured alongside the <strong style={{ color: colors.chalk }}>actual result</strong>, you unlock new data that pure tracking can't provide: call vs. execution accuracy (did the pitcher hit the target?), sequence effectiveness by batter handedness, which pitch calls lead to outs in 2-strike counts, and how a batter's tendencies shift across at-bats within a game. This turns PitchChart from a tracker into a genuine coaching intelligence platform.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: 20,
        fontWeight: 700,
        color: colors.chalk,
        margin: 0,
        textTransform: "uppercase",
        letterSpacing: "-0.01em",
      }}>{title}</h2>
      {subtitle && (
        <p style={{ fontSize: 13, color: colors.textSecondary, margin: "4px 0 0" }}>{subtitle}</p>
      )}
    </div>
  );
}

function InfoCard({ title, items, accent }) {
  return (
    <div style={{
      background: colors.surface1,
      borderRadius: 10,
      padding: 18,
      border: `1px solid ${colors.border}`,
      borderTop: `3px solid ${accent}`,
    }}>
      <h3 style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: 15,
        fontWeight: 600,
        color: accent,
        margin: "0 0 10px",
        textTransform: "uppercase",
      }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: colors.textSecondary, lineHeight: 1.4 }}>
            <span style={{ color: accent, flexShrink: 0 }}>▸</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
