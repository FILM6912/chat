import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";
import Chat from "./pages/Chat";
import ChatSession from "./pages/ChatSession";
import NewChat from "./pages/NewChat";
import Settings from "./pages/Settings";
import History from "./pages/History";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<NewChat />} />
            <Route path="chat/:sessionId" element={<ChatSession />} />
            <Route path="settings" element={<Settings />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
