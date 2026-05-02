import { useEffect, useMemo, useRef, useState } from "react";
import { fetchResponderCases } from "./api/caseApi.js";
import { fetchDispatch } from "./api/dispatchApi.js";
import { fetchMlMetrics } from "./api/mlApi.js";
import { fetchResponders } from "./api/responderApi.js";
import { fetchAlerts } from "./api/alertApi.js";
import SignalInput from "./components/SignalInput.jsx";
import PriorityDashboard from "./components/PriorityDashboard.jsx";
import DispatchSummary from "./components/DispatchSummary.jsx";
import ResponderLogin from "./components/ResponderLogin.jsx";
import ResponderCaseQueue from "./components/ResponderCaseQueue.jsx";
import ResponderAnalytics from "./components/ResponderAnalytics.jsx";
import OperationsOverview from "./components/OperationsOverview.jsx";
import AlertQueue from "./components/AlertQueue.jsx";
import LoginPage from "./components/LoginPage.jsx";
import DispatchModal from "./components/DispatchModal.jsx";

const DEFAULT_SIGNAL = "SCRBS-0001";
const DEFAULT_INCIDENT = "power_outage";

function playAlertSound(level = "medium") {
  try {
    const ctx = new AudioContext();
    const frequencies = { critical: [880, 1100], high: [660, 880], medium: [520], low: [400] };
    const tones = frequencies[level] ?? frequencies.medium;
    let t = ctx.currentTime;
    tones.forEach((freq) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
      t += 0.22;
    });
  } catch (_) { /* audio blocked before first interaction */ }
}

export default function App() {
  const [signalId, setSignalId] = useState(DEFAULT_SIGNAL);
  const [incidentType, setIncidentType] = useState(DEFAULT_INCIDENT);
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responderProfiles, setResponderProfiles] = useState([]);
  const [selectedResponderId, setSelectedResponderId] = useState(
    () => window.localStorage.getItem("ai-dispatch-responder-id") || "",
  );
  const [relevantCases, setRelevantCases] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => window.localStorage.getItem("ai-dispatch-responder-id") !== null,
  );

  // Alert queue state
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const knownAlertCountRef = useRef(0);
  const toastTimerRef = useRef(null);

  async function loadDispatch(nextSignalId = signalId, nextIncidentType = incidentType, showModal = false) {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchDispatch(nextSignalId, nextIncidentType, 3);
      setDispatch(payload);
      if (showModal) setShowDispatchModal(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadResponders() {
      try {
        const responders = await fetchResponders();
        if (responders.length) {
          setResponderProfiles(responders);
          const savedId = window.localStorage.getItem("ai-dispatch-responder-id");
          if (!savedId || !responders.some((r) => r.responder_id === savedId)) {
            setSelectedResponderId(responders[0].responder_id);
          }
        }
      } catch (requestError) {
        setError(requestError.message);
      }
    }
    loadResponders();
  }, []);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setMetrics(await fetchMlMetrics());
      } catch {
        setMetrics(null);
      }
    }
    loadMetrics();
  }, []);

  useEffect(() => {
    async function loadRelevantCases() {
      if (!isLoggedIn || !selectedResponder?.responder_id) return;
      setError("");
      try {
        const cases = await fetchResponderCases(selectedResponder.responder_id);
        setRelevantCases(cases);
        if (!signalId && cases[0]) setSignalId(cases[0].signal_id);
      } catch (requestError) {
        setError(requestError.message);
        setRelevantCases([]);
      }
    }
    loadRelevantCases();
  }, [isLoggedIn, selectedResponderId]);

  // Poll for new button alerts every 3 seconds
  useEffect(() => {
    async function pollAlerts() {
      try {
        const { alerts: incoming } = await fetchAlerts();
        const prevCount = knownAlertCountRef.current;

        if (incoming.length > prevCount) {
          const newest = incoming[0];
          const name = newest.customer?.full_name || newest.person_id;
          setNewAlertCount((n) => n + (incoming.length - prevCount));
          clearTimeout(toastTimerRef.current);
          setToast(`New alert: ${name}`);
          toastTimerRef.current = setTimeout(() => setToast(null), 4500);
          playAlertSound(newest.priority?.level);
        }

        if (incoming.length !== knownAlertCountRef.current) {
          knownAlertCountRef.current = incoming.length;
          setAlerts(incoming);
          const top = incoming[0];
          if (top?.customer?.signal_id) {
            setSignalId(top.customer.signal_id);
            loadDispatch(top.customer.signal_id, incidentType);
          }
        }
      } catch {
        // Backend not running — silently skip
      }
    }

    pollAlerts();
    const interval = setInterval(pollAlerts, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(toastTimerRef.current);
    };
  }, []);

  const selectedResponder = useMemo(
    () => responderProfiles.find((r) => r.responder_id === selectedResponderId) || responderProfiles[0],
    [selectedResponderId, responderProfiles],
  );
  const modelMetrics = useMemo(() => buildModelMetrics(metrics), [metrics]);
  const dashboardStats = useMemo(
    () => buildDashboardStats(dispatch, relevantCases, selectedResponder),
    [dispatch, relevantCases, selectedResponder],
  );

  function handleCaseSelect(caseItem) {
    setSignalId(caseItem.signal_id);
    setIncidentType(caseItem.incident_type || DEFAULT_INCIDENT);
    loadDispatch(caseItem.signal_id, caseItem.incident_type || DEFAULT_INCIDENT);
  }

  function handleAlertSelect(alert) {
    setSelectedAlertId(alert.alert_id);
    setNewAlertCount(0);
    if (alert.customer?.signal_id) {
      const sid = alert.customer.signal_id;
      setSignalId(sid);
      loadDispatch(sid, incidentType);
    }
  }

  function handleLogin(nextResponderId = selectedResponderId) {
    window.localStorage.setItem("ai-dispatch-responder-id", nextResponderId);
    setSelectedResponderId(nextResponderId);
    setIsLoggedIn(true);
  }

  function handleLogout() {
    window.localStorage.removeItem("ai-dispatch-responder-id");
    setIsLoggedIn(false);
  }

  if (!isLoggedIn) {
    return (
      <LoginPage
        responders={responderProfiles}
        selectedResponderId={selectedResponderId}
        onResponderChange={setSelectedResponderId}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">AD</div>
        <div>
          <p className="eyebrow">AI Disaster Response</p>
          <h1>Responder Operations Dashboard</h1>
        </div>
        <div className="status-cluster">
          {newAlertCount > 0 && (
            <span className="alert-badge">{newAlertCount}</span>
          )}
          <span className="status-dot" />
          <span>{dispatch?.dispatch_summary?.mode === "openai_responses_api" ? "OpenAI LLM" : "Local Fallback"}</span>
          <button className="text-action" type="button" onClick={handleLogout}>
            Switch
          </button>
        </div>
      </header>

      <ResponderLogin responder={selectedResponder} />

      <SignalInput
        signalId={signalId}
        incidentType={incidentType}
        loading={loading}
        error={error}
        onSignalChange={setSignalId}
        onIncidentChange={setIncidentType}
        onSubmit={() => loadDispatch(signalId, incidentType, true)}
      />

      <AlertQueue
        alerts={alerts}
        onSelectAlert={handleAlertSelect}
        selectedAlertId={selectedAlertId}
      />

      <section className="kpi-grid">
        {dashboardStats.map((stat) => (
          <article className="widget kpi-card" key={stat.label}>
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
            <span>{stat.detail}</span>
            <div className="sparkline" style={{ "--spark": stat.spark }} />
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <ResponderAnalytics cases={relevantCases} responder={selectedResponder} />
        <ResponderCaseQueue
          cases={relevantCases}
          selectedCaseId={signalId}
          onSelectCase={handleCaseSelect}
          loading={loading}
        />
        <OperationsOverview cases={relevantCases} selectedSignalId={signalId} />
        <DispatchSummary
          cases={relevantCases}
          responder={selectedResponder}
          selectedSignalId={signalId}
          summary={dispatch?.dispatch_summary}
        />
      </section>

      {toast && (
        <div className="alert-toast">
          <span className="alert-toast-dot" />
          {toast}
        </div>
      )}

      {showDispatchModal && (
        <DispatchModal
          dispatch={dispatch}
          onClose={() => setShowDispatchModal(false)}
        />
      )}
    </main>
  );
}

function buildDashboardStats(dispatch, relevantCases, selectedResponder) {
  const selectedCase = relevantCases.find((c) => c.signal_id === dispatch?.signal?.signal_id) || relevantCases[0];
  const score = dispatch?.prediction?.priority_score ?? 0;
  const responders = dispatch?.responder_options || [];
  const nearest = responders[0]?.distance_miles ?? 0;
  const probability = Math.round((dispatch?.prediction?.escalation_probability ?? selectedCase?.escalation_probability / 100 ?? 0) * 100);
  const critical = relevantCases.filter((c) => c.priority_score >= 85).length;
  const selectedScore = score || selectedCase?.priority_score || 0;
  const selectedProbability = probability || selectedCase?.escalation_probability || 0;

  return [
    {
      label: "Relevant Cases",
      value: relevantCases.length || "--",
      detail: selectedResponder?.profession || "loading responders",
      spark: `${Math.min(95, Math.max(18, relevantCases.length * 16))}%`,
    },
    {
      label: "Critical Now",
      value: critical || "--",
      detail: "sorted by ML priority",
      spark: `${Math.min(95, Math.max(18, critical * 24))}%`,
    },
    {
      label: "Selected Priority",
      value: selectedScore ? selectedScore.toFixed(1) : "--",
      detail: dispatch?.prediction?.priority_level?.toUpperCase() || selectedCase?.priority_level?.toUpperCase() || "WAITING",
      spark: `${Math.min(95, Math.max(18, selectedScore))}%`,
    },
    {
      label: "Selected Escalation",
      value: `${selectedProbability}%`,
      detail: nearest ? `${nearest} mi closest` : "waiting on responder match",
      spark: `${Math.min(95, Math.max(18, selectedProbability))}%`,
    },
  ];
}

function buildModelMetrics(metrics) {
  if (!metrics?.models) {
    return [
      { label: "Escalation F1", value: "--", tone: "teal" },
      { label: "Escalation ROC", value: "--", tone: "blue" },
      { label: "Priority R2", value: "--", tone: "gold" },
      { label: "Top-3 Match", value: "--", tone: "green" },
    ];
  }
  return [
    { label: "Escalation F1", value: metrics.models.escalation_required.f1.toFixed(3), tone: "teal" },
    { label: "Escalation ROC", value: metrics.models.escalation_required.roc_auc.toFixed(3), tone: "blue" },
    { label: "Priority R2", value: metrics.models.priority_score_assigned.r2.toFixed(3), tone: "gold" },
    { label: "Top-3 Match", value: metrics.models.matched_responder_profession.top_3_accuracy.toFixed(3), tone: "green" },
  ];
}
