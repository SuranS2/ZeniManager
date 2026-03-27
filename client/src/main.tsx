import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import {
  bootstrapStoredAppSettings,
  resetTransientSessionOnLaunch,
} from "./lib/supabase";

bootstrapStoredAppSettings();
// resetTransientSessionOnLaunch(); // 새로고침 시 세션 초기화 방지를 위해 주석 처리

createRoot(document.getElementById("root")!).render(
  <App />
);
