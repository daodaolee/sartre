import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import type { SystemHealthResult } from "../../shared/system-health-contract.js";
import { SystemHealthView } from "./views/SystemHealthView.js";

function Application() {
  const [result, setResult] = useState<SystemHealthResult>();

  useEffect(() => {
    let active = true;
    const unsubscribe = window.systemHealth.subscribe((nextResult) => {
      if (active) setResult(() => nextResult);
    });
    void window.systemHealth.getSnapshot().then((nextResult) => {
      if (active) setResult(() => nextResult);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const snapshot = result?.success === true ? result.data : undefined;
  return <SystemHealthView snapshot={snapshot} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("renderer_root_missing");
createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
