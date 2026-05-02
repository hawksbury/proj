import { useEffect, useMemo, useState } from "react";
import { fetchDispatch } from "./api/dispatchApi.js";
import { fetchResponders } from "./api/responderApi.js";
import SignalInput from "./components/SignalInput.jsx";
import PriorityDashboard from "./components/PriorityDashboard.jsx";
import DispatchSummary from "./components/DispatchSummary.jsx";
import ResponderLogin from "./components/ResponderLogin.jsx";
import ResponderCaseQueue from "./components/ResponderCaseQueue.jsx";
import ResponderAnalytics from "./components/ResponderAnalytics.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { activeCases, responderProfiles as fallbackResponderProfiles } from "./data/responderCases.js";

const DEFAULT_SIGNAL = "SIG-0000001";
const DEFAULT_INCIDENT = "power_outage";

const modelMetrics = [
  { label: "Escalation F1", value: "0.881", tone: "teal" },
  { label: "Escalation ROC", value: "0.877", tone: "blue" },
  { label: "Priority R2", value: "0.801", tone: "gold" },
  { label: "Top-3 Match", value: "0.879", tone: "green" },
];

export default function App() {
  const [signalId, setSignalId] = useState(DEFAULT_SIGNAL);
  const [incidentType, setIncidentType] = useState(DEFAULT_INCIDENT);
  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [responderProfiles, setResponderProfiles] = useState(fallbackResponderProfiles);
  const [selectedResponderId, setSelectedResponderId] = useState(
    () => window.localStorage.getItem("ai-dispatch-responder-id") || fallbackResponderProfiles[0].responder_id,
  );
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => window.localStorage.getItem("ai-dispatch-responder-id") !== null,
  );

  async function loadDispatch(nextSignalId = signalId, nextIncidentType = incidentType) {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchDispatch(nextSignalId, nextIncidentType, 3);
      setDispatch(payload);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDispatch(DEFAULT_SIGNAL, DEFAULT_INCIDENT);
  }, []);

  useEffect(() => {
    async function loadResponders() {
      try {
        const responders = await fetchResponders();
        if (responders.length) {
          setResponderProfiles(responders);
          const savedResponderId = window.localStorage.getItem("ai-dispatch-responder-id");
          if (!savedResponderId || !responders.some((responder) => responder.responder_id === savedResponderId)) {
            setSelectedResponderId(responders[0].responder_id);
          }
        }
      } catch {
        setResponderProfiles(fallbackResponderProfiles);
      }
    }

    loadResponders();
  }, []);

  const selectedResponder = useMemo(
    () => responderProfiles.find((responder) => responder.responder_id === selectedResponderId) || responderProfiles[0],
    [selectedResponderId],
  );
  const relevantCases = useMemo(
    () =>
      activeCases
        .filter((caseItem) => caseItem.recommended_profession === selectedResponder.profession)
        .sort((a, b) => b.priority_score - a.priority_score),
    [selectedResponder],
  );
  const dashboardStats = useMemo(
    () => buildDashboardStats(dispatch, relevantCases, selectedResponder),
    [dispatch, relevantCases, selectedResponder],
  );

  function handleCaseSelect(caseItem) {
    setSignalId(caseItem.signal_id);
    setIncidentType(caseItem.incident_type);
    loadDispatch(caseItem.signal_id, caseItem.incident_type);
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
          <span className="status-dot" />
          <span>{dispatch?.dispatch_summary?.mode === "openai_responses_api" ? "OpenAI LLM" : "Local Fallback"}</span>
          <button className="text-action" type="button" onClick={handleLogout}>
            Switch
          </button>
        </div>
      </header>

      <ResponderLogin
        responder={selectedResponder}
      />

      <SignalInput
        signalId={signalId}
        incidentType={incidentType}
        loading={loading}
        error={error}
        onSignalChange={setSignalId}
        onIncidentChange={setIncidentType}
        onSubmit={() => loadDispatch()}
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
        />
        <PriorityDashboard dispatch={dispatch} modelMetrics={modelMetrics} />
        <DispatchSummary summary={dispatch?.dispatch_summary} />
      </section>
    </main>
  );
}

function buildDashboardStats(dispatch, relevantCases, selectedResponder) {
  const score = dispatch?.prediction?.priority_score ?? 0;
  const responders = dispatch?.responder_options || [];
  const nearest = responders[0]?.distance_miles ?? 0;
  const probability = Math.round((dispatch?.prediction?.escalation_probability ?? 0) * 100);
  const critical = relevantCases.filter((caseItem) => caseItem.priority_score >= 85).length;

  return [
    {
      label: "Relevant Cases",
      value: relevantCases.length || "--",
      detail: selectedResponder.profession,
      spark: "86%",
    },
    {
      label: "Critical Now",
      value: critical || "--",
      detail: "sorted by ML priority",
      spark: "74%",
    },
    {
      label: "Selected Priority",
      value: score ? score.toFixed(1) : "--",
      detail: dispatch?.prediction?.priority_level?.toUpperCase() || "WAITING",
      spark: "64%",
    },
    {
      label: "Selected Escalation",
      value: `${probability}%`,
      detail: nearest ? `${nearest} mi closest` : "waiting on responder match",
      spark: "52%",
    },
  ];
}
