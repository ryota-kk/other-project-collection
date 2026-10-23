import { useEffect, useRef, useState } from "react";

import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import PersonalHomePage from "./pages/PersonalHomePage";
import ResultPage from "./pages/ResultPage";
import "./styles/app.css";

const LAST_UPLOAD_KEY = "label-vectorizer:last-upload";

function getRoute() {
  if (window.location.pathname.startsWith("/history")) return "history";
  if (window.location.pathname.startsWith("/result")) return "result";
  if (window.location.pathname.startsWith("/vector")) return "vector";
  return "home";
}

function getTaskIdFromPath() {
  const match = window.location.pathname.match(/^\/result\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getInitialUpload() {
  const stored = window.sessionStorage.getItem(LAST_UPLOAD_KEY);
  return stored ? JSON.parse(stored) : null;
}

export default function App() {
  const appRootRef = useRef(null);
  const [page, setPage] = useState(getRoute);
  const [upload, setUpload] = useState(getInitialUpload);
  const [taskId, setTaskId] = useState(getTaskIdFromPath);

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_VDE !== "true") {
      return undefined;
    }

    let designMode = null;
    let isDisposed = false;

    import("./editor/design-mode").then(({ createDesignMode }) => {
      if (isDisposed || !appRootRef.current) return;

      designMode = createDesignMode({
        root: appRootRef.current,
        storageKey: "label-vectorizer-design-draft",
        editableSelector: "[data-edit-id]",
        exportTitle: "Label Vectorizer",
        draftOnly: true,
        autoTagNamespace: "label-vectorizer",
      });

      designMode.mount();
    });

    return () => {
      isDisposed = true;
      designMode?.destroy();
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setPage(getRoute());
      setTaskId(getTaskIdFromPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(path, nextPage = getRoute()) {
    window.history.pushState({}, "", path);
    setPage(nextPage);
    setTaskId(getTaskIdFromPath());
  }

  function handleUploadComplete(nextUpload) {
    setUpload(nextUpload);
    window.sessionStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(nextUpload));
    window.history.pushState({}, "", `/result/${nextUpload.task_id}`);
    setTaskId(nextUpload.task_id);
    setPage("result");
  }

  function openHome() {
    setUpload(null);
    navigate("/", "home");
  }

  function openVector() {
    navigate("/vector", "vector");
  }

  function openHistory() {
    navigate("/history", "history");
  }

  function openResult(nextTaskId, nextTask = null) {
    if (nextTask) {
      setUpload(nextTask);
      window.sessionStorage.setItem(LAST_UPLOAD_KEY, JSON.stringify(nextTask));
    }
    window.history.pushState({}, "", `/result/${nextTaskId}`);
    setTaskId(nextTaskId);
    setPage("result");
  }

  let content;

  if (page === "result") {
    content = <ResultPage upload={upload} taskId={taskId} onBack={openVector} onHistory={openHistory} />;
  } else if (page === "vector") {
    content = <HomePage onUploadComplete={handleUploadComplete} onHistory={openHistory} onHome={openHome} />;
  } else if (page === "history") {
    content = <HistoryPage onBack={openVector} onOpenTask={openResult} />;
  } else {
    content = <PersonalHomePage onOpenVector={openVector} />;
  }

  return (
    <div ref={appRootRef} className="label-vectorizer-design-root" data-design-root="label-vectorizer">
      {content}
    </div>
  );
}
